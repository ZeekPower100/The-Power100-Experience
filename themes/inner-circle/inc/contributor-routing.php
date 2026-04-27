<?php
/**
 * IC Contributor URL Routing — tier-aware paths.
 *
 * One post type (`ic_contributor`), two URL bases:
 *   /contributor/{slug}         → contributor_class != expert_contributor (regular contributors / show guests)
 *   /expert-contributor/{slug}  → expert contributors (ranked_ceo / ranked_partner / industry_leader / paid)
 *
 * Slug is the bare name (e.g. `gina-ruiz-sullivan`) — no trailing tier suffix.
 *
 * Pieces:
 *   1. Two add_rewrite_rule() entries — both resolve to ?ic_contributor={slug}
 *   2. post_type_link filter — emits the canonical URL based on meta
 *   3. template_redirect — 301s mismatched-tier accesses to the canonical path
 *   4. Old-URL redirect: /expert-contributor/{slug}-{contributor|expert-contributor}/ → new path
 *   5. Versioned flush_rewrite_rules() trigger
 *
 * If you change the routing rules, bump IC_CONTRIB_ROUTING_VERSION below
 * to force a one-time flush on next admin/page load.
 */
if (!defined('ABSPATH')) exit;

define('IC_CONTRIB_ROUTING_VERSION', '1.0.0');

/**
 * Decide which path prefix a given ic_contributor uses, based on classification meta.
 * Returns 'expert-contributor' or 'contributor'.
 *
 * Tier signals (any one wins → expert-contributor):
 *   - ec_contributor_type IN ('ceo','partner','industry_leader','ranked_ceo','ranked_partner')
 *   - contributor_class = 'expert_contributor' (legacy/p100-mirrored landers)
 *   - contributor_type IN ('ranked_ceo','ranked_partner','industry_leader')
 * Default → 'contributor' (show guests, article writers, unranked).
 */
function ic_contributor_path_prefix($post_id) {
    $ec_type = (string) get_post_meta($post_id, 'ec_contributor_type', true);
    if (in_array($ec_type, array('ceo','partner','industry_leader','ranked_ceo','ranked_partner'), true)) {
        return 'expert-contributor';
    }
    $cclass = (string) get_post_meta($post_id, 'contributor_class', true);
    if ($cclass === 'expert_contributor') return 'expert-contributor';
    $ctype = (string) get_post_meta($post_id, 'contributor_type', true);
    if (in_array($ctype, array('ranked_ceo','ranked_partner','industry_leader'), true)) {
        return 'expert-contributor';
    }
    return 'contributor';
}

// ── 1. Custom rewrite rules ────────────────────────────────────────────────
add_action('init', function() {
    add_rewrite_rule('^expert-contributor/([^/]+)/?$', 'index.php?ic_contributor=$matches[1]', 'top');
    add_rewrite_rule('^contributor/([^/]+)/?$',        'index.php?ic_contributor=$matches[1]', 'top');
}, 20);

// ── 2. post_type_link filter — emit the canonical URL ──────────────────────
add_filter('post_type_link', function($url, $post) {
    if (!$post || $post->post_type !== 'ic_contributor') return $url;
    $prefix = ic_contributor_path_prefix($post->ID);
    return home_url('/' . $prefix . '/' . $post->post_name . '/');
}, 10, 2);

// ── 3. Canonical enforcement: 301 if accessed via wrong-tier path ──────────
add_action('template_redirect', function() {
    if (!is_singular('ic_contributor')) return;
    $post = get_queried_object();
    if (!$post) return;
    $expected_prefix = ic_contributor_path_prefix($post->ID);
    $request_path = trim(parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH), '/');
    $actual_prefix = explode('/', $request_path)[0] ?? '';
    if ($actual_prefix === $expected_prefix) return;
    if (!in_array($actual_prefix, array('contributor', 'expert-contributor'), true)) return;
    $canonical = home_url('/' . $expected_prefix . '/' . $post->post_name . '/');
    wp_safe_redirect($canonical, 301);
    exit;
});

// ── 4. Old-URL 301: handle /expert-contributor/{name}-{contributor|expert-contributor}/ ──
// These were the legacy slugs before the tier-aware path split. WordPress's
// 404 handler fires before we can intercept on a clean URL, so we hook the
// old slug pattern in template_redirect (404 path) and look up by suffix-strip.
add_action('template_redirect', function() {
    if (!is_404()) return;
    $request_path = trim(parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH), '/');
    if (!preg_match('#^expert-contributor/(.+?)/?$#', $request_path, $m)) return;
    $old_slug = $m[1];
    // Try suffix-stripped lookup
    $naked = preg_replace('/-(expert-contributor|contributor)$/', '', $old_slug);
    if ($naked === $old_slug) return; // no suffix to strip — true 404
    $found = get_posts(array(
        'post_type'      => 'ic_contributor',
        'name'           => $naked,
        'post_status'    => 'publish',
        'posts_per_page' => 1,
    ));
    if (empty($found)) return;
    wp_safe_redirect(get_permalink($found[0]->ID), 301);
    exit;
}, 5);

// ── 5. One-time flush_rewrite_rules() when version changes ─────────────────
add_action('init', function() {
    if (get_option('ic_contrib_routing_ver') !== IC_CONTRIB_ROUTING_VERSION) {
        flush_rewrite_rules(false);
        update_option('ic_contrib_routing_ver', IC_CONTRIB_ROUTING_VERSION);
    }
}, 99);
