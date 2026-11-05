import { EXPORT_COLUMNS, serializeEventBatch } from "./crawler-events-csv.ts";

const EXPORT_BATCH_SIZE = 500;
const CURSOR_COLUMNS = "timestamp, id";
const EVENTS_TABLE = "crawler_events";

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} client
 * @param {string} siteId
 * @param {{signal: AbortSignal, onProgress?: (count: number) => void | Promise<void>, batchSize?: number}} options
 */
export async function buildSiteCsv(
  client,
  siteId,
  { signal, onProgress = () => {}, batchSize = EXPORT_BATCH_SIZE },
) {
  const chunks = [serializeEventBatch([], true)];
  let exportedCount = 0;

  // Bound this export at the newest visible event, independent of dashboard filters.
  const { data: end, error: endError } = await client
    .from(EVENTS_TABLE)
    .select(CURSOR_COLUMNS)
    .eq("site_id", siteId)
    .order("timestamp", { ascending: false })
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle()
    .abortSignal(signal);
  if (endError) throw endError;
  if (!end) return chunks;

  let cursor = null;
  while (true) {
    signal.throwIfAborted();
    let query = client
      .from(EVENTS_TABLE)
      .select(EXPORT_COLUMNS.join(","))
      .eq("site_id", siteId)
      .or(
        `timestamp.lt.${end.timestamp},and(timestamp.eq.${end.timestamp},id.lte.${end.id})`,
      )
      .order("timestamp", { ascending: true })
      .order("id", { ascending: true })
      .limit(batchSize);

    // Keep the database timestamp string intact, including sub-millisecond precision.
    if (cursor)
      query = query.or(
        `timestamp.gt.${cursor.timestamp},and(timestamp.eq.${cursor.timestamp},id.gt.${cursor.id})`,
      );

    const { data: rows, error } = await query.abortSignal(signal);
    if (error) throw error;
    if (!rows?.length) break;

    chunks.push(serializeEventBatch(rows));
    exportedCount += rows.length;
    await onProgress(exportedCount);

    const last = rows[rows.length - 1];
    cursor = { timestamp: last.timestamp, id: last.id };
    if (last.id === end.id) break;
    // A short batch may reflect the API row cap; only exhaustion ends pagination.
  }

  signal.throwIfAborted();
  return chunks;
}
