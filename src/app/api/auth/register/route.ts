import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, organizations, organizationMembers } from "@/db/schema";
import { hashPassword } from "@/lib/password";
import { generateUniqueSlug } from "@/lib/slug";

// Every new user becomes the Owner of their own Organization on signup.
// This keeps the "one organizer = one account" V1 reality while the data
// model is already built around multi-member Organizations for later.

const registerSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email(),
  phone: z.string().min(7).max(32).optional(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  organizationName: z.string().min(1).max(200),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { firstName, lastName, phone, organizationName } = parsed.data;
  const email = parsed.data.email.toLowerCase();

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists." },
      { status: 409 }
    );
  }

  const passwordHash = await hashPassword(parsed.data.password);

  const slug = await generateUniqueSlug(organizationName, async (candidate) => {
    const [collision] = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.slug, candidate))
      .limit(1);
    return !!collision;
  });

  const result = await db.transaction(async (tx) => {
    const [user] = await tx
      .insert(users)
      .values({
        firstName,
        lastName,
        name: `${firstName} ${lastName}`,
        email,
        phone,
        passwordHash,
      })
      .returning();

    const [organization] = await tx
      .insert(organizations)
      .values({ name: organizationName, slug, ownerId: user.id })
      .returning();

    await tx.insert(organizationMembers).values({
      organizationId: organization.id,
      userId: user.id,
      role: "owner",
    });

    return { user, organization };
  });

  return NextResponse.json(
    {
      user: {
        id: result.user.id,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        email: result.user.email,
      },
      organization: {
        id: result.organization.id,
        name: result.organization.name,
        slug: result.organization.slug,
      },
    },
    { status: 201 }
  );
}
