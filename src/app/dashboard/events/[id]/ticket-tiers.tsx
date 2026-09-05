"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type TicketType = {
  id: string;
  name: string;
  description: string | null;
  price: string;
  quantityTotal: number;
  quantitySold: number;
  status: string;
};

type Props = {
  eventId: string;
  initialTiers: TicketType[];
  canManage: boolean;
};

const emptyForm = { name: "", description: "", price: "", quantityTotal: "" };

export function TicketTiers({ eventId, initialTiers, canManage }: Props) {
  const router = useRouter();
  const [tiers, setTiers] = useState(initialTiers);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch(`/api/events/${eventId}/ticket-types`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        description: form.description || undefined,
        price: form.price,
        quantityTotal: form.quantityTotal,
      }),
    });

    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      return;
    }

    setTiers((prev) => [...prev, data.ticketType]);
    setForm(emptyForm);
    setShowForm(false);
    router.refresh();
  }

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold text-charcoal">Ticket tiers</h2>
      </div>

      {tiers.length === 0 && !showForm && (
        <p className="text-sm text-secondary-text mb-3">
          No ticket tiers yet — attendees can&apos;t buy anything until you add
          at least one.
        </p>
      )}

      <div className="space-y-2 mb-3">
        {tiers.map((tier) => {
          const remaining = tier.quantityTotal - tier.quantitySold;
          return (
            <div
              key={tier.id}
              className="border border-line rounded-2xl p-4 bg-primary-soft/40"
            >
              <div className="flex justify-between items-start gap-3">
                <div>
                  <p className="font-bold text-ink text-sm">{tier.name}</p>
                  {tier.description && (
                    <p className="text-xs text-ink-2 mt-1 leading-relaxed">
                      {tier.description}
                    </p>
                  )}
                </div>
                <span className="text-lg font-extrabold text-forest whitespace-nowrap">
                  ₦{Number(tier.price).toLocaleString()}
                </span>
              </div>
              <div className="flex gap-2 mt-2">
                <span className="text-xs font-semibold text-ink-3 bg-line px-2 py-0.5 rounded-md">
                  {remaining} of {tier.quantityTotal} available
                </span>
                {tier.status !== "active" && (
                  <span className="text-xs font-semibold text-caution bg-caution-soft px-2 py-0.5 rounded-md capitalize">
                    {tier.status.replace("_", " ")}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {!canManage ? null : showForm ? (
        <form
          onSubmit={handleSubmit}
          className="border border-line rounded-2xl p-4 space-y-3 bg-white"
        >
          {error && <p className="text-error text-sm">{error}</p>}
          <input
            required
            placeholder="Tier name — e.g. General Admission"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest"
          />
          <textarea
            placeholder="Description (optional)"
            rows={2}
            value={form.description}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
            className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest"
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              required
              type="number"
              min="0"
              step="0.01"
              placeholder="Price (₦)"
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest"
            />
            <input
              required
              type="number"
              min="1"
              placeholder="Quantity"
              value={form.quantityTotal}
              onChange={(e) =>
                setForm((f) => ({ ...f, quantityTotal: e.target.value }))
              }
              className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-forest text-ivory font-semibold py-2 text-sm hover:bg-emerald transition-colors disabled:opacity-60"
            >
              {loading ? "Adding..." : "Add tier"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setError(null);
              }}
              className="rounded-lg border border-border text-ink px-4 py-2 text-sm hover:bg-ivory transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="w-full border-2 border-dashed border-line rounded-2xl py-3 text-sm font-bold text-forest hover:bg-primary-soft/30 transition-colors"
        >
          + Add another tier
        </button>
      )}
    </div>
  );
}
