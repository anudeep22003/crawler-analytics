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
const CSV_NEWLINE = "\r\n";

/** @param {Array<Record<string, string | null>>} rows */
export function serializeEventBatch(rows, includeHeader = false) {
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
