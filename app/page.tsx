"use client";

import { useState } from "react";

export default function HomePage() {
  const [response, setResponse] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function sayHello() {
    console.log("Hello world");
    setIsLoading(true);
    setError(null);
    setResponse(null);

    try {
      const functionUrl = process.env.NEXT_PUBLIC_HELLO_FUNCTION_URL;
      if (!functionUrl) {
        throw new Error(
          "Set NEXT_PUBLIC_HELLO_FUNCTION_URL in .env.local and restart Next.js.",
        );
      }

      const result = await fetch(functionUrl, { method: "POST" });
      if (!result.ok) {
        throw new Error(`The function returned HTTP ${result.status}.`);
      }

      const data = await result.json();
      setResponse(JSON.stringify(data, null, 2));
    } catch (error) {
      setError(error instanceof Error ? error.message : "The request failed.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main>
      <p className="eyebrow">Crawler Analytics / First connection</p>
      <h1>Hello world</h1>
      <p>Send a request to our Supabase Edge Function.</p>
      <button onClick={sayHello} disabled={isLoading}>
        {isLoading ? "Sending…" : "Say hello"}
      </button>
      <div aria-live="polite">
        {response && <pre>{response}</pre>}
        {error && <p role="alert">{error}</p>}
      </div>
    </main>
  );
}
