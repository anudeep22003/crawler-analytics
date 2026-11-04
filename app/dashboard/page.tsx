"use client";

import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const { session, loading, busy, error, signOut } = useAuth({
    requireSession: true,
  });

  if (loading || !session)
    return (
      <p role="status" className="p-6">
        Loading your account…
      </p>
    );

  return (
    <main className="mx-auto max-w-xl space-y-6 p-6">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Your sites</h1>
        <Button variant="outline" disabled={busy} onClick={signOut}>
          Sign out
        </Button>
      </header>
      <p className="text-sm text-muted-foreground">{session.user.email}</p>
      {error && <p role="alert">{error}</p>}
    </main>
  );
}
