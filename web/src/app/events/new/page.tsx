// Ensure quickAddSpecialDay is exported from './actions'
import { quickAddSpecialDay } from "./actions";
import Link from "next/link";
import SubmitButton from "@/ui/SubmitButton";
import { getAuthSession } from "@/lib/auth";
import { getUserGroups } from "@/lib/family";

export default async function NewEvent() {
  const session = await getAuthSession();
  if (!session?.user) return null;
  const userId = (session.user as any).id as string;
  const groups = await getUserGroups(userId);
  const postableGroups = groups.filter(
    (g) => g.role === "owner" || g.allowMemberPosting
  );

  return (
    <div className="dd-modal-root flex items-center justify-center p-4 dd-modal-backdrop">
      <div className="relative w-full max-w-md rounded-2xl p-6 shadow-xl dd-modal-panel">
        <Link
          href="/events"
          className="absolute right-4 top-4 rounded-xl px-3 py-1 text-sm dd-btn-neutral"
        >
          Back to Events
        </Link>
        <h1 className="mb-4 text-2xl font-semibold">Add Special Day</h1>
        <form action={quickAddSpecialDay} className="grid gap-3">
          <input type="hidden" name="redirectTo" value="/dashboard" />
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Add to</span>
            <select name="scope" className="w-full rounded-xl px-3 py-2 dd-field">
              <option value="personal">Personal timeline</option>
              <option value="family" disabled={!postableGroups.length}>
                Group calendar
              </option>
            </select>
          </label>
          {postableGroups.length ? (
            <label className="block">
              <span className="mb-1 block text-sm font-medium">Group</span>
              <select
                name="targetFamilyId"
                className="w-full rounded-xl px-3 py-2 dd-field"
                defaultValue={postableGroups[0].id}
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
            placeholder="Title"
            className="rounded-xl px-3 py-2 dd-field"
            required
          />
          <label htmlFor="event-type" className="font-medium">
            Type
          </label>
          <select
            id="event-type"
            name="type"
            className="rounded-xl px-3 py-2 dd-field"
          >
            <option value="birthday">Birthday</option>
            <option value="anniversary">Anniversary</option>
            <option value="wedding">Wedding</option>
            <option value="memorial">Memorial</option>
            <option value="other">Other</option>
          </select>
          <input
            type="date"
            name="date"
            placeholder="Date"
            className="rounded-xl px-3 py-2 dd-field"
            required
          />
          <div>
            <label htmlFor="event-time" className="mb-1 block font-medium">
              Time (optional)
            </label>
            <input
              id="event-time"
              type="time"
              name="time"
              className="rounded-xl px-3 py-2 dd-field w-full"
            />
            <p className="mt-1 text-xs dd-text-muted">Leave blank for all-day.</p>
          </div>
          <input
            name="person"
            placeholder="Person (optional)"
            className="rounded-xl px-3 py-2 dd-field"
          />
          <textarea
            name="notes"
            placeholder="Notes"
            className="rounded-xl px-3 py-2 dd-field"
          />
          <SubmitButton>Create</SubmitButton>
        </form>
      </div>
    </div>
  );
}
