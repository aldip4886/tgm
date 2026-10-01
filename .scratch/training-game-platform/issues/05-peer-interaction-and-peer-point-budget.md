# 05: Peer Interaction & Dedicated Peer Point Budget

**What to build:** 
Participants can interact with unlocked peer responses by liking (with duplicate prevention), posting threaded comments, and awarding peer points from a dedicated facilitator-configured budget. Awarding peer points deducts from the giver's peer budget and credits the recipient's personal score without diminishing the giver's personal earned score. Facilitators can delete inappropriate comments or revoke points.

**Blocked by:** 03: Open Question Activity & Configurable Response Reveal

**Status:** ready-for-agent

- [ ] Participants can like a response, with client deduplication preventing repeated likes from the same participant
- [ ] Participants can add threaded comments to responses, updating peer feeds in real time
- [ ] Each participant receives a dedicated peerPointBudget (configured by facilitator)
- [ ] Participants can award points to a peer response with an optional reason, deducting from their budget
- [ ] Point award increases recipient's total score in the points ledger
- [ ] Facilitator can delete comments and revoke awarded points
- [ ] All likes, comments, and point actions are captured in the event log
