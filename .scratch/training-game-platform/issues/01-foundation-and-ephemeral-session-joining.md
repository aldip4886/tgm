# 01: Foundation & Ephemeral Session Joining

**What to build:** 
A facilitator can create a training session with title and description, generating a unique 6-character session code and QR code. Participants join the session by entering the code and their display name without password registration. Participants receive an ephemeral signed session recovery token allowing them to reconnect seamlessly upon page refresh or network blip. Both facilitator and participants see a live-updating participant roster on their screens.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] Facilitator can create a session and receive a unique 6-character session code and QR code
- [x] Participant can enter session code and display name to join the session
- [x] Participant receives a signed session token persisted in browser storage enabling seamless re-attachment on reload
- [x] Facilitator dashboard displays the connected participants in real time
- [x] Participant screen shows session title, facilitator name, and waiting room status
- [x] Sockets emit connection/disconnection events updating the live roster
- [x] All session and participant events are logged to the transactional event log
