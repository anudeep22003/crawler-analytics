"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export function useAuth() {
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

  function toggleMode() {
    setSigningUp(!signingUp);
    setError("");
    setMessage("");
  }

  return {
    session,
    loading,
    busy,
    signingUp,
    error,
    message,
    isConfigured: Boolean(supabase),
    submit,
    signOut,
    toggleMode,
  };
}
