# 04: Server-Authoritative Synchronized Digital Timer with Auto-Lock

**What to build:** 
Facilitators can attach and start a digital countdown timer on an active activity. The server establishes an authoritative UTC expiration target (`endsAt`), broadcasting state to facilitator, participant, and projector screens. Clients render smooth 60fps animations. Facilitators can pause, resume, reset, or add time. When time expires, the server triggers completion and automatically locks the activity against further submissions.

**Blocked by:** 03: Open Question Activity & Configurable Response Reveal

**Status:** resolved

- [x] Facilitator can configure a timer duration (e.g. 5 minutes) and start the countdown
- [x] Server computes UTC endsAt timestamp and broadcasts timer state to session sockets
- [x] Participants and Projector View render fluid, synchronized countdown timers
- [x] Facilitator can pause, resume, and extend (+1 min / +5 min) the timer
- [x] When the timer reaches zero, the server emits a completion event and automatically transitions the active activity to LOCKED
- [x] All timer events (started, paused, resumed, completed) are written to the event log
