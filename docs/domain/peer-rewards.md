# Peer Rewards Mechanism: Points, Likes, and Recognition

## Overview

The Training Game Management System (TGMS) implements an active peer recognition model designed to encourage collaborative participation, peer feedback, and healthy competition without inflationary scoring.

---

## 1. Core Mechanics

### ⭐ Peer Point Budget (Gifting Points)
1. **Starting Allocation**: Every participant receives a non-renewable budget of **20 Peer Points** upon joining a session.
2. **Gifting Increments**: Points can be gifted to peers' works (text responses, brainstorm ideas, whiteboard drawings) in increments of **+1, +3, or +5 points**.
3. **Budget Deduction**: Gifting points deducts directly from the giver's personal budget:
   $$\text{RemainingBudget}_{\text{giver}} = \text{Budget}_{\text{giver}} - \text{Amount}$$
4. **Leaderboard Credit**: Gifted points are added directly to the recipient's total points and, if the recipient belongs to a team, to their team's cumulative score:
   $$\text{TotalPoints}_{\text{recipient}} \leftarrow \text{TotalPoints}_{\text{recipient}} + \text{Amount}$$
5. **Self-Awarding Protection**: Participants cannot award points to their own responses or whiteboards (`giverId !== recipientId`).
6. **Reasoning Requirement / Recommendation**: When awarding points, givers can provide an optional or required justification (e.g., *"Clear diagram and great system structure"*).

### ❤️ Likes & Reactions (Appreciation)
1. **Free & Unlimited**: Reactions do not consume point budgets, encouraging frequent peer appreciation.
2. **Idempotent Toggle**: Clicking a reaction applies it; clicking again removes it.
3. **Types**: Supports `LIKE` (thumbs up), `HEART`, `CLAP`, and `STAR`.
4. **Gamification & Badges**: Likes trigger automatic badge evaluations (e.g., *Crowd Pleaser* after receiving 5+ likes, or *Supportive Teammate* after giving 10+ likes).

---

## 2. Real-Time Notification & Feedback Loop

### 🔔 Pop-Up Message Box
When points or comments are awarded:
1. **Targeted Delivery**: The server broadcasts a high-priority socket notification targeted to the recipient (`recipientId`).
2. **Instant Visual Pop-up**: An animated celebratory message box appears on the recipient's device, displaying:
   - Point value (e.g., `+5 Points!`) or comment notification.
   - Giver identity (e.g., `From: Participant Clara` or `From: Facilitator Maya`).
   - Reasoning or comment text (e.g., `Reason: "Brilliant explanation of the architecture"`).
3. **Score Sync**: The recipient's active score counter and the session leaderboard automatically update in real time.

---

## 3. Projected Works Interaction
When a facilitator spotlights or projects a participant or team's work on the main screen:
1. **Audience Banner**: All participants receive a real-time banner: *"Facilitator is projecting [Author]'s work"*.
2. **Interactive Inspection**: Participants can click to view the whiteboard or response on their personal screen.
3. **Immediate Peer Giving**: Directly from the viewer, peers can:
   - Like the work.
   - Gift peer points with reasoning.
   - Leave threaded feedback comments.
