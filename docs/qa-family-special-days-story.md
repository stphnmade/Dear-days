# QA Story: Family Special Days

## User Story

As a family organizer, I want to create a family group, add multiple birthdays and special days for relatives, invite family members, and keep those dates visible on my dashboard and calendars so nobody has to remember them manually.

## Primary Persona

Stephen manages a family group with parents, siblings, children, and close relatives. He needs one place to track birthdays, anniversaries, memorials, and custom family milestones, including dates that originally happened years ago.

## Acceptance Criteria

1. A signed-in user can create or access a family group.
2. The user can add multiple group dates with type, date, optional time, person, and notes.
3. Birthdays, anniversaries, weddings, and memorials entered with historical dates still appear as upcoming yearly occurrences.
4. Group members can be invited and accepted into the group.
5. Group members can view shared family dates on dashboard and calendar views.
6. Owners can manage members and group settings.
7. Calendar connections can import special days from Google/iCal and export group dates through the iCal feed.
8. Past original dates remain stored for history; the dashboard projects the next occurrence instead of deleting or hiding the record.

## Architecture Fit

The current architecture supports the story:

- `User`, `Family`, `FamilyMember`, `Invitation`, and `SpecialDay` model the core family/group relationship.
- Manual creation flows write `SpecialDay` records for personal or family scope.
- Dashboard and group pages read accessible family IDs, so owners and joined members can see shared dates.
- Google import maps calendar events into `SpecialDay` records.
- iCal export emits yearly recurrence for birthday-like special types.

## Tester Findings

### Fixed Locally

1. Historical recurring dates were not projected into future occurrences on dashboard/query surfaces.
   - Example: a birthday stored as `1990-02-14` could fail to appear as the next February 14.
   - Fix: added shared occurrence projection for recurring special-day types.

2. Event edit page rendered event details before checking access.
   - Fix: added server-side authorization before rendering the edit form.

3. Member edit permissions did not match group settings.
   - Fix: members can edit group dates when `allowMemberPosting` is enabled; delete remains restricted.

4. Stale manual sync route still used old one-family assumptions and `familyId: ""`.
   - File: `web/src/app/api/sync/run/route.ts`
   - Fix: delegated to worker agent and updated to use the current Google import path.

### Follow-Up PRs Needed

1. Invite recipient binding: collect invitee email and require the accepting account to match.
2. Group calendar scope: show all groups or add a clear group switcher instead of silently using the first group.
3. Google webhook family context: persist watched family/calendar context instead of importing into the primary group.
4. Sync state model: move Google sync token state to a per-provider/per-calendar/per-group record.
5. Outlook integration: either implement Microsoft routes or hide the active-product promise.
6. RSVP/nudge persistence: replace local/heuristic state with persisted actions when this becomes a release promise.

## Regression Checklist

1. Add three birthdays with dates from prior years.
2. Confirm dashboard ticker and upcoming milestones show the next yearly occurrences.
3. Confirm the event edit view still shows the original stored date.
4. Invite a second user and confirm the shared dates appear for that user.
5. Generate the iCal feed and confirm recurring events include `RRULE:FREQ=YEARLY`.
6. Import Google birthday-like events and confirm dedupe/update works by external ID.
