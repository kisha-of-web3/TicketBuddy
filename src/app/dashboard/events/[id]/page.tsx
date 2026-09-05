import { notFound } from "next/navigation";
import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { events, ticketTypes } from "@/db/schema";
import { canDeleteEvent, canManageEvents, getMembership, getSessionUserId } from "@/lib/authz";
import { EventActions } from "./event-actions";
import { TicketTiers } from "./ticket-tiers";

const statusStyles: Record<string, string> = {
  draft: "bg-border text-secondary-text",
  published: "bg-success/15 text-success",
  unpublished: "bg-warning/15 text-warning",
  cancelled: "bg-error/15 text-error",
};

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const userId = await getSessionUserId();
  if (!userId) notFound();

  const [event] = await db.select().from(events).where(eq(events.id, id)).limit(1);
  if (!event) notFound();

  const membership = await getMembership(userId, event.organizationId);
  if (!membership) notFound();

  const canManage = canManageEvents(membership.role);
  const canDelete = canDeleteEvent(membership.role);

  const tiers = await db
    .select()
    .from(ticketTypes)
    .where(eq(ticketTypes.eventId, event.id))
    .orderBy(asc(ticketTypes.price));

  return (
    <div className="max-w-2xl">
      <Link
        href="/dashboard/events"
        className="text-sm text-secondary-text hover:text-charcoal transition-colors"
      >
        ← Back to events
      </Link>

      <div className="flex items-start justify-between mt-2 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-charcoal">{event.title}</h1>
          <p className="text-secondary-text text-sm mt-1">
            {new Date(event.startDatetime).toLocaleString("en-NG", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
            {event.venueName ? ` · ${event.venueName}` : ""}
            {event.city ? `, ${event.city}` : ""}
          </p>
        </div>
        <span
          className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${
            statusStyles[event.status] ?? statusStyles.draft
          }`}
        >
          {event.status}
        </span>
      </div>

      <div className="bg-white border border-border rounded-2xl p-6 space-y-4 mb-6">
        {event.description ? (
          <p className="text-charcoal">{event.description}</p>
        ) : (
          <p className="text-secondary-text text-sm italic">
            No description yet.
          </p>
        )}

        <dl className="grid grid-cols-2 gap-4 text-sm border-t border-border pt-4">
          <div>
            <dt className="text-secondary-text">Category</dt>
            <dd className="text-charcoal font-medium">
              {event.category ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-secondary-text">Ends</dt>
            <dd className="text-charcoal font-medium">
              {new Date(event.endDatetime).toLocaleString("en-NG", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </dd>
          </div>
        </dl>
      </div>

      <EventActions
        eventId={event.id}
        status={event.status}
        canManage={canManage}
        canDelete={canDelete}
      />

      <TicketTiers
        eventId={event.id}
        initialTiers={tiers}
        canManage={canManage}
      />

      {!canManage && (
        <p className="text-sm text-secondary-text mt-4">
          You have view-only access to this event.
        </p>
      )}
    </div>
  );
}
