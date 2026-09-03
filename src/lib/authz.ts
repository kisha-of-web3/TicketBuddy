import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { organizationMembers } from "@/db/schema";

export type OrgRole = "owner" | "event_manager" | "gate_staff" | "finance";

export async function getSessionUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function getMembership(userId: string, organizationId: string) {
  const [membership] = await db
    .select()
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.userId, userId),
        eq(organizationMembers.organizationId, organizationId)
      )
    )
    .limit(1);
  return membership ?? null;
}

/**
 * V1 simplification: most organizers belong to exactly one Organization
 * (created for them at registration). A user with multiple memberships
 * (e.g. someone invited to a second org's team) will need an org-switcher
 * in a later phase — this just returns the first one found.
 */
export async function getPrimaryOrganizationId(
  userId: string
): Promise<string | null> {
  const [membership] = await db
    .select({ organizationId: organizationMembers.organizationId })
    .from(organizationMembers)
    .where(eq(organizationMembers.userId, userId))
    .limit(1);
  return membership?.organizationId ?? null;
}

// Per blueprint Section 20 — Event Manager can manage event details,
// tickets, attendees, and check-in, but not company-level settings.
// Gate Staff can only scan/search/check-in. Finance sees money, not
// operations. None of that is enforced by this function alone; each
// route composes these primitives for its specific action.
export function canManageEvents(role: OrgRole): boolean {
  return role === "owner" || role === "event_manager";
}

// Deleting an event is irreversible and destroys attendee/order history —
// restricted to Owner only, stricter than the general "manage" permission.
export function canDeleteEvent(role: OrgRole): boolean {
  return role === "owner";
}
