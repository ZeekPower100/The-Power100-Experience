# Add a New Show to the IC Content Pipeline

Add a new show across all 3 systems: YouTube playlist, database (local + production), and n8n Playlist Poller (DEV + PRODUCTION).

## Arguments:
- $ARGUMENTS: Show name (e.g., "Grit To Gold w/Paul Burleson")

## Process:

### Step 1: Get Show Details
Ask the user for:
- **Show name** (e.g., "Grit To Gold w/Paul Burleson")
- **Host name** (e.g., "Paul Burleson")
- **Format**: video_podcast | audio_podcast | live_session
- **YouTube playlist visibility**: Must be **Public** (not Unlisted) for the API to discover it

### Step 2: Find YouTube Playlist ID
Write and run `list-playlists.js` to pull all playlists from the Power100 YouTube channel:
```javascript
const https = require('https');
const API_KEY = 'AIzaSyB9xwFISHz4Wx1ZjdHJh19XmLmqJ9CMHlU';
const CHANNEL_ID = 'UC1tprkKLLLc6jYK4-PdD1ZQ';
// ... fetch playlists, search by keyword
```
- Channel ID: `UC1tprkKLLLc6jYK4-PdD1ZQ`
- API Key: `AIzaSyB9xwFISHz4Wx1ZjdHJh19XmLmqJ9CMHlU`
- Playlists must have "| IC" suffix and be set to **Public**
- If not found, ask user to create the playlist on YouTube first

### Step 3: Add to Database (Local)
```sql
INSERT INTO shows (name, slug, wp_term_slug, hosts, format, created_at, updated_at)
VALUES ('<name>', '<slug>', '<slug>', '<host>', '<format>', NOW(), NOW())
ON CONFLICT DO NOTHING RETURNING id, name, slug;
```
Run via: `powershell -Command ".\quick-db.bat \"<SQL>\""`
Note the returned `id` — needed for n8n.

### Step 4: Add to Database (Production)
Same SQL but run via `mcp__aws-production__exec`:
```bash
PGPASSWORD=<from .env.production> psql -h <host> -U <user> -d <db> -c "<SQL>"
```
Production credentials: `tpe-backend/.env.production`

### Step 5: Update n8n Playlist Poller (DEV + PRODUCTION)
Both workflows have a "Define Shows" code node that returns an array.

Add a new entry:
```javascript
{ json: { showId: <db_id>, showName: "<name>", playlistId: "<yt_playlist_id>", showSlug: "<slug>" } }
```

**Workflow IDs:**
| Environment | Workflow ID |
|-------------|-------------|
| DEV | `Qtu6PmLluiLyAx1J` |
| PRODUCTION | `C7dNfvdrj87wXWOJ` |

**Update method:** Write full workflow JSON to a temp file, PUT via n8n API:
```bash
curl -s -X PUT "https://n8n.srv918843.hstgr.cloud/api/v1/workflows/<ID>" \
  -H "Content-Type: application/json" \
  -H "X-N8N-API-KEY: <from .mcp.json n8n-mcp.env.N8N_API_KEY>" \
  -d @<temp-file>.json
```

**Critical differences between DEV and PROD:**
- DEV "Ingest to TPX" URL: ngrok URL (check current ngrok session)
- PROD "Ingest to TPX" URL: `https://tpx.power100.io/api/content/ingest`
- DEV log prefix: `[Playlist Poller DEV]`
- PROD log prefix: `[Playlist Poller]`
- DEV "Fetch & Extract" API key: `AIzaSyD1v2TTobbHTzUmymu5cSRGUBLsQRdloHU`
- PROD "Fetch & Extract" API key: `AIzaSyB9xwFISHz4Wx1ZjdHJh19XmLmqJ9CMHlU`

### Step 6: Verify
- Confirm database IDs match in both local and production
- Confirm n8n workflows updated (check response includes new show in nodes)
- Confirm PRODUCTION workflow is still `"active": true`
- Clean up temp files

### Step 7: Update WordPress (Reminder)
Remind user: Browser Claude / WordPress also needs the show added to `inc/post-types.php` if not already done.

## Slug Generation:
Convert show name to slug: lowercase, spaces to hyphens, strip special chars.
- "Grit To Gold w/Paul Burleson" → `grit-to-gold`
- Strip "w/Host Name" from slug, keep only the show title portion

## Current Shows (as of March 2026):
| ID | Show | Slug | Playlist ID |
|----|------|------|-------------|
| 1 | PowerChat | powerchat | PLcIee7rhlr7UWJ69NBFzx20jfWfcR3H5y |
| 2 | Inner Circle with Greg & Paul | inner-circle | PLcIee7rhlr7UDzgXQrtcjJ52mH9iAYhZn |
| 3 | Outside The Lines with Ray & Greg | outside-the-lines | PLcIee7rhlr7UZTp5S46cOUD2YUNin92Tf |
| 6 | Feature Interviews | feature-interviews | PLcIee7rhlr7VQP9qxxdj5LqQ1Mwc7GYw1 |
| 7 | Events | events | PLcIee7rhlr7UXgAQPOkRj8xKEzatWvYrb |
| 8 | Day In The Life | day-in-the-life | PLcIee7rhlr7VwsQ475TUPP_ThQPBFw3nJ |
| 9 | Executive Interviews | executive-interviews | PLcIee7rhlr7XbRJNA4Kl344DV1GGvUV75 |
| 10 | Customer Interviews | customer-interviews | PLcIee7rhlr7V5_UT38Rgw9YmkZ1dfMHIQ |
| 11 | Rapid Fire Interviews | rapid-fire-interviews | PLcIee7rhlr7XiyM_XGSqAPNOFalkgwXLT |
| 12 | Highlights | highlights | PLcIee7rhlr7XteVKYQJDLGNrottjj3y59 |
| 13 | Power100 Spotlight | power100-spotlight | PLcIee7rhlr7WF0voGNakHNEIk2msfdNm5 |
| 14 | Grit To Gold w/Paul Burleson | grit-to-gold | PLcIee7rhlr7WqsoEJbXutD_uCo1jADZIE |
| 15 | Beyond The Hammer w/Brian Gottlieb | beyond-the-hammer | PLcIee7rhlr7VdDiB4u1rcFRg_ukx_QS8F |
| 16 | Clever Marketing w/Daniel Rahmon | clever-marketing | PLcIee7rhlr7WESIEsu3VQjBEdjvgFVHDp |
| 17 | Remodel Boom w/Jadon Moerdyk | remodel-boom | PLcIee7rhlr7WYMIY_7ORPfgQ4rmUu_KiE |
