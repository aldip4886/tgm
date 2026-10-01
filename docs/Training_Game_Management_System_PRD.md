# Project Requirements Document (PRD)
## Training Game Management & Collaborative Learning Platform

**Document Version:** 1.1  
**Status:** Draft for Development  
**Product Type:** Web-based collaborative training and game management platform  
**Primary Users:** Facilitators, trainers, instructors, participants, team leaders  
**Primary Use Cases:** Classroom training, synchronous distance learning, blended learning, and e-learning

---

## 1. Executive Summary

The **Training Game Management System (TGMS)** is a web-based platform designed to help facilitators conduct interactive, collaborative, and gamified learning activities.

The platform combines:

- Facilitator-led questions and challenges
- Participant responses
- Sticky-note-style interaction
- Peer comments and likes
- Peer-to-peer points
- Facilitator scoring
- Collaborative whiteboards using Excalidraw
- Digital timers
- Team-based activities
- Leaderboards
- Digital badges and rewards
- Complete interaction-history capture
- JSON data export
- Canva presentation integration
- Learning analytics readiness

The central learning loop is:

> **Present → Respond → Share → Collaborate → Evaluate → Earn Points → Reflect → Get Recognized**

The platform should be usable both **face-to-face and remotely**, without requiring the facilitator and participants to be physically co-located.

---

# 2. Product Vision

Create a flexible digital environment where facilitators can transform conventional training activities into **interactive collaborative learning games**, while automatically capturing meaningful learning interactions as structured data.

The platform should allow the facilitator to use their existing **Canva presentations as the instructional presentation layer**, while the TGMS provides the interactive layer around the presentation.

### Product Positioning

> **Collaborative Learning Game Management Platform**

The product should support case-based learning, problem solving, brainstorming, peer review, team challenges, discussion, presentation, reflection, and gamification.

---

# 3. Objectives

The system should enable facilitators to:

1. Create and manage training sessions.
2. Create interactive learning activities.
3. Present cases, problems, questions, and instructional content.
4. Use existing Canva presentations during training sessions.
5. Collect participant responses in real time.
6. Facilitate individual and team activities.
7. Allow participants to interact with each other's contributions.
8. Use collaborative whiteboards.
9. Control activity timing.
10. Award and calculate points.
11. Display leaderboards.
12. Create and award badges.
13. Monitor participant engagement.
14. Export the complete session interaction history.
15. Reuse activity templates.
16. Support synchronous and asynchronous learning.
17. Connect presentation content and interactive activities into one facilitator workflow.

---

# 4. Target Users

## 4.1 Facilitator

Responsible for:

- Creating sessions
- Connecting Canva presentations
- Creating activities
- Managing participants
- Controlling activities
- Setting timers
- Monitoring responses
- Managing teams
- Scoring
- Awarding badges
- Reviewing analytics
- Exporting data

## 4.2 Participant

Responsible for:

- Joining sessions
- Viewing facilitator presentation content where enabled
- Answering questions
- Creating responses
- Participating in team activities
- Using the whiteboard
- Commenting
- Liking/reacting
- Awarding points
- Viewing scores
- Receiving badges

## 4.3 Administrator

Optional future role responsible for:

- User management
- Organization management
- Permissions
- Badge libraries
- Templates
- System configuration
- Data governance
- Canva integration configuration

---

# 5. Product Scope

## MVP

### Session Management

- Create session
- Join session
- Session code
- QR code
- Participant list
- Session status

### Canva Presentation Integration

- Connect a Canva presentation to a training session
- Select a Canva presentation from the facilitator's Canva account
- Open the presentation from the facilitator dashboard
- Present Canva content while controlling interactive activities from TGMS
- Associate presentation slides/pages with activities
- Launch an activity from a presentation checkpoint
- Return to the presentation after an activity
- Preserve the Canva presentation as the facilitator's presentation source
- Support presentation links or approved Canva integration mechanisms
- Maintain presentation metadata in the session record

### Activity Management

- Create activity
- Open question
- Sticky notes
- Poll
- Case
- Problem-solving activity
- Team activity

### Interaction

- Text response
- Sticky note
- Comments
- Likes/reactions
- Points

### Facilitation

- Live activity control
- Show/hide responses
- Lock responses
- Digital timer
- Presentation/activity switching

### Collaboration

- Individual whiteboard
- Team whiteboard
- Excalidraw integration

### Gamification

- Points
- Leaderboard
- Badges
- Facilitator awards

### Data

- Event logging
- JSON export

---

# 6. Canva Presentation Integration

## 6.1 Purpose

Facilitators frequently already have training materials in Canva. The TGMS should therefore avoid forcing them to recreate presentation content in another presentation tool.

The platform should provide a **Canva-powered presentation workflow** in which Canva remains the source of the presentation while TGMS provides session management and interactive learning functionality.

### Desired facilitator experience

```text
Canva Presentation
        |
        v
Connect to TGMS
        |
        v
Create Training Session
        |
        v
Map presentation sections/slides
        |
        +-------------------+
        |                   |
        v                   v
 Presentation          Interactive Activity
        |                   |
        |             Questions / Responses
        |                   |
        |             Timer / Whiteboard
        |                   |
        +---------+---------+
                  |
                  v
             Continue Canva
                  |
                  v
             Next Activity
```

## 6.2 Presentation Integration Modes

The system should support, subject to the capabilities and permissions available through Canva's integration mechanisms:

### Mode A — Open Canva Presentation

The facilitator opens the selected Canva presentation from TGMS.

### Mode B — Embedded Presentation

Where supported, the Canva presentation is displayed inside the TGMS facilitator interface.

### Mode C — Presentation + Activity Workspace

The facilitator has a split workspace:

```text
┌──────────────────────────────────────────────┐
│ CANVA PRESENTATION                           │
│                                              │
│               Slide / Page                   │
│                                              │
├──────────────────────┬───────────────────────┤
│ ACTIVITY             │ SESSION CONTROL       │
│                      │                       │
│ Question             │ Timer 04:32           │
│ Responses: 24        │ Participants: 28     │
│                      │                       │
│ [Open Activity]      │ [Leaderboard]         │
└──────────────────────┴───────────────────────┘
```

The exact implementation should depend on the Canva APIs, embedding permissions, OAuth capabilities, and account-level access available at implementation time.

---

# 7. Canva Presentation Workflow

## Step 1 — Connect Canva

The facilitator selects:

```text
[ Connect Canva ]
```

The system authenticates the facilitator with Canva using the supported authorization mechanism.

## Step 2 — Select Presentation

The facilitator sees available Canva presentations:

```text
MY CANVA PRESENTATIONS

┌────────────────┐ ┌────────────────┐
│ Presentation A │ │ Presentation B │
│                │ │                │
│  Preview       │ │  Preview       │
│                │ │                │
│ [Select]       │ │ [Select]       │
└────────────────┘ └────────────────┘
```

## Step 3 — Create Presentation Map

The facilitator can associate presentation sections/pages with learning activities.

Example:

```text
Slide 01  → Introduction
Slide 02  → Context
Slide 03  → Case
Slide 04  → Question Activity
Slide 05  → Discussion
Slide 06  → Team Challenge
Slide 07  → Reflection
Slide 08  → Conclusion
```

## Step 4 — Run Session

During the live session:

```text
CANVA SLIDE
    ↓
FACILITATOR EXPLAINS
    ↓
OPEN INTERACTIVE ACTIVITY
    ↓
PARTICIPANTS RESPOND
    ↓
PEER INTERACTION
    ↓
DISCUSSION
    ↓
RETURN TO CANVA
    ↓
NEXT SLIDE
```

---

# 8. Presentation-Activity Linking

A key requirement is the ability to connect presentation content with interactive activities.

Each activity should optionally contain:

```text
presentation_id
presentation_page_id
presentation_page_number
activity_id
```

Example:

```json
{
  "presentation_id": "CANVA-PRESENTATION-001",
  "presentation_page": 6,
  "activity_id": "ACT-004",
  "activity_type": "case"
}
```

This enables a facilitator to treat the presentation and game activities as a single instructional flow.

---

# 9. Activity Engine

The **Activity Engine** is the core of the platform.

## Activity Types

### Response Activities

- Open Question
- Short Answer
- Sticky Note
- Brainstorm
- Poll
- Multiple Choice
- Ranking
- Reflection

### Collaboration Activities

- Collaborative Whiteboard
- Mind Mapping
- Case Study
- Problem Solving
- Team Challenge
- Process Mapping

### Presentation Activities

- Individual Presentation
- Team Presentation
- Gallery Walk

### Evaluation Activities

- Peer Review
- Peer Voting
- Like/Reaction
- Point Allocation
- Facilitator Assessment

---

# 10. Activity Configuration

Each activity should have configurable parameters.

```text
Activity
├── Basic Information
│   ├── Title
│   ├── Description
│   ├── Instructions
│   └── Activity Type
│
├── Presentation Link
│   ├── Canva Presentation
│   ├── Page/Slide
│   └── Launch Point
│
├── Response
│   ├── Response Type
│   ├── Required/Optional
│   ├── Maximum Length
│   └── Attachment Options
│
├── Collaboration
│   ├── Individual
│   ├── Team
│   └── Whole Class
│
├── Peer Interaction
│   ├── Comments
│   ├── Likes
│   └── Points
│
├── Timer
│   ├── Duration
│   ├── Countdown
│   └── Auto-lock
│
└── Scoring
    ├── Participation Points
    ├── Peer Points
    └── Facilitator Points
```

---

# 11. Digital Timer

The Digital Timer is a platform-level facilitation feature.

## Modes

- Countdown
- Stopwatch
- Activity timer
- Optional Pomodoro mode

## Requirements

The timer must:

- Be visible to participants
- Be visible to the facilitator
- Synchronize across connected clients
- Support pause/resume
- Support reset
- Support extension
- Trigger completion event
- Optionally lock the activity
- Optionally notify participants

Timer events must be stored in the event log.

---

# 12. Collaborative Whiteboard

The platform should integrate **Excalidraw** as the collaborative whiteboard engine.

## Supported modes

### Individual Whiteboard

Each participant gets a separate board.

### Team Whiteboard

Multiple participants work simultaneously on the same board.

### Facilitator Whiteboard

Facilitator-controlled board for demonstrations and discussion.

## Whiteboard capabilities

Participants should be able to:

- Draw
- Write
- Add shapes
- Add arrows
- Create diagrams
- Create mind maps
- Move objects
- Collaborate in real time
- Save work
- Submit work
- Present work

## Whiteboard lifecycle

```text
Create Whiteboard
       ↓
Open
       ↓
Collaborate
       ↓
Save
       ↓
Submit
       ↓
Present
       ↓
Peer Feedback
       ↓
Score
```

The Excalidraw scene data should be persisted so that the board can be reconstructed later.

---

# 13. Peer Interaction

Participants should be able to interact with responses.

## Like

```text
👍 Like
```

The system should prevent multiple likes from the same participant on the same response unless the activity explicitly permits repeated reactions.

## Comment

Comments should support:

- Text
- Author
- Timestamp
- Response reference
- Optional replies

## Points

Participants may award points where enabled.

Example:

```text
+5 points

Reason:
"Useful solution"
```

The facilitator should be able to configure whether participants can:

- Award points
- Give unlimited points
- Have a limited point budget
- Award points once per response

---

# 14. Scoring Engine

The system should maintain multiple point categories:

- Participation Points
- Peer Contribution Points
- Challenge Points
- Facilitator Points
- Team Points
- Bonus Points

Example:

```text
Participation       30
Peer Contribution   15
Challenge           40
Facilitator         20
Bonus               10
──────────────────────
TOTAL              115
```

The scoring system should not rely exclusively on likes because popularity does not necessarily represent learning quality.

---

# 15. Leaderboard

The system should support:

### Individual leaderboard

```text
RANK   PARTICIPANT       POINTS
1      Participant A      115
2      Participant B       98
3      Participant C       87
```

### Team leaderboard

```text
RANK   TEAM              POINTS
1      Team Alpha         450
2      Team Beta           420
3      Team Gamma          390
```

The facilitator can choose whether the leaderboard is:

- Hidden
- Visible during activity
- Visible after activity
- Visible only at the end

---

# 16. Badge & Reward Engine

Badges may be automatically or manually awarded.

## Example badges

| Badge | Description |
|---|---|
| Critical Thinker | High-quality problem solving |
| Idea Generator | Valuable ideas |
| Collaboration Champion | Strong collaboration |
| Knowledge Sharer | Helpful peer contributions |
| Challenge Master | Strong challenge performance |
| Top Contributor | Exceptional overall participation |
| Facilitator's Choice | Manual facilitator award |

## Badge rules

Automatic:

```text
IF total_points >= 100
THEN award Active Learner
```

Manual:

```text
Facilitator
 ↓
Select participant
 ↓
Select badge
 ↓
Enter reason
 ↓
Award
```

Badge awarding must be recorded as an event.

---

# 17. Data Export

A major product requirement is **complete data portability**.

The facilitator must be able to download session data as JSON.

## Export should include

- Session
- Facilitator
- Participants
- Teams
- Canva presentation metadata
- Presentation/activity mappings
- Cases
- Problems
- Questions
- Activities
- Responses
- Sticky notes
- Comments
- Likes
- Reactions
- Points
- Scores
- Leaderboards
- Badges
- Timers
- Whiteboards
- Activity states
- Facilitator actions
- Event log

---

# 18. JSON Data Model

The export should use a versioned schema.

```json
{
  "schema_version": "1.0",

  "session": {},

  "facilitator": {},

  "participants": [],

  "teams": [],

  "presentations": [],

  "presentation_activity_mappings": [],

  "activities": [],

  "cases": [],

  "questions": [],

  "responses": [],

  "comments": [],

  "likes": [],

  "points": [],

  "scores": [],

  "leaderboard": [],

  "badges": [],

  "timers": [],

  "whiteboards": [],

  "events": []
}
```

The schema must remain backward-compatible where possible.

---

# 19. Event Logging

The platform should maintain an event log for meaningful user interactions.

Example:

```json
{
  "event_id": "EVT-001",
  "timestamp": "2026-10-01T10:15:00+07:00",
  "session_id": "SESSION-001",
  "activity_id": "ACT-001",
  "actor_id": "P-001",
  "event_type": "RESPONSE_SUBMITTED",
  "target_id": "QUESTION-001",
  "metadata": {}
}
```

Supported event categories include:

```text
SESSION_STARTED
SESSION_ENDED

CANVA_CONNECTED
PRESENTATION_SELECTED
PRESENTATION_OPENED
PRESENTATION_PAGE_VIEWED
PRESENTATION_ACTIVITY_LAUNCHED
PRESENTATION_ACTIVITY_COMPLETED

ACTIVITY_OPENED
ACTIVITY_CLOSED

RESPONSE_SUBMITTED
RESPONSE_EDITED
RESPONSE_DELETED

COMMENT_CREATED
COMMENT_DELETED

LIKE_ADDED
LIKE_REMOVED

POINT_AWARDED
POINT_REVOKED

TIMER_STARTED
TIMER_PAUSED
TIMER_COMPLETED

WHITEBOARD_OPENED
WHITEBOARD_SAVED
WHITEBOARD_SUBMITTED

BADGE_AWARDED

LEADERBOARD_UPDATED
```

---

# 20. Data Architecture

```text
                     WEB CLIENTS
                         │
          ┌──────────────┴──────────────┐
          │                             │
     FACILITATOR                    PARTICIPANT
       CLIENT                         CLIENT
          │                             │
          └──────────────┬──────────────┘
                         │
                  Next.js / React
                         │
              ┌──────────┴──────────┐
              │                     │
         REST/API Layer        WebSocket
              │                     │
              └──────────┬──────────┘
                         │
                  Application Server
                         │
       ┌─────────────────┼─────────────────┐
       │                 │                 │
       ▼                 ▼                 ▼
 Session Engine     Game Engine       Event Engine
       │                 │                 │
       ▼                 ▼                 ▼
 PostgreSQL          Scoring         Event Store
       │              Badge Engine       │
       │                 │                │
       └─────────────────┴────────────────┘
                         │
              ┌──────────┴──────────┐
              │                     │
              ▼                     ▼
        Canva Integration      Export Engine
              │                     │
              ▼                     ▼
       Presentation Data       JSON Dataset
```

---

# 21. Technology Requirements

## Frontend

Recommended:

- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui

## Backend

Recommended:

- Node.js
- Next.js API or dedicated Node.js API
- REST API
- WebSocket / Socket.IO

## Database

Recommended:

- PostgreSQL
- Prisma ORM

## Collaboration

- Excalidraw
- WebSocket-based synchronization

## Presentation Integration

- Canva-supported authentication/integration mechanism
- Canva presentation metadata
- Canva presentation access/opening
- Embedded presentation capability where supported
- Presentation-to-activity mapping

The exact Canva implementation must be validated against Canva's current API, OAuth, embedding, permissions, and account capabilities during technical design.

## Authentication

Recommended:

- Auth.js
- Organization/session-based authorization

## Deployment

- Docker
- Linux server/cloud environment
- PostgreSQL managed or containerized database

---

# 22. High-Level Database Model

```text
USER
 │
 ├──────── PARTICIPANT
 │
 └──────── FACILITATOR

SESSION
 │
 ├── PARTICIPANTS
 ├── TEAMS
 ├── PRESENTATIONS
 │     └── PRESENTATION_ACTIVITY_MAPPINGS
 │
 ├── ACTIVITIES
 │     │
 │     ├── QUESTIONS
 │     ├── CASES
 │     ├── RESPONSES
 │     ├── COMMENTS
 │     ├── LIKES
 │     ├── POINTS
 │     ├── TIMERS
 │     └── WHITEBOARDS
 │
 ├── SCORES
 ├── BADGES
 └── EVENTS
```

Core entities:

```text
users
sessions
session_participants
teams
team_members

presentations
presentation_activity_mappings

activities
cases
problems
questions
responses
comments
reactions
points
scores
timers
whiteboards
badges
participant_badges
events
```

---

# 23. API Requirements

Representative endpoints:

## Session

```text
POST   /api/sessions
GET    /api/sessions/:id
PATCH  /api/sessions/:id
POST   /api/sessions/:id/join
POST   /api/sessions/:id/start
POST   /api/sessions/:id/end
```

## Canva

```text
GET    /api/integrations/canva/connect
GET    /api/integrations/canva/callback
GET    /api/integrations/canva/presentations
POST   /api/sessions/:id/presentations
DELETE /api/sessions/:id/presentations/:presentationId
```

Exact endpoint names may change depending on the selected Canva integration architecture.

## Presentation Mapping

```text
POST   /api/presentations/:id/mappings
GET    /api/presentations/:id/mappings
PATCH  /api/presentation-mappings/:id
DELETE /api/presentation-mappings/:id
```

## Activities

```text
POST   /api/sessions/:id/activities
GET    /api/sessions/:id/activities
PATCH  /api/activities/:id
POST   /api/activities/:id/open
POST   /api/activities/:id/close
```

## Responses

```text
POST   /api/activities/:id/responses
GET    /api/activities/:id/responses
PATCH  /api/responses/:id
DELETE /api/responses/:id
```

## Interaction

```text
POST   /api/responses/:id/comments
POST   /api/responses/:id/likes
POST   /api/responses/:id/points
```

## Timer

```text
POST   /api/activities/:id/timer/start
POST   /api/activities/:id/timer/pause
POST   /api/activities/:id/timer/reset
```

## Whiteboard

```text
POST   /api/activities/:id/whiteboard
GET    /api/whiteboards/:id
PATCH  /api/whiteboards/:id
POST   /api/whiteboards/:id/submit
```

## Rewards

```text
POST   /api/badges
POST   /api/participants/:id/badges
GET    /api/sessions/:id/leaderboard
```

## Export

```text
GET /api/sessions/:id/export/json
```

---

# 24. Facilitator Dashboard

The main dashboard should contain:

```text
┌─────────────────────────────────────────────┐
│ TRAINING SESSION                            │
│                                             │
│ Participants     Activities      Points     │
│     28               6             742      │
│                                             │
├─────────────────────────────────────────────┤
│ PRESENTATION                                │
│                                             │
│ Canva: Case-Based Decision Making           │
│ Current page: 06                            │
│                                             │
│ [OPEN PRESENTATION] [NEXT] [ACTIVITY]       │
├─────────────────────────────────────────────┤
│ CURRENT ACTIVITY                            │
│                                             │
│ Case Challenge 02                           │
│                                             │
│ Responses: 24 / 28                          │
│                                             │
│              04:32                          │
│                                             │
│ [OPEN RESPONSES] [LEADERBOARD] [END]        │
├─────────────────────────────────────────────┤
│ RECENT ACTIVITY                             │
│                                             │
│ P01 submitted response                      │
│ P08 awarded 5 points to P04                 │
│ Team A submitted whiteboard                 │
└─────────────────────────────────────────────┘
```

---

# 25. Participant Interface

The participant interface should prioritize simplicity.

```text
┌─────────────────────────────────────────┐
│ CASE CHALLENGE                          │
│                                         │
│ What would you do in this situation?   │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ Type your response...               │ │
│ └─────────────────────────────────────┘ │
│                                         │
│              04:32                      │
│                                         │
│              [SUBMIT]                   │
└─────────────────────────────────────────┘
```

After submission:

```text
MY RESPONSE

├── 👍 12 Likes
├── 💬 4 Comments
└── ⭐ 8 Points
```

---

# 26. Canva Integration Principles

1. **Canva remains the presentation authoring environment.**
2. TGMS manages the training session and interaction layer.
3. Facilitators should not have to recreate existing Canva presentations.
4. Presentation content should be associated with learning activities where useful.
5. Presentation metadata should be captured in session data.
6. The system should respect Canva permissions and access controls.
7. The implementation must use officially supported Canva integration mechanisms.
8. The platform should degrade gracefully if embedded presentation mode is unavailable.
9. The presentation should remain editable in Canva rather than being flattened unnecessarily.
10. TGMS should not attempt to reproduce Canva's presentation editor.

---

# 27. Distance Learning Requirements

The system must support remote participation.

Participants should be able to join using:

- URL
- QR Code
- Session Code

The system must support:

- Real-time synchronization
- Remote teams
- Shared whiteboards
- Remote peer review
- Synchronized timers
- Online presentation
- Activity locking
- Asynchronous response where enabled

### Synchronous mode

```text
Facilitator
     ↓
Canva Presentation
     ↓
LIVE ACTIVITY
     ↓
Participants
     ↓
Real-time interaction
```

### Asynchronous mode

```text
Facilitator publishes activity
          ↓
Participant accesses activity
          ↓
Participant views presentation material where enabled
          ↓
Participant submits response
          ↓
Other participants interact
          ↓
Facilitator reviews
```

---

# 28. Analytics

The system should capture enough data to calculate:

### Participation

- Participation rate
- Response rate
- Activity completion
- Submission time

### Interaction

- Likes given/received
- Comments given/received
- Peer points given/received

### Collaboration

- Team participation
- Whiteboard activity
- Team contributions

### Gamification

- Points earned
- Points given
- Badges earned
- Leaderboard position

### Facilitation

- Activity duration
- Timer usage
- Activity completion
- Facilitator interventions

### Presentation

- Presentation connected
- Presentation opened
- Pages/slides associated with activities
- Presentation-to-activity transitions
- Activity launched from presentation checkpoint

---

# 29. Future Learning Analytics Architecture

```text
Canva Presentation
       │
       ▼
Training Game
       │
       ▼
Interaction Data
       │
       ▼
Event Store
       │
 ┌─────┼─────────────────┐
 ▼     ▼                 ▼
JSON  Analytics          xAPI
      │                   │
      ▼                   ▼
 Power BI                 LRS
```

This provides a pathway toward integration with an organization's broader learning analytics ecosystem.

---

# 30. Non-Functional Requirements

## Performance

Target:

- Initial application load: < 3 seconds under normal conditions
- Standard API response: < 500 ms
- Real-time interaction latency: preferably < 500 ms
- Whiteboard synchronization should feel near real-time

## Scalability

The architecture should support multiple concurrent sessions and participants without requiring a separate application instance per training session.

## Availability

Target production availability:

**99.5%+**

## Security

The system should implement:

- Authentication
- Authorization
- Session-level access control
- Role-based permissions
- Input validation
- Rate limiting
- Secure WebSocket authentication
- Audit logging
- Secure file handling
- HTTPS
- Secure OAuth token handling for Canva integration

## Privacy

Participant information should be minimized and only collected where required.

Facilitators should have appropriate controls over:

- Participant visibility
- Response visibility
- Comments
- Leaderboards
- Export permissions

---

# 31. Moderation

Because participants can create comments and award points, the platform should provide basic moderation.

Facilitators should be able to:

- Delete inappropriate comments
- Hide responses
- Disable comments
- Disable likes
- Disable peer points
- Remove points
- Remove badges
- Lock activities

Future versions can add automated content moderation.

---

# 32. MVP Acceptance Criteria

The MVP is considered functional when a facilitator can:

1. Create a training session.
2. Connect a Canva presentation.
3. Select a Canva presentation for the session.
4. Open/use the presentation during the training session.
5. Associate presentation content with interactive activities.
6. Invite participants.
7. Create a question/case activity.
8. Open the activity.
9. Participants submit responses.
10. Participants see permitted responses.
11. Participants like responses.
12. Participants comment on responses.
13. Participants award points.
14. Facilitator starts a synchronized timer.
15. Participants see the timer.
16. Facilitator creates a collaborative whiteboard.
17. Participants collaborate using Excalidraw.
18. Participants submit their whiteboard.
19. Facilitator views the leaderboard.
20. Facilitator awards a badge.
21. The system calculates participant scores.
22. The facilitator continues the Canva presentation.
23. The facilitator ends the session.
24. The facilitator downloads the complete session as JSON.
25. The exported JSON contains the complete interaction history, including presentation/activity mappings.

---

# 33. Development Roadmap

## Phase 1 — Foundation

- Project setup
- Authentication
- User roles
- Database
- Session management
- Participant joining
- Basic UI

## Phase 2 — Activity Engine

- Activity builder
- Questions
- Cases
- Problems
- Responses
- Sticky notes
- Activity states

## Phase 3 — Canva Integration

- Canva integration research and capability validation
- OAuth/authentication flow
- Presentation selection
- Presentation metadata
- Presentation workspace
- Presentation/activity mapping
- Presentation event logging
- Fallback open-in-Canva workflow

## Phase 4 — Interaction Engine

- Likes
- Comments
- Reactions
- Peer points
- Event logging

## Phase 5 — Facilitation

- Digital timer
- Live dashboard
- Activity controls
- Response visibility
- Presentation/activity switching
- Session control

## Phase 6 — Collaboration

- Excalidraw
- Individual boards
- Team boards
- Whiteboard persistence
- Whiteboard submission

## Phase 7 — Gamification

- Scoring engine
- Leaderboard
- Badge engine
- Manual rewards
- Automatic rewards

## Phase 8 — Data

- JSON schema
- Export engine
- Event history
- Session analytics

## Phase 9 — Advanced Platform

- AI assistant
- xAPI
- LRS
- Power BI
- LMS integration
- Advanced learning analytics

---

# 34. Recommended MVP Architecture

For the first implementation, avoid over-engineering.

```text
Next.js
   │
   ├── React
   ├── TypeScript
   ├── Tailwind
   └── shadcn/ui
          │
          ▼
       API Layer
          │
   ┌──────┴──────────┐
   │                 │
Prisma            Socket.IO
   │                 │
   ▼                 ▼
PostgreSQL       Real-time Events
   │
   ├── Sessions
   ├── Activities
   ├── Responses
   ├── Comments
   ├── Points
   ├── Scores
   ├── Badges
   ├── Timers
   ├── Whiteboards
   ├── Presentations
   ├── Presentation Mappings
   └── Events
```

---

# 35. Product Success Metrics

The platform should ultimately measure:

### Engagement

- Percentage of participants submitting responses
- Average responses per participant
- Peer interaction rate

### Collaboration

- Comments per participant
- Peer feedback rate
- Team participation
- Whiteboard contribution

### Gamification

- Point distribution
- Badge achievement
- Challenge completion

### Facilitation

- Activities completed
- Average activity duration
- Timer utilization
- Presentation/activity transitions

### Presentation Integration

- Number of sessions using Canva
- Presentations connected per session
- Activities launched from presentation checkpoints
- Successful presentation connection rate

### Data

- Percentage of sessions successfully exported
- Event capture completeness
- JSON schema validity

---

# 36. Product Principle

The most important architectural principle is:

> **Every meaningful learning interaction should become structured data.**

A participant's response, a peer's comment, a like, a point, a whiteboard contribution, a timer event, a presentation checkpoint, and a badge should not disappear when the training session ends.

They should become part of a reusable **Learning Interaction Dataset** that can subsequently support:

**Training Review → Learning Analytics → Competency Analysis → AI Analysis → Organizational Learning Intelligence.**

---

# 37. Final Product Concept

The resulting platform combines four major layers:

```text
                  TRAINING GAME PLATFORM
                           │
       ┌───────────────────┼───────────────────┐
       │                   │                   │
       ▼                   ▼                   ▼
  PRESENTATION        FACILITATION        PARTICIPATION
       │                   │                   │
    CANVA               TIMER             QUESTIONS
    Slides              SESSION           RESPONSES
    Content             CONTROL           COMMENTS
       │                   │               LIKES
       │                   │               POINTS
       └──────────────┬────┴──────────────────┘
                      │
                      ▼
                COLLABORATION
                      │
              ┌───────┴────────┐
              ▼                ▼
          EXCALIDRAW         TEAMS
              │                │
              └───────┬────────┘
                      ▼
                 GAMIFICATION
                      │
             ┌────────┼────────┐
             ▼        ▼        ▼
           POINTS   BADGES  LEADERBOARD
                      │
                      ▼
                 EVENT LOG
                      │
          ┌───────────┼───────────┐
          ▼           ▼           ▼
        JSON       ANALYTICS     xAPI/LRS
```

The strategic value of the platform is therefore not merely the ability to run games. It creates a **digital operating layer for interactive learning**, where the facilitator can use existing Canva instructional content, activate collaborative learning activities, manage time and participation, reward contributions, and retain the complete learning interaction history as structured data.
