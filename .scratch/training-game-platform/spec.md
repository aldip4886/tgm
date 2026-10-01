# Spec: Training Game Management System (TGMS)

Status: ready-for-agent

## Problem Statement

Facilitators and corporate trainers conducting in-person or remote workshops struggle to keep learners engaged when using conventional slide decks. Traditional presentation tools are passive broadcast media, while existing polling and quiz tools operate in disconnected silos, requiring facilitators to switch between disjointed apps, manually tabulate scores, and lose the valuable conversational and collaborative artifacts generated during training.

Furthermore, post-session learning evaluations suffer because interactions (such as brainstorming sticky notes, problem-solving discussions, peer recognition, and whiteboard sketches) evaporate when the session ends, leaving organizations without structured empirical data on participant comprehension, collaboration patterns, or cohort engagement.

## Solution

The Training Game Management System (TGMS) is a unified web-based collaborative training platform that serves as a digital operating layer for interactive learning. It connects instructional presentation delivery (specifically integrating existing Canva presentations) with real-time gamified activities (open questions, sticky notes, polls, case studies, and Excalidraw whiteboards).

The platform maintains a continuous learning loop:
**Present → Respond → Share → Collaborate → Evaluate → Earn Points → Reflect → Get Recognized**

Every single interaction—responses, comments, likes, peer point allocations, whiteboard submissions, and timer events—is dual-written into a transactional relational schema and an append-only event log. Facilitators can orchestrate live sessions with a dual-display controller and pop-out projector view, control synchronized timers, manage point budgets and leaderboards, and download the entire session history as a structured, versioned JSON dataset.

## User Stories

### Facilitator Experience

1. As a facilitator, I want to create a new session with a title and description, so that I can host an interactive training workshop.
2. As a facilitator, I want the system to generate a unique 6-character session code and a join QR code, so that participants can join immediately from mobile or desktop devices.
3. As a facilitator, I want to connect a Canva presentation via direct link or Canva Connect OAuth, so that I can use my existing visual curriculum without re-authoring slides.
4. As a facilitator, I want to define presentation mappings associating specific slide numbers with activities, so that I can trigger activities smoothly as I advance through my presentation.
5. As a facilitator, I want to launch a pop-out "Projector View", so that I can share slides, public responses, and timers on an external monitor or screen-share without exposing administrative controls.
6. As a facilitator, I want to create diverse activities (Open Question, Sticky Notes, Case Study, Poll, Team Challenge, and Whiteboard), so that I can facilitate varied learning exercises.
7. As a facilitator, I want to transition an activity through its lifecycle states (`DRAFT` → `ACTIVE` → `LOCKED` → `COMPLETED`), so that I maintain authoritative control over when participants can submit responses.
8. As a facilitator, I want to configure the activity's `revealMode` (`UPON_LOCK` vs `IMMEDIATE`), so that I can prevent anchoring bias during quizzes or enable live collaboration during brainstorming.
9. As a facilitator, I want to start, pause, resume, and extend a synchronized digital timer with auto-lock capabilities, so that activities run on time across all participant devices.
10. As a facilitator, I want to configure team counts and have participants automatically split into balanced teams, so that team challenges can start without manual grouping delays.
11. As a facilitator, I want a drag-and-drop team management roster, so that I can manually reassign participants between teams when necessary.
12. As a facilitator, I want to award custom facilitator points with a rationale to individual participants or whole teams, so that I can recognize exceptional insights.
13. As a facilitator, I want to moderate submitted content by hiding inappropriate responses, deleting offensive comments, or revoking abusive points, so that the learning environment remains safe and professional.
14. As a facilitator, I want to view live individual and team leaderboards, so that I can foster healthy competition and celebrate top contributors.
15. As a facilitator, I want to manually award special digital badges with custom citations, so that I can honor standout achievements.
16. As a facilitator, I want to end a session and download a complete, validated JSON export conforming to `schema_version: "1.0"`, so that I can preserve the complete learning interaction history for institutional reporting and analytics.

### Participant Experience

17. As a participant, I want to join a session by scanning a QR code or entering a session code and my display name, so that I can start participating within seconds without creating a password.
18. As a participant, I want my browser to preserve a session-scoped recovery token, so that refreshing my browser or recovering from network drops reconnects me to my profile without losing points or submissions.
19. As a participant, I want to receive real-time notifications on my device when the facilitator launches an activity, so that I know immediately what challenge to address.
20. As a participant, I want to submit text answers and sticky notes to active prompts, so that my perspective contributes to the training discussion.
21. As a participant, I want to view a fluid, synchronized countdown timer on my screen, so that I know how much time remains before submissions lock.
22. As a participant, I want to browse peer responses once unlocked, so that I can learn from other participants' approaches and solutions.
23. As a participant, I want to like peer responses and leave threaded comments, so that I can validate and engage in peer-to-peer discussions.
24. As a participant, I want a dedicated peer point budget, so that I can gift points to peer responses that provided genuine value without deducting from my own score.
25. As a participant, I want to collaborate in real time on an Excalidraw whiteboard (individually or with my assigned team), so that we can sketch diagrams, flowcharts, and mind maps together.
26. As a participant, I want to submit my completed whiteboard to the facilitator, so that our team's visual artifact can be presented to the room and evaluated.
27. As a participant, I want to view my accumulated score breakdown across participation, peer contributions, challenge, and bonus categories, so that I understand how my score was earned.
28. As a participant, I want to receive real-time celebratory badge unlock alerts on my screen when I hit milestones, so that I feel recognized for active participation.
29. As a participant, I want to view the individual and team leaderboards when the facilitator makes them visible, so that I can see how our cohort performed.

## Implementation Decisions

### 1. Unified Node Server & Real-Time Socket Architecture (ADR-0001)
- The application runs as a single custom Node.js server (`server.ts`) hosting Next.js App Router along with an embedded Socket.IO instance on the same HTTP port.
- WebSockets handle low-latency real-time synchronization:
  - Session room channels: `session:{sessionId}`
  - Activity room channels: `activity:{activityId}`
  - Team whiteboard channels: `whiteboard:{whiteboardId}`
- Socket authentication validates either facilitator session cookies or participant signed ephemeral session tokens.

### 2. Ephemeral Guest Participant Onboarding (ADR-0002)
- Facilitators authenticate via standard session credentials (Auth.js / NextAuth).
- Participants join anonymously via `POST /api/sessions/:id/join` with `{ displayName }`, receiving an ephemeral signed JWT/token stored in client `localStorage` and HttpOnly cookies.
- Re-joining or page refreshing sends the token to `POST /api/sessions/:id/reconnect`, seamlessly re-attaching the client socket and state to the existing `SessionParticipant` record.

### 3. Facilitator Presentation Boundary & Hybrid Canva Integration (ADR-0003, ADR-0009)
- Canva presentation viewing is strictly facilitator-projected (via screen-share or room beamer). Participants do not receive synchronized iframe streams, keeping participant attention on mobile-optimized activity interfaces.
- The presentation integration supports:
  - Direct public Canva Embed/View URL entry with manual slide count and title mapping.
  - Official Canva Connect OAuth 2.0 flow when `CANVA_CLIENT_ID` and `CANVA_CLIENT_SECRET` are provided in `.env`.

### 4. Relational Write Model & Transactional Event Audit Logging (ADR-0004)
- PostgreSQL (via Prisma ORM) stores normalized entities: `users`, `sessions`, `session_participants`, `teams`, `activities`, `responses`, `comments`, `reactions`, `points`, `whiteboards`, `badges`, `participant_badges`.
- Every state mutation transaction simultaneously inserts an immutable row into the `events` table with:
  `{ event_id, timestamp, session_id, activity_id, actor_id, event_type, target_id, metadata }`.

### 5. Strict Single-Active Activity State Machine (ADR-0005, ADR-0012)
- Only one activity per session may occupy the `ACTIVE` state at any moment.
- Lifecycle: `DRAFT` → `ACTIVE` → `LOCKED` → `COMPLETED`. Activating a new activity automatically marks any prior active activity as `COMPLETED`.
- Configurable `revealMode` (`UPON_LOCK` vs `IMMEDIATE`):
  - `UPON_LOCK`: Peer responses remain invisible to participants until the facilitator transitions the activity to `LOCKED`.
  - `IMMEDIATE`: Submitted responses stream live to all connected participants.

### 6. In-Memory Whiteboard Broadcast with Milestone Persistence (ADR-0006)
- Excalidraw vector element operations broadcast ephemerally in-memory through `whiteboard:{whiteboardId}` Socket.IO rooms.
- Full Excalidraw scene JSON (elements, app state) is persisted to PostgreSQL:
  - Debounced (every 5 seconds of idle drawing).
  - Explicitly upon participant submission or facilitator lock.

### 7. Gamification: Peer Point Budget, Point Ledger & Real-Time Badges (ADR-0007, ADR-0011, ADR-0014)
- Peer points deduct from a dedicated `peerPointBudget` on `session_participants` without affecting personal earned scores.
- All points are written to an append-only `points` ledger table with category, amount, giver, recipient, and reason.
- Participant and team totals are updated transactionally in cached columns (`totalPoints`) for $O(1)$ leaderboard queries.
- Automatic badge rules (`IF totalPoints >= 100`, etc.) evaluate synchronously inside transaction hooks; newly earned badges trigger immediate socket broadcast celebrations.

### 8. Server-Authoritative Timer Target (ADR-0008)
- Timer state stores `{ endsAt: Date | null, remainingMs: number, status: 'STOPPED' | 'RUNNING' | 'PAUSED' }`.
- Clients animate local countdowns anchored to `endsAt`. The server evaluates completion timestamps and auto-locks the activity upon expiration.

### 9. Synchronous JSON Dataset Export (ADR-0013)
- Authenticated endpoint `GET /api/sessions/:id/export/json` queries all related models in a single structured query and streams the complete session dataset matching `schema_version: "1.0"`.

### 10. Dual-Display Facilitator Workspace & Projector Pop-Out (ADR-0015)
- Responsive split dashboard for facilitators: presentation controls and slide navigation on top/left, live activity controls, timer, and moderation on bottom/right.
- Dedicated pop-out route (`/sessions/[id]/projector`) rendering a clean, public presentation view for classroom beamers or external screen-shares.

## Testing Decisions

### Seam Definition
To ensure rigorous validation without coupling tests to internal implementation details, testing is conducted at **two high-level seams**:

1. **The HTTP API Seam (REST)**:
   - Driving the application via supertest/fetch against Next.js API endpoints (`/api/sessions`, `/api/sessions/:id/join`, `/api/activities`, `/api/points`, `/api/sessions/:id/export/json`).
   - Verifies request validation, session recovery tokens, database transactions, points calculations, and JSON export schema fidelity.

2. **The Real-Time WebSocket Seam (Socket.IO Client)**:
   - Connecting real `socket.io-client` test instances representing multiple concurrent participants and a facilitator.
   - Verifies room subscriptions, event broadcasts, timer target sync, response streaming under both `revealMode` settings, whiteboard drawing broadcasts, and real-time badge celebrations.

### Testing Principles
- Test external observable behavior only (HTTP responses, socket emissions, database persistence, and export output). Never test private helper functions or internal class states.
- Run all integration tests against an isolated PostgreSQL test database instance with clean migration state.
- Automated tests verify backward compatibility and valid structure of the exported JSON schema against a Zod validation schema.

## Out of Scope

- Native video/audio conferencing (facilitators use Zoom/Teams/Meet alongside TGMS or conduct in-person training).
- Building an internal slide editor (Canva remains the sole authoring tool for presentations).
- Automated AI sentiment analysis or LLM-based response grading (reserved for future Phase 9).
- External LMS LRS / xAPI sync endpoints (the JSON export serves as the foundation for future LRS pipelines).
- Native mobile app store apps (responsive web design supports all modern mobile browsers).

## Further Notes

- All terminology in this specification strictly respects [GLOSSARY.md](file:///c:/Users/aldip/Downloads/game_management/GLOSSARY.md).
- Architectural trade-offs and non-obvious design choices are documented in ADRs 0001 through 0015 in [docs/adr/](file:///c:/Users/aldip/Downloads/game_management/docs/adr/).
- The JSON export format matches the schema defined in Section 18 of [Training_Game_Management_System_PRD.md](file:///c:/Users/aldip/Downloads/game_management/docs/Training_Game_Management_System_PRD.md).
