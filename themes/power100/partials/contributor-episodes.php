<?php
/**
 * Contributor Episodes Section
 *
 * Renders "Episode Appearances" — IC episodes (ic_content posts) where this
 * contributor is tagged via the ic_leader taxonomy.
 *
 * Pulls from IC WP REST cached 1hr per name. Auto-collapses (renders nothing)
 * when zero episodes are returned, so it's safe to include on every variation.
 *
 * Required incoming variables (set by the parent template):
 *   $name        — full contributor name (e.g. "Nick Richmond")
 *   $first_name  — first name for headline
 *   $last_name   — last name for headline
 *
 * Episode data shape returned by fetch_ic_episodes_for_speaker():
 *   [ { id, title, link, excerpt, thumb, show, date }, ... ]
 *
 * Cache key: 'p100_ic_eps_' . md5(strtolower(trim($name)))   TTL: HOUR_IN_SECONDS
 */

if (!function_exists('p100_fetch_ic_episodes_for_speaker')) {
    /**
     * Look up IC episodes for a speaker by name. Cached 1 hour.
     * Returns [] on any failure so the calling template auto-collapses.
     */
    function p100_fetch_ic_episodes_for_speaker($name) {
        $name = trim((string) $name);
        if ($name === '') return array();

        $cache_key = 'p100_ic_eps_' . md5(strtolower($name));
        $cached = get_transient($cache_key);
        if ($cached !== false) return $cached;

        $ic_base = 'https://innercircle.power100.io/wp-json/wp/v2';
        $http_args = array('timeout' => 6, 'redirection' => 2);

        // Step 1: resolve the ic_leader term by slug. WP slugifies "Nick Richmond"
        // to "nick-richmond" — same rule we use here.
        $slug = sanitize_title($name);
        $term_url = $ic_base . '/ic_leader?slug=' . rawurlencode($slug) . '&_fields=id,name,slug,count';
        $term_resp = wp_remote_get($term_url, $http_args);
        if (is_wp_error($term_resp) || wp_remote_retrieve_response_code($term_resp) !== 200) {
            set_transient($cache_key, array(), HOUR_IN_SECONDS);
            return array();
        }
        $terms = json_decode(wp_remote_retrieve_body($term_resp), true);

        // Fallback: if exact slug miss, try a fuzzy search on the name.
        if (empty($terms) || !is_array($terms)) {
            $search_url = $ic_base . '/ic_leader?search=' . rawurlencode($name) . '&per_page=5&_fields=id,name,slug,count';
            $search_resp = wp_remote_get($search_url, $http_args);
            if (!is_wp_error($search_resp) && wp_remote_retrieve_response_code($search_resp) === 200) {
                $candidates = json_decode(wp_remote_retrieve_body($search_resp), true);
                if (is_array($candidates)) {
                    foreach ($candidates as $c) {
                        if (!empty($c['name']) && strcasecmp($c['name'], $name) === 0) {
                            $terms = array($c);
                            break;
                        }
                    }
                }
            }
        }
        if (empty($terms) || !is_array($terms) || empty($terms[0]['id'])) {
            set_transient($cache_key, array(), HOUR_IN_SECONDS);
            return array();
        }
        $term_id = intval($terms[0]['id']);
        if ($term_id <= 0) {
            set_transient($cache_key, array(), HOUR_IN_SECONDS);
            return array();
        }

        // Step 2: fetch ic_content posts tagged with this leader, embed featured
        // media + show taxonomy in one call to avoid N+1 lookups.
        $ep_url = $ic_base . '/ic_content?ic_leader=' . $term_id
            . '&per_page=12&orderby=date&order=desc&_embed=wp:featuredmedia,wp:term'
            . '&_fields=id,title,link,date,excerpt,featured_media,ic_show,_links,_embedded';
        $ep_resp = wp_remote_get($ep_url, $http_args);
        if (is_wp_error($ep_resp) || wp_remote_retrieve_response_code($ep_resp) !== 200) {
            set_transient($cache_key, array(), HOUR_IN_SECONDS);
            return array();
        }
        $eps_raw = json_decode(wp_remote_retrieve_body($ep_resp), true);
        if (!is_array($eps_raw)) {
            set_transient($cache_key, array(), HOUR_IN_SECONDS);
            return array();
        }

        $eps = array();
        foreach ($eps_raw as $ep) {
            $thumb = '';
            if (!empty($ep['_embedded']['wp:featuredmedia'][0]['source_url'])) {
                $thumb = $ep['_embedded']['wp:featuredmedia'][0]['source_url'];
            }
            $show_name = '';
            if (!empty($ep['_embedded']['wp:term'])) {
                foreach ($ep['_embedded']['wp:term'] as $tax_group) {
                    foreach ($tax_group as $term) {
                        if (!empty($term['taxonomy']) && $term['taxonomy'] === 'ic_show' && !empty($term['name'])) {
                            $show_name = $term['name'];
                            break 2;
                        }
                    }
                }
            }
            $eps[] = array(
                'id'      => intval($ep['id'] ?? 0),
                'title'   => isset($ep['title']['rendered']) ? html_entity_decode(wp_strip_all_tags($ep['title']['rendered']), ENT_QUOTES, 'UTF-8') : '',
                'link'    => $ep['link'] ?? '',
                'excerpt' => isset($ep['excerpt']['rendered']) ? trim(wp_strip_all_tags($ep['excerpt']['rendered'])) : '',
                'thumb'   => $thumb,
                'show'    => $show_name,
                'date'    => $ep['date'] ?? '',
            );
        }

        set_transient($cache_key, $eps, HOUR_IN_SECONDS);
        return $eps;
    }
}

$episodes = p100_fetch_ic_episodes_for_speaker($name);
if (empty($episodes)) return; // Auto-collapse — render nothing if no episodes
?>
<section class="ec-episodes">
    <div class="ec-inner">
        <div class="ec-fade-up">
            <span class="ec-section-label">Episode <span class="ec-red">Appearances</span></span>
            <h2 class="ec-episodes-title"><?php echo esc_html($first_name); ?> <?php echo esc_html($last_name); ?> on<br><span class="ec-red">Power100 Shows</span></h2>
            <p class="ec-episodes-sub">Conversations, interviews &amp; appearances featuring <?php echo esc_html($first_name); ?> across the Power100 show network.</p>
        </div>
        <div class="ec-episodes-grid">
            <?php foreach ($episodes as $ep) : ?>
            <a href="<?php echo esc_url($ep['link']); ?>" target="_blank" rel="noopener" class="ec-episode-card ec-fade-up">
                <?php if (!empty($ep['thumb'])) : ?>
                <div class="ec-episode-thumb" style="background-image: url('<?php echo esc_url($ep['thumb']); ?>');">
                    <span class="ec-episode-play"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg></span>
                </div>
                <?php else : ?>
                <div class="ec-episode-thumb ec-episode-thumb--placeholder">
                    <span class="ec-episode-play"><svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg></span>
                </div>
                <?php endif; ?>
                <div class="ec-episode-body">
                    <?php if (!empty($ep['show'])) : ?>
                    <span class="ec-episode-show"><?php echo esc_html($ep['show']); ?></span>
                    <?php endif; ?>
                    <h3 class="ec-episode-title"><?php echo esc_html($ep['title']); ?></h3>
                    <?php if (!empty($ep['excerpt'])) : ?>
                    <p class="ec-episode-excerpt"><?php echo esc_html(wp_trim_words($ep['excerpt'], 22)); ?></p>
                    <?php endif; ?>
                </div>
            </a>
            <?php endforeach; ?>
        </div>
    </div>
</section>
