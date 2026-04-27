// Form HTML template — injected at runtime to keep the WP page content small
var SG_FORM_HTML = `<div style="min-height:100vh;background:#0c0c0c;color:#d4d4d4;">
<div class="p100-sg">

  <div id="sgHeader" class="header">
    <img decoding="async" src="https://power100.io/wp-content/uploads/2026/01/Power100-Icon-Hi-Res-and-Large-1.png" alt="Power100">
    <div class="show-badge">Outside The Lines Episode</div>
    <h1 id="sgHeaderTitle">Guest Onboarding</h1>
    <p id="sgHeaderSub">Tell us about yourself so we can optimize your campaign reach post-production.</p>
  </div>

  <div id="sgLeaderInfo" class="leader-info" style="display:none;">
    <h3>Completing Profile For</h3>
    <div class="lname" id="sgLeaderName"></div>
    <div class="lmeta" id="sgLeaderMeta"></div>
  </div>

  <div id="sgError" class="error-state" style="display:none;">
    <h2>Invite Link Issue</h2>
    <p id="sgErrorMsg">This delegation link is invalid or has expired. Contact zeek@power100.io if you need help.</p>
  </div>

  <div id="sgForm" style="display:block;">

    <div class="progress-wrap" id="sgProgressWrap">
      <div class="progress-labels">
        <span id="sgStepLabel">Step 1 of 8</span>
        <span id="sgStepTitle">Your basics</span>
      </div>
      <div class="progress-bar"><div class="progress-fill" id="sgProgressFill"></div></div>
    </div>

    <!-- Honeypot field — hidden, bots fill, humans don't -->
    <div class="honeypot" aria-hidden="true">
      <label>Company website (leave blank)</label>
      <input type="text" id="sgHoneypot" name="company_website_confirm" tabindex="-1" autocomplete="off">
    </div>

    <!-- STEP 1: Your basics -->
    <div class="step active" data-step="1">
      <div class="step-head">
        <h2>Your basics</h2>
        <p>Who you are and how we reach you.</p>
      </div>
      <div class="drow">
        <div class="field">
          <label>First name<span class="req">*</span></label>
          <input type="text" id="sgFirstName" placeholder="Jane" autocomplete="given-name">
          <div class="field-error">Required.</div>
        </div>
        <div class="field">
          <label>Last name<span class="req">*</span></label>
          <input type="text" id="sgLastName" placeholder="Doe" autocomplete="family-name">
          <div class="field-error">Required.</div>
        </div>
      </div>
      <div class="drow">
        <div class="field">
          <label>Email<span class="req">*</span></label>
          <input type="email" id="sgEmail" placeholder="jane@company.com" autocomplete="email">
          <div class="field-error">A valid email is required.</div>
        </div>
        <div class="field">
          <label>Phone</label>
          <input type="tel" id="sgPhone" placeholder="(555) 123-4567" autocomplete="tel">
        </div>
      </div>
    </div>

    <!-- STEP 2: Delegation choice -->
    <div class="step" data-step="2">
      <div class="step-head">
        <h2>Who's filling this out?</h2>
        <p>Pick what works best. You can always come back.</p>
      </div>
      <div class="mode-grid">
        <button type="button" class="mode-card selected" data-mode="self" id="sgModeSelf">
          <div class="mtitle">I'll fill it out myself</div>
          <div class="mdesc">Takes about 8&ndash;10 minutes. Continue with the form below.</div>
        </button>
        <button type="button" class="mode-card" data-mode="delegate" id="sgModeDelegate">
          <div class="mtitle">Delegate to my EA / team</div>
          <div class="mdesc">Enter your assistant's name and email &mdash; we'll send them a secure link.</div>
        </button>
      </div>
      <div id="sgDelegateFields" style="display:none;">
        <div class="drow">
          <div class="field">
            <label>Delegate's name<span class="req">*</span></label>
            <input type="text" id="sgDelegateName" placeholder="Sarah Johnson">
            <div class="field-error">Required to send the delegation link.</div>
          </div>
          <div class="field">
            <label>Delegate's email<span class="req">*</span></label>
            <input type="email" id="sgDelegateEmail" placeholder="sarah@company.com">
            <div class="field-error">Valid email required.</div>
          </div>
        </div>
        <div class="field">
          <div class="hint">We'll email them a unique link. You can also continue filling out anything you already know &mdash; it'll save when you submit.</div>
        </div>
      </div>
    </div>

    <!-- STEP 3: Company & role -->
    <div class="step" data-step="3">
      <div class="step-head">
        <h2>Your company &amp; role</h2>
        <p>Where you lead and what you do.</p>
      </div>
      <div class="drow">
        <div class="field">
          <label>Company<span class="req">*</span></label>
          <input type="text" id="sgCompany" placeholder="Acme Home Improvement">
          <div class="field-error">Required.</div>
        </div>
        <div class="field">
          <label>Title / Position<span class="req">*</span></label>
          <input type="text" id="sgTitle" placeholder="CEO">
          <div class="field-error">Required.</div>
        </div>
      </div>
      <div class="drow">
        <div class="field">
          <label>Years in industry</label>
          <input type="text" id="sgYears" placeholder="e.g. 18">
        </div>
        <div class="field">
          <label>Revenue / portfolio value</label>
          <input type="text" id="sgRevenue" placeholder="e.g. $50M+">
        </div>
      </div>
      <div class="drow">
        <div class="field">
          <label>Geographic reach</label>
          <input type="text" id="sgGeo" placeholder="e.g. National, 12 states">
        </div>
        <div class="field">
          <label>Signature stat</label>
          <input type="text" id="sgStat" placeholder="e.g. 500+ teams trained">
          <div class="hint">One metric that defines your impact.</div>
        </div>
      </div>
      <div class="field">
        <label>Company description</label>
        <textarea id="sgCompDesc" placeholder="Brief overview of the company, mission, and market position."></textarea>
      </div>
    </div>

    <!-- STEP 4: Leadership narrative -->
    <div class="step" data-step="4">
      <div class="step-head">
        <h2>Leadership narrative</h2>
        <p>What the world should know about your leadership and expertise.</p>
      </div>
      <div class="field">
        <label>Hero quote<span class="req">*</span></label>
        <input type="text" id="sgHeroQuote" placeholder="A powerful one-line statement that captures your philosophy.">
        <div class="hint">Shows up as the opening line on your contributor page.</div>
        <div class="field-error">Required.</div>
      </div>
      <div class="field">
        <label>Expertise bio<span class="req">*</span></label>
        <textarea id="sgBio" placeholder="Your career journey, key accomplishments, and what makes you an authority."></textarea>
        <div class="hint">3&ndash;6 sentences works well. We can refine it.</div>
        <div class="field-error">Required.</div>
      </div>
      <div class="drow">
        <div class="field">
          <label>Key credentials</label>
          <textarea id="sgCreds" placeholder="One credential per line. Awards, certifications, notable roles..."></textarea>
        </div>
        <div class="field">
          <label>Expertise topics</label>
          <textarea id="sgTopics" placeholder="One topic per line. What you can speak authoritatively on."></textarea>
        </div>
      </div>
      <div class="field">
        <label>Recognition &amp; awards</label>
        <textarea id="sgRecog" placeholder="One per line. Industry awards, speaking invites, media mentions..."></textarea>
      </div>
    </div>

    <!-- STEP 5: Media -->
    <div class="step" data-step="5">
      <div class="step-head">
        <h2>Media &amp; social proof</h2>
        <p>Videos that show you in action, and testimonials about your work.</p>
      </div>
      <div class="field">
        <label>Featured videos</label>
        <div class="hint" style="margin-top:0;margin-bottom:10px;">YouTube, Vimeo, or direct URL. Interviews, keynotes, case studies.</div>
        <div id="sgVideosContainer"></div>
        <button type="button" id="sgAddVideoBtn" class="add-btn">+ Add another video</button>
      </div>
      <div class="field" style="margin-top:24px;">
        <label>Testimonials</label>
        <div class="hint" style="margin-top:0;margin-bottom:10px;">Quotes from clients, peers, or industry leaders about you.</div>
        <div id="sgTestimonialsContainer"></div>
        <button type="button" id="sgAddTestimonialBtn" class="add-btn">+ Add another testimonial</button>
      </div>
    </div>

    <!-- STEP 6: AI GEO keywords -->
    <div class="step" data-step="6">
      <div class="step-head">
        <h2>AI search phrases</h2>
        <p>Long-tail phrases that AI search engines (ChatGPT, Perplexity, Google) should associate with you.</p>
      </div>
      <div class="geo-helper">
        <strong>Good examples</strong>
        <p><em>"best home improvement CEO in the Southeast"</em></p>
        <p><em>"top residential exterior contractor scaling nationally"</em></p>
        <p><em>"home services leader known for culture and retention"</em></p>
      </div>
      <div class="geo-list" id="sgGeoList"></div>
      <div class="field" style="margin-top:12px;">
        <div class="hint">Minimum 3, up to 10. Long-tail phrases (5&ndash;10 words) work best. Think about how a buyer or admirer would describe you.</div>
      </div>
    </div>

    <!-- STEP 7: Distribution + onboarding contact -->
    <div class="step" data-step="7">
      <div class="step-head">
        <h2>Distribution &amp; onboarding contact</h2>
        <p>Who we notify when your content goes live, and your main point of contact.</p>
      </div>
      <div class="field">
        <label>Distribution contacts</label>
        <div class="hint" style="margin-top:0;margin-bottom:10px;">Team members, advocates, or partners who will help amplify your content when it publishes. 3&ndash;10 is ideal.</div>
        <div id="sgDistContainer"></div>
        <button type="button" id="sgAddDistBtn" class="add-btn">+ Add another contact</button>
      </div>
      <div class="step-head" style="margin-top:32px;margin-bottom:16px;">
        <h2 style="font-size:16px;">Primary onboarding contact</h2>
        <p>Your EA, chief of staff, or whoever we should loop in on details.</p>
      </div>
      <div class="drow">
        <div class="field">
          <label>Contact name</label>
          <input type="text" id="sgOnbName" placeholder="Sarah Johnson">
        </div>
        <div class="field">
          <label>Contact email</label>
          <input type="email" id="sgOnbEmail" placeholder="sarah@company.com">
        </div>
      </div>
      <div class="drow">
        <div class="field">
          <label>Contact phone</label>
          <input type="tel" id="sgOnbPhone" placeholder="(555) 123-4567">
        </div>
        <div class="field">
          <label>Contact position</label>
          <input type="text" id="sgOnbPos" placeholder="Executive Assistant">
        </div>
      </div>
    </div>

    <!-- STEP 8: Headshot + review -->
    <div class="step" data-step="8">
      <div class="step-head">
        <h2>Headshot &amp; review</h2>
        <p>Upload a professional headshot and we'll take it from here.</p>
      </div>
      <div class="field">
        <label>Professional headshot</label>
        <div class="headshot-drop" id="sgHeadshotDrop">
          <div class="icon">+</div>
          <div class="title">Click or drop a photo</div>
          <div class="sub">PNG, JPG, or WEBP &mdash; up to 8&nbsp;MB</div>
        </div>
        <div id="sgHeadshotFileContainer"></div>
        <div class="headshot-preview" id="sgHeadshotPreview">
          <img id="sgHeadshotImg" src="" alt="Preview">
          <div class="fname" id="sgHeadshotFilename"></div>
          <button type="button" class="replace" id="sgHeadshotReplace">Replace image</button>
        </div>
        <div class="upload-status" id="sgHeadshotStatus"></div>
      </div>
      <div class="drow">
        <div class="field">
          <label>LinkedIn URL</label>
          <input type="url" id="sgLinkedIn" placeholder="https://linkedin.com/in/...">
        </div>
        <div class="field">
          <label>Company website</label>
          <input type="url" id="sgWebsite" placeholder="https://...">
        </div>
      </div>
    </div>

    <div class="nav-row" id="sgNavRow">
      <button type="button" class="btn btn-secondary" id="sgBackBtn" style="display:none;">Back</button>
      <button type="button" class="btn btn-primary" id="sgNextBtn">Continue</button>
    </div>

  </div>

  <div id="sgSuccess" class="success-state" style="display:none;">
    <div class="checkmark">&check;</div>
    <h2 id="sgSuccessTitle">Thanks &mdash; you're in!</h2>
    <p id="sgSuccessMsg">Your profile is submitted. Our team will be in touch to schedule the interview and to review your Inner Circle contributor page before it goes live.</p>
  </div>

</div></div>`;

(function() {
  var params = new URLSearchParams(window.location.search);
  var delegationToken = params.get('delegation_token') || params.get('token');
  var _sgRoot = document.getElementById("p100-sg-root"); if (_sgRoot) { _sgRoot.innerHTML = SG_FORM_HTML; }
  var API = 'https://tpx.power100.io/api/show-guests';
  var contributorData = null;
  var mode = 'self';
  var currentStep = 1;
  var SELF_STEPS = 8;
  var DELEGATE_STEPS = 2;
  var TOKEN_STEPS = 7; // token-mode delegate skips step 2 (Who's filling this out)
  var isTokenMode = !!delegationToken;
  var totalSteps = isTokenMode ? TOKEN_STEPS : SELF_STEPS;
  var SELF_TITLES = [
    'Your basics', "Who's filling this out", 'Your company & role',
    'Leadership narrative', 'Media & social proof', 'AI search phrases',
    'Distribution & contact', 'Headshot & review'
  ];
  var DELEGATE_TITLES = ['Your basics', 'Delegate to someone'];
  var TOKEN_TITLES = [
    'Your basics', 'Your company & role',
    'Leadership narrative', 'Media & social proof', 'AI search phrases',
    'Distribution & contact', 'Headshot & review'
  ];
  var stepTitles = isTokenMode ? TOKEN_TITLES : SELF_TITLES;
  var uploadedHeadshotUrl = '';

  function $(id) { return document.getElementById(id); }
  // In token mode, step 2 ("Who's filling this out") is skipped — the
  // delegate IS the person filling it out. Translate the raw data-step
  // value into its visible position so progress/label match reality.
  function visiblePos(n) {
    if (isTokenMode && n >= 3) { return n - 1; }
    return n;
  }
  function nextStepNum(n) {
    var next = n + 1;
    if (isTokenMode && next === 2) { next = 3; }
    return next;
  }
  function prevStepNum(n) {
    var prev = n - 1;
    if (isTokenMode && prev === 2) { prev = 1; }
    return prev;
  }
  function setProgress() {
    var pos = visiblePos(currentStep);
    var pct = (pos / totalSteps) * 100;
    $('sgProgressFill').style.width = pct + '%';
    $('sgStepLabel').textContent = 'Step ' + pos + ' of ' + totalSteps;
    $('sgStepTitle').textContent = stepTitles[pos - 1] || '';
    $('sgBackBtn').style.display = pos > 1 ? 'inline-block' : 'none';
    $('sgNextBtn').textContent = pos === totalSteps ? 'Submit' : 'Continue';
  }
  function showStep(n) {
    var steps = document.querySelectorAll('.p100-sg .step');
    for (var i = 0; i < steps.length; i++) { steps[i].classList.remove('active'); }
    var target = document.querySelector('.p100-sg .step[data-step="' + n + '"]');
    if (target) { target.classList.add('active'); }
    currentStep = n;
    setProgress();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* === DELEGATION TOKEN PREFILL === */
  if (delegationToken) {
    $('sgHeaderTitle').textContent = 'Complete Guest Profile';
    $('sgHeaderSub').textContent = 'You\u2019re filling this out on behalf of the show guest.';
    fetch(API + '/token/' + encodeURIComponent(delegationToken))
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (!data.success) { showErr(data.error || 'Invalid delegation link.'); return; }
        contributorData = data.contributor;
        var full = ((contributorData.first_name || '') + ' ' + (contributorData.last_name || '')).trim();
        $('sgLeaderInfo').style.display = 'block';
        $('sgLeaderName').textContent = full || contributorData.email || 'Show Guest';
        var meta = (contributorData.title_position || '') + (contributorData.company ? ' at ' + contributorData.company : '');
        $('sgLeaderMeta').textContent = meta.trim();
        // Prefill
        if (contributorData.first_name) { $('sgFirstName').value = contributorData.first_name; }
        if (contributorData.last_name) { $('sgLastName').value = contributorData.last_name; }
        if (contributorData.email) {
          $('sgEmail').value = contributorData.email;
          $('sgEmail').disabled = true;
        }
        if (contributorData.phone) { $('sgPhone').value = contributorData.phone; }
        if (contributorData.company) { $('sgCompany').value = contributorData.company; }
        if (contributorData.title_position) { $('sgTitle').value = contributorData.title_position; }
        if (contributorData.years_in_industry) { $('sgYears').value = contributorData.years_in_industry; }
        if (contributorData.revenue_value) { $('sgRevenue').value = contributorData.revenue_value; }
        if (contributorData.geographic_reach) { $('sgGeo').value = contributorData.geographic_reach; }
        if (contributorData.custom_stat) { $('sgStat').value = contributorData.custom_stat; }
        if (contributorData.company_description) { $('sgCompDesc').value = contributorData.company_description; }
        if (contributorData.hero_quote) { $('sgHeroQuote').value = contributorData.hero_quote; }
        if (contributorData.bio) { $('sgBio').value = contributorData.bio; }
        if (contributorData.credentials) { $('sgCreds').value = contributorData.credentials; }
        if (contributorData.expertise_topics) { $('sgTopics').value = contributorData.expertise_topics; }
        if (contributorData.recognition) { $('sgRecog').value = contributorData.recognition; }
        if (contributorData.linkedin_url) { $('sgLinkedIn').value = contributorData.linkedin_url; }
        if (contributorData.website_url) { $('sgWebsite').value = contributorData.website_url; }
        if (contributorData.onboarding_contact_name) { $('sgOnbName').value = contributorData.onboarding_contact_name; }
        if (contributorData.onboarding_contact_email) { $('sgOnbEmail').value = contributorData.onboarding_contact_email; }
        if (contributorData.onboarding_contact_phone) { $('sgOnbPhone').value = contributorData.onboarding_contact_phone; }
        if (contributorData.onboarding_contact_position) { $('sgOnbPos').value = contributorData.onboarding_contact_position; }
        if (contributorData.headshot_url) {
          uploadedHeadshotUrl = contributorData.headshot_url;
          $('sgHeadshotImg').src = contributorData.headshot_url;
          $('sgHeadshotPreview').classList.add('visible');
          $('sgHeadshotDrop').style.display = 'none';
          $('sgHeadshotFilename').textContent = 'Existing headshot loaded';
        }
        prefillRepeaters(contributorData);
      })
      .catch(function() { showErr('Unable to load profile. Please try again later.'); });
  }

  function prefillRepeaters(c) {
    var vids = Array.isArray(c.videos) ? c.videos : [];
    for (var i = 0; i < vids.length; i++) { addVideoRow(vids[i]); }
    var tests = Array.isArray(c.testimonials) ? c.testimonials : [];
    for (var j = 0; j < tests.length; j++) { addTestimonialRow(tests[j]); }
    var dist = Array.isArray(c.distribution_contacts) ? c.distribution_contacts : [];
    for (var k = 0; k < dist.length; k++) { addDistRow(dist[k]); }
    var kw = Array.isArray(c.geo_keywords) ? c.geo_keywords : [];
    for (var m = 0; m < kw.length && m < 10; m++) {
      var inputs = document.querySelectorAll('.sg-geo-input');
      if (inputs[m]) { inputs[m].value = kw[m]; }
    }
  }

  function showErr(msg) {
    $('sgHeader').style.display = 'none';
    $('sgForm').style.display = 'none';
    $('sgError').style.display = 'block';
    $('sgErrorMsg').textContent = msg;
  }

  /* === MODE TOGGLE (step 2) === */
  function selectMode(m) {
    mode = m;
    var self = $('sgModeSelf');
    var del = $('sgModeDelegate');
    if (m === 'self') { self.classList.add('selected'); del.classList.remove('selected'); }
    else { del.classList.add('selected'); self.classList.remove('selected'); }
    $('sgDelegateFields').style.display = m === 'delegate' ? 'block' : 'none';
    // Delegate mode terminates flow at step 2 — no need for profile fields.
    totalSteps = m === 'delegate' ? DELEGATE_STEPS : SELF_STEPS;
    stepTitles = m === 'delegate' ? DELEGATE_TITLES : SELF_TITLES;
    setProgress();
  }
  $('sgModeSelf').addEventListener('click', function() { selectMode('self'); });
  $('sgModeDelegate').addEventListener('click', function() { selectMode('delegate'); });

  /* === REPEATERS === */
  function createEl(tag, cls, text) {
    var el = document.createElement(tag);
    if (cls) { el.className = cls; }
    if (text) { el.textContent = text; }
    return el;
  }
  function createLabeledField(labelText, inputType, inputCls, placeholder, maxlen) {
    var wrap = createEl('div', 'field');
    var lbl = createEl('label', null, labelText);
    wrap.appendChild(lbl);
    var inp = document.createElement(inputType === 'textarea' ? 'textarea' : 'input');
    if (inputType !== 'textarea') { inp.type = inputType; }
    if (inputCls) { inp.className = inputCls; }
    if (placeholder) { inp.placeholder = placeholder; }
    wrap.appendChild(inp);
    return { wrap: wrap, input: inp };
  }
  function addRemoveBtn(container) {
    var btn = createEl('button', 'rm', '\u00d7');
    btn.type = 'button';
    btn.addEventListener('click', function() { container.parentNode.removeChild(container); });
    container.appendChild(btn);
  }

  var videoCount = 0;
  function addVideoRow(data) {
    videoCount++;
    var item = createEl('div', 'repeater-item');
    addRemoveBtn(item);
    var titleF = createLabeledField('Video title', 'text', 'sg-video-title', 'e.g. Keynote at Power100 Summit 2025', 200);
    var urlF = createLabeledField('URL', 'url', 'sg-video-url', 'https://youtube.com/watch?v=...', 500);
    var descF = createLabeledField('Short description (optional)', 'text', 'sg-video-desc', 'One line of context', 500);
    item.appendChild(titleF.wrap);
    item.appendChild(urlF.wrap);
    item.appendChild(descF.wrap);
    if (data) {
      if (data.title) { titleF.input.value = data.title; }
      if (data.url) { urlF.input.value = data.url; }
      if (data.description) { descF.input.value = data.description; }
    }
    $('sgVideosContainer').appendChild(item);
  }
  $('sgAddVideoBtn').addEventListener('click', function() { if (videoCount < 10) { addVideoRow(); } });

  var testCount = 0;
  function addTestimonialRow(data) {
    testCount++;
    var item = createEl('div', 'repeater-item');
    addRemoveBtn(item);
    var quoteF = createLabeledField('Quote', 'textarea', 'sg-test-quote', 'What they said about you.', 800);
    var row = createEl('div', 'drow');
    var nameF = createLabeledField('Name', 'text', 'sg-test-name', 'e.g. Bill Conlon', 80);
    var compF = createLabeledField('Company / role', 'text', 'sg-test-company', 'e.g. VP Sales, Westlake Royal', 160);
    row.appendChild(nameF.wrap);
    row.appendChild(compF.wrap);
    item.appendChild(quoteF.wrap);
    item.appendChild(row);
    if (data) {
      if (data.quote) { quoteF.input.value = data.quote; }
      if (data.name) { nameF.input.value = data.name; }
      if (data.company) { compF.input.value = data.company; }
      else if (data.role) { compF.input.value = data.role; }
    }
    $('sgTestimonialsContainer').appendChild(item);
  }
  $('sgAddTestimonialBtn').addEventListener('click', function() { if (testCount < 10) { addTestimonialRow(); } });

  var distCount = 0;
  function addDistRow(data) {
    distCount++;
    var item = createEl('div', 'repeater-item');
    addRemoveBtn(item);
    var row1 = createEl('div', 'drow');
    var nameF = createLabeledField('Name', 'text', 'sg-dist-name', 'Full name', 80);
    var emailF = createLabeledField('Email', 'email', 'sg-dist-email', 'email@company.com', 120);
    row1.appendChild(nameF.wrap);
    row1.appendChild(emailF.wrap);
    var roleF = createLabeledField('Role / relationship (optional)', 'text', 'sg-dist-role', 'e.g. VP Marketing, or Friend at Acme', 120);
    item.appendChild(row1);
    item.appendChild(roleF.wrap);
    if (data) {
      if (data.name) { nameF.input.value = data.name; }
      if (data.email) { emailF.input.value = data.email; }
      if (data.role) { roleF.input.value = data.role; }
    }
    $('sgDistContainer').appendChild(item);
  }
  $('sgAddDistBtn').addEventListener('click', function() { if (distCount < 20) { addDistRow(); } });

  // GEO keyword rows — 10 slots always visible
  (function() {
    var list = $('sgGeoList');
    for (var i = 1; i <= 10; i++) {
      var item = createEl('div', 'geo-item');
      var num = createEl('div', 'geo-num', String(i));
      var inp = document.createElement('input');
      inp.type = 'text';
      inp.className = 'sg-geo-input';
      inp.placeholder = i <= 3 ? 'e.g. "top-rated home services CEO in the Southeast"' : 'Another phrase...';
      item.appendChild(num);
      item.appendChild(inp);
      list.appendChild(item);
    }
  })();

  // Initialize one of each repeater so users see the pattern
  addVideoRow();
  addTestimonialRow();
  addDistRow();
  addDistRow();
  addDistRow();

  /* === HEADSHOT === */
  var drop = $('sgHeadshotDrop');
  // Create file input dynamically — having <input type=file> in the WP page
  // HTML triggers a content filter that strips all inline scripts.
  var fileInp = document.createElement('input');
  fileInp.type = 'file';
  fileInp.id = 'sgHeadshotFile';
  fileInp.accept = 'image/png,image/jpeg,image/webp';
  fileInp.style.display = 'none';
  var fileInpContainer = $('sgHeadshotFileContainer');
  if (fileInpContainer) { fileInpContainer.appendChild(fileInp); } else { document.body.appendChild(fileInp); }
  drop.addEventListener('click', function() { fileInp.click(); });
  $('sgHeadshotReplace').addEventListener('click', function() {
    $('sgHeadshotPreview').classList.remove('visible');
    drop.style.display = 'block';
    uploadedHeadshotUrl = '';
    fileInp.value = '';
  });
  drop.addEventListener('dragover', function(e) { e.preventDefault(); drop.classList.add('dragover'); });
  drop.addEventListener('dragleave', function() { drop.classList.remove('dragover'); });
  drop.addEventListener('drop', function(e) {
    e.preventDefault(); drop.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files[0]) { uploadHeadshot(e.dataTransfer.files[0]); }
  });
  fileInp.addEventListener('change', function() {
    if (fileInp.files && fileInp.files[0]) { uploadHeadshot(fileInp.files[0]); }
  });

  function uploadHeadshot(file) {
    var status = $('sgHeadshotStatus');
    status.classList.remove('err');
    status.textContent = 'Uploading\u2026';
    var fd = new FormData();
    fd.append('headshot', file);
    var url = delegationToken
      ? API + '/token/' + encodeURIComponent(delegationToken) + '/upload-headshot'
      : API + '/upload-headshot';
    fetch(url, { method: 'POST', body: fd })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (data.success && data.url) {
          uploadedHeadshotUrl = data.url;
          $('sgHeadshotImg').src = data.url;
          $('sgHeadshotFilename').textContent = data.filename || '';
          $('sgHeadshotPreview').classList.add('visible');
          drop.style.display = 'none';
          status.textContent = 'Uploaded.';
          setTimeout(function() { status.textContent = ''; }, 2000);
        } else {
          status.classList.add('err');
          status.textContent = (data && data.error) || 'Upload failed. Try a different image.';
        }
      })
      .catch(function() {
        status.classList.add('err');
        status.textContent = 'Upload failed. Check your connection and retry.';
      });
  }

  /* === VALIDATION === */
  function markError(id, on) {
    var f = $(id); if (!f) return;
    var field = f.closest('.field');
    if (!field) return;
    if (on) { field.classList.add('error'); } else { field.classList.remove('error'); }
  }
  function validEmail(s) { return typeof s === 'string' && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s.trim()); }
  function requireNonEmpty(id) { var v = $(id).value.trim(); markError(id, !v); return !!v; }
  function requireEmail(id) { var v = $(id).value.trim(); var ok = validEmail(v); markError(id, !ok); return ok; }

  function validateStep(n) {
    if (n === 1) {
      var ok = true;
      if (!requireNonEmpty('sgFirstName')) { ok = false; }
      if (!requireNonEmpty('sgLastName')) { ok = false; }
      if (!requireEmail('sgEmail')) { ok = false; }
      return ok;
    }
    if (n === 2) {
      if (mode === 'delegate') {
        var ok = true;
        if (!requireNonEmpty('sgDelegateName')) { ok = false; }
        if (!requireEmail('sgDelegateEmail')) { ok = false; }
        return ok;
      }
      return true;
    }
    if (n === 3) {
      var ok = true;
      if (!requireNonEmpty('sgCompany')) { ok = false; }
      if (!requireNonEmpty('sgTitle')) { ok = false; }
      return ok;
    }
    if (n === 4) {
      var ok = true;
      if (!requireNonEmpty('sgHeroQuote')) { ok = false; }
      if (!requireNonEmpty('sgBio')) { ok = false; }
      return ok;
    }
    if (n === 6) {
      var count = 0;
      var inputs = document.querySelectorAll('.sg-geo-input');
      for (var i = 0; i < inputs.length; i++) { if (inputs[i].value.trim()) { count++; } }
      if (count < 3) {
        alert('Please provide at least 3 long-tail AI search phrases (10 recommended).');
        return false;
      }
      return true;
    }
    return true;
  }

  /* === NAV === */
  $('sgNextBtn').addEventListener('click', function() {
    if (!validateStep(currentStep)) { return; }
    if (visiblePos(currentStep) === totalSteps) {
      submitAll();
      return;
    }
    showStep(nextStepNum(currentStep));
  });
  $('sgBackBtn').addEventListener('click', function() {
    if (visiblePos(currentStep) > 1) { showStep(prevStepNum(currentStep)); }
  });

  /* === SUBMIT === */
  function gv(id) { var el = $(id); return el ? el.value.trim() : ''; }
  function gatherVideos() {
    var items = document.querySelectorAll('#sgVideosContainer .repeater-item');
    var out = [];
    for (var i = 0; i < items.length; i++) {
      var t = items[i].querySelector('.sg-video-title');
      var u = items[i].querySelector('.sg-video-url');
      var d = items[i].querySelector('.sg-video-desc');
      var url = u ? u.value.trim() : '';
      if (url) {
        out.push({
          title: t ? t.value.trim() : '',
          url: url,
          description: d ? d.value.trim() : ''
        });
      }
    }
    return out;
  }
  function gatherTestimonials() {
    var items = document.querySelectorAll('#sgTestimonialsContainer .repeater-item');
    var out = [];
    for (var i = 0; i < items.length; i++) {
      var q = items[i].querySelector('.sg-test-quote');
      var n = items[i].querySelector('.sg-test-name');
      var c = items[i].querySelector('.sg-test-company');
      var quote = q ? q.value.trim() : '';
      if (quote) {
        out.push({
          quote: quote,
          name: n ? n.value.trim() : '',
          company: c ? c.value.trim() : ''
        });
      }
    }
    return out;
  }
  function gatherDist() {
    var items = document.querySelectorAll('#sgDistContainer .repeater-item');
    var out = [];
    for (var i = 0; i < items.length; i++) {
      var n = items[i].querySelector('.sg-dist-name');
      var e = items[i].querySelector('.sg-dist-email');
      var r = items[i].querySelector('.sg-dist-role');
      var name = n ? n.value.trim() : '';
      var email = e ? e.value.trim() : '';
      if (name && email) {
        out.push({ name: name, email: email, role: r ? r.value.trim() : '' });
      }
    }
    return out;
  }
  function gatherKeywords() {
    var out = [];
    var inputs = document.querySelectorAll('.sg-geo-input');
    for (var i = 0; i < inputs.length; i++) {
      var v = inputs[i].value.trim();
      if (v) { out.push(v); }
    }
    return out;
  }

  function buildPayload() {
    return {
      first_name: gv('sgFirstName'),
      last_name: gv('sgLastName'),
      email: gv('sgEmail'),
      phone: gv('sgPhone'),
      company: gv('sgCompany'),
      title_position: gv('sgTitle'),
      years_in_industry: gv('sgYears'),
      revenue_value: gv('sgRevenue'),
      geographic_reach: gv('sgGeo'),
      custom_stat: gv('sgStat'),
      company_description: gv('sgCompDesc'),
      hero_quote: gv('sgHeroQuote'),
      bio: gv('sgBio'),
      credentials: gv('sgCreds'),
      expertise_topics: gv('sgTopics'),
      recognition: gv('sgRecog'),
      linkedin_url: gv('sgLinkedIn'),
      website_url: gv('sgWebsite'),
      headshot_url: uploadedHeadshotUrl || null,
      onboarding_contact_name: gv('sgOnbName'),
      onboarding_contact_email: gv('sgOnbEmail'),
      onboarding_contact_phone: gv('sgOnbPhone'),
      onboarding_contact_position: gv('sgOnbPos'),
      videos: gatherVideos(),
      testimonials: gatherTestimonials(),
      distribution_contacts: gatherDist(),
      geo_keywords: gatherKeywords(),
      company_website_confirm: gv('sgHoneypot')
    };
  }

  function submitAll() {
    var btn = $('sgNextBtn');
    btn.disabled = true;
    btn.textContent = 'Submitting\u2026';
    var payload = buildPayload();

    // If user is in delegate mode AND we have no delegation token (fresh public
    // form), go to /delegate/create. Backend creates pending row + emails
    // delegate. The guest's own submission is NOT counted as profile_complete.
    if (!delegationToken && mode === 'delegate') {
      var delegatePayload = {
        first_name: payload.first_name,
        last_name: payload.last_name,
        email: payload.email,
        phone: payload.phone,
        delegated_to_name: gv('sgDelegateName'),
        delegated_to_email: gv('sgDelegateEmail'),
        company_website_confirm: payload.company_website_confirm
      };
      fetch(API + '/delegate/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(delegatePayload)
      })
        .then(function(r) { return r.json(); })
        .then(function(data) {
          if (data.success) {
            $('sgForm').style.display = 'none';
            $('sgHeader').style.display = 'none';
            $('sgLeaderInfo').style.display = 'none';
            $('sgSuccessTitle').textContent = 'Delegation sent!';
            $('sgSuccessMsg').textContent = 'We just emailed ' + gv('sgDelegateEmail') + ' a secure link to complete your profile. You can close this tab.';
            $('sgSuccess').style.display = 'block';
          } else {
            btn.disabled = false;
            btn.textContent = 'Submit';
            alert(data.error || 'Submission failed. Please try again.');
          }
        })
        .catch(function() {
          btn.disabled = false;
          btn.textContent = 'Submit';
          alert('Network error. Please try again.');
        });
      return;
    }

    // Normal submit — delegate (token) or public self-fill.
    var submitUrl = delegationToken
      ? API + '/token/' + encodeURIComponent(delegationToken) + '/submit'
      : API + '/submit';
    fetch(submitUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (data.success) {
          $('sgForm').style.display = 'none';
          $('sgHeader').style.display = 'none';
          $('sgLeaderInfo').style.display = 'none';
          $('sgSuccess').style.display = 'block';
        } else {
          btn.disabled = false;
          btn.textContent = 'Submit';
          alert(data.error || 'Submission failed. Please try again.');
        }
      })
      .catch(function() {
        btn.disabled = false;
        btn.textContent = 'Submit';
        alert('Network error. Please try again.');
      });
  }

  // Init
  setProgress();
})();
