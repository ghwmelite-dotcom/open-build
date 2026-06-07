import { PollDO } from "./poll-do";
import { tgSend, escapeHtml } from "./telegram";
import type { Env, SuggestBody, AnnounceBody } from "./types";

export { PollDO };

function corsHeaders(origin: string): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    Vary: "Origin",
  };
}

// ALLOWED_ORIGIN is "*" or a comma-separated allowlist. For an allowlist we echo
// the request's Origin when it matches (a single ACAO header can't list many),
// otherwise fall back to the first allowed origin.
function resolveOrigin(request: Request, env: Env): string {
  const allowed = (env.ALLOWED_ORIGIN || "*")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (allowed.includes("*")) return "*";
  const reqOrigin = request.headers.get("Origin") ?? "";
  return allowed.includes(reqOrigin) ? reqOrigin : allowed[0];
}

function withCors(res: Response, origin: string): Response {
  const out = new Response(res.body, res);
  const headers = corsHeaders(origin);
  for (const key of Object.keys(headers)) out.headers.set(key, headers[key]);
  return out;
}

function jsonError(message: string, status: number, origin: string): Response {
  return withCors(
    new Response(JSON.stringify({ error: message }), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
    origin,
  );
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function clip(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

// Forwards a community build suggestion to the host's Telegram group.
// Stateless: validate -> (honeypot drop) -> Telegram sendMessage.
async function handleSuggest(request: Request, env: Env): Promise<Response> {
  let body: SuggestBody;
  try {
    body = (await request.json()) as SuggestBody;
  } catch {
    return json({ error: "bad_request" }, 400);
  }

  // Honeypot: real users leave `hp` empty; bots fill it. Accept but drop silently.
  if (typeof body.hp === "string" && body.hp.trim() !== "") {
    return json({ ok: true });
  }

  const problem = clip(body.problem, 1000);
  if (!problem) return json({ error: "problem_required" }, 400);

  const who = clip(body.who, 200);
  const handle = clip(body.handle, 80);
  const link = clip(body.link, 300);

  const lines = ["🛠️ <b>New build suggestion</b>", "", `<b>Problem:</b> ${escapeHtml(problem)}`];
  if (who) lines.push(`<b>Who it helps:</b> ${escapeHtml(who)}`);
  if (handle) lines.push(`<b>From:</b> ${escapeHtml(handle)}`);
  if (link) lines.push(`<b>Link:</b> ${escapeHtml(link)}`);

  const ok = await tgSend(env, env.TELEGRAM_CHAT_ID, lines.join("\n"));
  return ok ? json({ ok: true }) : json({ error: "telegram_failed" }, 502);
}

// Admin-gated: post an arbitrary announcement to the public channel.
async function handleAnnounce(request: Request, env: Env): Promise<Response> {
  const auth = request.headers.get("Authorization") ?? "";
  if (auth !== `Bearer ${env.ADMIN_SECRET}`) return json({ error: "unauthorized" }, 401);
  let body: AnnounceBody;
  try {
    body = (await request.json()) as AnnounceBody;
  } catch {
    return json({ error: "bad_request" }, 400);
  }
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) return json({ error: "text_required" }, 400);
  const ok = await tgSend(env, env.TELEGRAM_CHANNEL_ID, text.slice(0, 3500));
  return ok ? json({ ok: true }) : json({ error: "telegram_failed" }, 502);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = resolveOrigin(request, env);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    const url = new URL(request.url);

    if (url.pathname === "/api/suggest") {
      if (request.method !== "POST") return jsonError("method_not_allowed", 405, origin);
      return withCors(await handleSuggest(request, env), origin);
    }

    if (url.pathname === "/api/announce") {
      if (request.method !== "POST") return jsonError("method_not_allowed", 405, origin);
      return withCors(await handleAnnounce(request, env), origin);
    }

    if (!url.pathname.startsWith("/api/poll/")) {
      return jsonError("not_found", 404, origin);
    }

    const id = url.pathname.split("/")[3];
    if (!id) {
      return jsonError("missing_poll_id", 400, origin);
    }

    const stub = env.POLL.get(env.POLL.idFromName(id));
    if (request.headers.get("Upgrade") === "websocket") {
      return stub.fetch(request); // WebSocket upgrade: pass the 101 + socket through untouched
    }
    const res = await stub.fetch(request);
    return withCors(res, origin);
  },
};
