<?php
// Backfill featured images on ic_article posts by sideloading the first
// <img> found in each post's body content. The power100 article design
// places the "episode thumbnail" as the first inline image; we want that
// as the WP featured image so IC rail cards show it.
//
// Run via: wp eval-file /tmp/ic-article-thumbnail-backfill.php
// Env vars:
//   IC_THUMB_DRY=1   Don't actually sideload — just log what would happen
//   IC_THUMB_LIMIT=5 Stop after N processed (useful for dry-runs)
//
// Idempotent: skips articles that already have a featured image.

if (!defined('ABSPATH')) die('Must run via wp eval-file');
require_once(ABSPATH . 'wp-admin/includes/media.php');
require_once(ABSPATH . 'wp-admin/includes/file.php');
require_once(ABSPATH . 'wp-admin/includes/image.php');

$dry   = !!getenv('IC_THUMB_DRY');
$limit = (int) (getenv('IC_THUMB_LIMIT') ?: 9999);

WP_CLI::log(sprintf('[IC thumbnail backfill] dry=%s limit=%d', $dry ? 'YES' : 'no', $limit));

$posts = get_posts(array(
    'post_type'      => 'ic_article',
    'post_status'    => 'publish',
    'posts_per_page' => -1,
    'fields'         => 'ids',
));
WP_CLI::log(sprintf('  Found %d ic_article posts', count($posts)));

$processed = 0; $updated = 0; $skipped = 0; $no_img = 0; $failed = 0;

foreach ($posts as $post_id) {
    if ($processed >= $limit) break;
    $processed++;

    if (has_post_thumbnail($post_id)) {
        $skipped++;
        continue;
    }

    $content = get_post_field('post_content', $post_id);
    // Find first <img src="...">
    if (!preg_match('/<img[^>]+src=[\'"]([^\'"]+)[\'"]/i', $content, $m)) {
        $no_img++;
        continue;
    }
    $img_url = html_entity_decode($m[1], ENT_QUOTES, 'UTF-8');

    // Skip if the image URL is clearly a placeholder / data-uri
    if (strpos($img_url, 'data:') === 0) { $no_img++; continue; }

    if ($dry) {
        WP_CLI::log(sprintf('  [%d DRY] would sideload %s', $post_id, substr($img_url, 0, 90)));
        continue;
    }

    $title = get_the_title($post_id);
    $sideload_id = media_sideload_image($img_url, $post_id, $title, 'id');
    if (is_wp_error($sideload_id)) {
        WP_CLI::warning(sprintf('  [%d FAIL] %s', $post_id, $sideload_id->get_error_message()));
        $failed++;
        continue;
    }
    set_post_thumbnail($post_id, $sideload_id);
    // Also remember which source URL we used (in case we want to re-run / audit)
    update_post_meta($post_id, '_ic_thumbnail_source_url', $img_url);
    $updated++;

    if ($updated % 10 === 0) {
        WP_CLI::log(sprintf('  ... %d processed, %d thumbnails set, %d failures', $processed, $updated, $failed));
    }
}

WP_CLI::success(sprintf(
    '[IC thumbnail backfill] processed=%d, thumbnails_set=%d, already_had_thumb=%d, no_img_in_body=%d, failures=%d',
    $processed, $updated, $skipped, $no_img, $failed
));
