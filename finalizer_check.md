# SyncTracker Finalizer Check & MVP Scope

**Philosophy:** This is **not** a generic task manager. It is a **Responsibility & Sync Intelligence system**.
*If you build a “simple task CRUD app,” you will destroy the product vision.*

Below is the exact mobile MVP feature definition and checklist, strictly aligned with the product vision and tech stack.

---

## 🛠 Stack Alignment
- [ ] **Frontend**: React Native (Expo)
- [ ] **Backend**: NestJS (recommended over Express for structure)
- [ ] **DB**: PostgreSQL (Neon + Drizzle ORM)
- [ ] **Auth**: Supabase Auth (JWT)
- [ ] **State**: Zustand (UI), TanStack Query (server cache)
- [ ] **Storage**: Neon (structured data), Cloudinary (attachments)
- [ ] **Realtime**: Socket.io + Redis adapter
- [ ] **Graph**: React Native SVG + D3-force (controlled layout, NOT free drag)

---

## 0️⃣ Authentication & Identity Layer
### 0.1 Login Screen
- [ ] Email & Password input
- [ ] Login button & Error feedback
- [ ] Auth handled by Supabase Auth (JWT sent to backend, verified per request)

### 0.2 Register Screen
- [ ] Full name, Email, Password, Confirm password fields
- [ ] On success: Auto-login & Store session in secure storage

### 0.3 Session Handling
- [ ] Token refresh
- [ ] Auto logout on expiration
- [ ] Zustand stores user session metadata

---

## 1️⃣ Home Dashboard (Execution Overview)
*This is NOT a task list.*

### 1.1 “My Responsibility” Section (Where user is Responsible Owner)
- [ ] Grouped by: `IN_SYNC`, `NEEDS_UPDATE`, `BLOCKED`, `HELP_REQUESTED`

### 1.2 “Delegated By Me” (Where user is Assigned By)
- [ ] Shows task, Owner name, Current sync state, Last update timestamp

### 1.3 “Participating In” (Where user is Contributor / Helper / Reviewer)
- [ ] Each card shows: Task title, Role, Sync status, Last activity
- [ ] Real-time updates via Socket.io

---

## 2️⃣ Task Creation Flow (Strict Responsibility Model)
### 2.1 Create Task Screen
- [ ] **Required fields**: Title, Description, Responsible Owner (select user)
- [ ] **Optional fields**: Contributors, Helpers, Reviewers, Initial milestone list
- [ ] System behavior: Task status initialized as `PENDING_ACCEPTANCE`
- [ ] **Validation**: Responsible Owner must accept (No silent creation)

---

## 3️⃣ Responsibility Acceptance Flow
*If user is assigned as Responsible Owner:*
### 3.1 Acceptance Screen
- [ ] Shows: Full task description, Assigned By, Participants, Milestones
- [ ] Buttons: Accept Responsibility, Reject
- [ ] On Accept: Log event, Set sync state to `IN_SYNC`, Emit socket event

---

## 4️⃣ Task Detail Screen (Core of App)
*Tabs inside: Overview, Tree View, Graph View, Logs*

### 4.1 Overview Tab
- [ ] Displays: Task metadata, Assigned By, Responsible Owner, Participants (grouped by role)
- [ ] Displays: Current sync state per participant, Last update timestamp, Time logged summary, Milestone progress bar
- [ ] Actions: Update sync status, Log time, Add note, Request help

### 4.2 Responsibility Tree View (Structured)
- [ ] Expandable hierarchy: Task -> Assigned By -> Responsible Owner -> Contributors/Helpers -> Reviewers
- [ ] Each user row shows: Color dot (sync state), Last update time
- [ ] Tap user opens side sheet modal showing: Sync state, Time logged, Milestones completed, Help requests, Notes history

### 4.3 Sync Graph View (Controlled Layout)
- [ ] STRICT layout: Task node center, Responsible below, Contributors branching, Reviewers outer ring
- [ ] Node colors: Green (`IN_SYNC`), Yellow (`NEEDS_UPDATE`), Red (`BLOCKED`), Blue (`HELP_REQUESTED`)
- [ ] Behaviors: Blocked node pulses, Join event animates, Help request flashes blue briefly, Auto-flag stale to yellow
- [ ] Constraints: **No drag. No messy free layout. Clarity > fancy UX.**

### 4.4 Logs Tab (Audit Layer)
- [ ] Chronological feed: Responsibility accepted, Participant joined, Sync update, Help request, Time logged, Milestone completed, Responsibility transfer
- [ ] Characteristics: Immutable. No edit.

---

## 5️⃣ Sync Update System
*Inside Task Detail: User can update status.*
- [ ] Options: `IN_SYNC`, `NEEDS_UPDATE`, `BLOCKED`, `HELP_REQUESTED`
- [ ] Upon update: Creates log entry, Updates DB, Emits socket event, Updates Tree & Graph live
- [ ] Stale rule: If no update in X hours → auto-mark `NEEDS_UPDATE` (via backend cron or job queue)

---

## 6️⃣ Help Request Flow
*When user selects HELP_REQUESTED:*
- [ ] System handles: Status → blue, Notify Responsible Owner, Notify Assigned By, Emit socket event, Log event
- [ ] Push notification optional (not MVP critical)

---

## 7️⃣ Milestones
*Inside task:*
- [ ] Add milestone, Mark complete, Completed by + timestamp
- [ ] Completion triggers: Log entry, Responsible node pulse in graph

---

## 8️⃣ Time Tracking
- [ ] Each participant can log hours/minutes with optional description
- [ ] Stored in DB: `time_logs` table
- [ ] Displayed in side panel and Overview summary

---

## 9️⃣ Responsibility Transfer (Strict Flow)
*Only Responsible Owner can initiate transfer.*
- [ ] Flow: 1) Select new owner -> 2) Old owner confirms transfer -> 3) New owner must accept
- [ ] Task in `TRANSFER_PENDING` state until accepted
- [ ] Graph updates only after acceptance (No silent override)

---

## 🔟 Notifications (MVP Minimal)
*In-app notification center only.*
- [ ] Triggers: Assigned as Responsible, Added as participant, Help requested, Responsibility transfer, Mention in note
- [ ] Realtime via socket

---

## 1️⃣1️⃣ Real-Time Architecture (MVP Level)
- [ ] Tech: Socket.io + Redis adapter
- [ ] Emit events for: `TASK_CREATED`, `RESPONSIBILITY_ACCEPTED`, `SYNC_UPDATED`, `HELP_REQUESTED`, `MILESTONE_COMPLETED`, `TIME_LOGGED`, `TRANSFER_INITIATED`, `TRANSFER_ACCEPTED`
- [ ] Frontend: Subscribe on login, Join room per task
- [ ] TanStack Query: Used for initial fetch, Socket events update cache manually

---

## 1️⃣2️⃣ What Is NOT in MVP
*Be disciplined to maintain focus:*
- [x] ❌ No chat system
- [x] ❌ No comments threads
- [x] ❌ No AI suggestions
- [x] ❌ No analytics dashboard
- [x] ❌ No organization hierarchy
- [x] ❌ No complex permissions beyond roles
- [x] ❌ No push notifications (optional later)
- [x] ❌ No drag-drop graph

---

## 🧠 Database Tables (MVP Core)
- [ ] `users`
- [ ] `tasks`
- [ ] `task_participants`
- [ ] `sync_logs`
- [ ] `time_logs`
- [ ] `milestones`
- [ ] `responsibility_transfers`
- [ ] `notifications`

---

## 🎯 Exact MVP User Journey
- [ ] 1. User registers
- [ ] 2. Logs in
- [ ] 3. Creates task
- [ ] 4. Assigns Responsible Owner
- [ ] 5. Owner accepts
- [ ] 6. Participants sync
- [ ] 7. Updates happen
- [ ] 8. Someone gets blocked
- [ ] 9. Help requested
- [ ] 10. Graph updates live
- [ ] 11. Milestones completed
- [ ] 12. Time logged
- [ ] 13. Task completed

*If this flow works flawlessly, your MVP is successful.*
