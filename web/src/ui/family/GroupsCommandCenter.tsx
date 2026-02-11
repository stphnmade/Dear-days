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

const CARD =
  "rounded-2xl border border-[#2C2C2E] bg-[#1C1C1E] text-[#F2F2F5] shadow-[0_12px_30px_rgba(0,0,0,0.2)]";
const GLASS_BUTTON =
  "rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white backdrop-blur-sm transition hover:bg-white/20";

const STATUS_META: Record<RSVPStatus, { label: string; icon: string; tone: string }> = {
  confirmed: { label: "Confirmed", icon: "✅", tone: "text-[#22C55E]" },
  tentative: { label: "Tentative", icon: "⏳", tone: "text-[#F59E0B]" },
  declined: { label: "Declined", icon: "❌", tone: "text-[#EF4444]" },
  no_response: { label: "No Response", icon: "❓", tone: "text-[#9CA3AF]" },
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
            <p className="text-xs uppercase tracking-[0.18em] text-[#A1A1AA]">Group Pulse</p>
            <h2 className="mt-2 text-2xl font-semibold">{familyName}</h2>
            <p className="mt-1 text-sm text-[#9CA3AF]">
              {syncedCount}/{totalMembers} members have updated sync. {notSynced} need refresh.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <EventCreateModal
              buttonLabel="Add date"
              buttonClassName="rounded-xl border border-[#3B82F6] bg-[#3B82F6]/90 px-4 py-2 text-sm text-white transition hover:bg-[#3B82F6]"
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

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1.86fr_1fr]">
        <div className="space-y-6">
          <section className={`${CARD} p-5`}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Availability Heatmap</h3>
              <div className="text-xs text-[#F6C453]">
                Best Fit: {bestSlot.label} · {bestSlot.slotName}
              </div>
            </div>

            <div className="grid grid-cols-7 gap-2">
              {heatmap.map((day, index) => {
                const isBest = day.dayKey === bestSlot.dayKey;
                const memberGlow = hoveredMember?.availability[index] ?? 0;
                const intensity = Math.max(0.2, day.score / 100);
                return (
                  <div
                    key={day.dayKey}
                    className={`relative rounded-xl border p-3 transition ${
                      isBest ? "border-[#F6C453] ring-2 ring-[#F6C453]/75" : "border-[#2C2C2E]"
                    }`}
                    style={{
                      background: `linear-gradient(180deg, rgba(59,130,246,${0.15 + intensity * 0.75}) 0%, rgba(16,24,40,0.88) 100%)`,
                    }}
                  >
                    <div className="text-xs font-medium text-[#E4E4E7]">{day.label}</div>
                    <div className="text-[11px] text-[#A1A1AA]">{day.shortDate}</div>
                    <div className="mt-2 text-xl font-semibold">{day.freeCount}</div>
                    <div className="text-[11px] text-[#A1A1AA]">members free</div>
                    {isBest ? (
                      <div className="mt-2 inline-flex rounded-full border border-[#F6C453]/60 bg-[#F6C453]/10 px-2 py-0.5 text-[10px] text-[#F6C453]">
                        {bestSlot.slotName}
                      </div>
                    ) : null}
                    {hoveredMember ? (
                      <div className="absolute inset-x-2 bottom-2 h-1.5 rounded-full bg-[#0F172A]">
                        <div
                          className="h-full rounded-full bg-[#38BDF8]"
                          style={{ width: `${Math.max(8, memberGlow)}%` }}
                        />
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
            <p className="mt-3 text-xs text-[#9CA3AF]">
              Hover a member in the sidebar to light up their individual availability overlay.
            </p>
          </section>

          <section className={`${CARD} p-5`}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold">Upcoming Group Events</h3>
              <span className="text-xs text-[#A1A1AA]">RSVP Matrix + conflict detection</span>
            </div>

            <div className="space-y-4">
              {upcomingEvents.length ? (
                upcomingEvents.map((event) => (
                  <article key={event.id} className="rounded-xl border border-[#2C2C2E] bg-[#111827]/55 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-base font-semibold">{event.title}</div>
                        <div className="text-xs text-[#9CA3AF]">
                          {new Date(event.dateIso).toLocaleDateString(undefined, {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}
                          {event.person ? ` · ${event.person}` : ""}
                        </div>
                      </div>
                      <div>
                        <div className="mb-1 text-right text-[11px] text-[#A1A1AA]">Attendance Summary</div>
                        <div className="flex justify-end -space-x-2">
                          {event.attendanceSummaryNames.length ? (
                            event.attendanceSummaryNames.map((name) => (
                              <span
                                key={`${event.id}-${name}`}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#1F2937] bg-[#3B82F6]/80 text-[10px] font-semibold text-white"
                                title={name}
                              >
                                {initials(name)}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-[#A1A1AA]">No confirmations yet</span>
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
                            className="flex items-center justify-between rounded-lg border border-[#27272A] bg-[#18181B] px-3 py-2"
                          >
                            <div className="truncate text-sm">{row.name}</div>
                            <div className="ml-3 flex items-center gap-2 text-xs">
                              <span className={meta.tone}>
                                {meta.icon} {meta.label}
                              </span>
                              {row.reason ? (
                                <span className="text-[#A1A1AA]" title={row.reason}>
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
                <div className="rounded-xl border border-dashed border-[#3F3F46] p-5 text-sm text-[#A1A1AA]">
                  No upcoming events yet.
                </div>
              )}
            </div>
          </section>

          <section className={`${CARD} p-5`}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Auto-Meeting Hub</h3>
              <span className="text-xs text-[#A1A1AA]">Google Meet / Zoom</span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex items-center justify-between rounded-xl border border-[#2C2C2E] bg-[#111827]/45 px-3 py-2 text-sm">
                Google Meet auto-create
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={googleMeetEnabled}
                  onChange={(e) => setGoogleMeetEnabled(e.target.checked)}
                />
              </label>
              <label className="flex items-center justify-between rounded-xl border border-[#2C2C2E] bg-[#111827]/45 px-3 py-2 text-sm">
                Zoom auto-create
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={zoomEnabled}
                  onChange={(e) => setZoomEnabled(e.target.checked)}
                />
              </label>
            </div>

            <div className="mt-4 rounded-xl border border-[#2C2C2E] bg-[#111827]/45 p-4">
              <div className="text-sm">
                {lowAttendanceEvent
                  ? `Low attendance detected for ${lowAttendanceEvent.title}.`
                  : "No low-attendance event detected. You can still propose better slots."}
              </div>
              <button
                type="button"
                className="mt-3 rounded-xl border border-[#3B82F6]/70 bg-[#3B82F6]/15 px-3 py-2 text-sm text-[#BFDBFE] transition hover:bg-[#3B82F6]/25"
                onClick={() => setShowSuggestions((prev) => !prev)}
              >
                Propose New Time
              </button>
              {showSuggestions ? (
                <div className="mt-3 space-y-2">
                  {proposedSlots.map((slot) => (
                    <div
                      key={slot.id}
                      className="flex items-center justify-between rounded-lg border border-[#2C2C2E] bg-[#0B1120] px-3 py-2 text-sm"
                    >
                      <span>
                        {slot.label} · {slot.slotName}
                      </span>
                      <span className="text-[#93C5FD]">{slot.score}% overlap</span>
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
              <span className="text-xs text-[#A1A1AA]">RBAC</span>
            </div>
            <div className="max-h-[560px] space-y-2 overflow-y-auto pr-1">
              {members.map((member) => {
                const roleTone =
                  member.role === "admin"
                    ? "bg-[#7F1D1D]/80 text-[#FCA5A5]"
                    : member.role === "planner"
                    ? "bg-[#1E3A8A]/70 text-[#BFDBFE]"
                    : "bg-[#27272A] text-[#D4D4D8]";
                const syncTone =
                  member.syncState === "synced"
                    ? "text-[#22C55E]"
                    : member.syncState === "stale"
                    ? "text-[#F59E0B]"
                    : "text-[#A1A1AA]";

                return (
                  <div
                    key={member.id}
                    className="rounded-xl border border-[#2C2C2E] bg-[#111827]/45 px-3 py-3 transition hover:border-[#3B82F6]/60"
                    onMouseEnter={() => setHoveredMemberId(member.id)}
                    onMouseLeave={() => setHoveredMemberId((current) => (current === member.id ? null : current))}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{member.name}</div>
                        <div className="truncate text-xs text-[#A1A1AA]">{member.email ?? "No email"}</div>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide ${roleTone}`}>
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
                      <label className="inline-flex items-center gap-1 text-[#A1A1AA]">
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
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-lg border border-[#2C2C2E] bg-[#111827]/45 px-3 py-2"
                  >
                    <div>
                      <div className="text-sm">{item.name}</div>
                      <div className="text-xs text-[#A1A1AA]">{item.reason}</div>
                    </div>
                    <button
                      type="button"
                      className="rounded-lg border border-[#2C2C2E] bg-[#1F2937] px-2 py-1 text-xs text-[#E5E7EB] hover:bg-[#2B3A4F]"
                      onClick={() => nudgeItem(item.id)}
                    >
                      {nudged[item.id] ? "Sent" : "Nudge"}
                    </button>
                  </div>
                ))
              ) : (
                <div className="rounded-lg border border-dashed border-[#3F3F46] px-3 py-4 text-sm text-[#A1A1AA]">
                  Everyone is in sync and no invites are pending.
                </div>
              )}
            </div>
          </section>

          <section className={`${CARD} p-5`}>
            <h3 className="text-lg font-semibold">Invite Module</h3>
            <p className="mt-1 text-xs text-[#A1A1AA]">Add via email or share a join link.</p>
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
                      ? "border-[#3B82F6]/70 bg-[#1E3A8A]/35"
                      : "border-[#2C2C2E] bg-[#111827]/45 hover:border-[#3B82F6]/45"
                  }`}
                >
                  <span className="truncate">{group.name}</span>
                  <span className="text-xs uppercase tracking-wide text-[#A1A1AA]">
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
            buttonClassName="w-full rounded-xl border border-white/25 bg-white/15 px-4 py-3 text-sm font-medium text-white backdrop-blur-md"
            groups={inviteGroups}
            defaultFamilyId={familyId}
          />
        </div>
      ) : null}
    </>
  );
}
