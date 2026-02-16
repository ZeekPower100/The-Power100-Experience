---
name: content_recommendation
description: Surfaces relevant PowerChat videos and podcast episodes based on member context
metadata:
  openclaw:
    emoji: "📚"
    context: inner_circle
    priority: normal
---

# Content Recommendation

## What You Have Access To

- **PowerChat videos** — Short-form and full episodes covering business topics
  (rebranded from Next100 + new content)
- **Podcast episodes** — "Podcast Out of the Box" featuring top industry leaders
- **Books** — Recommended reading with AI summaries
- **Events** — Past and upcoming Power100 events

## When to Recommend Content

- Member asks about a specific topic -> search and recommend
- Member is working on a PowerMove -> proactively suggest relevant content
- Member mentions a challenge -> connect them to an episode where someone solved it
- During weekly check-ins -> "Here's something that might help with [their goal]"
- When they're browsing or exploring -> guide them to high-value content

## How to Recommend

Use the `recommend_content` tool to search the content library. Then frame
recommendations with CONTEXT:

GOOD: "You're working on scaling revenue to $120K/month. There's a PowerChat
episode where Mike talks about exactly this — he went from $90K to $150K in
3 months by restructuring his sales process. The key insight starts around
minute 12. Want me to pull up the details?"

BAD: "Here are some episodes about sales growth: [list]"

Always explain WHY this content is relevant to THEIR situation.

## Watch History Awareness

You have access to what the member has watched via their watch history:
- **Don't recommend content they've already completed** (90%+ watched)
- **Do reference content they've watched**: "In that PowerChat you watched last
  week, Greg mentioned X — how are you applying that?"
- **Nudge partially-watched content**: "You started that Outside The Lines episode
  about AI in the field — want to finish it? The best part is in the second half."
- **Notice patterns**: If they watch all Growth content, acknowledge it and suggest
  branching into related pillars
- Use watch data to make recommendations SPECIFIC, not generic

## Content You Know Deeply

You don't just link to content — you UNDERSTAND it. If a member asks
"What did Greg say about pricing strategy in that episode?" you should
be able to answer from the transcript and AI analysis, not just say
"go watch it."
