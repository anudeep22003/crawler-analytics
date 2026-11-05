"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { useParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useSiteInstallation } from "@/hooks/use-site-installation";
import { Button } from "@/components/ui/button";
import { SiteActivity } from "@/components/site-activity";
import { SiteExport } from "@/components/site-export";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

function SiteInstallation({
  siteId,
  userId,
}: {
  siteId: string;
  userId: string;
}) {
  const { site, loading, error, snippet, copyMessage, copySnippet } =
    useSiteInstallation(siteId, userId);
  if (loading) return <p role="status">Loading site…</p>;
  if (error || !site) return <p role="alert">{error}</p>;

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">{site.domain}</h1>
      <Collapsible className="rounded-lg border">
        <h2>
          <CollapsibleTrigger className="group flex w-full items-center justify-between rounded-lg p-4 text-left text-lg font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            Install tracking
            <ChevronDown
              aria-hidden="true"
              className="size-4 transition-transform group-aria-expanded:rotate-180"
            />
          </CollapsibleTrigger>
        </h2>
        <CollapsibleContent className="space-y-4 px-4 pb-4">
          <ol className="list-decimal space-y-2 pl-5">
            <li>Copy the snippet below.</li>
            <li>
              Paste it once inside the <code>&lt;head&gt;</code> of each page
              you want to track, or your shared website template.
            </li>
            <li>Publish your changes and open a page to send a test visit.</li>
          </ol>
          <p className="text-sm text-muted-foreground">
            Use the snippet from your deployed dashboard for a live website.
            Localhost URLs work only on your development computer.
          </p>
          <pre className="overflow-x-auto rounded-lg border p-4 text-sm">
            <code>{snippet}</code>
          </pre>
          <Button onClick={copySnippet}>Copy snippet</Button>
          {copyMessage && <p role="status">{copyMessage}</p>}
          <p className="text-sm text-muted-foreground">
            Visits are saved by the collector. Crawlers that do not execute
            JavaScript will not send visits.
          </p>
        </CollapsibleContent>
      </Collapsible>
      <SiteExport siteId={site.id} />
      <SiteActivity siteId={site.id} />
    </section>
  );
}

export default function SitePage() {
  const { site_id } = useParams<{ site_id: string }>();
  const { session, loading } = useAuth({ requireSession: true });
  if (loading || !session)
    return (
      <p role="status" className="p-6">
        Loading your account…
      </p>
    );

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <Link href="/dashboard" className="underline">
        Back to sites
      </Link>
      <SiteInstallation
        key={`${session.user.id}:${site_id}`}
        siteId={site_id}
        userId={session.user.id}
      />
    </main>
  );
}
