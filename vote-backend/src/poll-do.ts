import type { Env, PollOption, PollStateResponse, InitBody, VoteBody } from "./types";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export class PollDO {
  private state: DurableObjectState;
  private storage: DurableObjectStorage;
  private env: Env;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.storage = state.storage;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const parts = url.pathname.split("/").filter(Boolean); // ["api","poll","<id>","<action?>"]
    const id = parts[2] ?? "";
    const action = parts[3] ?? "";

    if (action === "ws" && request.headers.get("Upgrade") === "websocket") {
      return this.handleSocket(id);
    }
    if (request.method === "POST" && action === "init") return this.init(request, id);
    if (request.method === "POST" && action === "vote") return this.vote(request, id);
    if (request.method === "GET" && action === "") return json(await this.snapshot(id));
    return json({ error: "not_found" }, 404);
  }

  // Accept a hibernatable WebSocket; push current state to it and update presence.
  private async handleSocket(id: string): Promise<Response> {
    if (id) await this.storage.put("pollId", id);
    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    this.state.acceptWebSocket(server);
    await this.broadcastState();
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    if (message === "ping") {
      try {
        ws.send(JSON.stringify({ type: "pong" }));
      } catch {}
    }
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    try {
      ws.close();
    } catch {}
    await this.broadcastState();
  }

  // Send the live poll state + current viewer count to every connected socket.
  private async broadcastState(): Promise<void> {
    const sockets = this.state.getWebSockets();
    if (sockets.length === 0) return;
    const id = (await this.storage.get<string>("pollId")) ?? "";
    const snap = await this.snapshot(id);
    const msg = JSON.stringify({ type: "state", ...snap, watching: sockets.length });
    for (const ws of sockets) {
      try {
        ws.send(msg);
      } catch {}
    }
  }

  private async init(request: Request, id: string): Promise<Response> {
    const auth = request.headers.get("Authorization") ?? "";
    if (auth !== `Bearer ${this.env.ADMIN_SECRET}`) {
      return json({ error: "unauthorized" }, 401);
    }
    let body: InitBody;
    try {
      body = (await request.json()) as InitBody;
    } catch {
      return json({ error: "bad_request" }, 400);
    }
    if (!Array.isArray(body.options) || body.options.length === 0) {
      return json({ error: "options_required" }, 400);
    }

    if (body.reset) {
      await this.storage.deleteAll(); // clears counts, voters, options, deadline
    }
    const prev = (await this.storage.get<Record<string, number>>("counts")) ?? {};
    const counts: Record<string, number> = {};
    for (const o of body.options) {
      counts[o.id] = body.reset ? 0 : prev[o.id] ?? 0;
    }

    await this.storage.put("pollId", id);
    await this.storage.put("options", body.options);
    await this.storage.put("deadline", body.deadline ?? null);
    await this.storage.put("counts", counts);

    await this.broadcastState();
    return json(await this.snapshot(id));
  }

  private async vote(request: Request, id: string): Promise<Response> {
    let body: VoteBody;
    try {
      body = (await request.json()) as VoteBody;
    } catch {
      return json({ error: "bad_request" }, 400);
    }
    if (
      typeof body.optionId !== "string" ||
      typeof body.voterToken !== "string" ||
      !body.optionId ||
      !body.voterToken
    ) {
      return json({ error: "bad_request" }, 400);
    }

    const options = (await this.storage.get<PollOption[]>("options")) ?? [];
    if (options.length === 0) {
      return json({ error: "poll_not_initialized" }, 409);
    }
    if (!options.some((o) => o.id === body.optionId)) {
      return json({ error: "unknown_option" }, 400);
    }
    if (await this.isClosed()) {
      return json({ error: "poll_closed" }, 409);
    }

    const voterKey = `v:${body.voterToken}`;
    const already = await this.storage.get<string>(voterKey);
    if (already) {
      // Idempotent: this device already voted — return state unchanged.
      return json(await this.snapshot(id));
    }

    const counts = (await this.storage.get<Record<string, number>>("counts")) ?? {};
    counts[body.optionId] = (counts[body.optionId] ?? 0) + 1;
    await this.storage.put("counts", counts);
    await this.storage.put(voterKey, body.optionId);

    await this.broadcastState();
    return json(await this.snapshot(id));
  }

  private async isClosed(): Promise<boolean> {
    const deadline = (await this.storage.get<string | null>("deadline")) ?? null;
    if (!deadline) return false;
    return new Date() > new Date(deadline);
  }

  private async snapshot(id: string): Promise<PollStateResponse> {
    const options = (await this.storage.get<PollOption[]>("options")) ?? [];
    const counts = (await this.storage.get<Record<string, number>>("counts")) ?? {};
    const deadline = (await this.storage.get<string | null>("deadline")) ?? null;
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    return { id, options, counts, total, deadline, closed: await this.isClosed() };
  }
}
