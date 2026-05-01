<?php
/**
 * Template Name: Power100 Contributors
 * Directory of Power100 Expert Contributors — links to IC's own ic_contributor
 * landers (the dark mirror of the P100 design). Sources from ic_contributor post
 * type (the canonical post-2026-04-26 source) which captures both:
 *   - Original IC contributors (mirrored to P100 + back to IC)
 *   - P100 EC landers (paid CEOs/Partners/Industry Leaders + reclassified)
 * v4.0.0 — switched source from ic_leader taxonomy to ic_contributor post type.
 */
ic_require_membership();

$member = ic_get_member_data();

get_header();
?>

<main class="ic-portal-main" style="padding: 40px 0 80px;">
<div class="ic-container">

    <div style="margin-bottom: 40px;">
        <p class="ic-section-eyebrow">The Network</p>
        <h1 class="ic-section-title">Power100 Contributors</h1>
        <p style="color: var(--ic-text-dim); font-size: 14px; margin: 0; max-width: 600px;">
            Industry-leading CEOs and executives sharing insights, strategies, and expertise.
            Explore their profiles and published content on the Power100 platform.
        </p>
    </div>

    <?php
    // Source: ic_contributor post type. Captures every contributor (paid EC,
    // reclassified contributor, and originally-IC speakers) since Phase D.1.
    $contrib_q = new WP_Query(array(
        'post_type'      => 'ic_contributor',
        'post_status'    => 'publish',
        'posts_per_page' => -1,
        'orderby'        => 'title',
        'order'          => 'ASC',
        'no_found_rows'  => true,
    ));
    $contributors = $contrib_q->posts;
    wp_reset_postdata();
    $total_count = count($contributors);
    ?>

    <?php if (!empty($contributors)) : ?>

    <!-- Search + count -->
    <div style="display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 24px; flex-wrap: wrap;">
        <input type="text" id="contributor-search" placeholder="Search contributors..."
               style="flex: 1; max-width: 400px; padding: 10px 16px; background: var(--ic-dark-gray); border: 1px solid var(--ic-border); border-radius: 6px; color: var(--ic-white); font-size: 14px; font-family: var(--ic-font-body);">
        <span style="font-size: 12px; color: var(--ic-text-muted); font-family: var(--ic-font-body);"><?php echo intval($total_count); ?> contributors</span>
    </div>

    <div class="ic-grid-3" id="contributors-grid">
        <?php foreach ($contributors as $cp) :
            $cid = $cp->ID;
            $name = get_the_title($cp);
            $link_url = get_permalink($cp);

            // ── Two-axis model (locked 2026-04-30) — see memory/reference_two_axis_contributor_model.md ──
            // EC status (paid contributor) and rank status (CEO/Partner ranking) are INDEPENDENT.
            // Read NEW fields first, fall back to legacy ec_contributor_type / ec_power_rank.
            $rank_status = get_post_meta($cid, 'ec_rank_status', true);
            $rank_number = get_post_meta($cid, 'ec_rank_number', true);
            $ctype_raw   = get_post_meta($cid, 'ec_contributor_type', true) ?: 'contributor';
            // Legacy fallback when new fields aren't synced yet
            if (empty($rank_status)) {
                if (in_array($ctype_raw, array('ranked_ceo', 'ceo'), true))     $rank_status = 'ranked_ceo';
                elseif (in_array($ctype_raw, array('ranked_partner','partner'), true)) $rank_status = 'ranked_partner';
            }
            if (empty($rank_number)) {
                $legacy_pr = get_post_meta($cid, 'ec_power_rank', true);
                if ($legacy_pr) $rank_number = (int) ltrim((string) $legacy_pr, '#');
            }
            // EC = paid contributor. industry_leader is collapsed into 'contributor' going forward,
            // but legacy paid-EC rows still show ranked_ceo/ranked_partner/industry_leader on the
            // legacy contributor_type field — so use that as the EC marker.
            $is_ec = in_array($ctype_raw, array('ranked_ceo', 'ranked_partner', 'industry_leader'), true);

            // Sub-badge label from rank_status
            $sub_badge = '';
            if ($rank_status === 'ranked_ceo')         $sub_badge = 'CEO';
            elseif ($rank_status === 'ranked_partner') $sub_badge = 'PARTNER';

            // Company
            $company = get_post_meta($cid, 'ec_company_name', true);
            // Numeric rank for the # chip (independent of CEO/PARTNER label)
            $power_rank = $rank_number ? (int) $rank_number : '';

            // Photo — prefer post thumbnail (the IC-side sideloaded image)
            $photo = get_the_post_thumbnail_url($cid, 'medium');
            if (!$photo) {
                $hid = get_post_meta($cid, 'ec_headshot', true);
                $maybe = $hid ? wp_get_attachment_image_url(intval($hid), 'medium') : '';
                $photo = $maybe ?: '';
            }

            // Episode count via ic_leader taxonomy match by name
            $ep_count = 0;
            $term = get_term_by('name', $name, 'ic_leader');
            if ($term && !is_wp_error($term)) $ep_count = intval($term->count);

            // Search-data attribute combines name + company + badges so ops can filter by any
            $search_blob = strtolower($name . ' ' . ($company ?: '') . ' ' . ($is_ec ? 'EC ' : '') . ($sub_badge ?: ''));
        ?>
        <a href="<?php echo esc_url($link_url); ?>"
           class="ic-card contributor-card<?php echo $is_ec ? ' contributor-ec' : ''; ?>"
           data-name="<?php echo esc_attr($search_blob); ?>"
           style="display: flex; align-items: center; gap: 16px; padding: 18px 20px; text-decoration: none;">

            <div style="flex-shrink: 0; width: 50px; height: 50px; border-radius: 50%; background: var(--ic-dark-gray); display: flex; align-items: center; justify-content: center; overflow: hidden;">
                <?php if ($photo) : ?>
                <img src="<?php echo esc_url($photo); ?>" alt="" style="width: 100%; height: 100%; object-fit: cover;">
                <?php else : ?>
                <span style="font-family: var(--ic-font-accent); font-size: 18px; color: var(--ic-gold); letter-spacing: 1px;">
                    <?php
                    $parts = explode(' ', $name);
                    echo esc_html(strtoupper(substr($parts[0], 0, 1) . (isset($parts[1]) ? substr($parts[1], 0, 1) : '')));
                    ?>
                </span>
                <?php endif; ?>
            </div>

            <div style="flex: 1; min-width: 0;">
                <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                    <h3 style="font-family: var(--ic-font-body) !important; font-size: 14px; font-weight: 600; margin: 0; color: var(--ic-white) !important;"><?php echo esc_html($name); ?></h3>
                    <?php if ($is_ec) : ?>
                    <span style="font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; background: var(--ic-gold); color: #000; padding: 2px 6px; border-radius: 3px; line-height: 1;">EC</span>
                    <?php endif; ?>
                    <?php if ($sub_badge) : ?>
                    <span style="font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; background: rgba(200,169,81,0.12); color: var(--ic-gold); padding: 2px 6px; border-radius: 3px; border: 1px solid rgba(200,169,81,0.4); line-height: 1;"><?php echo esc_html($sub_badge); ?></span>
                    <?php endif; ?>
                    <?php if ($power_rank) : ?>
                    <span style="font-size: 9px; font-weight: 700; letter-spacing: 0.5px; background: rgba(251,4,1,0.15); color: #FB0401; padding: 2px 6px; border-radius: 3px; border: 1px solid rgba(251,4,1,0.3); line-height: 1;">#<?php echo esc_html(ltrim($power_rank, '#')); ?></span>
                    <?php endif; ?>
                </div>
                <?php if ($company) : ?>
                <p style="font-size: 12px; color: var(--ic-text-muted); margin: 2px 0 0;"><?php echo esc_html($company); ?></p>
                <?php endif; ?>
                <?php if ($ep_count > 0) : ?>
                <p style="font-size: 11px; color: var(--ic-text-muted); margin: 4px 0 0;"><?php echo $ep_count; ?> episode<?php echo $ep_count > 1 ? 's' : ''; ?></p>
                <?php endif; ?>
            </div>

            <span style="color: var(--ic-text-muted); font-size: 16px; flex-shrink: 0;">→</span>
        </a>
        <?php endforeach; ?>
    </div>

    <?php else : ?>
    <div class="ic-card" style="text-align: center; padding: 60px 20px;">
        <p style="font-size: 48px; margin-bottom: 16px;">👥</p>
        <h3 style="font-family: var(--ic-font-body) !important; font-size: 18px; font-weight: 600; margin-bottom: 8px;">Contributors Coming Soon</h3>
        <p style="color: var(--ic-text-muted); font-size: 14px;">
            Power100 Expert Contributors will be listed here as content is published.
        </p>
    </div>
    <?php endif; ?>

</div>
</main>

<script>
document.addEventListener('DOMContentLoaded', function() {
    var search = document.getElementById('contributor-search');
    if (search) {
        search.addEventListener('input', function() {
            var q = this.value.toLowerCase();
            document.querySelectorAll('.contributor-card').forEach(function(card) {
                var name = card.getAttribute('data-name') || '';
                card.style.display = name.indexOf(q) !== -1 ? '' : 'none';
            });
        });
    }
});
</script>

<?php get_footer(); ?>
