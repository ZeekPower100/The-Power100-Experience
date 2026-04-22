<?php
/**
 * Single article view for IC ic_article posts.
 * Dark-mode adaptation of staging.power100.io/article-revamp/ template.
 * Structure mirrors staging's p100ar-* classes; CSS variables inverted for IC's
 * black background. All styles inlined to avoid IC style.css drift.
 *
 * SEO: emits canonical link to original staging URL (postmeta _p100_source_url)
 * so Google credits power100.io as the source — IC mirrors the content for
 * member discovery + AI Concierge context without competing for search rank.
 */
ic_require_membership();

if (have_posts()) the_post();

$post_id   = get_the_ID();
$src_url   = get_post_meta($post_id, '_p100_source_url', true);
$src_id    = (int) get_post_meta($post_id, '_p100_source_id', true);
$author    = get_post_meta($post_id, '_p100_author_name', true);
$pub_date  = get_the_date('F j, Y');
$reading_min = max(1, (int) ceil(str_word_count(wp_strip_all_tags(get_the_content())) / 220));

// Featured image: try post thumbnail, then first <img> in body content
$hero_img = '';
if (has_post_thumbnail($post_id)) {
    $hero_img = get_the_post_thumbnail_url($post_id, 'large');
}
if (!$hero_img) {
    if (preg_match('/<img[^>]+src=[\'"]([^\'"]+)[\'"]/', get_the_content(), $m)) {
        $hero_img = $m[1];
    }
}

$pillars   = wp_get_object_terms($post_id, 'ic_pillar',   array('fields' => 'all'));
$functions = wp_get_object_terms($post_id, 'ic_function', array('fields' => 'all'));

// Related: 3 most-recent ic_articles excluding current
$related = get_posts(array(
    'post_type'      => 'ic_article',
    'posts_per_page' => 3,
    'post__not_in'   => array($post_id),
    'orderby'        => 'date',
    'order'          => 'DESC',
));
?>
<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
<meta charset="<?php bloginfo('charset'); ?>">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title><?php echo esc_html(wp_get_document_title()); ?></title>
<?php if ($src_url):
    // Suppress WP's default rel_canonical so our staging-source canonical wins.
    // SEO: tells Google power100.io is the master copy; IC mirrors for member
    // discovery + AI Concierge context without competing for search rank.
    remove_action('wp_head', 'rel_canonical');
?>
<link rel="canonical" href="<?php echo esc_url($src_url); ?>">
<?php endif; ?>
<?php wp_head(); ?>
<style>
/* ═══════════════════════════════════════════════════════════════════
   IC ARTICLE — Dark-mode of staging article-revamp (p100ar-* spine).
   Variables inverted; structure preserved. All inline (no style.css).
   ═══════════════════════════════════════════════════════════════════ */
:root {
    --ar-red:         #FB0401;
    --ar-red-dark:    #E50504;
    --ar-gold:        #C8A951;
    --ar-gold-light:  #E8D48B;
    --ar-bg:          #0c0c0c;       /* IC body bg */
    --ar-bg-2:        #141414;       /* alt section bg */
    --ar-bg-card:     #1a1a1a;       /* card bg */
    --ar-text:        #fff;
    --ar-text-body:   rgba(255,255,255,0.86);
    --ar-text-mute:   rgba(255,255,255,0.55);
    --ar-text-subtle: rgba(255,255,255,0.4);
    --ar-border:      rgba(255,255,255,0.08);
    --ar-border-strong: rgba(255,255,255,0.18);
    --ar-display:     'Barlow Condensed', 'Poppins', sans-serif;
    --ar-body:        'Poppins', sans-serif;
    --ar-serif:       'Lora', Georgia, serif;
}

.ic-article-page * { box-sizing: border-box; }
.ic-article-page {
    background: var(--ar-bg);
    color: var(--ar-text-body);
    font-family: var(--ar-body);
    -webkit-font-smoothing: antialiased;
    overflow-x: hidden;
}
.ic-article-page a { text-decoration: none; color: inherit; }
.ic-article-page img { max-width: 100%; height: auto; display: block; }
.ic-article-page h1, .ic-article-page h2, .ic-article-page h3, .ic-article-page h4, .ic-article-page h5 { margin: 0; color: var(--ar-text); font-family: var(--ar-display); }
.ic-article-page p { margin: 0; }

.ic-article-reader { max-width: 880px; margin: 0 auto; padding: 0 32px; }

/* Reading progress bar */
.ic-article-progress {
    position: fixed; top: 0; left: 0; right: 0;
    height: 3px; background: transparent; z-index: 400; pointer-events: none;
}
.ic-article-progress-bar {
    height: 100%; width: 0;
    background: linear-gradient(90deg, var(--ar-red), #ff5a4a);
    box-shadow: 0 0 8px rgba(251,4,1,0.5);
    transition: width .08s linear;
}

/* HERO */
.ic-article-hero {
    position: relative;
    padding: 64px 0 48px;
    border-bottom: 1px solid var(--ar-border);
    background: linear-gradient(180deg, rgba(251,4,1,0.04) 0%, transparent 70%);
}
.ic-article-hero-inner {
    max-width: 920px; margin: 0 auto; padding: 0 32px;
}
.ic-article-hero-byline {
    display: flex; flex-wrap: wrap; align-items: center; gap: 12px;
    font-size: 11px; font-weight: 700; letter-spacing: 1.6px; text-transform: uppercase;
    color: var(--ar-gold); margin-bottom: 24px;
}
.ic-article-hero-byline-sep { color: var(--ar-text-subtle); }
.ic-article-hero-pillar { color: var(--ar-red); }
.ic-article-page .ic-article-hero-title {
    font-size: clamp(34px, 5vw, 58px); font-weight: 700; line-height: 1.08;
    letter-spacing: -0.5px; margin-bottom: 26px;
    font-family: var(--ar-display); text-transform: none;
}
.ic-article-hero-deck {
    font-size: 18px; line-height: 1.55; color: var(--ar-text-mute);
    margin-bottom: 32px; max-width: 720px;
    font-family: var(--ar-body);
}
.ic-article-hero-meta {
    display: flex; align-items: center; gap: 18px; flex-wrap: wrap;
    padding-top: 24px; border-top: 1px solid var(--ar-border);
    font-size: 13px; color: var(--ar-text-mute);
}
.ic-article-hero-author {
    display: inline-flex; align-items: center; gap: 12px;
    font-weight: 600; color: var(--ar-text);
}
.ic-article-hero-avatar {
    width: 40px; height: 40px; border-radius: 50%;
    background: linear-gradient(135deg, var(--ar-red), var(--ar-red-dark));
    display: inline-flex; align-items: center; justify-content: center;
    font-size: 14px; font-weight: 700; color: var(--ar-white);
    font-family: var(--ar-display); letter-spacing: 1px;
}
.ic-article-hero-meta-dot { width: 4px; height: 4px; border-radius: 50%; background: var(--ar-text-subtle); }

/* HERO IMAGE */
.ic-article-hero-img-wrap {
    max-width: 1100px; margin: 36px auto 0; padding: 0 32px;
}
.ic-article-hero-img {
    aspect-ratio: 16/9; border-radius: 8px; overflow: hidden;
    background-size: cover; background-position: center;
    box-shadow: 0 12px 48px rgba(0,0,0,0.5);
}
.ic-article-hero-img img { width: 100%; height: 100%; object-fit: cover; }

/* BODY */
.ic-article-body-section {
    padding: 64px 0 48px;
}
.ic-article-body {
    font-family: var(--ar-serif);
    font-size: 19px; line-height: 1.78; color: var(--ar-text-body);
}
.ic-article-body p { margin-bottom: 1.4em; }
.ic-article-body h2 {
    font-family: var(--ar-display); font-size: 32px; font-weight: 700;
    line-height: 1.2; letter-spacing: -0.3px;
    margin: 2em 0 0.8em; color: var(--ar-text);
}
.ic-article-body h3 {
    font-family: var(--ar-display); font-size: 24px; font-weight: 700;
    line-height: 1.25; margin: 1.6em 0 0.6em; color: var(--ar-text);
}
.ic-article-body h4 { font-size: 20px; font-weight: 600; margin: 1.4em 0 0.5em; color: var(--ar-text); font-family: var(--ar-body); }
.ic-article-body a { color: var(--ar-gold); border-bottom: 1px solid rgba(200,169,81,0.4); transition: color .2s, border-color .2s; }
.ic-article-body a:hover { color: var(--ar-gold-light); border-color: var(--ar-gold-light); }
.ic-article-body strong { color: var(--ar-text); }
.ic-article-body em { color: var(--ar-text); }
.ic-article-body blockquote {
    margin: 1.8em -16px; padding: 22px 28px;
    border-left: 4px solid var(--ar-red);
    background: rgba(251,4,1,0.05);
    font-size: 22px; font-style: italic; line-height: 1.5;
    color: var(--ar-text); border-radius: 0 6px 6px 0;
}
.ic-article-body blockquote p:last-child { margin-bottom: 0; }
.ic-article-body ul, .ic-article-body ol { padding-left: 1.5em; margin-bottom: 1.4em; }
.ic-article-body li { margin-bottom: 0.6em; }
.ic-article-body img {
    margin: 1.8em 0; border-radius: 6px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.4);
}
.ic-article-body figure { margin: 1.8em 0; }
.ic-article-body figcaption {
    font-size: 13px; color: var(--ar-text-subtle);
    text-align: center; margin-top: 10px;
    font-family: var(--ar-body); font-style: italic;
}
.ic-article-body hr { border: none; border-top: 1px solid var(--ar-border); margin: 2.5em 0; }
.ic-article-body code {
    background: var(--ar-bg-card); color: var(--ar-gold);
    padding: 2px 7px; border-radius: 3px; font-size: 0.92em;
    font-family: 'SF Mono', Monaco, monospace;
}

/* SOURCE LINK */
.ic-article-source {
    max-width: 760px; margin: 32px auto 0; padding: 16px 32px;
    border-top: 1px dashed var(--ar-border);
    font-size: 12px; color: var(--ar-text-subtle);
}
.ic-article-source a { color: var(--ar-gold); border-bottom: 1px dotted var(--ar-gold); }

/* AUTHOR CARD */
.ic-article-author-section {
    background: var(--ar-bg-2);
    padding: 56px 0;
    border-top: 1px solid var(--ar-border);
    border-bottom: 1px solid var(--ar-border);
}
.ic-article-author-card {
    max-width: 760px; margin: 0 auto; padding: 0 32px;
    display: flex; align-items: center; gap: 24px;
}
.ic-article-author-card-photo {
    flex-shrink: 0;
    width: 96px; height: 96px; border-radius: 50%;
    background: linear-gradient(135deg, var(--ar-red), var(--ar-red-dark));
    display: flex; align-items: center; justify-content: center;
    font-size: 36px; font-weight: 700; color: var(--ar-white);
    font-family: var(--ar-display); letter-spacing: 2px;
    box-shadow: 0 4px 18px rgba(251,4,1,0.25);
}
.ic-article-author-card-body { flex: 1; }
.ic-article-author-card-label {
    font-size: 10px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase;
    color: var(--ar-text-subtle); margin-bottom: 6px;
}
.ic-article-author-card-name {
    font-size: 22px; font-weight: 700; color: var(--ar-text);
    font-family: var(--ar-display);
}
.ic-article-author-card-role {
    font-size: 13px; color: var(--ar-text-mute); margin-top: 4px;
}

/* RELATED */
.ic-article-related {
    padding: 64px 0;
    background: var(--ar-bg);
}
.ic-article-related-head {
    max-width: 1240px; margin: 0 auto 36px; padding: 0 32px;
}
.ic-article-related-title {
    font-size: 28px; font-weight: 700; color: var(--ar-text);
    font-family: var(--ar-display); letter-spacing: -0.3px;
}
.ic-article-related-grid {
    max-width: 1240px; margin: 0 auto; padding: 0 32px;
    display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px;
}
.ic-article-related-card {
    display: flex; flex-direction: column;
    background: var(--ar-bg-card); border-radius: 8px; overflow: hidden;
    border: 1px solid var(--ar-border);
    transition: transform .25s, box-shadow .25s, border-color .25s;
}
.ic-article-related-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 32px rgba(0,0,0,0.5);
    border-color: var(--ar-border-strong);
}
.ic-article-related-img {
    aspect-ratio: 16/9;
    background-color: var(--ar-bg-2);
    background-size: cover; background-position: center;
    border-bottom: 1px solid var(--ar-border);
}
.ic-article-related-img.placeholder {
    display: flex; align-items: center; justify-content: center;
    background: linear-gradient(135deg, rgba(251,4,1,0.1), rgba(200,169,81,0.05));
    color: var(--ar-text-subtle);
    font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase;
}
.ic-article-related-body { padding: 22px; display: flex; flex-direction: column; flex: 1; }
.ic-article-related-label {
    font-size: 10px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase;
    color: var(--ar-gold); margin-bottom: 10px;
}
.ic-article-related-headline {
    font-size: 17px; font-weight: 700; line-height: 1.3; color: var(--ar-text);
    margin-bottom: 12px; flex: 1;
    font-family: var(--ar-body);
}
.ic-article-related-meta {
    font-size: 12px; color: var(--ar-text-subtle); margin-top: auto;
}

/* RESPONSIVE */
@media (max-width: 1024px) {
    .ic-article-related-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 768px) {
    .ic-article-hero { padding: 48px 0 36px; }
    .ic-article-hero-title { font-size: 30px; }
    .ic-article-hero-deck { font-size: 16px; }
    .ic-article-body-section { padding: 48px 0 36px; }
    .ic-article-body { font-size: 17px; line-height: 1.7; }
    .ic-article-body h2 { font-size: 26px; }
    .ic-article-body h3 { font-size: 21px; }
    .ic-article-author-card { flex-direction: column; text-align: center; gap: 16px; }
    .ic-article-related-grid { grid-template-columns: 1fr; }
}
@media (max-width: 560px) {
    .ic-article-reader { padding: 0 20px; }
    .ic-article-hero-inner, .ic-article-hero-img-wrap { padding-left: 20px; padding-right: 20px; }
    .ic-article-related-head, .ic-article-related-grid { padding-left: 20px; padding-right: 20px; }
}
</style>
</head>

<body <?php body_class('ic-article-page'); ?>>
<?php wp_body_open(); ?>

<!-- Reading progress bar -->
<div class="ic-article-progress" aria-hidden="true"><div class="ic-article-progress-bar" id="ic-article-progress-bar"></div></div>

<?php
// IC's standard logged-in/logged-out header (provides nav, brand, search, avatar)
get_header();
?>

<!-- HERO -->
<section class="ic-article-hero">
    <div class="ic-article-hero-inner">
        <div class="ic-article-hero-byline">
            <?php if (!empty($pillars) && !is_wp_error($pillars)): foreach ($pillars as $i => $p): ?>
                <span class="ic-article-hero-pillar"><?php echo esc_html($p->name); ?></span>
                <?php if ($i < count($pillars) - 1): ?><span class="ic-article-hero-byline-sep">·</span><?php endif; ?>
            <?php endforeach; endif; ?>
            <?php if (!empty($pillars) && !empty($functions)): ?><span class="ic-article-hero-byline-sep">·</span><?php endif; ?>
            <?php if (!empty($functions) && !is_wp_error($functions)): foreach ($functions as $i => $f): ?>
                <span><?php echo esc_html($f->name); ?></span>
                <?php if ($i < count($functions) - 1): ?><span class="ic-article-hero-byline-sep">·</span><?php endif; ?>
            <?php endforeach; endif; ?>
        </div>

        <h1 class="ic-article-hero-title"><?php the_title(); ?></h1>

        <?php $excerpt = get_the_excerpt(); if ($excerpt): ?>
        <div class="ic-article-hero-deck"><?php echo esc_html(wp_trim_words(wp_strip_all_tags($excerpt), 30)); ?></div>
        <?php endif; ?>

        <div class="ic-article-hero-meta">
            <?php if ($author): $initials = strtoupper(substr($author, 0, 1) . (strpos($author, ' ') !== false ? substr($author, strpos($author, ' ') + 1, 1) : '')); ?>
            <span class="ic-article-hero-author">
                <span class="ic-article-hero-avatar"><?php echo esc_html($initials); ?></span>
                <span><?php echo esc_html($author); ?></span>
            </span>
            <span class="ic-article-hero-meta-dot"></span>
            <?php endif; ?>
            <span><?php echo esc_html($pub_date); ?></span>
            <span class="ic-article-hero-meta-dot"></span>
            <span><?php echo $reading_min; ?> min read</span>
        </div>
    </div>

    <?php if ($hero_img): ?>
    <div class="ic-article-hero-img-wrap">
        <div class="ic-article-hero-img" style="background-image:url('<?php echo esc_url($hero_img); ?>');"></div>
    </div>
    <?php endif; ?>
</section>

<!-- BODY -->
<section class="ic-article-body-section">
    <div class="ic-article-reader">
        <article class="ic-article-body">
            <?php the_content(); ?>
        </article>

        <?php if ($src_url): ?>
        <div class="ic-article-source">
            Originally published on <a href="<?php echo esc_url($src_url); ?>" rel="noopener canonical">power100.io</a>
        </div>
        <?php endif; ?>
    </div>
</section>

<!-- AUTHOR CARD -->
<?php if ($author): ?>
<section class="ic-article-author-section">
    <div class="ic-article-author-card">
        <div class="ic-article-author-card-photo"><?php echo esc_html($initials); ?></div>
        <div class="ic-article-author-card-body">
            <div class="ic-article-author-card-label">Written By</div>
            <div class="ic-article-author-card-name"><?php echo esc_html($author); ?></div>
            <div class="ic-article-author-card-role">Power100 Contributor</div>
        </div>
    </div>
</section>
<?php endif; ?>

<!-- RELATED -->
<?php if (!empty($related)): ?>
<section class="ic-article-related">
    <div class="ic-article-related-head">
        <h2 class="ic-article-related-title">More from Inner Circle</h2>
    </div>
    <div class="ic-article-related-grid">
        <?php foreach ($related as $r):
            $r_thumb = get_the_post_thumbnail_url($r->ID, 'medium_large');
            if (!$r_thumb && preg_match('/<img[^>]+src=[\'"]([^\'"]+)[\'"]/', $r->post_content, $rm)) $r_thumb = $rm[1];
            $r_pillars = wp_get_object_terms($r->ID, 'ic_pillar', array('fields' => 'names'));
            $r_label = !is_wp_error($r_pillars) && !empty($r_pillars) ? $r_pillars[0] : 'Article';
        ?>
        <a href="<?php echo esc_url(get_permalink($r->ID)); ?>" class="ic-article-related-card">
            <?php if ($r_thumb): ?>
            <div class="ic-article-related-img" style="background-image:url('<?php echo esc_url($r_thumb); ?>');"></div>
            <?php else: ?>
            <div class="ic-article-related-img placeholder">Article</div>
            <?php endif; ?>
            <div class="ic-article-related-body">
                <div class="ic-article-related-label"><?php echo esc_html($r_label); ?></div>
                <h3 class="ic-article-related-headline"><?php echo esc_html(get_the_title($r->ID)); ?></h3>
                <div class="ic-article-related-meta"><?php echo esc_html(get_the_date('M j, Y', $r->ID)); ?></div>
            </div>
        </a>
        <?php endforeach; ?>
    </div>
</section>
<?php endif; ?>

<?php get_footer(); ?>

<script>
// Reading progress bar — tracks scroll through the body section.
(function() {
    var bar = document.getElementById('ic-article-progress-bar');
    if (!bar) return;
    var bodySection = document.querySelector('.ic-article-body-section');
    function update() {
        if (!bodySection) return;
        var rect = bodySection.getBoundingClientRect();
        var totalScrollable = rect.height - window.innerHeight + rect.top;
        var scrolled = -rect.top;
        var pct = Math.max(0, Math.min(100, (scrolled / Math.max(1, rect.height - window.innerHeight)) * 100));
        if (rect.bottom < 0) pct = 100;
        if (rect.top > window.innerHeight) pct = 0;
        bar.style.width = pct + '%';
    }
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
})();
</script>
</body>
</html>
