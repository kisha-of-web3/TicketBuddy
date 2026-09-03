import Link from "next/link";
import { auth } from "@/auth";
import { SignOutButton } from "@/components/sign-out-button";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <div className="min-h-screen bg-ivory">
      <header className="border-b border-border bg-white">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/dashboard/events" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-forest text-ivory font-bold text-sm flex items-center justify-center">
              TB
            </div>
            <span className="font-bold text-charcoal">Ticket Buddy</span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-secondary-text hidden sm:inline">
              {session?.user?.name}
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
