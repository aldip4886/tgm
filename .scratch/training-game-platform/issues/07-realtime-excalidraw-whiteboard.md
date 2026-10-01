# 07: Real-Time Excalidraw Collaborative Whiteboard

**What to build:** 
Participants and teams can launch collaborative digital whiteboards powered by Excalidraw. Drawing operations broadcast ephemerally in-memory through Socket.IO room channels for fluid low-latency multi-user sketching. Authoritative scene state is saved debounced and upon participant submission. The facilitator can review, freeze, and project submitted whiteboards onto the Projector View.

**Blocked by:** 03: Open Question Activity & Configurable Response Reveal, 06: Facilitator-Controlled Team Auto-Split & Team Challenges

**Status:** ready-for-agent

- [ ] Facilitator can create a Whiteboard activity (individual, team, or whole-session)
- [ ] Participants on the same board draw collaboratively via real-time Socket.IO room broadcasts
- [ ] Whiteboard scene state (elements and app state) persists to PostgreSQL on submission and debounced intervals
- [ ] Participants can submit their completed whiteboard to the facilitator
- [ ] Facilitator can browse submitted team whiteboards and project selected boards onto the Projector View
- [ ] Whiteboard opened, saved, and submitted events are recorded in the event log
