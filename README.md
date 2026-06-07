# OpenBuild — OHWPStudios

> **Real problems, built live, simple enough to build yourself.**

OpenBuild is the home of **OHWPStudios** — a livestream show where the community
names a real Ghanaian problem, we scope it small, **build it live with Claude
Code**, ship a beginner-friendly guide so anyone can rebuild it, and then the
community **votes on what gets built next**.

It's not generic coding content. Every build is a Ghana-rooted civic or everyday
tool, and each one is deliberately designed so a beginner — even on the free
Claude.ai web tier — can follow along or recreate it from a single prompt.

> **Naming note:** the studio is **OHWPStudios**. The show name is being decided
> (leading candidate: **Nnoboa** — the Akan tradition of communal mutual help).

---

## Table of contents

- [What this is](#what-this-is)
- [The loop (how the show works)](#the-loop-how-the-show-works)
- [Repository structure](#repository-structure)
- [The hub (`index.html`)](#the-hub-indexhtml)
- [The build slate](#the-build-slate)
- [Shared vote backend](#shared-vote-backend)
- [Local development](#local-development)
- [Testing](#testing)
- [Deploying](#deploying)
- [Design system & brand](#design-system--brand)
- [Guardrails](#guardrails)
- [Roadmap & status](#roadmap--status)
- [Contributing](#contributing)
- [License](#license)

---

## What this is

| | |
|---|---|
| **Studio** | OHWPStudios |
| **Format** | Community names a problem → scope it small → build live with Claude Code → ship a novice guide → community votes on what's next |
| **Core promise** | *Real problems, built live, simple enough to build yourself* |
| **Audience** | Ghanaian builders & viewers, many on the free Claude.ai tier |
| **Stack** | Single-file web apps (HTML/CSS/JS) + a small Cloudflare Workers backend |
| **Hosting** | Cloudflare Pages (hub) + Cloudflare Workers/Durable Objects (vote backend) |

**Why single-file?** Claude Code requires a paid plan, but the free Claude.ai
web tier includes Artifacts. So **every build is a single, copy-pasteable
`index.html`** wherever possible — no build step, no dependencies, offline-capable
— which keeps it replicable by free-tier viewers. Exceptions (e.g. tools that
need Python or live data) are flagged explicitly, and free users use the deployed
tool instead of rebuilding.

---

## The loop (how the show works)

```
   short vertical clips  ──►  new viewers + new suggestions
          ▲                              │
          │                              ▼
   the live build         the host curates 3 pre-scoped options
   produces clip moments ◄── LIVE BUILD ◄── this week's shared VOTE
          ▲                              │
          └──── ship it + credit the ────┘
                suggester on the wall
```

Each turn deepens investment because the viewer's fingerprint is on the outcome:
their suggestion, their vote, their name on a shipped tool. The host keeps subtle
control by owning the **option set** — every choice on the ballot is a pre-scoped,
green-lit brief, so *every path the community can pick is one worth shipping*.

Full design: [`docs/superpowers/specs/2026-06-06-engagement-architecture-design.md`](docs/superpowers/specs/2026-06-06-engagement-architecture-design.md).

---

## Repository structure

```
.
├── index.html              # The hub — a single self-contained site (no build step)
├── PROJECT_BRIEF.md        # Source-of-truth brief for the whole project
├── docs/
│   └── superpowers/
│       ├── specs/          # Design specs (engagement architecture)
│       └── plans/          # Step-by-step implementation plans
└── vote-backend/           # Cloudflare Worker + Durable Object for shared voting
    ├── src/
    │   ├── types.ts        # Shared interfaces (single source of truth)
    │   ├── poll-do.ts      # PollDO Durable Object — all poll state & rules
    │   └── worker.ts       # HTTP edge: routing + CORS, forwards to the DO
    ├── test/poll.test.ts   # Behaviour suite (Vitest, Workers pool)
    ├── wrangler.toml       # Worker + DO binding + SQLite migration
    └── vitest.config.ts    # Vitest Workers-pool config
```

---

## The hub (`index.html`)

A single self-contained site (works offline, no dependencies). Sections:

1. **Hero** — pre-launch messaging and a live build counter.
2. **Builds grid** — cards for builds #001–#005. Each opens a modal step-by-step
   guide, where every step has a copy-paste Claude Code prompt, flagged "clip
   moments," and an honest disclaimer. Flip a card to `live` (with its URL) after
   shipping; the counter switches from *builds planned* → *builds shipped*.
3. **How it works** — the 5-step method.
4. **Build Brief Forge** — an offline generator: pick a build type, fill fields,
   and get a clean Claude Code prompt + scope box + buildability check.
5. **Live Vote** — three pre-screened options on a ballot, tap-to-vote, animated
   result bars, a "Leading" badge, and an optional countdown. Counts come from the
   [shared vote backend](#shared-vote-backend) when configured, with a graceful
   fall back to a per-browser `localStorage` preview when it isn't.
6. **Community / Suggest** — entry point for problem suggestions.

To preview locally, just open `index.html` in a browser, or serve the repo root:

```bash
python -m http.server 8080   # then visit http://localhost:8080
```

---

## The build slate

Phase 1 builds (sequenced to vary the *feeling* each episode):

| # | Name | What it is | Single-file? | Notes |
|---|------|-----------|:---:|-------|
| 001 | Accra Flood-Risk Map | Flood-prone areas from elevation data | ❌ (Python) | Civic. Prototype, **not** an official warning — follow GMet/NADMO. |
| 002 | Which Trotro? | Start + destination → route + approx fare | ✅ offline | Everyday. Fares are community-maintained; confirm with the mate. |
| 003 | MoMo Fee Calculator | Enter amount → fee + what lands | ✅ offline | Money. Fees vary by network; check official rates. |
| 004 | NSMQ/BECE Quiz Trainer | Drill past questions, track score | ✅ offline | Education. Study aid; cross-check official syllabi. |
| 005 | Galamsey Watch | Map galamsey impact from public data | ❌ (map/data) | Civic. **Awareness only** — never accuse individuals; public data only. |

---

## Shared vote backend

The live vote needs counts that are **shared across all visitors** and hard to
tamper with. KV is eventually-consistent (a live counter that lags or jumps looks
broken), so the backend is a **Cloudflare Durable Object** — a single
authoritative instance per poll with atomic increments.

**Architecture:** one Cloudflare Worker routes `/api/poll/:id/*` to a `PollDO`
Durable Object instance (one per poll id, via `idFromName`). The DO owns all state
— options, counts, deadline, and the set of voter tokens that have voted — in
SQLite-backed DO storage. Because a DO is single-threaded per instance, increments
are naturally atomic.

### API

| Method & path | Auth | Purpose |
|---|---|---|
| `GET /api/poll/:id` | — | Snapshot: `{ id, options, counts, total, deadline, closed }` |
| `POST /api/poll/:id/vote` | — | Body `{ optionId, voterToken }`. Increments once per token (idempotent). |
| `POST /api/poll/:id/init` | `Authorization: Bearer <ADMIN_SECRET>` | Admin-only: create/reset a poll with options + optional deadline. |
| `OPTIONS /api/poll/:id` | — | CORS preflight (204). |

**Integrity model:** one vote per device (server-side token dedup), server-enforced
deadline, admin-secret-gated `init`. It's "good enough, not tamper-proof" — for a
high-stakes count the host can also run the platform-native poll (YouTube/X) in
parallel. IP rate-limiting is intentionally deferred.

**Graceful degradation:** if the backend is unreachable, the hub falls back to the
existing `localStorage` preview so the page never looks broken.

---

## Local development

### The hub

```bash
python -m http.server 8080   # serve the repo root, open http://localhost:8080
```

The hub ships with `VOTE.api.base = ""`, so it uses the offline `localStorage`
preview by default. Set `base` to a running Worker origin to use real shared counts.

### The vote backend

```bash
cd vote-backend
npm install
npm run dev        # wrangler dev on http://localhost:8787
```

Seed a poll and cast a couple of votes:

```bash
# (PowerShell)
curl -Method POST "http://localhost:8787/api/poll/current/init" `
  -Headers @{ Authorization="Bearer test-secret"; "Content-Type"="application/json" } `
  -Body '{"options":[{"id":"trotro","name":"Which Trotro?"},{"id":"momo","name":"MoMo Fee Calculator"}],"reset":true}'

curl -Method POST "http://localhost:8787/api/poll/current/vote" -Headers @{ "Content-Type"="application/json" } -Body '{"optionId":"trotro","voterToken":"dev-1"}'
curl "http://localhost:8787/api/poll/current"
```

> Local secrets live in `vote-backend/.dev.vars` (gitignored). Copy
> `vote-backend/.dev.vars.example` to `.dev.vars` and set `ADMIN_SECRET`.

---

## Testing

The backend has a full behaviour suite (init/auth, vote, dedup, deadline, snapshot,
CORS, input validation) running inside the Workers runtime via
`@cloudflare/vitest-pool-workers`:

```bash
cd vote-backend
npm test            # 14 tests
npx tsc --noEmit    # type-check (strict)
```

---

## Deploying

```bash
cd vote-backend
npx wrangler login
npx wrangler secret put ADMIN_SECRET   # set a long random string
npm run deploy                          # -> https://ohwp-vote.<subdomain>.workers.dev
```

Then lock CORS to the hub origin (set `ALLOWED_ORIGIN` in `wrangler.toml` and
redeploy), point the hub's `VOTE.api.base` at the deployed Worker, and deploy the
hub to Cloudflare Pages. Full steps:
[`docs/superpowers/plans/2026-06-06-shared-vote-backend.md`](docs/superpowers/plans/2026-06-06-shared-vote-backend.md).

---

## Design system & brand

- **Theme:** dark, near-black background with Ghana national colours — green
  (`#0a8f56` / `#006B3F`), gold (`#FCD116`), red (`#CE1126`).
- **Type:** serif headings (Georgia), mobile-first.
- **Accents:** kente ribbon, Adinkra motifs, Akan/Ewe proverbs.
- **Voice:** warm, confident, honest about limitations — always with a clear
  disclaimer on anything touching safety, money, or sensitive civic topics.
- **Accessibility:** AA contrast minimum, 44px touch targets, focus states,
  `prefers-reduced-motion` respected.

---

## Guardrails

- **Single-file, no-dependency, offline-capable** web builds by default; any
  exception is flagged.
- **Always add an honest disclaimer** on anything touching safety, money, health,
  or civic accusation (flood = "prototype, not an official warning"; galamsey =
  "awareness from public data, not accusation").
- **No browser storage in artifacts meant to run inside Claude.ai** (localStorage
  fails there) — use in-memory state. The deployed hub *may* use localStorage.
- **Local data accuracy matters most** (fares, fees): real values are supplied and
  corrected by the host; AI guesses are placeholders only.

---

## Roadmap & status

- ✅ Hub site (`index.html`) with builds grid, Forge, and live vote UI.
- ✅ Shared vote backend (Cloudflare Worker + `PollDO` Durable Object) — built,
  tested (14 passing), and wired into the hub with `localStorage` fallback.
- ⏳ Deploy the Worker + connect the hub to production (Cloudflare).
- ⏳ Suggester credit on shipped build cards (`suggestedBy` / `votePct`).
- ⏳ In-build "flash poll" micro-votes (reuse `PollDO` with ephemeral poll ids).
- ⏳ Suggestion intake hooked to a real form; clip → funnel pass.

---

## Contributing

This is the live workspace for a streamed show, so the workflow is plan-first:
specs and step-by-step plans live in [`docs/superpowers/`](docs/superpowers/) and
are implemented task-by-task. If you're following along to rebuild a tool, start
from the relevant build card in the hub — each one is a self-contained, copy-paste
prompt. Keep the [brand voice](#design-system--brand) and
[guardrails](#guardrails) in mind for any tool that touches safety, money, or
civic topics.

---

## License

Released under the [MIT License](LICENSE) © 2026 OHWPStudios. The builds are
designed to be freely replicable by viewers — fork it, rebuild it, ship it.

---

*Built live, in Ghana, with Claude Code. Nnoboa — we build together.*
