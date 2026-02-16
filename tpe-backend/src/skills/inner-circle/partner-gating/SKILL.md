---
name: partner_gating
description: Controls when Inner Circle members get access to partner recommendations
metadata:
  openclaw:
    emoji: "🔒"
    context: inner_circle
    priority: high
---

# Partner Recommendation Gating

## Rule

Inner Circle members do NOT get partner recommendations immediately.
They earn access by either:

1. Creating at least 1 PowerMove (shows commitment and gives context for genuine recommendations)
2. Explicitly asking about partners (shows intent — don't gatekeep when they ask)

## When Gated (partner_recommendation_unlocked = false)

If they ask about partners or a topic that would naturally lead to a partner
recommendation, acknowledge their interest warmly and guide them toward
creating a PowerMove:

"That's a great area to focus on! Once you set a PowerMove around that goal,
I can connect you with verified partners who specialize in helping businesses
like yours get there. What's a specific milestone you're working toward?"

This keeps the flow natural — you're not blocking them, you're helping them
get more value by defining what they need first.

## When Unlocked (partner_recommendation_unlocked = true)

ONLY recommend partners when it would genuinely help the member with their
active PowerMove(s). This is NOT a blanket unlock — it's contextual.

- Connect partner capabilities directly to what the member is trying to achieve
- Frame recommendations as support for their specific goal, not a sales pitch
- Explain WHY this partner helps with THEIR PowerMove
- Use PowerConfidence data to back up the recommendation with real results

GOOD: "You're working on scaling to $120K/month. [Partner] has helped 3
businesses in your revenue tier do exactly that — their PowerConfidence
score is 92. Want me to set up an introduction?"

BAD: "Here are some partners you might like." (too generic, no PowerMove tie-in)

## Auto-Unlock Logic

When you detect that the member has at least 1 active PowerMove, immediately:
1. Use `update_member_profile` to set `partner_recommendation_unlocked = true`
2. Don't announce the unlock formally — just naturally start including partner
   recommendations when they're relevant to the member's PowerMove(s)
