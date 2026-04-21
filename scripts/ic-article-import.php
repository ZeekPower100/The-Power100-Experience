<?php
// Imports staging.power100.io articles into IC as ic_article posts.
// Run via: wp eval-file /tmp/ic-article-import.php
//
// Configure via ENV vars (reliable across wp-cli versions):
//   IC_IMPORT_START=0       — offset into the 283-post corpus
//   IC_IMPORT_LIMIT=9999    — how many to attempt (default: all remaining)
//   IC_IMPORT_DRY=1         — 1 = don't write, just log what would happen
//
// Behavior:
//   - Fetches from https://staging.power100.io/wp-json/wp/v2/posts
//   - Idempotent: skips if an ic_article with matching _p100_source_id meta exists
//   - Sideloads featured image as a real WP attachment (currently none on source)
//   - Preserves: slug, date, title, content, excerpt, author name
//   - Postmeta captured: _p100_source_id, _p100_source_url, _p100_categories, _p100_author_name

if (!defined('ABSPATH')) die('Must run via wp eval-file');

$start = (int) (getenv('IC_IMPORT_START') ?: 0);
$limit = (int) (getenv('IC_IMPORT_LIMIT') ?: 9999);
$dry   = !!getenv('IC_IMPORT_DRY');

WP_CLI::log(sprintf('[IC article import] start=%d, limit=%d, dry=%s', $start, $limit, $dry ? 'YES' : 'no'));

require_once(ABSPATH . 'wp-admin/includes/media.php');
require_once(ABSPATH . 'wp-admin/includes/file.php');
require_once(ABSPATH . 'wp-admin/includes/image.php');

$api_base = 'https://staging.power100.io/wp-json/wp/v2';

$per_page = 100;
$page     = intval($start / $per_page) + 1;
$skip_in_page = $start % $per_page;

$remaining = $limit;
$imported  = 0;
$skipped   = 0;
$failed    = 0;

while ($remaining > 0) {
    $url = sprintf(
        '%s/posts?per_page=%d&page=%d&status=publish&orderby=date&order=asc&_embed=1',
        $api_base, $per_page, $page
    );
    WP_CLI::log("  Fetching page=$page");
    $resp = wp_remote_get($url, array('timeout' => 60));
    if (is_wp_error($resp) || wp_remote_retrieve_response_code($resp) !== 200) {
        WP_CLI::warning('  Fetch failed or non-200 — stopping.');
        break;
    }
    $posts = json_decode(wp_remote_retrieve_body($resp), true);
    if (!is_array($posts) || empty($posts)) break;

    if ($skip_in_page > 0) {
        $posts = array_slice($posts, $skip_in_page);
        $skip_in_page = 0;
    }

    foreach ($posts as $src) {
        if ($remaining <= 0) break 2;
        $remaining--;

        $src_id = (int) $src['id'];
        $src_slug = sanitize_title($src['slug']);

        $existing = get_posts(array(
            'post_type'      => 'ic_article',
            'meta_key'       => '_p100_source_id',
            'meta_value'     => $src_id,
            'posts_per_page' => 1,
            'fields'         => 'ids',
            'post_status'    => array('publish','draft','pending','private'),
        ));
        if (!empty($existing)) {
            WP_CLI::log(sprintf('  [%d → skip] already imported as post #%d', $src_id, $existing[0]));
            $skipped++;
            continue;
        }

        $title   = isset($src['title']['rendered']) ? html_entity_decode($src['title']['rendered'], ENT_QUOTES, 'UTF-8') : '';
        $content = isset($src['content']['rendered']) ? $src['content']['rendered'] : '';
        $excerpt = isset($src['excerpt']['rendered']) ? wp_strip_all_tags($src['excerpt']['rendered']) : '';
        $date    = isset($src['date']) ? $src['date'] : current_time('mysql');
        $author_name = '';
        if (!empty($src['_embedded']['author'][0]['name'])) {
            $author_name = $src['_embedded']['author'][0]['name'];
        }

        if ($dry) {
            WP_CLI::log(sprintf('  [%d DRY] would import "%s" (slug=%s)', $src_id, substr($title, 0, 60), $src_slug));
            continue;
        }

        $new_post = array(
            'post_type'     => 'ic_article',
            'post_status'   => 'publish',
            'post_title'    => $title,
            'post_name'     => $src_slug,
            'post_content'  => $content,
            'post_excerpt'  => $excerpt,
            'post_date'     => $date,
            'post_date_gmt' => get_gmt_from_date($date),
        );
        $new_id = wp_insert_post($new_post, true);
        if (is_wp_error($new_id)) {
            WP_CLI::warning(sprintf('  [%d → FAIL] wp_insert_post: %s', $src_id, $new_id->get_error_message()));
            $failed++;
            continue;
        }

        update_post_meta($new_id, '_p100_source_id', $src_id);
        update_post_meta($new_id, '_p100_source_url', isset($src['link']) ? $src['link'] : '');
        if (!empty($src['categories']) && is_array($src['categories'])) {
            update_post_meta($new_id, '_p100_categories', implode(',', array_map('intval', $src['categories'])));
        }
        if ($author_name) {
            update_post_meta($new_id, '_p100_author_name', $author_name);
        }

        $featured_url = '';
        if (!empty($src['_embedded']['wp:featuredmedia'][0]['source_url'])) {
            $featured_url = $src['_embedded']['wp:featuredmedia'][0]['source_url'];
        }
        if ($featured_url) {
            $sideload_id = media_sideload_image($featured_url, $new_id, $title, 'id');
            if (is_wp_error($sideload_id)) {
                WP_CLI::warning(sprintf('    [%d thumb FAIL] %s', $src_id, $sideload_id->get_error_message()));
            } else {
                set_post_thumbnail($new_id, $sideload_id);
            }
        }

        WP_CLI::log(sprintf('  [%d → %d] "%s"', $src_id, $new_id, substr($title, 0, 50)));
        $imported++;
    }

    $page++;
    if (count($posts) < $per_page) break;
}

WP_CLI::success(sprintf('[IC article import] imported=%d, skipped=%d, failed=%d', $imported, $skipped, $failed));
