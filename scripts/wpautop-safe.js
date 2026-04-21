// Reusable utilities for pushing content to the WordPress REST API safely.
//
// WordPress's wpautop filter runs on page content (even Elementor Canvas
// pages). It converts every blank line into </p><p> which — when your content
// includes <style> or <script> blocks — lands INSIDE those blocks and breaks
// them. Symptoms we've hit:
//   - CSS rule after a blank line becomes paragraph text; display:none never
//     applies. (show-guest form, 2026-04-21, ~2 hours lost)
//   - Inline <script> gets </p><p> injected mid-function; parse errors, page
//     behavior wrong. (various)
//
// Use these helpers when composing content before POSTing to wp-json/wp/v2/pages.
// DO NOT write a new WP REST push script without using them.

/**
 * Collapse a CSS block into a single line. wpautop can't break what has no
 * newlines. Rules separated by `}` only is wpautop-safe.
 */
function wpautopSafeCss(css) {
  return String(css).replace(/\s*\n\s*/g, ' ').trim();
}

/**
 * Strip blank lines from an HTML/body chunk. Preserves structure line-by-line
 * but eliminates the `\n\n` sequences that wpautop converts into </p><p>.
 */
function wpautopSafeHtml(html) {
  return String(html).replace(/\n\s*\n/g, '\n').trim();
}

/**
 * Given the rendered HTML of a WP page (post-REST push, post-wpautop),
 * check whether wpautop broke our <style> or <script> blocks. Returns an
 * array of human-readable issue strings. Empty array = safe.
 *
 * Call after every push:
 *   const html = (await fetch(pageUrl)).text();
 *   const issues = verifyWpautopSafe(html);
 *   if (issues.length) throw new Error('wpautop broke the page:\n' + issues.join('\n'));
 */
function verifyWpautopSafe(renderedHtml) {
  const issues = [];
  // <p> or </p> INSIDE <style>...</style>
  const styleMatches = renderedHtml.match(/<style[^>]*>[\s\S]*?<\/style>/gi) || [];
  for (const s of styleMatches) {
    if (/<\/?p\b/.test(s)) {
      issues.push('<p> tag found inside <style> block — wpautop corrupted CSS');
      break;
    }
  }
  // <p> or </p> INSIDE <script>...</script>
  const scriptMatches = renderedHtml.match(/<script[^>]*>[\s\S]*?<\/script>/gi) || [];
  for (const sc of scriptMatches) {
    if (/<\/?p\b/.test(sc)) {
      issues.push('<p> tag found inside <script> block — wpautop corrupted JS');
      break;
    }
  }
  // Known-bad CSS rule signature: `</p>\n<p>.classname {` means a rule was wrapped in <p>
  if (/<\/p>\s*<p>\s*\.[a-zA-Z][\w-]*[^{]*\{/.test(renderedHtml)) {
    issues.push('CSS rule appears wrapped in <p>...</p> — rule will not apply');
  }
  // Entity corruption: `&#038;` inside a single <script>...</script>
  // (WP converts literal `&` to `&#038;`; if you had `&&` in JS, it's now broken)
  for (const sc of scriptMatches) {
    if (/&#038;/.test(sc)) {
      issues.push('&#038; entity found in <script> block — wpautop corrupted `&` (use nested ifs not `&&`)');
      break;
    }
  }
  return issues;
}

module.exports = { wpautopSafeCss, wpautopSafeHtml, verifyWpautopSafe };
