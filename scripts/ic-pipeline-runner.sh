#!/bin/bash
# IC Content Drop — Pipeline Runner
#
# Called from the content-drop form backend. Runs the same pipeline as the
# /ic-video-drop Claude Code skill.
#
# Usage: ic-pipeline-runner.sh <folder_id> <show_id> <guest_names> <job_id> [--webhook URL] [--dry-run]
#
# --webhook URL   POST events to DRC webhook endpoint at each milestone.
#                 Sends x-pipeline-secret header from DRC_PIPELINE_WEBHOOK_SECRET env var.
#                 Events: yt_uploaded, tpx_ingested, ic_draft_created,
#                         awaiting_telegram, published, failed
# --dry-run       Skip all external API calls (Drive, YouTube, TPX, IC, email).
#                 Still fires webhook events with payload.test_mode: true so
#                 the DRC UI can be exercised without touching production systems.
#
# Deployment location: /home/runcloud/thumbnail-system/scripts/ic-pipeline-runner.sh
# Permissions: chmod +x, owner runcloud:runcloud
#
# Logs to: /tmp/icd-job-<job_id>.log (redirected by caller)

set -e

FOLDER_ID="${1:?Folder ID required}"
SHOW_ID="${2:?Show ID required}"
GUESTS="${3:?Guest name(s) required}"
JOB_ID="${4:?Job ID required}"
shift 4

WEBHOOK_URL=""
DRY_RUN=0
while [ $# -gt 0 ]; do
    case "$1" in
        --webhook) WEBHOOK_URL="$2"; shift 2 ;;
        --dry-run) DRY_RUN=1; shift ;;
        *) echo "Unknown option: $1" >&2; shift ;;
    esac
done

# ─── Webhook helper ──────────────────────────────────────────────────────
# Usage: emit_event <event_name> <json_payload>
emit_event() {
    local event="$1"
    local payload="${2:-{\}}"
    [ -z "$WEBHOOK_URL" ] && return 0
    local secret="${DRC_PIPELINE_WEBHOOK_SECRET:-}"
    if [ -z "$secret" ]; then
        log "  (webhook skipped: DRC_PIPELINE_WEBHOOK_SECRET not set)"
        return 0
    fi
    local body
    if [ "$DRY_RUN" = "1" ]; then
        # Merge test_mode: true into payload
        body=$(python3 -c "import json,sys; p=json.loads(sys.argv[1]); p['test_mode']=True; print(json.dumps({'job_id':sys.argv[2],'event':sys.argv[3],'payload':p}))" "$payload" "$JOB_ID" "$event")
    else
        body=$(python3 -c "import json,sys; print(json.dumps({'job_id':sys.argv[1],'event':sys.argv[2],'payload':json.loads(sys.argv[3])}))" "$JOB_ID" "$event" "$payload")
    fi
    curl -s -X POST "$WEBHOOK_URL" \
        -H "x-pipeline-secret: $secret" \
        -H "Content-Type: application/json" \
        -d "$body" -o /dev/null -w "  webhook[$event]: %{http_code}\n" || true
}

# Trap for failures — emit 'failed' event on script error
on_error() {
    local exit_code=$?
    local line_no=$1
    emit_event "failed" "{\"error\":\"script failed at line $line_no (exit $exit_code)\"}"
    exit $exit_code
}
trap 'on_error $LINENO' ERR

# Show-ID → playlist-ID map (mirror of /ic-video-drop skill)
declare -A PLAYLISTS=(
    [1]="PLcIee7rhlr7UWJ69NBFzx20jfWfcR3H5y"   # PowerChat
    [2]="PLcIee7rhlr7UDzgXQrtcjJ52mH9iAYhZn"   # Inner Circle w/ Greg & Paul
    [3]="PLcIee7rhlr7VQP9qxxdj5LqQ1Mwc7GYw1"   # Feature Interviews
    [4]="PLcIee7rhlr7VwsQ475TUPP_ThQPBFw3nJ"   # Day In The Life
    [5]="PLcIee7rhlr7V5_UT38Rgw9YmkZ1dfMHIQ"   # Customer Interviews
    [6]="PLcIee7rhlr7XiyM_XGSqAPNOFalkgwXLT"   # Rapid Fire Interviews
    [7]="PLcIee7rhlr7XteVKYQJDLGNrottjj3y59"   # Highlights
    [8]="PLcIee7rhlr7WF0voGNakHNEIk2msfdNm5"   # Power100 Spotlight
    [9]="PLcIee7rhlr7XbRJNA4Kl344DV1GGvUV75"   # Executive Interviews
    [10]="PLcIee7rhlr7UXgAQPOkRj8xKEzatWvYrb"  # Events
)
declare -A SHOW_NAMES=(
    [1]="PowerChat" [2]="Inner Circle w/ Greg & Paul" [3]="Feature Interviews"
    [4]="Day In The Life" [5]="Customer Interviews" [6]="Rapid Fire Interviews"
    [7]="Highlights" [8]="Power100 Spotlight" [9]="Executive Interviews" [10]="Events"
)
PLAYLIST_ID="${PLAYLISTS[$SHOW_ID]}"
SHOW_NAME="${SHOW_NAMES[$SHOW_ID]}"

TPX_API_KEY="tpx-n8n-automation-key-2025-power100-experience"
IC_API_KEY="6463a09fe4c73631610df73c0390f09d50d6a08f6cb01481499326a9d6257222"

# Guest slug for working dir
SLUG=$(echo "$GUESTS" | tr '[:upper:]' '[:lower:]' | tr -cd '[:alnum:] ' | tr ' ' '-' | cut -c1-50)-${JOB_ID}
WORKDIR="$HOME/ic-uploads/$SLUG"
mkdir -p "$WORKDIR"
cd "$WORKDIR"

log() { echo "[$(date -u +%H:%M:%S)] $*"; }
log "=== IC Pipeline Runner — job=$JOB_ID ==="
log "Folder: $FOLDER_ID | Show: $SHOW_NAME (id $SHOW_ID) | Guest(s): $GUESTS"
[ -n "$WEBHOOK_URL" ] && log "Webhook: $WEBHOOK_URL"
[ "$DRY_RUN" = "1" ] && log "*** DRY RUN MODE — no Drive/YouTube/TPX/IC/email calls ***"

# ─── DRY RUN short-circuit ───────────────────────────────────────────────
# In dry-run mode, simulate the full event sequence on a timer so the DRC
# UI can exercise its polling + auto-advance without touching real systems.
if [ "$DRY_RUN" = "1" ]; then
    log "DRY RUN: simulating full event sequence..."
    sleep 2
    emit_event "yt_uploaded" "{\"yt_video_id\":\"DRYRUN_$JOB_ID\"}"
    sleep 2
    emit_event "tpx_ingested" "{}"
    sleep 2
    emit_event "ic_draft_created" "{\"ic_post_id\":99999}"
    sleep 2
    emit_event "awaiting_telegram" "{}"
    sleep 3
    emit_event "published" "{\"view_url\":\"https://innercircle.power100.io/dry-run\",\"ic_post_id\":99999}"
    log "=== DRY RUN DONE — job=$JOB_ID ==="
    exit 0
fi

# ─── Step 1: List Drive folder ───────────────────────────────────────────
log "STEP 1: Listing Drive folder contents..."
cd "$HOME/thumbnail-system"
source venv/bin/activate 2>/dev/null || true
python3 - "$FOLDER_ID" > "$WORKDIR/drive-files.txt" <<'PYEOF'
import sys
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
creds = Credentials.from_authorized_user_file('google-drive-oauth-token.json', ['https://www.googleapis.com/auth/drive.readonly'])
svc = build('drive', 'v3', credentials=creds)
res = svc.files().list(q=f"'{sys.argv[1]}' in parents", supportsAllDrives=True, includeItemsFromAllDrives=True, corpora='allDrives', fields='files(id,name,mimeType,size)', pageSize=100).execute()
for f in res.get('files', []):
    print(f"{f['id']}\t{f['mimeType']}\t{f.get('size','0')}\t{f['name']}")
PYEOF
cat "$WORKDIR/drive-files.txt"

# Identify MP4 (largest video), docx, image
MP4_LINE=$(grep -i "video/\|\.mp4" "$WORKDIR/drive-files.txt" | sort -t$'\t' -k3 -n -r | head -1)
DOCX_LINE=$(grep -i "\.docx\|wordprocessingml" "$WORKDIR/drive-files.txt" | head -1)
IMG_LINE=$(grep -i "image/\|\.jpg\|\.jpeg\|\.png" "$WORKDIR/drive-files.txt" | head -1)

MP4_ID=$(echo "$MP4_LINE"  | cut -f1)
DOCX_ID=$(echo "$DOCX_LINE" | cut -f1)
IMG_ID=$(echo "$IMG_LINE"  | cut -f1)

[ -z "$MP4_ID" ] && { log "ERROR: No MP4 in folder"; exit 1; }
log "  MP4:  $MP4_ID"
log "  DOCX: ${DOCX_ID:-(none)}"
log "  IMG:  ${IMG_ID:-(none)}"

# ─── Step 2: Download files ──────────────────────────────────────────────
log "STEP 2: Downloading files..."
python3 scripts/drive-download.py "$MP4_ID"  "$WORKDIR/episode.mp4"
[ -n "$DOCX_ID" ] && python3 scripts/drive-download.py "$DOCX_ID" "$WORKDIR/notes.docx"
[ -n "$IMG_ID" ]  && python3 scripts/drive-download.py "$IMG_ID"  "$WORKDIR/folder-thumb.jpg"

# ─── Step 3: Headshot priority lookup (EC → IC leader → P100 page → Drive) ──
log "STEP 3: Headshot priority lookup for '$GUESTS'..."
THUMB="$WORKDIR/folder-thumb.jpg"   # default: Drive folder image
HEADSHOT_SOURCE="drive-folder"

# (Future enhancement: hit expert_contributors DB, IC term meta, power100.io WP REST
#  in that order. For now we use the folder image — safe default.)
# TODO: implement lookup chain per memory/project_ic_content_form_spec.md § Headshot priority

log "  Headshot source: $HEADSHOT_SOURCE"

# ─── Step 4: Extract title + description from docx ──────────────────────
log "STEP 4: Extracting title + description from docx..."
if [ -f "$WORKDIR/notes.docx" ]; then
    python3 - > "$WORKDIR/title.txt" 2> "$WORKDIR/desc.txt" <<PYEOF
import zipfile, xml.etree.ElementTree as ET, sys
with zipfile.ZipFile('$WORKDIR/notes.docx') as z:
    xml = z.open('word/document.xml').read().decode('utf-8')
ns = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
paragraphs = []
for p in ET.fromstring(xml).iter(ns + 'p'):
    text = ''.join(t.text or '' for t in p.iter(ns + 't'))
    if text.strip(): paragraphs.append(text.strip())
print(paragraphs[0] if paragraphs else 'Power100 $SHOW_NAME with $GUESTS')
print('\n\n'.join(paragraphs[1:]), file=sys.stderr)
PYEOF
else
    echo "Power100 $SHOW_NAME with $GUESTS" > "$WORKDIR/title.txt"
    echo "A $SHOW_NAME episode featuring $GUESTS." > "$WORKDIR/desc.txt"
fi
TITLE=$(cat "$WORKDIR/title.txt")
log "  Title: $TITLE"

# ─── Step 5: Upload to YouTube (ALWAYS unlisted) ─────────────────────────
log "STEP 5: Uploading to YouTube (unlisted)..."
UPLOAD_OUT=$(python3 scripts/youtube-upload-v2.py \
    --video-file   "$WORKDIR/episode.mp4" \
    --title        "$TITLE" \
    --description-file "$WORKDIR/desc.txt" \
    --thumbnail    "$THUMB" \
    --playlist-id  "$PLAYLIST_ID" \
    --privacy      unlisted 2>&1) || { log "ERROR: YouTube upload failed"; echo "$UPLOAD_OUT"; exit 1; }
echo "$UPLOAD_OUT"
YT_ID=$(echo "$UPLOAD_OUT" | grep -oE 'Video ID: [A-Za-z0-9_-]+' | awk '{print $3}')
[ -z "$YT_ID" ] && { log "ERROR: Could not parse YouTube ID from upload output"; emit_event "failed" "{\"error\":\"no YT id from upload\"}"; exit 1; }
log "  YouTube ID: $YT_ID"
emit_event "yt_uploaded" "{\"yt_video_id\":\"$YT_ID\"}"

# ─── Step 6: Trigger TPX content/ingest (retry on "too_short") ───────────
# YouTube takes ~60-120s to finish transcoding post-upload. TPX rejects with
# { reason: "too_short", duration: 0 } until transcoding completes. Retry.
log "STEP 6: Triggering TPX content ingest (with retry-on-too_short)..."
INGEST_BODY=$(printf '{"youtubeUrl":"https://youtube.com/watch?v=%s","showId":%s,"featuredNames":%s}' \
    "$YT_ID" "$SHOW_ID" "$(echo "$GUESTS" | python3 -c 'import json,sys; print(json.dumps([n.strip() for n in sys.stdin.read().replace(" + ", ",").split(",")]))')")
for attempt in 1 2 3 4 5 6; do
    RESP=$(curl -s -X POST 'https://tpx.power100.io/api/content/ingest' \
        -H "x-api-key: $TPX_API_KEY" \
        -H "Content-Type: application/json" \
        -d "$INGEST_BODY")
    echo "$RESP" > "$WORKDIR/ingest-response.json"
    if echo "$RESP" | grep -q '"success":true'; then
        log "  ✓ Ingest succeeded on attempt $attempt"
        emit_event "tpx_ingested" "{}"
        break
    elif echo "$RESP" | grep -q 'too_short'; then
        log "  [attempt $attempt/6] YouTube still transcoding, retrying in 30s..."
        sleep 30
    else
        log "  FAIL attempt $attempt: $RESP"
        emit_event "failed" "{\"error\":\"TPX ingest failed after $attempt attempts\"}"
        break
    fi
done

# ─── Step 7: Poll for IC publish (Telegram approval gates it) ────────────
log "STEP 7: Polling IC for publish status (up to 15 min)..."
DRAFT_NOTIFIED=0
for i in $(seq 1 30); do
    sleep 30
    RESP=$(curl -s "https://innercircle.power100.io/wp-json/ic/v1/content/lookup?youtube_id=$YT_ID" \
        -H "X-IC-API-Key: $IC_API_KEY")
    STATUS=$(echo "$RESP" | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d.get("status","unknown"))' 2>/dev/null)
    POST_ID=$(echo "$RESP" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("post_id",""))' 2>/dev/null)
    log "  [poll $i/30] status=$STATUS"
    # Fire ic_draft_created + awaiting_telegram once we first see the draft
    if [ "$DRAFT_NOTIFIED" = "0" ] && [ "$STATUS" = "draft" ] && [ -n "$POST_ID" ]; then
        emit_event "ic_draft_created" "{\"ic_post_id\":$POST_ID}"
        emit_event "awaiting_telegram" "{}"
        DRAFT_NOTIFIED=1
    fi
    if [ "$STATUS" = "publish" ]; then
        IC_URL=$(echo "$RESP" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("view_url",""))')
        log "  ✓ Published! post_id=$POST_ID view_url=$IC_URL"
        emit_event "published" "{\"ic_post_id\":${POST_ID:-0},\"view_url\":\"$IC_URL\"}"
        break
    fi
done

# ─── Step 8: Email rey@power100.io ───────────────────────────────────────
log "STEP 8: Emailing rey@power100.io..."
EMAIL_BODY=$(cat <<EOF
<div style="font-family:Poppins,sans-serif;max-width:600px;">
<div style="background:#000;color:#fff;padding:20px;text-align:center;">
<h2 style="margin:0;color:#C9A961;">New $SHOW_NAME Episode Live</h2>
</div>
<div style="padding:24px;background:#fff;color:#222;">
<p><strong>Guest:</strong> $GUESTS</p>
<p><strong>Title:</strong> $TITLE</p>
<p><strong>Show:</strong> $SHOW_NAME</p>
<hr style="border:none;border-top:1px solid #eee;margin:20px 0;">
<p><a href="${IC_URL:-https://innercircle.power100.io/}" style="display:inline-block;background:#FB0401;color:#fff;padding:12px 24px;border-radius:4px;text-decoration:none;font-weight:600;">View on IC →</a></p>
<p style="font-size:13px;color:#888;margin-top:24px;">YouTube: <a href="https://youtube.com/watch?v=$YT_ID">$YT_ID</a></p>
<p style="font-size:12px;color:#aaa;">Status: ${STATUS:-unknown} &nbsp;|&nbsp; Job ID: $JOB_ID</p>
</div></div>
EOF
)
curl -s -X POST 'https://n8n.srv918843.hstgr.cloud/webhook/email-outbound' \
    -H "Content-Type: application/json" \
    -d "$(python3 -c "import json,sys; print(json.dumps({'from_email':'noreply@power100.io','from_name':'Power100 Content Pipeline','to_email':'rey@power100.io','to_name':'Rey','subject':'New $SHOW_NAME live: $GUESTS','body':sys.argv[1],'template':'ic_content_drop','tags':['ic-pipeline']}))" "$EMAIL_BODY")"

log "=== DONE — job=$JOB_ID ==="
