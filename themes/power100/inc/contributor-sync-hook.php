<?php
/**
 * Contributor Sync Hook — staging WP → tpedb expert_contributors
 *
 * On every save of an ec_contributor_type page, fire a non-blocking POST to
 * the TPE backend's POST /api/contributor-sync/from-staging endpoint. The
 * backend pulls the page's ec_* meta and writes any EMPTY tpedb columns
 * (additive only — never overwrites).
 *
 * Filters: skips autosaves, revisions, auto-drafts, wp-cron, REST internal
 * background saves where the post isn't actually being published. Only fires
 * on publish status with ec_contributor_type meta present.
 *
 * Auth: shared secret via X-Sync-Secret header. Set CONTRIBUTOR_SYNC_SECRET
 * (or define('CONTRIBUTOR_SYNC_SECRET', '...')) in wp-config.php — must match
 * the backend's env var of the same name.
 *
 * Failure mode: non-blocking (timeout 2s, blocking=false). If the backend is
 * down, the save still completes — drift can be reconciled by re-running
 * migration/contributor-backfill/reverse-sync-staging-to-tpedb.js.
 */

if (!defined('ABSPATH')) exit;

if (!function_exists('p100_contributor_sync_endpoint')) {
    function p100_contributor_sync_endpoint() {
        if (defined('CONTRIBUTOR_SYNC_BACKEND_URL')) return CONTRIBUTOR_SYNC_BACKEND_URL;
        if (getenv('CONTRIBUTOR_SYNC_BACKEND_URL')) return getenv('CONTRIBUTOR_SYNC_BACKEND_URL');
        return 'https://tpx.power100.io/api/contributor-sync/from-staging';
    }

    function p100_contributor_sync_secret() {
        if (defined('CONTRIBUTOR_SYNC_SECRET')) return CONTRIBUTOR_SYNC_SECRET;
        if (getenv('CONTRIBUTOR_SYNC_SECRET')) return getenv('CONTRIBUTOR_SYNC_SECRET');
        return '';
    }
}

add_action('save_post_page', 'p100_fire_contributor_sync_hook', 20, 3);

if (!function_exists('p100_fire_contributor_sync_hook')) {
    function p100_fire_contributor_sync_hook($post_id, $post, $update) {
        // Guards: skip noisy / non-meaningful saves
        if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) return;
        if (defined('DOING_CRON') && DOING_CRON) return;
        if (wp_is_post_revision($post_id)) return;
        if (wp_is_post_autosave($post_id)) return;
        if (!$post || $post->post_status !== 'publish') return;

        // Only contributor pages
        $contributor_type = get_post_meta($post_id, 'ec_contributor_type', true);
        if (empty($contributor_type)) return;

        $endpoint = p100_contributor_sync_endpoint();
        $secret   = p100_contributor_sync_secret();
        if (empty($secret)) {
            error_log('[contributor-sync-hook] CONTRIBUTOR_SYNC_SECRET not configured — skipping');
            return;
        }

        // Fire non-blocking POST. timeout=2s + blocking=false means WP doesn't
        // wait for the backend response — the save returns immediately.
        $response = wp_remote_post($endpoint, [
            'method'    => 'POST',
            'timeout'   => 2,
            'blocking'  => false,
            'headers'   => [
                'Content-Type'   => 'application/json',
                'X-Sync-Secret'  => $secret,
                'User-Agent'     => 'P100-WP-Hook/1.0',
            ],
            'body'      => wp_json_encode(['wp_page_id' => (int) $post_id]),
        ]);

        if (is_wp_error($response)) {
            // Non-blocking sends typically don't surface errors here, but log if they do
            error_log('[contributor-sync-hook] non-fatal: ' . $response->get_error_message());
        }
    }
}
