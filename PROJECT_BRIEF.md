# OHWPStudios — Claude Code Project Brief

Everything Claude Code needs to continue this project. Keep this file in the repo root as `PROJECT_BRIEF.md` — it's your source of truth, and you can point Claude Code at it any time with *"read PROJECT_BRIEF.md and continue."*

---

## ⚡ PASTE THIS FIRST (your opening message to Claude Code)

> I'm building a brand/show called **OHWPStudios** — a livestream series where I use Claude Code to build small, genuinely useful tools that solve real Ghanaian problems, live, and simple enough that anyone watching could replicate them. There's a hub website that showcases each build, generates "build briefs," and lets the community vote on what gets built next.
>
> I have an existing `index.html` for the hub (I'll add it to this folder). First, read `PROJECT_BRIEF.md` in full, then read `index.html`, then give me a short summary of (1) what the hub already does, (2) what's still stubbed/incomplete, and (3) a suggested order of next steps. Don't change anything yet — just confirm you understand the project. After that I'll direct you task by task.

---

## 1. What this project is

**OHWPStudios** = the umbrella brand/studio.
The **show/format** = "community names a real problem → we scope it → build it live with Claude Code → ship a novice guide so anyone can replicate it → the community votes on what's next."

**Core promise (one line):** *"Real problems, built live, simple enough to build yourself."*

**Why it's different:** It's not generic coding content. It's Ghana-rooted civic/everyday tools, and every build is deliberately designed so a beginner — even on the free Claude plan — can follow along or rebuild it.

**Naming note:** The studio is OHWPStudios. The *show* name is being decided (leading candidate: **Nnoboa** — the Akan tradition of communal mutual help — with a plain-English tagline). If/when chosen, it goes in the hub hero and footer.

---

## 2. The audience & accessibility constraint (IMPORTANT for every build)

- I build via **Claude Code in the terminal (Max plan)**. Most viewers don't have that.
- Claude Code requires a **paid** plan; there is **no free Claude Code**.
- BUT the **free Claude.ai web tier includes Artifacts** — so a free user can paste a build prompt into the web chat and get a working single-file app in an Artifact they can copy.
- **Therefore: every build should be a single, copy-pasteable `index.html` wherever possible** (HTML+CSS+JS in one file). This keeps builds replicable by free-tier users. Avoid multi-file setups, package installs, and local servers unless truly necessary.
- The one current exception is the flood map (needs Python locally) — for that, free users use the live deployed tool instead of rebuilding.

**Rule of thumb for Claude Code:** prefer single-file, no-build-step, no-dependency, offline-capable web apps. Note it explicitly whenever a build can't meet that bar.

---

## 3. My stack & environment

- **OS / shell:** Windows + PowerShell
- **Tooling installed:** Node.js, Python, Git, Claude Code, Wrangler
- **Hosting:** Cloudflare Pages (drag-and-drop or Wrangler). Cloudflare account handle: `ghwmelite`.
- **Design system:** dark theme, Ghana national colours (green `#0a8f56`/`#006B3F`, gold `#FCD116`, red `#CE1126`) on near-black, serif headings (Georgia), kente ribbon accent, Adinkra motifs, Akan/Ewe proverbs. Mobile-first.
- **Brand voice:** warm, confident, honest about limitations; always includes a clear disclaimer on tools that touch safety, money, or sensitive civic topics.

---

## 4. The hub website (`index.html`) — current state

A single self-contained `index.html` (no dependencies, works offline). Sections:

1. **Hero** — pre-launch messaging ("Launching soon · Build along live"), stat counter showing "BUILDS PLANNED."
2. **Builds grid** — cards for builds #001–#005. Each card opens a modal with a step-by-step guide: every step has a copy-paste Claude Code prompt, flagged "clip moments," and a disclaimer.
   - Build data lives in a `BUILDS` array in the `<script>`. Each entry has: `num, status, statusLabel, url, icon, title, desc, pills, disclaimer, steps[]`.
   - **To flip a build to LIVE after streaming it:** set `status:"live"`, `statusLabel:"Live"`, and paste the deployed link into `url`. The card then shows a "Visit the live tool" button + pulsing live dot, and the top counter switches to "BUILDS SHIPPED" automatically. (Instructions are commented above the `BUILDS` array.)
   - Statuses: `"live" | "next" | "upcoming" | "soon"`.
3. **How it works** — the 5-step method (pick problem → scope small → build live → write guide → ship & share).
4. **Build Brief Forge** — a template-based generator. User picks a build type (map/calc/lookup/quiz/form/other) + fills fields → outputs a clean Claude Code prompt, a scope box (build this / not yet), a buildability check (pass/warn + verdict), and "moments to film." Fully offline. Template library is in a `FORGE_TYPES` object (commented for easy extension).
5. **Live Vote** — three pre-screened options on a ballot, tap-to-vote, animated result bars, "Leading" badge, optional countdown, suggester credit per option. Config is in a `VOTE` object near the bottom of the script.
   - **LIMITATION:** vote counts are stored per-browser via `localStorage` (a live *preview*), NOT shared between visitors. The marked `readCounts()`/`writeCounts()` functions are where to wire a real backend later.
6. **Community / Suggest** — CTA button (currently a placeholder `alert()` — needs hooking to a real form/socials) + footer with Akan proverb.

### Known stubs to finish (don't surprise me — confirm before doing)
- "Suggest a problem" button → point at a real Google Form / X / YouTube community link.
- Logo/favicon → currently a styled "O" mark; swap in real assets.
- Show name → insert once chosen.
- (Later) Real shared voting backend.

---

## 5. The build slate (Phase 1 — I choose; community voting comes later)

| # | Name | What it is | Single-file? | Notes |
|---|------|-----------|--------------|-------|
| 001 | Accra Flood-Risk Map | Map of flood-prone areas from elevation (DEM) | No (Python) | Civic. Validate vs real floods. Strong disclaimer: prototype, not an official warning; follow GMet/NADMO. |
| 002 | Which Trotro? | Pick start+destination → route + approx fare | Yes, offline | Everyday. Fares are approximate/community-maintained; confirm with mate. |
| 003 | MoMo Fee Calculator | Enter amount → fee + what lands | Yes, offline | Money. Fees differ by network/change; check official rates. |
| 004 | NSMQ/BECE Quiz Trainer | Drill past questions, track score, explain | Yes, offline | Education. Study aid; cross-check official syllabi. |
| 005 | Galamsey Watch | Map galamsey impact from public data | No (map/data) | Civic. AWARENESS/monitoring ONLY — never accuse individuals; public data only. |

**Sequencing intent:** vary the *feeling* each episode (serious-visual → everyday → quick money win → warm education → serious-civic crescendo). Protect scope ruthlessly: one feature, one session.

---

## 6. The repeatable per-build pipeline (how each stream should run)

For any build, Claude Code should help me execute this loop:

1. **Scope** — confirm the single simplest version; state what's IN and what's OUT (no scope creep).
2. **Prompt** — the build is driven by one clean prompt (the Forge generates these; I'll paste or we refine together).
3. **Build live** — single `index.html` where possible; explain each step simply; I narrate.
4. **Validate** — test it against reality on camera (e.g. actually check a route/fee/flood spot).
5. **Brand polish** — OHWPStudios header, Ghana colours, mobile-first, an Adinkra accent, the right disclaimer.
6. **Deploy** — Cloudflare Pages; get the live URL.
7. **Update the hub** — flip that build's card to `live` with its URL; write/attach the novice guide.
8. **Clips** — identify 3–4 short vertical clip moments for TikTok/X/YouTube.

---

## 7. Hard rules / guardrails (apply to everything)

- **Single-file, no-dependency, offline-capable** web builds by default. Flag any exception.
- **Always add an honest disclaimer** on anything touching safety, money, health, or civic accusation. Especially: flood = "prototype, not an official warning"; galamsey = "awareness from public data, not accusation."
- **No browser storage in artifacts that run inside Claude.ai** (localStorage/sessionStorage fail there) — use in-memory state. (The hub itself, deployed on Cloudflare, CAN use localStorage — that's fine. The distinction: builds meant to be rebuilt in a free-tier Artifact must avoid browser storage.)
- **Accuracy matters most for local data** (fares, fees) — I supply/correct real values; the AI's guesses are placeholders only.
- **Keep my brand voice:** warm, honest, Ghana-rooted, never overpromising.

---

## 8. Suggested next steps (Claude Code can propose its own order)

- Finish hub stubs (suggest-button link, logo/favicon, show name).
- Scope + build **#002 Which Trotro?** as the first single-file, copy-pasteable build (offline, dropdowns, fixed fares).
- Set up a clean repo structure (e.g. `/hub`, `/builds/002-trotro`, etc.) and Git.
- Optionally: a tiny Cloudflare Worker + KV to power real shared voting (a future episode in itself).

---

*End of brief. Point Claude Code here any time: "read PROJECT_BRIEF.md and continue."*
