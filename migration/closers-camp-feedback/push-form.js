// Push form-content.html to legacy WP page 29320 with wpautop-safe transforms.
// Uses scripts/wpautop-safe.js helpers to collapse CSS + strip blank lines so
// wpautop can't poison the <style>/<script> blocks.

const fs = require('fs');
const path = require('path');
const https = require('https');
const { wpautopSafeCss, wpautopSafeHtml, verifyWpautopSafe } = require('../../scripts/wpautop-safe');

const PAGE_ID = 29320;
const AUTH = 'Basic cG93ZXIxMDA6VjJ1YnpMcHQ3SW5aNmd1Z1o0ckVSN05X';

const raw = fs.readFileSync(path.join(__dirname, 'form-content.html'), 'utf8');

// Extract <style>...</style> contents and run them through wpautopSafeCss
let safe = raw.replace(/<style>([\s\S]*?)<\/style>/g, (_, css) => {
  return '<style>' + wpautopSafeCss(css) + '</style>';
});

// Strip blank lines elsewhere (preserves intra-tag content but kills the \n\n
// sequences that wpautop converts to </p><p>).
safe = wpautopSafeHtml(safe);

// Sanity check before push: any leftover blank-line risk?
const issues = verifyWpautopSafe(safe);
if (issues && issues.length) {
  console.error('wpautop-safety issues found, aborting:');
  issues.forEach(i => console.error('  -', i));
  process.exit(1);
}

const body = JSON.stringify({ content: safe });
const req = https.request({
  hostname: 'power100.io',
  path: `/wp-json/wp/v2/pages/${PAGE_ID}`,
  method: 'POST',
  headers: { Authorization: AUTH, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body), 'User-Agent': 'Mozilla/5.0' },
}, (res) => {
  let chunks = '';
  res.on('data', c => chunks += c);
  res.on('end', () => {
    const data = JSON.parse(chunks);
    console.log('HTTP', res.statusCode);
    console.log('Status:', data.status, '| Modified:', data.modified);
    console.log('Live:', data.link);
  });
});
req.on('error', e => { console.error('Push failed:', e.message); process.exit(1); });
req.write(body);
req.end();
