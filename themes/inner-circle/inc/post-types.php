<?php
/**
 * Custom Post Types & Taxonomies
 * Inner Circle v3.1 — Shows + Formats
 */
if (!defined('ABSPATH')) exit;

function ic_register_post_types() {

    // CPT: Content
    register_post_type('ic_content', array(
        'labels' => array(
            'name' => 'Content', 'singular_name' => 'Content',
            'add_new' => 'Add New', 'add_new_item' => 'Add New Content',
            'edit_item' => 'Edit Content', 'view_item' => 'View Content',
            'search_items' => 'Search Content', 'not_found' => 'No content found',
            'all_items' => 'All Content', 'menu_name' => 'Content',
        ),
        'public' => true, 'has_archive' => true,
        'rewrite' => array('slug' => 'content', 'with_front' => false),
        'menu_icon' => 'dashicons-video-alt3',
        'supports' => array('title', 'editor', 'thumbnail', 'excerpt', 'custom-fields'),
        'show_in_rest' => true, 'menu_position' => 5,
        'taxonomies' => array('post_tag'),
    ));

    // CPT: Article — imported from staging.power100.io (2026-04-21)
    // Shares ic_pillar + ic_function taxonomies with ic_content so the same
    // 4 pillars / 4 functions classify both videos and articles uniformly.
    register_post_type('ic_article', array(
        'labels' => array(
            'name' => 'Articles', 'singular_name' => 'Article',
            'add_new' => 'Add New', 'add_new_item' => 'Add New Article',
            'edit_item' => 'Edit Article', 'view_item' => 'View Article',
            'search_items' => 'Search Articles', 'not_found' => 'No articles found',
            'all_items' => 'All Articles', 'menu_name' => 'Articles',
        ),
        'public' => true, 'has_archive' => 'articles',
        'rewrite' => array('slug' => 'articles', 'with_front' => false),
        'menu_icon' => 'dashicons-media-document',
        'supports' => array('title', 'editor', 'thumbnail', 'excerpt', 'author', 'custom-fields'),
        'show_in_rest' => true, 'menu_position' => 6,
        'taxonomies' => array('post_tag'),
    ));

    // Show — PRIMARY filter (all peer-level, no nesting)
    register_taxonomy('ic_show', 'ic_content', array(
        'labels' => array(
            'name' => 'Shows', 'singular_name' => 'Show',
            'all_items' => 'All Shows', 'edit_item' => 'Edit Show',
            'add_new_item' => 'Add New Show', 'menu_name' => 'Shows',
        ),
        'hierarchical' => true, 'show_in_rest' => true,
        'show_admin_column' => true,
        'rewrite' => array('slug' => 'show', 'with_front' => false),
    ));

    // Format — for non-show content (Feature Interview, Event Coverage, etc.)
    register_taxonomy('ic_format', 'ic_content', array(
        'labels' => array(
            'name' => 'Formats', 'singular_name' => 'Format',
            'all_items' => 'All Formats', 'edit_item' => 'Edit Format',
            'add_new_item' => 'Add New Format', 'menu_name' => 'Formats',
        ),
        'hierarchical' => true, 'show_in_rest' => true,
        'show_admin_column' => true,
        'rewrite' => array('slug' => 'format', 'with_front' => false),
    ));

    // Pillar — Growth, Culture, Community, Innovation (strategic lens)
    register_taxonomy('ic_pillar', array('ic_content', 'ic_resource', 'ic_article'), array(
        'labels' => array(
            'name' => 'Pillars', 'singular_name' => 'Pillar',
            'all_items' => 'All Pillars', 'edit_item' => 'Edit Pillar',
            'add_new_item' => 'Add New Pillar', 'menu_name' => 'Pillars',
        ),
        'hierarchical' => true, 'show_in_rest' => true,
        'show_admin_column' => true,
        'rewrite' => array('slug' => 'pillar', 'with_front' => false),
    ));

    // Function — Sales, Marketing, Operations, Customer Experience (functional area)
    // Orthogonal to pillar: a post can be "Growth + Sales" or "Culture + Operations".
    register_taxonomy('ic_function', array('ic_content', 'ic_resource', 'ic_article'), array(
        'labels' => array(
            'name' => 'Functions', 'singular_name' => 'Function',
            'all_items' => 'All Functions', 'edit_item' => 'Edit Function',
            'add_new_item' => 'Add New Function', 'menu_name' => 'Functions',
        ),
        'hierarchical' => true, 'show_in_rest' => true,
        'show_admin_column' => true,
        'rewrite' => array('slug' => 'function', 'with_front' => false),
    ));

    // Leader — auto-populated from speakers, filterable by name
    register_taxonomy('ic_leader', 'ic_content', array(
        'labels' => array(
            'name' => 'Leaders', 'singular_name' => 'Leader',
            'all_items' => 'All Leaders', 'edit_item' => 'Edit Leader',
            'add_new_item' => 'Add New Leader', 'menu_name' => 'Leaders',
        ),
        'hierarchical' => false, 'show_in_rest' => true,
        'show_admin_column' => false,
        'rewrite' => array('slug' => 'leader', 'with_front' => false),
    ));

    // Event — specific event names for event content (Rilla Masters, Top Rep Boot Camp, etc.)
    register_taxonomy('ic_event', 'ic_content', array(
        'labels' => array(
            'name' => 'Events', 'singular_name' => 'Event',
            'all_items' => 'All Events', 'edit_item' => 'Edit Event',
            'add_new_item' => 'Add New Event', 'menu_name' => 'Events',
        ),
        'hierarchical' => false, 'show_in_rest' => true,
        'show_admin_column' => false,
        'rewrite' => array('slug' => 'event', 'with_front' => false),
    ));

    // Company — auto-populated from speaker titles, filterable
    register_taxonomy('ic_company', 'ic_content', array(
        'labels' => array(
            'name' => 'Companies', 'singular_name' => 'Company',
            'all_items' => 'All Companies', 'edit_item' => 'Edit Company',
            'add_new_item' => 'Add New Company', 'menu_name' => 'Companies',
        ),
        'hierarchical' => false, 'show_in_rest' => true,
        'show_admin_column' => false,
        'rewrite' => array('slug' => 'company', 'with_front' => false),
    ));

    // CPT: Expert Contributor — IC dark-themed mirror of staging.power100.io
    // contributor landers. Canonical lives on Power100; IC mirrors so members
    // can read profiles without leaving the gated portal.
    // Source URL preserved in _p100_source_url meta (used as rel=canonical).
    register_post_type('ic_contributor', array(
        'labels' => array(
            'name' => 'Expert Contributors', 'singular_name' => 'Expert Contributor',
            'add_new' => 'Add New', 'add_new_item' => 'Add New Expert Contributor',
            'edit_item' => 'Edit Expert Contributor', 'view_item' => 'View Expert Contributor',
            'search_items' => 'Search Expert Contributors', 'not_found' => 'No expert contributors found',
            'all_items' => 'All Expert Contributors', 'menu_name' => 'Expert Contributors',
        ),
        'public' => true, 'has_archive' => false, // archive lives at the existing /contributors/ page template
        // Routing is handled in inc/contributor-routing.php — two paths:
        //   /contributor/{slug}         → for contributor_class != expert_contributor
        //   /expert-contributor/{slug}  → for expert contributors (CEO/Partner/IL/paid)
        'rewrite' => false,
        'query_var' => 'ic_contributor',
        'menu_icon' => 'dashicons-id-alt',
        'supports' => array('title', 'thumbnail', 'custom-fields'),
        'show_in_rest' => true, 'menu_position' => 7,
    ));

    // CPT: Resources
    register_post_type('ic_resource', array(
        'labels' => array(
            'name' => 'Resources', 'singular_name' => 'Resource',
            'add_new' => 'Add New', 'add_new_item' => 'Add New Resource',
            'edit_item' => 'Edit Resource', 'view_item' => 'View Resource',
            'search_items' => 'Search Resources', 'not_found' => 'No resources found',
            'all_items' => 'All Resources', 'menu_name' => 'Resources',
        ),
        'public' => true, 'has_archive' => true,
        'rewrite' => array('slug' => 'resources', 'with_front' => false),
        'menu_icon' => 'dashicons-media-document',
        'supports' => array('title', 'editor', 'thumbnail', 'excerpt'),
        'show_in_rest' => true, 'menu_position' => 6,
    ));

    // Resource Type
    register_taxonomy('ic_resource_type', 'ic_resource', array(
        'labels' => array(
            'name' => 'Resource Types', 'singular_name' => 'Resource Type', 'menu_name' => 'Resource Types',
        ),
        'hierarchical' => true, 'show_in_rest' => true,
        'show_admin_column' => true,
        'rewrite' => array('slug' => 'resource-type', 'with_front' => false),
    ));
}
add_action('init', 'ic_register_post_types');

/**
 * Expose key meta fields in REST API for ic_content
 * Enables homepage concierge content filtering to read YouTube ID + duration
 */
function ic_register_rest_meta() {
    $meta_keys = array('ic_youtube_id', 'ic_duration', 'ic_video_url', 'ic_episode_number', 'ic_hook_text', 'ic_hook_full_title');
    foreach ($meta_keys as $key) {
        register_post_meta('ic_content', $key, array(
            'show_in_rest' => true,
            'single' => true,
            'type' => 'string',
        ));
    }
}
add_action('init', 'ic_register_rest_meta');

/**
 * Default terms on activation
 */
function ic_insert_default_terms() {
    $shows = array(
        'inner-circle'         => 'Inner Circle w/ Greg & Paul',
        'powerchat'            => 'PowerChat',
        'feature-interviews'   => 'Feature Interviews',
        'events'               => 'Events',
        'day-in-the-life'      => 'Day In The Life',
        'executive-interviews' => 'Executive Interviews',
        'customer-interviews'  => 'Customer Interviews',
        'rapid-fire-interviews' => 'Rapid Fire Interviews',
        'outside-the-lines'    => 'Outside The Lines',
        'highlights'           => 'Highlights',
        'power100-spotlight'   => 'Power100 Spotlight',
        'grit-to-gold'        => 'Grit To Gold w/ Paul Burleson',
        'beyond-the-hammer'   => 'Beyond The Hammer w/ Brian Gottlieb',
        'clever-marketing'    => 'Clever Marketing w/ Daniel Rahmon',
        'remodel-boom'        => 'Remodel Boom w/ Jadon Moerdyk',
    );
    foreach ($shows as $slug => $name) {
        if (!term_exists($slug, 'ic_show')) {
            wp_insert_term($name, 'ic_show', array('slug' => $slug));
        }
    }

    $pillars = array(
        'growth' => 'Growth', 'culture' => 'Culture',
        'community' => 'Community', 'innovation' => 'Innovation',
    );
    foreach ($pillars as $slug => $name) {
        if (!term_exists($slug, 'ic_pillar')) {
            wp_insert_term($name, 'ic_pillar', array('slug' => $slug));
        }
    }

    $functions = array(
        'sales'                => 'Sales',
        'marketing'            => 'Marketing',
        'operations'           => 'Operations',
        'customer-experience'  => 'Customer Experience',
    );
    foreach ($functions as $slug => $name) {
        if (!term_exists($slug, 'ic_function')) {
            wp_insert_term($name, 'ic_function', array('slug' => $slug));
        }
    }

    $events = array(
        'rilla-masters'        => 'Rilla Masters',
        'top-rep-boot-camp'    => 'Top Rep Boot Camp',
        'pinnacle-experience'  => 'The Pinnacle Experience',
        'growth-mastery-summit' => 'Growth Mastery Summit',
        'legends-awards'       => 'Legends of Home Improvement Awards',
        'lifetime-classic'     => 'Lifetime Classic',
        'richards-expo'        => 'Richards Building Supply Expo',
    );
    foreach ($events as $slug => $name) {
        if (!term_exists($slug, 'ic_event')) {
            wp_insert_term($name, 'ic_event', array('slug' => $slug));
        }
    }
}
add_action('after_switch_theme', 'ic_insert_default_terms');

// Also run on init (once) so existing installs get new show terms without re-activating
function ic_maybe_seed_terms() {
    $seeded_version = get_option('ic_terms_seeded', '0');
    if (version_compare($seeded_version, '3.4.0', '<')) {
        ic_insert_default_terms();
        update_option('ic_terms_seeded', '3.4.0');
    }
}
add_action('init', 'ic_maybe_seed_terms', 20);

function ic_flush_rewrites() {
    ic_register_post_types();
    flush_rewrite_rules();
}
add_action('after_switch_theme', 'ic_flush_rewrites');

/**
 * Get content label: "PowerChat · Ep. 12" or "Inner Circle · March 2026" or "Feature Interview"
 */
function ic_get_content_label($post_id = null) {
    if (!$post_id) $post_id = get_the_ID();

    // Show first (primary)
    $shows = get_the_terms($post_id, 'ic_show');
    if (!empty($shows) && !is_wp_error($shows)) {
        $label = $shows[0]->name;
        $ep_num = get_post_meta($post_id, 'ic_episode_number', true);
        if ($ep_num) $label .= ' · Ep. ' . intval($ep_num);
        return $label;
    }

    // Fall back to format
    $formats = get_the_terms($post_id, 'ic_format');
    if (!empty($formats) && !is_wp_error($formats)) {
        return $formats[0]->name;
    }

    return 'Content';
}

/**
 * Get show slug for CSS class
 */
function ic_get_show_class($post_id = null) {
    if (!$post_id) $post_id = get_the_ID();
    $shows = get_the_terms($post_id, 'ic_show');
    if (!empty($shows) && !is_wp_error($shows)) return 'ic-show-' . $shows[0]->slug;
    $formats = get_the_terms($post_id, 'ic_format');
    if (!empty($formats) && !is_wp_error($formats)) return 'ic-format-' . $formats[0]->slug;
    return 'ic-show-default';
}

/**
 * Auto-sync Leader and Company taxonomies when speakers are saved
 */
function ic_sync_speaker_taxonomies($post_id) {
    if (get_post_type($post_id) !== 'ic_content') return;

    // Try ACF get_field first, fall back to raw post meta (REST API posts)
    $speakers = get_field('ic_speakers', $post_id);
    if (empty($speakers) || !is_array($speakers)) {
        // Fallback: read from raw post meta (for REST-API-created posts)
        $count = intval(get_post_meta($post_id, 'ic_speakers', true));
        if ($count <= 0) return;
        $speakers = array();
        for ($i = 0; $i < $count; $i++) {
            $speakers[] = array(
                'name'  => get_post_meta($post_id, "ic_speakers_{$i}_name", true),
                'title' => get_post_meta($post_id, "ic_speakers_{$i}_title", true),
                'photo' => get_post_meta($post_id, "ic_speakers_{$i}_photo", true),
            );
        }
    }

    if (empty($speakers)) return;

    $leaders = array();
    $companies = array();

    foreach ($speakers as $s) {
        if (!empty($s['name'])) $leaders[] = trim($s['name']);
        if (!empty($s['title'])) {
            $t = $s['title'];
            if (preg_match('/(?:,|·|\|)\s*(.+)$/', $t, $m)) {
                $companies[] = trim($m[1]);
            } else {
                $companies[] = trim($t);
            }
        }
    }

    if (!empty($leaders)) wp_set_object_terms($post_id, $leaders, 'ic_leader', false);
    if (!empty($companies)) wp_set_object_terms($post_id, $companies, 'ic_company', false);

    // Propagate speaker photos to leader terms (if leader doesn't have one yet)
    foreach ($speakers as $s) {
        if (empty($s['name'])) continue;
        $photo_id = !empty($s['photo']) ? intval($s['photo']) : 0;
        if (!$photo_id) continue;

        $term = get_term_by('name', trim($s['name']), 'ic_leader');
        if ($term && !is_wp_error($term)) {
            $existing_photo = get_term_meta($term->term_id, 'leader_photo', true);
            if (!$existing_photo) {
                update_term_meta($term->term_id, 'leader_photo', $photo_id);
            }
        }
    }

    // Phase B: notify TPE backend so each speaker auto-gets a Power100
    // contributor lander (idempotent — safe to re-fire on every episode save).
    // Fire-and-forget per speaker; failures are logged but never block the save.
    $tpe_base    = defined('IC_TPE_BACKEND_URL') ? IC_TPE_BACKEND_URL : 'https://tpx.power100.io';
    $tpe_api_key = defined('IC_TPE_API_KEY') ? IC_TPE_API_KEY : (defined('TPX_SALES_AGENT_API_KEY') ? TPX_SALES_AGENT_API_KEY : '');
    if ($tpe_api_key) {
        foreach ($speakers as $s) {
            if (empty($s['name'])) continue;
            $name    = trim($s['name']);
            $title   = !empty($s['title']) ? trim($s['title']) : '';
            $company = '';
            if ($title && preg_match('/(?:,|·|\|)\s*(.+)$/', $title, $cm)) {
                $company = trim($cm[1]);
                $title   = trim(preg_replace('/(?:,|·|\|)\s*.+$/', '', $title));
            }
            $photo_url = '';
            if (!empty($s['photo']) && is_numeric($s['photo'])) {
                $photo_url = wp_get_attachment_url(intval($s['photo'])) ?: '';
            }
            wp_remote_post($tpe_base . '/api/expert-contributors/upsert-from-episode', array(
                'timeout'  => 4,
                'blocking' => false,  // fire-and-forget
                'headers'  => array(
                    'Content-Type' => 'application/json',
                    'X-API-Key'    => $tpe_api_key,
                ),
                'body'     => wp_json_encode(array(
                    'name'            => $name,
                    'title'           => $title,
                    'company'         => $company,
                    'photo_url'       => $photo_url,
                    'episode_post_id' => $post_id,
                )),
            ));
        }
    }
}
add_action('acf/save_post', 'ic_sync_speaker_taxonomies', 20);
