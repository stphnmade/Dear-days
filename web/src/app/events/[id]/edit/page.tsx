// src/app/events/[id]/edit/page.tsx
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { updateEvent, deleteEvent } from "@/app/events/new/actions";

type Props = { params: Promise<{ id: string }> };

export default async function EditEventPage({ params }: Props) {
  const { id } = await params;
  const event = await prisma.specialDay.findUnique({
    where: { id },
  });
  if (!event) return notFound();

  async function onUpdate(formData: FormData) {
    "use server";
    await updateEvent(formData); // must include "id" in the form
    revalidatePath("/events");
    redirect("/events");
  }

  async function onDelete() {
    "use server";
    if (!event) return notFound();
    await deleteEvent(event.id);
    revalidatePath("/events");
    redirect("/events");
  }

  return (
    <div className="container mx-auto space-y-6 p-6 dd-page">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Edit Event</h1>
        <Link href="/events" className="text-sm font-medium underline">
          Back
        </Link>
      </div>

      <form action={onUpdate} className="grid gap-3 max-w-lg">
        <input type="hidden" name="id" defaultValue={event.id} />
        <input
          name="title"
          defaultValue={event.title}
          className="rounded-xl px-3 py-2 dd-field"
          required
        />
        <label htmlFor="event-type" className="font-medium">
          Event Type
        </label>
        <select
          id="event-type"
          name="type"
          defaultValue={event.type}
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
          defaultValue={new Date(event.date).toISOString().slice(0, 10)}
          className="rounded-xl px-3 py-2 dd-field"
          required
        />
        <input
          name="person"
          defaultValue={event.person ?? ""}
          className="rounded-xl px-3 py-2 dd-field"
        />
        <textarea
          name="notes"
          defaultValue={event.notes ?? ""}
          className="rounded-xl px-3 py-2 dd-field"
        />

        <div className="flex gap-3">
          <button className="rounded-xl px-4 py-2 dd-btn-primary hover:opacity-90">
            Save
          </button>
          <button
            formAction={onDelete}
            className="rounded-xl px-4 py-2 dd-btn-danger hover:opacity-90"
          >
            Delete
          </button>
        </div>
      </form>
    </div>
  );
}
