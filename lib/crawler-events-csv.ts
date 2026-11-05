import Papa from "papaparse";

export const EXPORT_COLUMNS = [
  "id",
  "site_id",
  "timestamp",
  "page_url",
  "page_path",
  "bot_name",
  "platform",
  "bot_type",
  "user_agent",
  "ip_hash",
];
export type CrawlerEventRow = {
  id: string;
  site_id: string;
  timestamp: string;
  page_url: string;
  page_path: string;
  bot_name: string | null;
  platform: string | null;
  bot_type: string | null;
  user_agent: string;
  ip_hash: string | null;
};

const CSV_NEWLINE = "\r\n";

export function serializeEventBatch(
  rows: Partial<CrawlerEventRow>[],
  includeHeader = false,
): string {
  // Papa Parse handles quoted text and spreadsheet-formula protection.
  return (
    Papa.unparse(
      { fields: EXPORT_COLUMNS, data: rows },
      {
        header: includeHeader,
        newline: CSV_NEWLINE,
        escapeFormulae: true,
      },
    ) + CSV_NEWLINE
  );
}
