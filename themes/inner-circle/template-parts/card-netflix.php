<?php
/**
 * Template Part: Netflix-Style Content Card
 * Title and badges overlay on thumbnail — like Netflix
 */
if (!defined('ABSPATH')) exit;

$post_id    = get_the_ID();
$pid        = $post_id;
$video_url  = get_post_meta($pid, 'ic_video_url', true);
$duration   = get_post_meta($pid, 'ic_duration', true);

$content_label = ic_get_content_label($pid);
$show_class    = ic_get_show_class($pid);

$pillars = get_the_terms($pid, 'ic_pillar');
$pillar_name = (!empty($pillars) && !is_wp_error($pillars)) ? $pillars[0]->name : '';

// Speakers via direct meta
$speaker_count = intval(get_post_meta($pid, 'ic_speakers', true));
$speaker_names = array();
for ($si = 0; $si < min($speaker_count, 3); $si++) {
    $sn = get_post_meta($pid, "ic_speakers_{$si}_name", true);
    if ($sn) $speaker_names[] = $sn;
}

// Watch status
$watch_progress = 0;
if (is_user_logged_in()) {
    $history = ic_get_watch_history();
    if (isset($history[$pid])) {
        $watch_progress = isset($history[$pid]['progress']) ? intval($history[$pid]['progress']) : 100;
    }
}

// Thumbnail
$thumb = get_the_post_thumbnail_url($pid, 'large');
if (!$thumb && $video_url && preg_match('/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/', $video_url, $m)) {
    $thumb = 'https://img.youtube.com/vi/' . $m[1] . '/maxresdefault.jpg';
}
if (!$thumb && $video_url && preg_match('/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/', $video_url, $m)) {
    $thumb = 'https://img.youtube.com/vi/' . $m[1] . '/mqdefault.jpg';
}
?>

<a href="<?php the_permalink(); ?>" class="nfx-card" title="<?php the_title_attribute(); ?>">
    <div class="nfx-card-thumb">
        <?php if ($thumb) : ?>
        <img src="<?php echo esc_url($thumb); ?>" alt="<?php the_title_attribute(); ?>" loading="lazy">
        <?php else : ?>
        <div class="nfx-card-placeholder">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="1.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        </div>
        <?php endif; ?>

        <!-- Gradient overlay for text readability -->
        <div class="nfx-card-overlay"></div>

        <!-- Title only — clean Netflix style -->
        <div class="nfx-card-text">
            <h4 class="nfx-card-title"><?php the_title(); ?></h4>
        </div>

        <?php if ($duration) : ?>
        <span class="nfx-duration"><?php echo esc_html($duration); ?></span>
        <?php endif; ?>

        <?php if ($watch_progress > 0 && $watch_progress < 100) : ?>
        <div class="nfx-progress"><div class="nfx-progress-bar" style="width: <?php echo $watch_progress; ?>%;"></div></div>
        <?php endif; ?>
    </div>
</a>
