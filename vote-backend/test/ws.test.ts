import { SELF } from "cloudflare:test";
import { describe, it, expect } from "vitest";

const BASE = "https://example.com";
const ADMIN = "test-secret";
const OPTS = [
  { id: "a", name: "A" },
  { id: "b", name: "B" },
];

function init(id: string) {
  return SELF.fetch(`${BASE}/api/poll/${id}/init`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${ADMIN}` },
    body: JSON.stringify({ options: OPTS, deadline: null, reset: true }),
  });
}

function vote(id: string, optionId: string, voterToken: string) {
  return SELF.fetch(`${BASE}/api/poll/${id}/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ optionId, voterToken }),
  });
}

async function connect(id: string) {
  const res = await SELF.fetch(`${BASE}/api/poll/${id}/ws`, { headers: { Upgrade: "websocket" } });
  return res;
}

function nextMessage(ws: WebSocket, timeoutMs = 3000): Promise<any> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("ws message timeout")), timeoutMs);
    ws.addEventListener(
      "message",
      (e: MessageEvent) => {
        clearTimeout(t);
        resolve(JSON.parse(e.data as string));
      },
      { once: true },
    );
  });
}

describe("websocket", () => {
  it("upgrades to a WebSocket (101)", async () => {
    await init("ws-up");
    const res = await connect("ws-up");
    expect(res.status).toBe(101);
    const ws = (res as any).webSocket as WebSocket;
    expect(ws).toBeTruthy();
    ws.accept();
    ws.close();
  });

  it("pushes current state + a watching count on connect", async () => {
    await init("ws-state");
    const res = await connect("ws-state");
    const ws = (res as any).webSocket as WebSocket;
    ws.accept();
    const msg = await nextMessage(ws);
    expect(msg.type).toBe("state");
    expect(msg.counts).toEqual({ a: 0, b: 0 });
    expect(msg.watching).toBeGreaterThanOrEqual(1);
    ws.close();
  });

  it("broadcasts a live update when a vote lands", async () => {
    await init("ws-live");
    const res = await connect("ws-live");
    const ws = (res as any).webSocket as WebSocket;
    ws.accept();
    await nextMessage(ws); // initial state on connect
    const updated = nextMessage(ws); // listener attached before voting
    await vote("ws-live", "a", "device-1");
    const msg = await updated;
    expect(msg.type).toBe("state");
    expect(msg.counts.a).toBe(1);
    expect(msg.total).toBe(1);
    ws.close();
  });
});
