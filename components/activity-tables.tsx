import type { PageCount, RecentEvent } from "@/lib/site-activity";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function TopPages({ pages }: { pages: PageCount[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top pages</CardTitle>
        <p className="text-sm text-muted-foreground">
          Up to 10 paths, ranked by recorded visits. Query strings are grouped
          together.
        </p>
      </CardHeader>
      <CardContent>
        {pages.length === 0 ? (
          <p>No pages in this selection.</p>
        ) : (
          <table className="w-full text-left text-sm" aria-label="Top pages">
            <thead>
              <tr className="border-b">
                <th scope="col" className="py-2">
                  Page
                </th>
                <th scope="col" className="py-2 text-right">
                  Visits
                </th>
              </tr>
            </thead>
            <tbody>
              {pages.map((page) => (
                <tr key={page.page_path} className="border-b last:border-0">
                  <td className="break-all py-3 pr-4">{page.page_path}</td>
                  <td className="py-3 text-right tabular-nums">
                    {page.visits.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}

type EventRow = RecentEvent & { timestampLabel: string; botTypeLabel: string };

export function RecentActivity({ events }: { events: EventRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent activity</CardTitle>
        <p className="text-sm text-muted-foreground">
          Latest 50 matching events. Times are UTC.
        </p>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p>No events in this selection.</p>
        ) : (
          <div className="overflow-x-auto">
            <table
              className="w-full text-left text-sm"
              aria-label="Recent activity"
            >
              <thead>
                <tr className="border-b">
                  {[
                    "Time (UTC)",
                    "Page",
                    "Bot",
                    "Platform",
                    "Type",
                    "User agent",
                  ].map((label) => (
                    <th
                      key={label}
                      scope="col"
                      className="whitespace-nowrap p-2"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.id} className="border-b last:border-0">
                    <td className="whitespace-nowrap p-2">
                      {event.timestampLabel}
                    </td>
                    <td
                      className="max-w-48 truncate p-2"
                      title={event.page_url}
                    >
                      {event.page_path}
                    </td>
                    <td className="whitespace-nowrap p-2">{event.bot_name}</td>
                    <td className="whitespace-nowrap p-2">{event.platform}</td>
                    <td className="whitespace-nowrap p-2">
                      {event.botTypeLabel}
                    </td>
                    <td
                      className="max-w-48 truncate p-2"
                      title={event.user_agent}
                    >
                      {event.user_agent}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
