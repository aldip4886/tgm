# Training Game Management System (TGMS)

The Training Game Management System is a collaborative training and gamified learning platform connecting instructional presentation flows with real-time participation, peer interaction, and structured learning data capture.

## Roles & Identity

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
A short alphanumeric identifier used by participants to discover and enter a specific session.
_Avoid_: Room code, game PIN, join code, passkey

## Facilitation & Presentation

**Presentation Mapping**:
A configured association connecting a slide or page of an external presentation to a specific activity.
_Avoid_: Slide bind, presentation link, checkpoint

**Projector View**:
A dedicated, participant-facing display window opened by the facilitator for external screens, beamers, or screen-shares, free of administrative controls.
_Avoid_: Audience view, second screen, stage mode

## Activities & Interactions

**Activity**:
A discrete, facilitator-controlled instructional challenge (such as a question, sticky-note board, case study, or whiteboard) within a session.
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
A shared or individual digital visual canvas powered by Excalidraw for sketching, diagramming, and structured thinking.
_Avoid_: Drawing board, scratchpad, canvas

**Scene State**:
The structured JSON data payload capturing all Excalidraw elements, app state, and assets of a whiteboard.
_Avoid_: Snapshot, canvas dump, drawing data

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
