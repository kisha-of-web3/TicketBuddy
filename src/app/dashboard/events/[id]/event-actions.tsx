"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  eventId: string;
  status: string;
  canManage: boolean;
  canDelete: boolean;
};

export function EventActions({ eventId, status, canManage, canDelete }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<"publish" | "unpublish" | "delete" | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  async function togglePublish(publish: boolean) {
    setError(null);
    setLoading(publish ? "publish" : "unpublish");

    const res = await fetch(`/api/events/${eventId}/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publish }),
    });

    const data = await res.json().catch(() => ({}));
    setLoading(null);

    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      return;
    }

    router.refresh();
  }

  async function handleDelete() {
    if (!confirm("Delete this event permanently? This cannot be undone.")) {
      return;
    }
    setError(null);
    setLoading("delete");

    const res = await fetch(`/api/events/${eventId}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    setLoading(null);

    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      return;
    }

    router.push("/dashboard/events");
  }

  if (!canManage) return null;

  return (
    <div className="space-y-2">
      {error && <p className="text-error text-sm">{error}</p>}
      <div className="flex gap-2">
        {status !== "published" ? (
          <button
            onClick={() => togglePublish(true)}
            disabled={loading !== null}
            className="rounded-lg bg-forest text-ivory font-semibold px-4 py-2 hover:bg-emerald transition-colors disabled:opacity-60"
          >
            {loading === "publish" ? "Publishing..." : "Publish"}
          </button>
        ) : (
          <button
            onClick={() => togglePublish(false)}
            disabled={loading !== null}
            className="rounded-lg border border-border text-charcoal font-semibold px-4 py-2 hover:bg-ivory transition-colors disabled:opacity-60"
          >
            {loading === "unpublish" ? "Unpublishing..." : "Unpublish"}
          </button>
        )}
        {canDelete && (
          <button
            onClick={handleDelete}
            disabled={loading !== null}
            className="rounded-lg border border-error text-error font-semibold px-4 py-2 hover:bg-error/5 transition-colors disabled:opacity-60"
          >
            {loading === "delete" ? "Deleting..." : "Delete"}
          </button>
        )}
      </div>
    </div>
  );
}
