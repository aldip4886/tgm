# Training Game Management System (TGMS) - Agent Handoff Document

Generated at: 2026-10-02
Working Directory: `c:\Users\ASUS\OneDrive - Kemenkeu\Projects\tgm`

---

## 1. Project Context & Current Status

The Training Game Management System (TGMS) is a full-stack real-time interactive training game and workshop platform built with **Next.js (App Router)**, **Prisma ORM (SQLite)**, **Tailwind CSS**, **Socket.IO**, and **Excalidraw**.

All recent feature upgrades and domain enhancements have been implemented, integrated, and verified:

- **Role-Based Access Control & Dedicated Portals**:
  - **Participant Portal (`/`)**: Streamlined session-joining portal using a 6-character Session Code and credentials/guest identity. Staff login actions are separated from participant entry.
  - **Facilitator & Administrator Login (`/login`)**: Dedicated staff portal (`src/app/login/page.tsx`) without session code fields; redirects authenticated `FACILITATOR`, `ADMIN`, and `SUPER_ADMIN` accounts to their paginated command homepage (`/`).
  - **Strict Role Enforcement**:
    - `SUPER_ADMIN`: Full system authority; manages all users (including creating/editing/deleting Admins and Super Admins), assigns sessions to facilitators, and exports full session datasets.
    - `ADMIN`: Manages participants and facilitators, assigns sessions across facilitators, and exports session datasets; blocked from modifying `SUPER_ADMIN` accounts.
    - `FACILITATOR`: Scoped strictly to sessions they created or are assigned to; cannot create, edit, or delete users (`src/app/users/page.tsx`) and cannot reassign sessions to other facilitators.
    - `PARTICIPANT`: Joins sessions via Session Code, collaborates on activities and whiteboards, participates in live presentation chat, and gifts peer points.

- **Presentation & Live Screen Projection (`PresentationViewer.tsx`)**:
  - **Full-Deck Canva & Multi-Format Uploads**: Facilitators can connect any Canva presentation link (projecting the entire deck without single-slide restrictions), delete connected links, or upload presentation decks (`PDF`, `IMAGES`, `PPTX`).
  - **Interactive vs. Presenter-Synchronized Navigation**:
    - Facilitators can toggle `allowInteractiveNavigation` at any time during screen projection.
    - When **Interactive Navigation is ON**, participants can freely navigate slides at their own pace inside a floating or fullscreen window.
    - When **Interactive Navigation is OFF**, participant viewers lock navigation controls and synchronize in real time (`presentation:slide_change`) with the facilitator's active slide (`#N` for Canva embeds, `#page=N` for PDFs, and slide index for image decks).
  - **Enlarged Projector Canvas**: Projector View (`src/app/sessions/[id]/projector/page.tsx`) renders presentations at `w-full h-full max-h-[85vh] rounded-2xl overflow-hidden shadow-2xl border border-slate-800 bg-black` alongside a synchronized digital countdown timer (`DigitalTimer.tsx`).

- **Real-Time Presentation Live Chat & Confirmation Effects**:
  - **Real-Time Socket Broadcast (`presentation:chat_updated`)**: Messages, threaded replies, inline feedback, points, and badge awards stream instantaneously across Facilitator, Participant, and Projector views.
  - **Hide / Unhide Live Chat Toggle**: Facilitator, Participant, and Projector views each include a header toggle button (`Hide Chat` / `Show Chat`) to collapse or expand the live chat sidebar and maximize slide viewing area.
  - **Facilitator Inline Rewards**: Directly from presentation chat messages, facilitators can reply with feedback, award bonus points (`+2`, `+5`, `+10`), or grant badges.
  - **Visual Notifications (`SentConfirmationEffect.tsx`)**: Animated confirmation banners trigger when outgoing messages, comments, feedback, points, or awards are sent (`MESSAGE_SENT`, `COMMENT`, `FEEDBACK`, `POINTS`, `AWARD`) and when incoming live chat messages arrive (`MESSAGE_RECEIVED`).

- **Miro-Style Collaborative Whiteboards & Templates (`CollaborativeWhiteboard.tsx`)**:
  - Built-in templates for **Kanban Board**, **Mind Map**, **SWOT Analysis**, **Sprint Retrospective**, **Flowchart**, and **Brainstorming Sticky Grid**.
  - Multi-scope whiteboards (`WHITEBOARD_INDIVIDUAL`, `WHITEBOARD_TEAM`, `WHITEBOARD_PUBLIC`) with automatic `Response` bridge (`color: "WHITEBOARD"`) for peer reactions, threaded comments, and peer point gifting.
  - Live facilitator canvas spotlighting via `ProjectedWorkModal.tsx`.

- **User Profiles, Top-Right Avatars & Account Settings**:
  - **Global User Avatar (`UserAvatarButton.tsx`)**: Displayed in the top-right corner across all views (`Home`, `Participant`, `Facilitator`, `Projector`, `Users`, `Sessions`, `Activities`). Clicking opens the comprehensive Profile & Settings modal or navigates to `/settings`.
  - **View Profile Modal (`ParticipantDetailModal.tsx`)**:
    - Renamed from *"Inspect"* to **"View Profile"** in User Management (`src/app/users/page.tsx`) and across session rosters.
    - For **Facilitators / Admins**, displays Profile Information, total count of **Sessions Created / Hosted**, and a dedicated **Created Sessions** tab with status, session code, activity count, participant count, and direct dashboard links.
    - For **Participants**, displays session info, points breakdown, earned badges, whiteboards, and interaction history, plus an **Export JSON** action.
    - Includes an inline **Edit Info & Settings** tab (and standalone `/settings` page) for updating display name, username, email, bio, avatar color, organization, and password.

- **Session Conclusion & Paginated Home Dashboard (`src/app/page.tsx`)**:
  - Concluding a session (`End Session`) updates status to `CONCLUDED` and redirects the facilitator to their clean Home screen (`/`), hiding previous session interactions, points, and messages while displaying all created sessions with client-side pagination (6 sessions per page).

- **Complete Session Dataset Export (`GET /api/sessions/[id]/export/json`)**:
  - Exports all session metadata, participants (with user profile & point/award totals), teams, activities, responses, whiteboards, reactions, threaded comments, presentation live chat messages, point ledger entries, badges, and event logs in structured JSON.

---

## 2. Key Documentation & Reference Paths

- **Technical Architecture Manual**: `docs/ARCHITECTURE_MANUAL.md`
- **Project Overview & Setup**: `README.md`
- **Domain Glossary**: `GLOSSARY.md`
- **Architecture Decision Records**: `docs/adr/` (`0001` through `0016`)
- **Domain Specification for Peer Rewards**: `docs/domain/peer-rewards.md`
- **Product Requirements Document**: `docs/Training_Game_Management_System_PRD.md`
- **Agent Guidelines**: `AGENTS.md`

---

## 3. Key Source Files

- **Core Pages**:
  - Home & Paginated Session Hub / Participant Join: `src/app/page.tsx`
  - Staff Login Portal (Facilitator / Admin / Super Admin): `src/app/login/page.tsx`
  - Account Settings Page: `src/app/settings/page.tsx`
  - Facilitator Session Dashboard: `src/app/sessions/[id]/facilitator/page.tsx`
  - Participant Session View: `src/app/sessions/[id]/participant/page.tsx`
  - Big-Screen Projector View: `src/app/sessions/[id]/projector/page.tsx`
  - User Management Page: `src/app/users/page.tsx`
  - Sessions Management Page: `src/app/sessions/page.tsx`
  - Activities Library Page: `src/app/activities/page.tsx`
- **Key Components**:
  - `src/components/PresentationViewer.tsx` (Canva & uploaded deck viewer, presenter slide sync, real-time presentation live chat, hide/unhide chat toggle)
  - `src/components/UserAvatarButton.tsx` (top-right interactive avatar & profile modal trigger)
  - `src/components/ParticipantDetailModal.tsx` (View Profile modal with Facilitator Created Sessions tab, Participant Interactions/Points/Awards tabs, and inline Edit Info & Settings tab)
  - `src/components/SentConfirmationEffect.tsx` (toast notifications for sent/received chat messages, points, awards, feedback, and comments)
  - `src/components/CollaborativeWhiteboard.tsx` (Miro-style Excalidraw canvas with templates)
  - `src/components/ProjectedWorkModal.tsx` (modal for inspecting projected works and peer point gifting)
  - `src/components/AwardNotificationModal.tsx` (real-time celebratory pop-up for points and comments)
  - `src/components/DigitalTimer.tsx` (server-synchronized countdown timer)
  - `src/components/LeaderboardView.tsx` (individual & team standings)
- **Services & Socket Relay**:
  - `src/lib/socket.ts` & `src/lib/socket-client.ts`
  - `src/services/user.service.ts`
  - `src/services/peer-interaction.service.ts`
  - `src/services/whiteboard.service.ts`
  - `src/services/activity.service.ts`

---

## 4. Verification & Testing

- **TypeScript Static Analysis**: `npx tsc --noEmit` exits with code `0`.
- **Vitest Test Suite**: Run via `npx vitest run`.
- **Prisma Studio**: Configured via `package.json` (`"prisma": { "schema": "src/prisma/schema.prisma" }`); run `npx prisma studio` directly from the root directory.
