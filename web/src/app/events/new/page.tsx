// Ensure quickAddSpecialDay is exported from './actions'
import { quickAddSpecialDay } from "./actions";
import Link from "next/link";
import SubmitButton from "@/ui/SubmitButton";

export default function NewEvent() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-8 w-full max-w-md relative">
        <Link
          href="/events"
          className="absolute top-4 right-4 text-sm rounded-xl px-3 py-1 bg-slate-900 text-white dark:bg-white dark:text-slate-900"
        >
          Back to Events
        </Link>
        <h1 className="text-2xl font-semibold mb-4">Add Special Day</h1>
        <form action={quickAddSpecialDay} className="grid gap-3">
          <input
            name="title"
            placeholder="Title"
            className="rounded-xl border px-3 py-2"
            required
          />
          <label htmlFor="event-type" className="font-medium">
            Type
          </label>
          <select
            id="event-type"
            name="type"
            className="rounded-xl border px-3 py-2"
          >
            <option value="birthday">Birthday</option>
            <option value="anniversary">Anniversary</option>
            <option value="wedding">Wedding</option>
            <option value="other">Other</option>
          </select>
          <input
            type="date"
            name="date"
            placeholder="Date"
            className="rounded-xl border px-3 py-2"
            required
          />
          <input
            name="person"
            placeholder="Person (optional)"
            className="rounded-xl border px-3 py-2"
          />
          <textarea
            name="notes"
            placeholder="Notes"
            className="rounded-xl border px-3 py-2"
          />
          <SubmitButton>Create</SubmitButton>
        </form>
      </div>
    </div>
  );
}
