<?php
/**
 * Inner Circle - GeneratePress Child Theme Functions
 * Power100 Membership Portal v2.0
 */

if (!defined('ABSPATH')) exit;

define('IC_VERSION', '4.0.2');
define('IC_THEME_DIR', get_stylesheet_directory());
define('IC_THEME_URI', get_stylesheet_directory_uri());

/**
 * Enqueue styles and scripts
 */
/**
 * Returns filemtime for a theme-relative asset, falling back to IC_VERSION.
 * Used as the enqueue version so any edit auto-busts browser cache.
 */
function ic_asset_ver($rel_path) {
    $v = @filemtime(IC_THEME_DIR . '/' . ltrim($rel_path, '/'));
    return $v ?: IC_VERSION;
}

function ic_enqueue_assets() {
    wp_enqueue_style('generatepress', get_template_directory_uri() . '/style.css');
    wp_enqueue_style('ic-styles', IC_THEME_URI . '/style.css', array('generatepress'), ic_asset_ver('style.css'));
    wp_enqueue_style('ic-fonts', 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,800;1,400;1,600&family=Poppins:wght@300;400;500;600;700&family=Bebas+Neue&display=swap', array(), null);
    wp_enqueue_script('ic-hover-preview', IC_THEME_URI . '/js/hover-preview.js', array(), ic_asset_ver('js/hover-preview.js'), true);

    if (ic_is_portal_page()) {
        wp_enqueue_script('ic-dashboard', IC_THEME_URI . '/js/dashboard.js', array(), ic_asset_ver('js/dashboard.js'), true);
        wp_localize_script('ic-dashboard', 'icAjax', array(
            'url'   => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('ic_nonce'),
        ));
    }

    if (is_singular('ic_content')) {
        wp_enqueue_script('ic-video-player', IC_THEME_URI . '/js/video-player.js', array(), ic_asset_ver('js/video-player.js'), true);
    }

    if (is_page_template('page-coaching.php')) {
        wp_enqueue_script('ic-coaching', IC_THEME_URI . '/js/coaching.js', array(), ic_asset_ver('js/coaching.js'), true);
        wp_localize_script('ic-coaching', 'icCoaching', array(
            'url'   => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('ic_coaching_nonce'),
        ));
    }

    // Preview gate — only for non-logged-in users on content pages.
    // Filemtime-based version ensures the gate logic reaches browsers immediately
    // after any edit (avoids the 30-day Cache-Control trap that caused the loop bug).
    if (!is_user_logged_in()) {
        wp_enqueue_script('ic-preview-gate', IC_THEME_URI . '/js/preview-gate.js', array(), ic_asset_ver('js/preview-gate.js'), true);
    }
}
add_action('wp_enqueue_scripts', 'ic_enqueue_assets');

/**
 * Check if current page is a portal page
 */
function ic_is_portal_page() {
    return (
        is_page_template(array('page-dashboard.php', 'page-coaching.php', 'page-profile.php', 'page-powermoves.php', 'page-home.php', 'page-contributors.php')) ||
        is_singular('ic_content') ||
        is_singular('ic_resource') ||
        is_post_type_archive('ic_content') ||
        is_post_type_archive('ic_resource') ||
        is_tax('ic_show') ||
        is_tax('ic_pillar') ||
        is_tax('ic_content_type') ||
        is_tax('ic_format') ||
        is_tax('ic_leader') ||
        is_tax('ic_company') ||
        is_tax('ic_event')
    );
}

/**
 * Load includes
 */
$ic_includes = array(
    '/inc/post-types.php',
    '/inc/contributor-routing.php',
    '/inc/acf-fields.php',
    '/inc/settings-page.php',
    '/inc/member-access.php',
    '/inc/ajax-handlers.php',
    '/inc/email-templates.php',
    '/inc/shortcodes.php',
    '/inc/rest-api.php',
    '/inc/section-page.php',
    '/inc/info-modal.php',
);

foreach ($ic_includes as $file) {
    $filepath = IC_THEME_DIR . $file;
    if (file_exists($filepath)) {
        require_once $filepath;
    }
}

/**
 * Theme support
 */
function ic_theme_setup() {
    add_theme_support('title-tag');
    add_theme_support('post-thumbnails');
    add_theme_support('html5', array('search-form', 'comment-form', 'gallery', 'caption'));
    add_image_size('ic-content-thumb', 640, 360, true);
    add_image_size('ic-speaker-photo', 200, 200, true);
}
add_action('after_setup_theme', 'ic_theme_setup');

/**
 * Disable admin bar for members
 */
function ic_disable_admin_bar() {
    if (!current_user_can('manage_options')) {
        show_admin_bar(false);
    }
}
add_action('after_setup_theme', 'ic_disable_admin_bar');

/**
 * Add body classes for portal styling
 */
function ic_body_classes($classes) {
    if (ic_is_portal_page()) {
        $classes[] = 'ic-portal';
    }
    if (is_user_logged_in()) {
        $classes[] = 'ic-logged-in';
    }
    return $classes;
}
add_filter('body_class', 'ic_body_classes');

/**
 * AGGRESSIVELY remove GeneratePress header
 * This prevents any GP header from rendering
 */
function ic_kill_gp_header() {
    remove_action('generate_header', 'generate_construct_header');
    remove_action('generate_after_header', 'generate_add_navigation_after_header', 5);
    remove_action('generate_header', 'generate_construct_header_widget');
    remove_action('generate_before_header', 'generate_do_skip_to_content_link');
}
add_action('after_setup_theme', 'ic_kill_gp_header', 999);
add_action('wp', 'ic_kill_gp_header', 999);
add_action('init', 'ic_kill_gp_header', 999);

/**
 * Remove GP footer too since we have our own
 */
function ic_kill_gp_footer() {
    remove_action('generate_footer', 'generate_construct_footer');
    remove_action('generate_footer', 'generate_construct_footer_widgets');
}
add_action('after_setup_theme', 'ic_kill_gp_footer', 999);
add_action('wp', 'ic_kill_gp_footer', 999);
add_action('init', 'ic_kill_gp_footer', 999);
