# Training Game Management System (TGMS) - Agent Handoff Document

Generated at: 2026-10-01
Working Directory: `c:\Users\aldip\Downloads\game_management`

---

## 1. Project Context & Current Status

The Training Game Management System is a full-stack real-time interactive game and workshop platform built with **Next.js (App Router)**, **Prisma ORM**, **Tailwind CSS**, **Socket.IO**, and **Excalidraw**.

All recent feature requests and bug fixes have been completely implemented, integrated, and verified:
- **Role-Based Access Control**:
  - `SUPER_ADMIN`: Full system authority, manages all users (including creating/deleting Admins and Super Admins), manages all sessions, downloads interactions data.
  - `ADMIN`: Manages participants/facilitators, manages all sessions, downloads interaction data; strictly blocked from creating or deleting Super Admins.
  - `FACILITATOR`: Scoped strictly to sessions they created; cannot modify or control sessions created by other facilitators.
  - `PARTICIPANT`: Joins sessions via code, submits challenges, participates in live interactions.
- **Interactive Activity Types**:
  - Live Polls & Trivia Quizzes (`POLL`, `QUIZ`) with instant scoring and duplicate vote prevention.
  - Word Clouds (`WORD_CLOUD`) with frequency aggregation.
  - Q&A Sessions (`QA`) with anonymous submissions, single-vote upvoting, spotlighting, and answered toggles.
  - Open-Ended & Ranking (`RANKING`) using Borda count prioritization.
  - Collaborative Whiteboards (`WHITEBOARD_INDIVIDUAL`, `WHITEBOARD_TEAM`, `WHITEBOARD_PUBLIC`) with post-it tools.
- **Peer Recognition & Rewards System**:
  - 20-point starting peer budget per participant (non-renewable).
  - Gifting in increments of +1, +3, +5 with optional personalized reasoning.
  - Deducts from giver's budget and directly awards points to the recipient and their team.
  - Self-awarding and exceeding budget are rejected by the system.
  - Unlimited, free reactions (`LIKE`) with real-time counts.
  - Documented in `docs/domain/peer-rewards.md`.
- **Participant Layout Overhaul**:
  - Leaderboard (`LeaderboardView`) repositioned to the very bottom of the page (`#session-leaderboard`).
  - Top header "Standings" button smoothly scrolls down to standings.
- **Real-Time Celebratory Pop-up Modals**:
  - `AwardNotificationModal`: Celebratory amber modal for points awards (amount, giver name, reasoning) and indigo modal for comments.
- **Facilitator Projected Works & Peer Interaction**:
  - Facilitators can project whiteboards or responses to the room.
  - Participants receive a live projection banner and can open `ProjectedWorkModal` to inspect the canvas, toggle likes, write threaded comments, and gift peer points with reasoning.
- **Whiteboard Response Bridge**:
  - Whiteboard submissions automatically create/update a `Response` record with `color: "WHITEBOARD"`, allowing whiteboards to participate seamlessly in comments, reactions, and peer points.

---

## 2. Artifacts & Reference Paths

Do not duplicate content already captured in these artifacts; consult them directly:
- **Implementation Plan**: `C:\Users\aldip\.gemini\antigravity\brain\d6b8ceda-0141-43eb-bf5f-ca91f96f303f\implementation_plan.md`
- **Comprehensive Walkthrough**: `C:\Users\aldip\.gemini\antigravity\brain\d6b8ceda-0141-43eb-bf5f-ca91f96f303f\walkthrough.md`
- **Domain Specification for Peer Rewards**: `docs/domain/peer-rewards.md`
- **Domain Glossary**: `GLOSSARY.md`
- **Agent Guidelines**: `AGENTS.md`

---

## 3. Key Source Files

- **Core Views**:
  - Participant Session: `src/app/sessions/[id]/participant/page.tsx`
  - Facilitator Dashboard: `src/app/sessions/[id]/facilitator/page.tsx`
  - Big-Screen Projector: `src/app/sessions/[id]/projector/page.tsx`
  - User Management UI: `src/app/users/page.tsx`
- **Key Components**:
  - `src/components/AwardNotificationModal.tsx` (pop-up for points and comments)
  - `src/components/ProjectedWorkModal.tsx` (modal for inspecting projected works, liking, commenting, and point gifting)
  - `src/components/CollaborativeWhiteboard.tsx` (canvas editor / viewer)
  - `src/components/LeaderboardView.tsx` (standings table)
  - `src/components/interactions/` (`PollQuizView`, `WordCloudView`, `QAView`, `RankingView`)
- **Services & Sockets**:
  - `src/services/peer-interaction.service.ts`
  - `src/services/whiteboard.service.ts`
  - `src/services/user.service.ts`
  - `src/services/activity.service.ts`
  - `src/lib/socket.ts` (socket server relays)
  - `src/lib/socket-client.ts` (client socket singleton)

---

## 4. Verification & Testing

- **Vitest Suite**: 17 test files, 87 tests passing. Run via `npx vitest run`.
  - Main test suites:
    - `tests/peer-notifications-and-rewards.test.ts`
    - `tests/roles-and-session-isolation.test.ts`
    - `tests/new-interactions.test.ts`
    - `tests/facilitator-auth.test.ts`
    - `tests/whiteboard-scoping.test.ts`
    - `tests/user-management.test.ts`
- **TypeScript Static Analysis**: `npx tsc --noEmit` exits with code 0.
- **Dev Server**: Running on port 3000.

---

## 5. Seeded Accounts for Testing

The SQLite database is seeded with 2 accounts per role. Passwords follow standard development conventions and are redacted here.
- `SUPER_ADMIN`: `superadmin_sarah`, `superadmin_david`
- `ADMIN`: `admin_alex`, `admin_clara`
- `FACILITATOR`: `facilitator_maya`, `facilitator_sam`
- `PARTICIPANT`: `participant_john`, `participant_jane`

---

## 6. Suggested Skills for the Next Agent

The next agent should call the `Skill` tool for:
- `code-review`: To conduct automated standards and spec reviews on recent commits or branches.
- `tdd`: If implementing new interactive features or bug fixes test-first.
- `diagnosing-bugs`: If troubleshooting any runtime edge cases, socket disconnects, or concurrency issues.
- `domain-modeling`: If extending the glossary or recording new Architecture Decision Records (ADRs).
- `pr`: When drafting a PR description for the repository.
