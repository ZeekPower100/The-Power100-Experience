---
name: account_research
description: Comprehensive account research and briefing for sales reps opening an account
metadata:
  openclaw:
    emoji: "🔍"
    context: rankings_rep
    priority: high
---

# Account Research

## When to Use
When a rep opens an account, asks "tell me about this company", or needs a quick briefing before outreach.

## Research Workflow

1. **Pull the account profile** — Use `get_account_profile` to get the full company data
2. **Check communication history** — Use `get_communication_history` to see what's been said
3. **Gather intel** — Use `get_company_intel` for recent news, social activity, expansions
4. **If intel is thin** — Use `web_search` to supplement with current web data
5. **Recommend action** — Use `recommend_next_action` to suggest the optimal next step

## Briefing Format

Present the briefing in clear sections:

### Company Snapshot
- Name, location, CEO
- Score/rank, revenue, employees, years in business
- Google rating and review count
- Pillar (market segment)

### Communication History
- Total touches, last contact date, last contact type
- Pattern analysis: mostly calls? emails? dormant?
- Key themes from past conversations

### Intel Highlights
- Recent news, expansions, awards
- Social media activity
- Industry developments affecting them

### Open Items
- Pending tasks and their priorities
- Pinned notes from previous interactions

### Recommended Next Action
- What to do (call, email, SMS)
- Why (data-driven reasoning)
- When (urgency level)

## Key Principles
- Lead with data, not assumptions
- Reference specific metrics (score, revenue, reviews) — this shows credibility
- If the company has no communication history, frame it as an opportunity
- If the company is already a client, focus on retention and upsell context
- Always surface the CEO name — personalization matters
