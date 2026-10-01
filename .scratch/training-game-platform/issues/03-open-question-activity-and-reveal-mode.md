# 03: Open Question Activity & Configurable Response Reveal

**What to build:** 
Facilitators can create and launch an Open Question activity optionally linked to a presentation slide checkpoint. Participants immediately see the question prompt on their devices and submit text responses. The activity transitions through its state machine (`DRAFT` → `ACTIVE` → `LOCKED` → `COMPLETED`). In `UPON_LOCK` mode, responses remain concealed from participants until the facilitator locks the activity. In `IMMEDIATE` mode, responses stream in real time.

**Blocked by:** 01: Foundation & Ephemeral Session Joining, 02: Presentation Link & Split Workspace with Pop-Out Projector View

**Status:** resolved

- [x] Facilitator can create an Open Question activity with title, prompt, and optional presentation slide mapping
- [x] Activating the activity broadcasts the prompt to all connected participants and updates the Projector View
- [x] Activating an activity automatically marks any prior active activity as COMPLETED
- [x] Participants can submit text responses while the activity is in ACTIVE state
- [x] If revealMode is UPON_LOCK, participants only see their own response until the activity is LOCKED
- [x] If revealMode is IMMEDIATE, responses broadcast live to all participants as they arrive
- [x] Facilitator can view all responses in real-time regardless of revealMode
- [x] Facilitator can hide individual responses for moderation
- [x] All submission, state change, and moderation events are appended to the event log
