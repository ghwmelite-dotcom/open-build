# Shared Vote Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. When implementing the Durable Object, consult the `durable-objects` and `wrangler` skills for current API/test-harness details.

**Goal:** Replace the hub's per-browser `localStorage` vote preview with a real, shared, tamper-resistant vote count powered by a Cloudflare Durable Object, with graceful fallback to the existing local preview when the backend is unreachable.

**Architecture:** A single Cloudflare Worker routes `/api/poll/:id/*` requests to a `PollDO` Durable Object instance (one per poll id). The DO holds the authoritative state — options, counts, deadline, and the set of voter tokens that have already voted — in SQLite-backed DO storage. Because a DO is single-threaded per instance, increments are naturally atomic (no race conditions). The host curates each poll via an admin-only `init` endpoint. The hub (`index.html`) fetches state on load, posts votes, and polls for live updates; if any call fails it falls back to the current `localStorage` behaviour so the page never looks broken.

**Tech Stack:** Cloudflare Workers, Durable Objects (SQLite storage), Wrangler, TypeScript, Vitest with `@cloudflare/vitest-pool-workers`. The hub stays a single self-contained `index.html`.

---

## File Structure

A new sibling project `vote-backend/` holds the Worker. The hub stays at repo root.

```
vote-backend/
  package.json          # deps + scripts
  tsconfig.json         # TS config
  wrangler.toml         # Worker + DO binding + migration + vars
  vitest.config.ts      # Workers test pool config
  .dev.vars             # local-only ADMIN_SECRET (gitignored)
  .dev.vars.example     # committed template
  src/
    types.ts            # Env + shared interfaces (PollOption, PollStateResponse)
    poll-do.ts          # PollDO Durable Object class — all poll logic
    worker.ts           # entry: routing + CORS, forwards to the DO
  test/
    poll.test.ts        # integration tests through SELF.fetch
index.html              # MODIFY: wire vote UI to the backend with fallback
```

Responsibilities:
- `types.ts` — single source of truth for the data shapes shared across worker/DO/tests.
- `poll-do.ts` — *all* vote state + rules (init, vote, dedup, deadline, snapshot). One responsibility: own the poll.
- `worker.ts` — HTTP edge concerns only (routing, CORS, OPTIONS). No business logic.
- `index.html` vote section — presentation + backend calls with local fallback.

---

## Task 1: Scaffold the vote-backend project

**Files:**
- Create: `vote-backend/package.json`
- Create: `vote-backend/tsconfig.json`
- Create: `vote-backend/wrangler.toml`
- Create: `vote-backend/vitest.config.ts`
- Create: `vote-backend/.dev.vars`
- Create: `vote-backend/.dev.vars.example`

- [ ] **Step 1: Create `vote-backend/package.json`**

```json
{
  "name": "ohwp-vote-backend",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "@cloudflare/vitest-pool-workers": "^0.5.0",
    "@cloudflare/workers-types": "^4.20240000.0",
    "typescript": "^5.5.0",
    "vitest": "^2.0.0",
    "wrangler": "^3.80.0"
  }
}
```

- [ ] **Step 2: Create `vote-backend/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "Bundler",
    "lib": ["ES2022"],
    "types": ["@cloudflare/workers-types"],
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true,
    "esModuleInterop": true
  },
  "include": ["src", "test"]
}
```

- [ ] **Step 3: Create `vote-backend/wrangler.toml`**

```toml
name = "ohwp-vote"
main = "src/worker.ts"
compatibility_date = "2025-01-01"

[[durable_objects.bindings]]
name = "POLL"
class_name = "PollDO"

[[migrations]]
tag = "v1"
new_sqlite_classes = ["PollDO"]

[vars]
ALLOWED_ORIGIN = "*"
```

Note: `new_sqlite_classes` (not `new_classes`) is required so the DO works on the Workers Free plan. `ADMIN_SECRET` is NOT in `[vars]` — it is a secret (set later via `wrangler secret put`), and injected for tests via vitest config.

- [ ] **Step 4: Create `vote-backend/vitest.config.ts`**

```ts
import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        wrangler: { configPath: "./wrangler.toml" },
        miniflare: {
          bindings: { ADMIN_SECRET: "test-secret", ALLOWED_ORIGIN: "*" },
        },
      },
    },
  },
});
```

- [ ] **Step 5: Create `vote-backend/.dev.vars` and `.dev.vars.example`**

`vote-backend/.dev.vars`:
```
ADMIN_SECRET=test-secret
```

`vote-backend/.dev.vars.example`:
```
ADMIN_SECRET=replace-with-a-long-random-string
```

- [ ] **Step 6: Install dependencies**

Run: `cd vote-backend; npm install`
Expected: `node_modules/` created, no errors. (`.dev.vars` and `node_modules/` are already covered by the repo `.gitignore`.)

- [ ] **Step 7: Commit**

```bash
git add vote-backend/package.json vote-backend/package-lock.json vote-backend/tsconfig.json vote-backend/wrangler.toml vote-backend/vitest.config.ts vote-backend/.dev.vars.example
git commit -m "chore: scaffold vote-backend Worker project"
```

---

## Task 2: Define shared types

**Files:**
- Create: `vote-backend/src/types.ts`

- [ ] **Step 1: Create `vote-backend/src/types.ts`**

```ts
export interface PollOption {
  id: string;
  name: string;
  icon?: string;
  desc?: string;
  by?: string;
}

export interface PollStateResponse {
  id: string;
  options: PollOption[];
  counts: Record<string, number>;
  total: number;
  deadline: string | null;
  closed: boolean;
}

export interface InitBody {
  options: PollOption[];
  deadline?: string | null;
  reset?: boolean;
}

export interface VoteBody {
  optionId: string;
  voterToken: string;
}

export interface Env {
  POLL: DurableObjectNamespace;
  ADMIN_SECRET: string;
  ALLOWED_ORIGIN: string;
}
```

- [ ] **Step 2: Commit**

```bash
git add vote-backend/src/types.ts
git commit -m "feat: add shared types for vote backend"
```

---

## Task 3: Write the full backend test suite (test-first)

This module's methods interlock, so we write the complete behaviour suite first, watch it fail, then implement the whole DO + worker in Task 4. Each test uses a unique poll id so DO instances are isolated.

**Files:**
- Create: `vote-backend/test/poll.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
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

describe("cors", () => {
  it("answers OPTIONS preflight with CORS headers", async () => {
    const res = await SELF.fetch(`${BASE}/api/poll/p-cors`, { method: "OPTIONS" });
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd vote-backend; npm test`
Expected: FAIL — module `src/worker.ts` does not exist / `PollDO` not found.

- [ ] **Step 3: Commit the tests**

```bash
git add vote-backend/test/poll.test.ts
git commit -m "test: add shared vote backend behaviour suite (red)"
```

---

## Task 4: Implement the Durable Object and Worker

**Files:**
- Create: `vote-backend/src/poll-do.ts`
- Create: `vote-backend/src/worker.ts`

- [ ] **Step 1: Create `vote-backend/src/poll-do.ts`**

```ts
import type { Env, PollOption, PollStateResponse, InitBody, VoteBody } from "./types";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export class PollDO {
  private storage: DurableObjectStorage;
  private env: Env;

  constructor(state: DurableObjectState, env: Env) {
    this.storage = state.storage;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const parts = url.pathname.split("/").filter(Boolean); // ["api","poll","<id>","<action?>"]
    const id = parts[2] ?? "";
    const action = parts[3] ?? "";

    if (request.method === "POST" && action === "init") return this.init(request, id);
    if (request.method === "POST" && action === "vote") return this.vote(request, id);
    if (request.method === "GET" && action === "") return json(await this.snapshot(id));
    return json({ error: "not_found" }, 404);
  }

  private async init(request: Request, id: string): Promise<Response> {
    const auth = request.headers.get("Authorization") ?? "";
    if (auth !== `Bearer ${this.env.ADMIN_SECRET}`) {
      return json({ error: "unauthorized" }, 401);
    }
    const body = (await request.json()) as InitBody;
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

    await this.storage.put("options", body.options);
    await this.storage.put("deadline", body.deadline ?? null);
    await this.storage.put("counts", counts);

    return json(await this.snapshot(id));
  }

  private async vote(request: Request, id: string): Promise<Response> {
    const body = (await request.json()) as VoteBody;
    if (!body.optionId || !body.voterToken) {
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
```

- [ ] **Step 2: Create `vote-backend/src/worker.ts`**

```ts
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
```

- [ ] **Step 3: Run the tests to verify they pass**

Run: `cd vote-backend; npm test`
Expected: PASS — all tests green (init/vote/dedup/deadline/get/cors).

- [ ] **Step 4: Commit**

```bash
git add vote-backend/src/poll-do.ts vote-backend/src/worker.ts
git commit -m "feat: implement PollDO durable object and worker routing"
```

---

## Task 5: Manual local verification

**Files:** none (manual run).

- [ ] **Step 1: Start the Worker locally**

Run: `cd vote-backend; npm run dev`
Expected: Wrangler serves on `http://localhost:8787`.

- [ ] **Step 2: Initialize a poll (admin)**

Run (PowerShell):
```powershell
curl -Method POST "http://localhost:8787/api/poll/current/init" `
  -Headers @{ "Authorization" = "Bearer test-secret"; "Content-Type" = "application/json" } `
  -Body '{"options":[{"id":"trotro","name":"Which Trotro?"},{"id":"momo","name":"MoMo Fee Calculator"}],"deadline":null,"reset":true}'
```
Expected: JSON with `counts` both 0, `total` 0.

- [ ] **Step 3: Cast two distinct votes and read state**

Run:
```powershell
curl -Method POST "http://localhost:8787/api/poll/current/vote" -Headers @{ "Content-Type"="application/json" } -Body '{"optionId":"trotro","voterToken":"dev-1"}'
curl -Method POST "http://localhost:8787/api/poll/current/vote" -Headers @{ "Content-Type"="application/json" } -Body '{"optionId":"momo","voterToken":"dev-2"}'
curl "http://localhost:8787/api/poll/current"
```
Expected: final read shows `trotro:1`, `momo:1`, `total:2`. Re-running a vote with `dev-1` does NOT change the total.

- [ ] **Step 4: Stop the dev server** (Ctrl+C). No commit (manual check only).

---

## Task 6: Wire the hub vote UI to the backend with fallback

The hub keeps working exactly as today when `VOTE.api.base` is empty (pure `localStorage` preview). When `base` is set, counts come from the backend, votes POST to it, and the ballot refreshes every 5s while open. Any network failure falls back to the local preview.

**Files:**
- Modify: `index.html` (the `LIVE VOTE` script block, currently `index.html:788`–`880`)

- [ ] **Step 1: Add an `api` field to the `VOTE` config**

In `index.html`, inside the `const VOTE = { ... }` object (starts at `index.html:788`), add an `api` block immediately after the `deadline:` line:

```js
const VOTE = {
  // set a real deadline, or null to keep it always open
  deadline: null,            // e.g. "2026-06-20T20:00:00+00:00"
  // Shared backend. Leave base:"" to use the per-browser preview (offline).
  // Set base to the deployed Worker origin to use real shared counts.
  api: { base: "", pollId: "current" },
  seedVotes: true,           // show some starter numbers so bars aren't all empty
  options: [
```

(Leave the rest of `VOTE.options` unchanged.)

- [ ] **Step 2: Replace the vote state + interaction block**

Replace everything from `const VKEY='ohwp_vote_v1'` (`index.html:805`) down to and including the `voteReset` click-handler block that ends at `index.html:867`, with the following. `renderVote()`, `tickTimer()`, `isClosed()`, and the IntersectionObserver are defined elsewhere and are NOT changed.

```js
const VKEY='ohwp_vote_v1', VCHOICE='ohwp_vote_choice_v1', VDEV='ohwp_device_v1';
const API = (VOTE.api && VOTE.api.base) ? VOTE.api.base.replace(/\/$/,'') : '';

function readCounts(){
  try{const s=JSON.parse(localStorage.getItem(VKEY));if(s)return s;}catch(e){}
  const init={};VOTE.options.forEach(o=>init[o.id]=VOTE.seedVotes?o.seed:0);
  return init;
}
function writeCounts(c){try{localStorage.setItem(VKEY,JSON.stringify(c));}catch(e){}}
function myChoice(){try{return localStorage.getItem(VCHOICE);}catch(e){return null;}}
function setChoice(id){try{localStorage.setItem(VCHOICE,id);}catch(e){}}
function clearChoice(){try{localStorage.removeItem(VCHOICE);}catch(e){}}
function deviceToken(){
  try{
    let t=localStorage.getItem(VDEV);
    if(!t){t=(crypto.randomUUID?crypto.randomUUID():String(Date.now())+Math.random());localStorage.setItem(VDEV,t);}
    return t;
  }catch(e){return 'anon';}
}

let counts=readCounts();
const ballot=document.getElementById('ballot');
const voteWrap=document.getElementById('voteWrap');
const voteStatusEl=document.getElementById('voteStatus');

function isClosed(){return VOTE.deadline && new Date() > new Date(VOTE.deadline);}

// Map a server snapshot onto our local display state.
function applyServer(s){
  const next={};
  VOTE.options.forEach(o=>{ next[o.id]= (s.counts && s.counts[o.id]) || 0; });
  counts=next;
  if(s.deadline) VOTE.deadline=s.deadline;
  renderVote(); tickTimer();
}

// Load counts: backend if configured, else local preview. Always falls back.
async function loadCounts(){
  if(!API){ counts=readCounts(); renderVote(); return; }
  try{
    const r=await fetch(`${API}/api/poll/${VOTE.api.pollId}`);
    if(!r.ok) throw new Error('bad status');
    applyServer(await r.json());
  }catch(e){ counts=readCounts(); renderVote(); }   // graceful fallback
}

ballot.addEventListener('click', async e=>{
  const card=e.target.closest('.opt-card'); if(!card) return;
  if(isClosed()) return;
  if(myChoice()) return;            // one vote per device
  const id=card.dataset.id;
  setChoice(id);                    // optimistic local lock

  if(!API){                         // local preview mode
    counts[id]=(counts[id]||0)+1; writeCounts(counts); renderVote(); return;
  }
  try{
    const r=await fetch(`${API}/api/poll/${VOTE.api.pollId}/vote`,{
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({optionId:id, voterToken:deviceToken()})
    });
    if(!r.ok) throw new Error('bad status');
    applyServer(await r.json());
  }catch(e){                        // fallback: reflect the vote locally
    counts[id]=(counts[id]||0)+1; renderVote();
  }
});

// "Clear my vote" only applies to the local preview; in backend mode the
// server is authoritative (re-voting is idempotent), so hide the button.
const voteResetBtn=document.getElementById('voteReset');
if(API){ voteResetBtn.style.display='none'; }
else{
  voteResetBtn.addEventListener('click',()=>{
    const c=myChoice();if(!c)return;
    counts[c]=Math.max(0,(counts[c]||0)-1);
    writeCounts(counts);clearChoice();renderVote();
  });
}

// Live-ish refresh while a backend poll is open.
if(API){ setInterval(()=>{ if(!isClosed()) loadCounts(); }, 5000); }
```

- [ ] **Step 3: Replace the initial render call to use `loadCounts()`**

At `index.html:880` the script currently runs:
```js
renderVote();tickTimer();setInterval(tickTimer,1000);
```
Change the first call so backend mode hydrates on load:
```js
loadCounts();tickTimer();setInterval(tickTimer,1000);
```

- [ ] **Step 4: Verify offline mode still works (no regression)**

Open `index.html` directly in a browser (so `VOTE.api.base` is `""`).
Expected: the ballot renders, tap-to-vote increments, "Leading" badge and percentages behave exactly as before. (Open DevTools console — no errors.)

- [ ] **Step 5: Verify backend mode end-to-end**

With the Worker running (`cd vote-backend; npm run dev`) and a poll initialized (Task 5 Step 2), temporarily set in `index.html`:
```js
api: { base: "http://localhost:8787", pollId: "current" },
```
Serve the hub locally (e.g. `python -m http.server 8080` from the repo root) and open `http://localhost:8080`.
Expected: counts match the server; voting updates the server total; opening a second browser/profile and voting is reflected in the first within ~5s. Then revert `base` back to `""` for committing (production value is set at deploy time, Task 7).

- [ ] **Step 6: Commit**

```bash
git add index.html
git commit -m "feat: wire hub vote UI to shared backend with localStorage fallback"
```

---

## Task 7: Deploy the Worker and connect the hub

**Files:**
- Modify: `index.html` (set production `api.base`)

- [ ] **Step 1: Set the production admin secret**

Run: `cd vote-backend; npx wrangler secret put ADMIN_SECRET`
Enter a long random string when prompted. Expected: "Success! Uploaded secret ADMIN_SECRET".

- [ ] **Step 2: Deploy the Worker**

Run: `cd vote-backend; npm run deploy`
Expected: a deployed URL like `https://ohwp-vote.<subdomain>.workers.dev`. Copy it.

- [ ] **Step 3: Lock CORS to the hub origin**

Edit `vote-backend/wrangler.toml` `[vars]` to your hub's deployed origin (the Cloudflare Pages URL), e.g.:
```toml
[vars]
ALLOWED_ORIGIN = "https://ohwpstudios.pages.dev"
```
Re-deploy: `cd vote-backend; npm run deploy`.

- [ ] **Step 4: Initialize this cycle's poll against production**

Run (PowerShell), using the deployed Worker URL and your real secret:
```powershell
curl -Method POST "https://ohwp-vote.<subdomain>.workers.dev/api/poll/current/init" `
  -Headers @{ "Authorization" = "Bearer <YOUR_ADMIN_SECRET>"; "Content-Type" = "application/json" } `
  -Body '{"options":[{"id":"trotro","name":"Which Trotro?","icon":"🚐","desc":"Pick start & destination, get the route and fare.","by":"@suggester2"},{"id":"momo","name":"MoMo Fee Calculator","icon":"💸","desc":"Type what you''re sending — see the fee and what lands.","by":"@suggester1"},{"id":"quiz","name":"NSMQ Quiz Trainer","icon":"📚","desc":"Drill past questions, track your score, learn fast.","by":"@suggester3"}],"deadline":null,"reset":true}'
```
Expected: JSON with all three options at 0. Keep `VOTE.options` in `index.html` in sync with these ids/labels.

- [ ] **Step 5: Point the hub at production and deploy it**

In `index.html` set:
```js
api: { base: "https://ohwp-vote.<subdomain>.workers.dev", pollId: "current" },
```
Deploy the hub to Cloudflare Pages (drag-and-drop the repo root, or via Wrangler Pages). Open the live hub and confirm votes persist across two different devices/browsers.

- [ ] **Step 6: Commit**

```bash
git add index.html vote-backend/wrangler.toml
git commit -m "feat: connect hub to deployed vote backend; lock CORS to hub origin"
```

---

## Self-Review

**1. Spec coverage** (against `docs/superpowers/specs/2026-06-06-engagement-architecture-design.md`):
- §6.5 Shared Vote Backend → Tasks 1–5 (DO + Worker + tests + manual check). ✓
- "Durable Object, not KV; atomic increments" → single-instance DO with `idFromName`, sequential `await` storage writes. ✓
- "idempotent per voter token" → `v:<token>` dedup key + idempotent re-vote test. ✓
- "rejects after deadline; server-side" → `isClosed()` + deadline test. ✓
- "graceful degradation → localStorage fallback" → Task 6 try/catch fallbacks + offline-mode regression test. ✓
- §6.1 curated vote wired to backend via the `readCounts()`/`writeCounts()` seam → Task 6. ✓
- §8 integrity: per-device token + server-side deadline; admin-secret-gated `init` prevents reset/tamper → Task 4 `init` auth. ✓ (IP rate-limiting intentionally deferred — documented "good enough, not tamper-proof" stance in the spec; the parallel platform-poll option remains available.)
- §6.2 suggestion intake, §6.3 suggester credit on cards, §6.4 in-build micro-votes, §6.6 funnel → NOT in this plan by design; each is a follow-on plan (noted at top).

**2. Placeholder scan:** No "TBD/TODO/handle edge cases" steps; every code step shows complete code; every command states expected output. ✓

**3. Type consistency:** `PollOption`, `PollStateResponse`, `InitBody`, `VoteBody`, `Env` defined in Task 2 and used unchanged in Tasks 3–4. Endpoint shapes (`/api/poll/:id`, `/init`, `/vote`), the `counts`/`total`/`closed`/`deadline` fields, the `v:<token>` dedup scheme, and the hub's `applyServer()`/`loadCounts()`/`deviceToken()` names are consistent across worker, DO, tests, and hub. ✓

---

## Follow-on plans (out of scope here)
- **Hub stub-fills** — suggest-button → real form, favicon, show name. (No backend; quick.)
- **Suggester credit on shipped cards** — `suggestedBy`/`votePct` fields + render.
- **In-build micro-votes (flash polls)** — reuse `PollDO` with ephemeral poll ids + a stream-overlay view.
- **Off-stream funnel** — clip cadence via the social skills (separate spec).
