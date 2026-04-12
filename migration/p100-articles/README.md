# P100 Article Migration

Bulk migration of ~280 articles from old `power100.io` (Elementor-based, GoDaddy-hosted) to the new P100 site (`power100-theme` on Vultr/RunCloud).

**Status**: Phase A + Phase B (dry-run) shipped 2026-04-10. Phase C (article migration) and Phase D (verification) pending.

See `memory/project_p100_article_migration.md` for the full project status, decisions, and constraints.

## Architecture

```
Old Power100 (GoDaddy)              New Power100 (Vultr/RunCloud)
   wp-rest API (read)        →             wp-cli (create/update)
   /wp-json/wp/v2/posts                     ssh runcloud@155.138.198.250
   /wp-json/wp/v2/media                     wp post create / wp post meta update
   Basic auth (read-only)                   wp media import (or rsync)
```

**Key constraints**:
- ❌ No SSH/SFTP to old site (GoDaddy-hosted) — REST API READ only
- ✅ SSH/WP-CLI access to new site
- 🚨 SEO preservation: post slugs MUST be byte-for-byte identical to old site (preserves non-breaking hyphens, accented chars, etc.)
- 🚨 SEO preservation: post_date and post_date_gmt MUST be original publish dates, not migration date
- 🚨 SEO preservation: image URLs MUST be preserved (`/wp-content/uploads/YYYY/MM/...` paths byte-for-byte)
- ✅ REST API for create operations on new site is BROKEN (401) — must use WP CLI via SSH

## Phases

| Phase | Script | Purpose | Status |
|---|---|---|---|
| **A** | `01-create-categories.js` | Build new category hierarchy on new site (5 industry pillars + service subcats + tag taxonomies) | ✅ shipped |
| **B** | `02-migrate-media.js` | REST enumerate old site media library, download all files preserving date paths | 🟡 dry-run shipped |
| **B+** | `03-backfill-attachments.php` | After media files are on disk, create WP attachment records pointing at them | ⏳ pending |
| **C** | `04-migrate-articles.js` | Migrate posts: extract pr_* fields from Elementor HTML, populate ACF, set slugs/dates, link author to EC | ⏳ pending |
| **D** | `05-verify.js` | Compare counts, validate slugs, check for leftover power100.io URLs | ⏳ pending |

## Idempotency

Every migrated article gets a `_p100_old_post_id` post meta on the new site. Re-running any phase converges in place — it never creates duplicates. The 10 already-migrated articles will get UPDATED (not duplicated) when Phase C runs over them.

## Configuration

Copy `.env.example` to `.env` and fill in:
```
OLD_SITE_BASE=https://power100.io
OLD_SITE_AUTH=Basic cG93ZXIxMDA6...
NEW_SITE_SSH=runcloud@155.138.198.250
NEW_SITE_BASE=http://power100.gikrtuqjdl-qp3v91no7450.p.temp-site.link
NEW_SITE_WP_PATH=/home/runcloud/webapps/power100
```

## Running

Each phase is a standalone Node script (Node 18+ required for built-in fetch). Most support a `--dry-run` flag.

```bash
# Phase A
node 01-create-categories.js --dry-run    # Show what would be created
node 01-create-categories.js              # Actually create

# Phase B
node 02-migrate-media.js --dry-run        # Enumerate, count, sample (no downloads)
node 02-migrate-media.js                  # Download everything (resumable)
```

State files in `state/` track progress so any phase can be interrupted and resumed.

## Lib utilities

- `lib/rest-client.js` — Old site WP REST API client with pagination + Basic auth
- `lib/wp-cli.js` — Run wp-cli commands on the new site via SSH
- `lib/logger.js` — Structured logging with progress indicators

## See also

- `memory/project_p100_article_migration.md` — full project context
- `memory/project_pillar_restructure_2026_04_10.md` — pillar restructure (affects Phase A categories)
- `memory/feedback_html_dom_not_regex.md` — content cleaning lessons
- `themes/power100/inc/p100-content-cleaner.php` — the PHP cleaner Phase C will port to JS
