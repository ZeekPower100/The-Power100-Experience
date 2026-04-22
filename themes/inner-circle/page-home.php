<?php
/**
 * Template Name: Home
 * Netflix-style content browsing — hero + horizontal scroll rows
 * v3.3.0
 */
ic_require_membership();

$member = is_user_logged_in() ? ic_get_member_data() : null;
$first_name = ($member && !empty($member['first_name'])) ? $member['first_name'] : '';

// ── Featured/Hero Content: Latest published or pinned ──
$featured_id = intval(get_option('ic_featured_content_id', 0));
$hero_post = null;
if ($featured_id) {
    $hero_post = get_post($featured_id);
}
if (!$hero_post || $hero_post->post_status !== 'publish') {
    // Exclude backfilled content (_ic_is_backfill = 1) from hero-selection.
    // Backfills are archival drops that shouldn't auto-promote to the hero slot.
    $hero_posts = get_posts(array(
        'post_type' => 'ic_content',
        'posts_per_page' => 1,
        'orderby' => 'date',
        'order' => 'DESC',
        'meta_query' => array(
            'relation' => 'OR',
            array(
                'key'     => '_ic_is_backfill',
                'compare' => 'NOT EXISTS',
            ),
            array(
                'key'     => '_ic_is_backfill',
                'value'   => '1',
                'compare' => '!=',
            ),
        ),
    ));
    $hero_post = !empty($hero_posts) ? $hero_posts[0] : null;
}

// Hero data
$hero_thumb = '';
$hero_video_url = '';
$hero_video_id = '';
$hero_show_label = '';
$hero_speakers = array();
$hero_excerpt = '';
if ($hero_post) {
    $hid = $hero_post->ID;
    $hero_video_url = get_post_meta($hid, 'ic_video_url', true);
    $hero_excerpt = $hero_post->post_excerpt ?: wp_trim_words($hero_post->post_content, 30);
    $hero_show_label = ic_get_content_label($hid);
    $hero_thumb = get_the_post_thumbnail_url($hid, 'full');
    // Extract YouTube video ID for hero background autoplay
    if ($hero_video_url && preg_match('/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/', $hero_video_url, $m)) {
        $hero_video_id = $m[1];
    }
    if (!$hero_thumb && $hero_video_id) {
        $hero_thumb = 'https://img.youtube.com/vi/' . $hero_video_id . '/maxresdefault.jpg';
    }
    $sc = intval(get_post_meta($hid, 'ic_speakers', true));
    for ($i = 0; $i < min($sc, 4); $i++) {
        $sn = get_post_meta($hid, "ic_speakers_{$i}_name", true);
        if ($sn) $hero_speakers[] = $sn;
    }
}

// ── Continue Watching ──
$continue_watching = array();
if (is_user_logged_in()) {
    $history = ic_get_watch_history();
    if (!empty($history)) {
        // Get posts that have been started but not necessarily finished
        $watched_ids = array_keys($history);
        $watched_ids = array_slice($watched_ids, 0, 15);
        if (!empty($watched_ids)) {
            $continue_watching = get_posts(array(
                'post_type' => 'ic_content',
                'post__in' => $watched_ids,
                'orderby' => 'post__in',
                'posts_per_page' => 15,
            ));
        }
    }
}

// ── Trending (5 most recent videos) ──
$trending = get_posts(array(
    'post_type' => 'ic_content',
    'posts_per_page' => 5,
    'orderby' => 'date',
    'order' => 'DESC',
));

// ── Top 5 by Pillar + Function (8 Netflix-style rails, slug-keyed) ──
// A post with multi-tag (e.g. Sales + Operations) appears in BOTH rails — no dedup.
// Keyed by slug so the page body can render specific rails in any order via
// `ic_render_topic_rail('sales')`.
$ic_topic_rails = array(
    'growth'              => array('taxonomy' => 'ic_pillar',   'label' => 'Growth'),
    'culture'             => array('taxonomy' => 'ic_pillar',   'label' => 'Culture'),
    'community'           => array('taxonomy' => 'ic_pillar',   'label' => 'Community'),
    'innovation'          => array('taxonomy' => 'ic_pillar',   'label' => 'Innovation'),
    'sales'               => array('taxonomy' => 'ic_function', 'label' => 'Sales'),
    'marketing'           => array('taxonomy' => 'ic_function', 'label' => 'Marketing'),
    'operations'          => array('taxonomy' => 'ic_function', 'label' => 'Operations'),
    'customer-experience' => array('taxonomy' => 'ic_function', 'label' => 'Customer Experience'),
);
foreach ($ic_topic_rails as $_slug => &$_rail) {
    $_rail['posts'] = get_posts(array(
        'post_type'      => 'ic_content',
        'posts_per_page' => 5,
        'orderby'        => 'date',
        'order'          => 'DESC',
        'tax_query'      => array(array(
            'taxonomy' => $_rail['taxonomy'],
            'field'    => 'slug',
            'terms'    => $_slug,
        )),
    ));
}
unset($_rail);

// Same 8 rails but sourced from ic_article posts. Interleaved with video rails
// on the homepage (Option 1 layout): video Sales → article Sales → video
// Marketing → article Marketing → etc.
$ic_article_topic_rails = $ic_topic_rails; // structural clone (taxonomy + label)
foreach ($ic_article_topic_rails as $_slug => &$_rail) {
    $_rail['posts'] = get_posts(array(
        'post_type'      => 'ic_article',
        'posts_per_page' => 5,
        'orderby'        => 'date',
        'order'          => 'DESC',
        'tax_query'      => array(array(
            'taxonomy' => $_rail['taxonomy'],
            'field'    => 'slug',
            'terms'    => $_slug,
        )),
    ));
}
unset($_rail);

// Helper: render one "Top 5 Trending For {Label}" rail by slug.
if (!function_exists('ic_render_topic_rail')) {
    function ic_render_topic_rail($slug) {
        global $ic_topic_rails;
        if (empty($ic_topic_rails[$slug]) || empty($ic_topic_rails[$slug]['posts'])) return;
        $rail = $ic_topic_rails[$slug];
        $term_link = get_term_link($slug, $rail['taxonomy']);
        $archive_url = is_wp_error($term_link) ? '#' : $term_link;
        ?>
        <section class="nfx-row">
            <div class="nfx-container">
                <div class="nfx-row-header">
                    <h2><a href="<?php echo esc_url($archive_url); ?>">Top 5 Trending For <?php echo esc_html($rail['label']); ?></a></h2>
                    <a href="<?php echo esc_url($archive_url); ?>" class="nfx-browse-all">Browse All ›</a>
                </div>
                <div class="nfx-carousel-wrap">
                    <button class="nfx-scroll-btn nfx-scroll-left" aria-label="Scroll left">‹</button>
                    <div class="nfx-carousel">
                        <?php foreach ($rail['posts'] as $item) :
                            $GLOBALS['post'] = $item;
                            setup_postdata($item);
                            include(IC_THEME_DIR . '/template-parts/card-netflix.php');
                        endforeach;
                        wp_reset_postdata(); ?>
                    </div>
                    <button class="nfx-scroll-btn nfx-scroll-right" aria-label="Scroll right">›</button>
                </div>
            </div>
        </section>
        <?php
    }
}

// Helper: render one "Top 5 Trending Articles For {Label}" rail by slug.
// Parallels ic_render_topic_rail but sources from ic_article instead of ic_content.
// Pillar/function taxonomies are shared between the two post types.
if (!function_exists('ic_render_article_topic_rail')) {
    function ic_render_article_topic_rail($slug) {
        global $ic_article_topic_rails;
        if (empty($ic_article_topic_rails[$slug]) || empty($ic_article_topic_rails[$slug]['posts'])) return;
        $rail = $ic_article_topic_rails[$slug];
        $term_link = get_term_link($slug, $rail['taxonomy']);
        $archive_url = is_wp_error($term_link) ? '#' : $term_link;
        ?>
        <section class="nfx-row">
            <div class="nfx-container">
                <div class="nfx-row-header">
                    <h2><a href="<?php echo esc_url($archive_url); ?>">Top 5 Trending Articles For <?php echo esc_html($rail['label']); ?></a></h2>
                    <a href="<?php echo esc_url($archive_url); ?>" class="nfx-browse-all">Browse All ›</a>
                </div>
                <div class="nfx-carousel-wrap">
                    <button class="nfx-scroll-btn nfx-scroll-left" aria-label="Scroll left">‹</button>
                    <div class="nfx-carousel">
                        <?php foreach ($rail['posts'] as $item) :
                            $GLOBALS['post'] = $item;
                            setup_postdata($item);
                            include(IC_THEME_DIR . '/template-parts/card-netflix.php');
                        endforeach;
                        wp_reset_postdata(); ?>
                    </div>
                    <button class="nfx-scroll-btn nfx-scroll-right" aria-label="Scroll right">›</button>
                </div>
            </div>
        </section>
        <?php
    }
}

// Helper: render one show rail by slug (Day In The Life, Grit To Gold, etc.)
if (!function_exists('ic_render_show_rail')) {
    function ic_render_show_rail($show_slug) {
        $term = get_term_by('slug', $show_slug, 'ic_show');
        if (!$term) return;
        $posts = get_posts(array(
            'post_type'      => 'ic_content',
            'posts_per_page' => 15,
            'orderby'        => 'date',
            'order'          => 'DESC',
            'tax_query'      => array(array(
                'taxonomy' => 'ic_show',
                'field'    => 'slug',
                'terms'    => $show_slug,
            )),
        ));
        if (empty($posts)) return;
        $archive_url = add_query_arg('show', $show_slug, get_post_type_archive_link('ic_content'));
        ?>
        <section class="nfx-row">
            <div class="nfx-container">
                <div class="nfx-row-header">
                    <h2><a href="<?php echo esc_url($archive_url); ?>"><?php echo esc_html($term->name); ?></a></h2>
                    <a href="<?php echo esc_url($archive_url); ?>" class="nfx-browse-all">Browse All ›</a>
                </div>
                <div class="nfx-carousel-wrap">
                    <button class="nfx-scroll-btn nfx-scroll-left" aria-label="Scroll left">‹</button>
                    <div class="nfx-carousel">
                        <?php foreach ($posts as $item) :
                            $GLOBALS['post'] = $item;
                            setup_postdata($item);
                            include(IC_THEME_DIR . '/template-parts/card-netflix.php');
                        endforeach;
                        wp_reset_postdata(); ?>
                    </div>
                    <button class="nfx-scroll-btn nfx-scroll-right" aria-label="Scroll right">›</button>
                </div>
            </div>
        </section>
        <?php
    }
}

// ── Count truly NEW episodes (added in the last 7 days) ──
$new_this_week = get_posts(array(
    'post_type' => 'ic_content',
    'posts_per_page' => -1,
    'date_query' => array(array('after' => '7 days ago')),
    'fields' => 'ids',
));

// ── Priority show rows (explicit order) ──
$priority_show_slugs = array('events', 'powerchat');
$priority_shows = array();
foreach ($priority_show_slugs as $slug) {
    $term = get_term_by('slug', $slug, 'ic_show');
    if ($term) {
        $query_args = array(
            'post_type' => 'ic_content',
            'posts_per_page' => 15,
            'orderby' => 'date',
            'order' => 'DESC',
            'tax_query' => array(array(
                'taxonomy' => 'ic_show',
                'field' => 'slug',
                'terms' => $slug,
            )),
        );
        // Events row: only show highlight videos (one per event)
        if ($slug === 'events') {
            $query_args['posts_per_page'] = 20;
            $query_args['meta_query'] = array(array(
                'key' => 'ic_event_highlight',
                'value' => '1',
            ));
        }
        $posts = get_posts($query_args);
        if (!empty($posts)) {
            $priority_shows[$slug] = array('term' => $term, 'posts' => $posts);
        }
    }
}

// ── Executive Interviews section (queries feature-interviews taxonomy, displayed as "Executive Interviews")
// Display name is decoupled from taxonomy — section says "Executive Interviews" but pulls feature-interviews tagged posts
$feature_interview_posts = get_posts(array(
    'post_type' => 'ic_content',
    'posts_per_page' => 20,
    'orderby' => 'date',
    'order' => 'DESC',
    'tax_query' => array(array(
        'taxonomy' => 'ic_show',
        'field' => 'slug',
        'terms' => 'feature-interviews',
    )),
));

// ── Remaining shows (exclude priority ones + executive-interviews) ──
$exclude_slugs = array_merge($priority_show_slugs, array('executive-interviews', 'customer-interviews', 'feature-interviews'));
$shows_with_content = get_terms(array(
    'taxonomy' => 'ic_show',
    'hide_empty' => true,
    'orderby' => 'count',
    'order' => 'DESC',
    'exclude' => array_filter(array_map(function($slug) {
        $t = get_term_by('slug', $slug, 'ic_show');
        return $t ? $t->term_id : null;
    }, $exclude_slugs)),
));

get_header();
?>

<main class="nfx-main">

    <!-- ═══ HERO ═══ -->
    <?php if ($hero_post) : ?>
    <section class="nfx-hero" style="--hero-bg: url('<?php echo esc_url($hero_thumb); ?>'); background-image: var(--hero-bg);">
        <?php if ($hero_video_id) : ?>
        <div class="nfx-hero-video-wrap" id="hero-video-wrap">
            <iframe id="hero-video-iframe"
                src="https://www.youtube.com/embed/<?php echo esc_attr($hero_video_id); ?>?autoplay=1&mute=1&controls=0&showinfo=0&rel=0&loop=1&playlist=<?php echo esc_attr($hero_video_id); ?>&modestbranding=1&playsinline=1&iv_load_policy=3&disablekb=1&fs=0&cc_load_policy=0"
                frameborder="0"
                allow="autoplay; encrypted-media"
                allowfullscreen
                title="Hero background video"></iframe>
        </div>
        <?php endif; ?>
        <div class="nfx-hero-overlay"></div>
        <!-- Mobile-only: dedicated thumbnail block stacks above the text content -->
        <div class="nfx-hero-thumb-mobile" aria-hidden="true"></div>
        <div class="nfx-hero-content">
            <span class="nfx-hero-badge"><?php echo esc_html($hero_show_label); ?></span>
            <h1 class="nfx-hero-title"><?php echo esc_html($hero_post->post_title); ?></h1>
            <?php if (!empty($hero_speakers)) : ?>
            <p class="nfx-hero-speakers">Featuring <?php echo esc_html(implode(', ', $hero_speakers)); ?></p>
            <?php endif; ?>
            <?php if ($hero_excerpt) : ?>
            <p class="nfx-hero-desc"><?php echo esc_html($hero_excerpt); ?></p>
            <?php endif; ?>
            <div class="nfx-hero-actions">
                <a href="<?php echo get_permalink($hero_post->ID); ?>" class="nfx-btn-play">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                    Watch Now
                </a>
                <a href="<?php echo get_permalink($hero_post->ID); ?>" class="nfx-btn-info">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                    More Info
                </a>
            </div>
        </div>
    </section>
    <?php endif; ?>


    <!-- ═══ CONCIERGE GREETING + INPUT (Claude.ai style) ═══ -->
    <section class="nfx-concierge-section">
        <div class="nfx-container">
            <div class="nfx-concierge-greeting">
                <div class="nfx-greeting-icon">✦</div>
                <h2 class="nfx-greeting-text" id="concierge-greeting"><?php
                    $hour = current_time('G');
                    $time_greeting = $hour < 12 ? 'Good morning' : ($hour < 17 ? 'Good afternoon' : 'Good evening');
                    echo esc_html($first_name ? $time_greeting . ', ' . $first_name . '.' : $time_greeting . '.');
                ?></h2>
                <?php
                $total_new = count($new_this_week);
                if ($total_new > 0) : ?>
                <p class="nfx-greeting-sub"><?php echo esc_html($total_new . ' new episode' . ($total_new > 1 ? 's' : '') . ' added this week. What are you looking for?'); ?></p>
                <?php else : ?>
                <p class="nfx-greeting-sub">What can the Inner Circle help you with today?</p>
                <?php endif; ?>
            </div>
            <div class="nfx-claude-input-container">
                <div class="nfx-claude-input-inner">
                    <textarea id="home-concierge-input" class="nfx-claude-textarea" placeholder="Ask anything — find episodes, get insights, explore topics..." rows="1"></textarea>
                    <button id="home-concierge-send" class="nfx-claude-send" aria-label="Send">
                        <span>🡅</span>
                    </button>
                </div>
                <p class="nfx-claude-disclaimer">Inner Circle Concierge — AI-powered by Power100</p>
            </div>
        </div>
    </section>


    <!-- ═══ DYNAMIC SEARCH RESULTS (hidden until user searches) ═══ -->
    <div id="concierge-results" class="nfx-concierge-results" style="display: none;">
        <div class="nfx-container">
            <div class="nfx-row-header" style="display: flex; justify-content: space-between; align-items: center;">
                <h2 id="concierge-results-title">Results</h2>
                <button id="concierge-results-close" style="background: rgba(255,255,255,0.1); border: none; color: var(--ic-white); padding: 8px 16px; border-radius: 4px; cursor: pointer; font-size: 13px; font-family: var(--ic-font-body);">✕ Clear Results</button>
            </div>
            <div id="concierge-results-grid" class="nfx-concierge-results-grid"></div>
            <div id="concierge-results-empty" style="display: none; text-align: center; padding: 40px 0; color: var(--ic-text-muted);">
                <p style="font-size: 16px;">No videos found matching your search.</p>
                <p style="font-size: 13px; opacity: 0.7;">Try different keywords or browse the categories below.</p>
            </div>
        </div>
    </div>

    <div class="nfx-rows" id="homepage-content-rows">

        <!-- ═══ ROW 1: TOP 5 TRENDING (Netflix-style numbered) ═══ -->
        <?php if (!empty($trending)) : ?>
        <section class="nfx-row nfx-row--top5">
            <div class="nfx-container">
                <div class="nfx-row-header">
                    <h2>Top 5 Trending</h2>
                </div>
                <div class="nfx-carousel-wrap">
                    <button class="nfx-scroll-btn nfx-scroll-left" aria-label="Scroll left">‹</button>
                    <div class="nfx-carousel">
                        <?php $nfx_rank = 0; foreach ($trending as $item) :
                            $nfx_rank++;
                            $GLOBALS['post'] = $item;
                            setup_postdata($item);
                            include(IC_THEME_DIR . '/template-parts/card-netflix.php');
                        endforeach;
                        $nfx_rank = 0;
                        wp_reset_postdata(); ?>
                    </div>
                    <button class="nfx-scroll-btn nfx-scroll-right" aria-label="Scroll right">›</button>
                </div>
            </div>
        </section>
        <?php endif; ?>

        <!-- ═══ ROW 2: CONTINUE WATCHING (gated: renders only if user has history) ═══ -->
        <?php if (!empty($continue_watching)) : ?>
        <section class="nfx-row">
            <div class="nfx-container">
                <div class="nfx-row-header">
                    <h2>Continue Watching<?php echo $first_name ? ' for ' . esc_html($first_name) : ''; ?></h2>
                </div>
                <div class="nfx-carousel-wrap">
                    <button class="nfx-scroll-btn nfx-scroll-left" aria-label="Scroll left">‹</button>
                    <div class="nfx-carousel">
                        <?php foreach ($continue_watching as $item) :
                            $GLOBALS['post'] = $item;
                            setup_postdata($item);
                            include(IC_THEME_DIR . '/template-parts/card-netflix.php');
                        endforeach;
                        wp_reset_postdata(); ?>
                    </div>
                    <button class="nfx-scroll-btn nfx-scroll-right" aria-label="Scroll right">›</button>
                </div>
            </div>
        </section>
        <?php endif; ?>

        <!-- ═══ ROW 3: EVENT HIGHLIGHTS (only ic_event_highlight = 1) ═══ -->
        <?php if (!empty($priority_shows['events'])) :
            $ev = $priority_shows['events']; ?>
        <section class="nfx-row">
            <div class="nfx-container">
                <div class="nfx-row-header">
                    <h2><a href="<?php echo esc_url(add_query_arg('show', 'events', get_post_type_archive_link('ic_content'))); ?>">Events</a></h2>
                    <a href="<?php echo esc_url(add_query_arg('show', 'events', get_post_type_archive_link('ic_content'))); ?>" class="nfx-browse-all">Browse All ›</a>
                </div>
                <div class="nfx-carousel-wrap">
                    <button class="nfx-scroll-btn nfx-scroll-left" aria-label="Scroll left">‹</button>
                    <div class="nfx-carousel">
                        <?php foreach ($ev['posts'] as $item) :
                            $GLOBALS['post'] = $item;
                            setup_postdata($item);
                            include(IC_THEME_DIR . '/template-parts/card-netflix.php');
                        endforeach;
                        wp_reset_postdata(); ?>
                    </div>
                    <button class="nfx-scroll-btn nfx-scroll-right" aria-label="Scroll right">›</button>
                </div>
            </div>
        </section>
        <?php endif; ?>

        <!-- ═══ ROW 4: POWERCHAT ═══ -->
        <?php if (!empty($priority_shows['powerchat'])) :
            $pc = $priority_shows['powerchat']; ?>
        <section class="nfx-row">
            <div class="nfx-container">
                <div class="nfx-row-header">
                    <h2><a href="<?php echo esc_url(add_query_arg('show', 'powerchat', get_post_type_archive_link('ic_content'))); ?>">PowerChat</a></h2>
                    <a href="<?php echo esc_url(add_query_arg('show', 'powerchat', get_post_type_archive_link('ic_content'))); ?>" class="nfx-browse-all">Browse All ›</a>
                </div>
                <div class="nfx-carousel-wrap">
                    <button class="nfx-scroll-btn nfx-scroll-left" aria-label="Scroll left">‹</button>
                    <div class="nfx-carousel">
                        <?php foreach ($pc['posts'] as $item) :
                            $GLOBALS['post'] = $item;
                            setup_postdata($item);
                            include(IC_THEME_DIR . '/template-parts/card-netflix.php');
                        endforeach;
                        wp_reset_postdata(); ?>
                    </div>
                    <button class="nfx-scroll-btn nfx-scroll-right" aria-label="Scroll right">›</button>
                </div>
            </div>
        </section>
        <?php endif; ?>

        <!-- ═══ ROWS 5-8: Topic rails (video + article interleaved: Sales, Marketing, Innovation, Growth) ═══ -->
        <?php ic_render_topic_rail('sales'); ?>
        <?php ic_render_article_topic_rail('sales'); ?>
        <?php ic_render_topic_rail('marketing'); ?>
        <?php ic_render_article_topic_rail('marketing'); ?>
        <?php ic_render_topic_rail('innovation'); ?>
        <?php ic_render_article_topic_rail('innovation'); ?>
        <?php ic_render_topic_rail('growth'); ?>
        <?php ic_render_article_topic_rail('growth'); ?>

        <!-- ═══ ROW 6: VIEW BY COMPANY ═══ -->
        <?php
        $companies_with_content = get_terms(array(
            'taxonomy' => 'ic_company',
            'hide_empty' => true,
            'orderby' => 'count',
            'order' => 'DESC',
        ));
        if (!empty($companies_with_content) && !is_wp_error($companies_with_content)) : ?>
        <section class="nfx-row">
            <div class="nfx-container">
                <div class="nfx-row-header">
                    <h2>Browse by Company</h2>
                </div>
                <div class="nfx-carousel-wrap">
                    <button class="nfx-scroll-btn nfx-scroll-left" aria-label="Scroll left">‹</button>
                    <div class="nfx-carousel nfx-company-carousel">
                        <?php foreach ($companies_with_content as $company) :
                            $logo_url = get_term_meta($company->term_id, 'logo_url', true);
                        ?>
                        <a href="<?php echo esc_url(get_term_link($company)); ?>" class="nfx-company-card" data-slug="<?php echo esc_attr($company->slug); ?>">
                            <?php if ($logo_url) : ?>
                            <div class="nfx-company-logo"><img src="<?php echo esc_url($logo_url); ?>" alt="<?php echo esc_attr($company->name); ?>"></div>
                            <?php endif; ?>
                            <div class="nfx-company-name"><?php echo esc_html($company->name); ?></div>
                            <div class="nfx-company-count"><?php echo esc_html($company->count); ?> video<?php echo $company->count !== 1 ? 's' : ''; ?></div>
                        </a>
                        <?php endforeach; ?>
                    </div>
                    <button class="nfx-scroll-btn nfx-scroll-right" aria-label="Scroll right">›</button>
                </div>
            </div>
        </section>
        <?php endif; ?>

        <!-- ═══ ROW 7: BROWSE BY EVENT ═══ -->
        <?php
        $events_with_content = get_terms(array(
            'taxonomy' => 'ic_event',
            'hide_empty' => true,
            'orderby' => 'count',
            'order' => 'DESC',
        ));
        if (!empty($events_with_content) && !is_wp_error($events_with_content)) : ?>
        <section class="nfx-row">
            <div class="nfx-container">
                <div class="nfx-row-header">
                    <h2>Browse by Event</h2>
                </div>
                <div class="nfx-carousel-wrap">
                    <button class="nfx-scroll-btn nfx-scroll-left" aria-label="Scroll left">&#8249;</button>
                    <div class="nfx-carousel nfx-company-carousel">
                        <?php foreach ($events_with_content as $event_term) :
                            // Try to get the highlight video thumbnail for this event
                            $event_thumb = '';
                            $highlight_posts = get_posts(array(
                                'post_type' => 'ic_content',
                                'posts_per_page' => 1,
                                'meta_query' => array(array(
                                    'key' => 'ic_event_highlight',
                                    'value' => '1',
                                )),
                                'tax_query' => array(array(
                                    'taxonomy' => 'ic_event',
                                    'field' => 'term_id',
                                    'terms' => $event_term->term_id,
                                )),
                            ));
                            if (!empty($highlight_posts)) {
                                $hp = $highlight_posts[0];
                                $event_thumb = get_the_post_thumbnail_url($hp->ID, 'large');
                                if (!$event_thumb) {
                                    $vid_url = get_post_meta($hp->ID, 'ic_video_url', true);
                                    if ($vid_url && preg_match('/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/', $vid_url, $m)) {
                                        $event_thumb = 'https://img.youtube.com/vi/' . $m[1] . '/maxresdefault.jpg';
                                    }
                                }
                            }
                            // Fallback: get the most recent video tagged with this event
                            if (!$event_thumb) {
                                $fallback_posts = get_posts(array(
                                    'post_type' => 'ic_content',
                                    'posts_per_page' => 1,
                                    'orderby' => 'date',
                                    'order' => 'DESC',
                                    'tax_query' => array(array(
                                        'taxonomy' => 'ic_event',
                                        'field' => 'term_id',
                                        'terms' => $event_term->term_id,
                                    )),
                                ));
                                if (!empty($fallback_posts)) {
                                    $fp = $fallback_posts[0];
                                    $event_thumb = get_the_post_thumbnail_url($fp->ID, 'large');
                                    if (!$event_thumb) {
                                        $vid_url = get_post_meta($fp->ID, 'ic_video_url', true);
                                        if ($vid_url && preg_match('/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/', $vid_url, $m)) {
                                            $event_thumb = 'https://img.youtube.com/vi/' . $m[1] . '/maxresdefault.jpg';
                                        }
                                    }
                                }
                            }
                        ?>
                        <?php
                            // Check for event logo — attachment ID first, then direct URL fallback (for SVGs)
                            $event_logo_id = get_term_meta($event_term->term_id, 'event_logo', true);
                            $event_logo_url = $event_logo_id ? wp_get_attachment_url($event_logo_id) : '';
                            if (!$event_logo_url) {
                                $event_logo_url = get_term_meta($event_term->term_id, 'event_logo_url', true) ?: '';
                            }
                        ?>
                        <a href="<?php echo esc_url(get_term_link($event_term)); ?>" class="nfx-company-card">
                            <?php if ($event_logo_url) : ?>
                            <div class="nfx-company-logo"><img src="<?php echo esc_url($event_logo_url); ?>" alt="<?php echo esc_attr($event_term->name); ?>"></div>
                            <?php endif; ?>
                            <div class="nfx-company-name"><?php echo esc_html($event_term->name); ?></div>
                            <div class="nfx-company-count"><?php echo esc_html($event_term->count); ?> video<?php echo $event_term->count !== 1 ? 's' : ''; ?></div>
                        </a>
                        <?php endforeach; ?>
                    </div>
                    <button class="nfx-scroll-btn nfx-scroll-right" aria-label="Scroll right">&#8250;</button>
                </div>
            </div>
        </section>
        <?php endif; ?>

        <!-- ═══ ROW 8: BROWSE BY LEADER ═══ -->
        <?php
        $leaders_with_content = get_terms(array(
            'taxonomy'   => 'ic_leader',
            'hide_empty' => true,
            'orderby'    => 'count',
            'order'      => 'DESC',
        ));
        if (!empty($leaders_with_content) && !is_wp_error($leaders_with_content)) : ?>
        <section class="nfx-row">
            <div class="nfx-container">
                <div class="nfx-row-header">
                    <h2>Browse by Leader</h2>
                </div>
                <div class="nfx-carousel-wrap">
                    <button class="nfx-scroll-btn nfx-scroll-left" aria-label="Scroll left">&#8249;</button>
                    <div class="nfx-carousel nfx-company-carousel">
                        <?php foreach ($leaders_with_content as $leader_term) :
                            $leader_photo_id = get_term_meta($leader_term->term_id, 'leader_photo', true);
                            $leader_photo_url = $leader_photo_id ? wp_get_attachment_image_url($leader_photo_id, 'ic-speaker-photo') : '';
                            $initials = mb_substr($leader_term->name, 0, 1);
                        ?>
                        <a href="<?php echo esc_url(get_term_link($leader_term)); ?>" class="nfx-company-card nfx-leader-card">
                            <?php if ($leader_photo_url) : ?>
                            <div class="nfx-leader-avatar"><img src="<?php echo esc_url($leader_photo_url); ?>" alt="<?php echo esc_attr($leader_term->name); ?>"></div>
                            <?php else : ?>
                            <div class="nfx-leader-avatar nfx-leader-avatar-placeholder"><span><?php echo esc_html($initials); ?></span></div>
                            <?php endif; ?>
                            <div class="nfx-company-name"><?php echo esc_html($leader_term->name); ?></div>
                            <div class="nfx-company-count"><?php echo esc_html($leader_term->count); ?> video<?php echo $leader_term->count !== 1 ? 's' : ''; ?></div>
                        </a>
                        <?php endforeach; ?>
                    </div>
                    <button class="nfx-scroll-btn nfx-scroll-right" aria-label="Scroll right">&#8250;</button>
                </div>
            </div>
        </section>
        <?php endif; ?>

        <!-- ═══ ROW 12: EXECUTIVE INTERVIEWS (Feature Interviews only) ═══ -->
        <?php if (!empty($feature_interview_posts)) : ?>
        <section class="nfx-row">
            <div class="nfx-container">
                <div class="nfx-row-header">
                    <h2>Executive Interviews</h2>
                </div>
                <div class="nfx-carousel-wrap">
                    <button class="nfx-scroll-btn nfx-scroll-left" aria-label="Scroll left">‹</button>
                    <div class="nfx-carousel">
                        <?php foreach ($feature_interview_posts as $item) :
                            $GLOBALS['post'] = $item;
                            setup_postdata($item);
                            include(IC_THEME_DIR . '/template-parts/card-netflix.php');
                        endforeach;
                        wp_reset_postdata(); ?>
                    </div>
                    <button class="nfx-scroll-btn nfx-scroll-right" aria-label="Scroll right">›</button>
                </div>
            </div>
        </section>
        <?php endif; ?>

        <!-- ═══ ROWS 13-20+: Topic rails (video + article interleaved) with show rails mixed in ═══ -->
        <?php ic_render_topic_rail('operations'); ?>
        <?php ic_render_article_topic_rail('operations'); ?>
        <?php ic_render_topic_rail('customer-experience'); ?>
        <?php ic_render_article_topic_rail('customer-experience'); ?>
        <?php ic_render_show_rail('day-in-the-life'); ?>
        <?php ic_render_topic_rail('culture'); ?>
        <?php ic_render_article_topic_rail('culture'); ?>
        <?php ic_render_topic_rail('community'); ?>
        <?php ic_render_article_topic_rail('community'); ?>
        <?php ic_render_show_rail('grit-to-gold'); ?>
        <?php ic_render_show_rail('inner-circle'); ?>
        <?php ic_render_show_rail('outside-the-lines'); ?>

    </div><!-- .nfx-rows -->

</main>

<!-- Carousel scroll + Search + Concierge + Header scroll JS -->
<script>
document.addEventListener('DOMContentLoaded', function() {

    // ── Hero video background: fade in once iframe loads ──
    var heroVideoWrap = document.getElementById('hero-video-wrap');
    if (heroVideoWrap) {
        var heroIframe = document.getElementById('hero-video-iframe');
        // Fade in the video after a short delay to let playback start
        setTimeout(function() {
            heroVideoWrap.classList.add('nfx-hero-video-active');
        }, 1200);
    }

    // ── Header: transparent → opaque on scroll ──
    var header = document.querySelector('.ic-header-home');
    if (header) {
        var scrollThreshold = 80;
        window.addEventListener('scroll', function() {
            if (window.scrollY > scrollThreshold) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }
        });
    }

    // ── Carousel scrolling ──
    document.querySelectorAll('.nfx-carousel-wrap').forEach(function(wrap) {
        var carousel = wrap.querySelector('.nfx-carousel');
        var leftBtn = wrap.querySelector('.nfx-scroll-left');
        var rightBtn = wrap.querySelector('.nfx-scroll-right');
        var scrollAmount = carousel.offsetWidth * 0.75;

        function updateButtons() {
            leftBtn.style.opacity = carousel.scrollLeft <= 10 ? '0' : '1';
            leftBtn.style.pointerEvents = carousel.scrollLeft <= 10 ? 'none' : 'auto';
            var maxScroll = carousel.scrollWidth - carousel.offsetWidth - 10;
            rightBtn.style.opacity = carousel.scrollLeft >= maxScroll ? '0' : '1';
            rightBtn.style.pointerEvents = carousel.scrollLeft >= maxScroll ? 'none' : 'auto';
        }

        leftBtn.addEventListener('click', function() {
            carousel.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
        });
        rightBtn.addEventListener('click', function() {
            carousel.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        });

        carousel.addEventListener('scroll', updateButtons);
        updateButtons();
        window.addEventListener('resize', function() {
            scrollAmount = carousel.offsetWidth * 0.75;
            updateButtons();
        });
    });

    // ── Search Overlay ──
    var searchOverlay = document.getElementById('search-overlay');
    var searchInput = document.getElementById('search-input');
    var searchResults = document.getElementById('search-results');
    var searchTrigger = document.getElementById('search-trigger');
    var searchClose = document.getElementById('search-close');
    var searchTimer = null;

    if (searchTrigger) {
        searchTrigger.addEventListener('click', function() {
            searchOverlay.classList.add('open');
            setTimeout(function() { searchInput.focus(); }, 100);
        });
    }
    if (searchClose) {
        searchClose.addEventListener('click', function() {
            searchOverlay.classList.remove('open');
            searchInput.value = '';
            searchResults.innerHTML = '';
        });
    }
    // Close on escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            searchOverlay.classList.remove('open');
            document.getElementById('concierge-sidebar').classList.remove('open');
            document.getElementById('sidebar-backdrop').classList.remove('open');
        }
    });

    // Live search with debounce
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimer);
            var q = this.value.trim();
            if (q.length < 2) { searchResults.innerHTML = ''; return; }
            searchTimer = setTimeout(function() {
                fetch('<?php echo home_url('/wp-json/wp/v2/ic_content?search='); ?>' + encodeURIComponent(q) + '&per_page=8&_fields=id,title,link,excerpt')
                .then(function(r) { return r.json(); })
                .then(function(posts) {
                    if (!posts.length) {
                        searchResults.innerHTML = '<p class="ic-search-empty">No results for "' + q + '"</p>';
                        return;
                    }
                    searchResults.innerHTML = posts.map(function(p) {
                        return '<a href="' + p.link + '" class="ic-search-result-item">' +
                            '<span class="ic-search-result-title">' + p.title.rendered + '</span>' +
                        '</a>';
                    }).join('');
                });
            }, 300);
        });
    }

    // ── Concierge Sidebar ──
    var sidebar = document.getElementById('concierge-sidebar');
    var sidebarBackdrop = document.getElementById('sidebar-backdrop');
    var sidebarClose = document.getElementById('sidebar-close');
    var sidebarInput = document.getElementById('sidebar-input');
    var sidebarSend = document.getElementById('sidebar-send');
    var sidebarMessages = document.getElementById('sidebar-messages');

    function sendToConciergeSidebar(msg) {
        var formData = new FormData();
        formData.append('action', 'ic_coaching_message');
        formData.append('nonce', '<?php echo wp_create_nonce("ic_coaching_nonce"); ?>');
        formData.append('message', msg);
        appendMessage('assistant-loading', '...');
        fetch('<?php echo admin_url("admin-ajax.php"); ?>', { method: 'POST', body: formData })
        .then(function(r) { return r.json(); })
        .then(function(data) {
            var loadingMsgs = sidebarMessages.querySelectorAll('.ic-sidebar-msg-assistant-loading');
            loadingMsgs.forEach(function(el) { el.remove(); });
            if (data.success && data.data && data.data.reply) {
                var reply = data.data.reply;
                appendMessage('assistant', reply);

                // Extract video links from AI response and populate main page results
                populateResultsFromAI(msg, reply);
            } else {
                appendMessage('assistant', 'Sorry, I had trouble with that. Please try again.');
            }
        })
        .catch(function() {
            var loadingMsgs = sidebarMessages.querySelectorAll('.ic-sidebar-msg-assistant-loading');
            loadingMsgs.forEach(function(el) { el.remove(); });
            appendMessage('assistant', 'Connection issue. Please try again.');
        });
    }

    function populateResultsFromAI(query, reply) {
        var seen = {};
        var linkedTitles = [];

        // 1. Extract all [Title](url) links from the AI response
        var linkRx = /\[([^\]]{8,100})\]\((https?:\/\/[^)]+)\)/g;
        var m;
        while ((m = linkRx.exec(reply)) !== null) {
            var title = m[1].trim();
            var url = m[2];
            if (!seen[title]) {
                seen[title] = true;
                // Extract YouTube ID from URL if present
                var ytMatch = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
                // Extract IC post slug from URL if present
                var slugMatch = url.match(/innercircle\.power100\.io\/(?:ic_content|content)\/([a-z0-9\-]+)/);
                linkedTitles.push({
                    title: title,
                    url: url,
                    ytId: ytMatch ? ytMatch[1] : '',
                    slug: slugMatch ? slugMatch[1] : ''
                });
            }
        }

        // 2. Also extract bold titles: • **Title** or numbered **Title** (without links)
        var boldRx = /(?:[•·]|\d+\.)\s*\*\*([^*]{8,100})\*\*/g;
        while ((m = boldRx.exec(reply)) !== null) {
            var bt = m[1].trim();
            if (!seen[bt]) { seen[bt] = true; linkedTitles.push({ title: bt, url: '' }); }
        }

        // 3. Also extract [Title](url) where title might have special chars
        var linkRx2 = /\[([^\]]{8,100})\]\(https?:\/\/(?:www\.)?(?:youtube|innercircle)[^)]+\)/g;
        while ((m = linkRx2.exec(reply)) !== null) {
            var lt = m[1].trim();
            if (!seen[lt]) { seen[lt] = true; linkedTitles.push({ title: lt, url: m[2] || '' }); }
        }

        if (linkedTitles.length === 0) {
            resultsTitle.textContent = 'Check the concierge for "' + query + '"';
            resultsGrid.innerHTML = '<p style="color:var(--ic-text-muted);font-size:14px;text-align:center;padding:20px;">See the concierge chat for personalized recommendations.</p>';
            return;
        }

        var cards = [];
        var cardIds = {};

        // Collect all YouTube IDs from the AI response
        var allYtIds = linkedTitles.map(function(item) { return item.ytId; }).filter(Boolean);

        // Single batch lookup via custom endpoint (exact meta match, no false positives)
        var promise;
        if (allYtIds.length > 0) {
            promise = fetch('<?php echo home_url("/wp-json/ic/v1/content/by-youtube-id"); ?>?ids=' + allYtIds.join(','))
                .then(function(r) { return r.json(); })
                .then(function(results) {
                    if (!Array.isArray(results)) return;
                    // Build a map of ytId → post data
                    var ytMap = {};
                    results.forEach(function(r) { ytMap[r.youtube_id] = r; });
                    // Match each linked title to its result in order
                    linkedTitles.forEach(function(item, idx) {
                        if (item.ytId && ytMap[item.ytId] && !cardIds[ytMap[item.ytId].id]) {
                            var p = ytMap[item.ytId];
                            cardIds[p.id] = true;
                            cards.push({ title: p.title, link: p.link, ytId: item.ytId, order: idx });
                        }
                    });
                }).catch(function() {});
        } else {
            promise = Promise.resolve();
        }

        promise.then(function() {
            if (cards.length === 0) {
                resultsTitle.textContent = 'Check the concierge for "' + query + '"';
                resultsGrid.innerHTML = '<p style="color:var(--ic-text-muted);font-size:14px;text-align:center;padding:20px;">See the concierge chat for recommendations.</p>';
                return;
            }
            cards.sort(function(a, b) { return a.order - b.order; });
            resultsTitle.textContent = cards.length + ' result' + (cards.length > 1 ? 's' : '') + ' for "' + query + '"';
            resultsGrid.innerHTML = cards.map(function(c) {
                var thumb = c.ytId ? 'https://img.youtube.com/vi/' + c.ytId + '/mqdefault.jpg' : '';
                return '<a href="' + c.link + '" class="nfx-concierge-result-card">' +
                    '<div class="nfx-concierge-result-thumb" style="background-image:url(' + (thumb || '') + ');' + (!thumb ? 'background:var(--ic-dark-gray);' : '') + '"></div>' +
                    '<div class="nfx-concierge-result-info"><h4>' + c.title + '</h4></div>' +
                    '</a>';
            }).join('');
            resultsEmpty.style.display = 'none';
            resultsContainer.style.display = 'block';
            contentRows.style.opacity = '0.3';
        });
    }

    function openSidebar(initialMsg) {
        sidebar.classList.add('open');
        sidebarBackdrop.classList.add('open');
        if (initialMsg) {
            appendMessage('user', initialMsg);
            sendToConciergeSidebar(initialMsg);
        }
        setTimeout(function() { sidebarInput.focus(); }, 200);
    }

    function closeSidebar() {
        sidebar.classList.remove('open');
        sidebarBackdrop.classList.remove('open');
    }

    function renderSidebarMarkdown(text) {
        if (!text) return '';
        var html = text
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        // Remove raw image markdown (thumbnails don't belong in sidebar)
        html = html.replace(/!\[[^\]]*\]\([^)]+\)/g, '');
        // Links: [text](url) → clickable
        html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" style="color:var(--ic-gold);text-decoration:underline;">$1</a>');
        // Bold
        html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        // Italic
        html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
        // Numbered list items
        html = html.replace(/^\d+\.\s+/gm, '<br>• ');
        // Bullet dashes
        html = html.replace(/^[\-–]\s+/gm, '<br>• ');
        // Double newlines → paragraph breaks
        html = html.replace(/\n\n/g, '<br><br>');
        html = html.replace(/\n/g, '<br>');
        // Clean up leading breaks
        html = html.replace(/^(<br>)+/, '');
        return html;
    }

    function appendMessage(role, text) {
        var div = document.createElement('div');
        div.className = 'ic-sidebar-msg ic-sidebar-msg-' + role;
        if (role === 'assistant' || role === 'assistant-loading') {
            div.innerHTML = renderSidebarMarkdown(text);
        } else {
            div.textContent = text;
        }
        sidebarMessages.appendChild(div);
        sidebarMessages.scrollTop = sidebarMessages.scrollHeight;
    }

    // Minimize: collapse sidebar but keep conversation, show floating reopen button
    var sidebarMinimize = document.getElementById('sidebar-minimize');
    var sidebarMinimized = false;

    function minimizeSidebar() {
        sidebar.classList.remove('open');
        sidebarBackdrop.classList.remove('open');
        sidebarMinimized = true;
        // Show floating reopen bubble
        var existing = document.getElementById('sidebar-reopen-bubble');
        if (!existing) {
            var bubble = document.createElement('button');
            bubble.id = 'sidebar-reopen-bubble';
            bubble.className = 'ic-sidebar-reopen-bubble';
            bubble.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a10 10 0 0 1 10 10c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2z"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>';
            bubble.title = 'Reopen Concierge';
            bubble.addEventListener('click', function() {
                sidebar.classList.add('open');
                sidebarBackdrop.classList.add('open');
                sidebarMinimized = false;
                bubble.remove();
                sidebarMessages.scrollTop = sidebarMessages.scrollHeight;
            });
            document.body.appendChild(bubble);
        }
    }

    if (sidebarMinimize) sidebarMinimize.addEventListener('click', minimizeSidebar);
    if (sidebarClose) sidebarClose.addEventListener('click', closeSidebar);
    if (sidebarBackdrop) sidebarBackdrop.addEventListener('click', minimizeSidebar);

    if (sidebarSend) {
        sidebarSend.addEventListener('click', function() {
            var msg = sidebarInput.value.trim();
            if (!msg) return;
            appendMessage('user', msg);
            sidebarInput.value = '';
            sendToConciergeSidebar(msg);
        });
        sidebarInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') sidebarSend.click();
        });
    }

    // ── Home Concierge Input — Content Filtering + Sidebar Hybrid ──
    var homeInput = document.getElementById('home-concierge-input');
    var homeSend = document.getElementById('home-concierge-send');
    var resultsContainer = document.getElementById('concierge-results');
    var resultsGrid = document.getElementById('concierge-results-grid');
    var resultsTitle = document.getElementById('concierge-results-title');
    var resultsEmpty = document.getElementById('concierge-results-empty');
    var resultsClose = document.getElementById('concierge-results-close');
    var contentRows = document.getElementById('homepage-content-rows');

    // Taxonomy mapping for smart filtering
    var pillarMap = {
        'growth': ['growth', 'revenue', 'sales', 'marketing', 'lead', 'leads', 'profit', 'money', 'close', 'closing'],
        'culture': ['culture', 'team', 'hiring', 'leadership', 'employee', 'retention', 'people', 'manage', 'hr'],
        'innovation': ['innovation', 'technology', 'ai', 'automation', 'tech', 'software', 'digital', 'data'],
        'community': ['community', 'networking', 'partnership', 'partner', 'event', 'industry', 'giving']
    };
    var showMap = {
        'powerchat': ['powerchat', 'power chat'],
        'executive-interviews': ['executive', 'executive interview', 'ceo interview'],
        'day-in-the-life': ['day in the life', 'ditl', 'behind the scenes'],
        'events': ['event', 'summit', 'conference', 'expo', 'live'],
        'customer-interviews': ['customer', 'testimonial', 'review'],
        'rapid-fire-interviews': ['rapid fire', 'quick', 'rapid'],
        'feature-interviews': ['feature', 'featured']
    };

    function parseIntent(query) {
        var q = query.toLowerCase();
        var params = { search: query, per_page: 20 };
        var intentLabel = null;

        // Check for show intent
        for (var slug in showMap) {
            if (showMap[slug].some(function(kw) { return q.includes(kw); })) {
                params.ic_show = slug;
                intentLabel = slug.replace(/-/g, ' ');
                break;
            }
        }

        // Check for pillar intent
        for (var pillar in pillarMap) {
            if (pillarMap[pillar].some(function(kw) { return q.includes(kw); })) {
                params.ic_pillar = pillar;
                if (!intentLabel) intentLabel = pillar;
                break;
            }
        }

        // Check for recency
        if (q.includes('recent') || q.includes('latest') || q.includes('new') || q.includes('newest')) {
            params.orderby = 'date';
            params.order = 'desc';
        }

        return { params: params, label: intentLabel };
    }

    function searchContent(query) {
        var intent = parseIntent(query);
        var url = '<?php echo home_url("/wp-json/wp/v2/ic_content"); ?>?';
        var urlParams = new URLSearchParams();
        urlParams.set('search', intent.params.search);
        urlParams.set('per_page', '20');
        urlParams.set('status', 'publish');
        urlParams.set('_fields', 'id,title,link,excerpt,featured_media,meta,ic_show,ic_pillar');
        if (intent.params.orderby) {
            urlParams.set('orderby', intent.params.orderby);
            urlParams.set('order', intent.params.order || 'desc');
        }
        // Taxonomy filters via WP REST API
        if (intent.params.ic_show) {
            urlParams.set('ic_show', intent.params.ic_show);
        }
        if (intent.params.ic_pillar) {
            urlParams.set('ic_pillar', intent.params.ic_pillar);
        }

        resultsTitle.textContent = 'Searching...';
        resultsGrid.innerHTML = '';
        resultsEmpty.style.display = 'none';
        resultsContainer.style.display = 'block';
        contentRows.style.opacity = '0.3';

        fetch(url + urlParams.toString())
        .then(function(r) { return r.json(); })
        .then(function(posts) {
            if (!posts.length || posts.code) {
                resultsTitle.textContent = 'No results for "' + query + '"';
                resultsEmpty.style.display = 'block';
                resultsGrid.innerHTML = '';
                return;
            }
            resultsTitle.textContent = posts.length + ' result' + (posts.length > 1 ? 's' : '') + ' for "' + query + '"';
            resultsGrid.innerHTML = posts.map(function(p) {
                var title = p.title ? p.title.rendered : '';
                var excerpt = p.excerpt ? p.excerpt.rendered.replace(/<[^>]+>/g, '').substring(0, 100) : '';
                var link = p.link || '#';
                // Extract YouTube ID from meta for thumbnail
                var ytId = '';
                if (p.meta && p.meta.ic_youtube_id) ytId = p.meta.ic_youtube_id;
                var thumb = ytId ? 'https://img.youtube.com/vi/' + ytId + '/mqdefault.jpg' : '';
                var duration = (p.meta && p.meta.ic_duration) ? p.meta.ic_duration : '';

                return '<a href="' + link + '" class="nfx-result-card">' +
                    '<div class="nfx-result-thumb" style="background-image: url(' + (thumb || '') + ')">' +
                        (duration ? '<span class="nfx-duration">' + duration + '</span>' : '') +
                    '</div>' +
                    '<div class="nfx-result-info">' +
                        '<h4 class="nfx-result-title">' + title + '</h4>' +
                        (excerpt ? '<p class="nfx-result-excerpt">' + excerpt + '</p>' : '') +
                    '</div>' +
                '</a>';
            }).join('');
        })
        .catch(function(err) {
            resultsTitle.textContent = 'Search error — please try again';
            console.error('Content search error:', err);
        });
    }

    function clearResults() {
        resultsContainer.style.display = 'none';
        resultsGrid.innerHTML = '';
        contentRows.style.opacity = '1';
    }

    if (resultsClose) resultsClose.addEventListener('click', clearResults);

    function handleHomeConcierge() {
        if (!homeInput) return;
        var msg = homeInput.value.trim();
        if (!msg) return;
        homeInput.value = '';
        // Show animated loading state on page
        resultsTitle.innerHTML = '<span class="nfx-search-loading">Finding the best results<span class="nfx-loading-dots"><span>.</span><span>.</span><span>.</span></span></span>';
        resultsGrid.innerHTML = '';
        resultsEmpty.style.display = 'none';
        resultsContainer.style.display = 'block';
        contentRows.style.opacity = '0.3';
        // Only use AI concierge for results — no WP keyword search
        // The AI results will populate the page via populateResultsFromAI()
        openSidebar(msg);
    }

    if (homeSend) homeSend.addEventListener('click', handleHomeConcierge);
    if (homeInput) {
        // Enter sends, Shift+Enter adds newline
        homeInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleHomeConcierge();
            }
        });
        // Auto-resize textarea as user types
        homeInput.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 120) + 'px';
        });
    }

});
</script>

<style>
/* ── Concierge Search Results Grid ── */
.nfx-concierge-results {
    padding: 30px 0 10px;
    background: var(--ic-black);
    border-bottom: 1px solid rgba(255,255,255,0.05);
}
.nfx-concierge-results-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 20px;
    padding: 10px 0 20px;
}
.nfx-result-card {
    text-decoration: none !important;
    border-radius: 6px;
    overflow: hidden;
    background: var(--ic-charcoal);
    transition: transform 0.2s, box-shadow 0.2s;
}
.nfx-result-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0,0,0,0.5);
}
.nfx-result-thumb {
    aspect-ratio: 16/9;
    background-size: cover;
    background-position: center;
    background-color: var(--ic-dark-gray);
    position: relative;
}
.nfx-result-thumb .nfx-duration {
    position: absolute;
    bottom: 6px;
    right: 6px;
}
.nfx-result-info {
    padding: 12px 14px 16px;
}
.nfx-result-title {
    font-family: var(--ic-font-body);
    font-size: 13px;
    font-weight: 600;
    color: var(--ic-white);
    margin: 0 0 6px;
    line-height: 1.3;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}
.nfx-result-excerpt {
    font-size: 11px;
    color: var(--ic-text-muted);
    margin: 0;
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}
@media (max-width: 768px) {
    .nfx-concierge-results-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
    }
}

/* ── Browse by Leader Cards ── */
.nfx-leader-card {
    padding-top: 20px !important;
    padding-bottom: 18px !important;
}
.nfx-leader-avatar {
    width: 72px;
    height: 72px;
    border-radius: 50%;
    overflow: hidden;
    margin-bottom: 12px;
    border: 2px solid rgba(200,169,81,0.3);
    transition: border-color 0.3s ease;
}
.nfx-leader-card:hover .nfx-leader-avatar {
    border-color: var(--ic-gold);
}
.nfx-leader-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    opacity: 1;
    transition: opacity 0.3s ease;
}
.nfx-leader-card:hover .nfx-leader-avatar img {
    opacity: 1;
}
.nfx-leader-avatar-placeholder {
    background: linear-gradient(135deg, rgba(200,169,81,0.15), rgba(200,169,81,0.05));
    display: flex;
    align-items: center;
    justify-content: center;
}
.nfx-leader-avatar-placeholder span {
    font-family: var(--ic-font-display, 'Playfair Display', serif);
    font-size: 28px;
    font-weight: 700;
    color: var(--ic-gold, #C8A951);
    opacity: 1;
}
.nfx-leader-card:hover .nfx-leader-avatar-placeholder span {
    opacity: 1;
}
</style>

<?php get_footer(); ?>
