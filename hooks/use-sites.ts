"use client";

import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import { normalizeDomain } from "@/lib/normalize-domain";

type Site = { id: string; domain: string };

export function useSites(userId: string) {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    async function loadSites() {
      if (!supabase) return;
      try {
        const { data, error } = await supabase
          .from("sites")
          .select("id, domain")
          .eq("user_id", userId)
          .order("created_at");
        if (error) throw error;
        if (active) setSites(data ?? []);
      } catch {
        if (active)
          setError("Could not load your sites. Refresh to try again.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadSites();
    return () => {
      active = false;
    };
  }, [userId]);

  async function addSite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    const form = event.currentTarget;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const domain = normalizeDomain(String(new FormData(form).get("domain")));
      const { data, error } = await supabase
        .from("sites")
        .insert({ user_id: userId, domain })
        .select("id, domain")
        .single();
      if (error)
        throw new Error(
          error.code === "23505"
            ? "You have already added this domain."
            : "Could not save your site. Please try again.",
        );
      setSites((sites) => [...sites, data]);
      setMessage(`Added ${data.domain}.`);
      form.reset();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Could not save your site.",
      );
    } finally {
      setSaving(false);
    }
  }

  return { sites, loading, saving, error, message, addSite };
}
