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

// ── Contributor author resolution (P100 → IC mirror via ic_author_contributor_id) ──
// When set, this overrides the legacy $author (which is the WP user name, usually "Power100").
$contrib_id   = (int) get_post_meta($post_id, 'ic_author_contributor_id', true);
$author_type  = (string) get_post_meta($post_id, 'ic_author_type', true);
$contrib_data = null;
if ($contrib_id) {
    $contrib_post = get_post($contrib_id);
    if ($contrib_post && $contrib_post->post_status === 'publish') {
        $cclass = (string) get_post_meta($contrib_id, 'contributor_class', true);
        $ctype  = (string) get_post_meta($contrib_id, 'contributor_type', true);
        $is_ec  = ($cclass === 'expert_contributor') || in_array($ctype, array('ranked_ceo', 'ranked_partner', 'industry_leader'), true);
        $headshot_id = get_post_thumbnail_id($contrib_id);
        if (!$headshot_id) $headshot_id = (int) get_post_meta($contrib_id, 'ec_headshot', true);
        $headshot_url = $headshot_id ? wp_get_attachment_image_url($headshot_id, 'thumbnail') : '';
        $contrib_role = (string) get_post_meta($contrib_id, 'ec_role_title', true);
        if (!$contrib_role) $contrib_role = $is_ec ? 'Expert Contributor' : 'Power100 Contributor';
        $contrib_data = array(
            'id'         => $contrib_id,
            'name'       => get_the_title($contrib_id),
            'role'       => $contrib_role,
            'url'        => get_permalink($contrib_id),
            'headshot'   => $headshot_url,
            'is_ec'      => $is_ec,
        );
    }
}

// Featured image is only used for rail cards on the homepage/archive — NOT
// rendered in the article hero (staging shows a video-thumbnail there;
// those videos are IC-only now, so the hero image becomes a redundant
// duplicate of the first inline body image).
// The featured image backfill script (sideload first body img) handles
// populating the thumbnail for rail cards.

// Share URLs use the IC canonical (public URL of this article on IC),
// NOT the staging canonical — sharing sends members to IC, not to P100.
$share_url = get_permalink($post_id);
$share_title = rawurlencode(get_the_title($post_id));
$share_url_enc = rawurlencode($share_url);

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
.ic-article-hero-categories {
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
/* Byline row — author + meta + share buttons, all on one line (wraps on mobile) */
.ic-article-hero-byline {
    display: flex; align-items: center; justify-content: space-between;
    gap: 24px; flex-wrap: wrap;
    padding-top: 24px; border-top: 1px solid var(--ar-border);
}
.ic-article-hero-author {
    display: inline-flex; align-items: center; gap: 14px;
    flex: 1; min-width: 0;
}
.ic-article-hero-avatar {
    flex-shrink: 0;
    width: 44px; height: 44px; border-radius: 50%;
    background: linear-gradient(135deg, var(--ar-red), var(--ar-red-dark));
    display: inline-flex; align-items: center; justify-content: center;
    font-size: 15px; font-weight: 700; color: var(--ar-white);
    font-family: var(--ar-display); letter-spacing: 1px;
    box-shadow: 0 2px 12px rgba(251,4,1,0.25);
}
.ic-article-hero-author-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.ic-article-hero-author-by {
    font-size: 10px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase;
    color: var(--ar-text-subtle);
}
.ic-article-hero-author-name {
    font-size: 15px; font-weight: 700; color: var(--ar-text);
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.ic-article-hero-author-role {
    font-size: 12px; color: var(--ar-text-mute);
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.ic-article-hero-meta {
    display: inline-flex; align-items: center; gap: 10px;
    font-size: 12px; color: var(--ar-text-mute);
}
.ic-article-hero-meta-dot { width: 3px; height: 3px; border-radius: 50%; background: var(--ar-text-subtle); }

/* Share buttons */
.ic-article-hero-share {
    display: inline-flex; align-items: center; gap: 6px;
}
.ic-article-hero-share a, .ic-article-hero-share button {
    display: inline-flex; align-items: center; justify-content: center;
    width: 34px; height: 34px; border-radius: 50%;
    background: rgba(255,255,255,0.05);
    border: 1px solid var(--ar-border);
    color: var(--ar-text-mute);
    cursor: pointer;
    transition: background .2s, color .2s, border-color .2s, transform .2s;
    padding: 0;
}
.ic-article-hero-share a:hover, .ic-article-hero-share button:hover {
    background: var(--ar-red);
    color: var(--ar-white);
    border-color: var(--ar-red);
    transform: translateY(-1px);
}
.ic-article-hero-share svg { width: 14px; height: 14px; fill: currentColor; }
.ic-article-hero-share .copied {
    position: absolute; margin-top: -50px; padding: 4px 10px;
    background: var(--ar-gold); color: var(--ar-bg);
    font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;
    border-radius: 4px;
    opacity: 0; pointer-events: none;
    transition: opacity .25s;
}
.ic-article-hero-share .copied.show { opacity: 1; }

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
.ic-article-author-card-name a {
    color: inherit; text-decoration: none; transition: color 0.2s;
}
.ic-article-author-card-name a:hover { color: var(--ar-red); }
.ic-article-author-card-link {
    display: inline-block; margin-top: 12px;
    font-size: 12px; font-weight: 600; letter-spacing: 0.5px;
    color: var(--ar-red); text-decoration: none;
    transition: transform 0.2s;
}
.ic-article-author-card-link:hover { transform: translateX(3px); }
.ic-article-hero-author-link {
    color: inherit; text-decoration: none; transition: color 0.2s;
}
.ic-article-hero-author-link:hover { color: var(--ar-red); }

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
        <div class="ic-article-hero-categories">
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

        <!-- Byline: author + meta + share -->
        <div class="ic-article-hero-byline">
            <?php
            // Display name + initials precedence: linked contributor > legacy _p100_author_name > Power100
            $byline_name = $contrib_data ? $contrib_data['name'] : ($author ?: 'Power100 Staff');
            $byline_role = $contrib_data ? $contrib_data['role'] : 'Power100 Staff';
            $initials = strtoupper(substr($byline_name, 0, 1) . (strpos($byline_name, ' ') !== false ? substr($byline_name, strpos($byline_name, ' ') + 1, 1) : ''));
            $author_link_open  = $contrib_data ? '<a href="' . esc_url($contrib_data['url']) . '" class="ic-article-hero-author-link">' : '';
            $author_link_close = $contrib_data ? '</a>' : '';
            ?>
            <div class="ic-article-hero-author">
                <?php if ($contrib_data && !empty($contrib_data['headshot'])): ?>
                    <a href="<?php echo esc_url($contrib_data['url']); ?>" class="ic-article-hero-avatar" style="background-image:url('<?php echo esc_url($contrib_data['headshot']); ?>'); background-size:cover; background-position:center; color:transparent;"><?php echo esc_html($initials); ?></a>
                <?php else: ?>
                    <div class="ic-article-hero-avatar"><?php echo esc_html($initials); ?></div>
                <?php endif; ?>
                <div class="ic-article-hero-author-info">
                    <span class="ic-article-hero-author-by">By</span>
                    <span class="ic-article-hero-author-name"><?php echo $author_link_open . esc_html($byline_name) . $author_link_close; ?></span>
                    <span class="ic-article-hero-author-role"><?php echo esc_html($byline_role); ?> · <?php echo esc_html($pub_date); ?> · <?php echo $reading_min; ?> min read</span>
                </div>
            </div>

            <div class="ic-article-hero-share" aria-label="Share this article">
                <a href="https://www.linkedin.com/sharing/share-offsite/?url=<?php echo $share_url_enc; ?>" target="_blank" rel="noopener" aria-label="Share on LinkedIn">
                    <svg viewBox="0 0 24 24"><path d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S.02 4.88.02 3.5C.02 2.12 1.13 1 2.5 1s2.48 1.12 2.48 2.5zM.22 8h4.56v14H.22V8zm7.27 0h4.37v1.92h.06c.61-1.15 2.1-2.37 4.32-2.37 4.62 0 5.47 3.04 5.47 6.99V22h-4.56v-6.21c0-1.48-.03-3.38-2.06-3.38-2.06 0-2.37 1.61-2.37 3.27V22H7.49V8z"/></svg>
                </a>
                <a href="https://twitter.com/intent/tweet?url=<?php echo $share_url_enc; ?>&text=<?php echo $share_title; ?>" target="_blank" rel="noopener" aria-label="Share on X">
                    <svg viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                </a>
                <a href="https://www.facebook.com/sharer/sharer.php?u=<?php echo $share_url_enc; ?>" target="_blank" rel="noopener" aria-label="Share on Facebook">
                    <svg viewBox="0 0 24 24"><path d="M24 12.07C24 5.41 18.63 0 12 0S0 5.41 0 12.07C0 18.1 4.39 23.09 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.8-4.69 4.54-4.69 1.31 0 2.69.23 2.69.23v2.96h-1.51c-1.49 0-1.96.93-1.96 1.88v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.09 24 18.1 24 12.07"/></svg>
                </a>
                <a href="mailto:?subject=<?php echo $share_title; ?>&body=<?php echo $share_url_enc; ?>" aria-label="Share by email">
                    <svg viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
                </a>
                <button type="button" data-share-copy="<?php echo esc_attr($share_url); ?>" aria-label="Copy article link">
                    <svg viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
                </button>
                <span class="copied" id="ic-article-copied">Copied</span>
            </div>
        </div>
    </div>
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
<?php if ($contrib_data || $author): ?>
<section class="ic-article-author-section">
    <div class="ic-article-author-card">
        <?php if ($contrib_data && !empty($contrib_data['headshot'])): ?>
            <a href="<?php echo esc_url($contrib_data['url']); ?>" class="ic-article-author-card-photo" style="background-image:url('<?php echo esc_url($contrib_data['headshot']); ?>'); background-size:cover; background-position:center; color:transparent;"><?php echo esc_html($initials); ?></a>
        <?php else: ?>
            <div class="ic-article-author-card-photo"><?php echo esc_html($initials); ?></div>
        <?php endif; ?>
        <div class="ic-article-author-card-body">
            <div class="ic-article-author-card-label">Written By</div>
            <div class="ic-article-author-card-name">
                <?php if ($contrib_data): ?>
                    <a href="<?php echo esc_url($contrib_data['url']); ?>"><?php echo esc_html($contrib_data['name']); ?></a>
                <?php else: ?>
                    <?php echo esc_html($byline_name); ?>
                <?php endif; ?>
            </div>
            <div class="ic-article-author-card-role"><?php echo esc_html($byline_role); ?></div>
            <?php if ($contrib_data): ?>
                <a href="<?php echo esc_url($contrib_data['url']); ?>" class="ic-article-author-card-link">View profile →</a>
            <?php endif; ?>
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

// Copy-link share button
(function() {
    var btn = document.querySelector('[data-share-copy]');
    var toast = document.getElementById('ic-article-copied');
    if (!btn) return;
    btn.addEventListener('click', function() {
        var url = btn.getAttribute('data-share-copy');
        if (navigator.clipboard) {
            navigator.clipboard.writeText(url).then(function() {
                if (toast) { toast.classList.add('show'); setTimeout(function() { toast.classList.remove('show'); }, 1600); }
            });
        }
    });
})();
</script>
</body>
</html>
