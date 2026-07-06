import type { WebSocket } from "ws";
import type { WsStageMessage } from "../types/index.js";

/**
 * Broadcast hub for scan-progress WebSockets (/ws/scans/:id — Docs/04 §5).
 * Keeps the latest message per scan so late-connecting clients catch up.
 */

const channels = new Map<string, Set<WebSocket>>();
const lastMessage = new Map<string, WsStageMessage>();

export function subscribe(scanId: string, ws: WebSocket): void {
  let set = channels.get(scanId);
  if (!set) {
    set = new Set();
    channels.set(scanId, set);
  }
  set.add(ws);

  const last = lastMessage.get(scanId);
  if (last) ws.send(JSON.stringify(last));

  ws.on("close", () => {
    set.delete(ws);
    if (set.size === 0) channels.delete(scanId);
  });
}

export function publish(scanId: string, message: WsStageMessage): void {
  lastMessage.set(scanId, message);
  const payload = JSON.stringify(message);
  for (const ws of channels.get(scanId) ?? []) {
    if (ws.readyState === ws.OPEN) ws.send(payload);
  }
  // Terminal stages: drop the cached message after a grace period.
  if (message.stage === "complete" || message.stage === "failed") {
    setTimeout(() => lastMessage.delete(scanId), 5 * 60_000).unref();
  }
}
