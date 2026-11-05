"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";

const POLL_INTERVAL_MS = 2_000;
const CHECK_TIMEOUT_MS = 60_000;
const CHECK_PARAMETER = "tracker_test";
const MAX_URL_LENGTH = 4096;
const ALLOWED_PROTOCOLS = ["http:", "https:"];

export function useInstallationCheck(siteId: string, domain: string) {
  const [isChecking, setIsChecking] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const activeRequest = useRef<AbortController | null>(null);

  useEffect(() => () => activeRequest.current?.abort(), [siteId]);

  async function startCheck(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (activeRequest.current) return;

    const controller = new AbortController();
    activeRequest.current = controller;
    setIsChecking(true);
    setError("");
    setMessage("");
    let testWindow: Window | null = null;
    let openedPage = false;

    try {
      const target = new URL(
        String(new FormData(event.currentTarget).get("page_url")),
      );
      if (
        !ALLOWED_PROTOCOLS.includes(target.protocol) ||
        target.hostname !== domain ||
        target.username ||
        target.password
      ) {
        throw new Error(
          `Enter an HTTP or HTTPS page on ${domain}. A local port is allowed.`,
        );
      }
      if (!supabase) throw new Error("Supabase is not configured.");

      // Open synchronously during the click to avoid popup blocking after an await.
      testWindow = window.open("about:blank", "_blank");
      if (!testWindow)
        throw new Error("Allow popups for this dashboard, then try again.");
      testWindow.opener = null;

      const { data: check, error: createError } = await supabase
        .from("installation_checks")
        .insert({ site_id: siteId })
        .select("id")
        .abortSignal(controller.signal)
        .single();
      if (createError)
        throw new Error("Could not start the check. Please try again.");
      controller.signal.throwIfAborted();

      target.searchParams.set(CHECK_PARAMETER, check.id);
      if (target.href.length > MAX_URL_LENGTH)
        throw new Error("The page URL is too long.");
      if (testWindow.closed)
        throw new Error("The test tab was closed. Please try again.");
      testWindow.location.replace(target.href);
      openedPage = true;
      setMessage(
        "Waiting for the tracker. Return here after the test page opens.",
      );

      // Poll only this attempt; an earlier success must not confirm a new check.
      const deadline = performance.now() + CHECK_TIMEOUT_MS;
      while (performance.now() < deadline) {
        controller.signal.throwIfAborted();
        const { data, error: pollError } = await supabase
          .from("installation_checks")
          .select("received_at")
          .eq("id", check.id)
          .eq("site_id", siteId)
          .abortSignal(controller.signal)
          .single();
        if (pollError)
          throw new Error("Could not read the check result. Please try again.");
        controller.signal.throwIfAborted();
        if (data.received_at) {
          setMessage(
            "Tracking signal received. The snippet works on the page you checked.",
          );
          return;
        }
        await new Promise<void>((resolve) =>
          setTimeout(resolve, POLL_INTERVAL_MS),
        );
      }
      setMessage(
        "No signal received within one minute. Check the snippet and try again.",
      );
    } catch (error) {
      if (!controller.signal.aborted) {
        setMessage("");
        setError(
          error instanceof Error ? error.message : "Installation check failed.",
        );
      }
    } finally {
      if (testWindow && !openedPage) testWindow.close();
      if (activeRequest.current === controller) activeRequest.current = null;
      if (!controller.signal.aborted) setIsChecking(false);
    }
  }

  return { startCheck, isChecking, message, error };
}
