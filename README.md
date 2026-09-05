# Ticket Buddy

Modern event ticketing platform for Nigerian organizers, attendees, and event
staff. Built per the Founder Build Blueprint — Phase 1 (Foundation) in
progress.

## Locked architecture decisions

These are settled and should not drift without a deliberate, explicit change:

1. **ORM: Drizzle.** No other ORM is used, referenced, or planned anywhere
   in this project. Drizzle was chosen because it's pure TypeScript with no
   native binary dependency — it installs and builds identically in any
   environment, including sandboxed CI and restricted networks.
2. **Attendees never need an account.** Ticket buying is a guest flow:
   visit event page → select ticket → enter contact details → pay via
   Paystack → receive QR ticket. No signup, no login, ever, for attendees.
3. **The `users` table is for platform staff only** — Organization Owners,
   Event Managers, Gate Staff, Finance/Admin. It is never the source of
   attendee identity.
4. **Guest purchase data lives on `orders` and `tickets`**, not on `users`.
   `orders.buyerId` is nullable and only populated if a logged-in staff
   member happens to place an order themselves; `tickets.attendeeName` /
   `attendeeEmail` are the actual source of truth for who holds a ticket.
5. **Deployment target: Vercel (Next.js) + Neon (external PostgreSQL).**
   The database client is configured for Neon's pooled connection string
   (`prepare: false`, `max: 1`) — the correct, production-safe setup for
   serverless functions, not just a local-dev convenience.
6. **Stack:** Next.js + TypeScript + PostgreSQL + Drizzle + Auth.js +
   Paystack, deployed as a single monolith. No microservices.

## What's built so far (Phase 1: Foundation)

- [x] Full database schema (`src/db/schema.ts`) — every entity from the
      blueprint: User, Organization, OrganizationMember, Event, TicketType,
      Order, Ticket, Payment, CheckIn, Payout — with enums for every status
      field and relations wired for Drizzle's query API
- [x] Auth: registration endpoint (`POST /api/auth/register`) that creates a
      platform User **and** their Organization + Owner membership in one
      transaction, and Auth.js credentials login wired to the same `users`
      table — staff only, per decision #2 above
- [x] Brand system wired into Tailwind (colors + Manrope font)
- [x] Event CRUD API (`GET/POST /api/events`, `GET/PATCH/DELETE /api/events/:id`,
      `POST /api/events/:id/publish`) with organization-role authorization —
      only Owner/Event Manager can create, edit, or publish; only Owner can
      delete; any org member can view
- [x] Staff signup (`/signup`) and login (`/login`) pages
- [x] Dashboard shell with route protection (`src/proxy.ts` — Next 16's
      middleware convention) redirecting unauthenticated visitors to `/login`
- [x] Events dashboard (`/dashboard/events`) — list, create, view/edit,
      publish/unpublish, delete, all calling the Event CRUD API above
- [x] Ticket Types — `GET/POST /api/events/:id/ticket-types` and
      `PATCH/DELETE /api/ticket-types/:id`, with the same Owner/Event Manager
      permission gate. Deletion is blocked once a tier has any sales
      (protects paid orders); capacity can't be shrunk below units already
      sold. UI lives on the event detail page.
- [x] Google sign-in for staff — email/password and Google both work and
      resolve to the same account by email. A first-time Google sign-in
      auto-creates an Organization (Owner role) since there's no form step
      to collect a name mid-OAuth-flow; renaming that org isn't built yet.
      Attendees still never authenticate — this is staff-only, same as
      email/password.
- [x] Brand palette extended to match final design files (Figma Make export):
      ink/ink-2/ink-3 text tiers, primary-soft/pale tints, sage-pale, caution
      and danger states, layered ivory/line shades — see `globals.css`
- [ ] Database migrations run against a real Postgres instance (needs a
      `DATABASE_URL` — see below)
- [ ] Edit form for existing event fields (currently create-only; the detail
      page shows fields and supports publish/delete, but not field edits yet)
- [ ] Guest checkout flow (Phase 2 — public event pages, ticket selection)

## Getting started (local development)

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up a Neon database** at [neon.tech](https://neon.tech) (free tier
   is fine to start). Grab both connection strings it gives you — pooled
   and direct.

3. **Copy the env file and fill it in:**
   ```bash
   cp .env.example .env
   ```
   Use plain `.env` (not `.env.local`) — Next.js reads both, but `drizzle-kit`
   (the CLI that creates your tables) only reads `.env`. Use the **direct**
   (non-pooled) connection string for local dev.
   Generate `AUTH_SECRET` with:
   ```bash
   npx auth secret
   ```

4. **Push the schema to your database:**
   ```bash
   npx drizzle-kit push
   ```

5. **(Optional) Set up Google sign-in:**
   - Go to [console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials)
   - Create an OAuth 2.0 Client ID (Application type: Web application)
   - Add an Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
     (and `https://your-vercel-domain.com/api/auth/callback/google` for production —
     add both, Google allows multiple)
   - Copy the Client ID and Client Secret into `AUTH_GOOGLE_ID` and
     `AUTH_GOOGLE_SECRET` in `.env`
   - Without this, everything else still works — the Google button will
     just error if clicked. Email/password never depends on it.

6. **Run the dev server:**
   ```bash
   npm run dev
   ```

## Deploying to Vercel

1. Push this repo to GitHub.
2. Import it into Vercel.
3. In Project Settings → Environment Variables, add everything from
   `.env.example` (these are separate from your local `.env` file — Vercel
   doesn't read your local files, you enter them in its dashboard). For
   `DATABASE_URL`, use Neon's **pooled** connection string here (the one
   with `-pooler` in the hostname) — the db client is already configured
   to work correctly with it.
4. Set `NEXTAUTH_URL` to your production URL.
5. Deploy. No build-time native dependencies to worry about — Drizzle
   needs nothing beyond `npm install`.

## Project structure

```
src/
  app/
    api/
      auth/
        [...nextauth]/route.ts   # Auth.js handlers (staff login)
        register/route.ts        # POST /api/auth/register (staff signup)
      events/
        route.ts                 # GET (list) / POST (create)
        [id]/
          route.ts                # GET / PATCH / DELETE
          publish/route.ts        # POST — toggle published/unpublished
          ticket-types/route.ts   # GET (list) / POST (create) tiers
      ticket-types/
        [id]/route.ts            # PATCH / DELETE a single tier
    dashboard/
      layout.tsx                 # Nav shell + sign-out (session-aware)
      events/
        page.tsx                  # Events list
        new/page.tsx               # Create event form
        [id]/
          page.tsx                  # Event detail (view + publish/delete)
          event-actions.tsx          # Client component for publish/delete
          ticket-tiers.tsx            # Client component: list + add tiers
    login/page.tsx               # Staff login
    signup/page.tsx              # Staff + organization signup
    page.tsx                     # Public landing page
    layout.tsx                   # Root layout, brand font + metadata
    providers.tsx                # SessionProvider wrapper (client)
    globals.css                  # Tailwind theme + brand color tokens
  db/
    schema.ts                    # Every table, enum, and relation
    index.ts                     # Drizzle client, tuned for Neon + Vercel
  fonts/
    Manrope-Variable.ttf         # Self-hosted brand typeface
  lib/
    authz.ts                     # Session + organization-role helpers
    password.ts                  # bcrypt hash/verify helpers
    slug.ts                      # Shared slug generation (orgs + events)
  components/
    sign-out-button.tsx          # Client component (calls next-auth signOut)
  auth.ts                        # Auth.js config (Credentials provider)
  proxy.ts                       # Route protection for /dashboard/* (Next 16
                                  # renamed "middleware" to "proxy")
```

## Event authorization rules (enforced in code, not just documented)

| Action | Owner | Event Manager | Gate Staff | Finance |
|---|---|---|---|---|
| View event | ✅ | ✅ | ✅ | ✅ |
| Create / edit / publish | ✅ | ✅ | ❌ | ❌ |
| Delete | ✅ | ❌ | ❌ | ❌ |

See `src/lib/authz.ts`. Every event route loads the event, resolves the
caller's membership in that event's organization, and checks role — there
is no endpoint that trusts a client-supplied organization or role.

## Other design decisions worth knowing

- **Fee config lives on the Organization row** (`feePercent`, `feeFlat`,
  `feeStrategy`), not hard-coded — per blueprint Section 22/23, pricing
  strategy must be changeable without engineering work.
- **Inventory protection groundwork:** `ticketTypes.quantityReserved` and
  `orders.reservationExpiresAt` are in the schema now so Phase 3 can
  implement the reserve → confirm/release flow without a schema migration.
- **QR tokens are opaque:** `tickets.qrToken` is a random unique string, not
  a ticket ID — per blueprint Section 15, scan logic will validate
  server-side.

## Next steps (continuing Phase 1 → 2)

- Edit form for existing event fields (title/description/venue/dates)
- "Invite team member" flow (Owner adds Event Manager/Gate Staff/Finance)
- Public event page + guest checkout flow (Phase 2)
