import { readFile } from "node:fs/promises";
import { createServer } from "node:http";

const page = await readFile(new URL("./index.html", import.meta.url));

createServer((request, response) => {
  if (request.url !== "/") {
    response.writeHead(404).end("Not found");
    return;
  }

  response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  response.end(page);
}).listen(3001, "127.0.0.1");
