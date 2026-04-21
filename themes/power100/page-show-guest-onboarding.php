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
<div style="min-height:100vh;background:#0c0c0c;color:#d4d4d4;">
<div class="p100-sg">

  <div id="sgHeader" class="header">
    <img decoding="async" src="https://power100.io/wp-content/uploads/2026/01/Power100-Icon-Hi-Res-and-Large-1.png" alt="Power100">
    <div class="show-badge">Outside The Lines Podcast</div>
    <h1 id="sgHeaderTitle">Guest Onboarding</h1>
    <p id="sgHeaderSub">Tell us about yourself so we can build your Inner Circle contributor page.</p>
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
        <input type="text" id="sgHeroQuote" maxlength="220" placeholder="A powerful one-line statement that captures your philosophy.">
        <div class="hint">Shows up as the opening line on your contributor page. ~180 characters.</div>
        <div class="field-error">Required.</div>
      </div>
      <div class="field">
        <label>Expertise bio<span class="req">*</span></label>
        <textarea id="sgBio" placeholder="Your career journey, key accomplishments, and what makes you an authority."></textarea>
        <div class="hint">3&ndash;6 sentences works well. We can refine it.</div>
        <div class="field-error">Required.</div>
      </div>
      <div class="field">
        <label>Key credentials</label>
        <textarea id="sgCreds" placeholder="One credential per line. Awards, certifications, notable roles..."></textarea>
      </div>
      <div class="field">
        <label>Expertise topics</label>
        <textarea id="sgTopics" placeholder="One topic per line. What you can speak authoritatively on."></textarea>
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

</div></div>
<?php wp_footer(); ?>
<script>
(function() {
  var s = document.createElement('script');
  s.src = 'https://tpx.power100.io/api/assets/show-guest-form.js';
  s.async = false;
  document.head.appendChild(s);
})();
</script>
</body>
</html>
