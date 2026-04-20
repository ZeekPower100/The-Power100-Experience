<?php
/**
 * Template Name: Show Guest Onboarding
 * Public, token-gated onboarding form for show guests (non-paying contributors).
 * Posts to https://tpx.power100.io/api/show-guests/*.
 */
?>
<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
<meta charset="<?php bloginfo('charset'); ?>">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Show Guest Onboarding &ndash; Power 100</title>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
<?php wp_head(); ?>
<style>
.p100-sg * { box-sizing: border-box; }
.p100-sg { max-width: 760px; margin: 0 auto; padding: 48px 24px 80px; font-family: Poppins, sans-serif; color: #d4d4d4; }
.p100-sg .header { text-align: center; margin-bottom: 32px; }
.p100-sg .header img { width: 44px; margin-bottom: 18px; }
.p100-sg .header h1 { font-size: 30px; font-weight: 800; color: #fff; margin: 0 0 8px; letter-spacing: -0.5px; }
.p100-sg .header p { font-size: 14px; color: rgba(255,255,255,0.5); margin: 0; }
.p100-sg .leader-info { background: rgba(42,42,42,0.4); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 20px 24px; margin-bottom: 28px; }
.p100-sg .leader-info h3 { color: #FB0401; font-size: 11px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; margin: 0 0 8px; }
.p100-sg .leader-info .lname { font-size: 18px; font-weight: 700; color: #fff; }
.p100-sg .leader-info .lmeta { font-size: 13px; color: rgba(255,255,255,0.5); }

.p100-sg .progress-wrap { margin: 0 0 28px; }
.p100-sg .progress-labels { display: flex; justify-content: space-between; font-size: 11px; color: rgba(255,255,255,0.4); margin-bottom: 8px; letter-spacing: 1px; text-transform: uppercase; font-weight: 600; }
.p100-sg .progress-bar { height: 4px; background: rgba(255,255,255,0.08); border-radius: 2px; overflow: hidden; }
.p100-sg .progress-fill { height: 100%; background: #FB0401; width: 20%; transition: width 0.35s ease; }

.p100-sg .step { display: none; animation: sg-fade 0.25s ease; }
.p100-sg .step.active { display: block; }
@keyframes sg-fade { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }

.p100-sg .step-head { margin-bottom: 24px; }
.p100-sg .step-head h2 { font-size: 22px; font-weight: 700; color: #fff; margin: 0 0 6px; }
.p100-sg .step-head p { font-size: 13px; color: rgba(255,255,255,0.45); margin: 0; line-height: 1.55; }

.p100-sg .field { margin-bottom: 18px; }
.p100-sg .field label { display: block; font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.75); margin-bottom: 7px; letter-spacing: 0.3px; }
.p100-sg .field label .req { color: #FB0401; margin-left: 3px; }
.p100-sg .field input, .p100-sg .field textarea { width: 100%; padding: 13px 15px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: #fff; font-family: Poppins, sans-serif; font-size: 14px; transition: border-color 0.2s, background 0.2s; }
.p100-sg .field textarea { min-height: 140px; resize: vertical; line-height: 1.55; }
.p100-sg .field input:focus, .p100-sg .field textarea:focus { outline: none; border-color: #FB0401; background: rgba(255,255,255,0.06); }
.p100-sg .field input:disabled { opacity: 0.55; cursor: not-allowed; }
.p100-sg .field .hint { font-size: 11px; color: rgba(255,255,255,0.35); margin-top: 6px; line-height: 1.5; }
.p100-sg .field.error input, .p100-sg .field.error textarea { border-color: #FB0401; }

.p100-sg .drow { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

.p100-sg .geo-list { display: flex; flex-direction: column; gap: 10px; }
.p100-sg .geo-item { display: grid; grid-template-columns: 32px 1fr; gap: 10px; align-items: center; }
.p100-sg .geo-num { display: flex; align-items: center; justify-content: center; height: 40px; border-radius: 8px; background: rgba(251,4,1,0.08); color: #FB0401; font-weight: 700; font-size: 13px; border: 1px solid rgba(251,4,1,0.15); }
.p100-sg .geo-input { width: 100%; padding: 11px 14px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: #fff; font-family: Poppins, sans-serif; font-size: 13.5px; }
.p100-sg .geo-input:focus { outline: none; border-color: #FB0401; background: rgba(255,255,255,0.06); }
.p100-sg .geo-helper { background: rgba(251,4,1,0.05); border: 1px solid rgba(251,4,1,0.15); border-radius: 8px; padding: 14px 16px; margin-bottom: 18px; }
.p100-sg .geo-helper strong { color: #FB0401; font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; display: block; margin-bottom: 6px; }
.p100-sg .geo-helper p { font-size: 12.5px; color: rgba(255,255,255,0.6); margin: 0 0 4px; line-height: 1.55; }
.p100-sg .geo-helper em { color: rgba(255,255,255,0.85); font-style: normal; font-weight: 500; }

.p100-sg .headshot-drop { border: 2px dashed rgba(255,255,255,0.15); border-radius: 12px; padding: 36px 20px; text-align: center; cursor: pointer; transition: border-color 0.2s, background 0.2s; }
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

/* Force dark background on theme containers */
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

@media (max-width: 600px) {
  .p100-sg { padding: 24px 16px 60px; }
  .p100-sg .drow { grid-template-columns: 1fr; }
  .p100-sg .header h1 { font-size: 24px; }
  .p100-sg .step-head h2 { font-size: 19px; }
  .p100-sg .nav-row { flex-direction: column-reverse; }
  .p100-sg .btn { width: 100%; }
}
</style>
</head>
<body style="margin:0;background:#0c0c0c;">
<div style="min-height:100vh;background:#0c0c0c;color:#d4d4d4;">
<div class="p100-sg">

  <div id="sgLoading" class="header">
    <img decoding="async" src="https://power100.io/wp-content/uploads/2026/01/Power100-Icon-Hi-Res-and-Large-1.png" alt="Power100">
    <h1>Loading&hellip;</h1>
    <p>Verifying your invite link</p>
  </div>

  <div id="sgError" class="error-state" style="display:none;">
    <img decoding="async" src="https://power100.io/wp-content/uploads/2026/01/Power100-Icon-Hi-Res-and-Large-1.png" alt="Power100" style="width:44px;margin-bottom:18px;">
    <h2>Invite Link Issue</h2>
    <p id="sgErrorMsg">This invite link is expired or invalid. Contact zeek@power100.io to request a new one.</p>
  </div>

  <div id="sgForm" style="display:none;">

    <div class="header">
      <img decoding="async" src="https://power100.io/wp-content/uploads/2026/01/Power100-Icon-Hi-Res-and-Large-1.png" alt="Power100">
      <h1>Welcome to the Inner Circle</h1>
      <p>Let&rsquo;s set up your contributor profile &mdash; takes about 5 minutes.</p>
    </div>

    <div class="leader-info">
      <h3>Building Profile For</h3>
      <div class="lname" id="sgLeaderName"></div>
      <div class="lmeta" id="sgLeaderMeta"></div>
    </div>

    <div class="progress-wrap">
      <div class="progress-labels">
        <span id="sgStepLabel">Step 1 of 5</span>
        <span id="sgStepTitle">Basic info</span>
      </div>
      <div class="progress-bar"><div class="progress-fill" id="sgProgressFill"></div></div>
    </div>

    <!-- STEP 1: Basic info -->
    <div class="step active" data-step="1">
      <div class="step-head">
        <h2>Basic information</h2>
        <p>Confirm your contact and company details. Name and email may already be filled in.</p>
      </div>
      <div class="drow">
        <div class="field"><label>First name<span class="req">*</span></label><input type="text" id="sgFirstName" maxlength="60"></div>
        <div class="field"><label>Last name<span class="req">*</span></label><input type="text" id="sgLastName" maxlength="60"></div>
      </div>
      <div class="field"><label>Email<span class="req">*</span></label><input type="email" id="sgEmail" maxlength="120" disabled><div class="hint">Locked &mdash; contact us if this needs to change.</div></div>
      <div class="drow">
        <div class="field"><label>Phone</label><input type="tel" id="sgPhone" maxlength="30" placeholder="(555) 123-4567"></div>
        <div class="field"><label>Title / position</label><input type="text" id="sgTitle" maxlength="120" placeholder="e.g. CEO, VP of Sales"></div>
      </div>
      <div class="field"><label>Company</label><input type="text" id="sgCompany" maxlength="150" placeholder="Your company name"></div>
    </div>

    <!-- STEP 2: Bio + hero quote -->
    <div class="step" data-step="2">
      <div class="step-head">
        <h2>Your story</h2>
        <p>A short bio and one signature quote. This powers your Inner Circle landing page.</p>
      </div>
      <div class="field">
        <label>Hero quote<span class="req">*</span></label>
        <input type="text" id="sgHeroQuote" maxlength="180" placeholder="One sentence that captures your philosophy or biggest belief.">
        <div class="hint">Up to ~150 characters. Think: a quote a reader would screenshot.</div>
      </div>
      <div class="field">
        <label>Bio<span class="req">*</span></label>
        <textarea id="sgBio" maxlength="4000" placeholder="A 300&ndash;500 word story: your journey, what you&rsquo;re known for, who you help, what drives you."></textarea>
        <div class="hint">~300&ndash;500 words recommended. Written in your own voice.</div>
      </div>
    </div>

    <!-- STEP 3: AI GEO long-tails -->
    <div class="step" data-step="3">
      <div class="step-head">
        <h2>AI GEO long-tail phrases</h2>
        <p>When someone asks ChatGPT, Perplexity, or Google&rsquo;s AI about your area of expertise &mdash; what question would surface you? List up to 10 long-tail phrases.</p>
      </div>
      <div class="geo-helper">
        <strong>Examples</strong>
        <p><em>&ldquo;In 2026, who are the top CEOs in the home improvement industry?&rdquo;</em></p>
        <p><em>&ldquo;Best companies for residential roofing in the Southeast?&rdquo;</em></p>
        <p><em>&ldquo;Who are the leading voices on contractor sales training?&rdquo;</em></p>
      </div>
      <div class="geo-list" id="sgGeoList"></div>
      <div class="hint" style="margin-top:14px;">Minimum 5 required, 10 recommended. Long-tail phrases (question-style) work best.</div>
    </div>

    <!-- STEP 4: Social links -->
    <div class="step" data-step="4">
      <div class="step-head">
        <h2>Social &amp; web links</h2>
        <p>Optional, but strongly recommended. These appear on your contributor page.</p>
      </div>
      <div class="field"><label>LinkedIn URL</label><input type="url" id="sgLinkedin" maxlength="300" placeholder="https://linkedin.com/in/yourhandle"></div>
      <div class="field"><label>Company website</label><input type="url" id="sgWebsite" maxlength="300" placeholder="https://yourcompany.com"></div>
    </div>

    <!-- STEP 5: Headshot -->
    <div class="step" data-step="5">
      <div class="step-head">
        <h2>Headshot</h2>
        <p>A clean, professional photo &mdash; square or portrait. This becomes the face of your Inner Circle profile.</p>
      </div>
      <label for="sgHeadshotFile" class="headshot-drop" id="sgHeadshotDrop">
        <div class="icon">+</div>
        <div class="title">Click to upload or drag &amp; drop</div>
        <div class="sub">JPG or PNG &mdash; max 10 MB</div>
        <input type="file" id="sgHeadshotFile" accept="image/jpeg,image/png,image/webp" style="display:none;">
      </label>
      <div class="headshot-preview" id="sgHeadshotPreview">
        <img id="sgHeadshotImg" alt="Headshot preview">
        <div class="fname" id="sgHeadshotFname"></div>
        <button type="button" class="replace" id="sgHeadshotReplace">Replace photo</button>
      </div>
      <div class="upload-status" id="sgUploadStatus"></div>
    </div>

    <div class="nav-row">
      <button type="button" class="btn btn-secondary" id="sgBackBtn" style="display:none;">Back</button>
      <button type="button" class="btn btn-primary" id="sgNextBtn">Next</button>
    </div>

  </div>

  <div id="sgSuccess" class="success-state" style="display:none;">
    <div class="checkmark">&#10003;</div>
    <h2>Profile submitted</h2>
    <p>Thank you! Your profile has been submitted. We&rsquo;ll notify you when your Inner Circle landing page goes live.</p>
  </div>

</div>
</div>

<script>
(function() {
  var params = new URLSearchParams(window.location.search);
  var token = params.get('token') || params.get('t');
  if (!token) {
    var pathParts = window.location.pathname.split('/').filter(Boolean);
    if (pathParts.length) {
      var last = pathParts[pathParts.length - 1];
      if (last && last.length >= 20 && /^[a-f0-9]+$/i.test(last)) { token = last; }
    }
  }
  var API = 'https://tpx.power100.io/api/show-guests';
  var STEP_TITLES = ['Basic info', 'Your story', 'AI GEO phrases', 'Social links', 'Headshot'];
  var TOTAL_STEPS = 5;
  var currentStep = 1;
  var contributor = null;
  var headshotUrl = '';

  if (!token) { showErr('No invite token found in the URL.'); return; }

  // Build GEO inputs (10 numbered rows)
  (function() {
    var list = document.getElementById('sgGeoList');
    for (var i = 1; i <= 10; i++) {
      var row = document.createElement('div');
      row.className = 'geo-item';
      var num = document.createElement('div');
      num.className = 'geo-num';
      num.textContent = String(i);
      var inp = document.createElement('input');
      inp.type = 'text';
      inp.className = 'geo-input';
      inp.maxLength = 180;
      inp.setAttribute('data-geo-idx', String(i));
      if (i <= 5) { inp.placeholder = 'Phrase ' + i + ' (required)'; }
      else { inp.placeholder = 'Phrase ' + i + ' (optional)'; }
      row.appendChild(num);
      row.appendChild(inp);
      list.appendChild(row);
    }
  })();

  // Fetch contributor on load
  fetch(API + '/token/' + encodeURIComponent(token))
    .then(function(r) { return r.json().then(function(j) { return { status: r.status, body: j }; }); })
    .then(function(wrap) {
      if (wrap.status !== 200) { showErr(wrap.body && wrap.body.error ? wrap.body.error : 'Invite link invalid or expired.'); return; }
      var data = wrap.body;
      if (!data.success) { showErr(data.error || 'Invite link invalid or expired.'); return; }
      contributor = data.contributor || {};
      prefill(contributor);
      document.getElementById('sgLoading').style.display = 'none';
      document.getElementById('sgForm').style.display = 'block';
      updateStepUI();
    })
    .catch(function(e) { showErr('Unable to load your profile. Please try again later.'); });

  function prefill(c) {
    document.getElementById('sgLeaderName').textContent = (c.first_name || '') + ' ' + (c.last_name || '');
    var meta = [];
    if (c.title_position) meta.push(c.title_position);
    if (c.company) meta.push(c.company);
    if (!meta.length) meta.push('New contributor');
    document.getElementById('sgLeaderMeta').textContent = meta.join(' &middot; ').replace('&middot;', '\u00b7');
    setVal('sgFirstName', c.first_name);
    setVal('sgLastName', c.last_name);
    setVal('sgEmail', c.email);
    setVal('sgPhone', c.phone);
    setVal('sgTitle', c.title_position);
    setVal('sgCompany', c.company);
    setVal('sgHeroQuote', c.hero_quote);
    setVal('sgBio', c.bio);
    setVal('sgLinkedin', c.linkedin_url);
    setVal('sgWebsite', c.website_url);
    // Prefill geo
    var kws = Array.isArray(c.geo_keywords) ? c.geo_keywords : [];
    if (typeof c.geo_keywords === 'string') {
      try { kws = JSON.parse(c.geo_keywords); } catch (e) { kws = []; }
    }
    for (var i = 0; i < kws.length && i < 10; i++) {
      var inp = document.querySelector('.geo-input[data-geo-idx="' + (i + 1) + '"]');
      if (inp) { inp.value = kws[i] || ''; }
    }
    // Prefill headshot
    if (c.headshot_url) {
      headshotUrl = c.headshot_url;
      showHeadshotPreview(c.headshot_url, 'Previously uploaded');
    }
  }
  function setVal(id, v) { var el = document.getElementById(id); if (el) { el.value = v || ''; } }
  function getVal(id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; }

  function showErr(msg) {
    document.getElementById('sgLoading').style.display = 'none';
    document.getElementById('sgError').style.display = 'block';
    document.getElementById('sgErrorMsg').textContent = msg;
  }

  function updateStepUI() {
    var steps = document.querySelectorAll('.p100-sg .step');
    steps.forEach(function(s) { s.classList.remove('active'); });
    var active = document.querySelector('.p100-sg .step[data-step="' + currentStep + '"]');
    if (active) { active.classList.add('active'); }
    document.getElementById('sgStepLabel').textContent = 'Step ' + currentStep + ' of ' + TOTAL_STEPS;
    document.getElementById('sgStepTitle').textContent = STEP_TITLES[currentStep - 1] || '';
    document.getElementById('sgProgressFill').style.width = (currentStep / TOTAL_STEPS * 100) + '%';
    document.getElementById('sgBackBtn').style.display = currentStep > 1 ? 'block' : 'none';
    document.getElementById('sgNextBtn').textContent = currentStep === TOTAL_STEPS ? 'Submit profile' : 'Next';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function validateStep(n) {
    var missing = [];
    if (n === 1) {
      if (!getVal('sgFirstName')) missing.push('First name');
      if (!getVal('sgLastName')) missing.push('Last name');
    } else if (n === 2) {
      if (!getVal('sgHeroQuote')) missing.push('Hero quote');
      if (!getVal('sgBio')) missing.push('Bio');
      if (getVal('sgBio').length < 80) {
        if (getVal('sgBio').length > 0) { missing.push('Bio (longer please &mdash; 300&ndash;500 words recommended)'); }
      }
    } else if (n === 3) {
      var filled = 0;
      document.querySelectorAll('.geo-input').forEach(function(inp) {
        if (inp.value.trim()) filled++;
      });
      if (filled < 5) missing.push('At least 5 AI GEO phrases (you have ' + filled + ')');
    } else if (n === 4) {
      var li = getVal('sgLinkedin');
      var ws = getVal('sgWebsite');
      if (li) {
        if (!/^https?:\/\//i.test(li)) missing.push('LinkedIn URL must start with http:// or https://');
      }
      if (ws) {
        if (!/^https?:\/\//i.test(ws)) missing.push('Website URL must start with http:// or https://');
      }
    } else if (n === 5) {
      if (!headshotUrl) missing.push('Headshot upload');
    }
    return missing;
  }

  document.getElementById('sgNextBtn').addEventListener('click', function() {
    var missing = validateStep(currentStep);
    if (missing.length) {
      alert('Please address the following:\n\n\u2022 ' + missing.join('\n\u2022 '));
      return;
    }
    if (currentStep < TOTAL_STEPS) {
      currentStep++;
      updateStepUI();
    } else {
      submitProfile();
    }
  });
  document.getElementById('sgBackBtn').addEventListener('click', function() {
    if (currentStep > 1) { currentStep--; updateStepUI(); }
  });

  // Headshot upload
  var dropZone = document.getElementById('sgHeadshotDrop');
  var fileInput = document.getElementById('sgHeadshotFile');
  var statusEl = document.getElementById('sgUploadStatus');

  dropZone.addEventListener('dragover', function(e) { e.preventDefault(); dropZone.classList.add('dragover'); });
  dropZone.addEventListener('dragleave', function() { dropZone.classList.remove('dragover'); });
  dropZone.addEventListener('drop', function(e) {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
      handleFile(e.dataTransfer.files[0]);
    }
  });
  fileInput.addEventListener('change', function() {
    if (fileInput.files && fileInput.files.length) { handleFile(fileInput.files[0]); }
  });
  document.getElementById('sgHeadshotReplace').addEventListener('click', function() {
    fileInput.value = '';
    fileInput.click();
  });

  function handleFile(file) {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      statusEl.textContent = 'File too large. Please choose an image under 10 MB.';
      statusEl.classList.add('err');
      return;
    }
    if (!/^image\//.test(file.type)) {
      statusEl.textContent = 'Please choose an image file (JPG, PNG, or WebP).';
      statusEl.classList.add('err');
      return;
    }
    statusEl.classList.remove('err');
    statusEl.textContent = 'Uploading\u2026';
    var fd = new FormData();
    fd.append('file', file);
    fd.append('title', 'Show Guest Headshot - ' + (contributor ? (contributor.first_name || '') + ' ' + (contributor.last_name || '') : 'unknown'));
    fetch('/wp-json/show-guest/v1/upload-headshot?token=' + encodeURIComponent(token), {
      method: 'POST',
      body: fd
    })
      .then(function(r) { return r.json().then(function(j) { return { status: r.status, body: j }; }); })
      .then(function(wrap) {
        if (wrap.status !== 200 || !wrap.body.success) {
          statusEl.textContent = (wrap.body && wrap.body.error) ? wrap.body.error : 'Upload failed. Please try again.';
          statusEl.classList.add('err');
          return;
        }
        headshotUrl = wrap.body.url;
        statusEl.classList.remove('err');
        statusEl.textContent = 'Uploaded successfully.';
        showHeadshotPreview(wrap.body.url, file.name);
      })
      .catch(function(e) {
        statusEl.textContent = 'Network error. Please try again.';
        statusEl.classList.add('err');
      });
  }

  function showHeadshotPreview(url, fname) {
    var wrap = document.getElementById('sgHeadshotPreview');
    document.getElementById('sgHeadshotImg').src = url;
    document.getElementById('sgHeadshotFname').textContent = fname || '';
    wrap.classList.add('visible');
  }

  function submitProfile() {
    var btn = document.getElementById('sgNextBtn');
    btn.disabled = true;
    btn.textContent = 'Submitting\u2026';
    var keywords = [];
    document.querySelectorAll('.geo-input').forEach(function(inp) {
      var v = inp.value.trim();
      if (v) keywords.push(v);
    });
    var payload = {
      first_name: getVal('sgFirstName'),
      last_name: getVal('sgLastName'),
      phone: getVal('sgPhone'),
      company: getVal('sgCompany'),
      title_position: getVal('sgTitle'),
      bio: getVal('sgBio'),
      hero_quote: getVal('sgHeroQuote'),
      linkedin_url: getVal('sgLinkedin'),
      website_url: getVal('sgWebsite'),
      headshot_url: headshotUrl,
      geo_keywords: keywords
    };
    fetch(API + '/token/' + encodeURIComponent(token) + '/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function(r) { return r.json().then(function(j) { return { status: r.status, body: j }; }); })
      .then(function(wrap) {
        if (wrap.status !== 200 || !wrap.body.success) {
          btn.disabled = false;
          btn.textContent = 'Submit profile';
          alert((wrap.body && wrap.body.error) ? wrap.body.error : 'Submission failed. Please try again.');
          return;
        }
        document.getElementById('sgForm').style.display = 'none';
        document.getElementById('sgSuccess').style.display = 'block';
        window.scrollTo({ top: 0, behavior: 'smooth' });
      })
      .catch(function(e) {
        btn.disabled = false;
        btn.textContent = 'Submit profile';
        alert('Network error. Please try again.');
      });
  }

})();
</script>
<?php wp_footer(); ?>
</body>
</html>
