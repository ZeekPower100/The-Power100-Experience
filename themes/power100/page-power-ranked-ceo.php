<?php
/**
 * Template Name: Power Ranked CEO Lander
 * The lander page for ranked CEOs (Power100 National Power Rankings)
 * Pulls all data from ACF fields (pcl_ prefix)
 *
 * Reuses ec-lander.css for visual consistency with the EC lander template,
 * with a few extras for the rank-driven hero. Self-contained: bypasses
 * GeneratePress wrapper for full-width layout.
 */
add_action('wp_enqueue_scripts', function() {
    wp_dequeue_style('generate-style');
    wp_dequeue_style('generatepress');
    wp_dequeue_style('generate-main');
}, 100);

$pid = get_the_ID();

// ── Core Hero ──
$rank_number    = get_field('pcl_rank_number', $pid);
$rank_label     = get_field('pcl_rank_label', $pid) ?: 'National Power Ranking';
$ceo_name       = get_field('pcl_ceo_full_name', $pid) ?: get_the_title();
$company_name   = get_field('pcl_company_name', $pid);
$linkedin_url   = get_field('pcl_company_linkedin_url', $pid);
$headshot       = get_field('pcl_headshot_image', $pid);
$headshot_url   = is_array($headshot) ? $headshot['url'] : (is_numeric($headshot) ? wp_get_attachment_url($headshot) : ($headshot ?: ''));
$salute_text    = get_field('pcl_salute_text', $pid);

// ── Videos (numbered slots 1-15, matching EC pattern) ──
$videos = array();
for ($i = 1; $i <= 15; $i++) {
    $vurl   = get_field("pcl_video_{$i}_url", $pid)   ?: get_post_meta($pid, "pcl_video_{$i}_url", true);
    $vthumb = get_field("pcl_video_{$i}_thumb", $pid) ?: get_post_meta($pid, "pcl_video_{$i}_thumb", true);
    $vtitle = get_field("pcl_video_{$i}_title", $pid) ?: get_post_meta($pid, "pcl_video_{$i}_title", true);
    $vgroup = get_field("pcl_video_{$i}_group", $pid) ?: get_post_meta($pid, "pcl_video_{$i}_group", true);
    if ($vurl || $vthumb) {
        // Resolve thumb to URL if it's an attachment ID/array
        if (is_array($vthumb)) $vthumb = $vthumb['url'] ?? '';
        elseif (is_numeric($vthumb)) $vthumb = wp_get_attachment_url($vthumb);
        $videos[] = array(
            'url'   => $vurl,
            'thumb' => $vthumb,
            'title' => $vtitle ?: '',
            'group' => $vgroup ?: '',
        );
    }
}

// ── Snapshots (newline-separated URLs, matching EC pattern) ──
$snapshots_raw = get_field('pcl_snapshots', $pid);
$snapshots = array();
if ($snapshots_raw && is_string($snapshots_raw)) {
    $snapshots = array_filter(array_map('trim', preg_split('/[\n\r]+/', $snapshots_raw)));
} elseif (is_array($snapshots_raw)) {
    $snapshots = $snapshots_raw;
}

// ── Bio body (highlight reel about the CEO) ──
$bio_body = get_field('pcl_bio_body', $pid);

// ── Company About (company history / story) ──
$company_about    = get_field('pcl_company_about', $pid);
$company_address  = get_field('pcl_company_address', $pid);
$rankings_lists   = get_field('pcl_rankings_lists', $pid);

// ── CEO Quote ──
$ceo_quote      = get_field('pcl_ceo_quote', $pid);
$ceo_quote_cite = get_field('pcl_ceo_quote_cite', $pid);

// ── Customer Testimonials (up to 6 slots, skip empty) ──
$testimonials = array();
for ($i = 1; $i <= 6; $i++) {
    $tq = get_field("pcl_testimonial_{$i}_quote", $pid) ?: get_post_meta($pid, "pcl_testimonial_{$i}_quote", true);
    $tn = get_field("pcl_testimonial_{$i}_name", $pid)  ?: get_post_meta($pid, "pcl_testimonial_{$i}_name", true);
    $tt = get_field("pcl_testimonial_{$i}_title", $pid) ?: get_post_meta($pid, "pcl_testimonial_{$i}_title", true);
    if ($tq) {
        $testimonials[] = array(
            'quote' => $tq,
            'name'  => $tn ?: '',
            'title' => $tt ?: '',
        );
    }
}

// ── Split name for display ──
$name_words = explode(' ', $ceo_name);
$first_name = $name_words[0];
$last_name = count($name_words) > 1 ? implode(' ', array_slice($name_words, 1)) : '';

// ── Helper: classify a video URL ──
function pcl_classify_video($url) {
    if (!$url) return ['type' => 'none', 'id' => null];
    if (preg_match('/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/', $url, $m)) {
        return ['type' => 'youtube', 'id' => $m[1]];
    }
    if (preg_match('/vimeo\.com\/(\d+)/', $url, $m)) {
        return ['type' => 'vimeo', 'id' => $m[1]];
    }
    if (preg_match('/\.(mp4|webm|ogg)(?:\?|$)/i', $url)) {
        return ['type' => 'hosted', 'id' => $url];
    }
    return ['type' => 'unknown', 'id' => $url];
}

?>
<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
<meta charset="<?php bloginfo('charset'); ?>">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,600&family=Barlow+Condensed:wght@600;700;800;900&display=swap" rel="stylesheet">
<?php wp_head(); ?>
<style>
<?php
// Reuse the EC lander CSS as the foundation (visual consistency)
$ec_css = get_stylesheet_directory() . '/css/ec-lander.css';
if (file_exists($ec_css)) include $ec_css;
?>

/* ============================================================================
   POWER RANKED CEO LANDER — extensions on top of ec-lander.css
   ============================================================================ */

/* Body class scoping so we don't bleed into EC pages */
.pcl-page { font-family: var(--font-body, 'Poppins'), sans-serif; }

/* Program Intro — "National Power Rankings" banner above the CEO hero.
   Dark section with centered headline; followed by a red banner strip with
   the program description. Shared copy across all CEO landers. */
.pcl-intro {
    background: #0a0a0a;
    color: var(--p-white, #fff);
    padding: 90px 0 86px;
    position: relative;
    overflow: hidden;
    text-align: center;
}
/* Background video wrapper — YouTube IFrame API target.
   Sizes the iframe to cover the section via viewport-based 16:9 math. */
.pcl-intro-yt-wrap {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
    z-index: 0;
    pointer-events: none;
    opacity: .65;
    background: #000;
}
.pcl-intro-yt-wrap iframe,
.pcl-intro-yt-wrap #pcl-intro-yt-player {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 100vw;
    height: 56.25vw;  /* 16:9 ratio against viewport width */
    min-width: 100%;
    min-height: 100%;
    /* Y translate < -50% shifts the iframe DOWN relative to its centered
       position, which brings higher content (Greg + Andy's faces) into the
       visible window. -38% ≈ "upper middle". Tune between -30% and -45%. */
    transform: translate(-50%, -38%);
    border: 0;
    pointer-events: none;
}
/* Tint overlay above the video — red atmosphere + darkening so the
   headline text stays readable regardless of video content */
.pcl-intro::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: 1;
    background:
        radial-gradient(ellipse at 50% 100%, rgba(251,4,1,.22) 0%, transparent 55%),
        radial-gradient(ellipse at 50% 0%, rgba(251,4,1,.08) 0%, transparent 45%),
        linear-gradient(to bottom, rgba(0,0,0,.55) 0%, rgba(0,0,0,.35) 50%, rgba(0,0,0,.55) 100%);
    pointer-events: none;
}
/* V-shape bottom divider — intro's dark bottom dips to a point at the center,
   red fills below and blends seamlessly into the red banner section that follows.
   Height is tuned so the V fill at center matches the banner's bottom padding. */
.pcl-intro-divider {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    width: 100%;
    height: 48px;
    display: block;
    pointer-events: none;
    z-index: 3;
}
.pcl-intro-divider .pcl-intro-divider-fill { fill: var(--p-red, #FB0401); }
.pcl-intro-inner {
    max-width: 1100px;
    margin: 0 auto;
    padding: 0 36px;
    position: relative;
    z-index: 2;
}
.pcl-intro-eyebrow {
    display: inline-block;
    font-family: var(--font-body, 'Poppins'), sans-serif;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 4px;
    color: var(--p-red, #FB0401);
    margin: 0 0 16px;
}
.pcl-intro-title {
    font-family: 'Poppins', sans-serif;
    font-size: clamp(40px, 5.8vw, 76px);
    font-weight: 800;
    line-height: 1.05;
    text-transform: uppercase;
    color: var(--p-white, #fff);
    margin: 0 0 18px;
    letter-spacing: -.5px;
}
.pcl-intro-title span { color: var(--p-red, #FB0401); }
.pcl-intro-subtitle {
    font-family: 'Poppins', sans-serif;
    font-size: clamp(16px, 1.55vw, 20px);
    font-weight: 400;
    color: rgba(255,255,255,.82);
    line-height: 1.5;
    max-width: 720px;
    margin: 0 auto;
}
/* Red banner strip — delivers the longer descriptive message.
   Zero top padding: the text sits flush to the intro's bottom edge so the
   V divider above (which already adds ~22px of red space at center) is the
   only top padding. Bottom padding matches the center V depth for symmetry. */
.pcl-intro-banner {
    background: var(--p-red, #FB0401);
    color: var(--p-white, #fff);
    padding: 0 0 22px;
    text-align: center;
    position: relative;
}
.pcl-intro-banner-inner {
    max-width: 1100px;
    margin: 0 auto;
    padding: 0 36px;
}
.pcl-intro-banner p {
    margin: 0;
    font-family: var(--font-body, 'Poppins'), sans-serif;
    font-size: clamp(13px, 1.25vw, 15px);
    line-height: 1.65;
    font-weight: 400;
    color: var(--p-white, #fff);
}
.pcl-intro-banner em {
    font-style: italic;
    font-weight: 500;
}

/* Hero — Power100-frame photo + stacked rank/name/info */
.pcl-hero {
    background: #0a0a0a;
    color: var(--p-white, #fff);
    padding: 70px 0 140px;
    position: relative;
    overflow: hidden;
}
/* Slanted bottom edge — mirrors the old lander's Elementor tilt divider.
   White fill below the diagonal blends into the next (white) section,
   with a thin red line tracing the diagonal. */
.pcl-hero-divider {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    width: 100%;
    height: 80px;
    display: block;
    pointer-events: none;
    z-index: 2;
}
.pcl-hero-divider .pcl-hero-divider-fill { fill: #ffffff; }
.pcl-hero-divider .pcl-hero-divider-line {
    stroke: var(--p-red, #FB0401);
    stroke-width: 3;
    fill: none;
}
.pcl-hero::before {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(ellipse at 30% 0%, rgba(251,4,1,.18) 0%, transparent 55%);
    pointer-events: none;
}
.pcl-hero-inner {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 36px;
    display: grid;
    grid-template-columns: 320px 1fr;
    gap: 64px;
    align-items: center;
    position: relative;
    z-index: 1;
}
@media (max-width: 768px) {
    .pcl-hero-inner { grid-template-columns: 1fr; gap: 36px; text-align: center; justify-items: center; }
}
.pcl-hero-photo-wrap {
    position: relative;
    width: 320px;
    max-width: 100%;
}
/* Photo: NO round crop, NO red border — let the Power100 frame branding show.
   The frame is baked into the source image (red corner brackets + POWER100 wordmark).
   Subtle hairline + glow lift it from the dark hero without competing with the frame. */
.pcl-hero-photo {
    display: block;
    width: 100%;
    height: auto;
    box-shadow:
        0 0 0 1px rgba(251,4,1,.4),
        0 30px 70px rgba(251,4,1,.22),
        0 14px 36px rgba(0,0,0,.65);
}
/* Thin red accent below the photo — a small anchor for color balance */
.pcl-hero-photo-accent {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 22px;
    padding: 0 4px;
}
.pcl-hero-photo-accent::before {
    content: '';
    flex: 1;
    height: 1px;
    background: linear-gradient(to right, transparent, var(--p-red, #FB0401));
}
.pcl-hero-photo-accent::after {
    content: '';
    flex: 1;
    height: 1px;
    background: linear-gradient(to left, transparent, var(--p-red, #FB0401));
}
.pcl-hero-photo-accent span {
    font-family: var(--font-body, 'Poppins'), sans-serif;
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 3px;
    color: var(--p-red, #FB0401);
    white-space: nowrap;
}
.pcl-hero-photo-fallback {
    width: 100%;
    aspect-ratio: 1;
    background: linear-gradient(135deg, var(--p-red, #FB0401), #1a1a1a);
    display: flex;
    align-items: center;
    justify-content: center;
}
.pcl-hero-photo-fallback span {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 120px;
    font-weight: 900;
    color: #fff;
    line-height: 1;
}
.pcl-hero-content { display: flex; flex-direction: column; gap: 16px; }
/* Name row: rank inline with the name, centered vertically to the full two-line
   name block so the rank doesn't leave dead space above/below */
.pcl-hero-name-row {
    display: flex;
    align-items: center;
    gap: clamp(18px, 2.2vw, 32px);
}
@media (max-width: 768px) {
    .pcl-hero-name-row { justify-content: center; }
}
.pcl-rank-num {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: clamp(88px, 13vw, 168px);
    font-weight: 800;
    line-height: .82;
    color: var(--p-red, #FB0401);
    letter-spacing: -3px;
    flex-shrink: 0;
}
.pcl-hero-eyebrow {
    font-family: var(--font-body, 'Poppins'), sans-serif;
    font-size: 13px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 3px;
    color: var(--p-red, #FB0401);
}
.pcl-hero-name {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: clamp(48px, 7vw, 96px);
    font-weight: 800;
    line-height: .95;
    margin: 0;
    color: var(--p-white, #fff);
    text-transform: uppercase;
}
/* First name: transparent fill + red outline stroke.
   A pseudo-layer duplicates the text with a white stroke and sweeps across
   via an animated clip-path — reads as a shine traveling around the outline. */
.pcl-hero-name-first {
    position: relative;
    display: inline-block;
    color: transparent;
    -webkit-text-stroke: 2px var(--p-red, #FB0401);
    text-stroke: 2px var(--p-red, #FB0401);
}
.pcl-hero-name-first::after {
    content: attr(data-text);
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    color: transparent;
    -webkit-text-stroke: 2px #ffffff;
    text-stroke: 2px #ffffff;
    clip-path: polygon(-30% 0, -22% 0, -10% 100%, -30% 100%);
    animation: pcl-name-shine 4s ease-in-out infinite;
    pointer-events: none;
}
@keyframes pcl-name-shine {
    0%   { clip-path: polygon(-30% 0, -22% 0, -10% 100%, -30% 100%); }
    50%  { clip-path: polygon(115% 0, 122% 0, 130% 100%, 115% 100%); }
    100% { clip-path: polygon(115% 0, 122% 0, 130% 100%, 115% 100%); }
}
/* Last name: white fill with black outline — inverse of the first name treatment */
.pcl-hero-name-last {
    color: var(--p-white, #fff);
    -webkit-text-stroke: 2px #000000;
    text-stroke: 2px #000000;
}
/* Respect users who opt out of animations */
@media (prefers-reduced-motion: reduce) {
    .pcl-hero-name-first::after { animation: none; }
}
.pcl-hero-company {
    font-family: var(--font-body, 'Poppins'), sans-serif;
    font-size: 18px;
    font-weight: 500;
    color: rgba(255,255,255,.7);
    margin: 0;
}
.pcl-hero-salute {
    font-family: var(--font-body, 'Poppins'), sans-serif;
    font-size: clamp(18px, 2vw, 24px);
    font-weight: 600;
    color: var(--p-red, #FB0401);
    line-height: 1.3;
    margin: 8px 0 0;
}
.pcl-hero-links { display: flex; gap: 12px; margin-top: 8px; flex-wrap: wrap; }
.pcl-hero-links a {
    display: inline-flex;
    align-items: center;
    padding: 12px 24px;
    border: 1px solid rgba(255,255,255,.25);
    color: var(--p-white, #fff);
    text-decoration: none;
    font-family: var(--font-body, 'Poppins'), sans-serif;
    font-size: 13px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 2px;
    border-radius: 2px;
    transition: all .2s;
}
.pcl-hero-links a:hover {
    background: var(--p-red, #FB0401);
    border-color: var(--p-red, #FB0401);
}

/* Section base */
.pcl-section { padding: 80px 0; background: var(--p-white, #fff); }
.pcl-section--dark { background: var(--p-black, #000); color: var(--p-white, #fff); }
.pcl-section-inner { max-width: 1200px; margin: 0 auto; padding: 0 36px; }
.pcl-section-label {
    display: block;
    font-family: var(--font-body, 'Poppins'), sans-serif;
    font-size: 13px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 3px;
    color: var(--p-red, #FB0401);
    margin-bottom: 12px;
}
.pcl-section-headline {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: clamp(36px, 5vw, 64px);
    font-weight: 800;
    line-height: 1;
    margin: 0 0 40px;
    text-transform: uppercase;
}
.pcl-section--dark .pcl-section-headline { color: var(--p-white, #fff); }

/* Play button (used by all video cards) */
.pcl-play-btn {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 90px;
    height: 90px;
    background: var(--p-red, #FB0401);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 8px 32px rgba(251,4,1,.6);
    transition: transform .2s;
    pointer-events: none;
}
.pcl-play-btn svg { margin-left: 4px; }

/* Video reel — merged intro + grid, white editorial bg */
.pcl-section--reel { background: var(--p-white, #fff); }
.pcl-video-groups { margin-top: 40px; }
.pcl-video-group + .pcl-video-group { margin-top: 56px; }
.pcl-video-group-heading {
    display: flex;
    align-items: center;
    gap: 16px;
    margin: 0 0 24px;
    font-family: 'Poppins', sans-serif;
    font-size: 16px;
    font-weight: 700;
    letter-spacing: 1.2px;
    text-transform: uppercase;
    color: var(--p-black, #000);
}
.pcl-video-group-heading::before {
    content: '';
    width: 42px;
    height: 2px;
    background: var(--p-red, #FB0401);
    flex-shrink: 0;
}
.pcl-video-group-heading::after {
    content: '';
    flex: 1;
    height: 1px;
    background: rgba(0,0,0,.06);
}
.pcl-video-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 36px 28px;
}
@media (max-width: 768px) { .pcl-video-grid { grid-template-columns: 1fr; gap: 28px; } }
.pcl-video-item { display: flex; flex-direction: column; gap: 14px; }
.pcl-video-card {
    position: relative;
    aspect-ratio: 16/9;
    background: var(--p-black, #000);
    border-radius: 8px;
    overflow: hidden;
    cursor: pointer;
    box-shadow: 0 10px 30px rgba(0,0,0,.12);
    transition: transform .25s, box-shadow .25s;
}
.pcl-video-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 18px 40px rgba(0,0,0,.18);
}
.pcl-video-card img { width: 100%; height: 100%; object-fit: cover; transition: transform .4s, opacity .3s; }
.pcl-video-card:hover img { transform: scale(1.05); opacity: .9; }
.pcl-video-card .pcl-play-btn { width: 60px; height: 60px; }
.pcl-video-card .pcl-play-btn svg { width: 18px; height: 18px; }
.pcl-video-title {
    font-family: var(--font-body, 'Poppins'), sans-serif;
    font-size: 14px;
    font-weight: 600;
    line-height: 1.4;
    color: #2a2a2a;
    margin: 0;
    text-align: left;
}
/* Single-video fallback — lander has only the intro and no other videos.
   Render the lone video larger and centered instead of sparse 1/3-width */
.pcl-video-groups--single .pcl-video-grid {
    grid-template-columns: 1fr;
    max-width: 820px;
    margin-left: auto;
    margin-right: auto;
}
.pcl-video-groups--single .pcl-video-item { gap: 16px; }
/* Hide per-card title when it's the only video — the section headline
   "MEET [FirstName]" already labels it; the card title is redundant noise */
.pcl-video-groups--single .pcl-video-title { display: none; }
.pcl-video-groups--single .pcl-video-card .pcl-play-btn {
    width: 84px;
    height: 84px;
}
.pcl-video-groups--single .pcl-video-card .pcl-play-btn svg {
    width: 28px;
    height: 28px;
}

/* Snapshots — max 5 per row, wraps to new rows for landers with >5 snapshots */
.pcl-section--snapshots { background: #f5f5f5; }
.pcl-snapshots-grid {
    display: grid;
    /* For ≤5 snapshots: use actual count (row fills width).
       For >5 snapshots: fixed 5 columns, overflow wraps to new rows. */
    grid-template-columns: repeat(var(--pcl-snap-cols, 5), 1fr);
    gap: 18px;
    margin-top: 40px;
}
@media (max-width: 900px) {
    .pcl-snapshots-grid { grid-template-columns: repeat(3, 1fr); }
}
@media (max-width: 540px) {
    .pcl-snapshots-grid { grid-template-columns: repeat(2, 1fr); }
}
.pcl-snapshot {
    aspect-ratio: 4/3;
    overflow: hidden;
    border-radius: 6px;
    background: #e8e4e4;
    box-shadow: 0 8px 24px rgba(0,0,0,.08);
    transition: transform .25s, box-shadow .25s;
}
.pcl-snapshot:hover {
    transform: translateY(-3px);
    box-shadow: 0 14px 32px rgba(0,0,0,.12);
}
.pcl-snapshot img { width: 100%; height: 100%; object-fit: cover; transition: transform .4s; }
.pcl-snapshot:hover img { transform: scale(1.05); }

/* Bio block */
.pcl-bio { max-width: 820px; margin: 0 auto; }
/* Bio section needs a visual break when it directly follows the Meet section
   (white → white). The PHP template adds .pcl-section--bio-divided conditionally
   when there's no snapshots or quote between Meet and Bio. */
.pcl-section--bio-divided {
    position: relative;
    box-shadow: inset 0 1px 0 rgba(0,0,0,.08);
}
.pcl-section--bio-divided::before {
    content: '';
    position: absolute;
    left: 0; right: 0; top: 0;
    height: 1px;
    background: linear-gradient(to right, transparent 0%, rgba(251,4,1,.4) 30%, rgba(251,4,1,.4) 70%, transparent 100%);
    pointer-events: none;
}
.pcl-bio p {
    font-family: var(--font-body, 'Poppins'), sans-serif;
    font-size: 18px;
    line-height: 1.7;
    color: #222;
    margin: 0 0 24px;
}

/* About Us — distinct company section (separate from CEO bio).
   White section, grey card — inverts the usual treatment so the card reads
   as a "grounded well" on the white background. */
.pcl-section--about {
    background: var(--p-white, #fff);
}
.pcl-about-grid {
    display: grid;
    grid-template-columns: 1.6fr 1fr;
    gap: 48px;
    align-items: start;
    margin-top: 24px;
}
@media (max-width: 900px) {
    .pcl-about-grid { grid-template-columns: 1fr; gap: 32px; }
}
.pcl-about-prose p {
    font-family: var(--font-body, 'Poppins'), sans-serif;
    font-size: 17px;
    line-height: 1.75;
    color: #2a2a2a;
    margin: 0 0 20px;
}
.pcl-about-card {
    background: #f5f5f5;
    padding: 32px;
    border-radius: 8px;
    box-shadow: 0 12px 40px rgba(0,0,0,.06);
    border-left: 2px solid var(--p-red, #FB0401);
}
.pcl-about-company-name {
    font-family: 'Poppins', sans-serif;
    font-size: 22px;
    font-weight: 700;
    text-transform: uppercase;
    line-height: 1.2;
    margin: 0 0 12px;
    color: var(--p-black, #000);
    letter-spacing: -.3px;
}
.pcl-about-address {
    font-family: var(--font-body, 'Poppins'), sans-serif;
    font-size: 15px;
    line-height: 1.5;
    color: #555;
    margin: 0 0 24px;
    display: flex;
    align-items: flex-start;
    gap: 8px;
}
.pcl-about-address svg {
    flex-shrink: 0;
    margin-top: 2px;
    color: var(--p-red, #FB0401);
}
.pcl-rankings-block {
    border-top: 1px solid #eee;
    padding-top: 20px;
    margin-top: 4px;
}
.pcl-rankings-label {
    font-family: var(--font-body, 'Poppins'), sans-serif;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 2px;
    color: var(--p-red, #FB0401);
    margin: 0 0 12px;
}
.pcl-rankings-block p {
    margin: 0 0 8px;
    font-size: 15px;
    line-height: 1.4;
}
.pcl-rankings-block a {
    color: var(--p-black, #000);
    text-decoration: none;
    font-weight: 600;
    border-bottom: 2px solid transparent;
    transition: border-color .2s;
}
.pcl-rankings-block a:hover { border-bottom-color: var(--p-red, #FB0401); }

/* CEO Quote — tighter dark section with red glow halo */
.pcl-section--quote {
    background: #0a0a0a;
    color: var(--p-white, #fff);
    padding: 64px 0;
    position: relative;
    overflow: hidden;
    /* Red glow halo — inset around the edges so the section feels spotlit */
    box-shadow: inset 0 0 160px rgba(251,4,1,.18);
}
.pcl-section--quote::before {
    content: '';
    position: absolute;
    inset: 0;
    background:
        radial-gradient(ellipse at 30% 40%, rgba(251,4,1,.16) 0%, transparent 50%),
        radial-gradient(ellipse at 75% 60%, rgba(251,4,1,.12) 0%, transparent 50%);
    pointer-events: none;
}
/* Thin red rule at the top edge, fading in from sides */
.pcl-section--quote::after {
    content: '';
    position: absolute;
    left: 0; right: 0; top: 0;
    height: 1px;
    background: linear-gradient(to right, transparent 0%, rgba(251,4,1,.6) 30%, rgba(251,4,1,.6) 70%, transparent 100%);
    pointer-events: none;
}
.pcl-quote-inner {
    max-width: 820px;
    margin: 0 auto;
    padding: 0 36px;
    position: relative;
    text-align: center;
}
/* Matching bottom thin red rule — slightly wider than the cite block */
.pcl-quote-inner::after {
    content: '';
    display: block;
    width: 100%;
    max-width: 180px;
    height: 1px;
    background: linear-gradient(to right, transparent, var(--p-red, #FB0401), transparent);
    margin: 28px auto 0;
}
/* Filled serif quote glyph — thinner than Barlow 900 but still solid */
.pcl-quote-mark {
    display: block;
    font-family: Georgia, 'Times New Roman', serif;
    font-weight: 400;
    font-size: 96px;
    line-height: .6;
    color: var(--p-red, #FB0401);
    margin: 0 auto 8px;
    letter-spacing: -4px;
}
.pcl-quote-text {
    font-family: 'Poppins', sans-serif;
    font-style: italic;
    font-size: clamp(20px, 2.3vw, 30px);
    font-weight: 300;
    line-height: 1.5;
    color: var(--p-white, #fff);
    margin: 0 0 22px;
    letter-spacing: .2px;
}
.pcl-quote-cite {
    display: inline-flex;
    align-items: center;
    gap: 12px;
    font-family: var(--font-body, 'Poppins'), sans-serif;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 3px;
    color: var(--p-red, #FB0401);
}
.pcl-quote-cite::before {
    content: '';
    width: 28px;
    height: 1px;
    background: var(--p-red, #FB0401);
}

/* Customer Testimonials — 3-up card grid on neutral grey (after bio, before About Us) */
.pcl-section--testimonials {
    background: #f5f5f5;
    padding: 80px 0 140px;
    position: relative;
    overflow: hidden;
}
.pcl-section--testimonials .pcl-section-inner { text-align: center; position: relative; z-index: 1; }
.pcl-section--testimonials .pcl-section-label { margin-bottom: 12px; }

/* Slanted bottom — mirrors the hero divider but opposite direction:
   line slopes UP from left to right (low-left to high-right). */
.pcl-testimonials-divider {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    width: 100%;
    height: 80px;
    display: block;
    pointer-events: none;
    z-index: 2;
}
.pcl-testimonials-divider .pcl-testimonials-divider-fill { fill: #ffffff; }
.pcl-testimonials-divider .pcl-testimonials-divider-line {
    stroke: var(--p-red, #FB0401);
    stroke-width: 3;
    fill: none;
}

.pcl-testimonials-grid {
    display: grid;
    grid-template-columns: repeat(var(--pcl-testimonial-count, 3), 1fr);
    gap: 24px;
    margin-top: 24px;
    text-align: left;
}
@media (max-width: 900px) {
    .pcl-testimonials-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 600px) {
    .pcl-testimonials-grid { grid-template-columns: 1fr; }
}
.pcl-testimonial-card {
    background: var(--p-white, #fff);
    border-radius: 8px;
    padding: 26px 24px 22px;
    box-shadow: 0 8px 24px rgba(0,0,0,.06);
    border-top: 2px solid var(--p-red, #FB0401);
    display: flex;
    flex-direction: column;
    position: relative;
    transition: transform .25s, box-shadow .25s;
}
.pcl-testimonial-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 14px 32px rgba(0,0,0,.09);
}
.pcl-testimonial-quote-mark {
    display: block;
    font-family: Georgia, 'Times New Roman', serif;
    font-weight: 400;
    font-size: 56px;
    line-height: .6;
    color: var(--p-red, #FB0401);
    margin: 0 0 6px;
    letter-spacing: -3px;
    opacity: .75;
}
.pcl-testimonial-text {
    font-family: 'Poppins', sans-serif;
    font-style: italic;
    font-size: 14px;
    font-weight: 400;
    line-height: 1.55;
    color: #2a2a2a;
    margin: 0 0 18px;
    /* Contain long quotes to keep cards balanced — clamp to 8 lines max */
    display: -webkit-box;
    -webkit-line-clamp: 8;
    line-clamp: 8;
    -webkit-box-orient: vertical;
    overflow: hidden;
}
.pcl-testimonial-cite {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin-top: auto;
    padding-top: 14px;
    border-top: 1px solid rgba(0,0,0,.06);
}
.pcl-testimonial-name {
    font-family: 'Poppins', sans-serif;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: var(--p-red, #FB0401);
}
.pcl-testimonial-title {
    font-family: 'Poppins', sans-serif;
    font-size: 11px;
    font-weight: 400;
    color: #767271;
}

/* Footer */
.pcl-footer {
    background: var(--p-black, #000);
    color: rgba(255,255,255,.7);
    padding: 60px 0;
    text-align: center;
}
.pcl-footer a { color: var(--p-red, #FB0401); text-decoration: none; }
.pcl-footer a:hover { text-decoration: underline; }

/* Modal — handles all 3 video types */
.pcl-modal {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,.95);
    z-index: 9999;
    align-items: center;
    justify-content: center;
}
.pcl-modal.active { display: flex; }
.pcl-modal-inner {
    position: relative;
    width: 90%;
    max-width: 1200px;
    aspect-ratio: 16/9;
}
.pcl-modal-close {
    position: absolute;
    top: -50px;
    right: 0;
    background: none;
    border: none;
    color: #fff;
    font-size: 18px;
    cursor: pointer;
    padding: 8px 16px;
}
.pcl-modal-wrap {
    width: 100%;
    height: 100%;
    background: #000;
}
.pcl-modal-wrap iframe,
.pcl-modal-wrap video {
    width: 100%;
    height: 100%;
    border: none;
}
</style>
</head>
<body <?php body_class('pcl-page'); ?>>

<div class="pcl-page">

    <!-- ═══ PROGRAM INTRO — National Power Rankings ═══ -->
    <section class="pcl-intro">
        <?php
        // PHASE 2: Dynamic per-CEO background video selection.
        //
        // Priority order:
        //   1. Explicit override meta (pcl_intro_bg_yt_id / _start / _end)
        //      — set per CEO when you've picked the best 30-sec window
        //   2. First YouTube video auto-picked from the CEO's own video slots
        //      SKIPPING slot 1 (which is the intro video — every lander has that,
        //      we want a DIFFERENT video for the background to avoid redundancy)
        //   3. Power100 default highlight video — hardcoded site-wide fallback
        //
        // Window max: 30s. Auto-pick uses 0-30s of the source video.

        // Power100 default highlight — used when a CEO/partner lander has no
        // suitable content-level video beyond the intro.
        $POWER100_DEFAULT_YT_ID    = 'h4jvxN7SH6M';
        $POWER100_DEFAULT_YT_START = 1106;  // 18:26
        $POWER100_DEFAULT_YT_END   = 1136;  // 18:56

        // Step 1: explicit overrides
        $intro_bg_yt_id    = get_field('pcl_intro_bg_yt_id', $pid)    ?: get_post_meta($pid, 'pcl_intro_bg_yt_id', true);
        $intro_bg_yt_start = get_field('pcl_intro_bg_yt_start', $pid) ?: get_post_meta($pid, 'pcl_intro_bg_yt_start', true);
        $intro_bg_yt_end   = get_field('pcl_intro_bg_yt_end', $pid)   ?: get_post_meta($pid, 'pcl_intro_bg_yt_end', true);

        // Step 2: auto-pick first YouTube video from video slots 2..15 (skip slot 1 = intro)
        if (empty($intro_bg_yt_id)) {
            for ($__bg_i = 2; $__bg_i <= 15; $__bg_i++) {
                $__slot_url = get_field("pcl_video_{$__bg_i}_url", $pid) ?: get_post_meta($pid, "pcl_video_{$__bg_i}_url", true);
                if (!$__slot_url) continue;
                if (preg_match('/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/', $__slot_url, $__m)) {
                    $intro_bg_yt_id    = $__m[1];
                    $intro_bg_yt_start = 0;
                    $intro_bg_yt_end   = 30;
                    break;
                }
            }
        }

        // Step 3: Power100 default fallback
        if (empty($intro_bg_yt_id)) {
            $intro_bg_yt_id    = $POWER100_DEFAULT_YT_ID;
            $intro_bg_yt_start = $POWER100_DEFAULT_YT_START;
            $intro_bg_yt_end   = $POWER100_DEFAULT_YT_END;
        }

        // Normalize to ints with a sensible 30-sec default window
        $intro_bg_yt_start = max(0, (int) $intro_bg_yt_start);
        $intro_bg_yt_end   = (int) $intro_bg_yt_end;
        if ($intro_bg_yt_end <= $intro_bg_yt_start) {
            $intro_bg_yt_end = $intro_bg_yt_start + 30;
        }
        ?>
        <?php if ($intro_bg_yt_id) : ?>
        <div class="pcl-intro-yt-wrap"
             data-yt-id="<?php echo esc_attr($intro_bg_yt_id); ?>"
             data-yt-start="<?php echo esc_attr($intro_bg_yt_start); ?>"
             data-yt-end="<?php echo esc_attr($intro_bg_yt_end); ?>"
             aria-hidden="true">
            <div id="pcl-intro-yt-player"></div>
        </div>
        <?php endif; ?>
        <div class="pcl-intro-inner">
            <span class="pcl-intro-eyebrow">Power100 Presents</span>
            <h2 class="pcl-intro-title">National Power <span>Rankings</span></h2>
            <p class="pcl-intro-subtitle">Power100 wants to congratulate the top 100 listed below</p>
        </div>
        <svg class="pcl-intro-divider" viewBox="0 0 1200 48" preserveAspectRatio="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
            <!-- V-shaped bottom: dark intro dips to a point at center, red fills the V and the area below it -->
            <path class="pcl-intro-divider-fill" d="M0,0 L600,26 L1200,0 L1200,48 L0,48 Z"/>
        </svg>
    </section>
    <section class="pcl-intro-banner">
        <div class="pcl-intro-banner-inner">
            <p>It&rsquo;s quite a feat to get to this point as we have 7,600 qualified CEOs within our database through which our proprietary ranking system has placed these 100 men &amp; women in ranking position they are in today. Scroll below &amp; click <em>(if you dare)</em> in order to learn more about each leader.</p>
        </div>
    </section>

    <!-- ═══ HERO ═══ -->
    <section class="pcl-hero">
        <div class="pcl-hero-inner">
            <div class="pcl-hero-photo-wrap">
                <?php if ($headshot_url) : ?>
                <img class="pcl-hero-photo" src="<?php echo esc_url($headshot_url); ?>" alt="<?php echo esc_attr($ceo_name); ?>">
                <?php else : ?>
                <div class="pcl-hero-photo-fallback">
                    <span><?php echo esc_html(mb_substr($first_name, 0, 1)); ?></span>
                </div>
                <?php endif; ?>
                <div class="pcl-hero-photo-accent">
                    <span>Power Ranked CEO</span>
                </div>
            </div>
            <div class="pcl-hero-content">
                <span class="pcl-hero-eyebrow"><?php echo esc_html($rank_label); ?></span>
                <div class="pcl-hero-name-row">
                    <?php if ($rank_number) : ?>
                    <span class="pcl-rank-num">#<?php echo esc_html($rank_number); ?></span>
                    <?php endif; ?>
                    <h1 class="pcl-hero-name">
                        <span class="pcl-hero-name-first" data-text="<?php echo esc_attr(mb_strtoupper($first_name, 'UTF-8')); ?>"><?php echo esc_html($first_name); ?></span>
                        <?php if ($last_name) : ?><br><span class="pcl-hero-name-last"><?php echo esc_html($last_name); ?></span><?php endif; ?>
                    </h1>
                </div>
                <?php if ($company_name) : ?>
                <p class="pcl-hero-company"><?php echo esc_html($company_name); ?></p>
                <?php endif; ?>
                <?php if ($salute_text) : ?>
                <p class="pcl-hero-salute"><?php echo esc_html($salute_text); ?></p>
                <?php endif; ?>
                <div class="pcl-hero-links">
                    <?php if ($linkedin_url) : ?>
                    <a href="<?php echo esc_url($linkedin_url); ?>" target="_blank" rel="noopener">LinkedIn</a>
                    <?php endif; ?>
                </div>
            </div>
        </div>
        <svg class="pcl-hero-divider" viewBox="0 0 1200 80" preserveAspectRatio="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
            <!-- White fill below the diagonal — blends into the next (white) section -->
            <path class="pcl-hero-divider-fill" d="M0,20 L1200,70 L1200,80 L0,80 Z"/>
            <!-- Thin red line tracing the diagonal -->
            <path class="pcl-hero-divider-line" d="M0,20 L1200,70" vector-effect="non-scaling-stroke"/>
        </svg>
    </section>

    <!-- ═══ VIDEO REEL — all videos grouped by sub-category ═══ -->
    <?php
    // Group ALL videos (intro included) by their 'group' field, preserving order.
    // Empty/null group becomes the unlabeled first group (rendered without heading).
    $video_groups = array();
    $group_order = array();
    $total_rendered_videos = 0;
    foreach ($videos as $vid) {
        if (!$vid['url'] && !$vid['thumb']) continue;
        $g = isset($vid['group']) ? (string) $vid['group'] : '';
        if (!isset($video_groups[$g])) {
            $video_groups[$g] = array();
            $group_order[] = $g;
        }
        $video_groups[$g][] = $vid;
        $total_rendered_videos++;
    }
    // When the lander has only the intro video and nothing else, we render it
    // larger + centered instead of a sparse 1/3-width card in an empty row
    $is_single_video = $total_rendered_videos === 1;
    if (!empty($video_groups)) :
    ?>
    <section class="pcl-section pcl-section--reel">
        <div class="pcl-section-inner">
            <span class="pcl-section-label">Get To Know</span>
            <h2 class="pcl-section-headline">Meet <span style="color:var(--p-red, #FB0401);"><?php echo esc_html($first_name); ?></span></h2>
            <div class="pcl-video-groups<?php echo $is_single_video ? ' pcl-video-groups--single' : ''; ?>">
                <?php foreach ($group_order as $group_name) : $group_videos = $video_groups[$group_name]; ?>
                <div class="pcl-video-group">
                    <?php if ($group_name !== '') : ?>
                    <h3 class="pcl-video-group-heading"><?php echo esc_html($group_name); ?></h3>
                    <?php endif; ?>
                    <div class="pcl-video-grid">
                        <?php foreach ($group_videos as $vid) :
                            $vc = pcl_classify_video($vid['url']);
                        ?>
                        <div class="pcl-video-item">
                            <div class="pcl-video-card"
                                 data-video-type="<?php echo esc_attr($vc['type']); ?>"
                                 data-video-id="<?php echo esc_attr($vc['id'] ?? ''); ?>"
                                 data-video-url="<?php echo esc_attr($vid['url'] ?? ''); ?>">
                                <?php if (!empty($vid['thumb'])) : ?>
                                <img src="<?php echo esc_url($vid['thumb']); ?>" alt="<?php echo esc_attr($vid['title'] ?: 'Video'); ?>">
                                <?php endif; ?>
                                <div class="pcl-play-btn">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><polygon points="8,5 19,12 8,19"/></svg>
                                </div>
                            </div>
                            <?php if (!empty($vid['title'])) : ?>
                            <p class="pcl-video-title"><?php echo esc_html($vid['title']); ?></p>
                            <?php endif; ?>
                        </div>
                        <?php endforeach; ?>
                    </div>
                </div>
                <?php endforeach; ?>
            </div>
        </div>
    </section>
    <?php endif; ?>

    <!-- ═══ SNAPSHOTS GALLERY — max 5 per row, wraps for more ═══ -->
    <?php
    $snap_count = !empty($snapshots) ? count($snapshots) : 0;
    // Grid column count: actual count if ≤5 (so row fills), otherwise fixed at 5
    $snap_cols = max(1, min($snap_count, 5));
    if ($snap_count > 0) :
    ?>
    <section class="pcl-section pcl-section--snapshots">
        <div class="pcl-section-inner">
            <span class="pcl-section-label">Snapshots</span>
            <h2 class="pcl-section-headline">Behind The <span style="color:var(--p-red, #FB0401);">Scenes</span></h2>
            <div class="pcl-snapshots-grid" style="--pcl-snap-cols: <?php echo (int) $snap_cols; ?>;">
                <?php foreach ($snapshots as $snap_url) : ?>
                <div class="pcl-snapshot">
                    <img src="<?php echo esc_url($snap_url); ?>" alt="<?php echo esc_attr($ceo_name); ?>" loading="lazy">
                </div>
                <?php endforeach; ?>
            </div>
        </div>
    </section>
    <?php endif; ?>

    <!-- ═══ CEO QUOTE — dark dramatic break ═══ -->
    <?php if ($ceo_quote) : ?>
    <section class="pcl-section pcl-section--quote">
        <div class="pcl-quote-inner">
            <span class="pcl-quote-mark" aria-hidden="true">&ldquo;</span>
            <p class="pcl-quote-text"><?php echo esc_html($ceo_quote); ?></p>
            <?php if ($ceo_quote_cite) : ?>
            <span class="pcl-quote-cite"><?php echo esc_html($ceo_quote_cite); ?></span>
            <?php endif; ?>
        </div>
    </section>
    <?php endif; ?>

    <!-- ═══ BIO (CEO highlight reel) ═══ -->
    <?php if ($bio_body) : ?>
    <?php
        // When the Bio directly follows the Meet (Videos) section with nothing
        // in between (no snapshots, no quote), both are white and blend together.
        // Add a "floating" modifier that draws a subtle red top hairline to
        // create the visual break. The hairline is imperceptible when preceded
        // by a dark/grey section, and clean when preceded by white.
        $bio_needs_divider = empty($snapshots) && empty($ceo_quote);
    ?>
    <section class="pcl-section pcl-section--bio<?php echo $bio_needs_divider ? ' pcl-section--bio-divided' : ''; ?>">
        <div class="pcl-section-inner">
            <div class="pcl-bio">
                <span class="pcl-section-label">Highlight Reel</span>
                <h2 class="pcl-section-headline">About <?php echo esc_html($first_name); ?></h2>
                <div><?php echo wp_kses_post($bio_body); ?></div>
            </div>
        </div>
    </section>
    <?php endif; ?>

    <!-- ═══ CUSTOMER TESTIMONIALS — 3-up grid ═══ -->
    <?php
    // Cap visible to 3 cards for clean alignment; extras can be surfaced later
    $testimonials_grid = array_slice($testimonials, 0, 3);
    $t_count = count($testimonials_grid);
    if ($t_count > 0) :
    ?>
    <section class="pcl-section pcl-section--testimonials">
        <div class="pcl-section-inner">
            <span class="pcl-section-label">Customer Feedback</span>
            <h2 class="pcl-section-headline">In Their <span style="color:var(--p-red, #FB0401);">Words</span></h2>
            <div class="pcl-testimonials-grid" style="--pcl-testimonial-count: <?php echo (int) $t_count; ?>;">
                <?php foreach ($testimonials_grid as $t) : ?>
                <div class="pcl-testimonial-card">
                    <span class="pcl-testimonial-quote-mark" aria-hidden="true">&ldquo;</span>
                    <p class="pcl-testimonial-text"><?php echo esc_html($t['quote']); ?></p>
                    <div class="pcl-testimonial-cite">
                        <?php if ($t['name']) : ?>
                        <span class="pcl-testimonial-name"><?php echo esc_html($t['name']); ?></span>
                        <?php endif; ?>
                        <?php if ($t['title']) : ?>
                        <span class="pcl-testimonial-title"><?php echo esc_html($t['title']); ?></span>
                        <?php endif; ?>
                    </div>
                </div>
                <?php endforeach; ?>
            </div>
        </div>
        <svg class="pcl-testimonials-divider" viewBox="0 0 1200 80" preserveAspectRatio="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
            <!-- Fill below the diagonal — matches About Us bg (#f5f5f5) -->
            <path class="pcl-testimonials-divider-fill" d="M0,70 L1200,20 L1200,80 L0,80 Z"/>
            <!-- Thin red diagonal line — opposite slope from the hero divider -->
            <path class="pcl-testimonials-divider-line" d="M0,70 L1200,20" vector-effect="non-scaling-stroke"/>
        </svg>
    </section>
    <?php endif; ?>

    <!-- ═══ ABOUT US (company section — distinct from CEO bio) ═══ -->
    <?php if ($company_about || $company_address || $rankings_lists) : ?>
    <section class="pcl-section pcl-section--about">
        <div class="pcl-section-inner">
            <span class="pcl-section-label">About Us</span>
            <h2 class="pcl-section-headline">The<br><span style="color:var(--p-red, #FB0401);">Company</span></h2>
            <div class="pcl-about-grid">
                <div class="pcl-about-prose">
                    <?php if ($company_about) echo wp_kses_post($company_about); ?>
                </div>
                <aside class="pcl-about-card">
                    <?php if ($company_name) : ?>
                    <h3 class="pcl-about-company-name"><?php echo esc_html($company_name); ?></h3>
                    <?php endif; ?>
                    <?php if ($company_address) : ?>
                    <p class="pcl-about-address">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z"/></svg>
                        <span><?php echo esc_html($company_address); ?></span>
                    </p>
                    <?php endif; ?>
                    <?php if ($rankings_lists) : ?>
                    <div class="pcl-rankings-block">
                        <p class="pcl-rankings-label">Rankings &amp; Lists</p>
                        <?php echo wp_kses_post($rankings_lists); ?>
                    </div>
                    <?php endif; ?>
                </aside>
            </div>
        </div>
    </section>
    <?php endif; ?>

    <!-- ═══ FOOTER ═══ -->
    <footer class="pcl-footer">
        <div class="pcl-section-inner">
            <p style="margin: 0 0 16px;">Power100 — The nation's premier CEO ranking platform for the home improvement industry.</p>
            <p style="margin: 0;">
                <a href="<?php echo home_url('/power-rankings/'); ?>">Power Rankings</a> ·
                <a href="<?php echo home_url('/expert-contributors/'); ?>">Expert Contributors</a> ·
                <a href="<?php echo home_url('/about-us/'); ?>">About Power100</a>
            </p>
        </div>
    </footer>

</div>

<!-- Video Modal -->
<div class="pcl-modal" id="pcl-video-modal">
    <div class="pcl-modal-inner">
        <button class="pcl-modal-close">✕ Close</button>
        <div class="pcl-modal-wrap"></div>
    </div>
</div>

<script>
document.addEventListener('DOMContentLoaded', function() {
    var modal = document.getElementById('pcl-video-modal');
    var wrap = modal ? modal.querySelector('.pcl-modal-wrap') : null;
    var closeBtn = modal ? modal.querySelector('.pcl-modal-close') : null;

    function openVideo(type, id, url) {
        if (!modal || !wrap) return;
        var inner = '';
        if (type === 'youtube' && id) {
            inner = '<iframe src="https://www.youtube.com/embed/' + id + '?autoplay=1&rel=0" frameborder="0" allowfullscreen allow="autoplay; encrypted-media"></iframe>';
        } else if (type === 'vimeo' && id) {
            inner = '<iframe src="https://player.vimeo.com/video/' + id + '?autoplay=1" frameborder="0" allowfullscreen allow="autoplay; encrypted-media"></iframe>';
        } else if (type === 'hosted' && url) {
            inner = '<video src="' + url + '" controls autoplay></video>';
        } else {
            inner = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#fff;font-family:sans-serif">Video unavailable</div>';
        }
        wrap.innerHTML = inner;
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeVideo() {
        if (!modal || !wrap) return;
        modal.classList.remove('active');
        wrap.innerHTML = '';
        document.body.style.overflow = '';
    }

    document.querySelectorAll('.pcl-video-card').forEach(function(el) {
        el.addEventListener('click', function() {
            var type = this.getAttribute('data-video-type') || '';
            var id = this.getAttribute('data-video-id') || '';
            var url = this.getAttribute('data-video-url') || '';
            openVideo(type, id, url);
        });
    });

    if (closeBtn) closeBtn.addEventListener('click', closeVideo);
    if (modal) modal.addEventListener('click', function(e) {
        if (e.target === modal) closeVideo();
    });
});
</script>

<!-- Intro background: YouTube IFrame API player with custom loop window -->
<script>
(function() {
    var wrap = document.querySelector('.pcl-intro-yt-wrap');
    if (!wrap) return;
    var videoId  = wrap.getAttribute('data-yt-id');
    var startSec = parseInt(wrap.getAttribute('data-yt-start'), 10) || 0;
    var endSec   = parseInt(wrap.getAttribute('data-yt-end'), 10) || 0;
    if (!videoId || !endSec) return;

    // Load YouTube IFrame API once
    if (!window.YT || !window.YT.Player) {
        var tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(tag);
    }

    var player;
    var loopTimer;

    function initPlayer() {
        player = new YT.Player('pcl-intro-yt-player', {
            videoId: videoId,
            playerVars: {
                autoplay: 1,
                mute: 1,
                controls: 0,
                rel: 0,
                modestbranding: 1,
                playsinline: 1,
                start: startSec,
                iv_load_policy: 3,
                disablekb: 1,
                fs: 0,
                cc_load_policy: 0
            },
            events: {
                onReady: function(e) {
                    e.target.mute();
                    e.target.playVideo();
                },
                onStateChange: function(e) {
                    if (e.data === YT.PlayerState.PLAYING) {
                        if (loopTimer) clearInterval(loopTimer);
                        loopTimer = setInterval(function() {
                            if (!player || !player.getCurrentTime) return;
                            var t = player.getCurrentTime();
                            if (t >= endSec || t < startSec - 0.5) {
                                player.seekTo(startSec, true);
                            }
                        }, 200);
                    }
                }
            }
        });
    }

    // YT API calls a global onYouTubeIframeAPIReady when loaded
    if (window.YT && window.YT.Player) {
        initPlayer();
    } else {
        // Chain existing handler if one already exists on the page
        var prev = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = function() {
            if (typeof prev === 'function') prev();
            initPlayer();
        };
    }
})();
</script>

<?php wp_footer(); ?>
</body>
</html>
