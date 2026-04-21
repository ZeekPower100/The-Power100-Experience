# Create or Update a WordPress Page on power100.io

## TRIGGER ME AUTOMATICALLY WHEN YOU SEE:

### Verbal triggers
- "create a WP page", "update the WP page", "push to WordPress", "build a page on power100.io"

### Code-pattern triggers (just as important — don't skip these)
- About to POST to `wp-json/wp/v2/pages` (any script doing this — this is the signal)
- Creating or editing a file matching `create-*-page.js`, `update-*-page.js`, `build-*-page.js`, `deploy-*-page.js`
- Composing a `content:` string that includes `<style>`, `<script>`, or long HTML for a WP REST payload
- Editing `themes/power100/page-*.php` and planning to redeploy via REST

**If any of these match, STOP and read this file in full before writing/running the script.** Most WP page incidents come from not remembering the wpautop rules at push time.

## MANDATORY for every WP page creation/update:

### 1. Use the shared sanitization utility — ALWAYS

`scripts/wpautop-safe.js` exposes three helpers. Any new WP REST push script MUST use them:

```js
const { wpautopSafeCss, wpautopSafeHtml, verifyWpautopSafe } = require('./scripts/wpautop-safe');

// Before composing `content`:
const style = wpautopSafeCss(rawCss);       // collapses CSS to a single line
const body  = wpautopSafeHtml(rawBodyHtml); // strips blank lines from HTML

const content = `<style>${style}</style>\n<div ...>\n${body}\n</div>`;
// POST to wp-json/wp/v2/pages with { content, template: 'elementor_canvas', ... }

// After the POST succeeds, fetch the rendered URL and canary-check:
const rendered = await fetchText(result.body.link);
const issues = verifyWpautopSafe(rendered);
if (issues.length) throw new Error('wpautop broke the page:\n- ' + issues.join('\n- '));
```

Why this matters: wpautop converts blank lines into `</p><p>` — inside `<style>` it wraps rules so `display:none` stops applying; inside `<script>` it corrupts `&&` to `&#038;&#038;` and injects `<p>` mid-function.

### 2. Page creation defaults
- ALWAYS set `template: 'elementor_canvas'` — prevents default theme chrome
- ALWAYS include dark background CSS overrides for all theme containers (see section 5)
- ALWAYS set `comment_status: 'closed'` and `ping_status: 'closed'`

### 3. Content rules (wpautop landmines)
1. **Strip ALL blank lines** before pushing — use `wpautopSafeHtml()` and `wpautopSafeCss()`
2. **NEVER use `&&`** inside `<script>` blocks — use nested `if` statements (wpautop turns `&` into `&#038;`)
3. **NEVER use `innerHTML`** for interactive elements — use `document.createElement()` + `appendChild()`
4. **NEVER use inline `onchange`/`onclick`** attributes — use `addEventListener` in JS (CSP blocks inline handlers)
5. **HTML entities in JS** (`&rarr;`, `&larr;`) get corrupted — use unicode (`→`, `←`)
6. **`\x3c` hex escapes** get evaluated by Node in template literals — use `createElement` instead
7. If you embed a big JS file, **host it at `/api/assets/*.js` on the backend** and inject via a tiny `<script>` loader — keeps WP page content small and sidesteps KSES thresholds on high-field-count forms

### 4. Cache-busting on backend-hosted JS
When the inline loader references `tpx.power100.io/api/assets/whatever.js`, append `?v=YYYYMMDD-NN` and bump `NN` on every deploy so returning browsers can't serve a stale copy. The backend already sets `Cache-Control: no-cache, must-revalidate` on `/api/assets`, but the query-string bump protects anyone who loaded the page before that header was in place.

### 5. CSS overrides (include on EVERY dark page)
```css
body, html { background: #0c0c0c !important; }
.elementor, .elementor-inner, .elementor-section-wrap,
.elementor-element, .elementor-widget-container,
.elementor-page, .site-main,
.content-inner, .page-inner, .main-content,
article, .hentry, .type-page,
#primary, .primary, .container, .site-content, .page-wrap,
#content, .content-area, .entry-content { background: #0c0c0c !important; margin: 0 !important; padding: 0 !important; border: none !important; box-shadow: none !important; max-width: 100% !important; width: 100% !important; }
.header-wrap, footer#footer, footer.footer-wrap,
.site-header, .site-footer, #masthead, #colophon,
.sidebar, #secondary, .widget-area, aside,
.entry-title, .page-title, .entry-header, .page-header,
.breadcrumbs, .breadcrumb { display: none !important; }
```

### 6. Verification after push (non-negotiable)
Call `verifyWpautopSafe(renderedHtml)` after every push. If the returned array is non-empty, fix and re-push — do not declare success. Checks:
1. `<p>` or `</p>` inside `<style>` blocks (would break CSS)
2. `<p>` or `</p>` inside `<script>` blocks (would break JS)
3. CSS rules wrapped in `<p>...</p>` (the classic `display:none`-doesn't-apply bug)
4. `&#038;` entity inside any `<script>` (the `&&` corruption bug)

### 7. Auth
- WP REST API: `Basic cG93ZXIxMDA6VjJ1YnpMcHQ3SW5aNmd1Z1o0ckVSN05X`
- Endpoint: `https://power100.io/wp-json/wp/v2/pages`

## Historical incidents to learn from
- **2026-04-21 show-guest form**: CSS had blank lines between rules. wpautop wrapped every rule in `<p>…</p>`. `.step { display: none; }` stopped applying, so all 8 form steps rendered simultaneously. ~2 hours lost chasing "cache" and "incognito" before finding the wpautop bug in the served HTML. Fix was single-line CSS via `wpautopSafeCss()`. This is exactly the incident that drove this utility.
