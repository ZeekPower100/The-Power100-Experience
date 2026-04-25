<?php
/**
 * Single Expert Contributor view (IC dark mirror).
 * Mirrors staging.power100.io page-expert-contributor.php structure with
 * IC dark-mode tokens. Same ec_* meta keys.
 *
 * Gating: ic_require_membership() — non-members hit the membership wall.
 * SEO: rel=canonical → _p100_source_url so Google credits Power100 as source.
 */
ic_require_membership();

if (have_posts()) the_post();

$pid = get_the_ID();
$src_url = get_post_meta($pid, '_p100_source_url', true);

// ── ec_* meta (all written by ic_rest_upsert_expert_contributor) ──
$name             = get_post_meta($pid, 'ec_name', true) ?: get_the_title();
$title_position   = get_post_meta($pid, 'ec_title_position', true);
$hero_quote       = get_post_meta($pid, 'ec_hero_quote', true);
$linkedin_url     = get_post_meta($pid, 'ec_linkedin_url', true);
$website_url      = get_post_meta($pid, 'ec_website_url', true);
$power_rank       = get_post_meta($pid, 'ec_power_rank', true);
$contributor_type_raw = get_post_meta($pid, 'ec_contributor_type', true) ?: 'contributor';

// Normalize legacy values
$variation_map = array(
    'ceo' => 'ranked_ceo', 'ranked_ceo' => 'ranked_ceo',
    'partner' => 'ranked_partner', 'ranked_partner' => 'ranked_partner',
    'industry_leader' => 'industry_leader', 'advisory_board' => 'industry_leader',
    'contributor' => 'contributor',
);
$contributor_type = isset($variation_map[$contributor_type_raw]) ? $variation_map[$contributor_type_raw] : 'contributor';
$is_ranked_ceo  = ($contributor_type === 'ranked_ceo');
$is_partner     = ($contributor_type === 'ranked_partner');
$is_contributor = ($contributor_type === 'contributor');

$expertise_bio   = get_post_meta($pid, 'ec_expertise_bio', true);
$credentials     = get_post_meta($pid, 'ec_credentials', true);
$contrib_topics  = get_post_meta($pid, 'ec_contrib_topics', true);
$recognition_raw = get_post_meta($pid, 'ec_recognition', true);

$stat_years      = get_post_meta($pid, 'ec_stat_years', true);
$stat_revenue    = get_post_meta($pid, 'ec_stat_revenue', true);
$stat_markets    = get_post_meta($pid, 'ec_stat_markets', true);
$stat_custom_l   = get_post_meta($pid, 'ec_stat_custom_label', true);
$stat_custom_v   = get_post_meta($pid, 'ec_stat_custom_value', true);

$company_name    = get_post_meta($pid, 'ec_company_name', true);
$company_desc    = get_post_meta($pid, 'ec_company_desc', true);

$headshot_id  = get_post_meta($pid, 'ec_headshot', true);
$headshot_url = $headshot_id ? wp_get_attachment_url($headshot_id) : get_the_post_thumbnail_url($pid, 'large');

// Videos
$videos = array();
for ($i = 1; $i <= 7; $i++) {
    $vurl = get_post_meta($pid, "ec_video_{$i}_url", true);
    if ($vurl) {
        $vtitle = get_post_meta($pid, "ec_video_{$i}_title", true);
        $yt_id = '';
        if (preg_match('/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]+)/', $vurl, $m)) $yt_id = $m[1];
        $videos[] = array('url' => $vurl, 'title' => $vtitle, 'yt_id' => $yt_id);
    }
}

// Testimonials
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

// Parse credentials/topics/recognition from newline-separated strings
$cred_list = $credentials ? array_filter(array_map('trim', preg_split('/[\n\r]+/', $credentials))) : array();
$topic_list = $contrib_topics ? array_filter(array_map('trim', preg_split('/[\n\r]+/', $contrib_topics))) : array();
$rec_list = array();
if ($recognition_raw) {
    foreach (array_filter(array_map('trim', preg_split('/[\n\r]+/', $recognition_raw))) as $line) {
        $parts = array_map('trim', explode('|', $line, 2));
        $rec_list[] = count($parts) === 2
            ? array('icon' => $parts[0], 'text' => $parts[1])
            : array('icon' => '🏆', 'text' => $line);
    }
}

// Name split for hero
$nm_parts = explode(' ', $name);
$first_name = $nm_parts[0];
$last_name = count($nm_parts) > 1 ? implode(' ', array_slice($nm_parts, 1)) : '';

// Variation-driven copy
$why_headline_suffix  = $is_contributor ? 'Stands Out' : 'Is The Expert';
$expert_profile_label = $is_contributor ? 'About' : 'The Expert Profile';

// Badge
if ($is_ranked_ceo && $power_rank)        $badge_text = "#$power_rank Ranked CEO · Power100 Expert Contributor";
elseif ($is_ranked_ceo)                   $badge_text = 'Ranked CEO · Power100 Expert Contributor';
elseif ($is_partner)                      $badge_text = 'Preferred Partner · Power100 Expert Contributor';
elseif ($contributor_type === 'industry_leader') $badge_text = 'Industry Leader · Power100 Expert Contributor';
elseif ($is_contributor)                  $badge_text = 'Power100 Contributor';
else                                      $badge_text = 'Power100 Expert Contributor';

// Episodes for this contributor — query IC ic_content directly via ic_leader taxonomy
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
?>
<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
<meta charset="<?php bloginfo('charset'); ?>">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title><?php echo esc_html(wp_get_document_title()); ?></title>
<?php if ($src_url): remove_action('wp_head', 'rel_canonical'); ?>
<link rel="canonical" href="<?php echo esc_url($src_url); ?>">
<?php endif; ?>
<?php wp_head(); ?>
<style>
:root {
    --ec-red: #FB0401; --ec-red-dark: #E50504;
    --ec-gold: #C8A951; --ec-gold-light: #E8D48B;
    --ec-bg: #0c0c0c; --ec-bg-2: #141414; --ec-bg-card: #1a1a1a;
    --ec-text: #fff; --ec-text-body: rgba(255,255,255,0.86);
    --ec-text-mute: rgba(255,255,255,0.55); --ec-text-subtle: rgba(255,255,255,0.4);
    --ec-border: rgba(255,255,255,0.08); --ec-border-strong: rgba(255,255,255,0.18);
    --ec-display: 'Barlow Condensed', 'Poppins', sans-serif;
    --ec-body: 'Poppins', sans-serif;
}
.ic-ec-page * { box-sizing: border-box; }
.ic-ec-page { background: var(--ec-bg); color: var(--ec-text-body); font-family: var(--ec-body); -webkit-font-smoothing: antialiased; overflow-x: hidden; min-height: 100vh; }
.ic-ec-page a { text-decoration: none; color: inherit; }
.ic-ec-page img { max-width: 100%; height: auto; display: block; }
.ic-ec-page h1, .ic-ec-page h2, .ic-ec-page h3 { margin: 0; color: var(--ec-text); font-family: var(--ec-display); }
.ic-ec-page p { margin: 0; }
.ic-ec-inner { max-width: 1280px; margin: 0 auto; padding: 0 32px; }

/* HERO */
.ic-ec-hero { padding: 80px 0 60px; background: linear-gradient(180deg, rgba(251,4,1,0.05) 0%, transparent 70%); border-bottom: 1px solid var(--ec-border); }
.ic-ec-hero-grid { display: grid; grid-template-columns: 280px 1fr; gap: 60px; align-items: center; }
.ic-ec-photo-wrap { position: relative; }
.ic-ec-photo { width: 280px; height: 280px; border-radius: 50%; object-fit: cover; border: 4px solid var(--ec-gold); box-shadow: 0 12px 40px rgba(0,0,0,0.5); }
.ic-ec-photo-fallback { width: 280px; height: 280px; border-radius: 50%; background: linear-gradient(135deg, var(--ec-red), var(--ec-red-dark)); display: flex; align-items: center; justify-content: center; font-size: 96px; font-weight: 900; color: #fff; border: 4px solid var(--ec-gold); }
.ic-ec-rank-badge { position: absolute; top: -10px; right: -10px; width: 88px; height: 88px; background: linear-gradient(135deg, var(--ec-red), var(--ec-red-dark)); border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; box-shadow: 0 8px 24px rgba(251,4,1,0.5); border: 3px solid var(--ec-bg); }
.ic-ec-rank-badge .rank-num { font-family: var(--ec-display); font-size: 32px; font-weight: 900; color: #fff; line-height: 1; }
.ic-ec-rank-badge .rank-lbl { font-size: 9px; font-weight: 700; color: #fff; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.2; text-align: center; margin-top: 2px; }
.ic-ec-badge { display: inline-block; padding: 6px 14px; background: rgba(200,169,81,0.12); color: var(--ec-gold); border: 1px solid rgba(200,169,81,0.4); border-radius: 999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 16px; }
.ic-ec-name { font-size: clamp(48px, 6vw, 96px); font-weight: 900; line-height: 0.95; margin-bottom: 12px; }
.ic-ec-name span { color: var(--ec-text-mute); font-weight: 700; }
.ic-ec-title-pos { font-size: 18px; color: var(--ec-text-mute); margin-bottom: 18px; }
.ic-ec-quote { font-size: 22px; font-style: italic; color: var(--ec-text); border-left: 3px solid var(--ec-red); padding-left: 18px; margin: 22px 0; line-height: 1.4; }
.ic-ec-hero-links { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 24px; }
.ic-ec-btn { display: inline-flex; align-items: center; padding: 12px 22px; border-radius: 4px; font-weight: 700; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; transition: all 0.2s; }
.ic-ec-btn--outline { background: transparent; color: var(--ec-text); border: 1px solid var(--ec-border-strong); }
.ic-ec-btn--outline:hover { background: var(--ec-text); color: var(--ec-bg); }
.ic-ec-btn--red { background: var(--ec-red); color: #fff; }
.ic-ec-btn--red:hover { background: var(--ec-red-dark); }

/* STAT BAR */
.ic-ec-stats { padding: 36px 0; border-bottom: 1px solid var(--ec-border); background: var(--ec-bg-2); }
.ic-ec-stats-grid { display: flex; flex-wrap: wrap; justify-content: space-around; gap: 24px; }
.ic-ec-stat { text-align: center; min-width: 140px; }
.ic-ec-stat-value { display: block; font-family: var(--ec-display); font-size: clamp(34px, 4vw, 56px); font-weight: 900; color: var(--ec-gold); line-height: 1; margin-bottom: 6px; }
.ic-ec-stat-label { font-size: 12px; color: var(--ec-text-mute); text-transform: uppercase; letter-spacing: 1px; }

/* SECTION */
.ic-ec-section { padding: 80px 0; border-bottom: 1px solid var(--ec-border); }
.ic-ec-section--alt { background: var(--ec-bg-2); }
.ic-ec-section-label { display: inline-block; font-size: 11px; font-weight: 700; color: var(--ec-gold); text-transform: uppercase; letter-spacing: 2px; margin-bottom: 16px; }
.ic-ec-headline { font-size: clamp(34px, 4vw, 56px); font-weight: 800; line-height: 1.05; margin-bottom: 24px; }
.ic-ec-headline .red { color: var(--ec-red); }
.ic-ec-divider { width: 60px; height: 3px; background: var(--ec-red); margin: 18px 0 28px; }
.ic-ec-bio { font-size: 16px; line-height: 1.7; color: var(--ec-text-body); }
.ic-ec-bio p { margin-bottom: 14px; }

/* WHY GRID */
.ic-ec-why-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 60px; align-items: start; }
.ic-ec-cred-card { background: var(--ec-bg-card); padding: 30px; border: 1px solid var(--ec-border); border-radius: 4px; }
.ic-ec-cred-card-title { font-family: var(--ec-display); font-size: 18px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: var(--ec-gold); margin-bottom: 16px; }
.ic-ec-cred-list { list-style: none; padding: 0; margin: 0; }
.ic-ec-cred-list li { padding: 10px 0; border-bottom: 1px solid var(--ec-border); font-size: 14px; color: var(--ec-text-body); }
.ic-ec-cred-list li:last-child { border-bottom: none; }
.ic-ec-cred-list li::before { content: "▸"; color: var(--ec-red); margin-right: 10px; }

/* TOPICS */
.ic-ec-topics { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 16px; }
.ic-ec-topic-pill { padding: 8px 16px; background: rgba(200,169,81,0.1); color: var(--ec-gold); border: 1px solid rgba(200,169,81,0.3); border-radius: 999px; font-size: 13px; font-weight: 600; }

/* RECOGNITION */
.ic-ec-rec-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-top: 24px; }
.ic-ec-rec-item { padding: 20px; background: var(--ec-bg-card); border: 1px solid var(--ec-border); border-radius: 4px; display: flex; gap: 14px; align-items: flex-start; }
.ic-ec-rec-icon { font-size: 24px; flex-shrink: 0; }
.ic-ec-rec-text { font-size: 14px; color: var(--ec-text-body); line-height: 1.5; }

/* VIDEOS */
.ic-ec-video-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
.ic-ec-video-card { display: block; background: var(--ec-bg-card); border: 1px solid var(--ec-border); border-radius: 4px; overflow: hidden; transition: border-color 0.2s, transform 0.2s; }
.ic-ec-video-card:hover { border-color: var(--ec-red); transform: translateY(-2px); }
.ic-ec-video-thumb { aspect-ratio: 16/9; background-size: cover; background-position: center; background-color: #000; position: relative; }
.ic-ec-video-play { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); width: 56px; height: 56px; background: rgba(251,4,1,0.92); border-radius: 50%; display: flex; align-items: center; justify-content: center; }
.ic-ec-video-title { padding: 14px 18px; font-family: var(--ec-display); font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--ec-text); }

/* EPISODES */
.ic-ec-eps-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
.ic-ec-ep-card { display: flex; flex-direction: column; background: var(--ec-bg-card); border: 1px solid var(--ec-border); border-radius: 4px; overflow: hidden; transition: border-color 0.2s, transform 0.2s; }
.ic-ec-ep-card:hover { border-color: var(--ec-red); transform: translateY(-2px); }
.ic-ec-ep-thumb { aspect-ratio: 16/9; background-size: cover; background-position: center; background-color: #000; position: relative; }
.ic-ec-ep-play { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); width: 50px; height: 50px; background: rgba(251,4,1,0.92); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; }
.ic-ec-ep-body { padding: 16px 18px 20px; }
.ic-ec-ep-show { display: inline-block; font-size: 10px; font-weight: 700; color: var(--ec-gold); text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 8px; }
.ic-ec-ep-title { font-family: var(--ec-body); font-size: 15px; font-weight: 700; line-height: 1.3; color: var(--ec-text); margin-bottom: 6px; }
.ic-ec-ep-excerpt { font-size: 13px; color: var(--ec-text-mute); line-height: 1.5; }

/* TESTIMONIALS */
.ic-ec-testi-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; margin-top: 24px; }
.ic-ec-testi-card { padding: 26px; background: var(--ec-bg-card); border: 1px solid var(--ec-border); border-radius: 4px; }
.ic-ec-testi-quote { font-size: 16px; line-height: 1.6; color: var(--ec-text); font-style: italic; margin-bottom: 14px; }
.ic-ec-testi-quote::before { content: '"'; color: var(--ec-gold); font-size: 36px; vertical-align: -10px; margin-right: 4px; }
.ic-ec-testi-name { font-weight: 700; color: var(--ec-text); font-size: 14px; }
.ic-ec-testi-role { font-size: 12px; color: var(--ec-text-mute); }

/* CTA */
.ic-ec-cta { padding: 80px 0; text-align: center; background: linear-gradient(135deg, rgba(251,4,1,0.08), rgba(200,169,81,0.08)); }
.ic-ec-cta h2 { font-size: clamp(34px, 4vw, 56px); font-weight: 800; margin-bottom: 16px; }
.ic-ec-cta p { font-size: 17px; color: var(--ec-text-mute); max-width: 600px; margin: 0 auto 28px; }

@media (max-width: 900px) {
    .ic-ec-hero-grid { grid-template-columns: 1fr; gap: 30px; text-align: center; }
    .ic-ec-photo-wrap { margin: 0 auto; }
    .ic-ec-why-grid { grid-template-columns: 1fr; gap: 30px; }
    .ic-ec-video-grid, .ic-ec-eps-grid { grid-template-columns: repeat(2, 1fr); }
    .ic-ec-testi-grid { grid-template-columns: 1fr; }
}
@media (max-width: 600px) {
    .ic-ec-video-grid, .ic-ec-eps-grid { grid-template-columns: 1fr; }
}
</style>
</head>
<body <?php body_class('ic-ec-page'); ?>>

<!-- HERO -->
<section class="ic-ec-hero">
    <div class="ic-ec-inner">
        <div class="ic-ec-hero-grid">
            <div class="ic-ec-photo-wrap">
                <?php if ($headshot_url): ?>
                <img class="ic-ec-photo" src="<?php echo esc_url($headshot_url); ?>" alt="<?php echo esc_attr($name); ?>">
                <?php else: ?>
                <div class="ic-ec-photo-fallback"><?php echo esc_html(mb_substr($first_name, 0, 1)); ?></div>
                <?php endif; ?>
                <?php if ($power_rank && $is_ranked_ceo): ?>
                <div class="ic-ec-rank-badge"><span class="rank-num"><?php echo esc_html($power_rank); ?></span><span class="rank-lbl">Ranked<br>CEO</span></div>
                <?php endif; ?>
            </div>
            <div>
                <span class="ic-ec-badge"><?php echo esc_html($badge_text); ?></span>
                <h1 class="ic-ec-name"><?php echo esc_html($first_name); ?><br><span><?php echo esc_html($last_name); ?></span></h1>
                <?php if ($title_position): ?><p class="ic-ec-title-pos"><?php echo esc_html($title_position); ?></p><?php endif; ?>
                <?php if ($hero_quote): ?><blockquote class="ic-ec-quote"><?php echo esc_html($hero_quote); ?></blockquote><?php endif; ?>
                <div class="ic-ec-hero-links">
                    <?php if ($linkedin_url): ?><a href="<?php echo esc_url($linkedin_url); ?>" target="_blank" rel="noopener" class="ic-ec-btn ic-ec-btn--outline">LinkedIn</a><?php endif; ?>
                    <?php if ($website_url): ?><a href="<?php echo esc_url($website_url); ?>" target="_blank" rel="noopener" class="ic-ec-btn ic-ec-btn--outline">Website</a><?php endif; ?>
                    <?php if ($src_url): ?><a href="<?php echo esc_url($src_url); ?>" target="_blank" rel="noopener" class="ic-ec-btn ic-ec-btn--outline">View on Power100 ↗</a><?php endif; ?>
                </div>
            </div>
        </div>
    </div>
</section>

<!-- STAT BAR -->
<?php if ($stat_years || $stat_revenue || $stat_markets || $stat_custom_v): ?>
<section class="ic-ec-stats">
    <div class="ic-ec-inner">
        <div class="ic-ec-stats-grid">
            <?php if ($stat_years): ?><div class="ic-ec-stat"><span class="ic-ec-stat-value"><?php echo esc_html($stat_years); ?></span><span class="ic-ec-stat-label">Years in Industry</span></div><?php endif; ?>
            <?php if ($stat_revenue): ?><div class="ic-ec-stat"><span class="ic-ec-stat-value"><?php echo esc_html($stat_revenue); ?></span><span class="ic-ec-stat-label">Revenue Impact</span></div><?php endif; ?>
            <?php if ($stat_markets): ?><div class="ic-ec-stat"><span class="ic-ec-stat-value"><?php echo esc_html($stat_markets); ?></span><span class="ic-ec-stat-label">Markets Served</span></div><?php endif; ?>
            <?php if ($stat_custom_v): ?><div class="ic-ec-stat"><span class="ic-ec-stat-value"><?php echo esc_html($stat_custom_v); ?></span><span class="ic-ec-stat-label"><?php echo esc_html($stat_custom_l ?: 'Signature Metric'); ?></span></div><?php endif; ?>
        </div>
    </div>
</section>
<?php endif; ?>

<!-- WHY -->
<?php if ($expertise_bio || !empty($cred_list)): ?>
<section class="ic-ec-section">
    <div class="ic-ec-inner">
        <div class="ic-ec-why-grid">
            <div>
                <span class="ic-ec-section-label"><?php echo esc_html($expert_profile_label); ?></span>
                <h2 class="ic-ec-headline">Why <?php echo esc_html($first_name); ?> <?php echo esc_html($last_name); ?><br><span class="red"><?php echo esc_html($why_headline_suffix); ?></span></h2>
                <div class="ic-ec-divider"></div>
                <?php if ($expertise_bio): ?><div class="ic-ec-bio"><?php echo wp_kses_post($expertise_bio); ?></div><?php endif; ?>
            </div>
            <?php if (!empty($cred_list)): ?>
            <div class="ic-ec-cred-card">
                <div class="ic-ec-cred-card-title">Key Credentials</div>
                <ul class="ic-ec-cred-list">
                    <?php foreach ($cred_list as $cred): ?><li><?php echo esc_html($cred); ?></li><?php endforeach; ?>
                </ul>
            </div>
            <?php endif; ?>
        </div>
    </div>
</section>
<?php endif; ?>

<!-- VIDEOS -->
<?php if (!empty($videos)): ?>
<section class="ic-ec-section ic-ec-section--alt">
    <div class="ic-ec-inner">
        <span class="ic-ec-section-label">In Their Own Words</span>
        <h2 class="ic-ec-headline"><?php echo esc_html($first_name); ?> <?php echo esc_html($last_name); ?><br><span class="red">On Record</span></h2>
        <div class="ic-ec-divider"></div>
        <div class="ic-ec-video-grid">
            <?php foreach ($videos as $v):
                $thumb = $v['yt_id'] ? "https://img.youtube.com/vi/{$v['yt_id']}/mqdefault.jpg" : '';
            ?>
            <a href="<?php echo esc_url($v['url']); ?>" target="_blank" rel="noopener" class="ic-ec-video-card">
                <div class="ic-ec-video-thumb"<?php if ($thumb): ?> style="background-image:url('<?php echo esc_url($thumb); ?>');"<?php endif; ?>>
                    <span class="ic-ec-video-play"><svg width="20" height="20" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg></span>
                </div>
                <?php if ($v['title']): ?><div class="ic-ec-video-title"><?php echo esc_html($v['title']); ?></div><?php endif; ?>
            </a>
            <?php endforeach; ?>
        </div>
    </div>
</section>
<?php endif; ?>

<!-- EPISODE APPEARANCES -->
<?php if (!empty($episodes)): ?>
<section class="ic-ec-section">
    <div class="ic-ec-inner">
        <span class="ic-ec-section-label">Episode <span style="color:var(--ec-red)">Appearances</span></span>
        <h2 class="ic-ec-headline"><?php echo esc_html($first_name); ?> <?php echo esc_html($last_name); ?> on<br><span class="red">Inner Circle Shows</span></h2>
        <div class="ic-ec-divider"></div>
        <div class="ic-ec-eps-grid">
            <?php foreach ($episodes as $ep):
                $thumb = get_the_post_thumbnail_url($ep->ID, 'medium_large');
                $shows = get_the_terms($ep->ID, 'ic_show');
                $show_name = ($shows && !is_wp_error($shows)) ? $shows[0]->name : '';
                $excerpt = get_the_excerpt($ep);
            ?>
            <a href="<?php echo get_permalink($ep); ?>" class="ic-ec-ep-card">
                <div class="ic-ec-ep-thumb"<?php if ($thumb): ?> style="background-image:url('<?php echo esc_url($thumb); ?>');"<?php endif; ?>>
                    <span class="ic-ec-ep-play"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg></span>
                </div>
                <div class="ic-ec-ep-body">
                    <?php if ($show_name): ?><span class="ic-ec-ep-show"><?php echo esc_html($show_name); ?></span><?php endif; ?>
                    <h3 class="ic-ec-ep-title"><?php echo esc_html(get_the_title($ep)); ?></h3>
                    <?php if ($excerpt): ?><p class="ic-ec-ep-excerpt"><?php echo esc_html(wp_trim_words($excerpt, 22)); ?></p><?php endif; ?>
                </div>
            </a>
            <?php endforeach; ?>
        </div>
    </div>
</section>
<?php endif; ?>

<!-- RECOGNITION -->
<?php if (!empty($rec_list)): ?>
<section class="ic-ec-section ic-ec-section--alt">
    <div class="ic-ec-inner">
        <span class="ic-ec-section-label">Industry Recognition</span>
        <h2 class="ic-ec-headline">Achievements &amp;<br><span class="red">Milestones</span></h2>
        <div class="ic-ec-divider"></div>
        <div class="ic-ec-rec-grid">
            <?php foreach ($rec_list as $rec): ?>
            <div class="ic-ec-rec-item"><span class="ic-ec-rec-icon"><?php echo $rec['icon']; ?></span><p class="ic-ec-rec-text"><?php echo esc_html($rec['text']); ?></p></div>
            <?php endforeach; ?>
        </div>
    </div>
</section>
<?php endif; ?>

<!-- TOPICS -->
<?php if (!empty($topic_list)): ?>
<section class="ic-ec-section">
    <div class="ic-ec-inner">
        <span class="ic-ec-section-label">Power100 Contributions</span>
        <h2 class="ic-ec-headline">What <?php echo esc_html($first_name); ?> Brings<br><span class="red">to the Table</span></h2>
        <div class="ic-ec-divider"></div>
        <div class="ic-ec-topics">
            <?php foreach ($topic_list as $topic): ?><span class="ic-ec-topic-pill"><?php echo esc_html($topic); ?></span><?php endforeach; ?>
        </div>
    </div>
</section>
<?php endif; ?>

<!-- TESTIMONIALS -->
<?php if (!empty($testimonials)): ?>
<section class="ic-ec-section ic-ec-section--alt">
    <div class="ic-ec-inner">
        <span class="ic-ec-section-label">What Leaders Are Saying</span>
        <h2 class="ic-ec-headline">In Their<br><span class="red">Own Words</span></h2>
        <div class="ic-ec-divider"></div>
        <div class="ic-ec-testi-grid">
            <?php foreach ($testimonials as $t): ?>
            <div class="ic-ec-testi-card">
                <p class="ic-ec-testi-quote"><?php echo esc_html($t['quote']); ?></p>
                <div class="ic-ec-testi-name"><?php echo esc_html($t['name']); ?></div>
                <?php if ($t['role']): ?><div class="ic-ec-testi-role"><?php echo esc_html($t['role']); ?></div><?php endif; ?>
            </div>
            <?php endforeach; ?>
        </div>
    </div>
</section>
<?php endif; ?>

<!-- COMPANY -->
<?php if ($company_name && $company_desc): ?>
<section class="ic-ec-section">
    <div class="ic-ec-inner">
        <span class="ic-ec-section-label">Company</span>
        <h2 class="ic-ec-headline"><?php echo esc_html($company_name); ?></h2>
        <div class="ic-ec-divider"></div>
        <div class="ic-ec-bio"><?php echo wp_kses_post($company_desc); ?></div>
    </div>
</section>
<?php endif; ?>

<!-- CTA -->
<section class="ic-ec-cta">
    <div class="ic-ec-inner">
        <?php if ($is_contributor): ?>
        <h2>Watch their work.</h2>
        <p><?php echo esc_html($first_name); ?> shares their voice across the Power100 show network. Browse all of their episode appearances above, or explore other contributors shaping the home improvement conversation.</p>
        <a href="/expert-contributors/" class="ic-ec-btn ic-ec-btn--red">Browse All Contributors</a>
        <?php else: ?>
        <h2>Read the Expert.</h2>
        <p><?php echo esc_html($first_name); ?> contributes to the Power100 network of verified home improvement leaders. View their full library of insights and interviews.</p>
        <a href="/expert-contributors/" class="ic-ec-btn ic-ec-btn--red">Browse All Contributors</a>
        <?php endif; ?>
    </div>
</section>

<?php wp_footer(); ?>
</body>
</html>
