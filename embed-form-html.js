// One-shot helper: embeds the WP form body HTML as a JS string in show-guest-form.js,
// so the WP page content can stay minimal (avoids the 25-input content filter trigger).
const fs = require('fs');

const phpPath = 'themes/power100/page-show-guest-onboarding.php';
const jsPath = 'tpe-backend/public/show-guest-form.js';
const php = fs.readFileSync(phpPath, 'utf8');
const bodyStart = php.indexOf('<body ');
const bodyContentStart = php.indexOf('>', bodyStart) + 1;
const wpFooterIdx = php.indexOf('<?php wp_footer');
let body = php.slice(bodyContentStart, wpFooterIdx).trim();
body = body.replace(/<script[\s\S]*?<\/script>/g, '');

// Escape for JS template literal: backslashes, backticks, ${
const escaped = body
  .replace(/\\/g, '\\\\')
  .replace(/`/g, '\\`')
  .replace(/\$\{/g, '\\${');

const prefix = '// Form HTML template — injected at runtime to keep the WP page content small\nvar SG_FORM_HTML = `' + escaped + '`;\n\n';

let js = fs.readFileSync(jsPath, 'utf8');
// remove prior embed if present
js = js.replace(/\/\/ Form HTML template[\s\S]*?\nvar SG_FORM_HTML = `[\s\S]*?`;\n\n/, '');

// insert at top
js = prefix + js;

// inject call: after the token-reading line, do _root.innerHTML = SG_FORM_HTML
js = js.replace(
  /(var params = new URLSearchParams\(window\.location\.search\);\s*\n\s*var delegationToken[^\n]*\n)/,
  '$1  var _sgRoot = document.getElementById("p100-sg-root"); if (_sgRoot) { _sgRoot.innerHTML = SG_FORM_HTML; }\n'
);

fs.writeFileSync(jsPath, js);
console.log('JS size now:', js.length, 'body embed len:', body.length);
