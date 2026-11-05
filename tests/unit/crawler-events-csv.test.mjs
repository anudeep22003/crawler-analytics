import assert from "node:assert/strict";
import { test } from "node:test";
import Papa from "papaparse";
import {
  EXPORT_COLUMNS,
  serializeEventBatch,
} from "../../lib/crawler-events-csv.mjs";

test("serializes fixed columns, nulls, Unicode, commas, quotes, and newlines", () => {
  const row = {
    id: "event",
    page_url: 'https://example.com/α?a="one,two"',
    user_agent: "Bot\r\nSecond line",
    ip_hash: null,
  };
  const csv = serializeEventBatch([], true) + serializeEventBatch([row]);
  const parsed = Papa.parse(csv, { header: true, skipEmptyLines: true });
  assert.deepEqual(parsed.errors, []);
  assert.deepEqual(parsed.meta.fields, EXPORT_COLUMNS);
  assert.equal(parsed.data.length, 1);
  assert.equal(parsed.data[0].page_url, row.page_url);
  assert.equal(parsed.data[0].user_agent, row.user_agent);
  assert.equal(parsed.data[0].ip_hash, "");
});

test("writes one header across batches and a header-only empty export", () => {
  const header = serializeEventBatch([], true);
  assert.deepEqual(
    Papa.parse(header, { header: true, skipEmptyLines: true }).data,
    [],
  );
  const csv =
    header +
    serializeEventBatch([{ id: "first" }]) +
    serializeEventBatch([{ id: "second" }]);
  assert.deepEqual(
    Papa.parse(csv, { header: true, skipEmptyLines: true }).data.map(
      (row) => row.id,
    ),
    ["first", "second"],
  );
});

test("protects spreadsheet-formula prefixes", () => {
  const values = [
    "=1+1",
    "+SUM(A1)",
    "-1+2",
    "@SUM(A1)",
    "\tformula",
    "\rformula",
  ];
  const csv = serializeEventBatch(
    values.map((user_agent) => ({ user_agent })),
    true,
  );
  const { data } = Papa.parse(csv, { header: true, skipEmptyLines: true });
  assert.deepEqual(
    data.map((row) => row.user_agent),
    values.map((value) => `'${value}`),
  );
});
