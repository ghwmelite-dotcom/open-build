import { PollDO } from "./poll-do";
import type { Env, SuggestBody } from "./types";

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

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
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

  const tg = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: env.TELEGRAM_CHAT_ID,
      text: lines.join("\n"),
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
  });
  if (!tg.ok) return json({ error: "telegram_failed" }, 502);
  return json({ ok: true });
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

    if (!url.pathname.startsWith("/api/poll/")) {
      return jsonError("not_found", 404, origin);
    }

    const id = url.pathname.split("/")[3];
    if (!id) {
      return jsonError("missing_poll_id", 400, origin);
    }

    const stub = env.POLL.get(env.POLL.idFromName(id));
    const res = await stub.fetch(request);
    return withCors(res, origin);
  },
};
