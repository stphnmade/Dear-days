"use client";

type Family = {
  id: string;
  name: string | null;
  // If you haven't migrated yet, these may be undefined at runtime.
  timezone?: string | null;
  description?: string | null;
};

export default function ManageFamilyFields({ family }: { family: Family }) {
  // Debug: confirm client
  console.log("ManageFamilyFields is client:", typeof window !== "undefined");

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
    </div>
  );
}
