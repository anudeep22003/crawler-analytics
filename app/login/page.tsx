"use client";

import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function LoginPage() {
  const {
    session,
    loading,
    busy,
    signingUp,
    error,
    message,
    isConfigured,
    submit,
    signOut,
    toggleMode,
  } = useAuth();

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>
            {session
              ? "Your account"
              : signingUp
                ? "Create an account"
                : "Sign in"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isConfigured ? (
            <p role="alert">
              Set NEXT_PUBLIC_SUPABASE_URL and
              NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local, then restart
              the app.
            </p>
          ) : loading ? (
            <p role="status">Loading your session…</p>
          ) : session ? (
            <>
              <p>Signed in as {session.user.email}</p>
              <Button onClick={signOut} disabled={busy}>
                Sign out
              </Button>
            </>
          ) : (
            <>
              <form onSubmit={submit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    disabled={busy}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete={
                      signingUp ? "new-password" : "current-password"
                    }
                    required
                    disabled={busy}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy
                    ? "Please wait…"
                    : signingUp
                      ? "Create account"
                      : "Sign in"}
                </Button>
              </form>
              <Button variant="link" disabled={busy} onClick={toggleMode}>
                {signingUp
                  ? "Already have an account? Sign in"
                  : "New here? Sign up"}
              </Button>
            </>
          )}
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          {message && (
            <p role="status" className="text-sm">
              {message}
            </p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
