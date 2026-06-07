import { SELF } from "cloudflare:test";
import { describe, it, expect, vi, afterEach } from "vitest";

const BASE = "https://example.com";
const ADMIN = "test-secret";
const OPTS = [
  { id: "a", name: "Alpha" },
  { id: "b", name: "Beta" },
];

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
const bodyOf = (call: any) => JSON.parse(call[1].body);

afterEach(() => vi.unstubAllGlobals());

function announce(text: string) {
  return SELF.fetch(`${BASE}/api/announce`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${ADMIN}` },
    body: JSON.stringify({ text }),
  });
}
function init(id: string, announceFlag?: boolean) {
  return SELF.fetch(`${BASE}/api/poll/${id}/init`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${ADMIN}` },
    body: JSON.stringify({ options: OPTS, deadline: null, reset: true, announce: announceFlag }),
  });
}

describe("announce", () => {
  it("rejects without the admin token", async () => {
    stubTelegram();
    const res = await SELF.fetch(`${BASE}/api/announce`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "hi" }),
    });
    expect(res.status).toBe(401);
  });

  it("rejects empty text", async () => {
    stubTelegram();
    expect((await announce("   ")).status).toBe(400);
  });

  it("posts the announcement to the channel", async () => {
    const fn = stubTelegram(200, { ok: true });
    const res = await announce("We are LIVE now!");
    expect(res.status).toBe(200);
    const calls = tgCalls(fn);
    expect(calls.length).toBe(1);
    const b = bodyOf(calls[0]);
    expect(b.chat_id).toBe("@test_channel");
    expect(b.text).toContain("We are LIVE now!");
  });

  it("returns 502 if telegram fails", async () => {
    stubTelegram(500, { ok: false });
    expect((await announce("x")).status).toBe(502);
  });
});

describe("announce on init", () => {
  it("posts a 'vote is open' message when announce:true", async () => {
    const fn = stubTelegram(200, { ok: true });
    const res = await init("ann-on", true);
    expect(res.status).toBe(200);
    const calls = tgCalls(fn);
    expect(calls.length).toBe(1);
    const b = bodyOf(calls[0]);
    expect(b.chat_id).toBe("@test_channel");
    expect(b.text).toContain("Voting is open");
    expect(b.text).toContain("Alpha");
  });

  it("does not post when announce is omitted", async () => {
    const fn = stubTelegram(200, { ok: true });
    const res = await init("ann-off");
    expect(res.status).toBe(200);
    expect(tgCalls(fn).length).toBe(0);
  });
});
