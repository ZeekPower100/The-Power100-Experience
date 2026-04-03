/**
 * Creates or updates the /contributor-delegate/ page on power100.io
 * This page is where onboarding contacts complete profiles on behalf of leaders
 */
const axios = require('axios');
const WP_AUTH = 'Basic cG93ZXIxMDA6VjJ1YnpMcHQ3SW5aNmd1Z1o0ckVSN05X';
const LOGO = 'https://power100.io/wp-content/uploads/2026/01/Power100-Icon-Hi-Res-and-Large-1.png';

const css = `
.p100-delegate * { box-sizing: border-box; }
.p100-delegate { max-width: 800px; margin: 0 auto; padding: 40px 24px; font-family: Poppins, sans-serif; color: #d4d4d4; }
.p100-delegate .header { text-align: center; margin-bottom: 40px; }
.p100-delegate .header img { width: 40px; margin-bottom: 16px; }
.p100-delegate .header h1 { font-size: 28px; font-weight: 800; color: #fff; margin: 0 0 8px; }
.p100-delegate .header p { font-size: 14px; color: rgba(255,255,255,0.5); margin: 0; }
.p100-delegate .leader-info { background: rgba(42,42,42,0.4); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 20px 24px; margin-bottom: 32px; }
.p100-delegate .leader-info h3 { color: #FB0401; font-size: 11px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; margin: 0 0 8px; }
.p100-delegate .leader-info .lname { font-size: 18px; font-weight: 700; color: #fff; }
.p100-delegate .leader-info .lmeta { font-size: 13px; color: rgba(255,255,255,0.5); }
.p100-delegate .form-section { margin-bottom: 32px; }
.p100-delegate .form-section h2 { font-size: 18px; font-weight: 700; color: #fff; margin: 0 0 6px; }
.p100-delegate .form-section .desc { font-size: 13px; color: rgba(255,255,255,0.4); margin: 0 0 20px; }
.p100-delegate .field { margin-bottom: 16px; }
.p100-delegate .field label { display: block; font-size: 13px; font-weight: 500; color: rgba(255,255,255,0.7); margin-bottom: 6px; }
.p100-delegate .field input, .p100-delegate .field textarea { width: 100%; padding: 12px 14px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: #fff; font-family: Poppins, sans-serif; font-size: 14px; }
.p100-delegate .field textarea { min-height: 100px; resize: vertical; }
.p100-delegate .field input:focus, .p100-delegate .field textarea:focus { outline: none; border-color: #FB0401; }
.p100-delegate .drow { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.p100-delegate .hint { font-size: 11px; color: rgba(255,255,255,0.3); margin-top: 4px; }
.p100-delegate .submit-btn { display: block; width: 100%; padding: 16px; background: #FB0401; color: #fff; border: none; border-radius: 10px; font-size: 16px; font-weight: 700; cursor: pointer; font-family: Poppins, sans-serif; margin-top: 32px; }
.p100-delegate .submit-btn:hover { background: #d40301; }
.p100-delegate .submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.p100-delegate .success-state { text-align: center; padding: 60px 24px; }
.p100-delegate .success-state h2 { font-size: 28px; font-weight: 800; color: #fff; margin: 0 0 12px; }
.p100-delegate .success-state p { font-size: 15px; color: rgba(255,255,255,0.5); }
.p100-delegate .error-state { text-align: center; padding: 60px 24px; }
.p100-delegate .error-state h2 { color: #FB0401; font-size: 24px; font-weight: 800; }
/* Force dark background on ALL theme containers */
body, html { background: #0c0c0c !important; }
.elementor, .elementor-inner, .elementor-section-wrap,
.elementor-element, .elementor-widget-container,
.elementor-page, .site-main,
.content-inner, .page-inner, .main-content,
article, .hentry, .type-page,
.jesuspended-content, #primary, .primary,
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
/* Hide ALL WP/theme chrome */
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
/* Remove any white border/padding from theme wrappers */
.row, .columns, .column, .col-md-8, .col-md-4, .col-lg-8, .col-lg-4 {
  max-width: 100% !important;
  width: 100% !important;
  flex: 0 0 100% !important;
  padding: 0 !important;
  margin: 0 !important;
}
.p100-delegate .dlg-tier-card { padding:14px 18px; border:1px solid rgba(255,255,255,0.1); border-radius:8px; background:rgba(255,255,255,0.03); color:rgba(255,255,255,0.5); font-family:Poppins,sans-serif; font-size:14px; font-weight:500; cursor:pointer; transition:all 0.25s ease; text-align:center; }
.p100-delegate .dlg-tier-card:hover { border-color:rgba(255,255,255,0.2); color:#fff; }
.p100-delegate .dlg-tier-card.selected { border-color:#FB0401; background:rgba(251,4,1,0.06); color:#fff; }
.p100-delegate .dlg-tier-name { font-size:15px; font-weight:700; color:#fff; margin-bottom:4px; }
.p100-delegate .dlg-tier-time { font-size:11px; color:#FB0401; font-weight:500; margin-bottom:8px; }
.p100-delegate .dlg-tier-desc { font-size:11px; color:rgba(255,255,255,0.4); line-height:1.5; font-weight:300; }
@media (max-width: 600px) { .p100-delegate .drow { grid-template-columns: 1fr; } #dlgTierGrid { grid-template-columns: 1fr !important; } }
`.trim();

const html = `
<div style="min-height:100vh;background:#0c0c0c;color:#d4d4d4;">
<div class="p100-delegate">
<div id="dlgLoading" class="header"><img src="${LOGO}" alt="Power100"><h1>Loading Profile...</h1><p>Verifying your delegation link</p></div>
<div id="dlgError" class="error-state" style="display:none;"><img src="${LOGO}" alt="Power100" style="width:40px;margin-bottom:16px;"><h2>Invalid Link</h2><p id="dlgErrorMsg">This delegation link is invalid or has expired.</p></div>
<div id="dlgForm" style="display:none;">
<div class="header"><img src="${LOGO}" alt="Power100"><h1>Complete Authority Profile</h1><p>Fill out the details below on behalf of the contributor</p></div>
<div class="leader-info"><h3>Completing Profile For</h3><div class="lname" id="dlgLeaderName"></div><div class="lmeta" id="dlgLeaderMeta"></div></div>
<div class="form-section" id="dlgTierSection"><h2>How Much Detail Will You Provide?</h2><p class="desc">Choose a completion level. Our team fills in any gaps with AI-assisted research.</p>
<div id="dlgTierGrid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;"></div>
</div>
<div id="dlgProfileFields">
<div class="form-section"><h2>Core Profile</h2><p class="desc">The foundation of their Authority Contributor page.</p>
<div class="field"><label>Hero Quote *</label><input type="text" id="dlgHeroQuote" placeholder="A powerful statement that defines their philosophy"></div>
<div class="field"><label>Expertise Bio *</label><textarea id="dlgBio" placeholder="Their career journey, key accomplishments, and what makes them an expert."></textarea></div>
<div class="drow"><div class="field"><label>LinkedIn URL</label><input type="url" id="dlgLinkedin" placeholder="https://linkedin.com/in/..."></div><div class="field"><label>Company Website</label><input type="url" id="dlgWebsite" placeholder="https://..."></div></div>
</div>
<div class="form-section dlg-tier-medium" style="display:none;"><h2>Stats and Credentials</h2><p class="desc">Powers their stat bar and credentials section.</p>
<div class="drow"><div class="field"><label>Years in Industry</label><input type="text" id="dlgYears" placeholder="e.g. 25"></div><div class="field"><label>Revenue / Portfolio Value</label><input type="text" id="dlgRevenue" placeholder="e.g. $50M+"></div></div>
<div class="drow"><div class="field"><label>Geographic Reach</label><input type="text" id="dlgGeo" placeholder="e.g. National, 12 States"></div><div class="field"><label>Custom Stat</label><input type="text" id="dlgStat" placeholder="e.g. 500+ Companies Trained"><div class="hint">A signature metric that defines their impact.</div></div></div>
<div class="field"><label>Key Credentials</label><textarea id="dlgCreds" placeholder="One credential per line."></textarea></div>
<div class="field"><label>Expertise Topics</label><textarea id="dlgTopics" placeholder="One topic per line."></textarea></div>
</div>
<div class="form-section dlg-tier-full" style="display:none;"><h2>Awards and Recognition</h2>
<div class="field"><label>Awards and Recognition</label><textarea id="dlgRecog" placeholder="One per line."></textarea></div>
</div>
<div class="form-section"><h2>Company Details</h2>
<div class="field"><label>Company Description</label><textarea id="dlgCompDesc" placeholder="Brief overview of the company, its mission, and market position."></textarea></div>
<div class="field"><label>Additional Notes</label><textarea id="dlgNotes" placeholder="Anything else we should know."></textarea></div>
</div>
<div class="form-section"><h2>Target Keywords</h2><p class="desc">What search terms should this contributor rank for? Up to 10 keyword phrases, 80 characters each. Long-tail phrases work best.</p>
<div id="dlgKwFields"><div class="field"><label>Keyword 1</label><input type="text" class="dlg-kw-input" maxlength="80" placeholder="e.g. best home improvement company in Phoenix"></div><div class="field"><label>Keyword 2</label><input type="text" class="dlg-kw-input" maxlength="80" placeholder="e.g. top-rated roofing contractor near me"></div><div class="field"><label>Keyword 3</label><input type="text" class="dlg-kw-input" maxlength="80" placeholder="e.g. residential window replacement services"></div></div>
<div style="margin-top:12px;"><button type="button" id="dlgAddKwBtn" style="background:none;border:1px solid rgba(255,255,255,0.12);border-radius:6px;padding:8px 20px;color:rgba(255,255,255,0.5);font-family:Poppins,sans-serif;font-size:13px;cursor:pointer;">+ Add Another Keyword</button></div>
<div style="margin-top:8px;font-size:11px;color:rgba(255,255,255,0.3);">Up to 10 keywords, 80 characters each.</div>
</div>
<div class="form-section"><h2>Distribution Tags</h2><p class="desc">Who should be notified when this contributor's content goes live? Add team members, partners, or advocates who will help amplify content on social media. Minimum 10 recommended.</p>
<div id="dlgDistFields"><div class="field dist-contact-row"><div class="drow"><div class="field"><label>Name *</label><input type="text" class="dlg-dist-name" maxlength="60" placeholder="e.g. Sarah Johnson"></div><div class="field"><label>Email *</label><input type="email" class="dlg-dist-email" maxlength="80" placeholder="e.g. sarah@company.com"></div></div><div class="field"><label>Phone (optional)</label><input type="text" class="dlg-dist-phone" maxlength="20" placeholder="e.g. 555-123-4567"></div></div><div class="field dist-contact-row"><div class="drow"><div class="field"><label>Name *</label><input type="text" class="dlg-dist-name" maxlength="60" placeholder="Name"></div><div class="field"><label>Email *</label><input type="email" class="dlg-dist-email" maxlength="80" placeholder="Email"></div></div><div class="field"><label>Phone (optional)</label><input type="text" class="dlg-dist-phone" maxlength="20" placeholder="Phone (optional)"></div></div><div class="field dist-contact-row"><div class="drow"><div class="field"><label>Name *</label><input type="text" class="dlg-dist-name" maxlength="60" placeholder="Name"></div><div class="field"><label>Email *</label><input type="email" class="dlg-dist-email" maxlength="80" placeholder="Email"></div></div><div class="field"><label>Phone (optional)</label><input type="text" class="dlg-dist-phone" maxlength="20" placeholder="Phone (optional)"></div></div></div>
<div style="margin-top:12px;"><button type="button" id="dlgAddDistBtn" style="background:none;border:1px solid rgba(255,255,255,0.12);border-radius:6px;padding:8px 20px;color:rgba(255,255,255,0.5);font-family:Poppins,sans-serif;font-size:13px;cursor:pointer;">+ Add Another Contact</button></div>
<div style="margin-top:8px;font-size:11px;color:rgba(255,255,255,0.3);">Add up to 20 contacts. Name and email required.</div>
</div>
<div id="dlgPaymentSection" style="display:none;">
<div class="form-section"><h2>Payment</h2><p class="desc" id="dlgPaymentDesc">Complete the subscription payment to activate the Authority Contributor membership.</p>
<div id="dlg-payment-element" style="margin-top:16px;"></div>
<div class="error-state" id="dlg-payment-error" style="display:none;font-size:13px;color:#FB0401;padding:12px;text-align:left;"></div>
</div>
</div>
<div id="dlgNavBar"></div>
</div>
<div id="dlgSuccess" class="success-state" style="display:none;"><img src="${LOGO}" alt="Power100" style="width:40px;margin-bottom:16px;"><h2>Profile Submitted!</h2><p id="dlgSuccessMsg">Thank you for completing the profile. The Power100 team will begin building the Authority Contributor page.</p></div>
</div>
</div>
`.trim();

// Script — no && operators, no HTML closing tags in strings
const script = `
(function() {
  var params = new URLSearchParams(window.location.search);
  var token = params.get('token');
  var API = 'https://tpx.power100.io/api/expert-contributors/delegate/';
  var contributorData = null;
  var selectedTier = '';
  var needsPayment = false;
  var stripeReady = false;
  var stripeObj = null;
  var stripeElements = null;
  if (!token) { showErr('No delegation token found in the URL.'); return; }
  fetch(API + token)
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (!data.success) { showErr(data.error || 'Invalid delegation link.'); return; }
      contributorData = data.contributor;
      needsPayment = data.contributor.delegate_payment || false;
      document.getElementById('dlgLeaderName').textContent = (contributorData.first_name || '') + ' ' + (contributorData.last_name || '');
      document.getElementById('dlgLeaderMeta').textContent = (contributorData.title_position || '') + (contributorData.company ? ' at ' + contributorData.company : '');
      document.getElementById('dlgLoading').style.display = 'none';
      document.getElementById('dlgForm').style.display = 'block';
      buildTierCards();
      buildNavButton();
    })
    .catch(function(e) { showErr('Unable to load profile. Please try again later.'); });
  function showErr(msg) {
    document.getElementById('dlgLoading').style.display = 'none';
    document.getElementById('dlgError').style.display = 'block';
    document.getElementById('dlgErrorMsg').textContent = msg;
  }
  function buildTierCards() {
    var grid = document.getElementById('dlgTierGrid');
    var tiers = [
      { id: 'full', name: 'Full Profile', time: '15-20 min', desc: 'All fields including credentials, recognition, and company details.' },
      { id: 'medium', name: 'Core + Stats', time: '5-10 min', desc: 'Key info, stats, and credentials. AI fills the rest.' },
      { id: 'lean', name: 'Quick Start', time: '2 min', desc: 'Basics only. Our team handles the rest.' }
    ];
    tiers.forEach(function(t) {
      var card = document.createElement('div');
      card.className = 'dlg-tier-card';
      var nameDiv = document.createElement('div');
      nameDiv.className = 'dlg-tier-name';
      nameDiv.textContent = t.name;
      var timeDiv = document.createElement('div');
      timeDiv.className = 'dlg-tier-time';
      timeDiv.textContent = t.time;
      var descDiv = document.createElement('div');
      descDiv.className = 'dlg-tier-desc';
      descDiv.textContent = t.desc;
      card.appendChild(nameDiv);
      card.appendChild(timeDiv);
      card.appendChild(descDiv);
      card.addEventListener('click', function() {
        grid.querySelectorAll('.dlg-tier-card').forEach(function(c) { c.classList.remove('selected'); });
        card.classList.add('selected');
        selectedTier = t.id;
        // Show/hide form sections based on tier
        document.querySelectorAll('.dlg-tier-medium').forEach(function(el) { el.style.display = (t.id === 'medium' || t.id === 'full') ? 'block' : 'none'; });
        document.querySelectorAll('.dlg-tier-full').forEach(function(el) { el.style.display = t.id === 'full' ? 'block' : 'none'; });
        // Enable submit button
        var btn = document.getElementById('dlgSubmitBtn');
        if (btn) { btn.disabled = false; btn.style.opacity = '1'; btn.style.cursor = 'pointer'; }
      });
      grid.appendChild(card);
    });
  }
  function buildNavButton() {
    var nav = document.getElementById('dlgNavBar');
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'submit-btn';
    btn.id = 'dlgSubmitBtn';
    btn.disabled = true;
    btn.style.opacity = '0.4';
    btn.style.cursor = 'not-allowed';
    btn.textContent = needsPayment ? 'Continue to Payment' : 'Submit Completed Profile';
    btn.addEventListener('click', function() {
      if (!selectedTier) { alert('Please select a completion level first.'); return; }
      if (needsPayment) {
        if (!stripeReady) { initPayment(); }
        else { confirmPayment(); }
      } else {
        submitProfile();
      }
    });
    nav.appendChild(btn);
  }
  var dlgDistCount = 3;
  document.getElementById('dlgAddDistBtn').addEventListener('click', function() {
    if (dlgDistCount >= 20) return;
    dlgDistCount++;
    var c = document.getElementById('dlgDistFields');
    var item = document.createElement('div');
    item.className = 'field dist-contact-row';
    var row = document.createElement('div');
    row.className = 'drow';
    var f1 = document.createElement('div');
    f1.className = 'field';
    var l1 = document.createElement('label');
    l1.textContent = 'Name';
    var i1 = document.createElement('input');
    i1.type = 'text';
    i1.className = 'dlg-dist-name';
    i1.maxLength = 60;
    i1.placeholder = 'Name';
    f1.appendChild(l1);
    f1.appendChild(i1);
    row.appendChild(f1);
    var f2 = document.createElement('div');
    f2.className = 'field';
    var l2 = document.createElement('label');
    l2.textContent = 'Email';
    var i2 = document.createElement('input');
    i2.type = 'email';
    i2.className = 'dlg-dist-email';
    i2.maxLength = 80;
    i2.placeholder = 'Email';
    f2.appendChild(l2);
    f2.appendChild(i2);
    row.appendChild(f2);
    item.appendChild(row);
    var f3 = document.createElement('div');
    f3.className = 'field';
    var l3 = document.createElement('label');
    l3.textContent = 'Phone (optional)';
    var i3 = document.createElement('input');
    i3.type = 'text';
    i3.className = 'dlg-dist-phone';
    i3.maxLength = 20;
    i3.placeholder = 'Phone (optional)';
    f3.appendChild(l3);
    f3.appendChild(i3);
    item.appendChild(f3);
    c.appendChild(item);
    if (dlgDistCount >= 20) { document.getElementById('dlgAddDistBtn').style.display = 'none'; }
  });
  var dlgKwCount = 3;
  document.getElementById('dlgAddKwBtn').addEventListener('click', function() {
    if (dlgKwCount >= 10) return;
    dlgKwCount++;
    var c = document.getElementById('dlgKwFields');
    var d = document.createElement('div');
    d.className = 'field';
    var lb = document.createElement('label');
    lb.textContent = 'Keyword ' + dlgKwCount;
    var inp = document.createElement('input');
    inp.type = 'text';
    inp.className = 'dlg-kw-input';
    inp.maxLength = 80;
    inp.placeholder = 'Enter a keyword phrase';
    d.appendChild(lb);
    d.appendChild(inp);
    c.appendChild(d);
    if (dlgKwCount >= 10) { document.getElementById('dlgAddKwBtn').style.display = 'none'; }
  });
  function submitProfile() {
    var btn = document.getElementById('dlgSubmitBtn');
    btn.disabled = true;
    btn.textContent = 'Submitting...';
    var gv = function(id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; };
    var payload = {
      hero_quote: gv('dlgHeroQuote'), bio: gv('dlgBio'),
      linkedin_url: gv('dlgLinkedin'), website_url: gv('dlgWebsite'),
      years_in_industry: gv('dlgYears'), revenue_value: gv('dlgRevenue'),
      geographic_reach: gv('dlgGeo'), custom_stat: gv('dlgStat'),
      credentials: gv('dlgCreds'), expertise_topics: gv('dlgTopics'),
      recognition: gv('dlgRecog'), company_description: gv('dlgCompDesc'),
      notes: gv('dlgNotes'),
      geo_keywords: (function() { var kw = []; document.querySelectorAll('.dlg-kw-input').forEach(function(inp) { var v = inp.value.trim(); if (v) kw.push(v); }); return kw; })(),
      distribution_contacts: (function() { var dc = []; document.querySelectorAll('.dist-contact-row').forEach(function(row) { var n = row.querySelector('.dlg-dist-name'); var e = row.querySelector('.dlg-dist-email'); var p = row.querySelector('.dlg-dist-phone'); if (n) { if (e) { if (n.value.trim()) { if (e.value.trim()) { dc.push({name: n.value.trim(), email: e.value.trim(), phone: p ? p.value.trim() : ''}); } } } } }); return dc; })()
    };
    fetch(API + token + '/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data.success) {
        document.getElementById('dlgForm').style.display = 'none';
        document.getElementById('dlgSuccess').style.display = 'block';
        if (needsPayment) {
          document.getElementById('dlgSuccessMsg').textContent = 'Thank you! The profile has been completed and payment has been processed. The Power100 team will begin building the Authority Contributor page.';
        }
      } else {
        btn.disabled = false;
        btn.textContent = needsPayment ? 'Complete Payment' : 'Submit Completed Profile';
        alert(data.error || 'Submission failed. Please try again.');
      }
    })
    .catch(function(e) {
      btn.disabled = false;
      btn.textContent = needsPayment ? 'Complete Payment' : 'Submit Completed Profile';
      alert('Network error. Please try again.');
    });
  }
  function initPayment() {
    var btn = document.getElementById('dlgSubmitBtn');
    btn.disabled = true;
    btn.textContent = 'Loading payment...';
    // Show payment section
    document.getElementById('dlgPaymentSection').style.display = 'block';
    // Load Stripe
    var script = document.createElement('script');
    script.src = 'https://js.stripe.com/v3/';
    script.onload = function() {
      stripeObj = Stripe('pk_live_51QahvHKKPDjBiebIzq9JvUwIBq3b7tQvWwsgbRfJbvkyDMhPwVmLQqQjuCvtJxAVW01Vgkfpgwob0cIXRg8PsQ4V00FlskeOSH');
      // Create subscription via WP endpoint
      fetch('https://power100.io/wp-json/stripe/v1/create-ec-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: contributorData.email,
          first_name: contributorData.first_name,
          last_name: contributorData.last_name,
          company: contributorData.company,
          plan: contributorData.plan || 'individual'
        })
      })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (data.error) { showPayErr(data.error.message); return; }
        var appearance = { theme: 'night', variables: { colorPrimary: '#FB0401', colorBackground: '#1a1a1a', colorText: '#ffffff', fontFamily: 'Poppins, sans-serif', borderRadius: '6px' } };
        stripeElements = stripeObj.elements({ clientSecret: data.clientSecret, appearance: appearance });
        var payEl = stripeElements.create('payment');
        payEl.mount('#dlg-payment-element');
        stripeReady = true;
        btn.disabled = false;
        btn.textContent = 'Complete Payment';
        btn.style.opacity = '1';
        btn.style.cursor = 'pointer';
      })
      .catch(function(e) { showPayErr('Unable to load payment. Please try again.'); });
    };
    document.head.appendChild(script);
  }
  function confirmPayment() {
    var btn = document.getElementById('dlgSubmitBtn');
    btn.disabled = true;
    btn.textContent = 'Processing payment...';
    stripeObj.confirmPayment({
      elements: stripeElements,
      confirmParams: { receipt_email: contributorData.email },
      redirect: 'if_required'
    })
    .then(function(result) {
      if (result.error) {
        showPayErr(result.error.message);
        btn.disabled = false;
        btn.textContent = 'Complete Payment';
      } else {
        var pi = result.paymentIntent;
        if (pi) { if (pi.status === 'succeeded') { submitProfile(); return; } }
        submitProfile();
      }
    })
    .catch(function(e) {
      showPayErr('Payment failed. Please try again.');
      btn.disabled = false;
      btn.textContent = 'Complete Payment';
    });
  }
  function showPayErr(msg) {
    var el = document.getElementById('dlg-payment-error');
    if (el) { el.textContent = msg; el.style.display = 'block'; }
    setTimeout(function() { if (el) el.style.display = 'none'; }, 6000);
  }
})();
`.trim();

const fullContent = `<style>${css}</style>${html}<script>${script}</script>`;

// Clean: strip blank lines, collapse HTML outside script
const lines = fullContent.split('\n').filter(l => l.trim() !== '');
let inScript = false;
const clean = [];
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('<script>')) inScript = true;
  if (inScript) { clean.push(lines[i]); }
  else {
    if (clean.length > 0 && !clean[clean.length - 1].includes('<script>')) {
      clean[clean.length - 1] += lines[i].trim();
    } else {
      clean.push(lines[i]);
    }
  }
  if (lines[i].includes('</script>')) inScript = false;
}

(async () => {
  const targetSlug = process.argv[2] || 'contributor-delegate';
  console.log('Target slug:', targetSlug);
  const searchRes = await axios.get('https://power100.io/wp-json/wp/v2/pages?slug=' + targetSlug + '&_fields=id', {
    headers: { Authorization: WP_AUTH }
  });

  const content = clean.join('\n');

  if (searchRes.data.length > 0) {
    const pageId = searchRes.data[0].id;
    await axios.post(`https://power100.io/wp-json/wp/v2/pages/${pageId}`, {
      content,
      status: 'publish',
      template: 'elementor_canvas'
    }, { headers: { Authorization: WP_AUTH, 'Content-Type': 'application/json' } });
    console.log('Updated page:', pageId);
  } else {
    const res = await axios.post('https://power100.io/wp-json/wp/v2/pages', {
      title: 'Complete Authority Profile',
      slug: 'contributor-delegate',
      content,
      status: 'publish',
      template: 'elementor_canvas',
      comment_status: 'closed',
      ping_status: 'closed'
    }, { headers: { Authorization: WP_AUTH, 'Content-Type': 'application/json' } });
    console.log('Created page:', res.data.id, res.data.link);
  }

  console.log('Done! https://power100.io/' + targetSlug + '/');
})().catch(e => console.error('Error:', e.message));
