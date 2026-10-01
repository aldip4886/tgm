# 10: Synchronous Session JSON Dataset Export Engine

**What to build:** 
Facilitators can conclude a session and download the complete interaction history as a single, validated JSON file. The authenticated endpoint `GET /api/sessions/:id/export/json` queries all sessions, participants, teams, presentations, presentation mappings, activities, responses, comments, likes, points, scores, leaderboards, badges, timers, whiteboards, and events, streaming a structured JSON conforming strictly to `schema_version: "1.0"`.

**Blocked by:** 08: Multi-Category Scoring Engine & Live Leaderboards, 09: Real-Time Badge Trigger Evaluation & Facilitator Awards

**Status:** resolved

- [x] Facilitator can trigger session conclusion, locking all activities
- [x] Authenticated endpoint GET /api/sessions/:id/export/json verifies facilitator ownership
- [x] Endpoint queries all relational session entities and the complete event log
- [x] Payload format strictly matches schema_version: "1.0" defined in PRD Section 18
- [x] Endpoint streams download with appropriate Content-Disposition headers in < 500ms
- [x] Automated integration test validates the export structure against a schema validator
