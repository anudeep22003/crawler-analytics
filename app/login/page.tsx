"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function LoginPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [signingUp, setSigningUp] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    const form = event.currentTarget;
    const fields = new FormData(form);
    const credentials = {
      email: String(fields.get("email")).trim(),
      password: String(fields.get("password")),
    };
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const { data, error } = signingUp
        ? await supabase.auth.signUp({
            ...credentials,
            options: { emailRedirectTo: `${window.location.origin}/login` },
          })
        : await supabase.auth.signInWithPassword(credentials);
      if (error) throw error;
      form.reset();
      if (signingUp && !data.session)
        setMessage("Check your email to confirm your account, then sign in.");
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to authenticate. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    if (!supabase) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to sign out. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

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
          {!supabase ? (
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
              <Button
                variant="link"
                disabled={busy}
                onClick={() => {
                  setSigningUp(!signingUp);
                  setError("");
                  setMessage("");
                }}
              >
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
