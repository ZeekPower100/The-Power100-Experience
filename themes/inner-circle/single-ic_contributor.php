<?php
/**
 * Single Expert Contributor view (IC dark mirror).
 * 1:1 design parity with staging.power100.io page-expert-contributor.php.
 * Same DOM/CSS, dark theme via ec-lander-dark.css token swap.
 *
 * Gating: ic_require_membership() — non-members hit the membership wall.
 * SEO:    rel=canonical → _p100_source_url so Google credits Power100 as source.
 */
ic_require_membership();

if (have_posts()) the_post();

$pid     = get_the_ID();
$src_url = get_post_meta($pid, '_p100_source_url', true);

// ── Core fields (all written by upsertContributorLander() / mirrorToInnerCircle()) ──
$name             = get_post_meta($pid, 'ec_name', true) ?: get_the_title();
$title_position   = get_post_meta($pid, 'ec_title_position', true);
$hero_quote       = get_post_meta($pid, 'ec_hero_quote', true);
$linkedin_url     = get_post_meta($pid, 'ec_linkedin_url', true);
$website_url      = get_post_meta($pid, 'ec_website_url', true);
$power_rank       = get_post_meta($pid, 'ec_power_rank', true);
$contributor_type_raw = get_post_meta($pid, 'ec_contributor_type', true) ?: 'contributor';

// Normalize to canonical 4-variation set (matches P100 template)
$variation_map = array(
    'ceo' => 'ranked_ceo', 'ranked_ceo' => 'ranked_ceo',
    'partner' => 'ranked_partner', 'ranked_partner' => 'ranked_partner',
    'industry_leader' => 'industry_leader', 'advisory_board' => 'industry_leader',
    'contributor' => 'contributor',
);
$contributor_type = isset($variation_map[$contributor_type_raw]) ? $variation_map[$contributor_type_raw] : 'contributor';
$is_paid_ec     = in_array($contributor_type, array('ranked_ceo', 'ranked_partner', 'industry_leader'), true);
$is_ranked_ceo  = ($contributor_type === 'ranked_ceo');
$is_partner     = ($contributor_type === 'ranked_partner');
$is_contributor = ($contributor_type === 'contributor');

$expertise_bio   = get_post_meta($pid, 'ec_expertise_bio', true);
$credentials     = get_post_meta($pid, 'ec_credentials', true);
$contrib_topics  = get_post_meta($pid, 'ec_contrib_topics', true);
$contrib_description = get_post_meta($pid, 'ec_contrib_description', true);
$recognition_raw = get_post_meta($pid, 'ec_recognition', true);

// Stats
$stat_years        = get_post_meta($pid, 'ec_stat_years', true);
$stat_revenue      = get_post_meta($pid, 'ec_stat_revenue', true);
$stat_markets      = get_post_meta($pid, 'ec_stat_markets', true);
$stat_custom_label = get_post_meta($pid, 'ec_stat_custom_label', true);
$stat_custom_value = get_post_meta($pid, 'ec_stat_custom_value', true);

// Headshot — prefer the IC-side _thumbnail_id (sideloaded by the REST handler).
// Fall back to ec_headshot only if _thumbnail_id is missing — and even then, ONLY
// if the value is a valid IC attachment (P100 attachment IDs accidentally written
// here will resolve to wrong/garbage images on IC's media library).
$thumb_url = get_the_post_thumbnail_url($pid, 'large');
if ($thumb_url) {
    $headshot_url = $thumb_url;
} else {
    $hid = get_post_meta($pid, 'ec_headshot', true);
    $maybe = $hid ? wp_get_attachment_url($hid) : '';
    $headshot_url = $maybe ?: '';
}

// Company
$company_name      = get_post_meta($pid, 'ec_company_name', true);
$company_desc      = get_post_meta($pid, 'ec_company_desc', true);
$company_logo_id   = get_post_meta($pid, 'ec_company_logo', true);
$company_logo_url  = $company_logo_id ? wp_get_attachment_url($company_logo_id) : '';

// Linked pages on Power100
$ceo_lander_url     = get_post_meta($pid, 'ec_ceo_lander_url', true);
$company_lander_url = get_post_meta($pid, 'ec_company_lander_url', true);
$articles_url       = get_post_meta($pid, 'ec_articles_url', true);

// Scores (pipe-delimited)
$scores_raw = get_post_meta($pid, 'ec_scores', true);
$scores = array();
if ($scores_raw && is_string($scores_raw)) {
    foreach (array_filter(array_map('trim', preg_split('/[\n\r]+/', $scores_raw))) as $line) {
        $parts = array_map('trim', explode('|', $line));
        if (count($parts) >= 2) {
            $scores[] = array('domain' => $parts[0], 'score' => floatval($parts[1]));
        }
    }
}

// Snapshots
$snapshots_raw = get_post_meta($pid, 'ec_snapshots', true);
$snapshots = $snapshots_raw ? array_filter(array_map('trim', preg_split('/[\n\r]+/', $snapshots_raw))) : array();

// Videos (1-7)
$videos = array();
for ($i = 1; $i <= 7; $i++) {
    $vurl = get_post_meta($pid, "ec_video_{$i}_url", true);
    if ($vurl) {
        $vthumb_id = get_post_meta($pid, "ec_video_{$i}_thumb", true);
        $vthumb = $vthumb_id ? wp_get_attachment_url($vthumb_id) : '';
        if (!$vthumb && preg_match('/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]+)/', $vurl, $yt)) {
            $vthumb = 'https://img.youtube.com/vi/' . $yt[1] . '/maxresdefault.jpg';
        }
        $videos[] = array(
            'url'   => $vurl,
            'title' => get_post_meta($pid, "ec_video_{$i}_title", true) ?: '',
            'thumb' => $vthumb,
        );
    }
}

// Testimonials (1-4)
$testimonials = array();
for ($i = 1; $i <= 4; $i++) {
    $q = get_post_meta($pid, "ec_testi_{$i}_quote", true);
    if ($q) {
        $testimonials[] = array(
            'quote' => $q,
            'name'  => get_post_meta($pid, "ec_testi_{$i}_name", true),
            'role'  => get_post_meta($pid, "ec_testi_{$i}_role", true),
        );
    }
}

// Parse credentials/topics/recognition into arrays
$cred_list  = $credentials   ? array_filter(array_map('trim', preg_split('/[\n\r]+/', $credentials)))   : array();
$topic_list = $contrib_topics ? array_filter(array_map('trim', preg_split('/[\n\r]+/', $contrib_topics))) : array();
$rec_list   = array();
if ($recognition_raw) {
    foreach (array_filter(array_map('trim', preg_split('/[\n\r]+/', $recognition_raw))) as $line) {
        $parts = array_map('trim', explode('|', $line, 2));
        $rec_list[] = count($parts) === 2
            ? array('icon' => $parts[0], 'text' => $parts[1])
            : array('icon' => '🏆', 'text' => $line);
    }
}

// Name split
$nm_parts = explode(' ', $name);
$first_name = $nm_parts[0];
$last_name  = count($nm_parts) > 1 ? implode(' ', array_slice($nm_parts, 1)) : '';

// Variation-driven copy (same as P100)
$why_headline_suffix  = $is_contributor ? 'Stands Out' : 'Is The Expert';
$expert_profile_label = $is_contributor ? 'About' : 'The Expert Profile';
$power_verified_label = $is_contributor ? '★ CONTRIBUTOR' : '★ EXPERT';

// Badge text
if ($is_ranked_ceo && $power_rank)               $badge_text = "#$power_rank Ranked CEO · Power100 Expert Contributor";
elseif ($is_ranked_ceo)                          $badge_text = 'Ranked CEO · Power100 Expert Contributor';
elseif ($is_partner)                             $badge_text = 'Preferred Partner · Power100 Expert Contributor';
elseif ($contributor_type === 'industry_leader') $badge_text = 'Industry Leader · Power100 Expert Contributor';
elseif ($is_contributor)                         $badge_text = 'Power100 Contributor';
else                                             $badge_text = 'Power100 Expert Contributor';

// Articles BY this contributor (authoritative — explicit ic_author_contributor_id link).
// Joins to ic_article via the meta key our P100 → IC sync hook writes.
$articles_by = get_posts(array(
    'post_type'      => 'ic_article',
    'posts_per_page' => -1,
    'meta_key'       => 'ic_author_contributor_id',
    'meta_value'     => get_the_ID(),
    'orderby'        => 'date',
    'order'          => 'DESC',
));

// Articles FEATURING this contributor (subject-mention based, last-name match in title).
// Excludes anything already in the "by" list to avoid double display.
$by_ids = array_map(function($a){ return $a->ID; }, $articles_by);
$articles_featuring = array();
$last_name_only = $nm_parts[count($nm_parts) - 1] ?? $name;
$article_search = get_posts(array(
    'post_type'      => array('ic_article', 'post'),
    'posts_per_page' => 12,
    's'              => $name,
    'orderby'        => 'date',
    'order'          => 'DESC',
    'post__not_in'   => $by_ids,
));
foreach ($article_search as $ap) {
    if (stripos($ap->post_title, $last_name_only) !== false) $articles_featuring[] = $ap;
}

// Episodes (IC-side via ic_leader taxonomy)
$episodes_query = new WP_Query(array(
    'post_type'      => 'ic_content',
    'posts_per_page' => 9,
    'tax_query'      => array(array(
        'taxonomy' => 'ic_leader',
        'field'    => 'name',
        'terms'    => $name,
    )),
));
$episodes = $episodes_query->posts;
wp_reset_postdata();

// Connected contributors — co-appearances derived from shared episodes (ic_leader)
// + co-mentions in articles (ic_author_contributor_id author's articles' other mentioned contributors).
$current_pid = get_the_ID();
$current_name_lower = strtolower($name);
$connected_pids = array();

// (1) Episode co-appearances: walk each episode's ic_leader terms, dedupe by ic_contributor post lookup
foreach ($episodes as $ep) {
    $ep_leaders = wp_get_object_terms($ep->ID, 'ic_leader', array('fields' => 'names'));
    if (is_wp_error($ep_leaders)) continue;
    foreach ($ep_leaders as $lname) {
        if (strtolower($lname) === $current_name_lower) continue;
        $found = get_page_by_title($lname, OBJECT, 'ic_contributor');
        if ($found && $found->post_status === 'publish' && (int)$found->ID !== (int)$current_pid) {
            $connected_pids[$found->ID] = $found->ID;
        }
    }
}

// (2) Article co-mentions: for each article authored by current contributor, scan first 4000 chars
// for other contributor full-name matches and add to connected set.
$authored = get_posts(array(
    'post_type'      => 'ic_article',
    'posts_per_page' => -1,
    'meta_key'       => 'ic_author_contributor_id',
    'meta_value'     => $current_pid,
    'fields'         => 'ids',
));
if (!empty($authored)) {
    // One-time fetch of every other ic_contributor's name + ID — small enough corpus (~150 rows).
    static $all_contribs = null;
    if ($all_contribs === null) {
        $rows = get_posts(array('post_type' => 'ic_contributor', 'post_status' => 'publish', 'posts_per_page' => -1, 'fields' => 'ids'));
        $all_contribs = array();
        foreach ($rows as $rid) {
            $title = get_the_title($rid);
            if ($title && strlen($title) >= 4) $all_contribs[$rid] = $title;
        }
    }
    foreach ($authored as $aid) {
        $body = mb_substr(strval(get_post_field('post_content', $aid)), 0, 4000);
        $body = strip_tags($body);
        foreach ($all_contribs as $cid => $cname) {
            if ((int)$cid === (int)$current_pid) continue;
            if (isset($connected_pids[$cid])) continue;
            if (stripos($body, $cname) !== false) $connected_pids[$cid] = $cid;
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
    $connected_contributors[] = array(
        'id'       => $cid,
        'name'     => $co_post->post_title,
        'role'     => $role ?: ($is_ec_co ? 'Expert Contributor' : 'Contributor'),
        'company'  => $company,
        'headshot' => $headshot_id ? wp_get_attachment_image_url($headshot_id, 'thumbnail') : '',
        'url'      => get_permalink($cid),
        'is_ec'    => $is_ec_co,
    );
}
// Sort: ECs first, then alphabetical
usort($connected_contributors, function($a, $b) {
    if ($a['is_ec'] !== $b['is_ec']) return $a['is_ec'] ? -1 : 1;
    return strcasecmp($a['name'], $b['name']);
});

// URL helper — internal CTA links should go to Power100 main, NOT IC
function ic_ec_p100_link($path) {
    return 'https://power100.io' . $path;
}
?>
<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
<meta charset="<?php bloginfo('charset'); ?>">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title><?php echo esc_html(wp_get_document_title()); ?></title>
<?php if ($src_url): remove_action('wp_head', 'rel_canonical'); ?>
<link rel="canonical" href="<?php echo esc_url($src_url); ?>">
<?php endif; ?>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,600&family=Barlow+Condensed:wght@600;700;800;900&display=swap" rel="stylesheet">
<?php wp_head(); ?>
<style>
<?php
// Inline both stylesheets — base ec-lander.css (1:1 with P100) + dark theme overrides
include get_stylesheet_directory() . '/css/ec-lander.css';
include get_stylesheet_directory() . '/css/ec-lander-dark.css';
?>
/* Connected Contributors grid (cross-link guests ↔ ECs) */
.ec-connected-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 20px; margin-top: 32px; }
.ec-connected-card { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 24px 16px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; text-decoration: none; transition: transform 0.2s, border-color 0.2s, background 0.2s; position: relative; }
.ec-connected-card:hover { transform: translateY(-3px); border-color: rgba(251,4,1,0.4); background: rgba(255,255,255,0.05); }
.ec-connected-photo { width: 96px; height: 96px; border-radius: 50%; background-size: cover; background-position: center; background-color: #2a2a2a; margin-bottom: 14px; flex-shrink: 0; border: 2px solid rgba(251,4,1,0.25); }
.ec-connected-photo.placeholder { display:flex; align-items:center; justify-content:center; font-weight:700; color:#888; font-size:24px; font-family: var(--font-display); }
.ec-connected-name { font-family: var(--font-body); font-weight: 700; font-size: 15px; color: #fff; margin-bottom: 4px; line-height: 1.25; }
.ec-connected-role { font-size: 12px; color: rgba(255,255,255,0.55); line-height: 1.3; }
.ec-connected-badge { position: absolute; top: 10px; right: 10px; font-size: 9px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; padding: 3px 7px; border-radius: 4px; }
.ec-connected-badge.is-ec { background: rgba(251,4,1,0.18); color: #ff5d5b; border: 1px solid rgba(251,4,1,0.4); }
.ec-connected-badge.is-guest { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.7); border: 1px solid rgba(255,255,255,0.12); }
</style>
</head>
<body <?php body_class('ic-ec-lander ec-lander-page'); ?>>

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
                    <?php if ($power_rank && $is_ranked_ceo) : ?>
                    <div class="ec-hero-rank-badge">
                        <span class="rank-num"><?php echo esc_html($power_rank); ?></span>
                        <span class="rank-lbl">Ranked<br>CEO</span>
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
                    <a href="<?php echo esc_url($ceo_lander_url); ?>" target="_blank" rel="noopener" class="ec-btn ec-btn--outline">View Ranked Profile</a>
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
            <div class="ec-stat-item"><span class="ec-stat-value"><?php echo esc_html($stat_years); ?></span><span class="ec-stat-label">Years in Industry</span></div>
            <?php endif; ?>
            <?php if ($stat_revenue) : ?>
            <div class="ec-stat-item"><span class="ec-stat-value"><?php echo esc_html($stat_revenue); ?></span><span class="ec-stat-label">Revenue Impact</span></div>
            <?php endif; ?>
            <?php if ($stat_markets) : ?>
            <div class="ec-stat-item"><span class="ec-stat-value"><?php echo esc_html($stat_markets); ?></span><span class="ec-stat-label">Markets Served</span></div>
            <?php endif; ?>
            <?php if ($stat_custom_value) : ?>
            <div class="ec-stat-item"><span class="ec-stat-value"><?php echo esc_html($stat_custom_value); ?></span><span class="ec-stat-label"><?php echo esc_html($stat_custom_label ?: 'Signature Metric'); ?></span></div>
            <?php endif; ?>
            <?php if ($power_rank && $is_ranked_ceo) : ?>
            <div class="ec-stat-item"><span class="ec-stat-value">#<?php echo esc_html($power_rank); ?></span><span class="ec-stat-label">National Power Ranking</span></div>
            <?php else : ?>
            <div class="ec-stat-item"><span class="ec-stat-value" style="color:var(--p-gold)"><?php echo esc_html($power_verified_label); ?></span><span class="ec-stat-label">Power100 Verified</span></div>
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
    <?php if (!empty($scores)) : ?>
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
    <?php if (!empty($videos)) : ?>
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
        <div class="ec-modal-overlay" id="ec-video-modal">
            <div class="ec-modal-inner">
                <button class="ec-modal-close">✕ Close</button>
                <div class="ec-modal-video-wrap"></div>
            </div>
        </div>
    </section>
    <?php endif; ?>

    <!-- ═══ EPISODES (IC-side ic_content via ic_leader taxonomy) ═══ -->
    <?php if (!empty($episodes)) : ?>
    <section class="ec-episodes">
        <div class="ec-inner">
            <div class="ec-fade-up">
                <span class="ec-section-label">Episode Appearances</span>
                <h2 class="ec-rec-headline">Watch &amp;<br><span class="ec-red">Listen</span></h2>
            </div>
            <div class="ec-recognition-grid">
                <?php foreach ($episodes as $ep) :
                    $thumb = get_the_post_thumbnail_url($ep->ID, 'medium_large');
                    $show_terms = get_the_terms($ep->ID, 'ic_show');
                    $show_name = ($show_terms && !is_wp_error($show_terms)) ? $show_terms[0]->name : '';
                ?>
                <a href="<?php echo get_permalink($ep); ?>" class="ec-rec-item ec-fade-up" style="text-decoration:none;display:block;">
                    <?php if ($thumb) : ?>
                    <div style="aspect-ratio:16/9;background-image:url('<?php echo esc_url($thumb); ?>');background-size:cover;background-position:center;border-radius:4px;margin-bottom:12px;"></div>
                    <?php endif; ?>
                    <?php if ($show_name) : ?>
                    <div style="font-size:10px;font-weight:700;color:var(--p-gold);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:6px;"><?php echo esc_html($show_name); ?></div>
                    <?php endif; ?>
                    <p class="ec-rec-text" style="font-size:14px;font-weight:600;"><?php echo esc_html($ep->post_title); ?></p>
                </a>
                <?php endforeach; ?>
            </div>
        </div>
    </section>
    <?php endif; ?>

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
                    $thumb = get_the_post_thumbnail_url($article->ID, 'medium_large');
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
                    $thumb = get_the_post_thumbnail_url($article->ID, 'medium_large');
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
                <span class="ec-section-label"><?php echo $is_contributor ? 'Connected' : 'Featured'; ?> <span class="ec-red">Network</span></span>
                <h2 style="font-family: var(--font-body); font-size: clamp(28px,3.5vw,44px); font-weight: 700; line-height: 1.1; margin-bottom: 16px;">Connected Contributors</h2>
                <p style="color: rgba(255,255,255,0.55); font-size: 14px; margin-bottom: 8px;">Co-appearances on Power100 shows and articles.</p>
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
        <div class="ec-inner"><div class="ec-section-label ec-snap-label">In The Field</div></div>
        <div class="ec-snap-grid">
            <?php foreach ($snapshots as $snap_url) : ?>
            <div class="ec-snap-item"><img src="<?php echo esc_url($snap_url); ?>" alt="" loading="lazy"></div>
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
                    <?php if ($is_ranked_ceo && $ceo_lander_url) : ?>
                    <a href="<?php echo esc_url($ceo_lander_url); ?>" target="_blank" rel="noopener" class="ec-btn--outline-dark">CEO Profile</a>
                    <?php elseif ($is_partner && $company_lander_url) : ?>
                    <a href="<?php echo esc_url($company_lander_url); ?>" target="_blank" rel="noopener" class="ec-btn--outline-dark">Partner Evaluation</a>
                    <?php elseif ($company_lander_url) : ?>
                    <a href="<?php echo esc_url($company_lander_url); ?>" target="_blank" rel="noopener" class="ec-btn--outline-dark">Company Evaluation</a>
                    <?php endif; ?>
                </div>
            </div>
        </div>
    </section>
    <?php endif; ?>

    <!-- ═══ CTA — IC version (links go to power100.io for credibility paths) ═══ -->
    <section class="ec-cta">
        <div class="ec-cta-inner ec-inner">
            <?php if ($is_ranked_ceo) : ?>
                <div class="ec-cta-eyebrow">Power100 Expert Network</div>
                <h2 class="ec-cta-headline">Read The Expert.</h2>
                <p class="ec-cta-sub"><?php echo esc_html($first_name); ?> <?php echo esc_html($last_name); ?> contributes to Power100's growing network of verified home improvement leaders. Read their insights, watch their interviews, and follow their work.</p>
                <div class="ec-cta-btns">
                    <a href="<?php echo esc_url(ic_ec_p100_link('/become-an-expert-contributor/')); ?>" class="ec-btn ec-btn--white">Become a Contributor</a>
                    <a href="/contributors/" class="ec-btn ec-btn--ghost">View Contributors</a>
                    <a href="<?php echo esc_url(ic_ec_p100_link('/national-power-rankings/')); ?>" class="ec-btn ec-btn--ghost">View All Rankings</a>
                </div>
            <?php elseif ($is_partner) : ?>
                <div class="ec-cta-eyebrow">Power100 Expert Network</div>
                <h2 class="ec-cta-headline">Read The Expert.</h2>
                <p class="ec-cta-sub"><?php echo esc_html($first_name); ?> <?php echo esc_html($last_name); ?> contributes to Power100's growing network of verified home improvement leaders. Read their insights, watch their interviews, and follow their work.</p>
                <div class="ec-cta-btns">
                    <a href="<?php echo esc_url(ic_ec_p100_link('/become-an-expert-contributor/')); ?>" class="ec-btn ec-btn--white">Become a Contributor</a>
                    <a href="/contributors/" class="ec-btn ec-btn--ghost">View Contributors</a>
                    <a href="<?php echo esc_url(ic_ec_p100_link('/preferred-partners/')); ?>" class="ec-btn ec-btn--ghost">View Top 15 Partners</a>
                </div>
            <?php elseif ($is_contributor) : ?>
                <div class="ec-cta-eyebrow">Power100 Contributors</div>
                <h2 class="ec-cta-headline">Watch their work.</h2>
                <p class="ec-cta-sub"><?php echo esc_html($first_name); ?> <?php echo esc_html($last_name); ?> shares their voice across the Power100 show network. Browse all of their episode appearances, or explore other contributors shaping the home improvement conversation.</p>
                <div class="ec-cta-btns">
                    <a href="/" class="ec-btn ec-btn--white">Inner Circle Home</a>
                    <a href="/contributors/" class="ec-btn ec-btn--ghost">View Contributors</a>
                </div>
            <?php else : ?>
                <div class="ec-cta-eyebrow">Power100 Expert Contributors</div>
                <h2 class="ec-cta-headline">Ready to control<br>your narrative?</h2>
                <p class="ec-cta-sub">Join the ranks of industry leaders who are shaping the future of home improvement.</p>
                <div class="ec-cta-btns">
                    <a href="<?php echo esc_url(ic_ec_p100_link('/become-an-expert-contributor/')); ?>" class="ec-btn ec-btn--white">Become a Contributor</a>
                    <a href="/contributors/" class="ec-btn ec-btn--ghost">View Contributors</a>
                </div>
            <?php endif; ?>
        </div>
    </section>

</div>

<!-- ═══ Video Modal JS (1:1 with P100) ═══ -->
<script>
document.addEventListener('DOMContentLoaded', function() {
    document.querySelector('.ec-page')?.classList.add('p100-js-ready');

    // Fade-up observer
    var observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting) entry.target.classList.add('ec-visible');
        });
    }, { threshold: 0.15 });
    document.querySelectorAll('.ec-fade-up').forEach(function(el) { observer.observe(el); });

    // Video modal
    var modal = document.getElementById('ec-video-modal');
    var videoWrap = modal ? modal.querySelector('.ec-modal-video-wrap') : null;
    var closeBtn  = modal ? modal.querySelector('.ec-modal-close') : null;

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
    if (closeBtn) closeBtn.addEventListener('click', function() {
        modal.classList.remove('active'); videoWrap.innerHTML = ''; document.body.style.overflow = '';
    });
    if (modal) modal.addEventListener('click', function(e) {
        if (e.target === modal) { modal.classList.remove('active'); videoWrap.innerHTML = ''; document.body.style.overflow = ''; }
    });

    // Score bar animation
    document.querySelectorAll('.ec-score-bar-fill').forEach(function(bar) {
        var width = bar.style.width;
        bar.style.width = '0%';
        var obs = new IntersectionObserver(function(entries) {
            if (entries[0].isIntersecting) { bar.style.width = width; obs.unobserve(bar); }
        }, { threshold: 0.5 });
        obs.observe(bar);
    });
});
</script>

<?php
// ─── AI Persona Chat Panel (only for logged-in IC members) ────────────────
$persona_user = wp_get_current_user();
if ($persona_user && $persona_user->ID && defined('IC_PERSONA_BRIDGE_SECRET') && IC_PERSONA_BRIDGE_SECRET) {
    $persona_ts    = time();
    $persona_nonce = hash_hmac('sha256', $persona_user->ID . ':' . $persona_ts, IC_PERSONA_BRIDGE_SECRET);
    $persona_api   = defined('IC_PERSONA_API_BASE') ? IC_PERSONA_API_BASE : 'https://tpx.power100.io';
    $persona_headshot = '';
    $hs_id = get_post_thumbnail_id($post_id);
    if (!$hs_id) $hs_id = (int) get_post_meta($post_id, 'ec_headshot', true);
    if ($hs_id) $persona_headshot = wp_get_attachment_image_url($hs_id, 'thumbnail');
    $persona_role = (string) get_post_meta($post_id, 'ec_role_title', true);
    $persona_cfg = array(
        'icId'         => $post_id,
        'p100Id'       => (int) get_post_meta($post_id, '_p100_source_id', true),
        'name'         => $name,
        'firstName'    => $first_name,
        'role'         => $persona_role,
        'headshot'     => $persona_headshot,
        'memberWpId'   => (int) $persona_user->ID,
        'memberEmail'  => $persona_user->user_email,
        'bridgeTs'     => $persona_ts,
        'bridgeNonce'  => $persona_nonce,
        'apiBase'      => $persona_api,
    );
    ?>
    <link rel="stylesheet" href="<?php echo esc_url(get_stylesheet_directory_uri() . '/css/persona-panel.css?v=' . filemtime(get_stylesheet_directory() . '/css/persona-panel.css')); ?>">
    <script>window.ICPersonaConfig = <?php echo wp_json_encode($persona_cfg); ?>;</script>
    <script src="<?php echo esc_url(get_stylesheet_directory_uri() . '/js/persona-panel.js?v=' . filemtime(get_stylesheet_directory() . '/js/persona-panel.js')); ?>" defer></script>
    <?php
}
?>

<?php wp_footer(); ?>
</body>
</html>
