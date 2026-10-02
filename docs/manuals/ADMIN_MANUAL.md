# Administrator (`ADMIN`) User Manual

**Role Identifier:** `ADMIN`  
**Sign-In Portal:** `http://localhost:3000/login`  
**Primary Landing Page:** Command Homepage (`http://localhost:3000/`)

---

## 1. Role Overview & Authority

As an **Administrator (`ADMIN`)**, you are responsible for day-to-day operational management of facilitators, participants, and training sessions across the **Training Game Management System (TGMS)**.

### What You Can Do
- **Manage Facilitators & Participants**: Create, bulk-generate, edit, inspect (**View Profile**), and delete `FACILITATOR`, `PARTICIPANT`, and standard `ADMIN` accounts.
- **Assign & Reassign Sessions**: Create training sessions and assign or transfer session ownership to any facilitator.
- **Supervise & Co-Facilitate Any Session**: Open the Facilitator Dashboard or Projector View for any session to assist with presentations, live chat moderation, timers, whiteboards, and scoring.
- **Export Complete Datasets**: Download full session JSON archives and individual participant interaction logs.

### Security Boundary (`ADMIN` vs. `SUPER_ADMIN`)
> **Important Restriction:** An `ADMIN` **cannot** create, modify, change the password/role of, or delete a **`SUPER_ADMIN`** account. Any attempt to mutate a `SUPER_ADMIN` user in `/users` or via the API is blocked by the server.

---

## 2. Signing In & Command Homepage

### 2.1 Signing In at `/login`
1. Open `http://localhost:3000/login` (**Facilitator & Admin Sign In**).
   > **Note:** The Session Code entry on `/` is strictly for participants. Administrators sign in exclusively with username and password at `/login`.
2. Enter your **Username** (e.g., `admin_alex` or `admin_clara`) and **Password**.
3. Click **Sign In to Command Center** to open your **Command Homepage** (`/`).

### 2.2 Command Homepage Overview (`/`)
- **Paginated Session Hub**: View all sessions (`6` per page) with clean pagination controls. Previous session chat messages, points, and interactions are kept isolated inside their respective session views so your homepage remains uncluttered.
- **Quick Navigation**: Jump between **Sessions (`/sessions`)**, **Activities (`/activities`)**, **Users (`/users`)**, and your **Top-Right Avatar** menu.

---

## 3. User Management & Profile Inspection (`/users`)

Navigate to `/users` from the top navigation bar.

### 3.1 Onboarding Facilitators and Participants
1. **Single User Creation**:
   - Enter **Name**, **Username**, **Email**, **Password**, and select `FACILITATOR` or `PARTICIPANT` (or `ADMIN`).
   - Click **Create User**.
2. **Bulk User Provisioning**:
   - Use the **Bulk Create** panel to generate multiple participant or facilitator accounts at once for upcoming workshops.

### 3.2 Using "View Profile" to Audit Facilitators & Participants
Click **View Profile** on any row in the `/users` table:
- **When Viewing a Facilitator's Profile**:
  - Review their **Profile Information** (Name, Username, Email, Organization, Bio).
  - Check their **Hosting Metrics**: Total number of **Sessions Created / Hosted**, **Active Sessions**, and **Activities**.
  - Switch to the **Created Sessions** tab to inspect every session they have created, including its **Session Code**, **Status** (`WAITING`, `ACTIVE`, `CONCLUDED`), **Participant Count**, **Activity Count**, and creation timestamp, with a one-click **Open Dashboard** link.
- **When Viewing a Participant's Profile**:
  - Review their **Session Info**, **Total Points**, **Peer Point Budget**, and **Team**.
  - Open the **Interactions** tab to inspect all their responses, sticky notes, whiteboards, presentation live chat messages, and comments.
  - Open the **Points & Awards** tab to audit every point transaction and badge earned.
  - Click **Download JSON** to export that participant's complete data package.

### 3.3 Editing or Deleting Accounts
- Use the inline **Edit Info & Settings** tab inside the **View Profile** modal (or table actions) to update a facilitator's or participant's profile details or reset their password.
- Click **Delete** to remove obsolete `PARTICIPANT` or `FACILITATOR` accounts.

---

## 4. Session Administration & Facilitator Assignment (`/sessions`)

### 4.1 Assigning Sessions to Facilitators
Unlike Facilitators (who can only manage their own sessions), **Administrators can assign sessions to any facilitator**:
1. Navigate to `/sessions` (or `/sessions/create` when creating a new session).
2. Locate the target session and select the desired instructor from the **Assign Facilitator** dropdown.
3. Confirm the assignment (`PATCH /api/sessions/[id]/assign`). The session immediately appears in that facilitator's Command Homepage.

### 4.2 Assisting in Live Sessions & Concluding Sessions
1. From `/` or `/sessions`, click **Facilitator Dashboard** (`/sessions/[id]/facilitator`) on any session.
2. You can link/upload presentations, project slides, toggle **Interactive Navigation**, moderate **Presentation Live Chat**, manage timers, split teams, and award points or badges.
3. When a training event finishes, click **End Session** (`Conclude Session`) in the top bar:
   - The session status transitions to `CONCLUDED`.
   - You are automatically returned to the clean, paginated **Command Homepage (`/`)**.

### 4.3 Exporting Session JSON Datasets
- Click **Export JSON** on any session card in `/sessions` or inside the Facilitator Dashboard to download the full `schema_version: "1.0"` JSON record of all interactions, whiteboards, live chat threads, points, and badges.

---

## 5. Personal Account Settings (`/settings`)

Click your **Avatar** in the top-right corner of any screen to:
- View your own administrative profile and created sessions.
- Edit your **Display Name**, **Username**, **Email**, **Organization**, **Bio**, **Avatar Color**, and **Password** either inside the modal's **Edit Info & Settings** tab or on the dedicated `/settings` page.
