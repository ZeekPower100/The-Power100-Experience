<?php
/**
 * MU-Plugin: Register EC lander meta keys for REST API writes
 *
 * Without this, `POST /wp-json/wp/v2/pages` with a `meta:{ec_*}` payload
 * silently drops because WP REST refuses to write unregistered post meta.
 *
 * The page-expert-contributor.php template already reads via get_field()
 * which falls back to get_post_meta(), so we don't need an ACF field group
 * for rendering — just for REST write authorization.
 *
 * Deploy: drop this file in /home/runcloud/webapps/power100/wp-content/mu-plugins/
 *
 * Used by: tpe-backend contributorEnrichmentService.upsertContributorLander()
 */

add_action('init', function () {
    $string_keys = array(
        'ec_name', 'ec_title_position', 'ec_contributor_type', 'ec_hero_quote',
        'ec_linkedin_url', 'ec_website_url', 'ec_power_rank',
        'ec_expertise_bio', 'ec_credentials', 'ec_contrib_topics', 'ec_contrib_description',
        'ec_recognition', 'ec_scores',
        'ec_company_name', 'ec_company_desc', 'ec_company_url',
        'ec_ceo_lander_url', 'ec_company_lander_url', 'ec_articles_url',
        'ec_stat_years', 'ec_stat_revenue', 'ec_stat_markets',
        'ec_stat_custom_label', 'ec_stat_custom_value',
        'ec_snapshots',
        // Two-axis model (locked 2026-04-30): rank_status is independent of contributor_type.
        // ec_rank_status: 'ranked_ceo' | 'ranked_partner' | empty. ec_rank_number: integer.
        // See memory/reference_two_axis_contributor_model.md
        'ec_rank_status',
    );

    // Per-video and per-testimonial fields
    for ($i = 1; $i <= 7; $i++) {
        $string_keys[] = "ec_video_{$i}_title";
        $string_keys[] = "ec_video_{$i}_url";
    }
    for ($i = 1; $i <= 4; $i++) {
        $string_keys[] = "ec_testi_{$i}_quote";
        $string_keys[] = "ec_testi_{$i}_name";
        $string_keys[] = "ec_testi_{$i}_role";
    }

    foreach ($string_keys as $key) {
        register_post_meta('page', $key, array(
            'show_in_rest' => true,
            'single'       => true,
            'type'         => 'string',
            'auth_callback' => function () { return current_user_can('edit_posts'); },
        ));
    }

    // Image attachment IDs (integer). ec_company_logo_dark is the dark-bg
    // variant used by the IC mirror; staging (light bg) uses ec_company_logo.
    foreach (array('ec_headshot', 'ec_company_logo', 'ec_company_logo_dark') as $key) {
        register_post_meta('page', $key, array(
            'show_in_rest' => true,
            'single'       => true,
            'type'         => 'integer',
            'auth_callback' => function () { return current_user_can('edit_posts'); },
        ));
    }

    // ec_rank_number — separate registration so REST returns it as int, not string
    register_post_meta('page', 'ec_rank_number', array(
        'show_in_rest' => true,
        'single'       => true,
        'type'         => 'integer',
        'auth_callback' => function () { return current_user_can('edit_posts'); },
    ));
});
