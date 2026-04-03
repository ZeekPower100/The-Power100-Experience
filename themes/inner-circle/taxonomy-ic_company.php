<?php
/**
 * Template: Company Detail Page (View by Company)
 * Shows videos grouped by department (Sales, Marketing, CX, Operations) + Customers
 */
ic_require_membership();

$company = get_queried_object();
if (!$company || is_wp_error($company)) {
    wp_redirect(home_url());
    exit;
}

$company_name = $company->name;

// Department pillars to display
$departments = array(
    'sales' => 'Sales',
    'marketing' => 'Marketing',
    'customer-experience' => 'Customer Experience',
    'operations' => 'Operations',
);

// Fetch videos per department for this company
$dept_videos = array();
foreach ($departments as $slug => $label) {
    $posts = get_posts(array(
        'post_type' => 'ic_content',
        'posts_per_page' => 15,
        'orderby' => 'date',
        'order' => 'DESC',
        'tax_query' => array(
            'relation' => 'AND',
            array(
                'taxonomy' => 'ic_company',
                'field' => 'slug',
                'terms' => $company->slug,
            ),
            array(
                'taxonomy' => 'ic_pillar',
                'field' => 'slug',
                'terms' => $slug,
            ),
        ),
    ));
    if (!empty($posts)) {
        $dept_videos[$slug] = array('label' => $label, 'posts' => $posts);
    }
}

// Feature Interviews — company videos with "Feature Interview" or "Featured Interview" in the TITLE only
// These are the Greg 1-on-1 CEO interviews
$all_company_for_features = get_posts(array(
    'post_type' => 'ic_content',
    'posts_per_page' => 50,
    'orderby' => 'date',
    'order' => 'DESC',
    'tax_query' => array(array(
        'taxonomy' => 'ic_company',
        'field' => 'slug',
        'terms' => $company->slug,
    )),
));
$feature_interviews = array();
$feature_ids = array();
foreach ($all_company_for_features as $p) {
    $title_lower = strtolower($p->post_title);
    if (strpos($title_lower, 'feature interview') !== false || strpos($title_lower, 'featured interview') !== false) {
        $feature_interviews[] = $p;
        $feature_ids[] = $p->ID;
    }
}

// Customer testimonials — videos tagged with this company + customer-interviews show
$customer_videos = get_posts(array(
    'post_type' => 'ic_content',
    'posts_per_page' => 15,
    'orderby' => 'date',
    'order' => 'DESC',
    'tax_query' => array(
        'relation' => 'AND',
        array(
            'taxonomy' => 'ic_company',
            'field' => 'slug',
            'terms' => $company->slug,
        ),
        array(
            'taxonomy' => 'ic_show',
            'field' => 'slug',
            'terms' => 'customer-interviews',
        ),
    ),
));
$customer_ids = wp_list_pluck($customer_videos, 'ID');

// Fetch all company videos for "More From" row
$all_company_videos = get_posts(array(
    'post_type' => 'ic_content',
    'posts_per_page' => 50,
    'orderby' => 'date',
    'order' => 'DESC',
    'tax_query' => array(array(
        'taxonomy' => 'ic_company',
        'field' => 'slug',
        'terms' => $company->slug,
    )),
));

// Collect ALL IDs shown in other rows to exclude from "More From"
$shown_ids = array_merge($feature_ids, $customer_ids);
foreach ($dept_videos as $d) {
    foreach ($d['posts'] as $p) {
        $shown_ids[] = $p->ID;
    }
}
$uncategorized = array_filter($all_company_videos, function($p) use ($shown_ids) {
    return !in_array($p->ID, $shown_ids);
});

get_header();
?>

<main class="nfx-main">

    <!-- Breadcrumb -->
    <section class="nfx-breadcrumb">
        <div class="nfx-container">
            <a href="<?php echo home_url(); ?>" class="nfx-crumb-link">Home</a>
            <span class="nfx-crumb-sep">›</span>
            <span class="nfx-crumb-current"><?php echo esc_html($company_name); ?></span>
        </div>
    </section>

    <!-- Company Header -->
    <section class="nfx-company-header">
        <div class="nfx-container">
            <h1><?php echo esc_html($company_name); ?></h1>
            <p class="nfx-company-count"><?php echo count($all_company_videos); ?> video<?php echo count($all_company_videos) !== 1 ? 's' : ''; ?></p>
        </div>
    </section>

    <div class="nfx-rows">

        <?php if (!empty($feature_interviews)) : ?>
        <!-- Feature Interviews -->
        <section class="nfx-row">
            <div class="nfx-container">
                <div class="nfx-row-header">
                    <h2>Feature Interviews</h2>
                </div>
                <div class="nfx-carousel-wrap">
                    <button class="nfx-scroll-btn nfx-scroll-left" aria-label="Scroll left">‹</button>
                    <div class="nfx-carousel">
                        <?php foreach ($feature_interviews as $item) :
                            $GLOBALS['post'] = $item;
                            setup_postdata($item);
                            include(IC_THEME_DIR . '/template-parts/card-netflix.php');
                        endforeach;
                        wp_reset_postdata(); ?>
                    </div>
                    <button class="nfx-scroll-btn nfx-scroll-right" aria-label="Scroll right">›</button>
                </div>
            </div>
        </section>
        <?php endif; ?>

        <?php foreach ($dept_videos as $slug => $dept) : ?>
        <!-- Department Row: <?php echo esc_html($dept['label']); ?> -->
        <section class="nfx-row">
            <div class="nfx-container">
                <div class="nfx-row-header">
                    <h2>Hear From <?php echo esc_html($company_name); ?>'s <?php echo esc_html($dept['label']); ?> Department</h2>
                </div>
                <div class="nfx-carousel-wrap">
                    <button class="nfx-scroll-btn nfx-scroll-left" aria-label="Scroll left">‹</button>
                    <div class="nfx-carousel">
                        <?php foreach ($dept['posts'] as $item) :
                            $GLOBALS['post'] = $item;
                            setup_postdata($item);
                            include(IC_THEME_DIR . '/template-parts/card-netflix.php');
                        endforeach;
                        wp_reset_postdata(); ?>
                    </div>
                    <button class="nfx-scroll-btn nfx-scroll-right" aria-label="Scroll right">›</button>
                </div>
            </div>
        </section>
        <?php endforeach; ?>

        <?php if (!empty($customer_videos)) : ?>
        <!-- Customers -->
        <section class="nfx-row">
            <div class="nfx-container">
                <div class="nfx-row-header">
                    <h2>Hear From <?php echo esc_html($company_name); ?>'s Customers</h2>
                </div>
                <div class="nfx-carousel-wrap">
                    <button class="nfx-scroll-btn nfx-scroll-left" aria-label="Scroll left">‹</button>
                    <div class="nfx-carousel">
                        <?php foreach ($customer_videos as $item) :
                            $GLOBALS['post'] = $item;
                            setup_postdata($item);
                            include(IC_THEME_DIR . '/template-parts/card-netflix.php');
                        endforeach;
                        wp_reset_postdata(); ?>
                    </div>
                    <button class="nfx-scroll-btn nfx-scroll-right" aria-label="Scroll right">›</button>
                </div>
            </div>
        </section>
        <?php endif; ?>

        <?php if (!empty($uncategorized)) : ?>
        <!-- Uncategorized company videos -->
        <section class="nfx-row">
            <div class="nfx-container">
                <div class="nfx-row-header">
                    <h2>More From <?php echo esc_html($company_name); ?></h2>
                </div>
                <div class="nfx-carousel-wrap">
                    <button class="nfx-scroll-btn nfx-scroll-left" aria-label="Scroll left">‹</button>
                    <div class="nfx-carousel">
                        <?php foreach ($uncategorized as $item) :
                            $GLOBALS['post'] = $item;
                            setup_postdata($item);
                            include(IC_THEME_DIR . '/template-parts/card-netflix.php');
                        endforeach;
                        wp_reset_postdata(); ?>
                    </div>
                    <button class="nfx-scroll-btn nfx-scroll-right" aria-label="Scroll right">›</button>
                </div>
            </div>
        </section>
        <?php endif; ?>

    </div>

</main>

<!-- Carousel scroll JS (same as homepage) -->
<script>
document.addEventListener('DOMContentLoaded', function() {
    var header = document.querySelector('.ic-header-home');
    if (header) {
        window.addEventListener('scroll', function() {
            if (window.scrollY > 80) { header.classList.add('scrolled'); }
            else { header.classList.remove('scrolled'); }
        });
    }
    document.querySelectorAll('.nfx-carousel-wrap').forEach(function(wrap) {
        var carousel = wrap.querySelector('.nfx-carousel');
        var leftBtn = wrap.querySelector('.nfx-scroll-left');
        var rightBtn = wrap.querySelector('.nfx-scroll-right');
        var scrollAmount = carousel.offsetWidth * 0.75;
        function updateButtons() {
            leftBtn.style.opacity = carousel.scrollLeft <= 10 ? '0' : '1';
            leftBtn.style.pointerEvents = carousel.scrollLeft <= 10 ? 'none' : 'auto';
            var maxScroll = carousel.scrollWidth - carousel.offsetWidth - 10;
            rightBtn.style.opacity = carousel.scrollLeft >= maxScroll ? '0' : '1';
            rightBtn.style.pointerEvents = carousel.scrollLeft >= maxScroll ? 'none' : 'auto';
        }
        leftBtn.addEventListener('click', function() { carousel.scrollBy({ left: -scrollAmount, behavior: 'smooth' }); });
        rightBtn.addEventListener('click', function() { carousel.scrollBy({ left: scrollAmount, behavior: 'smooth' }); });
        carousel.addEventListener('scroll', updateButtons);
        updateButtons();
        window.addEventListener('resize', function() { scrollAmount = carousel.offsetWidth * 0.75; updateButtons(); });
    });
});
</script>

<?php get_footer(); ?>
