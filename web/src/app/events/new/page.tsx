// Ensure quickAddSpecialDay is exported from './actions'
import { quickAddSpecialDay } from "./actions";
import SubmitButton from "@/ui/SubmitButton";

export default function NewEvent() {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-semibold">Add Special Day</h1>
      <form action={quickAddSpecialDay} className="mt-6 grid gap-3">
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
    </main>
  );
}
