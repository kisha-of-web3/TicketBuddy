"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="text-sm text-secondary-text hover:text-charcoal transition-colors"
    >
      Sign out
    </button>
  );
}
