<?php
/**
 * Template Part: Netflix-Style Content Card
 * Clean hook thumbnail + hover info card with slide-up panel & optional preview clip autoplay
 */
if (!defined('ABSPATH')) exit;

$post_id    = get_the_ID();
$pid        = $post_id;
$video_url  = get_post_meta($pid, 'ic_video_url', true);
$duration   = get_post_meta($pid, 'ic_duration', true);
$excerpt    = get_the_excerpt($pid);

$content_label = ic_get_content_label($pid);
$show_class    = ic_get_show_class($pid);

// Show name for badge
$shows = get_the_terms($pid, 'ic_show');
$show_name = (!empty($shows) && !is_wp_error($shows)) ? $shows[0]->name : $content_label;

// Pillars
$pillars = get_the_terms($pid, 'ic_pillar');
$pillar_name = (!empty($pillars) && !is_wp_error($pillars)) ? $pillars[0]->name : '';

// Company
$companies = get_the_terms($pid, 'ic_company');
$company_name = (!empty($companies) && !is_wp_error($companies)) ? $companies[0]->name : '';

// Speakers — filter to guest(s) only (non-Host)
$speaker_count = intval(get_post_meta($pid, 'ic_speakers', true));
$guests = array();
for ($si = 0; $si < $speaker_count; $si++) {
    $sn = get_post_meta($pid, "ic_speakers_{$si}_name", true);
    $st = get_post_meta($pid, "ic_speakers_{$si}_title", true);
    if ($sn && stripos($st, 'host') === false) {
        $guests[] = array('name' => $sn, 'title' => $st);
    }
}

// Takeaways (top 3)
$takeaway_count = intval(get_post_meta($pid, 'ic_takeaways', true));
$takeaways = array();
for ($ti = 0; $ti < min($takeaway_count, 3); $ti++) {
    $tt = get_post_meta($pid, "ic_takeaways_{$ti}_text", true);
    if ($tt) $takeaways[] = $tt;
}

// Thumbnail pipeline fields
$preview_clip_url = get_post_meta($pid, 'ic_preview_clip_url', true);
$has_preview      = !empty($preview_clip_url);

// Watch status
$watch_progress = 0;
if (is_user_logged_in()) {
    $history = ic_get_watch_history();
    if (isset($history[$pid])) {
        $watch_progress = isset($history[$pid]['progress']) ? intval($history[$pid]['progress']) : 100;
    }
}

// Thumbnail (prefer custom pipeline-generated, fall back to YouTube maxres)
$thumb = get_the_post_thumbnail_url($pid, 'large');
if (!$thumb && $video_url && preg_match('/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/', $video_url, $m)) {
    $thumb = 'https://img.youtube.com/vi/' . $m[1] . '/maxresdefault.jpg';
}
if (!$thumb && $video_url && preg_match('/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/', $video_url, $m)) {
    $thumb = 'https://img.youtube.com/vi/' . $m[1] . '/mqdefault.jpg';
}
?>

<a href="<?php the_permalink(); ?>"
   class="nfx-card<?php echo $has_preview ? ' has-preview' : ''; ?><?php echo !empty($nfx_rank) ? ' nfx-card--ranked' : ''; ?>"
   title="<?php the_title_attribute(); ?>"
   <?php if ($has_preview) : ?>data-preview-url="<?php echo esc_url($preview_clip_url); ?>"<?php endif; ?>>

    <?php if (!empty($nfx_rank)) : ?>
    <svg class="nfx-rank-svg" viewBox="0 0 200 200" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
      <text x="92" y="195" text-anchor="middle" class="nfx-rank-text"><?php echo intval($nfx_rank); ?></text>
    </svg>
    <?php endif; ?>

    <div class="nfx-card-thumb">
        <?php if ($thumb) : ?>
        <img src="<?php echo esc_url($thumb); ?>" alt="<?php the_title_attribute(); ?>" loading="lazy" class="nfx-card-img">
        <?php else : ?>
        <div class="nfx-card-placeholder">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="1.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        </div>
        <?php endif; ?>

        <?php if ($has_preview) : ?>
        <!-- Preview clip video (hidden until hover triggers) -->
        <video class="nfx-card-preview" muted playsinline loop preload="none" poster="<?php echo esc_url($thumb); ?>">
            <source src="<?php echo esc_url($preview_clip_url); ?>" type="video/mp4">
        </video>
        <?php endif; ?>

        <?php if ($duration) : ?>
        <span class="nfx-duration"><?php echo esc_html($duration); ?></span>
        <?php endif; ?>

        <?php if ($watch_progress > 0 && $watch_progress < 100) : ?>
        <div class="nfx-progress"><div class="nfx-progress-bar" style="width: <?php echo $watch_progress; ?>%;"></div></div>
        <?php endif; ?>
    </div>

    <!-- Hover info card — slides up from bottom -->
    <div class="nfx-hover-card">
        <div class="nfx-hover-inner">
            <?php if ($show_name) : ?>
            <div class="nfx-hover-badge"><?php echo esc_html(strtoupper($show_name)); ?></div>
            <?php endif; ?>

            <h3 class="nfx-hover-title"><?php echo esc_html(get_the_title($pid)); ?></h3>

            <?php if (!empty($guests)) : ?>
            <div class="nfx-hover-guests">
                <?php foreach ($guests as $i => $g) : ?>
                    <?php if ($i > 0) echo ' &middot; '; ?>
                    <span class="nfx-guest-name"><?php echo esc_html($g['name']); ?></span>
                    <?php if (!empty($g['title'])) : ?>
                        <span class="nfx-guest-title">, <?php echo esc_html($g['title']); ?></span>
                    <?php endif; ?>
                <?php endforeach; ?>
            </div>
            <?php endif; ?>

            <div class="nfx-hover-meta">
                <?php if ($duration) : ?>
                <span class="nfx-hover-meta-item"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> <?php echo esc_html($duration); ?></span>
                <?php endif; ?>
                <?php if ($pillar_name) : ?>
                <span class="nfx-hover-meta-item nfx-hover-pillar"><?php echo esc_html($pillar_name); ?></span>
                <?php endif; ?>
                <?php if ($company_name) : ?>
                <span class="nfx-hover-meta-item nfx-hover-company"><?php echo esc_html($company_name); ?></span>
                <?php endif; ?>
            </div>

            <?php if ($excerpt) : ?>
            <p class="nfx-hover-excerpt"><?php echo esc_html(wp_trim_words($excerpt, 24, '...')); ?></p>
            <?php endif; ?>

            <?php if (!empty($takeaways)) : ?>
            <ul class="nfx-hover-takeaways">
                <?php foreach ($takeaways as $t) : ?>
                <li><?php echo esc_html($t); ?></li>
                <?php endforeach; ?>
            </ul>
            <?php endif; ?>

            <?php $is_article = (get_post_type($pid) === 'ic_article'); ?>
            <div class="nfx-hover-cta">
                <?php if ($is_article): ?>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.11 0 2-.9 2-2V5c0-1.1-.89-2-2-2zM7 7h10v2H7V7zm0 4h10v2H7v-2zm0 4h7v2H7v-2z"/></svg>
                <span>Read Article</span>
                <?php else: ?>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                <span>Watch Now</span>
                <?php endif; ?>
            </div>
        </div>
    </div>
</a>
