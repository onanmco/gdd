import { createServer } from "node:http";
import type { Server } from "node:http";
import { appendFile, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, extname, join, resolve } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const mimeTypes: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mmd": "text/plain; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml"
};

export async function prepareVisualCompanion(planDir: string): Promise<string> {
  const root = resolve(planDir, "visual");
  await mkdir(root, { recursive: true });
  await ensureFile(join(root, "index.html"), await readTemplate("visual/index.html"));
  const url = pathToFileURL(join(root, "index.html")).href;
  console.log(`GDD visual companion: ${url}`);
  return url;
}

export async function prepareDiagramCompanion(planDir: string): Promise<string> {
  const root = resolve(planDir, "diagrams");
  await mkdir(root, { recursive: true });
  const flowchartPath = join(root, "flowchart.mmd");
  const sequencePath = join(root, "sequence.mmd");

  await ensureFile(flowchartPath, "flowchart TD\n    A[Start] --> B[Draft project-specific flow]\n");
  await ensureFile(sequencePath, "sequenceDiagram\n    participant User\n    participant System\n    User->>System: Start workflow\n");

  const [flowchart, sequence] = await Promise.all([
    readFile(flowchartPath, "utf8"),
    readFile(sequencePath, "utf8")
  ]);
  await writeFile(join(root, "index.html"), diagramViewerHtml(flowchart, sequence));

  const url = pathToFileURL(join(root, "index.html")).href;
  console.log(`GDD diagrams: ${url}`);
  return url;
}

export async function startVisualCompanion(visualDir: string, port?: number): Promise<string> {
  return startStaticServer(visualDir, port ?? 4377, "GDD visual companion", true);
}

async function startStaticServer(
  rootDir: string,
  preferredPort: number,
  label: string,
  captureEvents: boolean
): Promise<string> {
  const root = resolve(rootDir);
  await mkdir(root, { recursive: true });

  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? "/", `http://localhost:${preferredPort}`);

      if (captureEvents && request.method === "POST" && url.pathname === "/events") {
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

  const actualPort = await listenOnAvailablePort(server, preferredPort);
  const url = `http://127.0.0.1:${actualPort}`;
  console.log(`${label}: ${url}`);
  return url;
}

async function listenOnAvailablePort(server: Server, preferredPort: number): Promise<number> {
  for (let offset = 0; offset < 50; offset += 1) {
    const port = preferredPort + offset;
    try {
      await new Promise<void>((resolveServer, reject) => {
        server.once("error", reject);
        server.listen(port, "127.0.0.1", () => {
          server.off("error", reject);
          resolveServer();
        });
      });
      return port;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EADDRINUSE") {
        throw error;
      }
    }
  }

  throw new Error(`No available port found starting at ${preferredPort}.`);
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

async function ensureFile(path: string, content: string): Promise<void> {
  try {
    await writeFile(path, content, { flag: "wx" });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
      throw error;
    }
  }
}

async function readTemplate(relativePath: string): Promise<string> {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  return readFile(resolve(currentDir, "..", "..", "templates", relativePath), "utf8");
}

function diagramViewerHtml(flowchart: string, sequence: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>GDD Diagrams</title>
    <script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
    <style>
      :root { color-scheme: light; font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
      body { margin: 0; background: #f7f8fb; color: #172033; }
      main { max-width: 1180px; margin: 0 auto; padding: 32px; }
      h1 { margin: 0 0 24px; font-size: 28px; }
      section { margin: 24px 0; padding: 24px; background: #fff; border: 1px solid #d9e0ec; border-radius: 8px; overflow-x: auto; }
      h2 { margin: 0 0 16px; font-size: 18px; }
    </style>
  </head>
  <body>
    <main>
      <h1>GDD Diagrams</h1>
      <section>
        <h2>Flowchart</h2>
        <pre class="mermaid">${escapeHtml(flowchart)}</pre>
      </section>
      <section>
        <h2>Sequence</h2>
        <pre class="mermaid">${escapeHtml(sequence)}</pre>
      </section>
    </main>
    <script>mermaid.initialize({ startOnLoad: true });</script>
  </body>
</html>
`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
