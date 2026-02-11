"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";

type GroupOption = {
  id: string;
  name: string;
  canPost: boolean;
};

type Props = {
  buttonLabel?: string;
  buttonClassName?: string;
  title?: string;
  groups?: GroupOption[];
  defaultFamilyId?: string;
  defaultScope?: "personal" | "family";
};

export default function EventCreateModal({
  buttonLabel = "Add special day",
  buttonClassName = "rounded-xl px-4 py-2 text-sm dd-btn-primary hover:opacity-90",
  title = "Add Special Day",
  groups = [],
  defaultFamilyId,
  defaultScope,
}: Props) {
  const today = new Date();
  const todayYmd = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const postableGroups = groups.filter((g) => g.canPost);
  const firstPostableFamilyId = postableGroups[0]?.id ?? "";
  const initialFamilyId =
    defaultFamilyId && postableGroups.some((g) => g.id === defaultFamilyId)
      ? defaultFamilyId
      : firstPostableFamilyId;
  const [scope, setScope] = useState<"personal" | "family">(
    defaultScope ?? (initialFamilyId ? "family" : "personal")
  );
  const [titleValue, setTitleValue] = useState("");
  const [typeValue, setTypeValue] = useState("birthday");
  const [dateValue, setDateValue] = useState(todayYmd);
  const [timeValue, setTimeValue] = useState("");
  const [personValue, setPersonValue] = useState("");
  const [notesValue, setNotesValue] = useState("");
  const [selectedFamilyId, setSelectedFamilyId] = useState(initialFamilyId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/events/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: titleValue,
          type: typeValue,
          date: dateValue,
          time: timeValue || null,
          person: personValue,
          notes: notesValue,
          scope,
          targetFamilyId: scope === "family" ? selectedFamilyId : null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? "Could not create event.");
        return;
      }
      setOpen(false);
      setTitleValue("");
      setDateValue(todayYmd);
      setTimeValue("");
      setPersonValue("");
      setNotesValue("");
      const redirectTo = pathname || "/dashboard";
      if (redirectTo === "/events" || redirectTo === "/dashboard" || redirectTo.startsWith("/family")) {
        router.refresh();
      } else {
        router.push("/dashboard");
      }
    } catch (e: any) {
      setError(e?.message ?? "Could not create event.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={buttonClassName}>
        {buttonLabel}
      </button>

      {open && (
        <div className="dd-modal-root flex items-center justify-center p-4 dd-modal-backdrop">
          <div className="w-full max-w-md rounded-2xl p-6 shadow-xl dd-modal-panel">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold">{title}</h2>
              <button
                type="button"
                className="rounded-lg px-3 py-1.5 text-sm dd-btn-neutral"
                onClick={() => setOpen(false)}
              >
                Close
              </button>
            </div>

            <form
              className="grid gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                void submit();
              }}
            >
              <label className="block">
                <span className="mb-1 block text-sm font-medium">Add to</span>
                <select
                  name="scope"
                  value={scope}
                  onChange={(e) => setScope(e.target.value as "personal" | "family")}
                  className="w-full rounded-xl px-3 py-2 dd-field"
                >
                  <option value="personal">Personal timeline</option>
                  <option value="family" disabled={!postableGroups.length}>
                    Group calendar
                  </option>
                </select>
              </label>

              {scope === "family" ? (
                <label className="block">
                  <span className="mb-1 block text-sm font-medium">Group</span>
                  <select
                    value={selectedFamilyId}
                    onChange={(e) => setSelectedFamilyId(e.target.value)}
                    className="w-full rounded-xl px-3 py-2 dd-field"
                    required
                  >
                    {postableGroups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              <input
                name="title"
                value={titleValue}
                onChange={(e) => setTitleValue(e.target.value)}
                placeholder="Title"
                className="rounded-xl px-3 py-2 dd-field"
                required
              />

              <label htmlFor="event-type" className="text-sm font-medium">
                Type
              </label>
              <select
                id="event-type"
                name="type"
                value={typeValue}
                onChange={(e) => setTypeValue(e.target.value)}
                className="rounded-xl px-3 py-2 dd-field"
              >
                <option value="birthday">Birthday</option>
                <option value="anniversary">Anniversary</option>
                <option value="memorial">Memorial</option>
                <option value="other">Custom</option>
              </select>

              <input
                type="date"
                name="date"
                value={dateValue}
                onChange={(e) => setDateValue(e.target.value)}
                className="rounded-xl px-3 py-2 dd-field"
                required
              />
              <div>
                <label htmlFor="event-time" className="mb-1 block text-sm font-medium">
                  Time (optional)
                </label>
                <input
                  id="event-time"
                  type="time"
                  name="time"
                  value={timeValue}
                  onChange={(e) => setTimeValue(e.target.value)}
                  className="rounded-xl px-3 py-2 dd-field w-full"
                />
                <p className="mt-1 text-xs dd-text-muted">Leave blank to keep this as an all-day event.</p>
              </div>
              <input
                name="person"
                value={personValue}
                onChange={(e) => setPersonValue(e.target.value)}
                placeholder="Person (optional)"
                className="rounded-xl px-3 py-2 dd-field"
              />
              <textarea
                name="notes"
                value={notesValue}
                onChange={(e) => setNotesValue(e.target.value)}
                placeholder="Notes (optional)"
                className="rounded-xl px-3 py-2 dd-field min-h-24"
              />

              {error ? (
                <div className="rounded-lg px-3 py-2 text-sm dd-card-muted border border-[var(--dd-accent-red)]">
                  {error}
                </div>
              ) : null}

              <div className="mt-1 flex items-center justify-end gap-2">
                <button type="button" onClick={() => setOpen(false)} className="rounded-xl px-4 py-2 text-sm dd-btn-neutral">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-xl px-4 py-2 text-sm dd-btn-primary disabled:opacity-60"
                >
                  {loading ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
