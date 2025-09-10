import { createInvite } from "./invite/actions";

<form
  action={async (fd) => {
    "use server";
    const url = await createInvite((fd.get("email") as string) || undefined);
    // perform redirect here if running client-side, or handle on server
    if (typeof window !== "undefined" && url) {
      window.location.href = `/family/invite?url=${encodeURIComponent(url)}`;
    }
    // return void to satisfy the type
  }}
  className="mt-4 flex gap-2"
>
  <input
    name="email"
    placeholder="Invitee email (optional)"
    className="rounded-xl border px-3 py-2"
  />
  <button className="rounded-xl px-4 py-2 bg-slate-900 text-white dark:bg-white dark:text-slate-900">
    Generate link
  </button>
</form>;

export default function InviteLinkPage({
  searchParams,
}: {
  searchParams: { url?: string };
}) {
  const url = searchParams.url ?? "";
  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-semibold">Invite</h1>
      {url ? (
        <div className="mt-4 rounded-xl border p-4">
          <div className="text-sm text-slate-600">Share this link:</div>
          <input
            readOnly
            value={url}
            placeholder="Invite link"
            title="Invite link"
            className="mt-2 w-full rounded-lg border px-3 py-2"
          />
        </div>
      ) : (
        <div className="mt-4 text-slate-600">
          Create an invite from the Family page.
        </div>
      )}
    </main>
  );
}
