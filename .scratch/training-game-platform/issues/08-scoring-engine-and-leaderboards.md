# 08: Multi-Category Scoring Engine & Live Leaderboards

**What to build:** 
A comprehensive scoring engine manages 6 distinct point categories (Participation, Peer Contribution, Challenge, Facilitator, Team, and Bonus). All point events are written to an append-only points ledger, while maintaining transactionally materialized score totals on participant and team records. Facilitators can toggle live individual and team leaderboards on participant, facilitator, and projector displays.

**Blocked by:** 05: Peer Interaction & Dedicated Peer Point Budget, 06: Facilitator-Controlled Team Auto-Split & Team Challenges

**Status:** resolved

- [x] System tabulates points across all categories into the append-only points ledger
- [x] Materialized total score columns on session_participants and teams update transactionally
- [x] Facilitator can view live individual and team leaderboards with category score breakdowns
- [x] Facilitator can toggle leaderboard visibility to participants (hidden, live, or end-of-activity)
- [x] When enabled, participants and Projector View display updated leaderboards with rank indicators
- [x] Leaderboard visibility toggles and ranking changes are captured in the event log
