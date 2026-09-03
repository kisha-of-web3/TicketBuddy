"use client";

import { useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid email or password.");
      return;
    }

    router.push("/dashboard/events");
    router.refresh();
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-ivory px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-forest text-ivory font-bold text-xl mb-4">
            TB
          </div>
          <h1 className="text-2xl font-bold text-charcoal">Welcome back</h1>
          <p className="text-secondary-text text-sm mt-1">
            Log in to manage your events.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 bg-white border border-border rounded-2xl p-6"
        >
          {error && <p className="text-error text-sm">{error}</p>}

          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-forest"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-forest"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-forest text-ivory font-semibold py-2.5 hover:bg-emerald transition-colors disabled:opacity-60"
          >
            {loading ? "Logging in..." : "Log in"}
          </button>
        </form>

        <p className="text-center text-sm text-secondary-text mt-4">
          New organizer?{" "}
          <Link href="/signup" className="text-forest font-medium">
            Create an account
          </Link>
        </p>
      </div>
    </main>
  );
}
