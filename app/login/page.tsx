"use client";

import { Eye, EyeOff } from "lucide-react";
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
    passwordVisible,
    error,
    message,
    isConfigured,
    submit,
    signOut,
    toggleMode,
    togglePasswordVisibility,
  } = useAuth();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        Crawler Analytics
      </h1>
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
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={passwordVisible ? "text" : "password"}
                      autoComplete={
                        signingUp ? "new-password" : "current-password"
                      }
                      required
                      disabled={busy}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      className="absolute inset-y-0 right-1 my-auto"
                      aria-label={
                        passwordVisible ? "Hide password" : "Show password"
                      }
                      aria-controls="password"
                      disabled={busy}
                      onClick={togglePasswordVisibility}
                    >
                      {passwordVisible ? (
                        <EyeOff aria-hidden="true" />
                      ) : (
                        <Eye aria-hidden="true" />
                      )}
                    </Button>
                  </div>
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
