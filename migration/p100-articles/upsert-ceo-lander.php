<?php
/**
 * Upsert a ranked CEO lander page from JSON on stdin.
 *
 * Reads JSON spec, creates or updates a WP page, sets the page template
 * to page-power-ranked-ceo.php, writes all pcl_* fields as post meta,
 * preserves slug + tracks original.
 *
 * Run via wp-cli (so WP environment is loaded):
 *   echo "$JSON" | wp eval-file upsert-ceo-lander.php
 *
 * Input JSON shape:
 * {
 *   "old_post_id":  11954,            // OPTIONAL — if known from body class
 *   "old_slug":     "andy-lindus-power-ranked-ceo",   // REQUIRED for idempotency
 *   "title":        "Andy Lindus",    // REQUIRED
 *   "fields": { pcl_*: ... }
 * }
 */

function out($obj) {
    echo json_encode($obj, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . "\n";
}

function err($msg, $extra = []) {
    out(array_merge(['ok' => false, 'error' => $msg], $extra));
    exit(1);
}

$raw = stream_get_contents(STDIN);
if (empty($raw)) err('no stdin input');

$spec = json_decode($raw, true);
if (!is_array($spec)) err('invalid JSON', ['parse_error' => json_last_error_msg()]);

// ── Required fields ──
foreach (['old_slug', 'title'] as $req) {
    if (empty($spec[$req])) err("missing required field: $req");
}

$old_slug = $spec['old_slug'];
$old_post_id = $spec['old_post_id'] ?? null;
$idempotency_key = '_pcl_source_slug';

// ── Sanitize the new-site slug to ASCII (safe URL routing) ──
function pcl_sanitize_slug($slug) {
    $slug = preg_replace('/[\x{2010}-\x{2015}]/u', '-', $slug);
    $slug = preg_replace('/[\x{2018}-\x{2019}]/u', '', $slug);
    $slug = preg_replace('/[\x{201C}-\x{201D}]/u', '', $slug);
    $slug = preg_replace('/[\x{2026}]/u', '', $slug);
    $slug = preg_replace('/[^a-z0-9-]/i', '', $slug);
    $slug = preg_replace('/-+/', '-', $slug);
    return trim(strtolower($slug), '-');
}
$new_slug = pcl_sanitize_slug($old_slug);

// ── Idempotency check: does a page with this old slug already exist? ──
$existing = get_posts([
    'post_type'      => 'page',
    'post_status'    => ['publish', 'draft', 'pending', 'private'],
    'meta_key'       => $idempotency_key,
    'meta_value'     => $old_slug,
    'posts_per_page' => 1,
    'fields'         => 'ids',
]);

$post_data = [
    'post_title'   => $spec['title'],
    'post_name'    => $new_slug,
    'post_status'  => 'publish',
    'post_type'    => 'page',
    'post_content' => '',  // template renders everything from ACF/meta
];

$action = 'create';
if (!empty($existing)) {
    $post_data['ID'] = (int) $existing[0];
    $action = 'update';
    $result_id = wp_update_post($post_data, true);
} else {
    $result_id = wp_insert_post($post_data, true);
}

if (is_wp_error($result_id) || !$result_id) {
    $msg = is_wp_error($result_id) ? $result_id->get_error_message() : 'wp_insert_post returned 0';
    err("wp upsert failed: $msg", ['old_slug' => $old_slug]);
}

$post_id = (int) $result_id;

// ── Force post_name explicitly via $wpdb (bypass sanitization) ──
global $wpdb;
$wpdb->update($wpdb->posts, ['post_name' => $new_slug], ['ID' => $post_id]);
clean_post_cache($post_id);

// ── Set the page template ──
update_post_meta($post_id, '_wp_page_template', 'page-power-ranked-ceo.php');

// ── Set idempotency meta ──
update_post_meta($post_id, $idempotency_key, $old_slug);
if ($old_post_id) {
    update_post_meta($post_id, '_pcl_source_old_post_id', (int)$old_post_id);
}

// ── Write all pcl_* fields as post meta ──
// IMPORTANT: explicitly DELETE meta when the new value is null/empty, so that
// stale values from previous extractor runs don't persist. Without this, if
// an earlier extractor version wrote a wrong value and a newer version correctly
// outputs null, the old wrong value would stay in the DB.
$fields = $spec['fields'] ?? [];
$meta_set = 0;
$meta_deleted = 0;
foreach ($fields as $name => $value) {
    if ($value === null || $value === '') {
        if (metadata_exists('post', $post_id, $name)) {
            delete_post_meta($post_id, $name);
            $meta_deleted++;
        }
        continue;
    }
    update_post_meta($post_id, $name, $value);
    $meta_set++;
}

// ── Verify final state ──
$final = get_post($post_id);

out([
    'ok'            => true,
    'action'        => $action,
    'post_id'       => $post_id,
    'old_slug'      => $old_slug,
    'new_slug'      => $final->post_name,
    'slug_match'    => $final->post_name === $new_slug,
    'template_set'  => 'page-power-ranked-ceo.php',
    'fields_set'    => $meta_set,
    'fields_deleted'=> $meta_deleted,
]);
