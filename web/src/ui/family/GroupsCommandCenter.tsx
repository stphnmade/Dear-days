"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import EventCreateModal from "@/ui/EventCreateModal";
import InviteFamilyModal from "@/ui/InviteFamilyModal";

type Role = "admin" | "planner" | "viewer";
type SyncState = "synced" | "stale" | "pending";
type RSVPStatus = "confirmed" | "tentative" | "declined" | "no_response";

type GroupItem = {
  id: string;
  name: string;
  role: "owner" | "member";
};

type InviteGroup = {
  id: string;
  name: string;
};

type EventGroup = {
  id: string;
  name: string;
  canPost: boolean;
};

type HeatmapDay = {
  dayKey: string;
  label: string;
  shortDate: string;
  score: number;
  freeCount: number;
};

type BestSlot = {
  dayKey: string;
  label: string;
  slotName: "Morning" | "Afternoon" | "Evening";
  score: number;
};

type ProposedSlot = {
  id: string;
  dayKey: string;
  label: string;
  slotName: "Morning" | "Afternoon" | "Evening";
  score: number;
};

type Member = {
  id: string;
  userId: string | null;
  name: string;
  email: string | null;
  role: Role;
  syncState: SyncState;
  lastSyncAt: string | null;
  availability: number[];
};

type NudgeQueueItem = {
  id: string;
  name: string;
  reason: string;
  kind: "invite" | "sync";
};

type EventMatrixItem = {
  memberId: string;
  name: string;
  status: RSVPStatus;
  reason: string | null;
};

type UpcomingEvent = {
  id: string;
  title: string;
  type: string;
  dateIso: string;
  person: string | null;
  matrix: EventMatrixItem[];
  confirmedCount: number;
  attendanceSummaryNames: string[];
};

type Props = {
  familyId: string;
  familyName: string;
  isOwner: boolean;
  groups: GroupItem[];
  inviteGroups: InviteGroup[];
  eventGroups: EventGroup[];
  heatmap: HeatmapDay[];
  bestSlot: BestSlot;
  proposedSlots: ProposedSlot[];
  members: Member[];
  syncedCount: number;
  nudgeQueue: NudgeQueueItem[];
  upcomingEvents: UpcomingEvent[];
};

const CARD = "rounded-2xl border dd-card";
const PANEL = "rounded-xl border dd-card-muted";
const GLASS_BUTTON =
  "rounded-xl border border-[var(--dd-border)] px-3 py-2 text-sm dd-card backdrop-blur-sm transition hover:opacity-90";

const STATUS_META: Record<
  RSVPStatus,
  {
    label: string;
    icon: string;
    toneClass: string;
    rowClass: string;
  }
> = {
  confirmed: {
    label: "Confirmed",
    icon: "✅",
    toneClass: "dd-text-success",
    rowClass: "border-[var(--dd-accent-green)] dd-card",
  },
  tentative: {
    label: "Tentative",
    icon: "⏳",
    toneClass: "text-[var(--dd-sand)]",
    rowClass: "border-[var(--dd-sand)] dd-card-muted",
  },
  declined: {
    label: "Declined",
    icon: "❌",
    toneClass: "dd-text-danger",
    rowClass: "border-[var(--dd-accent-red)] dd-card-muted",
  },
  no_response: {
    label: "No Response",
    icon: "❓",
    toneClass: "dd-text-muted",
    rowClass: "border-[var(--dd-border)] dd-card-muted",
  },
};

function initials(name: string) {
  const parts = name
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2);
  if (!parts.length) return "?";
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}

function scoreToOpacity(score: number) {
  const normalized = Math.max(0, Math.min(100, score));
  return 0.08 + normalized / 180;
}

function overlapSeverityClass(score: number) {
  if (score >= 80) return "border-[var(--dd-accent-green)] dd-card";
  if (score >= 60) return "border-[var(--dd-sand)] dd-card-muted";
  return "border-[var(--dd-accent-red)] dd-card-muted";
}

export default function GroupsCommandCenter({
  familyId,
  familyName,
  isOwner,
  groups,
  inviteGroups,
  eventGroups,
  heatmap,
  bestSlot,
  proposedSlots,
  members,
  syncedCount,
  nudgeQueue,
  upcomingEvents,
}: Props) {
  const [hoveredMemberId, setHoveredMemberId] = useState<string | null>(null);
  const [maskPrivateByMember, setMaskPrivateByMember] = useState<Record<string, boolean>>(
    Object.fromEntries(members.map((member) => [member.id, true]))
  );
  const [nudged, setNudged] = useState<Record<string, boolean>>({});
  const [googleMeetEnabled, setGoogleMeetEnabled] = useState(true);
  const [zoomEnabled, setZoomEnabled] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const hoveredMember = useMemo(
    () => members.find((member) => member.id === hoveredMemberId) ?? null,
    [hoveredMemberId, members]
  );

  const totalMembers = members.length;
  const notSynced = Math.max(0, totalMembers - syncedCount);
  const lowAttendanceEvent =
    upcomingEvents.find((event) => event.confirmedCount < Math.ceil(totalMembers * 0.6)) ?? null;

  function nudgeItem(id: string) {
    setNudged((prev) => ({ ...prev, [id]: true }));
  }

  function nudgeAll() {
    const next = { ...nudged };
    for (const item of nudgeQueue) next[item.id] = true;
    setNudged(next);
  }

  return (
    <>
      <section className={`${CARD} p-5`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] dd-text-muted">Group Pulse</p>
            <h2 className="mt-2 text-2xl font-semibold">{familyName}</h2>
            <p className="mt-1 text-sm dd-text-muted">
              {syncedCount}/{totalMembers} members have updated sync. {notSynced} need refresh.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <EventCreateModal
              buttonLabel="Add date"
              buttonClassName="rounded-xl px-4 py-2 text-sm dd-btn-primary hover:opacity-90"
              groups={eventGroups}
              defaultFamilyId={familyId}
              defaultScope="family"
            />
            <InviteFamilyModal
              buttonLabel="Add to Group"
              buttonClassName={GLASS_BUTTON}
              groups={inviteGroups}
              defaultFamilyId={familyId}
            />
          </div>
        </div>
      </section>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1.86fr_1fr]">
        <div className="space-y-6">
          <section className={`${CARD} p-5`}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Availability Heatmap</h3>
              <div className="text-xs text-[var(--dd-sand)]">
                Best Fit: {bestSlot.label} · {bestSlot.slotName}
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {heatmap.map((day, index) => {
                const isBest = day.dayKey === bestSlot.dayKey;
                const memberGlow = hoveredMember?.availability[index] ?? 0;
                return (
                  <div
                    key={day.dayKey}
                    className={`relative min-w-0 overflow-hidden rounded-xl border p-2 sm:p-3 ${
                      isBest
                        ? "border-[var(--dd-sand)] dd-card"
                        : "border-[var(--dd-border)] dd-card-muted"
                    }`}
                    style={
                      isBest
                        ? { boxShadow: "0 0 0 2px var(--dd-sand)" }
                        : undefined
                    }
                  >
                    <div
                      className="absolute inset-0"
                      style={{
                        backgroundColor: "var(--dd-accent-blue)",
                        opacity: scoreToOpacity(day.score),
                      }}
                    />
                    <div className="relative">
                      <div className="truncate text-[10px] font-medium sm:text-xs">{day.label}</div>
                      <div className="truncate text-[10px] dd-text-muted">{day.shortDate}</div>
                      <div className="mt-1 text-base font-semibold sm:mt-2 sm:text-xl">{day.freeCount}</div>
                      <div className="hidden text-[11px] dd-text-muted sm:block">members free</div>
                      {isBest ? (
                        <div className="mt-1 inline-flex max-w-full truncate rounded-full border border-[var(--dd-sand)] px-1.5 py-0.5 text-[10px] text-[var(--dd-sand)] sm:mt-2 sm:px-2">
                          {bestSlot.slotName}
                        </div>
                      ) : null}
                      {hoveredMember ? (
                        <div className="absolute inset-x-0 bottom-0 h-1.5 rounded-full dd-card-muted">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.max(8, memberGlow)}%`,
                              backgroundColor: "var(--dd-accent-blue)",
                            }}
                          />
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 text-xs dd-text-muted">
              Hover a member in the sidebar to light up their individual availability overlay.
            </p>
          </section>

          <section className={`${CARD} p-5`}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold">Upcoming Group Events</h3>
              <span className="text-xs dd-text-muted">RSVP Matrix + conflict detection</span>
            </div>

            <div className="space-y-4">
              {upcomingEvents.length ? (
                upcomingEvents.map((event) => (
                  <article key={event.id} className={`${PANEL} p-4`}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-base font-semibold">{event.title}</div>
                        <div className="text-xs dd-text-muted">
                          {new Date(event.dateIso).toLocaleDateString(undefined, {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}
                          {event.person ? ` · ${event.person}` : ""}
                        </div>
                      </div>
                      <div>
                        <div className="mb-1 text-right text-[11px] dd-text-muted">Attendance Summary</div>
                        <div className="flex justify-end -space-x-2">
                          {event.attendanceSummaryNames.length ? (
                            event.attendanceSummaryNames.map((name) => (
                              <span
                                key={`${event.id}-${name}`}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--dd-accent-blue)] dd-btn-primary text-[10px] font-semibold"
                                title={name}
                              >
                                {initials(name)}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs dd-text-muted">No confirmations yet</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 max-h-56 space-y-1 overflow-y-auto pr-1">
                      {event.matrix.map((row) => {
                        const meta = STATUS_META[row.status];
                        return (
                          <div
                            key={`${event.id}-${row.memberId}`}
                            className={`flex items-center justify-between rounded-lg border px-3 py-2 ${meta.rowClass}`}
                          >
                            <div className="truncate text-sm">{row.name}</div>
                            <div className="ml-3 flex items-center gap-2 text-xs">
                              <span className={meta.toneClass}>
                                {meta.icon} {meta.label}
                              </span>
                              {row.reason ? (
                                <span className="dd-text-muted" title={row.reason}>
                                  ⚠
                                </span>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </article>
                ))
              ) : (
                <div className="rounded-xl border border-dashed p-5 text-sm dd-card-muted dd-text-muted">
                  No upcoming events yet.
                </div>
              )}
            </div>
          </section>

          <section className={`${CARD} p-5`}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Auto-Meeting Hub</h3>
              <span className="text-xs dd-text-muted">Google Meet / Zoom</span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className={`${PANEL} flex items-center justify-between px-3 py-2 text-sm`}>
                Google Meet auto-create
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={googleMeetEnabled}
                  onChange={(e) => setGoogleMeetEnabled(e.target.checked)}
                />
              </label>
              <label className={`${PANEL} flex items-center justify-between px-3 py-2 text-sm`}>
                Zoom auto-create
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={zoomEnabled}
                  onChange={(e) => setZoomEnabled(e.target.checked)}
                />
              </label>
            </div>

            <div className={`${PANEL} mt-4 p-4`}>
              <div className="text-sm">
                {lowAttendanceEvent
                  ? `Low attendance detected for ${lowAttendanceEvent.title}.`
                  : "No low-attendance event detected. You can still propose better slots."}
              </div>
              <button
                type="button"
                className="mt-3 rounded-xl px-3 py-2 text-sm dd-btn-primary hover:opacity-90"
                onClick={() => setShowSuggestions((prev) => !prev)}
              >
                Propose New Time
              </button>
              {showSuggestions ? (
                <div className="mt-3 space-y-2">
                  {proposedSlots.map((slot) => (
                    <div
                      key={slot.id}
                      className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${overlapSeverityClass(
                        slot.score
                      )}`}
                    >
                      <span>
                        {slot.label} · {slot.slotName}
                      </span>
                      <span className="dd-text-muted">{slot.score}% overlap</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className={`${CARD} p-5`}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Member Directory</h3>
              <span className="text-xs dd-text-muted">RBAC</span>
            </div>
            <div className="max-h-[560px] space-y-2 overflow-y-auto pr-1">
              {members.map((member) => {
                const roleTone =
                  member.role === "admin"
                    ? "border-[var(--dd-accent-red)] dd-card-muted"
                    : member.role === "planner"
                    ? "border-[var(--dd-accent-blue)] dd-card-muted"
                    : "border-[var(--dd-border)] dd-card-muted";

                const syncTone =
                  member.syncState === "synced"
                    ? "dd-text-success"
                    : member.syncState === "stale"
                    ? "text-[var(--dd-sand)]"
                    : "dd-text-muted";

                return (
                  <div
                    key={member.id}
                    className={`${PANEL} px-3 py-3 transition hover:border-[var(--dd-accent-blue)]`}
                    onMouseEnter={() => setHoveredMemberId(member.id)}
                    onMouseLeave={() =>
                      setHoveredMemberId((current) => (current === member.id ? null : current))
                    }
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{member.name}</div>
                        <div className="truncate text-xs dd-text-muted">{member.email ?? "No email"}</div>
                      </div>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${roleTone}`}
                      >
                        {member.role}
                      </span>
                    </div>

                    <div className="mt-2 flex items-center justify-between text-xs">
                      <span className={syncTone}>
                        {member.syncState === "synced"
                          ? "Synced"
                          : member.syncState === "stale"
                          ? "Sync expired"
                          : "Pending"}
                      </span>
                      <label className="inline-flex items-center gap-1 dd-text-muted">
                        <input
                          type="checkbox"
                          className="h-3.5 w-3.5"
                          checked={maskPrivateByMember[member.id] ?? true}
                          onChange={(e) =>
                            setMaskPrivateByMember((prev) => ({ ...prev, [member.id]: e.target.checked }))
                          }
                        />
                        Mask private events
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className={`${CARD} p-5`}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Nudge Queue</h3>
              <button type="button" className={GLASS_BUTTON} onClick={nudgeAll}>
                Nudge All
              </button>
            </div>
            <div className="space-y-2">
              {nudgeQueue.length ? (
                nudgeQueue.map((item) => (
                  <div key={item.id} className={`${PANEL} flex items-center justify-between px-3 py-2`}>
                    <div>
                      <div className="text-sm">{item.name}</div>
                      <div className="text-xs dd-text-muted">{item.reason}</div>
                    </div>
                    <button
                      type="button"
                      className="rounded-lg px-2 py-1 text-xs dd-btn-neutral hover:opacity-90"
                      onClick={() => nudgeItem(item.id)}
                    >
                      {nudged[item.id] ? "Sent" : "Nudge"}
                    </button>
                  </div>
                ))
              ) : (
                <div className="rounded-lg border border-dashed px-3 py-4 text-sm dd-card-muted dd-text-muted">
                  Everyone is in sync and no invites are pending.
                </div>
              )}
            </div>
          </section>

          <section className={`${CARD} p-5`}>
            <h3 className="text-lg font-semibold">Invite Module</h3>
            <p className="mt-1 text-xs dd-text-muted">Add via email or share a join link.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <a
                href={`mailto:?subject=${encodeURIComponent(`Join ${familyName} on Dear Days`)}&body=${encodeURIComponent(
                  "Join our group on Dear Days. Open the app and use our invite link from the organizer."
                )}`}
                className={GLASS_BUTTON}
              >
                Add via Email
              </a>
              <InviteFamilyModal
                buttonLabel="Share Join Link"
                buttonClassName={GLASS_BUTTON}
                groups={inviteGroups}
                defaultFamilyId={familyId}
              />
            </div>
          </section>

          <section className={`${CARD} p-5`}>
            <h3 className="text-lg font-semibold">Your Groups</h3>
            <div className="mt-3 space-y-2">
              {groups.map((group) => (
                <Link
                  key={group.id}
                  href={`/family?familyId=${encodeURIComponent(group.id)}`}
                  className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition ${
                    group.id === familyId
                      ? "border-[var(--dd-accent-blue)] dd-card"
                      : "border-[var(--dd-border)] dd-card-muted hover:border-[var(--dd-accent-blue)]"
                  }`}
                >
                  <span className="truncate">{group.name}</span>
                  <span className="text-xs uppercase tracking-wide dd-text-muted">
                    {group.role === "owner" ? "Owner" : "Member"}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        </aside>
      </div>

      {isOwner ? (
        <div className="fixed inset-x-4 bottom-4 z-[1100] sm:hidden">
          <InviteFamilyModal
            buttonLabel="Add to Group"
            buttonClassName="w-full rounded-xl border border-[var(--dd-border)] px-4 py-3 text-sm font-medium dd-card backdrop-blur-sm"
            groups={inviteGroups}
            defaultFamilyId={familyId}
          />
        </div>
      ) : null}
    </>
  );
}
