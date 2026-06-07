import { SELF } from "cloudflare:test";
import { describe, it, expect, vi, afterEach } from "vitest";

const BASE = "https://example.com";

// The test worker runs in the same isolate as the test, and vitest-pool-workers
// makes globalThis.fetch replaceable — so we stub it to intercept the worker's
// outbound Telegram call. SELF.fetch is a binding (not global fetch), so it is
// unaffected. Non-Telegram requests fall through to the real fetch.
function stubTelegram(status = 200, body: unknown = { ok: true }) {
  const original = globalThis.fetch;
  const fn = vi.fn(async (input: any, init?: any) => {
    const u = typeof input === "string" ? input : input.url;
    if (u.includes("api.telegram.org")) {
      return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
    }
    return original(input, init);
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}
const tgCalls = (fn: ReturnType<typeof vi.fn>) =>
  fn.mock.calls.filter((c) => String(typeof c[0] === "string" ? c[0] : c[0]?.url).includes("api.telegram.org"));

afterEach(() => vi.unstubAllGlobals());

function suggest(body: unknown, raw = false) {
  return SELF.fetch(`${BASE}/api/suggest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: raw ? (body as string) : JSON.stringify(body),
  });
}

describe("suggest", () => {
  it("rejects a suggestion with no problem text", async () => {
    const fn = stubTelegram();
    const res = await suggest({ who: "traders" });
    expect(res.status).toBe(400);
    expect(tgCalls(fn).length).toBe(0); // never reached Telegram
  });

  it("rejects a malformed JSON body", async () => {
    stubTelegram();
    const res = await suggest("{ not json", true);
    expect(res.status).toBe(400);
  });

  it("silently drops a honeypot-filled submission without calling Telegram", async () => {
    const fn = stubTelegram();
    const res = await suggest({ problem: "buy cheap followers", hp: "i am a bot" });
    expect(res.status).toBe(200);
    expect(((await res.json()) as any).ok).toBe(true);
    expect(tgCalls(fn).length).toBe(0); // dropped, not forwarded
  });

  it("forwards a valid suggestion to Telegram and returns ok", async () => {
    const fn = stubTelegram(200, { ok: true });
    const res = await suggest({
      problem: "Trotro fares are confusing for newcomers",
      who: "new commuters in Accra",
      handle: "@kojo",
      link: "https://example.com/x",
    });
    expect(res.status).toBe(200);
    expect(((await res.json()) as any).ok).toBe(true);
    const calls = tgCalls(fn);
    expect(calls.length).toBe(1);
    // hits the sendMessage endpoint for the configured bot token
    expect(String(calls[0][0])).toContain("/bottest-token/sendMessage");
    // forwards the problem text in the message body
    const sent = JSON.parse((calls[0][1] as any).body);
    expect(sent.chat_id).toBe("-100test");
    expect(sent.text).toContain("Trotro fares are confusing");
  });

  it("returns 502 if Telegram rejects the message", async () => {
    stubTelegram(500, { ok: false });
    const res = await suggest({ problem: "a real problem worth solving" });
    expect(res.status).toBe(502);
  });
});

describe("suggest cors", () => {
  it("echoes an allowed Origin on OPTIONS preflight", async () => {
    const res = await SELF.fetch(`${BASE}/api/suggest`, {
      method: "OPTIONS",
      headers: { Origin: "https://open-build.pages.dev" },
    });
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("https://open-build.pages.dev");
  });
});
