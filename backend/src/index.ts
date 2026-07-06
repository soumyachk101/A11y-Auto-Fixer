import express, { type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import { createServer } from "node:http";
import { WebSocketServer } from "ws";
import { config } from "./config.js";
import { router } from "./routes/index.js";
import { subscribe } from "./lib/wsHub.js";
import { closeBrowser } from "./services/scanEngine.js";
import { prisma } from "./lib/prisma.js";
import { ApiError } from "./types/index.js";

const app = express();
app.use(cors({ origin: config.allowedOrigin }));
app.use(express.json({ limit: "3mb" }));

app.get("/", (req, res) => {
  res.json({ status: "ok", message: "AccessLens API is running!" });
});

app.use("/api", router);

// Consistent error envelope (Docs/04 conventions)
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ApiError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message } });
    return;
  }
  console.error("[api] unhandled error:", err);
  res.status(500).json({ error: { code: "INTERNAL", message: "Something went wrong." } });
});

const server = createServer(app);

// WS /ws/scans/:id — scan progress stream (Docs/04 §5)
const wss = new WebSocketServer({ noServer: true });
server.on("upgrade", (req, socket, head) => {
  const match = req.url?.match(/^\/ws\/scans\/([\w-]+)$/);
  if (!match) {
    socket.destroy();
    return;
  }
  const scanId = match[1]!;
  wss.handleUpgrade(req, socket, head, (ws) => subscribe(scanId, ws));
});

server.listen(config.port, () => {
  console.log(`AccessLens API listening on http://localhost:${config.port}`);
  if (!config.anthropicApiKey) {
    console.warn(
      "ANTHROPIC_API_KEY not set — AI fixes degrade to flagged placeholders; contrast/lang/structure fixes still work.",
    );
  }
});

async function shutdown(): Promise<void> {
  await Promise.allSettled([closeBrowser(), prisma.$disconnect()]);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 3000).unref();
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
