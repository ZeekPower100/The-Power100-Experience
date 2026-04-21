<?php
// Dumps all ic_content posts (publish) with their title, excerpt, pillar/function
// terms, and AI takeaways/timestamps from ACF meta. One JSON-line per post.
// Run: ssh runcloud@... "cd /home/runcloud/webapps/innercircle && wp eval-file /tmp/ic-post-dump.php"

$posts = get_posts(array(
    'post_type'      => 'ic_content',
    'post_status'    => 'publish',
    'posts_per_page' => -1,
    'fields'         => 'ids',
));

foreach ($posts as $post_id) {
    $pillars   = wp_get_object_terms($post_id, 'ic_pillar',   array('fields' => 'slugs'));
    $functions = wp_get_object_terms($post_id, 'ic_function', array('fields' => 'slugs'));

    $takeaways = array();
    $tcount = (int) get_post_meta($post_id, 'ic_takeaways', true);
    for ($i = 0; $i < $tcount; $i++) {
        $t = get_post_meta($post_id, "ic_takeaways_{$i}_text", true);
        if ($t) $takeaways[] = $t;
    }

    $timestamps = array();
    $tscount = (int) get_post_meta($post_id, 'ic_timestamps', true);
    for ($i = 0; $i < $tscount; $i++) {
        $lbl = get_post_meta($post_id, "ic_timestamps_{$i}_label", true);
        $desc = get_post_meta($post_id, "ic_timestamps_{$i}_description", true);
        if ($lbl || $desc) {
            $timestamps[] = trim($lbl . ($desc ? ' — ' . $desc : ''));
        }
    }

    $speakers = array();
    $scount = (int) get_post_meta($post_id, 'ic_speakers', true);
    for ($i = 0; $i < $scount; $i++) {
        $n = get_post_meta($post_id, "ic_speakers_{$i}_name", true);
        $t = get_post_meta($post_id, "ic_speakers_{$i}_title", true);
        if ($n) $speakers[] = trim($n . ($t ? ' (' . $t . ')' : ''));
    }

    echo json_encode(array(
        'id'         => $post_id,
        'title'      => get_the_title($post_id),
        'excerpt'    => wp_strip_all_tags(get_the_excerpt($post_id)),
        'pillar_slugs'   => array_values(is_wp_error($pillars)   ? array() : $pillars),
        'function_slugs' => array_values(is_wp_error($functions) ? array() : $functions),
        'takeaways'  => $takeaways,
        'timestamps' => array_slice($timestamps, 0, 10),
        'speakers'   => $speakers,
        'hook'       => get_post_meta($post_id, 'ic_hook_text', true),
    ), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . "\n";
}
