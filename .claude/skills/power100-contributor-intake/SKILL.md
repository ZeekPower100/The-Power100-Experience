---
name: power100-contributor-intake
description: Research, profile, and publish a new Power100 contributor or Expert Contributor end-to-end. Auto-enriches via Apify (LinkedIn + Google SERP) + ranked lander + company website + Sonnet synthesis, creates the tpedb expert_contributors row, publishes the lander on staging.power100.io, and auto-mirrors to Inner Circle as a dark-themed ic_contributor post. Replaces the legacy n8n-based intake (which was lander-only and required disconnected n8n MCP). Use whenever the user says "add [Name] as a contributor", "set up [Name]'s lander", "let's do [Name] next", provides a LinkedIn screenshot, or drops a Drive folder for a new person — partial info is fine, the research lanes fill the gaps.
---

# Power100 Contributor Intake (v2 — research + publish + IC mirror)

End-to-end pipeline that takes a contributor name (and optionally a company, headshot URL, or Drive folder) and produces:
1. A populated `expert_contributors` row in tpedb
2. A live published lander on `staging.power100.io/{slug}-contributor/`
3. A dark-themed mirror on `innercircle.power100.io/expert-contributor/{slug}-contributor/`
4. Optional override of the auto-enrichment headshot (use a Drive image instead of LinkedIn's)

**Origin:** Codified 2026-04-26 after running this exact flow for Brian McCauley. Replaces the older n8n-based skill which (a) only created the lander, (b) required the n8n MCP which was disconnected, and (c) couldn't do auto-research.

## When to use

- User says "add [Name] as a contributor", "set up a contributor lander for X", "let's do [Name] next", "we have a new article from [Name] who isn't in the system yet"
- User provides a Drive folder for someone (often contains headshot + article + supporting photos)
- User provides a LinkedIn URL or screenshot
- User mentions any new contributor by name with the intent to publish their lander

## Arguments

`$ARGUMENTS`: Natural language brief containing whatever the user knows. Examples:
- `"Brian McCauley — Director of Sales Training at Cornerstone Building Brands"`
- `"add Sarah Smith from ABC Roofing"`
- `"new contributor Mike Jones, here's his Drive folder: https://drive.google.com/..."`
- Just `"Add Bob Wilson"` (research lanes will fill in the rest)

## Process

### Step 1 — Resolve inputs

From the brief, extract:
- **name** (required)
- **company** (helps LinkedIn discovery — even if just "their employer")
- **websiteUrl** (helps lane 3 of research)
- **headshotAttachmentId** (if user supplies their own headshot — see Step 1.5)
- **contributor_class** — default `'contributor'` unless user explicitly says paid EC

If a Drive folder URL is supplied, invoke the `gdrive-list` skill first to enumerate files. Headshot is usually `*headshot*.jpg` or `*Thumbnail*.jpg`. Article doc is usually `*.docx`.

### Step 1.5 — Headshot override (optional)

If user supplies a specific headshot (Drive file or external URL), upload it to staging.power100 media first so the upserter can sideload it as the canonical image:

```bash
# If from Drive (need to download first via the Vultr OAuth)
ssh runcloud@45.76.62.153 "python3 /home/runcloud/thumbnail-system/scripts/drive-download.py {file_id} /tmp/headshot.jpg"
scp runcloud@45.76.62.153:/tmp/headshot.jpg /tmp/headshot.jpg

# Upload to staging power100 media library
AUTH=$(echo -n "$STAGING_P100_ADMIN_USER:$STAGING_P100_ADMIN_APP_PWD" | base64 -w 0)
curl -s -H "Authorization: Basic $AUTH" \
  -H "Content-Type: image/jpeg" \
  -H "Content-Disposition: attachment; filename={slug}-headshot.jpg" \
  --data-binary @/tmp/headshot.jpg \
  "https://staging.power100.io/wp-json/wp/v2/media"
# Returns { id: 1350, source_url: "https://staging.power100.io/wp-content/uploads/.../{slug}-headshot.jpg" }
```

Save the `source_url` — you'll FORCE it as the final headshot, overriding whatever LinkedIn returns.

### Step 2 — Build the one-shot enrichment script

Pattern is `migration/contributor-backfill/enrich-{first-last}.js`. Reference: `migration/contributor-backfill/enrich-brian-mccauley.js`.

The script must:
1. Load `.env.production` (`require('dotenv').config({ path: 'tpe-backend/.env.production' })`)
2. Find or create the `expert_contributors` row (lookup by first_name + last_name; insert if missing with placeholder email `{slug}@placeholder.power100.io`)
3. Call `research.researchContributor({ name, company, websiteUrl, contributorClass })` — runs 4 lanes in parallel (~30-60s)
4. UPDATE the row with the synthesized fields, **but FORCE the user-supplied headshot URL** (don't let the LinkedIn one win)
5. Call `enrich.upsertContributorLander(row, { source: 'manual_{slug}' })` — creates the P100 page and **fires `mirrorToInnerCircle()` non-awaited**
6. Sleep ~3 seconds before `process.exit(0)` so the fire-and-forget IC mirror has time to complete

```js
const result = await enrich.upsertContributorLander(row, { source: 'manual_brian_mccauley' });
console.log(`✓ ${result.action} → ${result.wp_page_url}`);
await new Promise(r => setTimeout(r, 3000));  // wait for non-awaited IC mirror
process.exit(0);
```

### Step 3 — Run + verify

```bash
node migration/contributor-backfill/enrich-{slug}.js
```

Expected output:
```
[upsertContributorLander] Sideloaded headshot {att_id} for "{Name}"
[upsertContributorLander] Created new page {pid} for "{Name}" (source=manual_{slug}, type=contributor)
✓ created → https://staging.power100.io/{slug}-contributor/
[mirrorToInnerCircle] created ic_id={ic_id} for "{Name}"
```

Verify both:
```bash
curl -s -o /dev/null -w "P100: HTTP=%{http_code}\n" "https://staging.power100.io/{slug}-contributor/"
curl -s -o /dev/null -w "IC: HTTP=%{http_code}\n" "https://innercircle.power100.io/expert-contributor/{slug}-contributor/"
```

### Step 4 — If IC mirror missed (race condition fix)

If the IC URL returns 404, the fire-and-forget mirror got killed before completing. Manually fire it (substitute {P100_PAGE_ID}, {slug}, {Name}):

```bash
node -e "
require('dotenv').config({ path: 'tpe-backend/.env.production' });
const axios = require('axios');
const STG = 'https://staging.power100.io';
const STG_AUTH = 'Basic ' + Buffer.from(process.env.STAGING_P100_ADMIN_USER + ':' + process.env.STAGING_P100_ADMIN_APP_PWD).toString('base64');
const IC = 'https://innercircle.power100.io';
const IC_KEY = process.env.IC_REST_API_KEY || process.env.TPX_IC_API_KEY;
(async () => {
  const r = await axios.get(\`\${STG}/wp-json/wp/v2/pages/{P100_PAGE_ID}?context=edit&_fields=meta,link,title\`, { headers: { Authorization: STG_AUTH } });
  const meta = r.data.meta || {};
  const ecMeta = {};
  for (const [k,v] of Object.entries(meta)) if (k.startsWith('ec_') && v !== null && v !== '') ecMeta[k] = v;
  let headshotUrl = null;
  if (ecMeta.ec_headshot) {
    try { const m = await axios.get(\`\${STG}/wp-json/wp/v2/media/\${ecMeta.ec_headshot}?_fields=source_url\`, { headers: { Authorization: STG_AUTH } }); headshotUrl = m.data.source_url; } catch(e){}
  }
  const res = await axios.post(\`\${IC}/wp-json/ic/v1/expert-contributor/upsert\`, {
    p100_page_id: {P100_PAGE_ID}, p100_page_url: r.data.link, slug: '{slug}-contributor', title: '{Name}', meta: ecMeta, headshot_url: headshotUrl,
  }, { headers: { 'X-IC-API-Key': IC_KEY, 'Content-Type': 'application/json' } });
  console.log('IC mirror:', res.data.action, 'ic_id=' + res.data.ic_id);
})().catch(e => console.error(e.response?.data || e.message));
"
```

## Company logo — scrape BOTH light + dark variants when available

Two fields exist (codified 2026-04-29):
- `ec_company_logo` — light-bg variant (dark text). Used by power100.io (light theme).
- `ec_company_logo_dark` — dark-bg variant (white text). Used by the IC mirror (dark theme). Falls back to `ec_company_logo` if blank.

When researching a new contributor's company, always look for both variants on the company website press kit / brand page. Many homebuilder brands publish both "primary" + "reversed/inverted" logos. If you only find one variant, that's fine — the IC template falls back.

Add new entries to `tpe-backend/data/legacy-company-logos.json` with both URLs:
```json
"Company Name": {
  "url": "https://...light-bg-logo.png",
  "url_dark": "https://...dark-bg-logo.png",
  "attachment_id": 12345
}
```

For local files on disk (operator dropped logos in Downloads), use `migration/contributor-backfill/apply-local-company-logos.js` — edit the MANIFEST array with `{ company, light, dark, aliases }` and run.

## What NOT to do

- **Don't use the n8n MCP** (`mcp__n8n-mcp__n8n_trigger_webhook_workflow`) — disconnected as of 2026-04-26
- **Don't curl the n8n webhook directly** — bypasses the auto-enrichment + IC mirror chain entirely
- **Don't manually build the JSON payload** like the old skill — `researchContributor()` does this from name + company alone
- **Don't await `mirrorToInnerCircle`** — it's fire-and-forget by design (P100 is canonical, IC failures shouldn't block); add the 3s sleep before exit instead

## Variation flags

Set `contributor_class` + `ec_contributor_type` based on context:

| User intent | contributor_class | ec_contributor_type | Result |
|---|---|---|---|
| Article writer / show guest / general industry leader | `contributor` | `contributor` | "Power100 Contributor" badge, "Stands Out" headline |
| Paid EC, ranked CEO | `expert_contributor` | `ranked_ceo` | "#N Ranked CEO · Power100 Expert Contributor" badge |
| Paid EC, ranked Partner | `expert_contributor` | `ranked_partner` | "Preferred Partner · Power100 Expert Contributor" badge |
| Paid EC, industry leader (no ranking) | `expert_contributor` | `industry_leader` | "Industry Leader · Power100 Expert Contributor" badge |

Default for ANYONE not explicitly called a paid client = `contributor`. Paid client list is hardcoded in `migration/contributor-backfill/reclassify-ec-to-contributor.js` (currently 7: James Freeman, Peter Svedin, Caleb Nelson, Dominic Caminata, Greg Cummings, Paul Burleson, Richard Hotea).

## Cost / rate

- Apify: ~$0.01 per contributor (LinkedIn discovery + scrape + 4 SERP queries)
- Anthropic Sonnet: ~$0.05 per synthesis call
- Total: ~$0.06 per contributor
- Tier 1 floor: 5 RPM (12s minimum between contributors); use 15s throttle for batch runs

## Reference files

- `tpe-backend/src/services/contributorEnrichmentService.js` — `upsertContributorLander()` + `mirrorToInnerCircle()`
- `tpe-backend/src/services/contributorResearchService.js` — `researchContributor()` 4-lane orchestrator
- `tpe-backend/src/services/apifyLinkedInService.js` — Apify wrappers
- `migration/contributor-backfill/enrich-brian-mccauley.js` — canonical reference one-shot
- `migration/contributor-backfill/auto-enrich-sample-5b.js` — batch pattern (multiple contributors with throttle)
- `themes/inner-circle/inc/rest-api.php` — IC `ic_rest_upsert_expert_contributor` handler (the receiver)
- `memory/reference_ic_contributor_mirror_system.md` — full system reference + gotcha catalog
