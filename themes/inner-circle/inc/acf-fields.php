<?php
/**
 * ACF Field Groups — Programmatic Registration
 * Inner Circle v3.1
 */
if (!defined('ABSPATH')) exit;

function ic_register_acf_fields() {
    if (!function_exists('acf_add_local_field_group')) return;

    // =========================================
    // Content Fields
    // =========================================
    acf_add_local_field_group(array(
        'key'      => 'group_ic_content',
        'title'    => 'Content Details',
        'fields'   => array(
            array(
                'key' => 'field_ic_video_url', 'label' => 'Video URL',
                'name' => 'ic_video_url', 'type' => 'url',
                'instructions' => 'YouTube, Vimeo, or direct video URL', 'required' => 1,
            ),
            array(
                'key' => 'field_ic_episode_number', 'label' => 'Episode Number',
                'name' => 'ic_episode_number', 'type' => 'number',
                'instructions' => 'Episode number within its show. Leave blank for standalone content.',
                'required' => 0, 'min' => 1,
            ),
            array(
                'key' => 'field_ic_season_number', 'label' => 'Season Number',
                'name' => 'ic_season_number', 'type' => 'number',
                'instructions' => 'Optional season number.', 'required' => 0, 'min' => 1,
            ),
            array(
                'key' => 'field_ic_duration', 'label' => 'Duration',
                'name' => 'ic_duration', 'type' => 'text',
                'instructions' => 'e.g. "45:30" or "1:22:10"', 'placeholder' => '00:00',
            ),
            array(
                'key' => 'field_ic_recording_date', 'label' => 'Recording Date',
                'name' => 'ic_recording_date', 'type' => 'date_picker',
                'display_format' => 'F j, Y', 'return_format' => 'Y-m-d',
            ),
            array(
                'key' => 'field_ic_speakers', 'label' => 'Speakers / Guests',
                'name' => 'ic_speakers', 'type' => 'repeater', 'layout' => 'row',
                'instructions' => 'Leader and company names auto-populate filter taxonomies on save.',
                'sub_fields' => array(
                    array(
                        'key' => 'field_ic_speaker_name', 'label' => 'Name',
                        'name' => 'name', 'type' => 'text', 'required' => 1,
                        'wrapper' => array('width' => '33'),
                    ),
                    array(
                        'key' => 'field_ic_speaker_title', 'label' => 'Title / Company',
                        'name' => 'title', 'type' => 'text',
                        'instructions' => 'e.g. "CEO, ABC Roofing" — company name after comma becomes filterable',
                        'wrapper' => array('width' => '33'),
                    ),
                    array(
                        'key' => 'field_ic_speaker_photo', 'label' => 'Photo',
                        'name' => 'photo', 'type' => 'image', 'return_format' => 'url',
                        'preview_size' => 'thumbnail', 'wrapper' => array('width' => '34'),
                    ),
                ),
            ),
            array(
                'key' => 'field_ic_timestamps', 'label' => 'Timestamp Chapters',
                'name' => 'ic_timestamps', 'type' => 'repeater', 'layout' => 'table',
                'button_label' => 'Add Chapter',
                'sub_fields' => array(
                    array('key' => 'field_ic_ts_seconds', 'label' => 'Time (seconds)', 'name' => 'seconds', 'type' => 'number', 'required' => 1, 'wrapper' => array('width' => '20')),
                    array('key' => 'field_ic_ts_label', 'label' => 'Chapter Title', 'name' => 'label', 'type' => 'text', 'required' => 1, 'wrapper' => array('width' => '40')),
                    array('key' => 'field_ic_ts_description', 'label' => 'Description', 'name' => 'description', 'type' => 'text', 'wrapper' => array('width' => '40')),
                ),
            ),
            array(
                'key' => 'field_ic_takeaways', 'label' => 'Key Takeaways',
                'name' => 'ic_takeaways', 'type' => 'repeater', 'layout' => 'table',
                'button_label' => 'Add Takeaway',
                'sub_fields' => array(
                    array('key' => 'field_ic_takeaway_text', 'label' => 'Takeaway', 'name' => 'text', 'type' => 'text', 'required' => 1),
                ),
            ),
            array(
                'key' => 'field_ic_related_resources', 'label' => 'Related Resources',
                'name' => 'ic_related_resources', 'type' => 'relationship',
                'post_type' => array('ic_resource'), 'filters' => array('search', 'taxonomy'),
                'return_format' => 'id',
            ),
            // =========================================
            // Thumbnail Pipeline Fields (auto-populated by thumbnail-system)
            // =========================================
            array(
                'key' => 'field_ic_hook_text', 'label' => 'Hook Text (Thumbnail)',
                'name' => 'ic_hook_text', 'type' => 'text',
                'instructions' => 'The 2-3 word punchy hook displayed on the thumbnail. Auto-populated by thumbnail pipeline. Pipe-delimited for multi-line: WALKED|AWAY FROM|$20 MILLION',
                'placeholder' => 'WALKED|AWAY FROM|$20 MILLION',
            ),
            array(
                'key' => 'field_ic_hook_full_title', 'label' => 'Hook Full Title',
                'name' => 'ic_hook_full_title', 'type' => 'text',
                'instructions' => 'The longer-form hook title (e.g. "Why He Walked Away From $20M"). Shown in hover cards and search results.',
            ),
            array(
                'key' => 'field_ic_preview_clip_url', 'label' => 'Preview Clip URL',
                'name' => 'ic_preview_clip_url', 'type' => 'url',
                'instructions' => 'URL to 15-30s montage clip auto-generated from top scored video moments. Used for hover auto-play preview.',
            ),
            array(
                'key' => 'field_ic_thumbnail_generated', 'label' => 'Thumbnail Pipeline Processed',
                'name' => 'ic_thumbnail_generated', 'type' => 'true_false',
                'instructions' => 'Automatically set TRUE when the thumbnail-system pipeline has successfully generated this video\'s thumbnail and preview clip.',
                'ui' => 1,
                'default_value' => 0,
            ),
        ),
        'location' => array(array(array('param' => 'post_type', 'operator' => '==', 'value' => 'ic_content'))),
        'position' => 'normal', 'style' => 'default',
    ));

    // =========================================
    // Resource Fields
    // =========================================
    acf_add_local_field_group(array(
        'key'      => 'group_ic_resource',
        'title'    => 'Resource Details',
        'fields'   => array(
            array('key' => 'field_ic_resource_file', 'label' => 'File Upload', 'name' => 'ic_resource_file', 'type' => 'file', 'return_format' => 'url'),
            array('key' => 'field_ic_resource_url', 'label' => 'External URL', 'name' => 'ic_resource_url', 'type' => 'url'),
            array('key' => 'field_ic_resource_description', 'label' => 'Detailed Description', 'name' => 'ic_resource_description', 'type' => 'wysiwyg', 'media_upload' => 0),
            array('key' => 'field_ic_resource_content', 'label' => 'Associated Content', 'name' => 'ic_associated_content', 'type' => 'relationship', 'post_type' => array('ic_content'), 'return_format' => 'id'),
        ),
        'location' => array(array(array('param' => 'post_type', 'operator' => '==', 'value' => 'ic_resource'))),
        'position' => 'normal', 'style' => 'default',
    ));

    // =========================================
    // Show Details (taxonomy term fields)
    // =========================================
    acf_add_local_field_group(array(
        'key'      => 'group_ic_show_details',
        'title'    => 'Show Details',
        'fields'   => array(
            array('key' => 'field_ic_show_host', 'label' => 'Host(s)', 'name' => 'ic_show_host', 'type' => 'text', 'instructions' => 'e.g. "Greg Cummings" or "Ray & Greg"'),
            array('key' => 'field_ic_show_company', 'label' => 'Company / Affiliation', 'name' => 'ic_show_company', 'type' => 'text'),
            array('key' => 'field_ic_show_logo', 'label' => 'Show Logo / Thumbnail', 'name' => 'ic_show_logo', 'type' => 'image', 'return_format' => 'url', 'preview_size' => 'thumbnail'),
            array('key' => 'field_ic_show_description', 'label' => 'Show Description', 'name' => 'ic_show_description', 'type' => 'textarea', 'rows' => 3),
            array('key' => 'field_ic_show_color', 'label' => 'Brand Color', 'name' => 'ic_show_color', 'type' => 'color_picker', 'default_value' => '#C8A951', 'instructions' => 'Used in cards and headers for this show'),
            array('key' => 'field_ic_show_tagline', 'label' => 'Tagline', 'name' => 'ic_show_tagline', 'type' => 'text', 'instructions' => 'Short tagline, e.g. "The Power100 Podcast"'),
        ),
        'location' => array(array(array('param' => 'taxonomy', 'operator' => '==', 'value' => 'ic_show'))),
    ));

    // =========================================
    // IC CONTRIBUTOR LANDER FIELDS (mirror of P100 group_ec_contributor)
    // 58 fields, same flat ec_* schema (ec_video_{N}_*, ec_testi_{N}_*) so the
    // IC mirror writer pipeline + the dark single-ic_contributor.php template
    // both consume the exact same keys as the Power100 light template.
    // Locked 2026-04-26 — see memory/reference_p100_acf_field_groups.md.
    // =========================================
    $ec_fields = array();

    // Hero / Identity
    $ec_fields[] = array('key' => 'field_ec_tab_hero', 'label' => 'Hero / Identity', 'type' => 'tab');
    $ec_fields[] = array('key' => 'field_ec_name',           'label' => 'Name',                'name' => 'ec_name',           'type' => 'text');
    $ec_fields[] = array('key' => 'field_ec_title_position', 'label' => 'Title / Position',    'name' => 'ec_title_position', 'type' => 'text');
    $ec_fields[] = array('key' => 'field_ec_hero_quote',     'label' => 'Hero Quote',          'name' => 'ec_hero_quote',     'type' => 'textarea', 'rows' => 3);
    $ec_fields[] = array('key' => 'field_ec_headshot',       'label' => 'Headshot',            'name' => 'ec_headshot',       'type' => 'image', 'return_format' => 'id', 'preview_size' => 'medium');
    $ec_fields[] = array('key' => 'field_ec_power_rank',     'label' => 'Power Rank',          'name' => 'ec_power_rank',     'type' => 'text', 'instructions' => 'e.g., #1, #36 (with hash)');
    $ec_fields[] = array('key' => 'field_ec_linkedin_url',   'label' => 'LinkedIn URL',        'name' => 'ec_linkedin_url',   'type' => 'url');
    $ec_fields[] = array('key' => 'field_ec_contributor_type','label' => 'Contributor Type',   'name' => 'ec_contributor_type','type' => 'select', 'choices' => array(
        'ceo' => 'Ranked CEO', 'partner' => 'Ranked Partner', 'individual' => 'Industry Leader', 'contributor' => 'Contributor',
    ), 'default_value' => 'contributor', 'allow_null' => 1);

    // Company
    $ec_fields[] = array('key' => 'field_ec_tab_company', 'label' => 'Company', 'type' => 'tab');
    $ec_fields[] = array('key' => 'field_ec_company_name',         'label' => 'Company Name',         'name' => 'ec_company_name',         'type' => 'text');
    $ec_fields[] = array('key' => 'field_ec_company_desc',         'label' => 'Company Description',  'name' => 'ec_company_desc',         'type' => 'textarea', 'rows' => 4);
    $ec_fields[] = array('key' => 'field_ec_company_logo',         'label' => 'Company Logo',         'name' => 'ec_company_logo',         'type' => 'image', 'return_format' => 'id', 'preview_size' => 'thumbnail');
    $ec_fields[] = array('key' => 'field_ec_company_url',          'label' => 'Company URL',          'name' => 'ec_company_url',          'type' => 'url');
    $ec_fields[] = array('key' => 'field_ec_company_lander_url',   'label' => 'Company Lander URL',   'name' => 'ec_company_lander_url',   'type' => 'url');
    $ec_fields[] = array('key' => 'field_ec_ceo_lander_url',       'label' => 'CEO Lander URL',       'name' => 'ec_ceo_lander_url',       'type' => 'url');
    $ec_fields[] = array('key' => 'field_ec_articles_url',         'label' => 'Articles URL',         'name' => 'ec_articles_url',         'type' => 'url');

    // Stats
    $ec_fields[] = array('key' => 'field_ec_tab_stats', 'label' => 'Stats', 'type' => 'tab');
    $ec_fields[] = array('key' => 'field_ec_stat_years',         'label' => 'Years in Industry',  'name' => 'ec_stat_years',         'type' => 'text');
    $ec_fields[] = array('key' => 'field_ec_stat_revenue',       'label' => 'Revenue',            'name' => 'ec_stat_revenue',       'type' => 'text');
    $ec_fields[] = array('key' => 'field_ec_stat_markets',       'label' => 'Markets / Regions',  'name' => 'ec_stat_markets',       'type' => 'text');
    $ec_fields[] = array('key' => 'field_ec_stat_custom_label',  'label' => 'Custom Stat Label',  'name' => 'ec_stat_custom_label',  'type' => 'text');
    $ec_fields[] = array('key' => 'field_ec_stat_custom_value',  'label' => 'Custom Stat Value',  'name' => 'ec_stat_custom_value',  'type' => 'text');

    // Bio & Authority
    $ec_fields[] = array('key' => 'field_ec_tab_bio', 'label' => 'Bio & Authority', 'type' => 'tab');
    $ec_fields[] = array('key' => 'field_ec_expertise_bio',      'label' => 'Expertise Bio',      'name' => 'ec_expertise_bio',      'type' => 'textarea', 'rows' => 6);
    $ec_fields[] = array('key' => 'field_ec_contrib_description','label' => 'Contributor Story',  'name' => 'ec_contrib_description','type' => 'textarea', 'rows' => 6);
    $ec_fields[] = array('key' => 'field_ec_contrib_topics',     'label' => 'Domain Mastery (one per line)', 'name' => 'ec_contrib_topics', 'type' => 'textarea', 'rows' => 8);
    $ec_fields[] = array('key' => 'field_ec_credentials',        'label' => 'Key Credentials (one per line)','name' => 'ec_credentials',    'type' => 'textarea', 'rows' => 8);
    $ec_fields[] = array('key' => 'field_ec_recognition',        'label' => 'Recognition (emoji + text per line)','name' => 'ec_recognition','type' => 'textarea', 'rows' => 8);
    $ec_fields[] = array('key' => 'field_ec_scores',             'label' => 'Scores ("Domain | 9.X" per line)','name' => 'ec_scores',      'type' => 'textarea', 'rows' => 8);
    $ec_fields[] = array('key' => 'field_ec_snapshots',          'label' => 'Snapshots',          'name' => 'ec_snapshots',         'type' => 'textarea', 'rows' => 4);

    // Testimonials (4 slots)
    $ec_fields[] = array('key' => 'field_ec_tab_testi', 'label' => 'Testimonials', 'type' => 'tab');
    for ($i = 1; $i <= 4; $i++) {
        $ec_fields[] = array('key' => "field_ec_testi_{$i}_quote", 'label' => "Testimonial $i — Quote", 'name' => "ec_testi_{$i}_quote", 'type' => 'textarea', 'rows' => 3);
        $ec_fields[] = array('key' => "field_ec_testi_{$i}_name",  'label' => "Testimonial $i — Name",  'name' => "ec_testi_{$i}_name",  'type' => 'text');
        $ec_fields[] = array('key' => "field_ec_testi_{$i}_role",  'label' => "Testimonial $i — Role",  'name' => "ec_testi_{$i}_role",  'type' => 'text');
    }

    // Videos (7 slots)
    $ec_fields[] = array('key' => 'field_ec_tab_video', 'label' => 'Videos', 'type' => 'tab');
    for ($i = 1; $i <= 7; $i++) {
        $ec_fields[] = array('key' => "field_ec_video_{$i}_title", 'label' => "Video $i — Title", 'name' => "ec_video_{$i}_title", 'type' => 'text');
        $ec_fields[] = array('key' => "field_ec_video_{$i}_url",   'label' => "Video $i — URL",   'name' => "ec_video_{$i}_url",   'type' => 'url');
        $ec_fields[] = array('key' => "field_ec_video_{$i}_thumb", 'label' => "Video $i — Thumb", 'name' => "ec_video_{$i}_thumb", 'type' => 'image', 'return_format' => 'id', 'preview_size' => 'thumbnail');
    }

    acf_add_local_field_group(array(
        'key'      => 'group_ic_contributor',
        'title'    => 'IC Contributor Lander',
        'fields'   => $ec_fields,
        'location' => array(array(array('param' => 'post_type', 'operator' => '==', 'value' => 'ic_contributor'))),
        'menu_order'    => 0,
        'position'      => 'normal',
        'style'         => 'default',
        'label_placement' => 'top',
        'instruction_placement' => 'label',
        'active' => true,
    ));
}
add_action('acf/init', 'ic_register_acf_fields');
