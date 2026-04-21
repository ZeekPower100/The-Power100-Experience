<?php
/**
 * Template Name: Show Guest Onboarding
 * Public onboarding form for show guests (Outside The Lines podcast).
 * - Public mode (no token): anyone with the URL can fill it out.
 * - Delegate mode (?delegation_token=XXX): an admin/EA completing on the guest's behalf.
 * Posts to https://tpx.power100.io/api/show-guests/*.
 * Spam mitigation: honeypot + noindex.
 */
?>
<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
<meta charset="<?php bloginfo('charset'); ?>">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex, nofollow">
<title>Show Guest Onboarding &ndash; Power 100</title>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
<?php wp_head(); ?>
<style>
.p100-sg * { box-sizing: border-box; }
.p100-sg { max-width: 780px; margin: 0 auto; padding: 48px 24px 80px; font-family: Poppins, sans-serif; color: #d4d4d4; }
.p100-sg .header { text-align: center; margin-bottom: 32px; }
.p100-sg .header img { width: 44px; margin-bottom: 18px; }
.p100-sg .header h1 { font-size: 30px; font-weight: 800; color: #fff; margin: 0 0 8px; letter-spacing: -0.5px; }
.p100-sg .header p { font-size: 14px; color: rgba(255,255,255,0.5); margin: 0; }
.p100-sg .show-badge { display: inline-block; background: rgba(251,4,1,0.1); color: #FB0401; font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; padding: 6px 14px; border-radius: 20px; margin-bottom: 20px; border: 1px solid rgba(251,4,1,0.25); }
.p100-sg .leader-info { background: rgba(42,42,42,0.4); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 18px 22px; margin-bottom: 28px; }
.p100-sg .leader-info h3 { color: #FB0401; font-size: 11px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; margin: 0 0 8px; }
.p100-sg .leader-info .lname { font-size: 17px; font-weight: 700; color: #fff; }
.p100-sg .leader-info .lmeta { font-size: 13px; color: rgba(255,255,255,0.5); margin-top: 2px; }

.p100-sg .progress-wrap { margin: 0 0 28px; }
.p100-sg .progress-labels { display: flex; justify-content: space-between; font-size: 11px; color: rgba(255,255,255,0.4); margin-bottom: 8px; letter-spacing: 1px; text-transform: uppercase; font-weight: 600; }
.p100-sg .progress-bar { height: 4px; background: rgba(255,255,255,0.08); border-radius: 2px; overflow: hidden; }
.p100-sg .progress-fill { height: 100%; background: #FB0401; width: 12%; transition: width 0.35s ease; }

.p100-sg .step { display: none; animation: sg-fade 0.25s ease; }
.p100-sg .step.active { display: block; }
@keyframes sg-fade { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }

.p100-sg .step-head { margin-bottom: 24px; }
.p100-sg .step-head h2 { font-size: 22px; font-weight: 700; color: #fff; margin: 0 0 6px; }
.p100-sg .step-head p { font-size: 13px; color: rgba(255,255,255,0.5); margin: 0; line-height: 1.6; }

.p100-sg .field { margin-bottom: 18px; }
.p100-sg .field label { display: block; font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.75); margin-bottom: 7px; letter-spacing: 0.3px; }
.p100-sg .field label .req { color: #FB0401; margin-left: 3px; }
.p100-sg .field input, .p100-sg .field textarea, .p100-sg .field select { width: 100%; padding: 13px 15px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: #fff; font-family: Poppins, sans-serif; font-size: 14px; transition: border-color 0.2s, background 0.2s; }
.p100-sg .field textarea { min-height: 130px; resize: vertical; line-height: 1.55; }
.p100-sg .field input:focus, .p100-sg .field textarea:focus, .p100-sg .field select:focus { outline: none; border-color: #FB0401; background: rgba(255,255,255,0.06); }
.p100-sg .field input:disabled { opacity: 0.55; cursor: not-allowed; }
.p100-sg .field .hint { font-size: 11px; color: rgba(255,255,255,0.4); margin-top: 6px; line-height: 1.55; }
.p100-sg .field.error input, .p100-sg .field.error textarea { border-color: #FB0401; }
.p100-sg .field-error { font-size: 11px; color: #FB0401; margin-top: 6px; display: none; }
.p100-sg .field.error .field-error { display: block; }

.p100-sg .drow { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

.p100-sg .mode-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 24px; }
.p100-sg .mode-card { padding: 22px 20px; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; background: rgba(255,255,255,0.03); cursor: pointer; transition: all 0.22s ease; text-align: left; font-family: Poppins, sans-serif; color: rgba(255,255,255,0.7); }
.p100-sg .mode-card:hover { border-color: rgba(255,255,255,0.25); color: #fff; background: rgba(255,255,255,0.045); }
.p100-sg .mode-card.selected { border-color: #FB0401; background: rgba(251,4,1,0.06); color: #fff; }
.p100-sg .mode-card .mtitle { font-size: 15px; font-weight: 700; color: #fff; margin-bottom: 6px; }
.p100-sg .mode-card .mdesc { font-size: 12.5px; color: rgba(255,255,255,0.5); line-height: 1.55; }

.p100-sg .geo-list { display: flex; flex-direction: column; gap: 10px; }
.p100-sg .geo-item { display: grid; grid-template-columns: 32px 1fr; gap: 10px; align-items: center; }
.p100-sg .geo-num { display: flex; align-items: center; justify-content: center; height: 40px; border-radius: 8px; background: rgba(251,4,1,0.08); color: #FB0401; font-weight: 700; font-size: 13px; border: 1px solid rgba(251,4,1,0.15); }
.p100-sg .geo-helper { background: rgba(251,4,1,0.05); border: 1px solid rgba(251,4,1,0.15); border-radius: 8px; padding: 14px 16px; margin-bottom: 18px; }
.p100-sg .geo-helper strong { color: #FB0401; font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; display: block; margin-bottom: 6px; }
.p100-sg .geo-helper p { font-size: 12.5px; color: rgba(255,255,255,0.6); margin: 0 0 4px; line-height: 1.55; }
.p100-sg .geo-helper em { color: rgba(255,255,255,0.85); font-style: normal; font-weight: 500; }

.p100-sg .repeater-item { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 16px 18px; margin-bottom: 14px; position: relative; }
.p100-sg .repeater-item .rm { position: absolute; top: 10px; right: 10px; background: rgba(251,4,1,0.1); color: #FB0401; border: 1px solid rgba(251,4,1,0.2); width: 26px; height: 26px; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 700; font-family: inherit; line-height: 1; display: flex; align-items: center; justify-content: center; }
.p100-sg .repeater-item .rm:hover { background: rgba(251,4,1,0.2); }
.p100-sg .add-btn { background: none; border: 1px dashed rgba(255,255,255,0.15); border-radius: 8px; padding: 12px 20px; color: rgba(255,255,255,0.6); font-family: Poppins, sans-serif; font-size: 13px; cursor: pointer; width: 100%; transition: border-color 0.2s, color 0.2s; }
.p100-sg .add-btn:hover { border-color: #FB0401; color: #FB0401; }

.p100-sg .headshot-drop { border: 2px dashed rgba(255,255,255,0.15); border-radius: 12px; padding: 32px 20px; text-align: center; cursor: pointer; transition: border-color 0.2s, background 0.2s; }
.p100-sg .headshot-drop:hover { border-color: #FB0401; background: rgba(251,4,1,0.04); }
.p100-sg .headshot-drop.dragover { border-color: #FB0401; background: rgba(251,4,1,0.08); }
.p100-sg .headshot-drop .icon { width: 48px; height: 48px; border-radius: 50%; background: rgba(251,4,1,0.1); color: #FB0401; margin: 0 auto 12px; display: flex; align-items: center; justify-content: center; font-size: 22px; font-weight: 700; }
.p100-sg .headshot-drop .title { color: #fff; font-weight: 600; font-size: 14px; margin-bottom: 4px; }
.p100-sg .headshot-drop .sub { color: rgba(255,255,255,0.4); font-size: 12px; }
.p100-sg .headshot-preview { margin-top: 18px; display: none; text-align: center; }
.p100-sg .headshot-preview.visible { display: block; }
.p100-sg .headshot-preview img { width: 140px; height: 140px; border-radius: 50%; object-fit: cover; border: 3px solid rgba(251,4,1,0.3); }
.p100-sg .headshot-preview .fname { color: rgba(255,255,255,0.55); font-size: 12px; margin-top: 10px; }
.p100-sg .headshot-preview .replace { display: inline-block; margin-top: 10px; color: #FB0401; font-size: 12px; text-decoration: underline; cursor: pointer; background: none; border: none; font-family: Poppins, sans-serif; }
.p100-sg .upload-status { font-size: 12px; color: rgba(255,255,255,0.5); margin-top: 10px; text-align: center; }
.p100-sg .upload-status.err { color: #FB0401; }

.p100-sg .nav-row { display: flex; gap: 12px; margin-top: 32px; }
.p100-sg .btn { flex: 1; padding: 14px 20px; border-radius: 10px; font-size: 14px; font-weight: 700; cursor: pointer; font-family: Poppins, sans-serif; transition: all 0.2s; border: none; letter-spacing: 0.3px; }
.p100-sg .btn-primary { background: #FB0401; color: #fff; }
.p100-sg .btn-primary:hover { background: #d40301; }
.p100-sg .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.p100-sg .btn-secondary { background: transparent; color: rgba(255,255,255,0.6); border: 1px solid rgba(255,255,255,0.15); }
.p100-sg .btn-secondary:hover { color: #fff; border-color: rgba(255,255,255,0.3); }

.p100-sg .success-state, .p100-sg .error-state { text-align: center; padding: 60px 24px; }
.p100-sg .success-state h2 { font-size: 28px; font-weight: 800; color: #fff; margin: 0 0 12px; }
.p100-sg .success-state p { font-size: 15px; color: rgba(255,255,255,0.55); line-height: 1.6; max-width: 480px; margin: 0 auto; }
.p100-sg .success-state .checkmark { width: 72px; height: 72px; border-radius: 50%; background: rgba(40,167,69,0.12); color: #28a745; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; font-size: 34px; font-weight: 700; }
.p100-sg .error-state h2 { color: #FB0401; font-size: 24px; font-weight: 800; margin: 0 0 10px; }
.p100-sg .error-state p { color: rgba(255,255,255,0.55); font-size: 14px; }

.p100-sg .honeypot { position: absolute; left: -9999px; top: -9999px; opacity: 0; pointer-events: none; height: 0; width: 0; overflow: hidden; }

body, html { background: #0c0c0c !important; }
.elementor, .elementor-inner, .elementor-section-wrap,
.elementor-element, .elementor-widget-container,
.elementor-page, .site-main,
.content-inner, .page-inner, .main-content,
article, .hentry, .type-page,
#primary, .primary,
.container, .site-content, .page-wrap,
#content, .content-area, .entry-content,
.post, .page, .single, .singular {
  background: #0c0c0c !important;
  margin: 0 !important;
  padding: 0 !important;
  border: none !important;
  box-shadow: none !important;
  max-width: 100% !important;
  width: 100% !important;
}
.header-wrap, footer#footer, footer.footer-wrap,
.site-header, .site-footer, #masthead, #colophon,
.sidebar, #secondary, .widget-area, aside,
.entry-title, .page-title, .post-title,
.entry-header, .page-header,
.breadcrumbs, .breadcrumb, .woocommerce-breadcrumb,
.comments-area, .post-navigation, .nav-links,
#sidebar, .right-sidebar, .left-sidebar,
.search-form, .recent-posts, .recent-comments {
  display: none !important;
}
.row, .columns, .column, .col-md-8, .col-md-4, .col-lg-8, .col-lg-4 {
  max-width: 100% !important;
  width: 100% !important;
  flex: 0 0 100% !important;
  padding: 0 !important;
  margin: 0 !important;
}

@media (max-width: 640px) {
  .p100-sg { padding: 28px 16px 60px; }
  .p100-sg .drow { grid-template-columns: 1fr; }
  .p100-sg .mode-grid { grid-template-columns: 1fr; }
  .p100-sg .header h1 { font-size: 24px; }
  .p100-sg .step-head h2 { font-size: 19px; }
  .p100-sg .nav-row { flex-direction: column-reverse; }
  .p100-sg .btn { width: 100%; }
}
</style>
</head>
<body style="margin:0;background:#0c0c0c;">

<div id="p100-sg-root"></div>

<script>
(function() {
  var s = document.createElement("script");
  // ?v= cache-buster — bump on each deploy so browsers fetch fresh.
  s.src = "https://tpx.power100.io/api/assets/show-guest-form.js?v=20260421-04";
  s.async = false;
  document.head.appendChild(s);
})();
</script>

<?php wp_footer(); ?>
</body>
</html>
