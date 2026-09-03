import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { events } from "@/db/schema";
import {
  canManageEvents,
  getMembership,
  getPrimaryOrganizationId,
  getSessionUserId,
} from "@/lib/authz";
import { generateUniqueSlug } from "@/lib/slug";

const createEventSchema = z
  .object({
    title: z.string().min(1).max(200),
    description: z.string().max(5000).optional(),
    category: z.string().max(100).optional(),
    coverImage: z.string().url().optional(),
    venueName: z.string().max(200).optional(),
    venueAddress: z.string().optional(),
    city: z.string().max(100).optional(),
    country: z.string().max(100).optional(),
    startDatetime: z.coerce.date(),
    endDatetime: z.coerce.date(),
    salesStart: z.coerce.date().optional(),
    salesEnd: z.coerce.date().optional(),
    // Optional override for staff who belong to more than one organization.
    // Defaults to the caller's primary organization otherwise.
    organizationId: z.string().uuid().optional(),
  })
  .refine((data) => data.endDatetime > data.startDatetime, {
    message: "endDatetime must be after startDatetime",
    path: ["endDatetime"],
  });

// GET /api/events — list events for the caller's organization (dashboard view).
export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const organizationId = await getPrimaryOrganizationId(userId);
  if (!organizationId) {
    return NextResponse.json({ events: [] });
  }

  const orgEvents = await db
    .select()
    .from(events)
    .where(eq(events.organizationId, organizationId))
    .orderBy(events.startDatetime);

  return NextResponse.json({ events: orgEvents });
}

// POST /api/events — create a draft event. Owner or Event Manager only.
export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const organizationId =
    parsed.data.organizationId ?? (await getPrimaryOrganizationId(userId));

  if (!organizationId) {
    return NextResponse.json(
      { error: "No organization found for this account." },
      { status: 400 }
    );
  }

  const membership = await getMembership(userId, organizationId);
  if (!membership || !canManageEvents(membership.role)) {
    return NextResponse.json(
      { error: "You do not have permission to create events for this organization." },
      { status: 403 }
    );
  }

  const slug = await generateUniqueSlug(parsed.data.title, async (candidate) => {
    const [existing] = await db
      .select({ id: events.id })
      .from(events)
      .where(eq(events.slug, candidate))
      .limit(1);
    return !!existing;
  });

  const [event] = await db
    .insert(events)
    .values({
      organizationId,
      title: parsed.data.title,
      slug,
      description: parsed.data.description,
      coverImage: parsed.data.coverImage,
      category: parsed.data.category,
      venueName: parsed.data.venueName,
      venueAddress: parsed.data.venueAddress,
      city: parsed.data.city,
      country: parsed.data.country ?? "Nigeria",
      startDatetime: parsed.data.startDatetime,
      endDatetime: parsed.data.endDatetime,
      salesStart: parsed.data.salesStart,
      salesEnd: parsed.data.salesEnd,
    })
    .returning();

  return NextResponse.json({ event }, { status: 201 });
}
