<?php
/**
 * Template Name: Expert Contributors Directory
 *
 * Directory page listing all Expert Contributors. Pulls every published page
 * assigned to the singular `page-expert-contributor.php` template, then reads
 * ACF meta (`ec_name`, `ec_title_position`, `ec_headshot`) to render the grid.
 *
 * Built against docs/P100-DESIGN-SYSTEM.md:
 *   - Dark intro header with YouTube bg video + red eyebrow + big title
 *   - §5.2b pinch V-divider between dark intro and grey directory section
 *   - Full-Width Band Rule: outer 100% + inner max-width
 *   - Scoped `.ec-dir-*` class prefix to avoid any collision with the existing
 *     singular EC lander or legacy `.ec-directory-wrap` rules.
 *
 * Self-contained (Elementor Canvas equivalent). Bypasses GeneratePress wrapper.
 */

// ── Dequeue the default theme frame ─────────────────────────────────────────
add_action('wp_enqueue_scripts', function() {
    wp_dequeue_style('generate-style');
    wp_dequeue_style('generatepress');
    wp_dequeue_style('generate-main');
}, 100);

// ── Query all EC lander pages ───────────────────────────────────────────────
$ec_query = new WP_Query(array(
    'post_type'      => 'page',
    'post_status'    => 'publish',
    'posts_per_page' => 500,
    'meta_query'     => array(
        array(
            'key'   => '_wp_page_template',
            'value' => 'page-expert-contributor.php',
        ),
    ),
    // Order by a simple rank meta when present; fall back to title.
    'orderby'        => array('menu_order' => 'ASC', 'title' => 'ASC'),
    'no_found_rows'  => true,
));

// Collect contributors into a simple array we can iterate cleanly.
$contributors = array();
if ($ec_query->have_posts()) {
    while ($ec_query->have_posts()) {
        $ec_query->the_post();
        $pid = get_the_ID();

        // ACF-safe reads (function_exists guard so the file still renders if ACF
        // is temporarily unavailable — falls back to post_meta).
        if (function_exists('get_field')) {
            $name          = get_field('ec_name', $pid);
            $title_pos     = get_field('ec_title_position', $pid);
            $headshot      = get_field('ec_headshot', $pid);
            $rank_status   = get_field('ec_rank_status', $pid);
            $rank_number   = get_field('ec_rank_number', $pid);
            $ctype_legacy  = get_field('ec_contributor_type', $pid);
        } else {
            $name          = get_post_meta($pid, 'ec_name', true);
            $title_pos     = get_post_meta($pid, 'ec_title_position', true);
            $headshot      = get_post_meta($pid, 'ec_headshot', true);
            $rank_status   = get_post_meta($pid, 'ec_rank_status', true);
            $rank_number   = get_post_meta($pid, 'ec_rank_number', true);
            $ctype_legacy  = get_post_meta($pid, 'ec_contributor_type', true);
        }
        // EC badge fires for the legacy paid-EC values (ranked_ceo/ranked_partner/industry_leader on
        // the OLD mixed enum) — those rows correspond to contributor_class=expert_contributor.
        $is_paid_ec = in_array($ctype_legacy, array('ranked_ceo', 'ranked_partner', 'industry_leader'), true);

        // Resolve headshot URL — ACF may return an ID, an array, or a URL.
        $headshot_url = '';
        if (is_array($headshot) && !empty($headshot['url'])) {
            $headshot_url = $headshot['url'];
        } elseif (is_numeric($headshot)) {
            $headshot_url = wp_get_attachment_image_url((int) $headshot, 'medium');
        } elseif (is_string($headshot) && $headshot !== '') {
            $headshot_url = $headshot;
        }

        $display_name = $name ?: get_the_title();

        // Build simple initials fallback for broken images.
        $initials = '';
        $parts = preg_split('/\s+/', trim(wp_strip_all_tags($display_name)));
        foreach ($parts as $p) {
            if ($p !== '' && ctype_alpha(mb_substr($p, 0, 1))) {
                $initials .= mb_strtoupper(mb_substr($p, 0, 1));
                if (mb_strlen($initials) >= 2) break;
            }
        }

        $contributors[] = array(
            'id'          => $pid,
            'name'        => $display_name,
            'title_pos'   => $title_pos,
            'headshot'    => $headshot_url,
            'initials'    => $initials,
            'permalink'   => get_permalink($pid),
            'rank_status' => $rank_status,
            'rank_number' => $rank_number ? (int) $rank_number : null,
            'is_paid_ec'  => $is_paid_ec,
        );
    }
    wp_reset_postdata();
}

// TODO: wire to live TPE `expert_contributors` table via REST once the public
// endpoint exists. For now the WP_Query above is the canonical source because
// every EC has a published lander in WP.

// ── Background video (same default used across P100 dark heroes) ────────────
$bg_yt_id    = 'h4jvxN7SH6M';
$bg_yt_start = 1106;
$bg_yt_end   = 1136;
?><!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
<meta charset="<?php bloginfo('charset'); ?>">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,600&family=Barlow+Condensed:wght@600;700;800;900&display=swap" rel="stylesheet">
<?php wp_head(); ?>
<style>
/* ============================================================================
   EXPERT CONTRIBUTORS DIRECTORY — scoped .ec-dir-* prefix
   ============================================================================ */
:root {
    --p-red:        #FB0401;
    --p-red-dark:   #E50504;
    --p-green:      #00B05D;
    --p-green-dark: #009951;
    --p-black:      #000;
    --p-white:      #fff;
    --p-dark:       #0A0A0A;
    --p-grey-bg:    #f5f5f5;
    --p-text:       #222;
}
*, *::before, *::after { box-sizing: border-box; }
body {
    margin: 0;
    font-family: 'Poppins', sans-serif;
    background: var(--p-white);
    color: var(--p-text);
    line-height: 1.5;
}

/* ── Intro (dark with YouTube bg video) ── */
.ec-dir-intro {
    background: var(--p-dark);
    color: var(--p-white);
    padding: 90px 0 86px;
    position: relative;
    overflow: hidden;
    text-align: center;
}
.ec-dir-intro-yt-wrap {
    position: absolute; top: 0; left: 0; width: 100%; height: 100%;
    overflow: hidden; z-index: 0; pointer-events: none; opacity: .65; background: #000;
}
.ec-dir-intro-yt-wrap iframe, .ec-dir-intro-yt-wrap #ec-dir-yt-player {
    position: absolute; top: 50%; left: 50%;
    width: 100vw; height: 56.25vw; min-width: 100%; min-height: 100%;
    transform: translate(-50%, -38%); border: 0; pointer-events: none;
}
.ec-dir-intro::before {
    content: ''; position: absolute; inset: 0; z-index: 1; pointer-events: none;
    background:
        radial-gradient(ellipse at 50% 100%, rgba(251,4,1,.22), transparent 55%),
        radial-gradient(ellipse at 50% 0%,   rgba(251,4,1,.08), transparent 45%),
        linear-gradient(to bottom, rgba(0,0,0,.55), rgba(0,0,0,.35) 50%, rgba(0,0,0,.55));
}
.ec-dir-intro-inner {
    max-width: 1500px; margin: 0 auto; padding: 0 48px;
    position: relative; z-index: 2;
}
.ec-dir-eyebrow {
    display: inline-block;
    font-size: 12px; font-weight: 600; text-transform: uppercase;
    letter-spacing: 4px; color: var(--p-red);
    margin: 0 0 16px;
}
.ec-dir-intro-title {
    font-family: 'Poppins', sans-serif;
    font-size: clamp(40px, 5.4vw, 72px);
    font-weight: 800; line-height: 1.05; text-transform: uppercase;
    color: var(--p-white); margin: 0 0 18px; letter-spacing: -.5px;
    white-space: nowrap;
}
.ec-dir-intro-title span { color: var(--p-red); }
.ec-dir-intro-subtitle {
    font-size: clamp(18px, 1.55vw, 22px); font-weight: 600;
    color: rgba(255,255,255,.9); max-width: 900px; margin: 0 auto;
}

/* ── §5.2b Pinch V-divider between dark intro and grey grid ── */
.ec-dir-pinch-v { display: block; width: 100%; height: 28px; margin: 0; padding: 0; }
.ec-dir-pinch-v svg { display: block; width: 100%; height: 100%; }

/* ── Grid section (grey, full-width band + inner container) ── */
.ec-dir-grid-wrap {
    background: var(--p-grey-bg);
    width: 100%;
}
.ec-dir-grid-inner {
    max-width: 1434px;
    margin: 0 auto;
    padding: 72px 48px 96px;
}

/* ── Grid ── */
.ec-dir-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 28px 20px;
}
@media (max-width: 1200px) { .ec-dir-grid { grid-template-columns: repeat(4, 1fr); } }
@media (max-width: 900px)  { .ec-dir-grid { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 600px)  { .ec-dir-grid { grid-template-columns: repeat(2, 1fr); gap: 20px 12px; } }

/* ── Card ── */
.ec-dir-card {
    display: flex; flex-direction: column; align-items: center;
    text-decoration: none; color: inherit;
    background: var(--p-white);
    border-radius: 12px;
    padding: 28px 16px 22px;
    border: 1px solid rgba(0,0,0,.06);
    box-shadow: 0 2px 6px rgba(0,0,0,.04);
    transition: transform .3s cubic-bezier(.4,0,.2,1),
                box-shadow .3s ease,
                border-color .3s ease;
    min-width: 0;
    text-align: center;
}
.ec-dir-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 28px rgba(0,0,0,.10);
    border-color: rgba(251,4,1,.25);
}

/* ── Photo ── */
.ec-dir-photo-wrap {
    width: 128px; height: 128px; border-radius: 50%;
    overflow: hidden;
    background: #ededed;
    border: 3px solid #e5e5e5;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    transition: border-color .3s ease, box-shadow .3s ease;
    position: relative;
}

/* ── Two-axis badges (locked 2026-04-30 — see memory/reference_two_axis_contributor_model.md) ──
   - .ec-dir-badge--rank (CEO or Partner) renders top-left, fires on ec_rank_status presence
   - .ec-dir-badge--ec renders top-right, fires on contributor_class=expert_contributor
   They are INDEPENDENT — a person can have both, either, or neither.
*/
.ec-dir-badge {
    position: absolute;
    z-index: 2;
    font-family: 'Poppins', sans-serif;
    font-weight: 800;
    line-height: 1;
    letter-spacing: 0.3px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.18);
    color: #fff;
    text-align: center;
    user-select: none;
}
.ec-dir-badge--rank {
    top: -4px; left: -6px;
    width: 44px; height: 44px;
    border-radius: 50%;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    border: 2px solid #fff;
    padding-top: 1px;
}
.ec-dir-badge--rank .ec-dir-badge-num { font-size: 13px; font-weight: 900; }
.ec-dir-badge--rank .ec-dir-badge-lbl { font-size: 8px; font-weight: 700; text-transform: uppercase; margin-top: 1px; opacity: 0.95; }
.ec-dir-badge--ceo     { background: linear-gradient(135deg, #FB0401, #B00301); }
.ec-dir-badge--partner { background: linear-gradient(135deg, #00B05D, #008045); }
.ec-dir-badge--ec {
    top: -4px; right: -6px;
    padding: 5px 8px;
    border-radius: 10px;
    font-size: 10px;
    background: linear-gradient(135deg, #1f1f1f, #000);
    border: 1.5px solid #fff;
}
.ec-dir-card:hover .ec-dir-photo-wrap {
    border-color: var(--p-red);
    box-shadow: 0 6px 22px rgba(251,4,1,.18);
}
.ec-dir-photo-wrap img {
    width: 100%; height: 100%; object-fit: cover; display: block;
    transition: transform .35s ease;
}
.ec-dir-card:hover .ec-dir-photo-wrap img { transform: scale(1.06); }
.ec-dir-initials {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 40px; font-weight: 800;
    color: #7a7a7a; letter-spacing: 1px; user-select: none;
}

/* ── Name & title-position ── */
.ec-dir-name {
    margin-top: 18px;
    font-family: 'Poppins', sans-serif;
    font-size: 16px; font-weight: 700;
    color: var(--p-black);
    line-height: 1.3;
    letter-spacing: .1px;
}
.ec-dir-title {
    margin-top: 6px;
    font-family: 'Poppins', sans-serif;
    font-size: 12.5px; font-weight: 400;
    color: #555;
    line-height: 1.5;
    max-width: 190px;
    /* Clamp to 3 lines so long company/title lines don't blow out the card. */
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
}
.ec-dir-card:hover .ec-dir-title { color: #333; }

/* ── Empty state ── */
.ec-dir-empty {
    grid-column: 1 / -1;
    text-align: center;
    padding: 80px 24px;
    color: #888;
    font-size: 16px;
}

/* ── CTA footer (Become an Expert Contributor) ── */
.ec-dir-cta {
    background: var(--p-dark);
    color: var(--p-white);
    width: 100%;
}
.ec-dir-cta-inner {
    max-width: 900px;
    margin: 0 auto;
    padding: 72px 32px 80px;
    text-align: center;
}
.ec-dir-cta-title {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 46px; font-weight: 800; line-height: 1.1;
    margin: 0 0 14px;
    text-transform: uppercase;
}
.ec-dir-cta-divider {
    height: 3px; width: 80px;
    background: var(--p-red);
    margin: 0 auto 22px;
    border-radius: 2px;
}
.ec-dir-cta-text {
    font-size: 18px; font-weight: 400;
    color: rgba(255,255,255,.82);
    max-width: 620px; margin: 0 auto 30px;
    line-height: 1.55;
}
.ec-dir-cta-btn {
    display: inline-block;
    background: var(--p-green);
    color: var(--p-white) !important;
    text-decoration: none;
    font-size: 20px; font-weight: 600;
    padding: 16px 36px;
    border-radius: 6px;
    transition: background .2s ease, transform .15s ease;
}
.ec-dir-cta-btn:hover {
    background: var(--p-green-dark);
    transform: translateY(-1px);
}
.ec-dir-cta-btn .ec-dir-chev { margin-left: 8px; font-weight: 700; }

/* ── Responsive overrides ── */
@media (max-width: 900px) {
    .ec-dir-intro { padding: 72px 0 68px; }
    .ec-dir-intro-title { white-space: normal; }
    .ec-dir-grid-inner { padding: 56px 24px 72px; }
    .ec-dir-cta-title { font-size: 36px; }
}
</style>
</head>
<body>

<!-- ═══ INTRO ═══ -->
<section class="ec-dir-intro">
    <div class="ec-dir-intro-yt-wrap"
         data-yt-id="<?php echo esc_attr($bg_yt_id); ?>"
         data-yt-start="<?php echo (int) $bg_yt_start; ?>"
         data-yt-end="<?php echo (int) $bg_yt_end; ?>"
         aria-hidden="true">
        <div id="ec-dir-yt-player"></div>
    </div>
    <div class="ec-dir-intro-inner">
        <span class="ec-dir-eyebrow">The Power 100</span>
        <h1 class="ec-dir-intro-title">Expert <span>Contributors</span></h1>
        <p class="ec-dir-intro-subtitle">The most influential leaders, operators, and innovators in home improvement &mdash; sharing real insight from real experience.</p>
    </div>
</section>

<!-- ═══ §5.2b PINCH V-DIVIDER (dark → grey) ═══ -->
<div class="ec-dir-pinch-v" aria-hidden="true">
    <svg viewBox="0 0 1200 28" preserveAspectRatio="none">
        <path fill="#0A0A0A" d="M0,0 L1200,0 L600,14 Z"/>
        <path fill="#FB0401" d="M0,0 L600,14 L1200,0 L1200,28 L600,14 L0,28 Z"/>
        <path fill="#f5f5f5" d="M0,28 L1200,28 L600,14 Z"/>
    </svg>
</div>

<!-- ═══ DIRECTORY GRID ═══ -->
<section class="ec-dir-grid-wrap">
    <div class="ec-dir-grid-inner">
        <div class="ec-dir-grid">
            <?php if (empty($contributors)) : ?>
                <div class="ec-dir-empty">
                    Our Expert Contributor roster is being published. Check back soon.
                </div>
            <?php else : foreach ($contributors as $c) : ?>
                <a class="ec-dir-card" href="<?php echo esc_url($c['permalink']); ?>">
                    <div class="ec-dir-photo-wrap">
                        <?php if (!empty($c['headshot'])) : ?>
                            <img src="<?php echo esc_url($c['headshot']); ?>"
                                 alt="<?php echo esc_attr($c['name']); ?>"
                                 loading="lazy"
                                 onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
                            <span class="ec-dir-initials" style="display:none;"><?php echo esc_html($c['initials']); ?></span>
                        <?php else : ?>
                            <span class="ec-dir-initials"><?php echo esc_html($c['initials']); ?></span>
                        <?php endif; ?>
                        <?php if (!empty($c['rank_status']) && !empty($c['rank_number'])) :
                            $is_ceo = ($c['rank_status'] === 'ranked_ceo'); ?>
                            <span class="ec-dir-badge ec-dir-badge--rank ec-dir-badge--<?php echo $is_ceo ? 'ceo' : 'partner'; ?>">
                                <span class="ec-dir-badge-num">#<?php echo (int) $c['rank_number']; ?></span>
                                <span class="ec-dir-badge-lbl"><?php echo $is_ceo ? 'CEO' : 'Partner'; ?></span>
                            </span>
                        <?php endif; ?>
                        <?php if (!empty($c['is_paid_ec'])) : ?>
                            <span class="ec-dir-badge ec-dir-badge--ec" title="Power100 Expert Contributor">EC</span>
                        <?php endif; ?>
                    </div>
                    <span class="ec-dir-name"><?php echo esc_html($c['name']); ?></span>
                    <?php if (!empty($c['title_pos'])) : ?>
                        <span class="ec-dir-title"><?php echo esc_html($c['title_pos']); ?></span>
                    <?php endif; ?>
                </a>
            <?php endforeach; endif; ?>
        </div>
    </div>
</section>

<!-- ═══ CTA FOOTER — Become an Expert Contributor ═══ -->
<section class="ec-dir-cta">
    <div class="ec-dir-cta-inner">
        <h2 class="ec-dir-cta-title">Become an Expert Contributor</h2>
        <div class="ec-dir-cta-divider" aria-hidden="true"></div>
        <p class="ec-dir-cta-text">Join the most trusted voices in the home improvement industry. Share your insight with the CEOs, operators, and contractors shaping what&rsquo;s next.</p>
        <a class="ec-dir-cta-btn" href="<?php echo esc_url(home_url('/become-an-expert-contributor/')); ?>">
            Apply Now <span class="ec-dir-chev">&raquo;</span>
        </a>
    </div>
</section>

<!-- ═══ YouTube IFrame API — autoplay + loop the intro bg video ═══ -->
<script>
(function() {
    var wrap = document.querySelector('.ec-dir-intro-yt-wrap');
    if (!wrap) return;
    var videoId  = wrap.getAttribute('data-yt-id');
    var startSec = parseInt(wrap.getAttribute('data-yt-start'), 10) || 0;
    var endSec   = parseInt(wrap.getAttribute('data-yt-end'), 10) || 0;
    if (!videoId || !endSec) return;
    if (!window.YT || !window.YT.Player) {
        var tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(tag);
    }
    function initPlayer() {
        new YT.Player('ec-dir-yt-player', {
            videoId: videoId,
            playerVars: { autoplay: 1, mute: 1, controls: 0, modestbranding: 1, playsinline: 1, rel: 0, iv_load_policy: 3, start: startSec, end: endSec },
            events: {
                onReady: function(e) {
                    e.target.mute();
                    e.target.playVideo();
                    setInterval(function() {
                        var t = e.target.getCurrentTime();
                        if (t < startSec - 1 || t > endSec - 0.2) e.target.seekTo(startSec, true);
                    }, 500);
                },
                onStateChange: function(e) {
                    if (e.data === YT.PlayerState.ENDED) e.target.seekTo(startSec, true);
                }
            }
        });
    }
    if (window.YT && window.YT.Player) initPlayer();
    else {
        var prev = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = function() { if (typeof prev === 'function') prev(); initPlayer(); };
    }
})();
</script>

<?php wp_footer(); ?>
</body>
</html>
