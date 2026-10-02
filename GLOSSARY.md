# Training Game Management System (TGMS)

The Training Game Management System is a collaborative training and gamified learning platform connecting instructional presentation flows with real-time participation, peer interaction, and structured learning data capture.

## Roles & Identity

**Super Administrator**:
The highest-privilege system steward with unrestricted authority to manage all user accounts (including administrators), oversee all sessions, and audit system-wide datasets.
_Avoid_: Root, master admin, system owner

**Administrator**:
A privileged operator who manages facilitator and participant accounts, assigns sessions across facilitators, and audits session datasets, without authority over Super Administrators.
_Avoid_: Moderator, manager, sysadmin

**Facilitator**:
An authenticated trainer or instructor who creates, configures, and directs a training session and its activities.
_Avoid_: Host, presenter, teacher, admin

**Participant**:
An individual attending a session who engages in activities, collaborates with peers, and receives feedback and recognition.
_Avoid_: Student, attendee, player, client

**Team**:
A named cohort of participants within a session collaborating on shared activities and competing on the team leaderboard.
_Avoid_: Group, squad, breakout

## Session Lifecycle

**Session**:
A live, time-bounded learning event orchestrated by a facilitator where participants join and engage in activities.
_Avoid_: Room, meeting, class, match

**Session Code**:
A short alphanumeric identifier used exclusively by participants to discover and enter a specific session.
_Avoid_: Room code, game PIN, join code, passkey

## Facilitation & Presentation

**Screen Projection**:
A live broadcast mode initiated by the facilitator that streams the active presentation deck to participant devices and the projector view.
_Avoid_: Screen share, cast, live stream

**Interactive Navigation**:
A facilitator-governed presentation policy that determines whether participants can freely browse projected slides at their own pace or remain locked in synchronization with the presenter's active slide.
_Avoid_: Free browse, slide unlock, self-paced mode

**Presentation Live Chat**:
A real-time discussion stream embedded alongside a projected presentation where participants and the facilitator exchange messages, threaded replies, feedback, points, and badges.
_Avoid_: Slide comments, backchannel, side chat

**Presentation Mapping**:
A configured association connecting a presentation deck to a session or activity.
_Avoid_: Slide bind, presentation link, checkpoint

**Projector View**:
A dedicated, audience-facing display window opened by the facilitator for external screens or room beamers, showing presentation slides, synchronized timers, live chat, and public responses free of administrative controls.
_Avoid_: Audience view, second screen, stage mode

## Activities & Interactions

**Activity**:
A discrete, facilitator-controlled instructional challenge (such as a question, poll, quiz, word cloud, Q&A, ranking, sticky-note board, or whiteboard) within a session.
_Avoid_: Task, exercise, round, challenge (when referring to the generic container)

**Activity State**:
The operational phase of an activity (`DRAFT`, `ACTIVE`, `LOCKED`, `COMPLETED`) that strictly governs client submission and interaction permissions.
_Avoid_: Activity status, round phase, step

**Reveal Mode**:
The visibility policy of an activity governing whether peer responses stream into view immediately (`IMMEDIATE`) or remain concealed until the activity is locked (`UPON_LOCK`).
_Avoid_: Display mode, privacy setting, visibility state

**Response**:
A participant's or team's submitted input to an active activity.
_Avoid_: Answer, submission, entry, post

**Peer Reaction**:
A lightweight interaction (such as a like or comment) performed by one participant on another participant's response.
_Avoid_: Feedback, engagement, social action

**Peer Points**:
A facilitator-governed allotment of score points that participants can award to peers for valuable contributions.
_Avoid_: Kudos, tips, peer karma

**Peer Point Budget**:
A dedicated quota of points granted to each participant by the facilitator to allocate to peers without deducting from their personal score.
_Avoid_: Karma pool, gift points, allowance

## Collaboration & Whiteboard

**Whiteboard**:
A shared or individual digital visual canvas for sketching, diagramming, sticky-note ideation, and structured thinking.
_Avoid_: Drawing board, scratchpad, canvas

**Whiteboard Template**:
A pre-structured visual framework (such as a Kanban Board, Mind Map, SWOT Analysis, Retrospective, Flowchart, or Brainstorming Grid) applied to a whiteboard to accelerate collaborative thinking.
_Avoid_: Stencil, blueprint, preset layout

**Scene State**:
The structured data payload capturing all visual elements, layout state, and assets of a whiteboard.
_Avoid_: Snapshot, canvas dump, drawing data

**Projected Work**:
A specific participant response or collaborative whiteboard spotlighted by the facilitator onto the projector view and participant screens for group review, peer reactions, comments, and point gifting.
_Avoid_: Pinned submission, featured board, showcase item

## Gamification & Records

**Point Ledger**:
An immutable record of every awarded or revoked point transaction specifying category, amount, recipient, giver, and rationale.
_Avoid_: Score log, point history, transaction sheet

**Badge**:
A symbolic digital award granted to a participant automatically via rules or manually by the facilitator.
_Avoid_: Achievement, sticker, medal, trophy

**Badge Trigger**:
An automated evaluation rule executed immediately upon state changes (such as point accumulation or activity completion) that grants an eligible badge.
_Avoid_: Achievement criterion, award condition, milestone rule

**Leaderboard**:
A ranked display of participants or teams ordered by cumulative points earned during a session.
_Avoid_: Scoreboard, ranking list, standings

**Event Log**:
An append-only, chronological record capturing every state transition and meaningful participant interaction within a session.
_Avoid_: Audit trail, history, telemetry log

**Session Dataset**:
A complete, structured export of a session containing participant profiles, team standings, activity responses, whiteboard states, presentation chat threads, point ledger entries, badges, and event logs.
_Avoid_: Data dump, backup file, session report
