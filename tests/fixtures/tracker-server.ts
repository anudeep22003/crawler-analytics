import { readFile } from "node:fs/promises";
import { createServer } from "node:http";

const tracker = await readFile(
  new URL("../../public/tracker.js", import.meta.url),
);
createServer((request, response) => {
  if (request.url !== "/tracker.js") {
    response.writeHead(404).end("Not found");
    return;
  }
  response.writeHead(200, { "Content-Type": "application/javascript" });
  response.end(tracker);
}).listen(3003, "127.0.0.1");
