// One-shot helper: rewrite the WP template to minimal body (root div + inline injector).
// Keeps the <style> block + PHP header + HTML shell. Removes all form body HTML (now in JS).
const fs = require('fs');
const path = 'themes/power100/page-show-guest-onboarding.php';
const src = fs.readFileSync(path, 'utf8');

// Find body open + close
const bodyOpenMatch = src.match(/<body[^>]*>/);
if (!bodyOpenMatch) { console.error('no body tag'); process.exit(1); }
const bodyOpenEnd = bodyOpenMatch.index + bodyOpenMatch[0].length;
const wpFooterIdx = src.indexOf('<?php wp_footer');
if (wpFooterIdx === -1) { console.error('no wp_footer'); process.exit(1); }

const minimalBody = '\n\n<div id="p100-sg-root"></div>\n\n<script>\n(function() {\n  var s = document.createElement("script");\n  s.src = "https://tpx.power100.io/api/assets/show-guest-form.js";\n  s.async = false;\n  document.head.appendChild(s);\n})();\n</script>\n\n';

const out = src.slice(0, bodyOpenEnd) + minimalBody + src.slice(wpFooterIdx);
fs.writeFileSync(path, out);
console.log('template simplified — body size dropped to minimum');
console.log('new file size:', out.length);
