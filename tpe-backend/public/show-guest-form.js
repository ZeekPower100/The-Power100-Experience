(function() {
  var params = new URLSearchParams(window.location.search);
  var delegationToken = params.get('delegation_token') || params.get('token');
  var API = 'https://tpx.power100.io/api/show-guests';
  var contributorData = null;
  var mode = 'self';
  var currentStep = 1;
  var totalSteps = 8;
  var stepTitles = [
    'Your basics', "Who's filling this out", 'Your company & role',
    'Leadership narrative', 'Media & social proof', 'AI search phrases',
    'Distribution & contact', 'Headshot & review'
  ];
  var uploadedHeadshotUrl = '';

  function $(id) { return document.getElementById(id); }
  function setProgress() {
    var pct = (currentStep / totalSteps) * 100;
    $('sgProgressFill').style.width = pct + '%';
    $('sgStepLabel').textContent = 'Step ' + currentStep + ' of ' + totalSteps;
    $('sgStepTitle').textContent = stepTitles[currentStep - 1] || '';
    $('sgBackBtn').style.display = currentStep > 1 ? 'inline-block' : 'none';
    $('sgNextBtn').textContent = currentStep === totalSteps ? 'Submit' : 'Continue';
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
    if (maxlen) { inp.maxLength = maxlen; }
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
      inp.maxLength = 100;
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
  var fileInp = $('sgHeadshotFile');
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
    if (currentStep === totalSteps) {
      submitAll();
      return;
    }
    // If user chose delegate mode on step 2, handle the delegate branch:
    //   Option A: just collect name/email and submit whole form at end; backend
    //   creates the pending row + emails the delegate. But simpler UX: if they
    //   pick delegate, we ALSO let them keep filling in what they know, and on
    //   final submit we route to /delegate/create with a prefill payload.
    showStep(currentStep + 1);
  });
  $('sgBackBtn').addEventListener('click', function() {
    if (currentStep > 1) { showStep(currentStep - 1); }
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
