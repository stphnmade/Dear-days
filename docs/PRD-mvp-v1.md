# Product Requirements Document (PRD)

Project: Dear Days  
Version: MVP v1.1 (Updated)  
Owner: Stephen Syl-Akinwale  
Goal: One-shot autonomous build + test by an agent

## 1) Product Vision

Dear Days is a lightweight, emotionally grounded web app that helps families and close groups remember and celebrate important life dates by syncing calendars, surfacing upcoming moments, and reducing the cognitive load of remembering birthdays, anniversaries, and milestones.

The MVP focuses on trust, clarity, and calm over feature density.

## 2) Target User

Primary user:

- Adults managing family or close-group relationships
- Wants reminders without noise
- Already uses Google Calendar but finds it fragmented

Core user jobs:

- "I want one place to see important days that matter to my people."
- "I don't want to manage multiple calendars manually."
- "I want this to feel warm, not like enterprise software."

## 3) Non-Goals (Explicitly Out of Scope for MVP)

- No payments
- No public sharing
- No social feed
- No notifications beyond calendar sync
- No mobile app (web responsive only)
- No AI recommendations
- No email campaigns

## 4) Core MVP Feature Set

### 4.1 Authentication

Requirements:

- Google OAuth sign-in
- Single identity per email
- Persistent session
- Logout functionality

Acceptance criteria:

- User can sign in via Google
- Refresh does not log user out
- Logout clears session and returns to landing page

### 4.2 Calendar Sync (Google Calendar)

Requirements:

- OAuth permission for calendar read/write
- Pull events from selected calendars
- Write Dear Days events back to a dedicated calendar

Rules:

- Do not modify user's existing events
- Create a calendar named `Dear Days`
- Only write events created inside the app

Acceptance criteria:

- Google Calendar connection succeeds
- Events appear in Google Calendar
- Removing a Dear Days event removes it from Google Calendar

### 4.3 Event Model

Event types:

- Birthday
- Anniversary
- Memorial
- Custom (free-text label)

Event fields:

- Title
- Person (optional)
- Date (supports recurring yearly)
- Visibility (private to user or shared group)
- Notes (optional)

Acceptance criteria:

- Events save correctly
- Recurring events recur annually
- Editing updates Google Calendar entry

### 4.4 Groups (MVP-Light)

Requirements:

- User can create a group/collection (for example `Family`, `Friends`, `Organization`, `Team`)
- Group members are invited via email
- Members see shared events only
- A user can belong to multiple groups at the same time
- User can switch active group context from Family/Connections flows
- Non-owner members can leave a group

Constraints:

- No roles beyond owner/member
- Owner controls group-level posting permission for members
- No public discovery

Acceptance criteria:

- Invited user can join group
- Accepted invite immediately shows group membership in user's own Family screen
- Shared events appear for all members in that group context
- Leaving a group removes shared events

### 4.5 Dashboard (Home)

Core sections:

- Upcoming dates (next 30 days)
- Highlighted "Next Important Day"
- Groups overview
- Calendar preview (read-only)

Design requirements:

- Calm, warm UI
- Soft colors
- Bento-style layout
- No dense tables

Acceptance criteria:

- Loads in under 2s on broadband
- Correct upcoming events
- No layout shift on load

### 4.6 Event Creation Flow

Requirements:

- Single modal or page
- Minimal fields
- Inline validation
- User chooses event scope: personal (`Dear Days self`) or selected group

Acceptance criteria:

- Create event in under 3 steps
- Error states visible and understandable
- Success feedback provided
- Personal events and group events save to the correct scope

### 4.7 iCal + Subscription Behavior

Requirements:

- Each group generates its own private iCal feed
- iCal file name and calendar label reflect the selected group
- Owner can customize event summary template for exported group events

Acceptance criteria:

- Different groups produce different iCal URLs and feed labels
- Event summary template supports placeholders:
  - `{{title}}`
  - `{{person}}`
  - `{{group}}`
- Apple/Google subscribe links target the active selected group

### 4.8 Navigation & UX Safety

Requirements:

- No dead-end pages in core flows (`family`, `connections`, `events`)
- Every major page must include a visible return path:
  - Back to Dashboard, and/or
  - Back to active Group, and/or
  - Previous context route

Acceptance criteria:

- User can always navigate out of `Connections`
- User can always navigate out of `Family`
- Primary actions avoid unnecessary page hops when modal UX is available

### 4.9 Advanced Group Settings

Requirements:

- Owner can remove members from group
- Owner can set whether members are allowed to post/edit group dates
- Owner can set group iCal calendar label
- Owner can set group event naming template

Acceptance criteria:

- Removing a member removes group visibility for that user
- When member posting is disabled, member attempts to add group events are blocked with clear error
- iCal output reflects customized label/template

## 5) MVP Deliverables

### 5.1 Functional Deliverables

| Area | Status |
|---|---|
| Google OAuth | Required |
| Calendar Sync | Required |
| Event CRUD | Required |
| Group Sharing | Required |
| Dashboard | Required |
| Responsive UI | Required |
| Error handling | Required |

### 5.2 Technical Deliverables

- Next.js app
- Backend API (Node or equivalent)
- Prisma or ORM
- PostgreSQL or equivalent
- Secure env variable handling
- Deployed production build
- HTTPS enabled

## 6) MVP vs MVO (Critical)

MVP (must ship):

- Login works
- Calendar sync works
- Events persist
- Dashboard renders
- No crashes on core flows

MVO (minimum viable outcome):

A new user can sign in, connect Google Calendar, create a birthday for a family member, see it on their dashboard, and see it reflected in Google Calendar within 5 minutes.

If this flow works end-to-end, the MVP is successful.

## 7) Testing Strategy (Agent-Driven)

### 7.1 Chrome DevTools MCP (Primary)

Why:

- DOM inspection
- Network request verification
- Console error detection
- Performance profiling

Agent responsibilities:

- Open app in Chrome
- Monitor: console errors, network failures, OAuth redirects
- Validate: event creation -> API call -> calendar write
- Validate: UI state updates

Test checklist:

- No red console errors
- OAuth redirect completes
- API returns 200s
- Calendar events appear

### 7.2 Recommended MCP Configurations

1. Chrome DevTools MCP (required)
2. File System MCP (highly recommended)
3. Git MCP (recommended)
4. Postgres MCP (optional but powerful)
5. Network Mock MCP (optional)

## 8) Agent One-Shot Build Instructions

The agent must:

- Implement all MVP features
- Run production build
- Deploy
- Test end-to-end using Chrome DevTools MCP
- Verify MVO flow
- Report pass/fail per acceptance criteria, known issues, and performance metrics

## 9) Explicit Acceptance Gate (Final)

Accept delivery only if:

- No console errors on core flows
- Google Calendar sync confirmed
- Events persist across refresh
- Group sharing works
- Multi-group membership visibility works
- No dead-page navigation traps
- UI loads cleanly on desktop + mobile
- MVO flow succeeds

## 10) Final Notes for Agent Success

- Optimize for clarity over cleverness
- Fail loudly and visibly
- Prefer fewer features that work perfectly
- Treat Google Calendar as source of truth for reminders
