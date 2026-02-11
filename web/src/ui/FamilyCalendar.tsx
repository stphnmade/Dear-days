"use client";
import { useEffect, useMemo, useState } from "react";

export default function FamilyCalendar({
  events,
}: {
  events: Array<{
    id: string;
    title?: string | null;
    date: string | Date;
    visibility?: string | null;
    person?: string | null;
  }>;
}) {
  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState<"month" | "list">("month");
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const normalizedEvents = useMemo(() => {
    return (events ?? []).map((e) => ({
      ...e,
      date: new Date(e.date),
    }));
  }, [events]);

  const toLocalKey = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const formatLocalKey = (
    key: string,
    opts?: Intl.DateTimeFormatOptions
  ) => {
    const [y, m, d] = key.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(undefined, opts);
  };

  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  // produce 6 weeks x 7 days grid for a month view
  const monthGrid = useMemo(() => {
    const firstOfMonth = new Date(year, month, 1);
    const startDay = firstOfMonth.getDay(); // 0-6
    const start = new Date(firstOfMonth);
    start.setDate(firstOfMonth.getDate() - startDay);
    const cells: Date[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      cells.push(d);
    }
    return cells;
  }, [year, month]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, typeof normalizedEvents>();
    for (const ev of normalizedEvents) {
      const key = toLocalKey(ev.date);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ev);
    }
    return map;
  }, [normalizedEvents]);

  const goPrev = () => {
    const d = new Date(cursor);
    d.setMonth(d.getMonth() - 1);
    setCursor(d);
    setSelectedDate(null);
  };
  const goNext = () => {
    const d = new Date(cursor);
    d.setMonth(d.getMonth() + 1);
    setCursor(d);
    setSelectedDate(null);
  };

  const fmtDay = (d: Date) => d.getDate();
  const fmtMonthYear = (d: Date) =>
    d.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  const visIcon = (v?: string | null) =>
    v === "family" ? "👪" : v === "public" ? "🌐" : "🔒";

  if (!mounted) {
    return (
      <div className="rounded-xl p-3 dd-card">
        <div className="text-sm dd-text-muted">Loading calendar…</div>
      </div>
    );
  }

  return (
    <div className="rounded-xl p-3 dd-card">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView("month")}
            aria-label="Switch to month view"
            className={`px-2 py-1 rounded ${
              view === "month" ? "dd-btn-primary" : "dd-card-muted"
            }`}
            aria-pressed={view === "month"}
          >
            Month
          </button>
          <button
            onClick={() => setView("list")}
            aria-label="Switch to list view"
            className={`px-2 py-1 rounded ${
              view === "list" ? "dd-btn-primary" : "dd-card-muted"
            }`}
            aria-pressed={view === "list"}
          >
            List
          </button>
        </div>

        <div
          className="flex items-center gap-2 text-sm"
          role="group"
          aria-label="Calendar navigation"
        >
          <button
            onClick={goPrev}
            aria-label="Previous month"
            className="px-2 py-1 rounded hover:opacity-85 dd-card-muted"
          >
            ‹
          </button>
          <div className="px-2" aria-live="polite">
            {fmtMonthYear(cursor)}
          </div>
          <button
            onClick={goNext}
            aria-label="Next month"
            className="px-2 py-1 rounded hover:opacity-85 dd-card-muted"
          >
            ›
          </button>
        </div>
      </div>

      {view === "month" ? (
        <div>
          <div
            className="mb-2 grid grid-cols-7 gap-1 text-xs dd-text-muted"
            role="row"
            aria-hidden
          >
            <div className="text-center" role="columnheader">
              Sun
            </div>
            <div className="text-center" role="columnheader">
              Mon
            </div>
            <div className="text-center" role="columnheader">
              Tue
            </div>
            <div className="text-center" role="columnheader">
              Wed
            </div>
            <div className="text-center" role="columnheader">
              Thu
            </div>
            <div className="text-center" role="columnheader">
              Fri
            </div>
            <div className="text-center" role="columnheader">
              Sat
            </div>
          </div>

          <div
            className="grid grid-cols-7 gap-1"
            role="grid"
            aria-label={`Month view for ${fmtMonthYear(cursor)}`}
          >
            {monthGrid.map((day) => {
              const key = toLocalKey(day);
              const dayEvents = eventsByDate.get(key) ?? [];
              const isCurrentMonth = day.getMonth() === month;
              const isSelected = selectedDate === key;
              const dayLabel = `${formatLocalKey(key, {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}${
                dayEvents.length > 0
                  ? `, ${dayEvents.length} event${
                      dayEvents.length > 1 ? "s" : ""
                    }`
                  : ""
              }`;
              return (
                <button
                  key={key}
                  onClick={() =>
                    setSelectedDate(key === selectedDate ? null : key)
                  }
                  aria-label={dayLabel}
                  aria-pressed={isSelected}
                  className={`p-2 h-20 text-left rounded flex flex-col justify-start items-start border ${
                    isSelected ? "border-[var(--dd-accent-blue)]" : "border-[var(--dd-border)]"
                  } ${isCurrentMonth ? "dd-card" : "dd-card-muted dd-text-muted"}`}
                >
                  <div className="w-full flex justify-between items-start">
                    <div className="text-sm font-medium" aria-hidden>
                      {fmtDay(day)}
                    </div>
                    {dayEvents.length > 0 && (
                      <div className="text-xs" aria-hidden>
                        {dayEvents.slice(0, 3).map((e) => (
                          <span
                            key={e.id}
                            title={e.title ?? e.person ?? ""}
                            className="inline-block ml-1"
                          >
                            •
                          </span>
                        ))}
                        {dayEvents.length > 3 && (
                          <span className="ml-1 text-[10px]">
                            +{dayEvents.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="mt-1 w-full text-xs dd-text-muted">
                    {dayEvents.slice(0, 2).map((e) => (
                      <div key={e.id} className="truncate">
                        <span className="mr-1" aria-hidden>
                          {visIcon(e.visibility)}
                        </span>
                        <span className="font-medium">
                          {e.title ?? e.person ?? "Special Day"}
                        </span>
                      </div>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>

          {selectedDate && (
            <div
              className="mt-3 border-t border-[var(--dd-border)] pt-3 text-sm"
              aria-live="polite"
              aria-atomic="true"
            >
              <div className="font-medium mb-2">
                Events on {formatLocalKey(selectedDate)}
              </div>
              {(eventsByDate.get(selectedDate) ?? []).map((e) => (
                <div
                  key={e.id}
                  className="border-b border-[var(--dd-border)] py-2 last:border-b-0"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">
                        {e.title ?? e.person ?? "Special Day"}
                      </div>
                      <div className="text-xs dd-text-muted">
                        {e.date.toLocaleTimeString?.() ?? ""}
                      </div>
                    </div>
                    <div className="text-sm" aria-hidden>
                      {visIcon(e.visibility)}
                    </div>
                  </div>
                </div>
              ))}
              {(eventsByDate.get(selectedDate) ?? []).length === 0 && (
                <div className="dd-text-muted">No events</div>
              )}
            </div>
          )}
        </div>
      ) : (
        // List view: upcoming events grouped by date
        <div className="space-y-2 text-sm max-h-56 overflow-y-auto">
          {Array.from(eventsByDate.entries())
            .sort()
            .map(([dayKey, dayEvents]) => (
              <div
                key={dayKey}
                className="py-1"
                role="group"
                aria-label={`Events for ${formatLocalKey(dayKey)}`}
              >
                <div className="text-xs dd-text-muted">
                  {formatLocalKey(dayKey)}
                </div>
                {dayEvents.map((e) => (
                  <div
                    key={e.id}
                    className="flex items-center justify-between py-1"
                    role="article"
                    aria-label={`${
                      e.title ?? e.person ?? "Special Day"
                    } on ${formatLocalKey(dayKey)}`}
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium">
                        {e.title ?? e.person ?? "Special Day"}
                      </div>
                      <div className="text-xs dd-text-muted">
                        {e.date.toLocaleTimeString?.()}
                      </div>
                    </div>
                    <div className="ml-3" aria-hidden>
                      {visIcon(e.visibility)}
                    </div>
                  </div>
                ))}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
