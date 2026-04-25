<?php
/**
 * Inner Circle — REST API Content Receiver v1.0
 *
 * Custom REST endpoints for automated content ingestion from TPX → n8n → WordPress.
 * Handles: post creation, ACF field mapping, taxonomy assignment, thumbnail sideload.
 *
 * Authentication: WordPress Application Passwords (Basic Auth over HTTPS).
 * Generate at: wp-admin → Users → [your admin user] → Application Passwords
 *
 * Endpoint: POST /wp-json/ic/v1/content
 * Headers:  Authorization: Basic base64(username:app_password)
 *           Content-Type: application/json
 *
 * Also exposes:
 *   GET  /wp-json/ic/v1/content/lookup?youtube_id=XXXXX  — check if video already exists
 *   POST /wp-json/ic/v1/content/bulk                     — batch create (Google Sheet import)
 */

if (!defined('ABSPATH')) exit;

/**
 * Register REST routes
 */
function ic_register_rest_routes() {

    // POST — Create single content item
    register_rest_route('ic/v1', '/content', array(
        'methods'             => 'POST',
        'callback'            => 'ic_rest_create_content',
        'permission_callback' => 'ic_rest_auth_check',
    ));

    // GET — Check if YouTube video already exists in WP
    register_rest_route('ic/v1', '/content/lookup', array(
        'methods'             => 'GET',
        'callback'            => 'ic_rest_lookup_content',
        'permission_callback' => 'ic_rest_auth_check',
    ));

    // POST — Bulk create (for Google Sheet batch import)
    register_rest_route('ic/v1', '/content/bulk', array(
        'methods'             => 'POST',
        'callback'            => 'ic_rest_bulk_create_content',
        'permission_callback' => 'ic_rest_auth_check',
    ));

    // GET — Shows list with WP term slugs (for n8n mapping reference)
    register_rest_route('ic/v1', '/shows', array(
        'methods'             => 'GET',
        'callback'            => 'ic_rest_get_shows',
        'permission_callback' => 'ic_rest_auth_check',
    ));

    // GET — Health check (verify auth + plugin status)
    register_rest_route('ic/v1', '/health', array(
        'methods'             => 'GET',
        'callback'            => 'ic_rest_health_check',
        'permission_callback' => 'ic_rest_auth_check',
    ));

    // PATCH — Update content post status (for approval workflow)
    register_rest_route('ic/v1', '/content/(?P<id>\d+)/status', array(
        'methods'             => 'PATCH',
        'callback'            => 'ic_rest_update_content_status',
        'permission_callback' => 'ic_rest_auth_check',
        'args'                => array(
            'id' => array(
                'validate_callback' => function($param) {
                    return is_numeric($param);
                }
            ),
        ),
    ));
    // ── Leader/Contributor Enrichment Endpoints ──

    // GET — List all leaders with term meta
    register_rest_route('ic/v1', '/leaders', array(
        'methods'             => 'GET',
        'callback'            => 'ic_rest_get_leaders',
        'permission_callback' => 'ic_rest_auth_check',
    ));

    // POST — Update leader term meta (for enrichment service)
    register_rest_route('ic/v1', '/leader/update-meta', array(
        'methods'             => 'POST',
        'callback'            => 'ic_rest_update_leader_meta',
        'permission_callback' => 'ic_rest_auth_check',
    ));

    // POST — Propagate speaker photos to leader terms
    register_rest_route('ic/v1', '/leader/propagate-photos', array(
        'methods'             => 'POST',
        'callback'            => 'ic_rest_propagate_photos',
        'permission_callback' => 'ic_rest_auth_check',
    ));

    // GET — Lookup content by YouTube ID (public, for homepage concierge results)
    register_rest_route('ic/v1', '/content/by-youtube-id', array(
        'methods'             => 'GET',
        'callback'            => 'ic_rest_content_by_youtube_id',
        'permission_callback' => '__return_true',
    ));

    // POST — Mirror expert contributor lander from staging.power100.io
    // Idempotent on (_p100_source_id) OR slug. Body shape:
    //   { p100_page_id, p100_page_url, slug, title, meta:{ec_*}, headshot_url? }
    register_rest_route('ic/v1', '/expert-contributor/upsert', array(
        'methods'             => 'POST',
        'callback'            => 'ic_rest_upsert_expert_contributor',
        'permission_callback' => 'ic_rest_auth_check',
    ));
}
add_action('rest_api_init', 'ic_register_rest_routes');

/**
 * Auth check — requires a logged-in user with publish_posts capability.
 * Works with WordPress Application Passwords (Basic Auth).
 */
function ic_rest_auth_check($request) {
    // Also accept a custom API key for n8n (set in IC Settings)
    $api_key = $request->get_header('X-IC-API-Key');
    $stored_key = get_option('ic_rest_api_key', '');

    if ($api_key && $stored_key && hash_equals($stored_key, $api_key)) {
        return true;
    }

    // Fall back to WordPress Application Password (Basic Auth)
    if (is_user_logged_in() && current_user_can('publish_posts')) {
        return true;
    }

    return new WP_Error(
        'rest_unauthorized',
        'Authentication required. Use Application Password (Basic Auth) or X-IC-API-Key header.',
        array('status' => 401)
    );
}


// =========================================================================
// POST /wp-json/ic/v1/content — Create single content item
// =========================================================================

/**
 * Expected JSON payload from n8n (after TPX enrichment):
 *
 * {
 *   "title": "Scaling Your Sales Team in 2026",
 *   "excerpt": "Greg and Paul break down the frameworks...",
 *   "content": "<p>Full description or transcript summary...</p>",
 *   "status": "draft",              // draft (default) | publish
 *   "video_url": "https://www.youtube.com/watch?v=XXXXX",
 *   "youtube_id": "XXXXX",          // for dedup check
 *   "episode_number": 12,
 *   "season_number": 1,
 *   "duration": "45:30",
 *   "recording_date": "2026-02-15", // Y-m-d
 *   "thumbnail_url": "https://img.youtube.com/vi/XXXXX/maxresdefault.jpg",
 *
 *   "show_slug": "powerchat",       // maps to ic_show taxonomy term
 *   "format_slug": "",              // maps to ic_format (optional)
 *   "pillar_slug": "growth",        // maps to ic_pillar
 *   "tags": ["sales", "scaling", "team building"],
 *
 *   "speakers": [
 *     { "name": "Greg Cummings", "title": "CEO, Power100", "photo_url": "" },
 *     { "name": "Paul Burleson", "title": "Director of HI Sales, Westlake Royal", "photo_url": "" }
 *   ],
 *
 *   "timestamps": [
 *     { "seconds": 0,    "label": "Introduction",             "description": "Greg opens the session" },
 *     { "seconds": 180,  "label": "The Sales Framework",      "description": "Paul's 4-step hiring system" },
 *     { "seconds": 1200, "label": "Q&A",                      "description": "Live member questions" }
 *   ],
 *
 *   "takeaways": [
 *     "Hire for attitude, train for skill",
 *     "Your sales team should never exceed a 4:1 rep-to-manager ratio",
 *     "Weekly pipeline reviews are non-negotiable for teams over 5"
 *   ],
 *
 *   "tpx_video_id": 42,             // TPX video_content.id for cross-reference
 *   "tpx_episode_id": 15            // TPX podcast_episodes.id for cross-reference
 * }
 */
function ic_rest_create_content($request) {
    $data = $request->get_json_params();

    // Log incoming payload for debugging (check wp-content/debug.log)
    if (defined('WP_DEBUG') && WP_DEBUG) {
        error_log('[IC REST] Incoming payload keys: ' . implode(', ', array_keys($data)));
        if (!empty($data['speakers'])) {
            error_log('[IC REST] Speakers (' . count($data['speakers']) . '): ' . json_encode($data['speakers']));
        } else {
            error_log('[IC REST] WARNING: No speakers in payload');
        }
        if (!empty($data['timestamps'])) {
            error_log('[IC REST] Timestamps (' . count($data['timestamps']) . '): ' . json_encode($data['timestamps']));
        } else {
            error_log('[IC REST] WARNING: No timestamps in payload. Checking alternatives...');
            $alt_keys = array_intersect(array_keys($data), ['chapters', 'chapter_timestamps', 'time_stamps', 'segments']);
            if ($alt_keys) {
                error_log('[IC REST] Found alternative keys: ' . implode(', ', $alt_keys));
            }
        }
        if (!empty($data['takeaways'])) {
            error_log('[IC REST] Takeaways (' . count($data['takeaways']) . ')');
        } else {
            error_log('[IC REST] WARNING: No takeaways in payload. Checking alternatives...');
            $alt_keys = array_intersect(array_keys($data), ['key_takeaways', 'key_points', 'highlights', 'insights']);
            if ($alt_keys) {
                error_log('[IC REST] Found alternative keys: ' . implode(', ', $alt_keys));
            }
        }
    }

    if (empty($data['title'])) {
        return new WP_Error('missing_title', 'Title is required.', array('status' => 400));
    }

    if (empty($data['video_url'])) {
        return new WP_Error('missing_video_url', 'Video URL is required.', array('status' => 400));
    }

    // ── Dedup check: prevent creating duplicate posts for the same YouTube video ──
    $youtube_id = $data['youtube_id'] ?? '';
    if ($youtube_id) {
        $existing = ic_rest_find_by_youtube_id($youtube_id);
        if ($existing) {
            return new WP_REST_Response(array(
                'success'  => false,
                'code'     => 'duplicate',
                'message'  => 'Content already exists for this YouTube video.',
                'post_id'  => $existing->ID,
                'edit_url' => get_edit_post_link($existing->ID, 'raw'),
                'view_url' => get_permalink($existing->ID),
            ), 409);
        }
    }

    // ── Create the post ──
    $post_status = in_array(($data['status'] ?? 'draft'), array('draft', 'publish', 'pending')) ? $data['status'] : 'draft';

    $post_id = wp_insert_post(array(
        'post_type'    => 'ic_content',
        'post_title'   => sanitize_text_field($data['title']),
        'post_excerpt' => sanitize_textarea_field($data['excerpt'] ?? ''),
        'post_content' => wp_kses_post($data['content'] ?? ''),
        'post_status'  => $post_status,
    ), true);

    if (is_wp_error($post_id)) {
        return new WP_Error('insert_failed', $post_id->get_error_message(), array('status' => 500));
    }

    // ── ACF Fields ──
    ic_rest_set_acf_fields($post_id, $data);

    // ── Taxonomies ──
    ic_rest_set_taxonomies($post_id, $data);

    // ── Thumbnail sideload ──
    if (!empty($data['thumbnail_url'])) {
        $thumb_result = ic_rest_sideload_thumbnail($post_id, $data['thumbnail_url'], $data['title']);
        if (is_wp_error($thumb_result)) {
            error_log('IC REST: Thumbnail sideload failed for post ' . $post_id . ': ' . $thumb_result->get_error_message());
            // Non-fatal — continue without thumbnail
        }
    }

    // ── Store TPX cross-reference IDs ──
    if (!empty($data['tpx_video_id'])) {
        update_post_meta($post_id, 'ic_tpx_video_id', intval($data['tpx_video_id']));
    }
    if (!empty($data['tpx_episode_id'])) {
        update_post_meta($post_id, 'ic_tpx_episode_id', intval($data['tpx_episode_id']));
    }
    if ($youtube_id) {
        update_post_meta($post_id, 'ic_youtube_id', sanitize_text_field($youtube_id));
    }

    // ── Transcript (for SEO/GEO public pages) ──
    if (!empty($data['transcript'])) {
        update_post_meta($post_id, 'ic_transcript', wp_kses_post($data['transcript']));
    }

    // ── Backfill flag ──
    // When truthy, IC excludes this post from hero-selection queries (see the
    // hero query filter in inc/hero-query.php) and the pipeline runner script
    // skips the Rey announcement email. Used for archival content that should
    // NOT take the hero slot or spam Rey with "new episode live" emails.
    if (!empty($data['skip_hero']) || !empty($data['is_backfill'])) {
        update_post_meta($post_id, '_ic_is_backfill', 1);
    }

    // ── Response ──
    return new WP_REST_Response(array(
        'success'  => true,
        'post_id'  => $post_id,
        'status'   => $post_status,
        'edit_url' => admin_url('post.php?post=' . $post_id . '&action=edit'),
        'view_url' => get_permalink($post_id),
        'title'    => get_the_title($post_id),
    ), 201);
}


// =========================================================================
// ACF Field Mapping
// =========================================================================

function ic_rest_set_acf_fields($post_id, $data) {

    // ── Simple fields — always use raw meta (works with or without ACF loaded) ──
    $simple_fields = array(
        'video_url'      => 'ic_video_url',
        'episode_number' => 'ic_episode_number',
        'season_number'  => 'ic_season_number',
        'duration'       => 'ic_duration',
        'recording_date' => 'ic_recording_date',
    );

    // ACF field key mapping for meta references
    $field_key_map = array(
        'ic_video_url'       => 'field_ic_video_url',
        'ic_episode_number'  => 'field_ic_episode_number',
        'ic_season_number'   => 'field_ic_season_number',
        'ic_duration'        => 'field_ic_duration',
        'ic_recording_date'  => 'field_ic_recording_date',
        'ic_speakers'        => 'field_ic_speakers',
        'ic_timestamps'      => 'field_ic_timestamps',
        'ic_takeaways'       => 'field_ic_takeaways',
    );

    foreach ($simple_fields as $payload_key => $meta_key) {
        if (isset($data[$payload_key]) && $data[$payload_key] !== '') {
            $value = sanitize_text_field($data[$payload_key]);
            update_post_meta($post_id, $meta_key, $value);
            // ACF reference key — tells ACF which field definition owns this meta
            update_post_meta($post_id, '_' . $meta_key, $field_key_map[$meta_key]);
        }
    }

    // ══════════════════════════════════════════════════════════════════════
    // ACF Repeaters — must be saved as individual meta rows, NOT as arrays.
    //
    // ACF stores repeaters like this:
    //   ic_speakers      = 4          (row count)
    //   _ic_speakers     = field_key  (reference to parent field)
    //   ic_speakers_0_name  = "Greg"
    //   _ic_speakers_0_name = field_ic_speaker_name  (reference to sub-field)
    //   ic_speakers_0_title = "Host"
    //   _ic_speakers_0_title = field_ic_speaker_title
    //   ... etc for each row and sub-field
    // ══════════════════════════════════════════════════════════════════════

    // ── Speakers repeater ──
    // Handle multiple possible key names from TPX enrichment
    $speakers_data = $data['speakers'] ?? $data['guests'] ?? $data['panelists'] ?? null;
    if (!empty($speakers_data) && is_array($speakers_data)) {
        ic_rest_clear_repeater($post_id, 'ic_speakers', array('name', 'title', 'photo'));

        $row_count = count($speakers_data);
        update_post_meta($post_id, 'ic_speakers', $row_count);
        update_post_meta($post_id, '_ic_speakers', 'field_ic_speakers');

        foreach ($speakers_data as $i => $speaker) {
            // If speaker is just a string, treat as name
            if (is_string($speaker)) {
                $speaker = array('name' => $speaker);
            }

            // Broad fallback chain for name
            $speaker_name = sanitize_text_field(
                $speaker['name'] ?? $speaker['speaker_name'] ?? $speaker['full_name'] ?? $speaker['speaker'] ?? ''
            );

            // Broad fallback chain for title/role
            $speaker_title = sanitize_text_field(
                $speaker['title'] ?? $speaker['role'] ?? $speaker['speaker_role'] ?? $speaker['speaker_title'] ?? $speaker['position'] ?? ''
            );

            // Photo — try provided URL first, then fall back to existing leader_photo
            $photo_value = '';
            $photo_url = $speaker['photo_url'] ?? $speaker['photo'] ?? $speaker['image_url'] ?? $speaker['image'] ?? '';
            if (!empty($photo_url)) {
                $photo_id = ic_rest_sideload_image($photo_url, $speaker_name ?: 'speaker');
                if (!is_wp_error($photo_id)) {
                    $photo_value = $photo_id;
                }
            }
            // If no photo provided, check if leader already has one
            if (empty($photo_value) && !empty($speaker_name)) {
                $existing_leader = get_term_by('name', $speaker_name, 'ic_leader');
                if ($existing_leader && !is_wp_error($existing_leader)) {
                    $existing_photo = get_term_meta($existing_leader->term_id, 'leader_photo', true);
                    if ($existing_photo) {
                        $photo_value = intval($existing_photo);
                    }
                }
            }

            // Log if still empty
            if (empty($speaker_name) && defined('WP_DEBUG') && WP_DEBUG) {
                error_log('[IC REST] Speaker ' . $i . ' name empty. Keys: ' . implode(', ', array_keys($speaker)) . ' | Values: ' . json_encode($speaker));
            }

            update_post_meta($post_id, "ic_speakers_{$i}_name", $speaker_name);
            update_post_meta($post_id, "_ic_speakers_{$i}_name", 'field_ic_speaker_name');
            update_post_meta($post_id, "ic_speakers_{$i}_title", $speaker_title);
            update_post_meta($post_id, "_ic_speakers_{$i}_title", 'field_ic_speaker_title');
            update_post_meta($post_id, "ic_speakers_{$i}_photo", $photo_value);
            update_post_meta($post_id, "_ic_speakers_{$i}_photo", 'field_ic_speaker_photo');
        }

        if (function_exists('ic_sync_speaker_taxonomies')) {
            ic_sync_speaker_taxonomies($post_id);
        }

        // Propagate photos to leader terms (REST API path — acf/save_post doesn't fire here)
        foreach ($data['speakers'] as $i => $speaker) {
            $speaker_name = sanitize_text_field($speaker['name'] ?? $speaker['speaker'] ?? $speaker['guest'] ?? '');
            if (empty($speaker_name)) continue;
            $photo_val = get_post_meta($post_id, "ic_speakers_{$i}_photo", true);
            if (!$photo_val || intval($photo_val) === 0) continue;

            $term = get_term_by('name', $speaker_name, 'ic_leader');
            if ($term && !is_wp_error($term)) {
                $existing = get_term_meta($term->term_id, 'leader_photo', true);
                if (!$existing) {
                    update_term_meta($term->term_id, 'leader_photo', intval($photo_val));
                }
            }
        }
    }

    // ── Timestamps repeater ──
    // Handle multiple possible key names from TPX enrichment
    $timestamps_data = $data['timestamps'] ?? $data['chapters'] ?? $data['chapter_timestamps'] ?? $data['segments'] ?? null;
    if (!empty($timestamps_data) && is_array($timestamps_data)) {
        ic_rest_clear_repeater($post_id, 'ic_timestamps', array('seconds', 'label', 'description'));

        $row_count = count($timestamps_data);
        update_post_meta($post_id, 'ic_timestamps', $row_count);
        update_post_meta($post_id, '_ic_timestamps', 'field_ic_timestamps');

        foreach ($timestamps_data as $i => $ts) {
            if (is_string($ts)) {
                $ts = array('label' => $ts);
            }

            $seconds = intval($ts['seconds'] ?? $ts['timestamp_seconds'] ?? $ts['time'] ?? $ts['start'] ?? $ts['start_seconds'] ?? 0);
            $label = sanitize_text_field($ts['label'] ?? $ts['title'] ?? $ts['chapter_title'] ?? $ts['heading'] ?? '');
            $desc = sanitize_text_field($ts['description'] ?? $ts['summary'] ?? $ts['content'] ?? '');

            // Log if label is empty
            if (empty($label) && defined('WP_DEBUG') && WP_DEBUG) {
                error_log('[IC REST] Timestamp ' . $i . ' label empty. Keys: ' . implode(', ', array_keys($ts)));
            }

            update_post_meta($post_id, "ic_timestamps_{$i}_seconds", $seconds);
            update_post_meta($post_id, "_ic_timestamps_{$i}_seconds", 'field_ic_ts_seconds');
            update_post_meta($post_id, "ic_timestamps_{$i}_label", $label);
            update_post_meta($post_id, "_ic_timestamps_{$i}_label", 'field_ic_ts_label');
            update_post_meta($post_id, "ic_timestamps_{$i}_description", $desc);
            update_post_meta($post_id, "_ic_timestamps_{$i}_description", 'field_ic_ts_description');
        }
    }

    // ── Takeaways repeater ──
    // Handle multiple possible key names from TPX enrichment
    $takeaways_data = $data['takeaways'] ?? $data['key_takeaways'] ?? $data['key_points'] ?? $data['highlights'] ?? $data['insights'] ?? null;
    if (!empty($takeaways_data) && is_array($takeaways_data)) {
        ic_rest_clear_repeater($post_id, 'ic_takeaways', array('text'));

        $row_count = count($takeaways_data);
        update_post_meta($post_id, 'ic_takeaways', $row_count);
        update_post_meta($post_id, '_ic_takeaways', 'field_ic_takeaways');

        foreach ($takeaways_data as $i => $ta) {
            $text = is_string($ta) ? $ta : ($ta['text'] ?? $ta['takeaway'] ?? $ta['point'] ?? $ta['description'] ?? '');
            $text = sanitize_text_field($text);

            update_post_meta($post_id, "ic_takeaways_{$i}_text", $text);
            update_post_meta($post_id, "_ic_takeaways_{$i}_text", 'field_ic_takeaway_text');
        }
    }
}


/**
 * Clear existing ACF repeater rows before re-writing.
 * Deletes both value and reference meta for each row/sub-field combo.
 */
function ic_rest_clear_repeater($post_id, $repeater_name, $sub_field_names) {
    $current_count = intval(get_post_meta($post_id, $repeater_name, true));
    if ($current_count > 0) {
        for ($i = 0; $i < $current_count; $i++) {
            foreach ($sub_field_names as $sf) {
                delete_post_meta($post_id, "{$repeater_name}_{$i}_{$sf}");
                delete_post_meta($post_id, "_{$repeater_name}_{$i}_{$sf}");
            }
        }
    }
    delete_post_meta($post_id, $repeater_name);
    delete_post_meta($post_id, '_' . $repeater_name);
}


// =========================================================================
// Taxonomy Assignment
// =========================================================================

function ic_rest_set_taxonomies($post_id, $data) {

    // Show (ic_show) — by slug, auto-creates if new
    if (!empty($data['show_slug'])) {
        $show_term = get_term_by('slug', sanitize_title($data['show_slug']), 'ic_show');
        if ($show_term) {
            wp_set_object_terms($post_id, array($show_term->term_id), 'ic_show', false);
        } else {
            // Auto-create — new series from TPX gets its own tab automatically
            $show_name = !empty($data['show_name'])
                ? sanitize_text_field($data['show_name'])
                : ucwords(str_replace('-', ' ', $data['show_slug']));
            $new_show = wp_insert_term($show_name, 'ic_show', array(
                'slug' => sanitize_title($data['show_slug']),
            ));
            if (!is_wp_error($new_show)) {
                wp_set_object_terms($post_id, array($new_show['term_id']), 'ic_show', false);
                if (defined('WP_DEBUG') && WP_DEBUG) {
                    error_log('[IC REST] Auto-created new show: "' . $show_name . '" (slug: ' . $data['show_slug'] . ')');
                }
            } else {
                error_log('[IC REST] Failed to create show "' . $data['show_slug'] . '": ' . $new_show->get_error_message());
            }
        }
    }

    // Format (ic_format) — by slug
    if (!empty($data['format_slug'])) {
        $format_term = get_term_by('slug', sanitize_title($data['format_slug']), 'ic_format');
        if ($format_term) {
            wp_set_object_terms($post_id, array($format_term->term_id), 'ic_format', false);
        } else {
            // Auto-create if it doesn't exist (e.g. new format from TPX)
            $new_format = wp_insert_term(ucwords(str_replace('-', ' ', $data['format_slug'])), 'ic_format', array(
                'slug' => sanitize_title($data['format_slug']),
            ));
            if (!is_wp_error($new_format)) {
                wp_set_object_terms($post_id, array($new_format['term_id']), 'ic_format', false);
            }
        }
    }

    // Pillar (ic_pillar) — 1 or 2 slugs (primary first). Strategic lens.
    // Accepts array `pillar_slugs` (preferred) OR legacy scalar `pillar_slug`.
    $pillar_slugs_input = array();
    if (!empty($data['pillar_slugs']) && is_array($data['pillar_slugs'])) {
        $pillar_slugs_input = $data['pillar_slugs'];
    } elseif (!empty($data['pillar_slug'])) {
        $pillar_slugs_input = array($data['pillar_slug']);
    }
    if (!empty($pillar_slugs_input)) {
        $pillar_term_ids = array();
        foreach (array_slice($pillar_slugs_input, 0, 2) as $slug) {
            $term = get_term_by('slug', sanitize_title($slug), 'ic_pillar');
            if ($term) $pillar_term_ids[] = $term->term_id;
        }
        if (!empty($pillar_term_ids)) {
            wp_set_object_terms($post_id, $pillar_term_ids, 'ic_pillar', false);
        }
    }

    // Function (ic_function) — 1 or 2 slugs (primary first). Functional area.
    // Orthogonal to pillar. Accepts `function_slugs` (preferred) OR `function_slug`.
    $function_slugs_input = array();
    if (!empty($data['function_slugs']) && is_array($data['function_slugs'])) {
        $function_slugs_input = $data['function_slugs'];
    } elseif (!empty($data['function_slug'])) {
        $function_slugs_input = array($data['function_slug']);
    }
    if (!empty($function_slugs_input)) {
        $function_term_ids = array();
        foreach (array_slice($function_slugs_input, 0, 2) as $slug) {
            $term = get_term_by('slug', sanitize_title($slug), 'ic_function');
            if ($term) $function_term_ids[] = $term->term_id;
        }
        if (!empty($function_term_ids)) {
            wp_set_object_terms($post_id, $function_term_ids, 'ic_function', false);
        }
    }

    // Tags (post_tag) — array of tag strings
    if (!empty($data['tags']) && is_array($data['tags'])) {
        $clean_tags = array_map('sanitize_text_field', $data['tags']);
        wp_set_object_terms($post_id, $clean_tags, 'post_tag', false);
    }

    // Leaders (ic_leader) — direct assignment if provided (otherwise auto-synced from speakers)
    if (!empty($data['leaders']) && is_array($data['leaders'])) {
        $clean_leaders = array_map('sanitize_text_field', $data['leaders']);
        wp_set_object_terms($post_id, $clean_leaders, 'ic_leader', false);
    }

    // Companies (ic_company) — direct assignment if provided
    if (!empty($data['companies']) && is_array($data['companies'])) {
        $clean_companies = array_map('sanitize_text_field', $data['companies']);
        wp_set_object_terms($post_id, $clean_companies, 'ic_company', false);
    }
}


// =========================================================================
// Thumbnail Sideload — Downloads YouTube thumbnail and sets as featured image
// =========================================================================

function ic_rest_sideload_thumbnail($post_id, $url, $title = '') {
    // WordPress media handling
    require_once(ABSPATH . 'wp-admin/includes/media.php');
    require_once(ABSPATH . 'wp-admin/includes/file.php');
    require_once(ABSPATH . 'wp-admin/includes/image.php');

    // Download to temp file
    $tmp = download_url($url, 30);
    if (is_wp_error($tmp)) {
        return $tmp;
    }

    // Determine file extension from URL
    $url_path = parse_url($url, PHP_URL_PATH);
    $ext = pathinfo($url_path, PATHINFO_EXTENSION);
    if (!$ext || !in_array(strtolower($ext), array('jpg', 'jpeg', 'png', 'webp', 'gif'))) {
        $ext = 'jpg'; // YouTube thumbnails are usually JPG
    }

    $file_array = array(
        'name'     => sanitize_file_name(($title ?: 'thumbnail') . '.' . $ext),
        'tmp_name' => $tmp,
    );

    // Sideload into media library
    $attachment_id = media_handle_sideload($file_array, $post_id, $title);

    if (is_wp_error($attachment_id)) {
        @unlink($tmp);
        return $attachment_id;
    }

    // Set as featured image
    set_post_thumbnail($post_id, $attachment_id);

    return $attachment_id;
}

/**
 * Sideload a generic image and return attachment ID (used for speaker photos)
 */
function ic_rest_sideload_image($url, $title = 'image') {
    require_once(ABSPATH . 'wp-admin/includes/media.php');
    require_once(ABSPATH . 'wp-admin/includes/file.php');
    require_once(ABSPATH . 'wp-admin/includes/image.php');

    $tmp = download_url($url, 30);
    if (is_wp_error($tmp)) return $tmp;

    $ext = pathinfo(parse_url($url, PHP_URL_PATH), PATHINFO_EXTENSION);
    if (!$ext || !in_array(strtolower($ext), array('jpg', 'jpeg', 'png', 'webp', 'gif'))) {
        $ext = 'jpg';
    }

    $file_array = array(
        'name'     => sanitize_file_name($title . '-photo.' . $ext),
        'tmp_name' => $tmp,
    );

    $attachment_id = media_handle_sideload($file_array, 0, $title);
    if (is_wp_error($attachment_id)) {
        @unlink($tmp);
    }

    return $attachment_id;
}


// =========================================================================
// Dedup Helper — Find existing post by YouTube video ID
// =========================================================================

function ic_rest_find_by_youtube_id($youtube_id) {
    $posts = get_posts(array(
        'post_type'   => 'ic_content',
        'post_status' => array('draft', 'publish', 'pending', 'private'),
        'meta_key'    => 'ic_youtube_id',
        'meta_value'  => sanitize_text_field($youtube_id),
        'numberposts' => 1,
    ));
    return !empty($posts) ? $posts[0] : null;
}


// =========================================================================
// GET /wp-json/ic/v1/content/lookup?youtube_id=XXXXX
// =========================================================================

function ic_rest_lookup_content($request) {
    $youtube_id = sanitize_text_field($request->get_param('youtube_id'));

    if (empty($youtube_id)) {
        return new WP_Error('missing_youtube_id', 'youtube_id parameter is required.', array('status' => 400));
    }

    $post = ic_rest_find_by_youtube_id($youtube_id);

    if ($post) {
        return new WP_REST_Response(array(
            'exists'   => true,
            'post_id'  => $post->ID,
            'status'   => $post->post_status,
            'title'    => $post->post_title,
            'edit_url' => admin_url('post.php?post=' . $post->ID . '&action=edit'),
            'view_url' => get_permalink($post->ID),
        ), 200);
    }

    return new WP_REST_Response(array('exists' => false), 200);
}


// =========================================================================
// POST /wp-json/ic/v1/content/bulk — Batch create from Google Sheet import
// =========================================================================

function ic_rest_bulk_create_content($request) {
    $data = $request->get_json_params();
    $items = $data['items'] ?? array();

    if (empty($items) || !is_array($items)) {
        return new WP_Error('missing_items', 'items array is required.', array('status' => 400));
    }

    if (count($items) > 50) {
        return new WP_Error('too_many_items', 'Maximum 50 items per batch.', array('status' => 400));
    }

    $results = array();

    foreach ($items as $index => $item) {
        // Wrap each item creation in the same handler
        $fake_request = new WP_REST_Request('POST', '/ic/v1/content');
        $fake_request->set_body(json_encode($item));
        $fake_request->set_header('Content-Type', 'application/json');

        // Set params directly
        $fake_request->set_body_params($item);

        $response = ic_rest_create_content($fake_request);

        if (is_wp_error($response)) {
            $results[] = array(
                'index'   => $index,
                'success' => false,
                'error'   => $response->get_error_message(),
                'title'   => $item['title'] ?? '(no title)',
            );
        } else {
            $resp_data = $response->get_data();
            $results[] = array(
                'index'   => $index,
                'success' => $resp_data['success'] ?? false,
                'post_id' => $resp_data['post_id'] ?? null,
                'code'    => $resp_data['code'] ?? null,
                'title'   => $item['title'] ?? '(no title)',
            );
        }
    }

    $created  = count(array_filter($results, function($r) { return !empty($r['success']) && $r['success'] === true; }));
    $skipped  = count(array_filter($results, function($r) { return !empty($r['code']) && $r['code'] === 'duplicate'; }));
    $failed   = count($results) - $created - $skipped;

    return new WP_REST_Response(array(
        'success'  => true,
        'total'    => count($results),
        'created'  => $created,
        'skipped'  => $skipped,
        'failed'   => $failed,
        'results'  => $results,
    ), 200);
}


// =========================================================================
// GET /wp-json/ic/v1/shows — List shows with WP term data
// =========================================================================

function ic_rest_get_shows($request) {
    $shows = get_terms(array(
        'taxonomy'   => 'ic_show',
        'hide_empty' => false,
    ));

    if (is_wp_error($shows)) {
        return new WP_Error('shows_error', 'Failed to retrieve shows.', array('status' => 500));
    }

    $result = array();
    foreach ($shows as $show) {
        $result[] = array(
            'term_id'     => $show->term_id,
            'name'        => $show->name,
            'slug'        => $show->slug,
            'count'       => $show->count,
            'host'        => get_field('ic_show_host', 'ic_show_' . $show->term_id) ?: '',
            'company'     => get_field('ic_show_company', 'ic_show_' . $show->term_id) ?: '',
            'color'       => get_field('ic_show_color', 'ic_show_' . $show->term_id) ?: '#C8A951',
            'description' => $show->description,
        );
    }

    return new WP_REST_Response(array(
        'success' => true,
        'shows'   => $result,
        'count'   => count($result),
    ), 200);
}


// =========================================================================
// GET /wp-json/ic/v1/health — Health check
// =========================================================================

// =========================================================================
// PATCH /wp-json/ic/v1/content/{id}/status — Update post status
// =========================================================================

/**
 * Update content post status. Used by n8n approval workflow.
 *
 * JSON body: { "status": "publish" }
 * Valid statuses: publish, draft, pending, private
 *
 * Returns post details including permalink for confirmation messages.
 */
function ic_rest_update_content_status($request) {
    $post_id = intval($request['id']);
    $data = $request->get_json_params();

    $post = get_post($post_id);
    if (!$post || $post->post_type !== 'ic_content') {
        return new WP_Error('not_found', 'Content post not found.', array('status' => 404));
    }

    $allowed_statuses = array('publish', 'draft', 'pending', 'private');
    $new_status = sanitize_text_field($data['status'] ?? '');

    if (!in_array($new_status, $allowed_statuses)) {
        return new WP_Error(
            'invalid_status',
            'Invalid status. Allowed: ' . implode(', ', $allowed_statuses),
            array('status' => 400)
        );
    }

    $old_status = $post->post_status;

    $result = wp_update_post(array(
        'ID'          => $post_id,
        'post_status' => $new_status,
    ), true);

    if (is_wp_error($result)) {
        return new WP_Error('update_failed', $result->get_error_message(), array('status' => 500));
    }

    // Log status change
    if (defined('WP_DEBUG') && WP_DEBUG) {
        error_log("[IC REST] Post {$post_id} status: {$old_status} → {$new_status}");
    }

    return new WP_REST_Response(array(
        'success'    => true,
        'post_id'    => $post_id,
        'old_status' => $old_status,
        'new_status' => $new_status,
        'title'      => $post->post_title,
        'view_url'   => get_permalink($post_id),
        'edit_url'   => get_edit_post_link($post_id, 'raw'),
    ), 200);
}


function ic_rest_health_check($request) {
    $acf_active = function_exists('acf_add_local_field_group');
    $mepr_active = class_exists('MeprOptions');

    $content_count = wp_count_posts('ic_content');
    $shows = get_terms(array('taxonomy' => 'ic_show', 'hide_empty' => false, 'fields' => 'slugs'));

    return new WP_REST_Response(array(
        'success'         => true,
        'theme_version'   => IC_VERSION ?? 'unknown',
        'acf_active'      => $acf_active,
        'memberpress'     => $mepr_active,
        'content_count'   => array(
            'publish' => $content_count->publish ?? 0,
            'draft'   => $content_count->draft ?? 0,
        ),
        'shows_registered' => is_array($shows) ? $shows : array(),
        'timestamp'        => current_time('c'),
    ), 200);
}

// ════════════════════════════════════════
// LEADER / CONTRIBUTOR ENRICHMENT
// ════════════════════════════════════════

/**
 * GET /leaders — List all ic_leader terms with key meta
 */
function ic_rest_get_leaders($request) {
    $leaders = get_terms(array(
        'taxonomy'   => 'ic_leader',
        'hide_empty' => false,
        'orderby'    => 'name',
        'order'      => 'ASC',
    ));

    if (is_wp_error($leaders)) {
        return new WP_REST_Response(array('error' => $leaders->get_error_message()), 500);
    }

    $result = array();
    foreach ($leaders as $l) {
        $result[] = array(
            'term_id'             => $l->term_id,
            'name'                => $l->name,
            'slug'                => $l->slug,
            'count'               => $l->count,
            'leader_photo'        => get_term_meta($l->term_id, 'leader_photo', true),
            'ic_contributor_company' => get_term_meta($l->term_id, 'ic_contributor_company', true),
            'ic_contributor_title'   => get_term_meta($l->term_id, 'ic_contributor_title', true),
            'ic_contributor_bio'     => get_term_meta($l->term_id, 'ic_contributor_bio', true) ? true : false,
            'ic_ec_page_url'      => get_term_meta($l->term_id, 'ic_ec_page_url', true),
            'ic_power_rank'       => get_term_meta($l->term_id, 'ic_power_rank', true),
            'ic_p100_articles'    => get_term_meta($l->term_id, 'ic_p100_articles', true) ? true : false,
        );
    }

    return new WP_REST_Response($result, 200);
}

/**
 * POST /leader/update-meta — Update a single term meta on an ic_leader
 * Body: { term_id: int, meta_key: string, meta_value: string }
 */
function ic_rest_update_leader_meta($request) {
    $body    = $request->get_json_params();
    $term_id = intval($body['term_id'] ?? 0);
    $key     = sanitize_text_field($body['meta_key'] ?? '');
    $value   = $body['meta_value'] ?? '';

    if (!$term_id || !$key) {
        return new WP_REST_Response(array('error' => 'term_id and meta_key required'), 400);
    }

    // Whitelist allowed meta keys for safety
    $allowed_keys = array(
        'ic_contributor_company', 'ic_contributor_title', 'ic_contributor_bio',
        'ic_contributor_stats', 'ic_contributor_photo', 'ic_contributor_url',
        'ic_ec_page_url', 'ic_power_rank', 'ic_rank_lander_url',
        'ic_p100_articles', 'leader_photo',
    );
    if (!in_array($key, $allowed_keys)) {
        return new WP_REST_Response(array('error' => 'meta_key not allowed: ' . $key), 403);
    }

    // Verify term exists and is ic_leader
    $term = get_term($term_id, 'ic_leader');
    if (!$term || is_wp_error($term)) {
        return new WP_REST_Response(array('error' => 'Leader term not found'), 404);
    }

    update_term_meta($term_id, $key, sanitize_text_field($value));

    return new WP_REST_Response(array(
        'success' => true,
        'term_id' => $term_id,
        'meta_key' => $key,
        'name'     => $term->name,
    ), 200);
}

/**
 * POST /leader/propagate-photos — Sync speaker photos from posts to leader terms
 */
function ic_rest_propagate_photos($request) {
    $leaders = get_terms(array('taxonomy' => 'ic_leader', 'hide_empty' => false));
    $updated = 0;
    $skipped = 0;

    foreach ($leaders as $leader) {
        $existing = get_term_meta($leader->term_id, 'leader_photo', true);
        if ($existing) {
            $skipped++;
            continue;
        }

        // Find posts tagged with this leader
        $posts = get_posts(array(
            'post_type'      => 'ic_content',
            'posts_per_page' => 20,
            'tax_query'      => array(array(
                'taxonomy' => 'ic_leader',
                'field'    => 'term_id',
                'terms'    => $leader->term_id,
            )),
        ));

        foreach ($posts as $p) {
            $count = intval(get_post_meta($p->ID, 'ic_speakers', true));
            for ($i = 0; $i < $count; $i++) {
                $name = get_post_meta($p->ID, "ic_speakers_{$i}_name", true);
                if (strtolower(trim($name)) === strtolower(trim($leader->name))) {
                    $photo = get_post_meta($p->ID, "ic_speakers_{$i}_photo", true);
                    if ($photo && intval($photo) > 0) {
                        update_term_meta($leader->term_id, 'leader_photo', intval($photo));
                        $updated++;
                        continue 3;
                    }
                }
            }
        }
    }

    return new WP_REST_Response(array(
        'success' => true,
        'updated' => $updated,
        'skipped' => $skipped,
        'total'   => count($leaders),
    ), 200);
}

/**
 * GET /content/by-youtube-id?ids=ID1,ID2,ID3
 * Returns IC posts matching the given YouTube IDs (exact meta match)
 */
function ic_rest_content_by_youtube_id($request) {
    $ids_param = $request->get_param('ids');
    if (empty($ids_param)) {
        return new WP_REST_Response(array('error' => 'ids parameter required'), 400);
    }

    $yt_ids = array_filter(array_map('sanitize_text_field', explode(',', $ids_param)));
    $results = array();

    foreach ($yt_ids as $yt_id) {
        $posts = get_posts(array(
            'post_type'      => 'ic_content',
            'posts_per_page' => 1,
            'post_status'    => 'publish',
            'meta_key'       => 'ic_youtube_id',
            'meta_value'     => $yt_id,
        ));
        if (!empty($posts)) {
            $p = $posts[0];
            $results[] = array(
                'id'         => $p->ID,
                'title'      => $p->post_title,
                'link'       => get_permalink($p),
                'youtube_id' => $yt_id,
            );
        }
    }

    return new WP_REST_Response($results, 200);
}

/**
 * POST /wp-json/ic/v1/expert-contributor/upsert
 *
 * Mirror an `ic_contributor` post from a Power100 source. Idempotent
 * on (_p100_source_id) → matched first, falls back to slug. Body shape:
 *   {
 *     p100_page_id:  int    (required — staging.power100.io page ID),
 *     p100_page_url: string (required — full URL on staging, used as canonical),
 *     slug:          string (required),
 *     title:         string (required — full contributor name),
 *     meta:          object (ec_* fields, written as raw post_meta),
 *     headshot_url:  string (optional — sideloaded into IC media library),
 *     pillar_terms:  array  (optional — ic_pillar slugs to assign),
 *     function_terms: array (optional — ic_function slugs to assign)
 *   }
 *
 * Status: drafts created as 'publish' (gated by ic_require_membership in
 * the single template — so members see them, non-members hit the gate).
 */
function ic_rest_upsert_expert_contributor($request) {
    $body = json_decode($request->get_body(), true);
    if (!is_array($body)) {
        return new WP_REST_Response(array('success' => false, 'error' => 'Invalid JSON'), 400);
    }

    $p100_id   = isset($body['p100_page_id']) ? intval($body['p100_page_id']) : 0;
    $p100_url  = isset($body['p100_page_url']) ? esc_url_raw($body['p100_page_url']) : '';
    $slug      = isset($body['slug']) ? sanitize_title($body['slug']) : '';
    $title     = isset($body['title']) ? sanitize_text_field($body['title']) : '';
    $meta      = isset($body['meta']) && is_array($body['meta']) ? $body['meta'] : array();
    $headshot  = isset($body['headshot_url']) ? esc_url_raw($body['headshot_url']) : '';

    if ($p100_id <= 0 || !$p100_url || !$slug || !$title) {
        return new WP_REST_Response(array(
            'success' => false,
            'error'   => 'p100_page_id, p100_page_url, slug, and title are required',
        ), 400);
    }

    // 1. Lookup by _p100_source_id meta (idempotency key)
    $existing = get_posts(array(
        'post_type'      => 'ic_contributor',
        'post_status'    => array('publish', 'draft', 'pending', 'private'),
        'meta_key'       => '_p100_source_id',
        'meta_value'     => $p100_id,
        'posts_per_page' => 1,
        'fields'         => 'ids',
    ));
    $existing_id = !empty($existing) ? $existing[0] : 0;

    // 2. Fallback: lookup by slug
    if (!$existing_id) {
        $by_slug = get_page_by_path($slug, OBJECT, 'ic_contributor');
        if ($by_slug) $existing_id = $by_slug->ID;
    }

    $action = '';
    if ($existing_id) {
        wp_update_post(array(
            'ID'         => $existing_id,
            'post_title' => $title,
            'post_name'  => $slug,
        ));
        $post_id = $existing_id;
        $action  = 'updated';
    } else {
        $post_id = wp_insert_post(array(
            'post_type'   => 'ic_contributor',
            'post_title'  => $title,
            'post_name'   => $slug,
            'post_status' => 'publish',
        ), true);
        if (is_wp_error($post_id)) {
            return new WP_REST_Response(array(
                'success' => false,
                'error'   => 'wp_insert_post failed: ' . $post_id->get_error_message(),
            ), 500);
        }
        $action = 'created';
    }

    // 3. Always set canonical-source meta
    update_post_meta($post_id, '_p100_source_id', $p100_id);
    update_post_meta($post_id, '_p100_source_url', $p100_url);

    // 4. Write all ec_* meta keys (skip empties so PATCH doesn't blank fields)
    foreach ($meta as $key => $val) {
        if (strpos($key, 'ec_') !== 0) continue;  // safety: only ec_* keys
        if ($val === null || $val === '') continue;
        update_post_meta($post_id, $key, $val);
    }

    // 5. Sideload headshot if provided + not already set
    if ($headshot && !has_post_thumbnail($post_id)) {
        require_once(ABSPATH . 'wp-admin/includes/file.php');
        require_once(ABSPATH . 'wp-admin/includes/media.php');
        require_once(ABSPATH . 'wp-admin/includes/image.php');
        $att_id = media_sideload_image($headshot, $post_id, $title . ' headshot', 'id');
        if (!is_wp_error($att_id) && $att_id) {
            set_post_thumbnail($post_id, $att_id);
            update_post_meta($post_id, 'ec_headshot', $att_id);
        }
    }

    // 6. Optional taxonomy assignments
    if (!empty($body['pillar_terms']) && is_array($body['pillar_terms'])) {
        wp_set_object_terms($post_id, array_map('sanitize_title', $body['pillar_terms']), 'ic_pillar', false);
    }
    if (!empty($body['function_terms']) && is_array($body['function_terms'])) {
        wp_set_object_terms($post_id, array_map('sanitize_title', $body['function_terms']), 'ic_function', false);
    }

    return new WP_REST_Response(array(
        'success'  => true,
        'action'   => $action,
        'ic_id'    => $post_id,
        'ic_url'   => get_permalink($post_id),
        'p100_id'  => $p100_id,
        'p100_url' => $p100_url,
    ), 200);
}
