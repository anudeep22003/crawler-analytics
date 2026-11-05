import type { SupabaseClient } from "@supabase/supabase-js";
import {
  EXPORT_COLUMNS,
  serializeEventBatch,
  type CrawlerEventRow,
} from "./crawler-events-csv.ts";

const EXPORT_BATCH_SIZE = 500;
const CURSOR_COLUMNS = "timestamp, id";
const EVENTS_TABLE = "crawler_events";

type EventCursor = Pick<CrawlerEventRow, "timestamp" | "id">;
type ExportOptions = {
  signal: AbortSignal;
  onProgress?: (count: number) => void | Promise<void>;
  batchSize?: number;
};

/**
 * Export in ascending (timestamp, id) order using keyset pagination.
 * A timestamp alone cannot identify a page boundary: multiple events can share it.
 * Postgres orders UUIDs, so id provides a deterministic tie-breaker, not a clock.
 *
 * Capture an inclusive upper bound at the start, then advance a strict lower
 * bound after each batch. This includes same-timestamp siblings without repeating
 * the last row. Preserve timestamp strings: JavaScript Dates lose microseconds.
 *
 * Separate requests are not a database snapshot. Backdated inserts, updates, or
 * deletions during export can still affect results within the captured bounds.
 */
export async function buildSiteCsv(
  supabase: SupabaseClient,
  siteId: string,
  {
    signal,
    onProgress = () => {},
    batchSize = EXPORT_BATCH_SIZE,
  }: ExportOptions,
): Promise<string[]> {
  const chunks = [serializeEventBatch([], true)];
  let exportedCount = 0;

  // Find the greatest (timestamp, id) pair visible to this user for this site.
  // Dashboard filters are deliberately absent: the export includes every date.
  const { data: end, error: endError } = await supabase
    .from(EVENTS_TABLE)
    .select(CURSOR_COLUMNS)
    .eq("site_id", siteId)
    .order("timestamp", { ascending: false })
    .order("id", { ascending: false })
    .limit(1)
    .abortSignal(signal)
    .maybeSingle()
    .returns<EventCursor | null>();
  if (endError) throw endError;
  if (!end) return chunks;

  let cursor: EventCursor | null = null;
  while (true) {
    signal.throwIfAborted();

    // Upper bound: earlier timestamps OR the same timestamp with id <= end.id.
    // The UUID comparison caps the final group of simultaneous events precisely.
    let query = supabase
      .from(EVENTS_TABLE)
      .select(EXPORT_COLUMNS.join(","))
      .eq("site_id", siteId)
      .or(
        `timestamp.lt.${end.timestamp},and(timestamp.eq.${end.timestamp},id.lte.${end.id})`,
      )
      .order("timestamp", { ascending: true })
      .order("id", { ascending: true })
      .limit(batchSize);

    // Lower bound: later timestamps OR the same timestamp with id > cursor.id.
    // Using only timestamp > cursor.timestamp would skip siblings across batches.
    // The two .or() groups are ANDed together by PostgREST, retaining both bounds.
    if (cursor)
      query = query.or(
        `timestamp.gt.${cursor.timestamp},and(timestamp.eq.${cursor.timestamp},id.gt.${cursor.id})`,
      );

    // Fetch only one batch of JSON; retain CSV chunks rather than all row objects.
    const { data: rows, error } = await query
      .returns<CrawlerEventRow[]>()
      .abortSignal(signal);
    if (error) throw error;
    if (!rows?.length) break;

    chunks.push(serializeEventBatch(rows));
    exportedCount += rows.length;
    await onProgress(exportedCount);

    // Advance using the exact values returned by Postgres, including UUID ties.
    const last = rows[rows.length - 1];
    cursor = { timestamp: last.timestamp, id: last.id };
    if (last.id === end.id) break;
    // Do not stop merely because rows.length < batchSize: the API may cap rows.
    // Stop only at the captured final event or an empty subsequent batch.
  }

  signal.throwIfAborted();
  return chunks;
}
