# OHWPStudios — Engagement Architecture Design

**Date:** 2026-06-06
**Status:** Draft for review
**Owner:** OHWPStudios (ohwpstudios@gmail.com)
**Related:** `PROJECT_BRIEF.md`, `index.html` (the hub)

---

## 1. Problem & North Star

OHWPStudios runs a livestream show: the community names a real Ghanaian problem
(Accra flooding, galamsey, trotro fares, MoMo fees…), we scope it small, build it
live with Claude Code, ship a novice guide, and the community votes on what's next.

**North star:** *real, useful tools get shipped.* Engagement is the fuel, not the goal.

**The thing being designed here:** the **engagement architecture** — the loop that
keeps viewers highly engaged and *invested* while the host keeps subtle control of
the direction. This spec does **not** cover building any individual tool (#001–#005);
those follow the per-build pipeline in `PROJECT_BRIEF.md §6`.

---

## 2. Core Insight — "Subtle Control" = Choice Architecture

The host never instructs viewers. Instead, the host designs the **option set, the
framing, the order, and the defaults** so that *every path a viewer can choose is a
path worth shipping*. The vote decides the **route**; the host has guaranteed the
**destination**.

This is already embodied in the hub's curated `VOTE` config and the Build Brief Forge
(which pre-validates each option). The innovation is the **loop built around it**.

---

## 3. The Flywheel (the core mechanic)

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

Each turn deepens investment because the viewer's *fingerprint* is on the outcome:
their suggestion, their vote, their name on a shipped tool (the IKEA effect — people
value what they helped make).

### One cycle, end to end
1. **Intake** — viewers submit problems (form). Host moderates into a backlog.
2. **Shortlist** — host picks **3**, each already run through the Forge → green-lit
   build briefs. (Subtle control happens here.)
3. **Publish vote** — 3 options + suggester credit + a deadline/countdown go live on
   the hub. The shared count is real and visible.
4. **Vote window** — viewers vote (one per device). Live totals, "leading" badge,
   countdown create social proof + scarcity.
5. **Build live** — winner is built on stream. **In-build micro-votes** (name, colour,
   which hotspot to test first) keep viewers watching and extend the control surface.
6. **Ship & credit** — deploy, flip the build card to `live`, credit the suggester on
   the "shipped together" wall. Counter flips PLANNED → SHIPPED (already implemented).
7. **Clip & tease** — cut 3–4 vertical clips from the flagged moments; CTA = "vote on
   what's next." Loop restarts.

---

## 4. Subtle-Control Levers (explicit)

| Lever | How the host controls it |
|---|---|
| **Option-set ownership** | Host alone picks the 3 ballot options from the moderated backlog. |
| **Pre-validation** | Every option is a Forge-checked, green-lit brief → no path can fail to ship. |
| **Framing & order** | Wording, icon, and order of options on the ballot are authored. |
| **Defaults & emphasis** | "Leading" badge + seed momentum nudge without dictating. |
| **Deadline timing** | Vote closes to align with the live stream slot — drives live attendance. |
| **Micro-vote menus** | In-build choices are all outcomes the host is happy with. |

> Ethical guardrail: control is over *which good thing* gets built, never over
> deception. The promise ("you decide what we build next") stays literally true.

---

## 5. Investment Mechanics (psychology → feature)

| Lever | Concrete feature |
|---|---|
| **IKEA effect / ownership** | Suggester credit on the ballot *and* on the shipped build card forever. |
| **Social proof** | Live shared totals, "X votes cast", "Leading" badge. |
| **Scarcity / urgency** | Countdown timer on the vote; flash countdown on micro-votes. |
| **Progress / sunk cost** | "Shipped together" wall grows; "N builds shipped with you" counter. |
| **Reciprocity** | The tool they chose is shipped free *and* made replicable by them. |
| **Identity (light)** | Optional handle attached to suggestions/credit. (Leaderboard deferred.) |
| **Variable feeling** | Episode sequencing varies emotion (serious → everyday → quick win → warm → civic crescendo) per `PROJECT_BRIEF.md §5`. |

---

## 6. Components

### 6.1 The Curated Vote (exists, needs real backend)
- Lives in the hub `#vote` section. Config-driven via the `VOTE` object.
- 3 pre-scoped options, suggester credit, optional deadline, one-vote-per-device.
- **Change:** counts move from per-browser `localStorage` to a **shared backend**
  (§6.5). The existing `readCounts()`/`writeCounts()` seam is the wiring point.

### 6.2 Suggestion Intake (replaces the `alert()` stub)
- The "Suggest a problem" button currently fires a placeholder `alert()`
  (`index.html:453`).
- **v1 (lowest effort):** point it at an external form (Tally / Google Form) — zero
  backend, instant. Host exports submissions and moderates manually.
- **v2 (optional later):** a tiny Worker endpoint writing to the same DO/D1 so
  suggestions appear in an admin queue. Deferred unless volume demands it.
- Submissions are **moderated before they ever surface** (integrity + civic safety).

### 6.3 The "Shipped Together" Wall (exists)
- The builds grid is the trophy case. On ship, the card flips to `live` with its URL
  (mechanism already built), and gains a line: *"You picked this — suggested by
  @handle, won with NN% of the vote."*
- **Change:** add optional `suggestedBy` and `votePct` fields to `BUILDS` entries,
  rendered on live cards.

### 6.4 In-Build Micro-Votes (new, the live-retention hook)
- Ephemeral "flash polls" fired during the live build: name, accent colour, which
  hotspot/route/example to test first.
- Short countdown (60–120s), result overlay, then discard. Not persisted long-term.
- Same backend as the main vote, in a lightweight "flash" mode.
- Purpose: keep viewers present *during* the build and widen subtle control.

### 6.5 Shared Vote Backend (the one piece of real engineering)
- **Decision: Cloudflare Durable Object**, not KV.
  - KV is eventually-consistent → a live counter that lags or jumps looks broken.
  - A DO gives a single authoritative instance with **atomic increments**, optional
    **WebSocket** push for real-time on-stream updates, and tamper resistance.
- **Shape (to be detailed in the implementation plan, using the `durable-objects`
  skill):**
  - One DO instance per active poll (`current-poll`); flash polls get ephemeral IDs.
  - `GET /poll/:id` → `{ options, counts, total, deadline, closed }`.
  - `POST /poll/:id/vote` → idempotent per voter token (cookie/localStorage UUID +
    IP-based rate limit); rejects after deadline; one vote per token.
  - `WS /poll/:id` → live count stream for the hub and the stream overlay.
- **Graceful degradation:** if the backend is unreachable, the hub falls back to the
  existing `localStorage` preview so the page never looks broken. Keep that code path.
- **Integrity stance:** "good enough," not tamper-proof. Document that for a
  high-stakes count the host can *also* run the platform-native poll (YouTube/X) in
  parallel. This is honest and on-brand.

### 6.6 Off-Stream Funnel (spec-level only)
- Each build already flags `clip` moments. Those become vertical clips
  (TikTok / X / Shorts) with a single CTA: **"Vote on the next build → hub link."**
- Detailed content cadence is owned by the social skills
  (`social-media-manager`, `content-calendar`, `x-writer`) in a later pass — not built
  here, but named so the loop is complete.

---

## 7. Scope

**In scope (this design):**
- The engagement loop + flywheel definition.
- Curated vote wired to a shared Durable Object backend, with `localStorage` fallback.
- Suggestion intake hooked to a real form (v1).
- Suggester credit + vote share on shipped build cards.
- In-build micro-vote ("flash poll") mode.
- The clip→funnel loop at the spec level (named, not built).

**Deferred (YAGNI for now):**
- Monetization (sponsorship, donations, paid community). Layer later.
- Viewer accounts / auth. Light handles only.
- Suggester leaderboard + full gamification.
- **Approach C** (viewers contributing the tools' real ground-truth data) — higher
  moderation + civic-accusation risk; revisit after trust and scale.
- Concurrent multi-poll support beyond one main + ephemeral flash polls.

---

## 8. Integrity, Safety & Moderation

- **Vote integrity:** per-device voter token + IP rate limiting; deadline enforced
  server-side in the DO. Accept it is not tamper-proof; offer the parallel
  platform-poll option for high-stakes cycles.
- **Suggestion moderation:** nothing reaches a ballot without host review. Screen for
  civic-accusation risk (esp. galamsey) per `PROJECT_BRIEF.md §7` — awareness from
  public data only, never accusation of individuals.
- **Brand voice:** warm, honest, never overpromising; disclaimers preserved on every
  shipped tool that touches safety/money/civic topics.

---

## 9. Testing

- **DO unit tests (Vitest):** atomic increment under concurrency; idempotent vote per
  token; rejects vote after deadline; correct totals/percentages.
- **Fallback test:** backend unreachable → hub renders the `localStorage` preview
  without errors.
- **Manual / on-stream rehearsal:** vote from two devices → shared count agrees;
  deadline closes the poll; a flash poll opens, counts, and closes within its window.

---

## 10. Suggested Build Order (for the implementation plan)

1. **Stub fills (no backend):** suggest-button → real form; favicon; show name. *(fast)*
2. **Shared vote backend:** Durable Object + Worker routes + WebSocket; wire the hub's
   `readCounts()`/`writeCounts()` seam to it with `localStorage` fallback.
3. **Suggester credit on shipped cards:** `suggestedBy` / `votePct` fields + render.
4. **In-build micro-vote (flash poll) mode** on the same backend + a simple stream
   overlay view.
5. **Clip→funnel pass** with the social skills (separate spec).

---

*End of design. Next step: the writing-plans skill turns the approved sections above
into a step-by-step implementation plan, starting with the shared vote backend.*
