import { readFile } from "node:fs/promises";
import { createServer } from "node:http";

const page = await readFile(new URL("./index.html", import.meta.url));
const SITE_ID_PATTERN = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

createServer((request, response) => {
  const url = new URL(request.url, "http://127.0.0.1:3001");
  if (url.pathname !== "/") {
    response.writeHead(404).end("Not found");
    return;
  }

  const siteId = url.searchParams.get("site_id") ?? "";
  if (siteId && !SITE_ID_PATTERN.test(siteId)) {
    response.writeHead(400).end("Invalid site ID");
    return;
  }

  response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  response.end(page.toString().replace("__SITE_ID__", siteId));
}).listen(3001, "127.0.0.1");
