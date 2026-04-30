<?php
/**
 * Expert Contributor ACF Field Group
 *
 * Mirrored from legacy power100.io's existing field group, schema verified
 * against 5 live pages on 2026-04-26 via REST `?context=edit` (admin auth).
 * 58 fields total — kept FLAT (no true repeaters) to match the existing meta
 * keys our pipeline already writes via mu-register-ec-meta.php. Repeater-style
 * flat keys (ec_video_{N}_*, ec_testi_{N}_*) are grouped via ACF tabs for UX.
 *
 * Bound to ALL pages using the page-expert-contributor.php template (covers
 * both contributor-type landers and the legacy expert_contributor pages).
 */

if (!function_exists('p100_register_ec_contributor_fields')) {
function p100_register_ec_contributor_fields() {
    if (!function_exists('acf_add_local_field_group')) return;

    $fields = array();

    // ─── Tab: Hero / Identity ───
    $fields[] = array('key' => 'field_ec_tab_hero', 'label' => 'Hero / Identity', 'type' => 'tab');
    $fields[] = array('key' => 'field_ec_name',           'label' => 'Name',                'name' => 'ec_name',           'type' => 'text');
    $fields[] = array('key' => 'field_ec_title_position', 'label' => 'Title / Position',    'name' => 'ec_title_position', 'type' => 'text');
    $fields[] = array('key' => 'field_ec_hero_quote',     'label' => 'Hero Quote',          'name' => 'ec_hero_quote',     'type' => 'textarea', 'rows' => 3);
    $fields[] = array('key' => 'field_ec_headshot',       'label' => 'Headshot',            'name' => 'ec_headshot',       'type' => 'image', 'return_format' => 'id', 'preview_size' => 'medium');
    $fields[] = array('key' => 'field_ec_power_rank',     'label' => 'Power Rank',          'name' => 'ec_power_rank',     'type' => 'text', 'instructions' => 'e.g., #1, #36 (with hash)');
    $fields[] = array('key' => 'field_ec_linkedin_url',   'label' => 'LinkedIn URL',        'name' => 'ec_linkedin_url',   'type' => 'url');
    $fields[] = array('key' => 'field_ec_contributor_type','label' => 'Contributor Type',   'name' => 'ec_contributor_type','type' => 'select', 'choices' => array(
        'ceo' => 'Ranked CEO',
        'partner' => 'Ranked Partner',
        'individual' => 'Industry Leader',
        'contributor' => 'Contributor',
    ), 'default_value' => 'contributor', 'allow_null' => 1);

    // ─── Tab: Company ───
    $fields[] = array('key' => 'field_ec_tab_company', 'label' => 'Company', 'type' => 'tab');
    $fields[] = array('key' => 'field_ec_company_name',         'label' => 'Company Name',         'name' => 'ec_company_name',         'type' => 'text');
    $fields[] = array('key' => 'field_ec_company_desc',         'label' => 'Company Description',  'name' => 'ec_company_desc',         'type' => 'textarea', 'rows' => 4);
    $fields[] = array('key' => 'field_ec_company_logo',         'label' => 'Company Logo (Light bg)', 'name' => 'ec_company_logo',         'type' => 'image', 'return_format' => 'id', 'preview_size' => 'thumbnail', 'instructions' => 'Used on power100.io (light backgrounds). Typically the dark-text version of the logo.');
    $fields[] = array('key' => 'field_ec_company_logo_dark',    'label' => 'Company Logo (Dark bg)',  'name' => 'ec_company_logo_dark',    'type' => 'image', 'return_format' => 'id', 'preview_size' => 'thumbnail', 'instructions' => 'Used on the Inner Circle mirror lander (dark backgrounds). Typically the white/inverted version. Falls back to the light variant if blank.');
    $fields[] = array('key' => 'field_ec_company_url',          'label' => 'Company URL',          'name' => 'ec_company_url',          'type' => 'url');
    $fields[] = array('key' => 'field_ec_company_lander_url',   'label' => 'Company Lander URL',   'name' => 'ec_company_lander_url',   'type' => 'url', 'instructions' => 'Power100 lander for the company (Preferred Partner / Campaign).');
    $fields[] = array('key' => 'field_ec_ceo_lander_url',       'label' => 'CEO Lander URL',       'name' => 'ec_ceo_lander_url',       'type' => 'url', 'instructions' => 'If this contributor also has a Power-Ranked CEO lander.');
    $fields[] = array('key' => 'field_ec_articles_url',         'label' => 'Articles URL',         'name' => 'ec_articles_url',         'type' => 'url', 'instructions' => 'Author archive or articles index for this contributor.');

    // ─── Tab: Stats ───
    $fields[] = array('key' => 'field_ec_tab_stats', 'label' => 'Stats', 'type' => 'tab');
    $fields[] = array('key' => 'field_ec_stat_years',         'label' => 'Years in Industry',  'name' => 'ec_stat_years',         'type' => 'text', 'instructions' => 'e.g., 20+, 15');
    $fields[] = array('key' => 'field_ec_stat_revenue',       'label' => 'Revenue',            'name' => 'ec_stat_revenue',       'type' => 'text', 'instructions' => 'e.g., $100M+');
    $fields[] = array('key' => 'field_ec_stat_markets',       'label' => 'Markets / Regions',  'name' => 'ec_stat_markets',       'type' => 'text');
    $fields[] = array('key' => 'field_ec_stat_custom_label',  'label' => 'Custom Stat Label',  'name' => 'ec_stat_custom_label',  'type' => 'text', 'instructions' => 'e.g., Locations, Crews, Top 500 Rank');
    $fields[] = array('key' => 'field_ec_stat_custom_value',  'label' => 'Custom Stat Value',  'name' => 'ec_stat_custom_value',  'type' => 'text', 'instructions' => 'e.g., 10+, #18');

    // ─── Tab: Bio & Authority ───
    $fields[] = array('key' => 'field_ec_tab_bio', 'label' => 'Bio & Authority', 'type' => 'tab');
    $fields[] = array('key' => 'field_ec_expertise_bio',      'label' => 'Expertise Bio',      'name' => 'ec_expertise_bio',      'type' => 'textarea', 'rows' => 6);
    $fields[] = array('key' => 'field_ec_contrib_description','label' => 'Contributor Story',  'name' => 'ec_contrib_description','type' => 'textarea', 'rows' => 6);
    $fields[] = array('key' => 'field_ec_contrib_topics',     'label' => 'Domain Mastery (one per line, "Domain | 9.X")', 'name' => 'ec_contrib_topics', 'type' => 'textarea', 'rows' => 8);
    $fields[] = array('key' => 'field_ec_credentials',        'label' => 'Key Credentials (one per line)',                 'name' => 'ec_credentials',    'type' => 'textarea', 'rows' => 8);
    $fields[] = array('key' => 'field_ec_recognition',        'label' => 'Recognition (emoji + text per line)',            'name' => 'ec_recognition',    'type' => 'textarea', 'rows' => 8);
    $fields[] = array('key' => 'field_ec_scores',             'label' => 'Scores (one per line, "Domain | 9.X")',          'name' => 'ec_scores',         'type' => 'textarea', 'rows' => 8);
    $fields[] = array('key' => 'field_ec_snapshots',          'label' => 'Snapshots',          'name' => 'ec_snapshots',         'type' => 'textarea', 'rows' => 4);

    // ─── Tab: Testimonials (4 slots) ───
    $fields[] = array('key' => 'field_ec_tab_testi', 'label' => 'Testimonials', 'type' => 'tab');
    for ($i = 1; $i <= 4; $i++) {
        $fields[] = array('key' => "field_ec_testi_{$i}_quote", 'label' => "Testimonial $i — Quote", 'name' => "ec_testi_{$i}_quote", 'type' => 'textarea', 'rows' => 3);
        $fields[] = array('key' => "field_ec_testi_{$i}_name",  'label' => "Testimonial $i — Name",  'name' => "ec_testi_{$i}_name",  'type' => 'text');
        $fields[] = array('key' => "field_ec_testi_{$i}_role",  'label' => "Testimonial $i — Role",  'name' => "ec_testi_{$i}_role",  'type' => 'text');
    }

    // ─── Tab: Videos (7 slots) ───
    $fields[] = array('key' => 'field_ec_tab_video', 'label' => 'Videos', 'type' => 'tab');
    for ($i = 1; $i <= 7; $i++) {
        $fields[] = array('key' => "field_ec_video_{$i}_title", 'label' => "Video $i — Title", 'name' => "ec_video_{$i}_title", 'type' => 'text');
        $fields[] = array('key' => "field_ec_video_{$i}_url",   'label' => "Video $i — URL",   'name' => "ec_video_{$i}_url",   'type' => 'url');
        $fields[] = array('key' => "field_ec_video_{$i}_thumb", 'label' => "Video $i — Thumb", 'name' => "ec_video_{$i}_thumb", 'type' => 'image', 'return_format' => 'id', 'preview_size' => 'thumbnail');
    }

    acf_add_local_field_group(array(
        'key'      => 'group_ec_contributor',
        'title'    => 'Expert Contributor Lander',
        'fields'   => $fields,
        'location' => array(
            // Pages using the EC template (covers all 4 contributor variations)
            array(array('param' => 'page_template', 'operator' => '==', 'value' => 'page-expert-contributor.php')),
            // Plus any page whose slug ends in -contributor or -expert-contributor
            // (defensive — page_template alone covers the common case)
        ),
        'menu_order'    => 0,
        'position'      => 'normal',
        'style'         => 'default',
        'label_placement' => 'top',
        'instruction_placement' => 'label',
        'active' => true,
    ));
}
add_action('acf/init', 'p100_register_ec_contributor_fields');
}
