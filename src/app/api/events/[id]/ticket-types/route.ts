import { NextResponse } from "next/server";
import { z } from "zod";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { events, ticketTypes } from "@/db/schema";
import { canManageEvents, getMembership, getSessionUserId } from "@/lib/authz";

const createTicketTypeSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  price: z.coerce.number().min(0),
  quantityTotal: z.coerce.number().int().min(1),
  maxPerOrder: z.coerce.number().int().min(1).max(50).optional(),
  salesStart: z.coerce.date().optional(),
  salesEnd: z.coerce.date().optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/events/:id/ticket-types — any org member can view.
export async function GET(_request: Request, context: RouteContext) {
  const { id: eventId } = await context.params;
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [event] = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
  if (!event) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const membership = await getMembership(userId, event.organizationId);
  if (!membership) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const tiers = await db
    .select()
    .from(ticketTypes)
    .where(eq(ticketTypes.eventId, eventId))
    .orderBy(asc(ticketTypes.price));

  return NextResponse.json({ ticketTypes: tiers });
}

// POST /api/events/:id/ticket-types — Owner or Event Manager only.
export async function POST(request: Request, context: RouteContext) {
  const { id: eventId } = await context.params;
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [event] = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
  if (!event) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const membership = await getMembership(userId, event.organizationId);
  if (!membership || !canManageEvents(membership.role)) {
    return NextResponse.json(
      { error: "You do not have permission to manage ticket types for this event." },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = createTicketTypeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const [tier] = await db
    .insert(ticketTypes)
    .values({
      eventId,
      name: parsed.data.name,
      description: parsed.data.description,
      price: parsed.data.price.toFixed(2),
      quantityTotal: parsed.data.quantityTotal,
      maxPerOrder: parsed.data.maxPerOrder ?? 10,
      salesStart: parsed.data.salesStart,
      salesEnd: parsed.data.salesEnd,
    })
    .returning();

  return NextResponse.json({ ticketType: tier }, { status: 201 });
}
