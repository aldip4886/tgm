# Training Game Management System (TGMS)

The **Training Game Management System (TGMS)** is a full-stack, real-time collaborative training and gamified learning platform built with **Next.js (App Router)**, **Prisma ORM (SQLite)**, **Socket.IO**, **Tailwind CSS**, and **Excalidraw**. It connects instructional presentation flows (Canva embeds and uploaded slide decks) with real-time audience participation, Miro-style collaborative whiteboards, peer recognition, and complete interaction dataset export.

---

## Key Features

### 1. Role-Based Portals & Access Control
- **Participant Join Portal (`/`)**: Participants join live sessions using a 6-character **Session Code** (`Session Code` is strictly reserved for participants).
- **Facilitator & Administrator Login (`/login`)**: Dedicated staff authentication portal (`src/app/login/page.tsx`) without session code fields that routes `FACILITATOR`, `ADMIN`, and `SUPER_ADMIN` accounts directly to their command center homepage (`/`).
- **Granular Permissions**:
  - **`SUPER_ADMIN`**: Unrestricted management of all users (including Administrators and Super Administrators), session assignments across facilitators, and system-wide data exports.
  - **`ADMIN`**: Manages facilitator and participant accounts, assigns sessions to facilitators, and audits session datasets.
  - **`FACILITATOR`**: Creates and directs their own training sessions, presentations, timers, and activities. Cannot modify/delete user accounts or reassign sessions to other facilitators.
  - **`PARTICIPANT`**: Joins sessions, submits responses, collaborates on whiteboards, participates in live presentation chat, and gifts peer points.

### 2. Presentation & Live Screen Projection
- **Canva & Uploaded Decks**: Facilitators can link full Canva presentations (without single-slide restrictions), delete/replace links on the fly, or upload multi-format presentation decks (`PDF`, `IMAGES`, `PPTX`).
- **Live Screen Projection**: When the facilitator projects their screen, a floating notification icon appears in the Participant View allowing attendees to open the projected presentation in a floating or fullscreen viewer.
- **Interactive vs. Synchronized Slide Navigation**:
  - **Interactive Navigation ON**: Participants can freely browse slides at their own pace.
  - **Interactive Navigation OFF (Synced to Presenter)**: Participant slide controls are locked and automatically synchronize in real time (`presentation:slide_change`) with the facilitator's active slide (`#N` / `#page=N`).
- **Big-Screen Projector View (`/sessions/[id]/projector`)**: Distraction-free audience display (`max-h-[85vh]` stage layout) with an integrated server-synchronized countdown timer (`DigitalTimer`).

### 3. Real-Time Presentation Live Chat & Feedback
- **Real-Time Socket Sync**: Live chat messages, threaded replies, points, and awards broadcast instantaneously across the **Facilitator Dashboard**, **Participant View**, and **Projector View** via `presentation:chat_updated`.
- **Hide / Unhide Live Chat**: All three views feature a toggle button (`Hide Chat` / `Show Chat`) to collapse or expand the live chat panel.
- **Inline Facilitator Coaching**: Facilitators can enable/disable chat, post replies, and award bonus points (`+2`, `+5`, `+10`) or badges directly on participant chat messages.
- **Animated Notifications**: Visual confirmation effects (`SentConfirmationEffect`) notify users when messages, feedback, points, awards, or comments are sent or received in real time.

### 4. Miro-Style Collaborative Whiteboards & Templates
- **Interactive Canvas**: Powered by Excalidraw (`CollaborativeWhiteboard`) with sticky notes, shapes, freehand drawing, and laser/spotlight inspection.
- **Built-in Visual Templates**: One-click templates for **Kanban Board**, **Mind Map**, **SWOT Analysis**, **Sprint Retrospective**, **Flowchart**, and **Brainstorming Sticky Grid**.
- **Flexible Scopes**: Supports `WHITEBOARD_INDIVIDUAL`, `WHITEBOARD_TEAM`, and `WHITEBOARD_PUBLIC` modes, plus live facilitator spotlight projection (`ProjectedWorkModal`).

### 5. Interactive Activities & Gamification
- **Activity Types**: Open Questions (`OPEN_QUESTION`), Sticky Notes (`STICKY_NOTE`), Live Polls (`POLL`), Trivia Quizzes (`QUIZ`), Word Clouds (`WORD_CLOUD`), Q&A (`QA`), Borda-Count Rankings (`RANKING`), Case Studies (`CASE_STUDY`), and Collaborative Whiteboards.
- **Peer Point Budget & Recognition**: Each participant receives a 20-point peer budget to gift `+1`, `+3`, or `+5` points (with reasoning) to peers' responses and whiteboards, triggering real-time celebratory pop-ups (`AwardNotificationModal`).
- **Automated & Manual Badges**: Rule-based badge triggers and manual facilitator awards tracked alongside an immutable **Point Ledger** and real-time individual/team **Leaderboards**.

### 6. User Profiles, Avatars & Account Settings
- **Top-Right Avatar (`UserAvatarButton`)**: Persistent user avatar in the upper-right corner across all pages providing instant access to the user's profile and settings.
- **View Profile Modal (`ParticipantDetailModal`)**:
  - Displays **Facilitator** profile details, total count of **Sessions Created / Hosted**, and a detailed **Created Sessions** tab.
  - Displays **Participant** session info, points ledger, awards, whiteboards, and interaction history with one-click JSON export.
- **Account Settings (`/settings`)**: Full profile editor for display name, username, email, bio, avatar color, organization, and password.

### 7. Session Conclusion & Complete JSON Export
- **Clean Session Conclusion**: Concluding a session (`End Session`) transitions the session to `CONCLUDED` and returns the facilitator to their Home dashboard (`/`), hiding previous session interactions/points/messages while displaying all created sessions with pagination.
- **Structured Dataset Export (`GET /api/sessions/[id]/export/json`)**: Synchronously exports the complete session dataset (`schema_version: "1.0"`), including participants, teams, activities, responses, whiteboards, reactions, comments, presentation chat messages, point ledger, badges, and event logs.

---

## Getting Started

### Prerequisites
- **Node.js** 18+ and **npm**

### Installation & Database Setup

```bash
# Install dependencies
npm install

# Push Prisma schema to SQLite and seed initial accounts
npx prisma db push

# (Optional) Launch Prisma Studio to inspect the database
npx prisma studio
```

> **Note:** The Prisma schema lives at `prisma/schema.prisma`, so `npx prisma` commands work directly from the project root.

### Running the Development Server

```bash
npm run dev
```

Open `http://localhost:3000` in your browser:
- **Participant Entry / Staff Command Homepage**: `http://localhost:3000/`
- **Facilitator & Administrator Sign In**: `http://localhost:3000/login`

### Running Tests & Type Checking

```bash
# Run TypeScript compiler check
npx tsc --noEmit

# Run Vitest suite
npx vitest run
```

---

## Documentation Index

- **[Complete User Manual & Role Guide — English (`docs/USER_MANUAL.md`)](./docs/USER_MANUAL.md)**:
  - [Super Administrator (`SUPER_ADMIN`) User Manual](./docs/manuals/SUPER_ADMIN_MANUAL.md)
  - [Administrator (`ADMIN`) User Manual](./docs/manuals/ADMIN_MANUAL.md)
  - [Facilitator (`FACILITATOR`) User Manual](./docs/manuals/FACILITATOR_MANUAL.md)
  - [Participant (`PARTICIPANT`) User Manual](./docs/manuals/PARTICIPANT_MANUAL.md)
- **[Buku Panduan Pengguna Lengkap — Bahasa Indonesia (`docs/USER_MANUAL_ID.md`)](./docs/USER_MANUAL_ID.md)**:
  - [Buku Panduan Super Administrator (`SUPER_ADMIN`)](./docs/manuals/id/PANDUAN_SUPER_ADMIN.md)
  - [Buku Panduan Administrator (`ADMIN`)](./docs/manuals/id/PANDUAN_ADMIN.md)
  - [Buku Panduan Fasilitator (`FACILITATOR`)](./docs/manuals/id/PANDUAN_FACILITATOR.md)
  - [Buku Panduan Peserta (`PARTICIPANT`)](./docs/manuals/id/PANDUAN_PARTICIPANT.md)
- **[Technical Architecture Manual (`docs/ARCHITECTURE_MANUAL.md`)](./docs/ARCHITECTURE_MANUAL.md)**: Complete 10-chapter architectural deep-dive, sequence diagrams, data models, Socket.IO event matrix, and security reference.
- **[Domain Glossary (`GLOSSARY.md`)](./GLOSSARY.md)**: Canonical domain language and definitions across Roles, Sessions, Presentations, Activities, Whiteboards, and Gamification.
- **[Architecture Decision Records (`docs/adr/`)](./docs/adr/)**:
  - [ADR-0001: Unified Node.js Server with Next.js and Socket.IO](./docs/adr/0001-unified-node-server-nextjs-socketio.md)
  - [ADR-0002: Ephemeral Guest Participant Onboarding](./docs/adr/0002-ephemeral-guest-participant-onboarding.md)
  - [ADR-0003: Facilitator-Projected Presentation Boundary (Superseded by ADR-0016)](./docs/adr/0003-facilitator-projected-presentation-boundary.md)
  - [ADR-0004: Relational Core with Transactional Event Audit](./docs/adr/0004-relational-core-with-transactional-event-audit.md)
  - [ADR-0005: Strict Single-Active-Activity Lifecycle](./docs/adr/0005-strict-single-active-activity-lifecycle.md)
  - [ADR-0006: In-Memory Whiteboard Broadcast with Milestone Persistence](./docs/adr/0006-in-memory-whiteboard-broadcast-with-milestone-persistence.md)
  - [ADR-0007: Facilitator-Allocated Peer Point Budget](./docs/adr/0007-facilitator-allocated-peer-point-budget.md)
  - [ADR-0008: Server-Authoritative Timestamp Target Timer](./docs/adr/0008-server-authoritative-timestamp-target-timer.md)
  - [ADR-0009: Hybrid Canva Presentation Links and Multi-Format Deck Uploads](./docs/adr/0009-hybrid-canva-oauth-and-direct-link.md)
  - [ADR-0010: Facilitator-Controlled Team Allocation](./docs/adr/0010-facilitator-controlled-team-allocation.md)
  - [ADR-0011: Append-Only Point Ledger with Materialized Cache](./docs/adr/0011-append-only-point-ledger-with-materialized-cache.md)
  - [ADR-0012: Configurable Activity Reveal Mode](./docs/adr/0012-configurable-activity-reveal-mode.md)
  - [ADR-0013: Synchronous Server-Rendered JSON Stream Export](./docs/adr/0013-synchronous-server-rendered-json-export.md)
  - [ADR-0014: Inline Transaction Hooks for Badge Triggers](./docs/adr/0014-inline-transaction-hooks-for-badge-triggers.md)
  - [ADR-0015: Dual-Display Facilitator Controller and Projector View](./docs/adr/0015-dual-display-facilitator-controller-and-projector-view.md)
  - [ADR-0016: Interactive Participant Screen Projection and Real-Time Presentation Live Chat](./docs/adr/0016-interactive-presentation-projection-and-live-chat.md)
- **[Peer Rewards Domain Guide (`docs/domain/peer-rewards.md`)](./docs/domain/peer-rewards.md)**
- **[Product Requirements Document (`docs/Training_Game_Management_System_PRD.md`)](./docs/Training_Game_Management_System_PRD.md)**
- **[Agent Handoff Document (`tgms-handoff.md`)](./tgms-handoff.md)**
