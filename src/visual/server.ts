import { createServer } from "node:http";
import { appendFile, mkdir, readFile, stat } from "node:fs/promises";
import { extname, join, resolve } from "node:path";

const mimeTypes: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml"
};

export async function startVisualCompanion(visualDir: string, port: number): Promise<void> {
  const root = resolve(visualDir);
  await mkdir(root, { recursive: true });

  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? "/", `http://localhost:${port}`);

      if (request.method === "POST" && url.pathname === "/events") {
        const body = await readBody(request);
        await appendFile(join(root, "events.ndjson"), `${body}\n`);
        response.writeHead(204);
        response.end();
        return;
      }

      const filePath = safeResolve(root, url.pathname === "/" ? "/index.html" : url.pathname);
      const fileStats = await stat(filePath);
      if (!fileStats.isFile()) {
        response.writeHead(404);
        response.end("Not found");
        return;
      }

      const content = await readFile(filePath);
      response.writeHead(200, {
        "content-type": mimeTypes[extname(filePath)] ?? "application/octet-stream"
      });
      response.end(content);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      response.writeHead(message === "Forbidden" ? 403 : 404);
      response.end(message);
    }
  });

  await new Promise<void>((resolveServer) => {
    server.listen(port, "127.0.0.1", resolveServer);
  });

  console.log(`GDD visual companion: http://127.0.0.1:${port}`);
}

function safeResolve(root: string, requestPath: string): string {
  const target = resolve(root, `.${requestPath}`);
  if (!target.startsWith(root)) {
    throw new Error("Forbidden");
  }
  return target;
}

function readBody(request: NodeJS.ReadableStream): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      body += chunk;
    });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}
