import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, accounts, organizations, organizationMembers } from "@/db/schema";
import { verifyPassword } from "@/lib/password";
import { generateUniqueSlug } from "@/lib/slug";

const googleConfigured = Boolean(
  process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
);

export const { handlers, signIn, signOut, auth } = NextAuth({
  // The adapter persists Google-authenticated users/accounts to our own
  // `users`/`accounts` tables. It is NOT used for session storage — we keep
  // `session: { strategy: "jwt" }` below, which is required for the
  // Credentials provider to work at all, and Auth.js supports combining an
  // adapter with Credentials as long as sessions stay JWT-based.
  adapter: DrizzleAdapter(db, { usersTable: users, accountsTable: accounts }),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;

        if (!email || !password) return null;

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, email.toLowerCase()))
          .limit(1);

        // No account, or an OAuth-only account with no password set —
        // reject either way rather than letting bcrypt.compare throw.
        if (!user || !user.passwordHash) return null;

        const valid = await verifyPassword(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim(),
        };
      },
    }),
    // Only registered when AUTH_GOOGLE_ID/SECRET are actually set — Google
    // sign-in is optional (see decision log in README); when absent, the
    // login/signup pages also hide the button so nobody hits a dead flow.
    ...(googleConfigured
      ? [
          Google({
            // allowDangerousEmailAccountLinking: Google verifies email
            // ownership itself, so it's safe (and expected) for a staff
            // member who first signed up with email/password to also sign
            // in with Google using the same address, and have it resolve
            // to the same account.
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
  ],
  events: {
    // Fires only when the adapter creates a BRAND NEW user — i.e. the first
    // time someone signs in with Google and no matching account exists yet.
    // Credentials signups create their Organization explicitly in
    // /api/auth/register instead; this is the equivalent step for OAuth,
    // since there's no form step to collect an organization name mid-flow.
    async createUser({ user }) {
      if (!user.id) return;

      const baseName = user.name?.trim() || user.email?.split("@")[0] || "My";
      const orgName = `${baseName}'s Organization`;

      const slug = await generateUniqueSlug(orgName, async (candidate) => {
        const [existing] = await db
          .select({ id: organizations.id })
          .from(organizations)
          .where(eq(organizations.slug, candidate))
          .limit(1);
        return !!existing;
      });

      const [organization] = await db
        .insert(organizations)
        .values({ name: orgName, slug, ownerId: user.id })
        .returning();

      await db.insert(organizationMembers).values({
        organizationId: organization.id,
        userId: user.id,
        role: "owner",
      });
    },
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.userId = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.userId) {
        (session.user as { id?: string }).id = token.userId as string;
      }
      return session;
    },
  },
});
