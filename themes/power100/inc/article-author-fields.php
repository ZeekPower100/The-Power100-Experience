<?php
/**
 * Article Authorship ACF Field Group
 *
 * Registers `pr_author_*` fields for the post type so single.php can render
 * proper author attribution (name + photo + link to contributor lander).
 * Schema documented at top of single.php and consumed at lines 42-45 there.
 *
 * Field key conventions match what single.php already reads:
 *   - pr_author_type    select: ec | staff
 *   - pr_author_ec      post_object → ranked CEO/EC contributor page
 *   - pr_author_name    text (override; mostly for staff or when ec page not yet built)
 *   - pr_author_photo   image (override; mostly for staff)
 *
 * Pattern mirrors `inc/ec-contributor-fields.php` — see that file + `memory/
 * reference_p100_acf_field_groups.md` for the wider P100 ACF system.
 */
if (!function_exists('p100_register_article_author_fields')) {
function p100_register_article_author_fields() {
    if (!function_exists('acf_add_local_field_group')) return;

    acf_add_local_field_group(array(
        'key'      => 'group_article_author',
        'title'    => 'Article Author',
        'fields'   => array(
            array(
                'key'           => 'field_pr_author_type',
                'label'         => 'Author Type',
                'name'          => 'pr_author_type',
                'type'          => 'select',
                'choices'       => array(
                    'ec'    => 'Expert Contributor (linked lander)',
                    'staff' => 'Power100 Staff (name + photo manual)',
                ),
                'default_value' => 'ec',
                'allow_null'    => 0,
                'instructions'  => 'EC = link to a contributor lander; Staff = manual name+photo (used when author has no lander yet).',
            ),
            array(
                'key'           => 'field_pr_author_ec',
                'label'         => 'Linked Contributor (when type = EC)',
                'name'          => 'pr_author_ec',
                'type'          => 'post_object',
                'post_type'     => array('page'),
                'taxonomy'      => '',
                'allow_null'    => 1,
                'multiple'      => 0,
                'return_format' => 'object',
                'ui'            => 1,
                'instructions'  => 'Search by name. Pick the contributor lander page (page-expert-contributor.php template).',
                'conditional_logic' => array(
                    array(
                        array('field' => 'field_pr_author_type', 'operator' => '==', 'value' => 'ec'),
                    ),
                ),
            ),
            array(
                'key'          => 'field_pr_author_name',
                'label'        => 'Author Name (override)',
                'name'         => 'pr_author_name',
                'type'         => 'text',
                'instructions' => 'Optional. Used for staff authors OR to override the EC name. Leave blank to inherit from the linked EC page.',
            ),
            array(
                'key'           => 'field_pr_author_photo',
                'label'         => 'Author Photo (override)',
                'name'          => 'pr_author_photo',
                'type'          => 'image',
                'return_format' => 'array',
                'preview_size'  => 'thumbnail',
                'instructions'  => 'Optional. Used for staff authors OR to override the EC headshot. Leave blank to inherit from the linked EC page.',
            ),
        ),
        'location' => array(
            array(
                array('param' => 'post_type', 'operator' => '==', 'value' => 'post'),
            ),
        ),
        'menu_order'    => 1,
        'position'      => 'side',
        'style'         => 'default',
        'label_placement' => 'top',
        'instruction_placement' => 'label',
        'active' => true,
    ));
}
add_action('acf/init', 'p100_register_article_author_fields');
}
