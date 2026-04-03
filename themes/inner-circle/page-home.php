<?php
/**
 * Template Name: Home
 * Netflix-style content browsing — hero + horizontal scroll rows
 * v3.3.0
 */
ic_require_membership();

$member = ic_get_member_data();
$first_name = $member['first_name'] ?? 'there';

// ── Featured/Hero Content: Latest published or pinned ──
$featured_id = intval(get_option('ic_featured_content_id', 0));
$hero_post = null;
if ($featured_id) {
    $hero_post = get_post($featured_id);
}
if (!$hero_post || $hero_post->post_status !== 'publish') {
    $hero_posts = get_posts(array(
        'post_type' => 'ic_content',
        'posts_per_page' => 1,
        'orderby' => 'date',
        'order' => 'DESC',
    ));
    $hero_post = !empty($hero_posts) ? $hero_posts[0] : null;
}

// Hero data
$hero_thumb = '';
$hero_video_url = '';
$hero_show_label = '';
$hero_speakers = array();
$hero_excerpt = '';
if ($hero_post) {
    $hid = $hero_post->ID;
    $hero_video_url = get_post_meta($hid, 'ic_video_url', true);
    $hero_excerpt = $hero_post->post_excerpt ?: wp_trim_words($hero_post->post_content, 30);
    $hero_show_label = ic_get_content_label($hid);
    $hero_thumb = get_the_post_thumbnail_url($hid, 'full');
    if (!$hero_thumb && $hero_video_url && preg_match('/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/', $hero_video_url, $m)) {
        $hero_thumb = 'https://img.youtube.com/vi/' . $m[1] . '/maxresdefault.jpg';
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

// ── Priority show rows (explicit order) ──
$priority_show_slugs = array('events', 'powerchat');
$priority_shows = array();
foreach ($priority_show_slugs as $slug) {
    $term = get_term_by('slug', $slug, 'ic_show');
    if ($term) {
        $posts = get_posts(array(
            'post_type' => 'ic_content',
            'posts_per_page' => 15,
            'orderby' => 'date',
            'order' => 'DESC',
            'tax_query' => array(array(
                'taxonomy' => 'ic_show',
                'field' => 'slug',
                'terms' => $slug,
            )),
        ));
        if (!empty($posts)) {
            $priority_shows[$slug] = array('term' => $term, 'posts' => $posts);
        }
    }
}

// ── Executive Interviews (Feature Interviews only — CEO 1-on-1s) ──
$all_exec_raw = get_posts(array(
    'post_type' => 'ic_content',
    'posts_per_page' => 100,
    'orderby' => 'date',
    'order' => 'DESC',
));
$feature_interview_posts = array();
foreach ($all_exec_raw as $p) {
    $title_lower = strtolower($p->post_title);
    if (strpos($title_lower, 'feature interview') !== false || strpos($title_lower, 'featured interview') !== false) {
        $feature_interview_posts[] = $p;
    }
}

// ── Remaining shows (exclude priority ones + executive-interviews) ──
$exclude_slugs = array_merge($priority_show_slugs, array('executive-interviews', 'customer-interviews'));
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
    <section class="nfx-hero" style="background-image: url('<?php echo esc_url($hero_thumb); ?>');">
        <div class="nfx-hero-overlay"></div>
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
                    echo esc_html($time_greeting . ', ' . $first_name . '.');
                ?></h2>
                <?php
                $total_new = count($trending);
                if ($total_new > 0) : ?>
                <p class="nfx-greeting-sub"><?php echo esc_html($total_new . ' new episode' . ($total_new > 1 ? 's' : '') . ' added recently. What are you looking for?'); ?></p>
                <?php else : ?>
                <p class="nfx-greeting-sub">What can the Inner Circle help you with today?</p>
                <?php endif; ?>
            </div>
            <div class="nfx-concierge-input-wrap">
                <input type="text" id="home-concierge-input" class="nfx-concierge-input" placeholder="Ask anything — find episodes, get insights, explore topics...">
                <button id="home-concierge-send" class="nfx-concierge-send">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="#0A0A0A"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                </button>
            </div>
        </div>
    </section>


    <div class="nfx-rows">

        <!-- ═══ ROW 1: TRENDING IN AMERICA (5 most recent) ═══ -->
        <?php if (!empty($trending)) : ?>
        <section class="nfx-row">
            <div class="nfx-container">
                <div class="nfx-row-header">
                    <h2>Trending in America</h2>
                </div>
                <div class="nfx-carousel-wrap">
                    <button class="nfx-scroll-btn nfx-scroll-left" aria-label="Scroll left">‹</button>
                    <div class="nfx-carousel">
                        <?php foreach ($trending as $item) :
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

        <!-- ═══ ROW 2: EVENTS ═══ -->
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

        <!-- ═══ ROW 3: CONTINUE WATCHING ═══ -->
        <?php if (!empty($continue_watching)) : ?>
        <section class="nfx-row">
            <div class="nfx-container">
                <div class="nfx-row-header">
                    <h2>Continue Watching for <?php echo esc_html($first_name); ?></h2>
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

        <!-- ═══ ROW 5: EXECUTIVE INTERVIEWS (Feature Interviews only) ═══ -->
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
                        <a href="<?php echo esc_url(get_term_link($company)); ?>" class="nfx-company-card">
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

        <!-- ═══ REMAINING SHOW ROWS ═══ -->
        <?php if (!empty($shows_with_content) && !is_wp_error($shows_with_content)) :
            foreach ($shows_with_content as $show) :
                $show_posts = get_posts(array(
                    'post_type' => 'ic_content',
                    'posts_per_page' => 15,
                    'orderby' => 'date',
                    'order' => 'DESC',
                    'tax_query' => array(array(
                        'taxonomy' => 'ic_show',
                        'field' => 'slug',
                        'terms' => $show->slug,
                    )),
                ));
                if (empty($show_posts)) continue;
        ?>
        <section class="nfx-row">
            <div class="nfx-container">
                <div class="nfx-row-header">
                    <h2><a href="<?php echo esc_url(add_query_arg('show', $show->slug, get_post_type_archive_link('ic_content'))); ?>"><?php echo esc_html($show->name); ?></a></h2>
                    <a href="<?php echo esc_url(add_query_arg('show', $show->slug, get_post_type_archive_link('ic_content'))); ?>" class="nfx-browse-all">Browse All ›</a>
                </div>
                <div class="nfx-carousel-wrap">
                    <button class="nfx-scroll-btn nfx-scroll-left" aria-label="Scroll left">‹</button>
                    <div class="nfx-carousel">
                        <?php foreach ($show_posts as $item) :
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
        <?php endforeach; endif; ?>

    </div><!-- .nfx-rows -->

</main>

<!-- Carousel scroll + Search + Concierge + Header scroll JS -->
<script>
document.addEventListener('DOMContentLoaded', function() {

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

    function openSidebar(initialMsg) {
        sidebar.classList.add('open');
        sidebarBackdrop.classList.add('open');
        if (initialMsg) {
            appendMessage('user', initialMsg);
            // TODO: Wire to TPX concierge API
            appendMessage('assistant', 'Let me look into that for you...');
        }
        setTimeout(function() { sidebarInput.focus(); }, 200);
    }

    function closeSidebar() {
        sidebar.classList.remove('open');
        sidebarBackdrop.classList.remove('open');
    }

    function appendMessage(role, text) {
        var div = document.createElement('div');
        div.className = 'ic-sidebar-msg ic-sidebar-msg-' + role;
        div.textContent = text;
        sidebarMessages.appendChild(div);
        sidebarMessages.scrollTop = sidebarMessages.scrollHeight;
    }

    if (sidebarClose) sidebarClose.addEventListener('click', closeSidebar);
    if (sidebarBackdrop) sidebarBackdrop.addEventListener('click', closeSidebar);

    if (sidebarSend) {
        sidebarSend.addEventListener('click', function() {
            var msg = sidebarInput.value.trim();
            if (!msg) return;
            appendMessage('user', msg);
            sidebarInput.value = '';
            // TODO: Wire to TPX concierge API
            appendMessage('assistant', 'Working on that...');
        });
        sidebarInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') sidebarSend.click();
        });
    }

    // ── Home Concierge Input ──
    var homeInput = document.getElementById('home-concierge-input');
    var homeSend = document.getElementById('home-concierge-send');

    function handleHomeConcierge() {
        if (!homeInput) return;
        var msg = homeInput.value.trim();
        if (!msg) return;
        homeInput.value = '';
        openSidebar(msg);
    }

    if (homeSend) homeSend.addEventListener('click', handleHomeConcierge);
    if (homeInput) {
        homeInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') handleHomeConcierge();
        });
    }

});
</script>

<?php get_footer(); ?>
