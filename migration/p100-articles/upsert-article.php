<?php
/**
 * Upsert a P100 article from JSON on stdin.
 *
 * Reads JSON spec from stdin, creates or updates the WP post, sets all
 * pr_* ACF fields, and writes the idempotency meta. Outputs result JSON
 * to stdout: { ok: true, post_id: N, action: "create"|"update" }
 *
 * Run via wp-cli (so WP environment is loaded):
 *   echo "$JSON" | wp eval-file upsert-article.php
 *   cat spec.json | wp eval-file upsert-article.php
 *
 * Input JSON shape (all fields optional except old_post_id, title, slug, date_gmt, post_content):
 * {
 *   "old_post_id":     12345,                       // REQUIRED — for idempotency
 *   "title":           "Article Title",             // REQUIRED
 *   "slug":            "article-slug",              // REQUIRED — preserved byte-for-byte
 *   "date":            "2026-04-08T14:50:10",       // local time
 *   "date_gmt":        "2026-04-08T14:50:10",       // REQUIRED
 *   "post_content":    "<p>...</p>",                // REQUIRED — cleaned body HTML
 *   "post_status":     "publish",                   // default publish
 *   "categories":      [13, 8],                     // term IDs to assign (optional)
 *   "fields": {
 *     "pr_subtitle":         "...",
 *     "pr_company_label":    "Power100 — Foo",
 *     "pr_youtube_url":      "https://www.youtube.com/watch?v=...",
 *     "pr_video_thumbnail":  "https://power100.io/.../thumb.jpg",
 *     "pr_images":           [],                    // array of attachment IDs (gallery)
 *     "pr_image_1_caption":  "...",
 *     "pr_image_2_caption":  "...",
 *     "pr_image_3_caption":  "...",
 *     "pr_faq":              [{"question":"...","answer":"..."}, ...],
 *     "pr_author_type":      "staff",
 *     "pr_author_name":      "Power100 Staff",
 *     "pr_author_ec":        null,
 *     "pr_author_photo":     null
 *   }
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
foreach (['old_post_id', 'title', 'slug', 'date_gmt', 'post_content'] as $req) {
    if (!isset($spec[$req])) err("missing required field: $req");
}

$old_id = (int) $spec['old_post_id'];
$idempotency_key = '_p100_old_post_id';

// ── Idempotency check: does a post with this old_post_id already exist? ──
$existing = get_posts([
    'post_type' => 'post',
    'post_status' => ['publish', 'draft', 'pending', 'future', 'private'],
    'meta_key' => $idempotency_key,
    'meta_value' => $old_id,
    'posts_per_page' => 1,
    'fields' => 'ids',
]);

// Convert ISO-8601 datetime to MySQL DATETIME format (no T separator, no timezone).
// REST returns "2026-04-08T14:50:10"; MySQL needs "2026-04-08 14:50:10".
$mysql_date     = iso_to_mysql_datetime($spec['date'] ?? $spec['date_gmt']);
$mysql_date_gmt = iso_to_mysql_datetime($spec['date_gmt']);

$post_data = [
    'post_title'    => $spec['title'],
    'post_name'     => $spec['slug'],          // CRITICAL: preserve slug byte-for-byte
    'post_content'  => $spec['post_content'],
    'post_status'   => $spec['post_status'] ?? 'publish',
    'post_type'     => 'post',
    'post_date'     => $mysql_date,
    'post_date_gmt' => $mysql_date_gmt,        // CRITICAL: original publish time
    'edit_date'     => true,                    // Force WP to accept past dates on update
];

function iso_to_mysql_datetime($iso) {
    if (empty($iso)) return null;
    // Strip the T separator and any trailing timezone info
    $clean = preg_replace('/[Tt]/', ' ', $iso);
    $clean = preg_replace('/(\.\d+)?([Zz]|[+-]\d{2}:?\d{2})$/', '', $clean);
    return trim($clean);
}

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
    err("wp upsert failed: $msg", ['old_post_id' => $old_id]);
}

$post_id = (int) $result_id;

// ── CRITICAL: re-set post_name explicitly because wp_insert_post may sanitize ──
// Use direct $wpdb update to bypass sanitization. Slug must be byte-for-byte.
global $wpdb;
$wpdb->update(
    $wpdb->posts,
    [
        'post_name'     => $spec['slug'],
        'post_date'     => $mysql_date,
        'post_date_gmt' => $mysql_date_gmt,
    ],
    ['ID' => $post_id]
);
clean_post_cache($post_id);

// ── Set idempotency meta ──
update_post_meta($post_id, $idempotency_key, $old_id);

// ── Track the original raw slug (for redirect map generation later) ──
if (!empty($spec['old_slug'])) {
    update_post_meta($post_id, '_p100_old_slug', $spec['old_slug']);
}

// ── Set categories if provided ──
if (!empty($spec['categories']) && is_array($spec['categories'])) {
    wp_set_post_categories($post_id, array_map('intval', $spec['categories']), false);
}

// ── Set all ACF fields via update_field (handles repeaters/galleries automatically) ──
$fields = $spec['fields'] ?? [];
$fields_set = 0;
$fields_failed = [];

foreach ($fields as $name => $value) {
    if ($value === null) continue;

    // For ACF repeater (pr_faq), value is an array of associative arrays.
    // ACF handles serialization when we use update_field().
    $ok = function_exists('update_field')
        ? update_field($name, $value, $post_id)
        : update_post_meta($post_id, $name, $value);

    if ($ok !== false) {
        $fields_set++;
    } else {
        $fields_failed[] = $name;
    }
}

// ── Verify final state ──
$final_post = get_post($post_id);

out([
    'ok'           => true,
    'action'       => $action,
    'post_id'      => $post_id,
    'old_post_id'  => $old_id,
    'slug_set'     => $final_post->post_name,
    'slug_match'   => $final_post->post_name === $spec['slug'],
    'date_gmt_set' => $final_post->post_date_gmt,
    'fields_set'   => $fields_set,
    'fields_failed'=> $fields_failed,
]);
