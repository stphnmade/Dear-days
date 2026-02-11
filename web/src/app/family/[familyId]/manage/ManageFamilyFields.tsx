"use client";

type Family = {
  id: string;
  name: string | null;
  timezone?: string | null;
  description?: string | null;
  allowMemberPosting?: boolean;
  calendarLabel?: string | null;
  eventNameTemplate?: string | null;
};

export default function ManageFamilyFields({ family }: { family: Family }) {
  return (
    <div className="space-y-3">
      <label className="block">
        <span className="text-sm">Name</span>
        <input
          name="name"
          defaultValue={family.name ?? ""}
          required
          className="input"
        />
      </label>

      <label className="block">
        <span className="text-sm">Timezone</span>
        <input
          name="timezone"
          defaultValue={family.timezone ?? "America/New_York"}
          className="input"
        />
      </label>

      <label className="block">
        <span className="text-sm">Description</span>
        <textarea
          name="description"
          defaultValue={family.description ?? ""}
          className="textarea"
        />
      </label>

      <label className="block">
        <span className="text-sm">Calendar label (for iCal subscribers)</span>
        <input
          name="calendarLabel"
          defaultValue={family.calendarLabel ?? ""}
          className="input"
          placeholder={`${family.name ?? "Group"} Calendar`}
        />
      </label>

      <label className="block">
        <span className="text-sm">Event name template</span>
        <input
          name="eventNameTemplate"
          defaultValue={family.eventNameTemplate ?? "{{title}}"}
          className="input"
          placeholder="{{title}} • {{group}}"
        />
        <span className="mt-1 block text-xs opacity-70">
          Supported placeholders: {"{{title}}"}, {"{{person}}"}, {"{{group}}"}
        </span>
      </label>

      <label className="inline-flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="allowMemberPosting"
          defaultChecked={family.allowMemberPosting ?? true}
          className="h-4 w-4"
        />
        Members can add/edit group dates
      </label>
    </div>
  );
}
