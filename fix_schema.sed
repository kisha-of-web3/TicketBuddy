/export const organizationMembers = pgTable(/,/^\);$/c\
export const organizationMembers = pgTable(\
  "organization_members",\
  {\
    id: uuid("id").defaultRandom().primaryKey(),\
    organizationId: uuid("organization_id")\
      .references(() => organizations.id, { onDelete: "cascade" })\
      .notNull(),\
    userId: uuid("user_id")\
      .references(() => users.id, { onDelete: "cascade" }),\
    userEmail: varchar("user_email", { length: 255 }),\
    role: orgRoleEnum("role").notNull(),\
    status: varchar("status", { length: 50 }).default("active").notNull(),\
    inviteToken: varchar("invite_token", { length: 255 }),\
    invitedAt: timestamp("invited_at"),\
    joinedAt: timestamp("joined_at"),\
    invitedBy: varchar("invited_by", { length: 255 }),\
    createdAt: timestamp("created_at").defaultNow().notNull(),\
  },\
  (t) => ({\
    uniqueMembership: uniqueIndex("org_member_unique").on(\
      t.organizationId,\
      t.userId\
    ),\
  })\
);
