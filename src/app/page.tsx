import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-forest text-ivory px-4 text-center">
      <div className="h-16 w-16 rounded-2xl bg-ivory text-forest font-bold text-2xl flex items-center justify-center mb-6">
        TB
      </div>
      <h1 className="text-3xl sm:text-4xl font-bold max-w-xl">
        Your event journey starts here.
      </h1>
      <p className="text-sage mt-3 max-w-md">
        Discover events, book tickets securely, and experience more of what
        matters.
      </p>
      <div className="flex gap-3 mt-8">
        <Link
          href="/signup"
          className="rounded-lg bg-ivory text-forest font-semibold px-5 py-2.5 hover:bg-white transition-colors"
        >
          Start organizing
        </Link>
        <Link
          href="/login"
          className="rounded-lg border border-ivory/30 text-ivory font-semibold px-5 py-2.5 hover:bg-white/10 transition-colors"
        >
          Log in
        </Link>
      </div>
    </main>
  );
}
