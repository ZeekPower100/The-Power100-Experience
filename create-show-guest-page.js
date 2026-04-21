// Deploy show-guest onboarding form to LIVE power100.io as a self-contained page.
// Converts the PHP theme template into inline HTML+CSS+JS and POSTs via WP REST API.
// Mirrors the EC delegate form pattern (page 27702).
const fs = require('fs');
const https = require('https');
const { wpautopSafeCss, wpautopSafeHtml, verifyWpautopSafe } = require('./scripts/wpautop-safe');

const WP_BASE = 'https://power100.io/wp-json/wp/v2';
const WP_AUTH = 'Basic cG93ZXIxMDA6VjJ1YnpMcHQ3SW5aNmd1Z1o0ckVSN05X';
const TEMPLATE = 'themes/power100/page-show-guest-onboarding.php';

function req(method, url, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      method, hostname: u.hostname, path: u.pathname + u.search,
      headers: {
        Authorization: WP_AUTH,
        'Content-Type': 'application/json',
        ...(data && { 'Content-Length': Buffer.byteLength(data) })
      }
    };
    const r = https.request(opts, (res) => {
      let chunks = '';
      res.on('data', (d) => chunks += d);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(chunks) }); }
        catch { resolve({ status: res.statusCode, body: chunks }); }
      });
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

function extractContent(php) {
  // Extract style block
  const styleMatch = php.match(/<style>([\s\S]*?)<\/style>/);
  if (!styleMatch) throw new Error('no <style> block found');
  // wpautopSafeCss: single-line CSS (wpautop can't inject <p> into what has
  // no blank lines). See scripts/wpautop-safe.js for full rationale.
  const style = wpautopSafeCss(styleMatch[1]);

  // Extract body content — from after <body ...> to before <?php wp_footer();
  const bodyStart = php.indexOf('<body ');
  const bodyContentStart = php.indexOf('>', bodyStart) + 1;
  const wpFooterIdx = php.indexOf('<?php wp_footer');
  if (bodyStart === -1 || wpFooterIdx === -1) throw new Error('could not bound body');
  const bodyHtml = wpautopSafeHtml(php.slice(bodyContentStart, wpFooterIdx));

  // Wrap with background + style scoped to our form
  return `<style>${style}</style>\n<div class="p100-sg-wrapper" style="background:#0c0c0c;min-height:100vh;margin:-20px -20px 0;padding:0;">\n${bodyHtml}\n</div>`;
}

async function main() {
  const php = fs.readFileSync(TEMPLATE, 'utf8');
  const content = extractContent(php);
  console.log(`Extracted content: ${content.length} bytes`);

  // Check if page already exists
  const existing = await req('GET', `${WP_BASE}/pages?slug=show-guest-onboarding&_fields=id,slug,status&per_page=5`);
  console.log(`Existing pages check: ${existing.status}`, existing.body);

  const payload = {
    title: 'Show Guest Onboarding',
    slug: 'show-guest-onboarding',
    status: 'publish',
    template: 'elementor_canvas',
    content,
  };

  let result;
  if (Array.isArray(existing.body) && existing.body.length > 0) {
    const id = existing.body[0].id;
    console.log(`Updating existing page id=${id}`);
    result = await req('POST', `${WP_BASE}/pages/${id}`, payload);
  } else {
    console.log('Creating new page');
    result = await req('POST', `${WP_BASE}/pages`, payload);
  }
  console.log(`Result: ${result.status}`);
  if (result.status >= 200 && result.status < 300) {
    console.log(`SUCCESS: id=${result.body.id}, url=${result.body.link}`);
    // Post-push canary: fetch rendered HTML, check wpautop didn't break anything.
    const pageUrl = result.body.link;
    try {
      const rendered = await new Promise((resolve, reject) => {
        https.get(pageUrl, (res) => {
          let b = '';
          res.on('data', (d) => b += d);
          res.on('end', () => resolve(b));
        }).on('error', reject);
      });
      const issues = verifyWpautopSafe(rendered);
      if (issues.length) {
        console.error('❌ wpautop corruption detected:\n  - ' + issues.join('\n  - '));
        process.exit(2);
      }
      console.log('✅ wpautop verification passed');
    } catch (e) {
      console.warn('⚠️  Could not verify rendered page:', e.message);
    }
  } else {
    console.log('FAILED:', JSON.stringify(result.body).slice(0, 500));
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
