# Explicit, Follow-Along Build Guides — Design

**Date:** 2026-06-07
**Status:** Draft for review
**Owner:** OHWPStudios (ohwpstudios@gmail.com)
**Related:** `PROJECT_BRIEF.md` (§2 accessibility, §6 pipeline, §7 guardrails), `index.html` (the hub)

---

## 1. Problem & Goal

The hub's build cards open a step-by-step guide, but the directions aren't yet
"extremely explicit for all viewers to follow":

- Every step assumes the viewer has **Claude Code** (paid). The label literally
  reads *"Type this to Claude Code."* But per `PROJECT_BRIEF.md §2`, **most
  viewers are on the free Claude.ai web tier (Artifacts)** and have no Claude Code.
- There are **no prerequisites** — nothing says what you need before step A, how
  long it takes, or whether anything must be installed.
- There is **no success signal or recovery** per step — a beginner can't tell if a
  step worked or what to do when it didn't.
- **#003 MoMo, #004 Quiz, #005 Galamsey** are `"Guide coming soon"` placeholders.

**Goal:** every project on the hub has directions a complete beginner can follow —
on Claude Code *or* on the free Claude.ai web tier — with a clear "before you
start," a copy-paste prompt per step, a success check, and a recovery hint.

---

## 2. Scope

**In scope:**
- A "Before you start" block per build (time, setup, the two follow-along paths).
- A dual-path model (Claude Code **and** free Claude.ai web), handled correctly
  for builds that can't be rebuilt on free web.
- Per-step `✓ You'll see` (success signal) and `⚠ If stuck` (one recovery hint).
- Click-to-copy on every prompt (relabelled "Copy prompt" since it serves both
  paths); the existing copy button is kept and applied consistently.
- Full step-by-step guides for #003, #004, #005.
- `BUILDS` data-model additions + `openBuild()` render + minimal CSS, all inside
  the single self-contained `index.html`.

**Out of scope (YAGNI):**
- The vote backend, suggestion intake, suggester credit, micro-votes.
- Reworking the host-facing "clip" production notes (kept as-is).
- Any build/dependency step — the hub stays a single offline file.

---

## 3. Data Model (the `BUILDS` array)

Each build entry gains:

```js
time: "~75 min",                 // shown in the start block
setup: "No install needed — a single copy-paste file.",  // one-line setup note
webBuildable: true,              // true => rebuildable in a free Claude.ai Artifact
```

Each step object gains two optional fields (kept alongside `h`, `p`, `prompt`, `clip`):

```js
see: "Type an amount → the fee and 'what lands' update instantly.",  // ✓ success signal
fix: "If it errors on load, ask: 'remove any localStorage, use a plain variable.'", // ⚠ recovery
```

`webBuildable` drives the path text in the start block:
- **`true`** (single-file builds #002/#003/#004): web path = *paste the prompt into
  a new chat at claude.ai → the app appears as an Artifact you can use right away
  and copy.*
- **`false`** (#001 flood needs Python, #005 galamsey needs map/data tooling): web
  path = *this one can't be rebuilt in a single chat — use the live tool (link on
  the card once shipped).*

---

## 4. "Before You Start" Block (top of every guide)

Rendered between the modal header and the steps:

```
⏱ <time> · <setup>
Two ways to follow along:
  1. Claude Code (paid): paste each "Copy prompt" and follow along.
  2. Free Claude.ai web: paste the same prompt into a new chat at claude.ai —
     the app appears in the preview (an Artifact) you can use now and copy.
```

For `webBuildable:false` builds the second path reads:
```
  2. Free Claude.ai web: this one needs <Python | map tools> locally and can't be
     rebuilt in a single chat — use the live tool instead (link on the card once shipped).
```

---

## 5. Per-Step Presentation

Unchanged: number/letter badge, `h` title, `p` one-line why, the prompt in a
copyable box. Changes:

- Prompt box label changes from **"Type this to Claude Code"** → **"Copy prompt"**
  (works for both paths). `copyP()` updated to strip the new label.
- Below the prompt, render when present:
  - `✓ You'll see: <see>` (muted green)
  - `⚠ If stuck: <fix>` (muted amber)
- The `clip` note stays as today (host/creator cue), rendered last.

---

## 6. New & Updated Guide Content

### #001 Flood Map (update only)
Add `time:"~2 hrs"`, `setup:"Needs Python on your computer — not a single file."`,
`webBuildable:false`. Add `see`/`fix` to its four existing steps, e.g.
step A `see:"A height-map file (accra_dem.tif) downloads and renders."`,
`fix:"If the download stalls, ask Claude to retry or pick a smaller area."`

### #002 Which Trotro? (update only)
Add `time:"~75 min"`, `setup:"No install needed — a single copy-paste file."`,
`webBuildable:true`. Add `see`/`fix` to its four steps, e.g.
step B `see:"Pick Madina → Circle and the route + fare appears."`,
`fix:"If the dropdowns are empty, ask: 'fill the dropdowns from routes.js.'"`

### #003 MoMo Fee Calculator (new full guide — single-file, in-memory, placeholders)
`time:"~45 min"`, `setup:"No install needed — a single copy-paste file."`, `webBuildable:true`.

- **A — Set up the fee data.** *p:* "List each network's fee tiers as editable
  numbers you can correct live."
  *prompt:* "I'm building a Mobile Money fee calculator for Ghana. Create an editable
  data section at the top of the file with placeholder send-money fee tiers for MTN
  MoMo, Telecel Cash and AirtelTigo Money — each an array of {minAmount, maxAmount,
  fee} bands in cedis, plus any cap. Mark every number 'PLACEHOLDER — verify with
  official rates' so I can correct them on stream. Keep it simple."
  *see:* "A clearly-labelled list of fee bands at the top you can edit."
  *fix:* "If the fees look baked into the logic, ask: 'move every fee into one
  editable list at the top.'"
- **B — Build the calculator.** *prompt:* "Build a single index.html (HTML+CSS+JS in
  one file, no external libraries, and no localStorage — use in-memory state only so
  it runs inside a Claude.ai Artifact) using those fee tiers: a network picker, an
  amount input, and an instant result showing the fee and exactly what the receiver
  gets. If the amount is outside the tiers, show a friendly message."
  *see:* "Type an amount → the fee and 'what lands' update instantly."
  *fix:* "If it's blank or errors on load, ask: 'remove any localStorage and use a
  plain variable.'"
- **C — Make it look good.** *prompt:* "Style index.html mobile-first with an
  OHWPStudios header, Ghana accent colours, a big amount input and network buttons, a
  clear result card, and a bottom disclaimer that fees differ by network and change —
  check official rates."
  *see:* "A clean, branded calculator that looks right on a phone."
  *fix:* "If it looks cramped on mobile, ask: 'make it mobile-first with big tap targets.'"
- **D — Test & ship.** *prompt:* "Help me test a few amounts against known fees, check
  the out-of-range message, and that it looks good phone-sized. Then help me deploy to
  Cloudflare Pages — or, on free Claude.ai web, copy the finished index.html from the
  Artifact."
  *see:* "Correct fees for several amounts, and a shareable result."
  *fix:* "If a fee looks wrong, correct the placeholder number in the data list."

### #004 Quiz Trainer (new full guide — single-file, in-memory, placeholders)
`time:"~50 min"`, `setup:"No install needed — a single copy-paste file."`, `webBuildable:true`.

- **A — Add your questions.** *prompt:* "I'm building a quiz trainer for Ghanaian
  students (NSMQ/BECE style). Create an editable questions list at the top of the file
  with ~8 placeholder questions for one subject — each with the question text, four
  options, the correct option, and a one-line explanation. Mark them 'PLACEHOLDER —
  replace with real past questions' so I can swap in real ones."
  *see:* "A tidy, editable list of questions at the top of the file."
  *fix:* "If questions are scattered in the code, ask: 'put all questions in one
  editable list at the top.'"
- **B — Build the quiz engine.** *prompt:* "Build a single index.html (HTML+CSS+JS in
  one file, no external libraries, no localStorage — in-memory state only so it works
  in a Claude.ai Artifact): show one question at a time with tappable options, mark
  right/wrong and show the explanation, track the score, and move to the next."
  *see:* "Tap an answer → it marks correct/wrong and shows why."
  *fix:* "If tapping does nothing, ask: 'use button onClick handlers, not a form submit.'"
- **C — Add the score screen.** *prompt:* "At the end, show a score screen: 'You scored
  X out of Y', a short message, the questions missed with their explanations, and a
  'Try again' button that restarts the quiz."
  *see:* "A final score with a 'Try again' button that restarts."
  *fix:* "If 'Try again' doesn't reset, ask: 'reset the score and question index on retry.'"
- **D — Style & ship.** *prompt:* "Style it mobile-first with the OHWPStudios header,
  Ghana accent colours, big tappable options, a progress indicator, and a clear score
  screen. Add a disclaimer that it's a study aid — cross-check official syllabi. Then
  deploy to Cloudflare Pages, or copy the finished index.html from the Artifact on free web."
  *see:* "A polished, branded quiz that works on a phone."
  *fix:* "If it overflows on mobile, ask: 'make options full-width and stacked.'"

### #005 Galamsey Watch (new guide — careful, awareness-only, NOT single-file)
`time:"~2 hrs"`, `setup:"Needs map/data tools locally — not a single file."`, `webBuildable:false`.
Disclaimer (already present) stays prominent. Every prompt encodes the
`PROJECT_BRIEF.md §7` guardrail: **awareness from public data only, never accusation
of individuals.**

- **A — Gather public data (awareness only).** *p:* "Use only public, official data —
  nothing that names or accuses any person."
  *prompt:* "I'm building an awareness map of galamsey (illegal mining) impact in Ghana
  using ONLY public, official data — for example published satellite-derived
  deforestation or water-turbidity layers, EPA / Forestry Commission reports, or open
  datasets. Help me find and download suitable open layers for affected regions. This
  is for public awareness and monitoring only — not enforcement or accusation of any
  individual."
  *see:* "One or more open, public data layers downloaded."
  *fix:* "If a source needs a login or names individuals, skip it — public, aggregate
  data only."
- **B — Turn data into impact zones.** *prompt:* "Process the public data into clear
  impact bands (for example forest loss or water-quality change over time), saved in a
  web-friendly format like GeoJSON, with a short methodology note listing the sources."
  *see:* "Impact bands plus a written note of where the data came from."
  *fix:* "If the bands look arbitrary, ask Claude to explain the thresholds in plain words."
- **C — Build the awareness map.** *prompt:* "Build a dark MapLibre GL map of the
  affected regions showing the impact layer, a legend, a methodology/sources panel, and
  a prominent disclaimer that this is an awareness tool from public data only — not
  accusation of individuals or enforcement. Put it in a 'website' folder."
  *see:* "A dark map with the impact layer, legend, sources panel and disclaimer."
  *fix:* "If the disclaimer isn't obvious, ask: 'make the awareness-only disclaimer prominent.'"
- **D — Review & ship.** *prompt:* "Review the map to confirm the awareness-only framing
  and that no individual is identified, then help me deploy it to Cloudflare Pages."
  *see:* "A reviewed, deployed awareness map with no individual named."
  *fix:* "If anything could identify a person, remove it before deploying."

---

## 7. Render & CSS Changes (`index.html`)

- `openBuild()`: insert the start block (from `time`, `setup`, `webBuildable`) between
  `.mhead` and the steps; render `see`/`fix` lines after each step's prompt; relabel
  the prompt box "Copy prompt".
- A small `pathsText(b)` helper builds the two-paths copy based on `webBuildable` and
  `setup`.
- `copyP()`: update the stripped label from `"Type this to Claude Code"` → `"Copy prompt"`.
- CSS: add `.startblock` (panel using `--panel`/`--line`), `.see` (muted green),
  `.fix` (muted amber), reusing existing tokens. No new dependencies.

---

## 8. Accessibility, Brand & Guardrails

- Free-web prompts explicitly require **in-memory state, no `localStorage`** (Artifacts
  block browser storage — `PROJECT_BRIEF.md §7`).
- Local-data prompts (#003/#004) use **editable placeholders** the host corrects on
  stream — preserving "real values come from the host."
- **#005 galamsey** content is awareness-only, public-data-only, never naming
  individuals — enforced in every prompt and the disclaimer.
- `✓`/`⚠` lines meet AA contrast on the dark theme; copy buttons remain ≥44px tap targets.
- Brand voice: warm, plain, honest; disclaimers preserved on every build.

---

## 9. Testing / Verification

- **Headless browser (Playwright):** open #002 and #003 — assert the start block
  renders, each step shows the prompt + `✓`/`⚠`, the "Copy prompt" button copies the
  prompt text, and there are no console errors.
- **Regression:** the live-vote section and the rest of the hub still work; open a
  `webBuildable:false` build (#001) and confirm its path text says "use the live tool."
- **Content check:** every build now has ≥3 real steps (no "coming soon"), each with a
  prompt; #005 prompts contain the awareness-only framing.

---

## 10. Suggested Build Order (for the implementation plan)
1. Extend the `BUILDS` schema + add `time`/`setup`/`webBuildable` + `see`/`fix` to
   #001 and #002.
2. Write the three new guides (#003, #004, #005) into `BUILDS`.
3. Update `openBuild()` render (start block + ✓/⚠ + "Copy prompt") and `copyP()`; add CSS.
4. Verify headlessly (offline + a webBuildable:false build) — no regressions.

*End of design.*
