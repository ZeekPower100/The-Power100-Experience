<?php
/**
 * Template Name: Expert Contributor
 * The authority page for Power100 Expert Contributors
 * Pulls all data from ACF fields (ec_ prefix)
 */
// Self-contained: bypass GeneratePress wrapper for full-width layout
// Dequeue GP styles that conflict with EC lander layout
add_action('wp_enqueue_scripts', function() {
    wp_dequeue_style('generate-style');
    wp_dequeue_style('generatepress');
    wp_dequeue_style('generate-main');
}, 100);

$pid = get_the_ID();

// ── Core Fields ──
$name            = get_field('ec_name', $pid) ?: get_the_title();
$title_position  = get_field('ec_title_position', $pid);
$hero_quote      = get_field('ec_hero_quote', $pid);
$linkedin_url    = get_field('ec_linkedin_url', $pid);
$website_url     = get_field('ec_website_url', $pid);
// Two-axis model (locked 2026-04-30 — see memory/reference_two_axis_contributor_model.md):
// - Ranking axis: ec_rank_status ('ranked_ceo' | 'ranked_partner' | NULL) + ec_rank_number (int)
// - Contributor axis: ec_contributor_type ('contributor' | etc.). NEVER mix the two.
// Backward compat: if ec_rank_status not set, fall back to legacy ec_contributor_type values
// ('ranked_ceo' / 'ranked_partner' / 'ceo' / 'partner') + ec_power_rank.
$rank_status_raw = get_field('ec_rank_status', $pid);
$rank_number     = get_field('ec_rank_number', $pid);
$power_rank      = get_field('ec_power_rank', $pid);
$contributor_type_raw = get_field('ec_contributor_type', $pid) ?: 'contributor';

if (empty($rank_status_raw)) {
    // Fallback: derive from legacy contributor_type
    if (in_array($contributor_type_raw, array('ranked_ceo', 'ceo'), true)) {
        $rank_status_raw = 'ranked_ceo';
        if (!$rank_number && $power_rank) $rank_number = (int) $power_rank;
    } elseif (in_array($contributor_type_raw, array('ranked_partner', 'partner'), true)) {
        $rank_status_raw = 'ranked_partner';
        if (!$rank_number && $power_rank) $rank_number = (int) $power_rank;
    }
}

// Normalize legacy contributor_type. industry_leader collapses into contributor (Zeek 2026-04-30).
$variation_map = array(
    'ceo'             => 'contributor',  // legacy mixed-axis — strip the rank meaning
    'ranked_ceo'      => 'contributor',  // legacy mixed-axis
    'partner'         => 'contributor',
    'ranked_partner'  => 'contributor',
    'industry_leader' => 'contributor',  // collapsed
    'advisory_board'  => 'contributor',
    'contributor'     => 'contributor',
);
$contributor_type = isset($variation_map[$contributor_type_raw]) ? $variation_map[$contributor_type_raw] : 'contributor';

// Two-axis flags
$is_ranked_ceo     = ($rank_status_raw === 'ranked_ceo');
$is_ranked_partner = ($rank_status_raw === 'ranked_partner');
$is_ranked         = $is_ranked_ceo || $is_ranked_partner;
// EC status is now driven by tpedb's contributor_class — read from a separate meta if present
$is_paid_ec        = in_array(get_field('ec_is_expert_contributor', $pid), array(true, '1', 1, 'true'), true)
                  || in_array($contributor_type_raw, array('ranked_ceo', 'ranked_partner', 'industry_leader'), true); // legacy fallback
$is_contributor    = !$is_paid_ec;
$is_partner        = $is_ranked_partner; // alias kept for legacy template references below
$headshot        = get_field('ec_headshot', $pid);
$headshot_url    = is_array($headshot) ? $headshot['url'] : (is_numeric($headshot) ? wp_get_attachment_url($headshot) : ($headshot ?: ''));

// ── Stat Bar ──
$stat_years      = get_field('ec_stat_years', $pid);
$stat_revenue    = get_field('ec_stat_revenue', $pid);
$stat_markets    = get_field('ec_stat_markets', $pid);
$stat_custom_label = get_field('ec_stat_custom_label', $pid);
$stat_custom_value = get_field('ec_stat_custom_value', $pid);

// ── Bio / Credentials ──
$expertise_bio   = get_field('ec_expertise_bio', $pid);
$credentials     = get_field('ec_credentials', $pid);
$contrib_topics  = get_field('ec_contrib_topics', $pid);
$contrib_description = get_field('ec_contrib_description', $pid);

// ── Recognition ──
$recognition_raw = get_field('ec_recognition', $pid);

// ── Scores (pipe-delimited: "Domain | Score\nDomain | Score") ──
$scores_raw = get_field('ec_scores', $pid);
$scores = array();
if ($scores_raw && is_string($scores_raw)) {
    $lines = array_filter(array_map('trim', preg_split('/[\n\r]+/', $scores_raw)));
    foreach ($lines as $line) {
        $parts = array_map('trim', explode('|', $line));
        if (count($parts) >= 2) {
            $scores[] = array('domain' => $parts[0], 'score' => floatval($parts[1]));
        }
    }
} elseif (is_array($scores_raw)) {
    $scores = $scores_raw;
}

// ── Videos (individual meta: ec_video_N_url, ec_video_N_title, ec_video_N_thumb) ──
$videos = array();
for ($i = 1; $i <= 6; $i++) {
    $vurl = get_field("ec_video_{$i}_url", $pid) ?: get_post_meta($pid, "ec_video_{$i}_url", true);
    if ($vurl) {
        $vthumb_id = get_field("ec_video_{$i}_thumb", $pid) ?: get_post_meta($pid, "ec_video_{$i}_thumb", true);
        $vthumb = '';
        if ($vthumb_id) {
            $vthumb = is_numeric($vthumb_id) ? wp_get_attachment_url($vthumb_id) : (is_array($vthumb_id) ? $vthumb_id['url'] : $vthumb_id);
        }
        // Generate YouTube thumbnail if no custom thumb
        if (!$vthumb && preg_match('/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/', $vurl, $yt)) {
            $vthumb = 'https://img.youtube.com/vi/' . $yt[1] . '/maxresdefault.jpg';
        }
        $videos[] = array(
            'url' => $vurl,
            'title' => get_field("ec_video_{$i}_title", $pid) ?: get_post_meta($pid, "ec_video_{$i}_title", true) ?: '',
            'thumb' => $vthumb,
        );
    }
}

// ── Snapshots (newline-separated URLs) ──
$snapshots_raw = get_field('ec_snapshots', $pid);
$snapshots = array();
if ($snapshots_raw && is_string($snapshots_raw)) {
    $snapshots = array_filter(array_map('trim', preg_split('/[\n\r]+/', $snapshots_raw)));
} elseif (is_array($snapshots_raw)) {
    $snapshots = $snapshots_raw;
}

// ── Testimonials ──
$testimonials = array();
for ($i = 1; $i <= 4; $i++) {
    $quote = get_field("ec_testi_{$i}_quote", $pid) ?: get_post_meta($pid, "ec_testi_{$i}_quote", true);
    if ($quote) {
        $testimonials[] = array(
            'quote' => $quote,
            'name'  => get_field("ec_testi_{$i}_name", $pid) ?: get_post_meta($pid, "ec_testi_{$i}_name", true) ?: '',
            'role'  => get_field("ec_testi_{$i}_role", $pid) ?: get_post_meta($pid, "ec_testi_{$i}_role", true) ?: '',
        );
    }
}

// ── Company ──
$company_name    = get_field('ec_company_name', $pid);
$company_desc    = get_field('ec_company_desc', $pid);
$company_logo    = get_field('ec_company_logo', $pid);
$company_logo_url = is_array($company_logo) ? $company_logo['url'] : (is_numeric($company_logo) ? wp_get_attachment_url($company_logo) : ($company_logo ?: ''));

// ── Linked Pages ──
$ceo_lander_url     = get_field('ec_ceo_lander_url', $pid);
$company_lander_url = get_field('ec_company_lander_url', $pid);
$articles_url       = get_field('ec_articles_url', $pid);

// (scores, snapshots, videos, testimonials parsed above)

// ── Published Content split: BY this contributor vs FEATURING ──
// Articles BY: explicit pr_author_ec join (set by /pr_author_ec ACF on the post)
$articles_by = get_posts(array(
    'post_type'      => 'post',
    'post_status'    => 'publish',
    'posts_per_page' => -1,
    'meta_key'       => 'pr_author_ec',
    'meta_value'     => $pid,
    'orderby'        => 'date',
    'order'          => 'DESC',
));
// Articles FEATURING: subject mention in title, last-name match, excludes by-list
$by_ids = array_map(function($a){ return $a->ID; }, $articles_by);
$articles_featuring = array();
$name_parts = explode(' ', $name);
$search_name = count($name_parts) >= 2 ? $name_parts[0] . ' ' . end($name_parts) : $name;
$article_search = get_posts(array(
    'post_type'      => 'post',
    'post_status'    => 'publish',
    'posts_per_page' => 12,
    's'              => $search_name,
    'orderby'        => 'date',
    'order'          => 'DESC',
    'post__not_in'   => $by_ids,
));
foreach ($article_search as $ap) {
    if (stripos($ap->post_title, $name_parts[count($name_parts)-1]) !== false) {
        $articles_featuring[] = $ap;
    }
}

// ── NEW: Network Mentions (IC contributors affiliated with this EC) ──
// This will be populated via API call to IC or stored as ACF field
$network_mentions = get_field('ec_network_mentions', $pid); // JSON array of {name, ic_url, episodes, photo_url}

// ── Connected Contributors (auto-derived from article co-mentions) ──
// For each article authored-by + featuring this EC, scan body for OTHER EC page names.
$current_pid = $pid;
$current_name_lower = strtolower($name);
$connected_pids = array();
$scan_articles = array_merge($articles_by, $articles_featuring);
if (!empty($scan_articles)) {
    // One-time fetch of every other EC's name + ID
    $ec_pages_q = get_posts(array(
        'post_type'      => 'page',
        'post_status'    => 'publish',
        'posts_per_page' => -1,
        'fields'         => 'ids',
        'meta_query'     => array(array('key' => '_wp_page_template', 'value' => 'page-expert-contributor.php')),
    ));
    $all_ecs = array();
    foreach ($ec_pages_q as $rid) {
        $title = get_the_title($rid);
        if (!$title || strlen($title) < 4) continue;
        // Strip "Expert Contributor" suffix variants for cleaner matching
        $cleanName = preg_replace('/\s*[—-]\s*Expert Contributor\s*$/i', '', $title);
        $cleanName = preg_replace('/\s+Expert Contributor\s*$/i', '', $cleanName);
        $all_ecs[$rid] = trim($cleanName);
    }
    foreach ($scan_articles as $art) {
        $body = mb_substr(strval($art->post_content), 0, 4000);
        $body = strip_tags($body);
        foreach ($all_ecs as $rid => $rname) {
            if ((int)$rid === (int)$current_pid) continue;
            if (isset($connected_pids[$rid])) continue;
            if (stripos($body, $rname) !== false) $connected_pids[$rid] = $rid;
        }
    }
}

$connected_contributors = array();
foreach ($connected_pids as $cid) {
    $co_post = get_post($cid);
    if (!$co_post) continue;
    $cclass = (string) get_post_meta($cid, 'contributor_class', true);
    $ctype  = (string) get_post_meta($cid, 'contributor_type', true);
    $headshot_id = get_post_thumbnail_id($cid);
    if (!$headshot_id) $headshot_id = (int) get_post_meta($cid, 'ec_headshot', true);
    $is_ec_co = ($cclass === 'expert_contributor') || in_array($ctype, array('ranked_ceo', 'ranked_partner', 'industry_leader'), true);
    $role = (string) get_post_meta($cid, 'ec_role_title', true);
    $company = (string) get_post_meta($cid, 'ec_company_name', true);
    $cleanName = preg_replace('/\s*[—-]\s*Expert Contributor\s*$/i', '', $co_post->post_title);
    $cleanName = preg_replace('/\s+Expert Contributor\s*$/i', '', $cleanName);
    $connected_contributors[] = array(
        'id'       => $cid,
        'name'     => trim($cleanName),
        'role'     => $role ?: ($is_ec_co ? 'Expert Contributor' : 'Contributor'),
        'company'  => $company,
        'headshot' => $headshot_id ? wp_get_attachment_image_url($headshot_id, 'thumbnail') : '',
        'url'      => get_permalink($cid),
        'is_ec'    => $is_ec_co,
    );
}
usort($connected_contributors, function($a, $b) {
    if ($a['is_ec'] !== $b['is_ec']) return $a['is_ec'] ? -1 : 1;
    return strcasecmp($a['name'], $b['name']);
});

// ── Split name for display ──
$name_words = explode(' ', $name);
$first_name = $name_words[0];
$last_name = count($name_words) > 1 ? implode(' ', array_slice($name_words, 1)) : '';

// ── Badge text + variation copy ──
// $contributor_type is normalized to one of: ranked_ceo | ranked_partner | industry_leader | contributor
if ($is_ranked_ceo && $power_rank) {
    $badge_text = "#$power_rank Ranked CEO · Power100 Expert Contributor";
} elseif ($is_ranked_ceo) {
    $badge_text = 'Ranked CEO · Power100 Expert Contributor';
} elseif ($is_partner) {
    $badge_text = 'Preferred Partner · Power100 Expert Contributor';
} elseif ($contributor_type === 'industry_leader') {
    $badge_text = 'Industry Leader · Power100 Expert Contributor';
} elseif ($is_contributor) {
    $badge_text = 'Power100 Contributor';
} else {
    $badge_text = 'Power100 Expert Contributor';
}

// Variation-driven copy. Contributor variation drops the "Expert" word and softens the proof-stack heading.
$why_headline_suffix = $is_contributor ? 'Stands Out' : 'Is The Expert';
$expert_profile_label = $is_contributor ? 'About' : 'The Expert Profile';
$power_verified_label = $is_contributor ? '★ CONTRIBUTOR' : '★ EXPERT';

// Parse credentials into array
$cred_list = array();
if ($credentials) {
    $cred_list = array_filter(array_map('trim', preg_split('/[\n\r]+/', $credentials)));
}

// Parse topics into array
$topic_list = array();
if ($contrib_topics) {
    $topic_list = array_filter(array_map('trim', preg_split('/[\n\r]+/', $contrib_topics)));
}

// Parse recognition into array (format: "emoji | text\nemoji | text")
$rec_list = array();
if ($recognition_raw) {
    $lines = array_filter(array_map('trim', preg_split('/[\n\r]+/', $recognition_raw)));
    foreach ($lines as $line) {
        $parts = array_map('trim', explode('|', $line, 2));
        if (count($parts) === 2) {
            $rec_list[] = array('icon' => $parts[0], 'text' => $parts[1]);
        } else {
            $rec_list[] = array('icon' => '🏆', 'text' => $line);
        }
    }
}
?>
<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
<meta charset="<?php bloginfo('charset'); ?>">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,600&family=Barlow+Condensed:wght@600;700;800;900&display=swap" rel="stylesheet">
<?php wp_head(); ?>
<style>
<?php include get_stylesheet_directory() . '/css/ec-lander.css'; ?>
/* Connected Contributors grid (cross-link guests ↔ ECs) — light theme */
.ec-connected-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 20px; margin-top: 32px; }
.ec-connected-card { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 24px 16px; background: #ffffff; border: 1px solid rgba(0,0,0,0.08); border-radius: 14px; text-decoration: none; transition: transform 0.2s, border-color 0.2s, box-shadow 0.2s; position: relative; box-shadow: 0 2px 6px rgba(0,0,0,0.04); }
.ec-connected-card:hover { transform: translateY(-3px); border-color: rgba(251,4,1,0.4); box-shadow: 0 8px 18px rgba(0,0,0,0.08); }
.ec-connected-photo { width: 96px; height: 96px; border-radius: 50%; background-size: cover; background-position: center; background-color: #f0f0f0; margin-bottom: 14px; flex-shrink: 0; border: 2px solid rgba(251,4,1,0.2); }
.ec-connected-photo.placeholder { display:flex; align-items:center; justify-content:center; font-weight:700; color:#999; font-size:24px; font-family: var(--font-display); }
.ec-connected-name { font-family: var(--font-body); font-weight: 700; font-size: 15px; color: #111; margin-bottom: 4px; line-height: 1.25; }
.ec-connected-role { font-size: 12px; color: rgba(0,0,0,0.55); line-height: 1.3; }
.ec-connected-badge { position: absolute; top: 10px; right: 10px; font-size: 9px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; padding: 3px 7px; border-radius: 4px; }
.ec-connected-badge.is-ec { background: rgba(251,4,1,0.12); color: #fb0401; border: 1px solid rgba(251,4,1,0.3); }
.ec-connected-badge.is-guest { background: rgba(0,0,0,0.05); color: rgba(0,0,0,0.6); border: 1px solid rgba(0,0,0,0.1); }
</style>
</head>
<body <?php body_class('ec-lander-page'); ?>>

<div class="ec-page p100-js-ready">

    <!-- ═══ HERO ═══ -->
    <section class="ec-hero">
        <div class="ec-hero-inner ec-inner">
            <div class="ec-hero-photo-col">
                <div class="ec-hero-photo-wrap">
                    <?php if ($headshot_url) : ?>
                    <img class="ec-hero-photo" src="<?php echo esc_url($headshot_url); ?>" alt="<?php echo esc_attr($name); ?>">
                    <?php else : ?>
                    <div class="ec-hero-photo" style="background: linear-gradient(135deg, var(--p-red), var(--p-red-deep)); display: flex; align-items: center; justify-content: center;">
                        <span style="font-size: 80px; font-weight: 900; color: #fff;"><?php echo esc_html(mb_substr($first_name, 0, 1)); ?></span>
                    </div>
                    <?php endif; ?>
                    <?php if ($is_ranked && $rank_number) : ?>
                    <div class="ec-hero-rank-badge ec-hero-rank-badge--<?php echo $is_ranked_ceo ? 'ceo' : 'partner'; ?>">
                        <span class="rank-num">#<?php echo esc_html($rank_number); ?></span>
                        <span class="rank-lbl">Ranked<br><?php echo $is_ranked_ceo ? 'CEO' : 'Partner'; ?></span>
                    </div>
                    <?php endif; ?>
                </div>
            </div>
            <div class="ec-hero-content">
                <div class="ec-hero-eyebrow">
                    <span class="ec-badge"><?php echo esc_html($badge_text); ?></span>
                </div>
                <h1 class="ec-hero-name"><?php echo esc_html($first_name); ?><br><span><?php echo esc_html($last_name); ?></span></h1>
                <?php if ($title_position) : ?>
                <p class="ec-hero-title"><?php echo esc_html($title_position); ?></p>
                <?php endif; ?>
                <?php if ($hero_quote) : ?>
                <blockquote class="ec-hero-quote"><?php echo esc_html($hero_quote); ?></blockquote>
                <?php endif; ?>
                <div class="ec-hero-links">
                    <?php if ($linkedin_url) : ?>
                    <a href="<?php echo esc_url($linkedin_url); ?>" target="_blank" rel="noopener" class="ec-btn ec-btn--outline">LinkedIn Profile</a>
                    <?php endif; ?>
                    <?php if ($website_url) : ?>
                    <a href="<?php echo esc_url($website_url); ?>" target="_blank" rel="noopener" class="ec-btn ec-btn--outline">Website</a>
                    <?php endif; ?>
                    <?php if ($ceo_lander_url) : ?>
                    <a href="<?php echo esc_url($ceo_lander_url); ?>" class="ec-btn ec-btn--outline">View Ranked Profile</a>
                    <?php endif; ?>
                </div>
            </div>
        </div>
    </section>

    <!-- ═══ STAT BAR ═══ -->
    <?php if ($stat_years || $stat_revenue || $stat_markets || $stat_custom_value) : ?>
    <section class="ec-statbar">
        <div class="ec-statbar-inner ec-inner">
            <?php if ($stat_years) : ?>
            <div class="ec-stat-item">
                <span class="ec-stat-value"><?php echo esc_html($stat_years); ?></span>
                <span class="ec-stat-label">Years in Industry</span>
            </div>
            <?php endif; ?>
            <?php if ($stat_revenue) : ?>
            <div class="ec-stat-item">
                <span class="ec-stat-value"><?php echo esc_html($stat_revenue); ?></span>
                <span class="ec-stat-label">Revenue Impact</span>
            </div>
            <?php endif; ?>
            <?php if ($stat_markets) : ?>
            <div class="ec-stat-item">
                <span class="ec-stat-value"><?php echo esc_html($stat_markets); ?></span>
                <span class="ec-stat-label">Markets Served</span>
            </div>
            <?php endif; ?>
            <?php if ($stat_custom_value) : ?>
            <div class="ec-stat-item">
                <span class="ec-stat-value"><?php echo esc_html($stat_custom_value); ?></span>
                <span class="ec-stat-label"><?php echo esc_html($stat_custom_label ?: 'Signature Metric'); ?></span>
            </div>
            <?php endif; ?>
            <?php if ($power_rank && $is_ranked_ceo) : ?>
            <div class="ec-stat-item">
                <span class="ec-stat-value">#<?php echo esc_html($power_rank); ?></span>
                <span class="ec-stat-label">National Power Ranking</span>
            </div>
            <?php else : ?>
            <div class="ec-stat-item">
                <span class="ec-stat-value" style="color:var(--p-gold)"><?php echo esc_html($power_verified_label); ?></span>
                <span class="ec-stat-label">Power100 Verified</span>
            </div>
            <?php endif; ?>
        </div>
    </section>
    <?php endif; ?>

    <!-- ═══ WHY / BIO ═══ -->
    <?php if ($expertise_bio || !empty($cred_list)) : ?>
    <section class="ec-why">
        <div class="ec-inner">
            <div class="ec-why-grid">
                <div class="ec-fade-up">
                    <span class="ec-section-label"><?php echo esc_html($expert_profile_label); ?></span>
                    <h2 class="ec-why-headline">Why <?php echo esc_html($first_name); ?> <?php echo esc_html($last_name); ?><br><span class="ec-red"><?php echo esc_html($why_headline_suffix); ?></span></h2>
                    <div class="ec-divider"></div>
                    <?php if ($expertise_bio) : ?>
                    <div class="ec-why-bio"><?php echo wp_kses_post($expertise_bio); ?></div>
                    <?php endif; ?>
                </div>
                <?php if (!empty($cred_list)) : ?>
                <div class="ec-cred-card ec-fade-up">
                    <div class="ec-cred-card-title">Key Credentials</div>
                    <ul class="ec-cred-list">
                        <?php foreach ($cred_list as $cred) : ?>
                        <li><?php echo esc_html($cred); ?></li>
                        <?php endforeach; ?>
                    </ul>
                </div>
                <?php endif; ?>
            </div>
        </div>
    </section>
    <?php endif; ?>

    <!-- ═══ DOMAIN MASTERY SCORES ═══ -->
    <?php if ($scores && is_array($scores)) : ?>
    <section class="ec-scores">
        <div class="ec-inner">
            <div class="ec-scores-intro ec-fade-up">
                <div>
                    <div class="ec-section-label">Expertise Ratings</div>
                    <h2 class="ec-scores-headline">Domain<br><span class="ec-red">Mastery</span><br>Scores</h2>
                </div>
                <p class="ec-scores-desc">Power100's evaluation of <?php echo esc_html($first_name); ?> <?php echo esc_html($last_name); ?>'s depth of expertise across the disciplines that define elite leadership in home improvement. Scored 1&ndash;10 based on verified performance, track record, and peer recognition.</p>
            </div>
            <div class="ec-score-grid">
                <?php foreach ($scores as $score) : ?>
                <div class="ec-score-row ec-fade-up">
                    <div class="ec-score-top">
                        <span class="ec-score-domain"><?php echo esc_html($score['domain']); ?></span>
                        <span class="ec-score-num"><?php echo esc_html($score['score']); ?><span class="ec-score-denom">/10</span></span>
                    </div>
                    <div class="ec-score-bar-track">
                        <div class="ec-score-bar-fill" style="width: <?php echo intval(floatval($score['score']) * 10); ?>%;"></div>
                    </div>
                </div>
                <?php endforeach; ?>
            </div>
        </div>
    </section>
    <?php endif; ?>

    <!-- ═══ VIDEOS ═══ -->
    <?php if ($videos && is_array($videos) && count($videos) > 0) : ?>
    <section class="ec-videos">
        <div class="ec-inner">
            <div class="ec-fade-up">
                <div class="ec-section-label">In Their Own Words</div>
                <h2 class="ec-videos-title"><?php echo esc_html($first_name); ?> <?php echo esc_html($last_name); ?><br><span class="ec-red">On Record</span></h2>
                <p class="ec-videos-sub">Interviews, conversations &amp; panels featuring <?php echo esc_html($first_name); ?> <?php echo esc_html($last_name); ?>.</p>
            </div>

            <?php
            $first_video = $videos[0];
            $first_yt_id = '';
            if (preg_match('/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]+)/', $first_video['url'] ?? '', $m)) $first_yt_id = $m[1];
            ?>

            <?php if ($first_yt_id) : ?>
            <div class="ec-video-featured ec-fade-up">
                <div class="ec-video-player" data-yt="<?php echo esc_attr($first_yt_id); ?>">
                    <img class="ec-video-thumb" src="https://img.youtube.com/vi/<?php echo esc_attr($first_yt_id); ?>/maxresdefault.jpg" alt="">
                    <div class="ec-play-btn"><svg width="24" height="24" viewBox="0 0 24 24" fill="white"><polygon points="8,5 19,12 8,19"/></svg></div>
                    <div class="ec-video-label"><?php echo esc_html($first_video['title'] ?? ''); ?></div>
                </div>
            </div>
            <?php endif; ?>

            <?php if (count($videos) > 1) : ?>
            <div class="ec-video-grid">
                <?php for ($v = 1; $v < count($videos); $v++) :
                    $vid = $videos[$v];
                    $yt_id = '';
                    if (preg_match('/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]+)/', $vid['url'] ?? '', $m)) $yt_id = $m[1];
                    if (!$yt_id) continue;
                ?>
                <div class="ec-video-card ec-fade-up">
                    <div class="ec-video-player" data-yt="<?php echo esc_attr($yt_id); ?>">
                        <img class="ec-video-thumb" src="https://img.youtube.com/vi/<?php echo esc_attr($yt_id); ?>/mqdefault.jpg" alt="">
                        <div class="ec-play-btn ec-play-btn--sm"><svg width="16" height="16" viewBox="0 0 24 24" fill="white"><polygon points="8,5 19,12 8,19"/></svg></div>
                    </div>
                    <div class="ec-video-card-title"><?php echo esc_html($vid['title'] ?? ''); ?></div>
                </div>
                <?php endfor; ?>
            </div>
            <?php endif; ?>
        </div>

        <!-- Video Modal -->
        <div class="ec-modal-overlay" id="ec-video-modal">
            <div class="ec-modal-inner">
                <button class="ec-modal-close">✕ Close</button>
                <div class="ec-modal-video-wrap"></div>
            </div>
        </div>
    </section>
    <?php endif; ?>

    <!-- ═══ EPISODE APPEARANCES (auto-collapses if zero IC episodes) ═══ -->
    <?php
    $episodes_partial = get_stylesheet_directory() . '/partials/contributor-episodes.php';
    if (file_exists($episodes_partial)) include $episodes_partial;
    ?>

    <!-- ═══ ARTICLES BY ═══ -->
    <?php if (!empty($articles_by)) : ?>
    <section class="ec-published-content">
        <div class="ec-inner">
            <div class="ec-fade-up">
                <span class="ec-section-label">Published <span class="ec-red">Content</span></span>
                <h2 style="font-family: var(--font-body); font-size: clamp(28px,3.5vw,44px); font-weight: 700; line-height: 1.1; margin-bottom: 40px;">Articles by <?php echo esc_html($first_name); ?></h2>
            </div>
            <div class="ec-articles-grid">
                <?php foreach ($articles_by as $article) :
                    $thumb = get_the_post_thumbnail_url($article->ID, 'p100-card');
                ?>
                <a href="<?php echo get_permalink($article); ?>" class="ec-article-card ec-fade-up">
                    <?php if ($thumb) : ?>
                    <div class="ec-article-thumb" style="background-image: url('<?php echo esc_url($thumb); ?>')"></div>
                    <?php endif; ?>
                    <div class="ec-article-body">
                        <span class="ec-article-date"><?php echo get_the_date('M j, Y', $article); ?></span>
                        <h3 class="ec-article-title"><?php echo esc_html($article->post_title); ?></h3>
                    </div>
                </a>
                <?php endforeach; ?>
            </div>
        </div>
    </section>
    <?php endif; ?>

    <!-- ═══ ARTICLES FEATURING ═══ -->
    <?php if (!empty($articles_featuring)) : ?>
    <section class="ec-published-content" style="padding-top: 0;">
        <div class="ec-inner">
            <div class="ec-fade-up">
                <span class="ec-section-label">Mentioned <span class="ec-red">In</span></span>
                <h2 style="font-family: var(--font-body); font-size: clamp(28px,3.5vw,44px); font-weight: 700; line-height: 1.1; margin-bottom: 40px;">Articles Featuring <?php echo esc_html($first_name); ?></h2>
            </div>
            <div class="ec-articles-grid">
                <?php foreach ($articles_featuring as $article) :
                    $thumb = get_the_post_thumbnail_url($article->ID, 'p100-card');
                ?>
                <a href="<?php echo get_permalink($article); ?>" class="ec-article-card ec-fade-up">
                    <?php if ($thumb) : ?>
                    <div class="ec-article-thumb" style="background-image: url('<?php echo esc_url($thumb); ?>')"></div>
                    <?php endif; ?>
                    <div class="ec-article-body">
                        <span class="ec-article-date"><?php echo get_the_date('M j, Y', $article); ?></span>
                        <h3 class="ec-article-title"><?php echo esc_html($article->post_title); ?></h3>
                    </div>
                </a>
                <?php endforeach; ?>
            </div>
        </div>
    </section>
    <?php endif; ?>

    <!-- ═══ CONNECTED CONTRIBUTORS (cross-link guests ↔ ECs) ═══ -->
    <?php if (!empty($connected_contributors)) : ?>
    <section class="ec-published-content" style="padding-top: 0;">
        <div class="ec-inner">
            <div class="ec-fade-up">
                <span class="ec-section-label">Connected <span class="ec-red">Network</span></span>
                <h2 style="font-family: var(--font-body); font-size: clamp(28px,3.5vw,44px); font-weight: 700; line-height: 1.1; margin-bottom: 16px;">Connected Contributors</h2>
                <p style="color: rgba(0,0,0,0.55); font-size: 14px; margin-bottom: 8px;">Co-mentions across Power100 published articles.</p>
            </div>
            <div class="ec-connected-grid">
                <?php foreach ($connected_contributors as $cc) :
                    $initials = strtoupper(substr($cc['name'], 0, 1));
                    if (strpos($cc['name'], ' ') !== false) $initials .= strtoupper(substr($cc['name'], strpos($cc['name'], ' ') + 1, 1));
                ?>
                <a href="<?php echo esc_url($cc['url']); ?>" class="ec-connected-card ec-fade-up">
                    <span class="ec-connected-badge <?php echo $cc['is_ec'] ? 'is-ec' : 'is-guest'; ?>"><?php echo $cc['is_ec'] ? 'EC' : 'Guest'; ?></span>
                    <?php if (!empty($cc['headshot'])) : ?>
                        <div class="ec-connected-photo" style="background-image: url('<?php echo esc_url($cc['headshot']); ?>')"></div>
                    <?php else : ?>
                        <div class="ec-connected-photo placeholder"><?php echo esc_html($initials); ?></div>
                    <?php endif; ?>
                    <div class="ec-connected-name"><?php echo esc_html($cc['name']); ?></div>
                    <div class="ec-connected-role"><?php echo esc_html($cc['company'] ?: $cc['role']); ?></div>
                </a>
                <?php endforeach; ?>
            </div>
        </div>
    </section>
    <?php endif; ?>

    <!-- ═══ NETWORK MENTIONS (NEW) ═══ -->
    <?php if ($network_mentions && is_array($network_mentions) && count($network_mentions) > 0) : ?>
    <section class="ec-network-mentions">
        <div class="ec-inner">
            <div class="ec-fade-up">
                <span class="ec-section-label">Network <span class="ec-red">Mentions</span></span>
                <h2 style="font-family: var(--font-body); font-size: clamp(28px,3.5vw,44px); font-weight: 700; color: var(--p-white); line-height: 1.1; margin-bottom: 12px;">Contributors Connected to <?php echo esc_html($first_name); ?></h2>
                <p style="font-size: 15px; color: rgba(255,255,255,0.6); margin-bottom: 40px;">Industry leaders who have appeared alongside <?php echo esc_html($name); ?> in Power100 productions.</p>
            </div>
            <div class="ec-mentions-grid">
                <?php foreach ($network_mentions as $mention) : ?>
                <a href="<?php echo esc_url($mention['ic_url'] ?? '#'); ?>" target="_blank" rel="noopener" class="ec-mention-card ec-fade-up">
                    <div class="ec-mention-photo">
                        <?php if (!empty($mention['photo_url'])) : ?>
                        <img src="<?php echo esc_url($mention['photo_url']); ?>" alt="">
                        <?php else : ?>
                        <span><?php echo esc_html(mb_substr($mention['name'] ?? '?', 0, 1)); ?></span>
                        <?php endif; ?>
                    </div>
                    <div class="ec-mention-info">
                        <div class="ec-mention-name"><?php echo esc_html($mention['name']); ?></div>
                        <?php if (!empty($mention['episodes'])) : ?>
                        <div class="ec-mention-meta"><?php echo intval($mention['episodes']); ?> shared episode<?php echo intval($mention['episodes']) > 1 ? 's' : ''; ?></div>
                        <?php endif; ?>
                    </div>
                </a>
                <?php endforeach; ?>
            </div>
        </div>
    </section>
    <?php endif; ?>

    <!-- ═══ RECOGNITION ═══ -->
    <?php if (!empty($rec_list)) : ?>
    <section class="ec-recognition">
        <div class="ec-inner">
            <div class="ec-fade-up">
                <div class="ec-section-label">Industry Recognition</div>
                <h2 class="ec-rec-headline">Achievements &amp;<br><span class="ec-red">Milestones</span></h2>
            </div>
            <div class="ec-recognition-grid">
                <?php foreach ($rec_list as $rec) : ?>
                <div class="ec-rec-item ec-fade-up">
                    <span class="ec-rec-icon"><?php echo $rec['icon']; ?></span>
                    <p class="ec-rec-text"><?php echo esc_html($rec['text']); ?></p>
                </div>
                <?php endforeach; ?>
            </div>
        </div>
    </section>
    <?php endif; ?>

    <!-- ═══ CONTRIBUTIONS / TOPICS ═══ -->
    <?php if (!empty($topic_list)) : ?>
    <section class="ec-contributions">
        <div class="ec-inner">
            <div class="ec-contrib-layout">
                <div class="ec-fade-up">
                    <div class="ec-section-label">Power100 Contributions</div>
                    <div class="ec-contrib-topics">
                        <?php foreach ($topic_list as $topic) : ?>
                        <span class="ec-topic-pill"><?php echo esc_html($topic); ?></span>
                        <?php endforeach; ?>
                    </div>
                </div>
                <div class="ec-fade-up ec-contrib-right">
                    <strong>What <?php echo esc_html($first_name); ?> <?php echo esc_html($last_name); ?> Brings to the Table</strong>
                    <?php if (!empty($contrib_description)) : ?>
                    <p><?php echo wp_kses_post($contrib_description); ?></p>
                    <?php else : ?>
                    <p><?php echo esc_html($first_name); ?> <?php echo esc_html($last_name); ?> brings specialized knowledge across these domains, backed by real-world results and industry recognition.</p>
                    <?php endif; ?>
                </div>
            </div>
        </div>
    </section>
    <?php endif; ?>

    <!-- ═══ TESTIMONIALS ═══ -->
    <?php if (!empty($testimonials)) : ?>
    <section class="ec-testimonials">
        <div class="ec-inner">
            <h2 class="ec-testimonials-title ec-fade-up">What Leaders<br><span class="ec-red">Are Saying</span></h2>
            <div class="ec-testi-grid">
                <?php foreach ($testimonials as $t) : ?>
                <div class="ec-testi-card ec-fade-up">
                    <div class="ec-testi-quote"><?php echo esc_html($t['quote']); ?></div>
                    <div class="ec-testi-name"><?php echo esc_html($t['name']); ?></div>
                    <div class="ec-testi-role"><?php echo esc_html($t['role']); ?></div>
                </div>
                <?php endforeach; ?>
            </div>
        </div>
    </section>
    <?php endif; ?>

    <!-- ═══ SNAPSHOTS ═══ -->
    <?php if (!empty($snapshots)) : ?>
    <section class="ec-snapshots">
        <div class="ec-inner">
            <div class="ec-section-label ec-snap-label">In The Field</div>
        </div>
        <div class="ec-snap-grid">
            <?php foreach ($snapshots as $snap_url) : ?>
            <div class="ec-snap-item">
                <img src="<?php echo esc_url($snap_url); ?>" alt="" loading="lazy">
            </div>
            <?php endforeach; ?>
        </div>
    </section>
    <?php endif; ?>

    <!-- ═══ COMPANY ═══ -->
    <?php if ($company_name) : ?>
    <section class="ec-company">
        <div class="ec-inner">
            <span class="ec-section-label">The Organization</span>
            <div class="ec-company-card ec-fade-up">
                <?php if ($company_logo_url) : ?>
                <div class="ec-company-logo"><img src="<?php echo esc_url($company_logo_url); ?>" alt="<?php echo esc_attr($company_name); ?>"></div>
                <?php endif; ?>
                <div>
                    <div class="ec-company-name-lbl"><?php echo esc_html($company_name); ?></div>
                    <?php if ($company_desc) : ?>
                    <div class="ec-company-desc-text"><?php echo wp_kses_post($company_desc); ?></div>
                    <?php endif; ?>
                </div>
                <div class="ec-company-links">
                    <?php if ($website_url) : ?>
                    <a href="<?php echo esc_url($website_url); ?>" target="_blank" rel="noopener" class="ec-btn--outline-dark">Visit Website</a>
                    <?php endif; ?>
                    <?php
                    // Conditional CTA based on normalized variation
                    if ($is_ranked_ceo && $ceo_lander_url) :
                    ?>
                    <a href="<?php echo esc_url($ceo_lander_url); ?>" class="ec-btn--outline-dark">CEO Profile</a>
                    <?php elseif ($is_partner && $company_lander_url) : ?>
                    <a href="<?php echo esc_url($company_lander_url); ?>" class="ec-btn--outline-dark">Partner Evaluation</a>
                    <?php elseif ($company_lander_url) : ?>
                    <a href="<?php echo esc_url($company_lander_url); ?>" class="ec-btn--outline-dark">Company Evaluation</a>
                    <?php endif; ?>
                </div>
            </div>
        </div>
    </section>
    <?php endif; ?>

    <!-- ═══ CTA ═══ -->
    <section class="ec-cta">
        <div class="ec-cta-inner ec-inner">
            <?php if ($is_ranked_ceo) : ?>
                <div class="ec-cta-eyebrow">Power100 Expert Network</div>
                <h2 class="ec-cta-headline">Read The Expert.</h2>
                <p class="ec-cta-sub"><?php echo esc_html($first_name); ?> <?php echo esc_html($last_name); ?> contributes to Power100's growing network of verified home improvement leaders. Read their insights, watch their interviews, and follow their work.</p>
                <div class="ec-cta-btns">
                    <a href="/become-an-expert-contributor/" class="ec-btn ec-btn--white">Become a Contributor</a>
                    <a href="/expert-contributors/" class="ec-btn ec-btn--ghost">View Contributors</a>
                    <a href="/national-power-rankings/" class="ec-btn ec-btn--ghost">View All Rankings</a>
                </div>
            <?php elseif ($is_partner) : ?>
                <div class="ec-cta-eyebrow">Power100 Expert Network</div>
                <h2 class="ec-cta-headline">Read The Expert.</h2>
                <p class="ec-cta-sub"><?php echo esc_html($first_name); ?> <?php echo esc_html($last_name); ?> contributes to Power100's growing network of verified home improvement leaders. Read their insights, watch their interviews, and follow their work.</p>
                <div class="ec-cta-btns">
                    <a href="/become-an-expert-contributor/" class="ec-btn ec-btn--white">Become a Contributor</a>
                    <a href="/expert-contributors/" class="ec-btn ec-btn--ghost">View Contributors</a>
                    <a href="/preferred-partners/" class="ec-btn ec-btn--ghost">View Top 15 Partners</a>
                </div>
            <?php elseif ($is_contributor) : ?>
                <div class="ec-cta-eyebrow">Power100 Contributors</div>
                <h2 class="ec-cta-headline">Watch their work.</h2>
                <p class="ec-cta-sub"><?php echo esc_html($first_name); ?> <?php echo esc_html($last_name); ?> shares their voice across the Power100 show network. Browse all of their episode appearances on Inner Circle, or explore other contributors shaping the home improvement conversation.</p>
                <div class="ec-cta-btns">
                    <a href="https://innercircle.power100.io/" class="ec-btn ec-btn--white">Watch on Inner Circle</a>
                    <a href="/expert-contributors/" class="ec-btn ec-btn--ghost">View Contributors</a>
                </div>
            <?php else : ?>
                <div class="ec-cta-eyebrow">Power100 Expert Contributors</div>
                <h2 class="ec-cta-headline">Ready to control<br>your narrative?</h2>
                <p class="ec-cta-sub">Join the ranks of industry leaders who are shaping the future of home improvement.</p>
                <div class="ec-cta-btns">
                    <a href="/become-an-expert-contributor/" class="ec-btn ec-btn--white">Become a Contributor</a>
                    <a href="/expert-contributors/" class="ec-btn ec-btn--ghost">View Contributors</a>
                    <a href="/power-rankings/" class="ec-btn ec-btn--ghost">View Rankings</a>
                </div>
            <?php endif; ?>
        </div>
    </section>

</div>

<!-- ═══ Video Modal JS ═══ -->
<script>
document.addEventListener('DOMContentLoaded', function() {
    // Add JS-ready class for animations
    document.querySelector('.ec-page')?.classList.add('p100-js-ready');

    // Intersection Observer for fade-in
    var observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.ec-fade-up').forEach(function(el) {
        observer.observe(el);
    });

    // Video modal
    var modal = document.getElementById('ec-video-modal');
    var videoWrap = modal ? modal.querySelector('.ec-modal-video-wrap') : null;
    var closeBtn = modal ? modal.querySelector('.ec-modal-close') : null;

    document.querySelectorAll('.ec-video-player').forEach(function(player) {
        player.addEventListener('click', function() {
            var ytId = this.getAttribute('data-yt');
            if (ytId && modal && videoWrap) {
                videoWrap.innerHTML = '<iframe src="https://www.youtube.com/embed/' + ytId + '?autoplay=1&rel=0" frameborder="0" allowfullscreen allow="autoplay; encrypted-media"></iframe>';
                modal.classList.add('active');
                document.body.style.overflow = 'hidden';
            }
        });
    });

    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            modal.classList.remove('active');
            videoWrap.innerHTML = '';
            document.body.style.overflow = '';
        });
    }
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                modal.classList.remove('active');
                videoWrap.innerHTML = '';
                document.body.style.overflow = '';
            }
        });
    }

    // Score bar animation
    document.querySelectorAll('.ec-score-bar-fill').forEach(function(bar) {
        var width = bar.style.width;
        bar.style.width = '0%';
        var obs = new IntersectionObserver(function(entries) {
            if (entries[0].isIntersecting) {
                bar.style.width = width;
                obs.unobserve(bar);
            }
        }, { threshold: 0.5 });
        obs.observe(bar);
    });
});
</script>

<?php wp_footer(); ?>
</body>
</html>
