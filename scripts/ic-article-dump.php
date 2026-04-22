<?php
// Dump all ic_article posts (publish) with title + excerpt + first ~2400 chars
// of body. Used by backfill-ic-article-taxonomy.js for AI classification.
//
// Run via: wp eval-file /tmp/ic-article-dump.php > /tmp/ic-articles-dump.jsonl

$posts = get_posts(array(
    'post_type'      => 'ic_article',
    'post_status'    => 'publish',
    'posts_per_page' => -1,
    'fields'         => 'ids',
));

foreach ($posts as $post_id) {
    $pillars   = wp_get_object_terms($post_id, 'ic_pillar',   array('fields' => 'slugs'));
    $functions = wp_get_object_terms($post_id, 'ic_function', array('fields' => 'slugs'));

    $body = wp_strip_all_tags(get_post_field('post_content', $post_id));
    $body = preg_replace('/\s+/', ' ', $body);
    $body = trim($body);

    echo json_encode(array(
        'id'             => $post_id,
        'title'          => get_the_title($post_id),
        'excerpt'        => wp_strip_all_tags(get_the_excerpt($post_id)),
        'body'           => substr($body, 0, 2400),
        'pillar_slugs'   => array_values(is_wp_error($pillars)   ? array() : $pillars),
        'function_slugs' => array_values(is_wp_error($functions) ? array() : $functions),
        'p100_source_id' => (int) get_post_meta($post_id, '_p100_source_id', true),
    ), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . "\n";
}
