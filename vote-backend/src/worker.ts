import { PollDO } from "./poll-do";
import type { Env } from "./types";

export { PollDO };

function corsHeaders(origin: string): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
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

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = env.ALLOWED_ORIGIN || "*";

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    const url = new URL(request.url);
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
