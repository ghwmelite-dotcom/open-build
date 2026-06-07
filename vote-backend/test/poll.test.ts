import { SELF } from "cloudflare:test";
import { describe, it, expect } from "vitest";

const ADMIN = "test-secret";
const BASE = "https://example.com";

function init(id: string, options: unknown, deadline: string | null = null, reset = true, auth = ADMIN) {
  return SELF.fetch(`${BASE}/api/poll/${id}/init`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth}` },
    body: JSON.stringify({ options, deadline, reset }),
  });
}

function vote(id: string, optionId: string, voterToken: string) {
  return SELF.fetch(`${BASE}/api/poll/${id}/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ optionId, voterToken }),
  });
}

function get(id: string) {
  return SELF.fetch(`${BASE}/api/poll/${id}`);
}

const OPTS = [
  { id: "trotro", name: "Which Trotro?" },
  { id: "momo", name: "MoMo Fee Calculator" },
];

describe("init", () => {
  it("rejects init without the admin bearer token", async () => {
    const res = await init("p-auth", OPTS, null, true, "wrong-secret");
    expect(res.status).toBe(401);
  });

  it("rejects init with no options", async () => {
    const res = await init("p-empty", []);
    expect(res.status).toBe(400);
  });

  it("initializes a poll with zeroed counts", async () => {
    const res = await init("p-init", OPTS);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.options).toHaveLength(2);
    expect(body.counts).toEqual({ trotro: 0, momo: 0 });
    expect(body.total).toBe(0);
    expect(body.closed).toBe(false);
  });
});

describe("vote", () => {
  it("increments the chosen option", async () => {
    await init("p-vote", OPTS);
    const res = await vote("p-vote", "trotro", "device-1");
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.counts.trotro).toBe(1);
    expect(body.total).toBe(1);
  });

  it("is idempotent for the same voter token (no double count)", async () => {
    await init("p-dedup", OPTS);
    await vote("p-dedup", "trotro", "device-A");
    await vote("p-dedup", "momo", "device-A"); // same token, different choice
    const res = await get("p-dedup");
    const body = (await res.json()) as any;
    expect(body.total).toBe(1);
    expect(body.counts.trotro).toBe(1);
    expect(body.counts.momo).toBe(0);
  });

  it("counts distinct voter tokens separately", async () => {
    await init("p-multi", OPTS);
    await vote("p-multi", "trotro", "device-1");
    await vote("p-multi", "trotro", "device-2");
    const res = await get("p-multi");
    const body = (await res.json()) as any;
    expect(body.counts.trotro).toBe(2);
    expect(body.total).toBe(2);
  });

  it("rejects an unknown option", async () => {
    await init("p-unknown", OPTS);
    const res = await vote("p-unknown", "nope", "device-1");
    expect(res.status).toBe(400);
  });

  it("rejects voting on an uninitialized poll", async () => {
    const res = await vote("p-fresh", "trotro", "device-1");
    expect(res.status).toBe(409);
  });

  it("rejects votes after the deadline has passed", async () => {
    await init("p-closed", OPTS, "2000-01-01T00:00:00Z");
    const res = await vote("p-closed", "trotro", "device-1");
    expect(res.status).toBe(409);
    const state = (await (await get("p-closed")).json()) as any;
    expect(state.closed).toBe(true);
  });
});

describe("get", () => {
  it("returns options, counts, total and closed for an open poll", async () => {
    await init("p-get", OPTS, null);
    await vote("p-get", "momo", "device-1");
    const res = await get("p-get");
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.id).toBe("p-get");
    expect(body.counts.momo).toBe(1);
    expect(body.total).toBe(1);
    expect(body.closed).toBe(false);
  });
});

describe("input validation", () => {
  it("rejects a vote with a malformed JSON body (400, not 500)", async () => {
    await init("p-badjson", OPTS);
    const res = await SELF.fetch(`${BASE}/api/poll/p-badjson/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{ not json",
    });
    expect(res.status).toBe(400);
  });

  it("rejects a vote with non-string fields (400)", async () => {
    await init("p-badtypes", OPTS);
    const res = await SELF.fetch(`${BASE}/api/poll/p-badtypes/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ optionId: 42, voterToken: { spoof: 1 } }),
    });
    expect(res.status).toBe(400);
    const state = (await (await get("p-badtypes")).json()) as any;
    expect(state.total).toBe(0); // nothing was counted
  });

  it("rejects init with a malformed JSON body (400, not 500)", async () => {
    const res = await SELF.fetch(`${BASE}/api/poll/p-badinit/init`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${ADMIN}` },
      body: "{ not json",
    });
    expect(res.status).toBe(400);
  });
});

describe("cors", () => {
  it("echoes an allowed Origin on OPTIONS preflight", async () => {
    const res = await SELF.fetch(`${BASE}/api/poll/p-cors`, {
      method: "OPTIONS",
      headers: { Origin: "https://open-build.ohwpstudios.org" },
    });
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("https://open-build.ohwpstudios.org");
  });

  it("falls back to the primary origin for a disallowed Origin", async () => {
    const res = await SELF.fetch(`${BASE}/api/poll/p-cors2`, {
      method: "OPTIONS",
      headers: { Origin: "https://evil.example" },
    });
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("https://open-build.pages.dev");
  });
});
