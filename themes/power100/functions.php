<?php
/**
 * Power100 Theme — Functions
 * Child theme of GeneratePress
 */

define('P100_VERSION', '1.0.0');
define('P100_THEME_DIR', get_stylesheet_directory());
define('P100_THEME_URI', get_stylesheet_directory_uri());

// ── Enqueue Styles ──
function p100_enqueue_styles() {
    // Parent theme
    wp_enqueue_style('generatepress', get_template_directory_uri() . '/style.css');
    // Child theme
    wp_enqueue_style('power100', get_stylesheet_uri(), array('generatepress'), P100_VERSION);
    // Homepage CSS
    if (is_front_page()) {
        wp_enqueue_style('power100-homepage', P100_THEME_URI . '/css/homepage.css', array('power100'), P100_VERSION);
    }
    // Google Fonts
    wp_enqueue_style('power100-fonts', 'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap', array(), null);
}
add_action('wp_enqueue_scripts', 'p100_enqueue_styles');

// ── Theme Support ──
function p100_theme_setup() {
    add_theme_support('post-thumbnails');
    add_theme_support('title-tag');
    add_theme_support('html5', array('search-form', 'comment-form', 'comment-list', 'gallery', 'caption'));

    // Image sizes
    add_image_size('p100-hero', 1200, 630, true);
    add_image_size('p100-card', 600, 400, true);
    add_image_size('p100-headshot', 400, 400, true);
}
add_action('after_setup_theme', 'p100_theme_setup');

// ── REST API Authentication ──
function p100_rest_auth_check($request) {
    $api_key = $request->get_header('X-P100-API-Key');
    $stored_key = get_option('p100_rest_api_key', '');

    if ($api_key && $stored_key && hash_equals($stored_key, $api_key)) {
        return true;
    }

    // Fallback: WP Application Passwords
    if (is_user_logged_in() && current_user_can('publish_posts')) {
        return true;
    }

    return new WP_Error('rest_unauthorized', 'Authentication required.', array('status' => 401));
}

// ── Disable GeneratePress default header/footer (we build our own) ──
// Uncomment these as templates are built:
// remove_action('generate_header', 'generate_construct_header');
// remove_action('generate_footer', 'generate_construct_footer');

// ── Load template includes ──
$includes = array(
    'inc/homepage-options.php',         // Homepage ACF options page + spotlight fields
    'inc/ec-contributor-fields.php',    // Expert Contributor ACF field group (58 fields, all contributor variations)
    'inc/article-author-fields.php',    // Article author attribution (pr_author_* fields)
    'mu-register-ec-meta.php',          // Registers ec_* post meta with show_in_rest=true (so REST PATCH writes them)
    'inc/contributor-sync-hook.php',    // On contributor page save → fire reverse-sync to tpedb (additive only)
    // 'inc/post-types.php',    // CPTs and taxonomies
    // 'inc/rest-api.php',      // REST API endpoints
    // 'inc/acf-fields.php',    // ACF field registration
);

foreach ($includes as $file) {
    $filepath = P100_THEME_DIR . '/' . $file;
    if (file_exists($filepath)) {
        require_once $filepath;
    }
}

// ── Auto-generate AI excerpt on article publish ──
function p100_auto_generate_ai_excerpt($post_id, $post, $update) {
    if ($post->post_type !== 'post' || $post->post_status !== 'publish') return;
    if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) return;
    if (wp_is_post_revision($post_id)) return;

    // Skip if already has an AI excerpt
    $existing = get_field('pr_ai_excerpt', $post_id);
    if ($existing) return;

    $api_key = defined('ANTHROPIC_API_KEY') ? ANTHROPIC_API_KEY : '';
    if (!$api_key) return;

    $content = wp_strip_all_tags($post->post_content);
    $content = preg_replace('/\s+/', ' ', $content);
    $content = trim(mb_substr($content, 0, 3000));
    if (strlen($content) < 100) return;

    $title = $post->post_title;
    $prompt = "You are a senior editorial copywriter for Power100, the nation's premier CEO ranking and media platform for the home improvement industry. Write a compelling, enticing excerpt (2-3 sentences, max 60 words) for this article that makes readers desperately want to click 'Read More'. Be specific about the value/insight the article delivers. Do NOT start with the article title. Do NOT use generic phrases like 'In this article' or 'Find out'. Use active, punchy language. IMPORTANT: Bold exactly 2 key phrases using <strong> tags — pick the most impactful/attention-grabbing phrases worth highlighting. Output ONLY the excerpt text with the <strong> tags, nothing else.\n\nArticle Title: {$title}\n\nArticle Content:\n{$content}";

    $response = wp_remote_post('https://api.anthropic.com/v1/messages', array(
        'timeout' => 30,
        'headers' => array(
            'Content-Type' => 'application/json',
            'x-api-key' => $api_key,
            'anthropic-version' => '2023-06-01',
        ),
        'body' => json_encode(array(
            'model' => 'claude-haiku-4-5-20251001',
            'max_tokens' => 150,
            'messages' => array(
                array('role' => 'user', 'content' => $prompt),
            ),
        )),
    ));

    if (is_wp_error($response)) return;

    $body = json_decode(wp_remote_retrieve_body($response), true);
    $excerpt = trim($body['content'][0]['text'] ?? '');

    if ($excerpt) {
        update_field('pr_ai_excerpt', $excerpt, $post_id);
    }
}
add_action('wp_insert_post', 'p100_auto_generate_ai_excerpt', 10, 3);


// ============================================================================
// P100_NORMALIZE_UNICODE_SLUGS — auto-sanitize slugs to ASCII on save
// ============================================================================
// Why: WordPress URL routing on this install cannot resolve slugs containing
// non-ASCII characters (verified 2026-04-10 with U+2011 non-breaking hyphen).
// AI-generated content and Word/Docs paste-in often introduce these chars
// invisibly. This filter normalizes them BEFORE the slug is generated, so
// future articles never end up with unroutable URLs.
// See memory/feedback_wp_non_ascii_slugs.md for full context.
// ============================================================================

add_filter("sanitize_title", "p100_normalize_unicode_for_slug", 5, 3);
function p100_normalize_unicode_for_slug($title, $raw_title = "", $context = "save") {
    if ($context !== "save") return $title;

    // Replace dash-like Unicode chars with regular hyphen
    $title = str_replace(
        array(
            "â",  // U+2010 hyphen
            "â",  // U+2011 non-breaking hyphen ← the main culprit
            "â",  // U+2012 figure dash
            "â",  // U+2013 en dash
            "â",  // U+2014 em dash
            "â",  // U+2015 horizontal bar
            "Â ",      // U+00A0 non-breaking space
        ),
        "-",
        $title
    );

    // Drop curly quotes, ellipsis, etc. (would otherwise become percent-encoded garbage)
    $title = str_replace(
        array(
            "â",  // U+2018 left single quote
            "â",  // U+2019 right single quote / apostrophe
            "â",  // U+201C left double quote
            "â",  // U+201D right double quote
            "â¦",  // U+2026 ellipsis
        ),
        "",
        $title
    );

    return $title;
}

/* Power Articles REST endpoint lives in wp-content/mu-plugins/power100-articles-rest.php
   so it's always loaded for REST requests (not dependent on the page template). */

// ============================================================================
// AUTO-ATTRIBUTE article authorship on save
// ============================================================================
// Source of truth: the Drive folder of official contributor articles defines
// `pr_author_ec`. Everything else defaults to staff. This hook normalizes both:
//   - If pr_author_ec is set → pr_author_type = 'ec' (auto-flip on selection)
//   - If pr_author_ec is empty → pr_author_type = 'staff' (safe default)
// New contributor-authored articles must explicitly set pr_author_ec at publish
// (admin UI ACF field, or programmatic via REST/intake form).
// ============================================================================
add_action('save_post_post', 'p100_auto_attribute_article_author', 20, 3);
function p100_auto_attribute_article_author($post_id, $post, $update) {
    if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) return;
    if (wp_is_post_revision($post_id)) return;

    $ec = (int) get_post_meta($post_id, 'pr_author_ec', true);
    if ($ec > 0) {
        update_post_meta($post_id, 'pr_author_type', 'ec');
    } else {
        update_post_meta($post_id, 'pr_author_type', 'staff');
    }
}

// ============================================================================
// AUTO-MIRROR published articles to Inner Circle as ic_article
// ============================================================================
// Fires after our auto-attribution hook (priority 30 > 20). Pushes the article
// payload to IC's /ic/v1/article/upsert endpoint. Idempotent on the IC side
// via _p100_source_id, so re-publishes update in place.
// Fire-and-forget (blocking=false) so the editor save isn't slowed by network.
// ============================================================================
add_action('save_post_post', 'p100_mirror_article_to_ic', 30, 3);
function p100_mirror_article_to_ic($post_id, $post, $update) {
    if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) return;
    if (wp_is_post_revision($post_id)) return;
    if ($post->post_status !== 'publish') return;
    if (!defined('IC_REST_API_KEY') || !IC_REST_API_KEY) return;

    $author_ec_id = (int) get_post_meta($post_id, 'pr_author_ec', true);
    $author_type  = (string) get_post_meta($post_id, 'pr_author_type', true);

    $featured_url = '';
    if (has_post_thumbnail($post_id)) {
        $featured_url = (string) wp_get_attachment_image_url(get_post_thumbnail_id($post_id), 'full');
    }

    $payload = array(
        'p100_post_id'       => $post_id,
        'p100_url'           => get_permalink($post_id),
        'slug'               => $post->post_name,
        'title'              => get_the_title($post_id),
        'content'            => $post->post_content,
        'excerpt'            => $post->post_excerpt,
        'date'               => $post->post_date,
        'featured_url'       => $featured_url,
        'p100_author_ec_id'  => $author_ec_id,
        'author_type'        => $author_type,
    );

    wp_remote_post('https://innercircle.power100.io/wp-json/ic/v1/article/upsert', array(
        'method'   => 'POST',
        'timeout'  => 2,
        'blocking' => false,
        'headers'  => array(
            'Content-Type'    => 'application/json',
            'X-IC-API-Key'    => IC_REST_API_KEY,
        ),
        'body'     => wp_json_encode($payload),
    ));
}

// Safety net: if anything non-ASCII somehow reaches the post_name field, strip it
add_filter("wp_insert_post_data", "p100_strip_non_ascii_from_post_name", 99, 2);
function p100_strip_non_ascii_from_post_name($data, $postarr) {
    if (!empty($data["post_name"])) {
        // Strip any remaining bytes outside ASCII printable range
        $cleaned = preg_replace("/[^ -~]/", "", $data["post_name"]);
        // Also collapse runs of dashes and trim
        $cleaned = preg_replace("/-+/", "-", $cleaned);
        $cleaned = trim($cleaned, "-");
        if ($cleaned !== "") {
            $data["post_name"] = $cleaned;
        }
    }
    return $data;
}
