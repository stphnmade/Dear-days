"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

import EventCreateModal from "@/ui/EventCreateModal";
import InviteFamilyModal from "@/ui/InviteFamilyModal";

type DashboardEvent = {
  id: string;
  title: string | null;
  type: string | null;
  date: string;
  person: string | null;
  familyId: string | null;
  source: "MANUAL" | "GOOGLE";
};

type DashboardGroup = {
  id: string;
  name: string;
  role: "owner" | "member";
  canPost: boolean;
  memberCount: number;
  syncedCount: number;
};

type Props = {
  userName: string;
  userAvatar?: string;
  events: DashboardEvent[];
  groups: DashboardGroup[];
  counts: {
    events: number;
    families: number;
    accounts: number;
  };
};

type LayerKey = "personal" | "squad" | "family";
type CalendarView = "month" | "week" | "list";

type ParsedEvent = DashboardEvent & {
  dateObj: Date;
  key: string;
  label: string;
  groupName: string;
  layer: LayerKey;
  syncPulse: number;
};

const fmtLong = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const fmtShort = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
});

const LAYER_STYLES: Record<
  LayerKey,
  { name: string; color: string; pillBg: string; pillBorder: string }
> = {
  personal: {
    name: "Personal",
    color: "#EF4444",
    pillBg: "rgba(239,68,68,0.12)",
    pillBorder: "rgba(239,68,68,0.44)",
  },
  squad: {
    name: "Squad",
    color: "#3B82F6",
    pillBg: "rgba(59,130,246,0.12)",
    pillBorder: "rgba(59,130,246,0.44)",
  },
  family: {
    name: "My Family",
    color: "#22C55E",
    pillBg: "rgba(34,197,94,0.12)",
    pillBorder: "rgba(34,197,94,0.44)",
  },
};

function toDateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function daysBetween(from: Date, to: Date) {
  const a = new Date(from);
  const b = new Date(to);
  a.setHours(0, 0, 0, 0);
  b.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 86400000));
}

function getMonthGrid(cursor: Date) {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const d = new Date(start);
    d.setDate(start.getDate() + index);
    return d;
  });
}

function getWeekGrid(cursor: Date) {
  const start = new Date(cursor);
  start.setDate(start.getDate() - start.getDay());
  return Array.from({ length: 7 }, (_, index) => {
    const d = new Date(start);
    d.setDate(start.getDate() + index);
    return d;
  });
}

function eventLabel(event: DashboardEvent) {
  return event.title ?? event.person ?? event.type ?? "Special Day";
}

function normalizedName(s: string) {
  return s.trim().toLowerCase();
}

function resolveLayerForGroupName(name: string): LayerKey {
  const n = normalizedName(name);
  if (n.includes("squad")) return "squad";
  if (n.includes("family")) return "family";
  return "family";
}

export default function DashboardCommandCenter({
  userName,
  userAvatar,
  events,
  groups,
  counts,
}: Props) {
  const [query, setQuery] = useState("");
  const [calendarView, setCalendarView] = useState<CalendarView>("month");
  const [layerVisible, setLayerVisible] = useState<Record<LayerKey, boolean>>({
    personal: true,
    squad: true,
    family: true,
  });
  const [calendarCursor, setCalendarCursor] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const groupById = useMemo(() => new Map(groups.map((g) => [g.id, g])), [groups]);

  const eventsWithMeta = useMemo<ParsedEvent[]>(() => {
    return [...events]
      .map((event) => {
        const dateObj = new Date(event.date);
        const group = event.familyId ? groupById.get(event.familyId) : null;
        const groupName = group?.name ?? "Personal";
        const layer = event.familyId ? resolveLayerForGroupName(groupName) : "personal";
        const total = Math.max(group?.memberCount ?? 1, 1);
        const synced = group?.syncedCount ?? (event.familyId ? 0 : 1);
        const syncPulse = Math.round((synced / total) * 100);
        return {
          ...event,
          dateObj,
          key: toDateKey(dateObj),
          label: eventLabel(event),
          groupName,
          layer,
          syncPulse,
        };
      })
      .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());
  }, [events, groupById]);

  const filteredEvents = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return eventsWithMeta.filter((event) => {
      if (!layerVisible[event.layer]) return false;
      if (!needle) return true;
      return `${event.label} ${event.groupName} ${event.type ?? ""}`.toLowerCase().includes(needle);
    });
  }, [eventsWithMeta, layerVisible, query]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, ParsedEvent[]>();
    for (const event of filteredEvents) {
      const row = map.get(event.key) ?? [];
      row.push(event);
      map.set(event.key, row);
    }
    return map;
  }, [filteredEvents]);

  const monthGrid = useMemo(() => getMonthGrid(calendarCursor), [calendarCursor]);
  const weekGrid = useMemo(() => getWeekGrid(calendarCursor), [calendarCursor]);

  const now = useMemo(() => new Date(), []);
  const todayKey = toDateKey(now);
  const upcomingEvents = useMemo(
    () => filteredEvents.filter((event) => event.dateObj >= now),
    [filteredEvents, now]
  );
  const nextEvent = upcomingEvents[0] ?? null;
  const daysUntil = nextEvent ? daysBetween(now, nextEvent.dateObj) : null;

  const overlapAlerts = useMemo(() => {
    const windowEnd = new Date(now);
    windowEnd.setDate(windowEnd.getDate() + 30);
    const byKey = new Map<string, ParsedEvent[]>();
    for (const event of filteredEvents) {
      if (event.dateObj < now || event.dateObj > windowEnd) continue;
      const row = byKey.get(event.key) ?? [];
      row.push(event);
      byKey.set(event.key, row);
    }

    const alerts: string[] = [];
    for (const [key, list] of byKey.entries()) {
      if (list.length < 2) continue;
      const [y, m, d] = key.split("-").map(Number);
      const dateObj = new Date(y, m - 1, d);
      alerts.push(`${list.length} overlaps on ${fmtShort.format(dateObj)}`);
      if (alerts.length >= 2) break;
    }
    return alerts;
  }, [filteredEvents, now]);

  const heatmap = useMemo(() => {
    return Array.from({ length: 28 }, (_, idx) => {
      const day = new Date(now);
      day.setHours(0, 0, 0, 0);
      day.setDate(day.getDate() + idx);
      const key = toDateKey(day);
      const dayEvents = eventsByDay.get(key) ?? [];
      const load = Math.min(dayEvents.length * 22, 88);
      const shade = 16 + Math.round((88 - load) * 0.45);
      return {
        key,
        label: fmtShort.format(day),
        tone: `rgb(${shade}, ${Math.min(shade + 10, 74)}, ${Math.min(shade + 4, 64)})`,
      };
    });
  }, [eventsByDay, now]);

  const timeline = upcomingEvents.slice(0, 8);

  const groupPulseRows = useMemo(() => {
    return groups.map((group) => {
      const percent = Math.round((group.syncedCount / Math.max(group.memberCount, 1)) * 100);
      const upcoming = upcomingEvents.find((event) => event.familyId === group.id);
      return {
        ...group,
        percent,
        upcomingEventId: upcoming?.id ?? null,
        upcomingLabel: upcoming ? `${upcoming.label} • ${fmtShort.format(upcoming.dateObj)}` : "No upcoming event",
      };
    });
  }, [groups, upcomingEvents]);

  const hasUnsynced = groupPulseRows.some((group) => group.syncedCount < group.memberCount);
  const monthTitle = calendarCursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const weekRangeTitle = useMemo(() => {
    const start = weekGrid[0];
    const end = weekGrid[6];
    if (!start || !end) return "";
    return `${fmtShort.format(start)} - ${fmtShort.format(end)}`;
  }, [weekGrid]);
  const listMonthKey = `${calendarCursor.getFullYear()}-${calendarCursor.getMonth()}`;
  const listEvents = useMemo(
    () =>
      filteredEvents.filter(
        (event) =>
          `${event.dateObj.getFullYear()}-${event.dateObj.getMonth()}` === listMonthKey
      ),
    [filteredEvents, listMonthKey]
  );

  function shiftCalendar(direction: "prev" | "next") {
    const delta = direction === "next" ? 1 : -1;
    setCalendarCursor((current) => {
      const next = new Date(current);
      if (calendarView === "week") {
        next.setDate(next.getDate() + 7 * delta);
      } else {
        next.setMonth(next.getMonth() + delta);
      }
      return next;
    });
  }

  return (
    <div className="relative z-10 mx-auto w-full max-w-[1440px] px-4 pb-28 pt-6 sm:px-6 lg:px-8">
      <header className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(420px,640px)]">
        <div className="rounded-2xl border border-[#2C2C2E] bg-[#1C1C1E] p-5">
          <h1 className="text-2xl font-bold text-white">Welcome back, {userName}</h1>
          <p className="mt-2 text-sm text-[#8E8E93]">
            {userName} is: {filteredEvents.some((event) => event.key === todayKey) ? "🟡 Busy" : "🟢 Available"}
          </p>
        </div>

        <div className="rounded-2xl border border-[#2C2C2E] bg-[#1C1C1E] p-4">
          <div className="flex items-center gap-3">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find events, people, or groups"
              className="h-11 flex-1 rounded-xl border border-[#2C2C2E] bg-[#121214] px-4 text-sm text-white outline-none placeholder:text-[#8E8E93] focus:border-[#3B82F6]"
            />

            <EventCreateModal
              buttonLabel="+"
              buttonClassName="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#3B82F6] bg-[#3B82F6] text-xl font-semibold text-white shadow-[0_10px_24px_rgba(59,130,246,0.4)]"
              groups={groups.map((group) => ({
                id: group.id,
                name: group.name,
                canPost: group.canPost,
              }))}
              defaultFamilyId={groups[0]?.id}
              defaultScope={groups.length ? "family" : "personal"}
            />

            {userAvatar ? (
              <Image
                src={userAvatar}
                alt={userName}
                width={40}
                height={40}
                className="h-10 w-10 rounded-full border border-[#2C2C2E]"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#2C2C2E] bg-[#121214] text-sm text-[#8E8E93]">
                {userName.slice(0, 1).toUpperCase()}
              </div>
            )}

            <Link
              href="/settings"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#2C2C2E] bg-[#121214] text-[#8E8E93] hover:text-white"
              aria-label="Open menu"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M3 12h18M3 18h18" />
              </svg>
            </Link>
          </div>
        </div>
      </header>

      <section className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(320px,3fr)]">
        <div className="space-y-6">
          <article className="rounded-2xl border border-[#2C2C2E] bg-[#1C1C1E] p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-white">Dynamic Calendar</h2>
                <p className="mt-1 text-sm text-[#8E8E93]">Toggle each group layer to compare schedules.</p>
              </div>
              <Link href="/family/calendar" className="text-sm text-[#3B82F6]">
                Open full calendar
              </Link>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex rounded-xl border border-[#2C2C2E] bg-[#151517] p-1">
                {(["month", "week", "list"] as CalendarView[]).map((view) => (
                  <button
                    key={view}
                    type="button"
                    onClick={() => setCalendarView(view)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize ${
                      calendarView === view
                        ? "bg-[#3B82F6] text-white"
                        : "text-[#8E8E93] hover:text-white"
                    }`}
                  >
                    {view}
                  </button>
                ))}
              </div>

              <div className="inline-flex items-center gap-2 rounded-xl border border-[#2C2C2E] bg-[#151517] px-2 py-1.5">
                <button
                  type="button"
                  onClick={() => shiftCalendar("prev")}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[#8E8E93] hover:bg-[#202024] hover:text-white"
                  aria-label="Previous period"
                >
                  ‹
                </button>
                <span className="min-w-28 text-center text-xs font-medium text-white">
                  {calendarView === "week" ? weekRangeTitle : monthTitle}
                </span>
                <button
                  type="button"
                  onClick={() => shiftCalendar("next")}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[#8E8E93] hover:bg-[#202024] hover:text-white"
                  aria-label="Next period"
                >
                  ›
                </button>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {(["personal", "squad", "family"] as LayerKey[]).map((layerKey) => {
                const style = LAYER_STYLES[layerKey];
                return (
                  <label
                    key={layerKey}
                    className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs text-white"
                    style={{
                      background: style.pillBg,
                      borderColor: style.pillBorder,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={layerVisible[layerKey]}
                      onChange={() =>
                        setLayerVisible((prev) => ({
                          ...prev,
                          [layerKey]: !prev[layerKey],
                        }))
                      }
                      className="h-3.5 w-3.5"
                    />
                    <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: style.color }} />
                    <span>{style.name}</span>
                  </label>
                );
              })}
            </div>

            {calendarView === "month" ? (
              <>
                <div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs text-[#8E8E93]">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                    <div key={d}>{d}</div>
                  ))}
                </div>

                <div className="mt-2 grid grid-cols-7 gap-1">
                  {monthGrid.map((day) => {
                    const key = toDateKey(day);
                    const dayEvents = eventsByDay.get(key) ?? [];
                    const inMonth = day.getMonth() === calendarCursor.getMonth();
                    const isToday = key === todayKey;
                    return (
                      <div
                        key={key}
                        className={`min-h-16 rounded-xl border p-2 ${
                          inMonth
                            ? "border-[#2C2C2E]/65 bg-[#151517]"
                            : "border-[#2C2C2E]/35 bg-[#121214] text-[#626268]"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs">{day.getDate()}</span>
                          {isToday ? (
                            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#22C55E]" />
                          ) : null}
                        </div>
                        {dayEvents.length > 0 ? (
                          <div className="mt-1 text-[10px] text-[#8E8E93]">
                            {dayEvents.length} event{dayEvents.length > 1 ? "s" : ""}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </>
            ) : null}

            {calendarView === "week" ? (
              <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-7">
                {weekGrid.map((day) => {
                  const key = toDateKey(day);
                  const dayEvents = eventsByDay.get(key) ?? [];
                  const isToday = key === todayKey;
                  return (
                    <div key={key} className="rounded-xl border border-[#2C2C2E]/65 bg-[#151517] p-2">
                      <div className="flex items-center justify-between text-xs text-[#8E8E93]">
                        <span>{day.toLocaleDateString(undefined, { weekday: "short" })}</span>
                        {isToday ? <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#22C55E]" /> : null}
                      </div>
                      <div className="mt-1 text-sm font-medium text-white">{fmtShort.format(day)}</div>
                      <div className="mt-2 space-y-1">
                        {dayEvents.slice(0, 3).map((event) => (
                          <div
                            key={event.id}
                            className="flex items-center justify-between gap-2 rounded-md bg-[#202024] px-2 py-1"
                          >
                            <span className="truncate text-[11px] text-[#C8C8CD]">{event.label}</span>
                            <Link
                              href={`/events/${encodeURIComponent(event.id)}/edit`}
                              className="text-[10px] font-medium text-[#93C5FD] hover:underline"
                            >
                              Edit
                            </Link>
                          </div>
                        ))}
                        {dayEvents.length === 0 ? (
                          <div className="text-[11px] text-[#666670]">No events</div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}

            {calendarView === "list" ? (
              <div className="mt-4 max-h-72 space-y-2 overflow-y-auto pr-1">
                {listEvents.length ? (
                  listEvents.map((event) => (
                    <div key={event.id} className="rounded-xl border border-[#2C2C2E] bg-[#151517] p-3">
                      <div className="text-xs text-[#8E8E93]">{fmtLong.format(event.dateObj)}</div>
                      <div className="mt-1 text-sm font-medium text-white">{event.label}</div>
                      <div className="mt-1 text-xs text-[#8E8E93]">
                        {event.groupName} • {event.source === "GOOGLE" ? "Google" : "Manual"}
                      </div>
                      <div className="mt-2">
                        <Link
                          href={`/events/${encodeURIComponent(event.id)}/edit`}
                          className="text-xs font-medium text-[#93C5FD] hover:underline"
                        >
                          Edit event
                        </Link>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed border-[#2C2C2E] p-4 text-sm text-[#8E8E93]">
                    No events in this period.
                  </div>
                )}
              </div>
            ) : null}
          </article>

          <article className="rounded-2xl border border-[#2C2C2E] bg-[#1C1C1E] p-6">
            <h2 className="text-xl font-semibold text-white">Upcoming Milestones</h2>
            <p className="mt-1 text-sm text-[#8E8E93]">Timeline ribbon with sync pulse for each date.</p>

            <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
              {timeline.length ? (
                timeline.map((event) => (
                  <div key={event.id} className="min-w-72 rounded-xl border border-[#2C2C2E] bg-[#151517] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-xs text-[#8E8E93]">{fmtLong.format(event.dateObj)}</div>
                      <Link
                        href={`/events/${encodeURIComponent(event.id)}/edit`}
                        className="text-xs font-medium text-[#93C5FD] hover:underline"
                      >
                        Update
                      </Link>
                    </div>
                    <div className="mt-1 truncate text-sm font-semibold text-white">{event.label}</div>
                    <div className="mt-1 text-xs text-[#8E8E93]">
                      {event.familyId ? (
                        <Link
                          href={`/family/${encodeURIComponent(event.familyId)}/manage`}
                          className="text-[#93C5FD] hover:underline"
                        >
                          {event.groupName}
                        </Link>
                      ) : (
                        event.groupName
                      )}{" "}
                      - {event.source === "GOOGLE" ? "Google" : "Manual"}
                    </div>

                    <div className="mt-3">
                      <div className="mb-1 text-xs text-[#8E8E93]">RSVP / Sync pulse: {event.syncPulse}%</div>
                      <div className="h-2 rounded-full bg-[#2C2C2E]">
                        <div className="h-2 rounded-full bg-[#3B82F6]" style={{ width: `${event.syncPulse}%` }} />
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-[#2C2C2E] p-4 text-sm text-[#8E8E93]">
                  No milestones found for current filters.
                </div>
              )}
            </div>
          </article>
        </div>

        <aside className="space-y-6">
          <article className="rounded-2xl border border-[#2C2C2E] bg-[#1C1C1E] p-6">
            <h2 className="text-xl font-semibold text-white">Dear Days Ticker</h2>
            <div className="mt-3 text-3xl font-bold text-white">{daysUntil ?? "--"} days</div>
            <div className="mt-1 text-sm text-[#8E8E93]">until {nextEvent ? nextEvent.label : "your next event"}</div>
            {nextEvent ? (
              <div className="mt-2">
                <Link
                  href={`/events/${encodeURIComponent(nextEvent.id)}/edit`}
                  className="text-xs font-medium text-[#93C5FD] hover:underline"
                >
                  Edit next event
                </Link>
              </div>
            ) : null}

            <div className="mt-4 rounded-xl border border-[#2C2C2E] bg-[#151517] p-3">
              <div className="text-xs uppercase tracking-[0.12em] text-[#8E8E93]">Overlap alerts</div>
              {overlapAlerts.length ? (
                <div className="mt-2 space-y-1 text-sm text-[#FCA5A5]">
                  {overlapAlerts.map((alert) => (
                    <div key={alert}>• {alert}</div>
                  ))}
                </div>
              ) : (
                <div className="mt-2 text-sm text-[#8E8E93]">No overlap alerts in the next 30 days.</div>
              )}
            </div>
          </article>

          <article className="rounded-2xl border border-[#2C2C2E] bg-[#1C1C1E] p-6">
            <h2 className="text-xl font-semibold text-white">Availability Heatmap</h2>
            <p className="mt-1 text-sm text-[#8E8E93]">Next 28 days conflict load.</p>

            <div className="mt-4 grid grid-cols-7 gap-2">
              {heatmap.map((cell) => (
                <div key={cell.key} className="h-8 rounded" style={{ backgroundColor: cell.tone }} title={cell.label} />
              ))}
            </div>
          </article>

          <article className="rounded-2xl border border-[#2C2C2E] bg-[#1C1C1E] p-6">
            <h2 className="text-xl font-semibold text-white">Group Pulse</h2>

            <div className="mt-4 space-y-3">
              {groupPulseRows.length ? (
                groupPulseRows.map((group) => (
                  <div key={group.id} className="rounded-xl border border-[#2C2C2E] bg-[#151517] p-3">
                    <div className="flex items-center justify-between gap-2">
                      <Link
                        href={`/family/${encodeURIComponent(group.id)}/manage`}
                        className="font-medium text-white hover:text-[#93C5FD] hover:underline"
                      >
                        {group.name}
                      </Link>
                      <Link
                        href={`/connections?familyId=${encodeURIComponent(group.id)}`}
                        className="rounded-lg border border-[#2C2C2E] bg-[#3B82F6] px-2.5 py-1 text-xs font-medium text-white"
                      >
                        Sync All
                      </Link>
                    </div>

                    <div className="mt-2 h-2 rounded-full bg-[#2C2C2E]">
                      <div className="h-2 rounded-full bg-[#22C55E]" style={{ width: `${group.percent}%` }} />
                    </div>
                    <div className="mt-1 text-xs text-[#8E8E93]">
                      RSVP / Sync pulse: {group.percent}% ({group.syncedCount}/{group.memberCount})
                    </div>
                    <div className="mt-2 text-xs text-[#8E8E93]">Member count: {group.memberCount}</div>
                    <div className="mt-1 text-xs text-[#8E8E93]">
                      Next upcoming event:{" "}
                      {group.upcomingEventId ? (
                        <Link
                          href={`/events/${encodeURIComponent(group.upcomingEventId)}/edit`}
                          className="text-[#93C5FD] hover:underline"
                        >
                          {group.upcomingLabel}
                        </Link>
                      ) : (
                        group.upcomingLabel
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-[#8E8E93]">No groups available yet.</div>
              )}
            </div>
          </article>

          <article className="rounded-2xl border border-[#2C2C2E] bg-[#1C1C1E] p-6">
            <h2 className="text-xl font-semibold text-white">Nudge Center</h2>
            <p className="mt-2 text-sm text-[#8E8E93]">
              {hasUnsynced
                ? "Some members still need to sync. Send nudges from group management."
                : "Everything is in sync right now."}
            </p>
            <div className="mt-4 flex gap-2">
              <Link
                href="/connections"
                className="rounded-xl border border-[#2C2C2E] bg-[#151517] px-3 py-2 text-sm text-white"
              >
                Open connections
              </Link>
              {hasUnsynced ? (
                <Link
                  href="/family"
                  className="rounded-xl border border-[#EF4444]/45 bg-[#EF4444]/12 px-3 py-2 text-sm text-[#FCA5A5]"
                >
                  Nudge
                </Link>
              ) : null}
            </div>
          </article>
        </aside>
      </section>

      <div className="mt-5 text-xs text-[#8E8E93]">
        {counts.events} tracked events • {Math.max(counts.families, groups.length)} active groups • {counts.accounts} connected accounts
      </div>

      <div className="fixed inset-x-0 bottom-4 z-20 px-4">
        <div className="mx-auto flex w-full max-w-md items-center justify-center gap-2 rounded-xl border border-[#2C2C2E] bg-[#1C1C1E]/92 p-2 backdrop-blur">
          <InviteFamilyModal
            buttonLabel="Invite member"
            buttonClassName="rounded-lg border border-[#22C55E]/50 bg-[#22C55E]/15 px-3 py-1.5 text-xs font-medium text-[#86EFAC]"
            groups={groups.map((group) => ({ id: group.id, name: group.name }))}
            defaultFamilyId={groups[0]?.id}
          />
          <Link
            href="/family"
            className="rounded-lg border border-[#2C2C2E] bg-[#151517] px-3 py-1.5 text-xs font-medium text-[#C8C8CD]"
          >
            Invite tools
          </Link>
        </div>
      </div>
    </div>
  );
}
