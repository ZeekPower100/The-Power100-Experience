#!/bin/bash
# PreToolUse hook on Edit|Write: scan the new content for absolute http(s) URLs
# pointing at our own properties (power100.io, innercircle.power100.io, tpx.power100.io)
# and warn Claude to curl-verify them before saving.
#
# Non-blocking — injects additionalContext so Claude sees the warning and acts on it.
# Reads PreToolUse stdin JSON: { tool_name, tool_input: { file_path, new_string?, content? } }

INPUT=$(cat)
[ -z "$INPUT" ] && exit 0

# Scan the whole stdin for Power100-property URLs. JSON escape sequences
# (\", \n) won't affect URL recognition because URLs don't contain quotes.
# Only flag our own properties — third-party URLs are usually correct
# (provided by user, from upstream API, etc.). Our own slugs are what we hallucinate.
URLS=$(echo "$INPUT" | grep -oE 'https?://(power100\.io|innercircle\.power100\.io|tpx\.power100\.io|staging\.power100\.io)/[a-zA-Z0-9/_.?=&%~+#@:-]+' | sort -u | head -10)

[ -z "$URLS" ] && exit 0

# Build a bullet list of URLs for the warning
URL_LIST=""
while IFS= read -r url; do
  [ -n "$url" ] && URL_LIST="${URL_LIST}\n  • ${url}"
done <<< "$URLS"

# Emit warning as additionalContext (non-blocking)
cat <<JSON
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "additionalContext": "🔗 URL-VERIFY HOOK: This Edit/Write contains Power100 URL(s) you may have hallucinated:${URL_LIST}\n\nBEFORE proceeding, curl-verify each URL is real:\n  curl -sS -o /dev/null -w '%{http_code}\\\\n' -L 'URL'\n\n200/301/302 = real, ship it. 404 = wrong slug, find the actual one.\n\nWHY: 2026-04-30 — Closer's Camp feedback form shipped with https://innercircle.power100.io/sign-up/ (real URL is /register/). Real submissions had a dead CTA. Conventions vary across our properties — IC uses /register/, P100 uses /contact-us/, TPX uses /contractorflow. Don't assume; verify.\n\nSee: memory/feedback_verify_urls_before_writing.md\n\nNot blocking — just verify before saving."
  }
}
JSON

exit 0
