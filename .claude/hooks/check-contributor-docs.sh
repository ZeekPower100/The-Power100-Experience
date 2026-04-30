#!/bin/bash
# Pre-Bash hook: when a command touches IC/P100 contributor data, inject a system
# reminder telling Claude to first read the relevant memory references.
# Non-blocking — emits JSON via stdout that becomes additional context for the model.
# No jq dependency: greps stdin directly (keyword presence in raw JSON is sufficient signal).

INPUT=$(cat)
[ -z "$INPUT" ] && exit 0

# Keywords that signal "this command touches contributor data"
PATTERN='ic_contributor|/contributor/|/expert-contributor/|contributor-routing|--post_name=|--post_title=|ec_contributor_type|page-expert-contributor\.php|single-ic_contributor|themes/inner-circle|themes/power100|expert_contributors|runcloud@45\.76\.62\.153|runcloud@155\.138\.198\.250|contributorEnrichmentService|mirrorToInnerCircle|upsertContributorLander|backfill-company-logos|apply-local-company-logos|ec_company_logo|ec_headshot|ec_company_name|register_post_meta'

if echo "$INPUT" | grep -qiE "$PATTERN"; then
  cat <<'JSON'
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "additionalContext": "🚨 CONTRIBUTOR-DATA HOOK: This command touches Power100/IC contributor data. BEFORE proceeding, read these memory references if you haven't this session:\n\n  • ~/.claude/projects/C--Users-broac-CascadeProjects-The-Power100-Experience/memory/reference_ic_contributor_routing.md  — IC slug convention is BARE NAMES (no -contributor / -expert-contributor suffix), path-prefix /contributor/ vs /expert-contributor/ encodes tier. Don't put suffix back on IC slugs.\n  • ~/.claude/projects/C--Users-broac-CascadeProjects-The-Power100-Experience/memory/reference_ic_contributor_mirror_system.md  — Mirror architecture, paid EC list (8 names), ec_headshot poisoning gotcha. P100 = source of truth, IC always derives.\n  • ~/.claude/projects/C--Users-broac-CascadeProjects-The-Power100-Experience/memory/feedback_all_contributors_in_tpedb.md  — Every contributor (paid EC or not) MUST have a tpedb expert_contributors row. Manual page additions still need INSERTs.\n  • ~/.claude/projects/C--Users-broac-CascadeProjects-The-Power100-Experience/memory/feedback_ic_mirror_skip_image_meta.md  — IC mirror endpoint MUST skip ec_headshot/ec_company_logo/ec_company_logo_dark in the meta loop or it writes P100 attachment IDs into IC.\n\nNot blocking — just verify your action aligns with the conventions before proceeding."
  }
}
JSON
fi

exit 0
