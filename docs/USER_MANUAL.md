# Training Game Management System (TGMS) — Complete User Manual & Role Guide

Welcome to the official **Training Game Management System (TGMS)** User Manual. TGMS is designed around four distinct user roles—each with tailored portals, dashboards, and permissions.

---

## 1. Dedicated Manuals by Role

Select your role below to open its complete, step-by-step user manual:

1. **[Super Administrator (`SUPER_ADMIN`) Manual](./manuals/SUPER_ADMIN_MANUAL.md)**
   - Unrestricted platform governance, managing `SUPER_ADMIN` and `ADMIN` accounts, assigning sessions across facilitators, overseeing live sessions, and exporting system-wide JSON datasets.
2. **[Administrator (`ADMIN`) Manual](./manuals/ADMIN_MANUAL.md)**
   - Managing `FACILITATOR` and `PARTICIPANT` accounts, bulk-creating training cohorts, inspecting facilitator session histories via **View Profile**, assigning sessions to facilitators, and exporting session data.
3. **[Facilitator (`FACILITATOR`) Manual](./manuals/FACILITATOR_MANUAL.md)**
   - Creating sessions, linking Canva presentations or uploading slide decks (`PDF`, `IMAGES`, `PPTX`), projecting slides to participants, toggling **Interactive Navigation** (free browse vs. presenter-synced slides), moderating **Real-Time Presentation Live Chat** (with hide/unhide chat and inline rewards), running **Miro-style Collaborative Whiteboards & Templates**, and concluding sessions cleanly.
4. **[Participant (`PARTICIPANT`) Manual](./manuals/PARTICIPANT_MANUAL.md)**
   - Joining sessions with a 6-character **Session Code**, viewing projected slides in floating/fullscreen mode, participating in **Presentation Live Chat**, collaborating on **Miro-style Whiteboards**, gifting **Peer Points** (`+1`, `+3`, `+5`), and managing your profile via the top-right avatar.

---

## 2. Quick Role Comparison Matrix

| Feature / Action | `SUPER_ADMIN` | `ADMIN` | `FACILITATOR` | `PARTICIPANT` |
| :--- | :---: | :---: | :---: | :---: |
| **Sign-In / Entry URL** | `/login` | `/login` | `/login` | `/` (with 6-char Session Code) |
| **Landing Page After Sign-In** | Command Homepage (`/`) | Command Homepage (`/`) | Command Homepage (`/`) | Participant Session View |
| **Create / Edit / Delete `SUPER_ADMIN` Users** | ✅ | ❌ | ❌ | ❌ |
| **Create / Edit / Delete `ADMIN`, `FACILITATOR`, `PARTICIPANT` Users** | ✅ | ✅ | ❌ | ❌ |
| **Inspect Profiles ("View Profile" in `/users` & Roster)** | ✅ (All Users + Edit) | ✅ (All Users + Edit) | ✅ (Read-Only Directory) | ✅ (Own & Peer Session Info) |
| **Edit Own Account Info & Settings (`/settings` / Top-Right Avatar)** | ✅ | ✅ | ✅ | ✅ |
| **Create Training Sessions** | ✅ | ✅ | ✅ | ❌ |
| **Assign Session to Another Facilitator** | ✅ | ✅ | ❌ | ❌ |
| **Link / Delete Canva URL & Upload Decks (`PDF`, `IMAGES`, `PPTX`)** | ✅ | ✅ | ✅ (Own Sessions) | ❌ |
| **Project Slides & Toggle Interactive / Synced Slide Navigation** | ✅ | ✅ | ✅ (Own Sessions) | Views Projected Slides |
| **Enable / Disable & Hide / Show Presentation Live Chat** | ✅ | ✅ | ✅ (Own Sessions) | Participates & Hides/Shows Chat |
| **Award Inline Feedback, Points & Badges in Live Chat** | ✅ | ✅ | ✅ (Own Sessions) | Receives Notifications |
| **Use Miro-Style Collaborative Whiteboards & 6 Built-in Templates** | ✅ | ✅ | ✅ | ✅ |
| **Gift Peer Points (`+1`, `+3`, `+5` from 20-pt Budget)** | N/A | N/A | Awards Bonus Points | ✅ |
| **Conclude Session & Return to Clean Paginated Home Screen** | ✅ | ✅ | ✅ (Own Sessions) | Redirected / Notified |
| **Export Complete Session or Participant JSON Dataset** | ✅ | ✅ | ✅ (Own Sessions) | Own Participant JSON |

---

## 3. Default Seeded Test Accounts

For local testing and training simulations, the database includes pre-seeded accounts for each role:

| Role | Seeded Usernames | Entry Portal |
| :--- | :--- | :--- |
| **`SUPER_ADMIN`** | `superadmin_sarah`, `superadmin_david` | `http://localhost:3000/login` |
| **`ADMIN`** | `admin_alex`, `admin_clara` | `http://localhost:3000/login` |
| **`FACILITATOR`** | `facilitator_maya`, `facilitator_sam` | `http://localhost:3000/login` |
| **`PARTICIPANT`** | `participant_john`, `participant_jane` (or join as Guest with Session Code) | `http://localhost:3000/` |
