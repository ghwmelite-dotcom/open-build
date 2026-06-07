# Explicit, Follow-Along Build Guides — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every build guide in the hub (`index.html`) explicit enough for any viewer to follow — on Claude Code or the free Claude.ai web tier — with a "Before you start" block, per-step success/recovery hints, copy-paste prompts, and full guides for the three currently-empty builds.

**Architecture:** Pure data + presentation change inside the single self-contained `index.html`. The `BUILDS` array gains build-level fields (`time`, `setup`, `webBuildable`) and per-step fields (`see`, `fix`); `openBuild()` renders a start block (via a `pathsText()` helper) and the success/recovery lines, and relabels the prompt box "Copy prompt"; a little CSS styles the new blocks. No new dependencies.

**Tech Stack:** Vanilla HTML/CSS/JS (single file). Verification via Python Playwright (headless Chromium) using the webapp-testing helper, matching the pattern already used in this repo.

**Reference:** `docs/superpowers/specs/2026-06-07-explicit-build-guides-design.md`.

---

## File Structure

- Modify: `index.html`
  - `BUILDS` array (currently `index.html:482`–`558`) — add fields + three new guides.
  - `openBuild()` (currently `index.html:602`–`631`) — start block + success/recovery lines + relabel.
  - `copyP()` (currently `index.html:633`–`637`) — update stripped label.
  - CSS — add `.startblock` / `.see` / `.fix` rules near `.stepline` (`index.html:176`).

Everything lives in one file; tasks are split by responsibility (data for #001/#002, data for the three new guides, render+CSS, verification) so each is a self-contained commit that leaves the page working.

---

## Task 1: Add start-block + success/recovery fields to #001 and #002

**Files:**
- Modify: `index.html` (the #001 and #002 entries in `BUILDS`, currently `index.html:483`–`523`)

- [ ] **Step 1: Replace the #001 entry**

Replace the build object that begins `num:"BUILD #001"` (currently `index.html:483`–`503`) with exactly:

```js
  {
    num:"BUILD #001", status:"next", statusLabel:"Up first", url:"",
    icon:"🌊", title:"Accra Flood-Risk Map",
    desc:"An interactive map showing which parts of Greater Accra flood — calculated purely from the shape of the land.",
    pills:["Maps","Civic","~2 hrs"],
    disclaimer:"Educational prototype — not an official flood warning. Follow GMet & NADMO for real alerts.",
    time:"~2 hrs", setup:"Needs Python on your computer — not a single file.", webBuildable:false,
    steps:[
      {h:"Get Accra's elevation data", p:"Download a Digital Elevation Model (DEM) — a height map of the land.",
       prompt:"I'm building a flood-risk map for Greater Accra. Download a DEM GeoTIFF for latitude 5.4–5.9, longitude -0.4–0.2 using the free OpenTopography Copernicus GLO-30 dataset. Set up a Python environment, install rasterio, save it as accra_dem.tif, and walk me through each step.",
       see:"A height-map file (accra_dem.tif) downloads and renders as a grey relief image.",
       fix:"If the download stalls or errors, ask Claude to retry or pick a slightly smaller area.",
       clip:"CLIP: the first elevation render — Accra's shape appears."},
      {h:"Turn elevation into flood risk", p:"Find the low, flat spots where water naturally collects.",
       prompt:"From accra_dem.tif, use a hydrology library to fill pits, compute flow direction, flow accumulation, and slope, then combine low elevation + low slope + high accumulation into a 0–100 flood-risk score saved as flood_risk.tif. Make a red=high, blue=low preview image.",
       see:"A red/blue preview where rivers and low basins show up red.",
       fix:"If it's all one colour, ask Claude to re-check the score formula and the colour scale.",
       clip:"CLIP: watercourses emerging from raw elevation — biggest moment."},
      {h:"Check it against real floods", p:"Do the known flood hotspots land in your red zones?",
       prompt:"Add markers for real Accra flood hotspots — Circle/Odaw, Kaneshie, Alajo, Adabraka, Weija, Adentan, Oyarifa, Tema — and show whether they fall in my high-risk zones. Make a preview with the pins.",
       see:"Pins on known hotspots, most sitting inside the red zones.",
       fix:"If pins are off the map, ask Claude to double-check the latitude/longitude order.",
       clip:"HEADLINE CLIP: real flood spots matching the red zones."},
      {h:"Build & deploy the web map", p:"Turn it into a shareable website on Cloudflare Pages.",
       prompt:"Convert the risk data to GeoJSON risk bands and build a dark MapLibre map of Accra with the layer, toggleable hotspot pins, a legend, and a prototype disclaimer. Put it in a 'website' folder and help me deploy to Cloudflare Pages.",
       see:"A dark interactive map you can pan/zoom, with a legend and disclaimer.",
       fix:"If the map is blank, ask Claude to confirm the GeoJSON loaded and the layer is added.",
       clip:"CLIP: the live URL — 'check your area right now.'"}
    ]
  },
```

- [ ] **Step 2: Replace the #002 entry**

Replace the build object that begins `num:"BUILD #002"` (currently `index.html:504`–`524`) with exactly:

```js
  {
    num:"BUILD #002", status:"upcoming", statusLabel:"Upcoming", url:"",
    icon:"🚐", title:"Which Trotro?",
    desc:"Pick where you are and where you're going — get the trotro route and approximate fare. Works fully offline.",
    pills:["Everyday","Offline","~75 min"],
    disclaimer:"Routes & fares are approximate and community-maintained — always confirm with the mate or driver.",
    time:"~75 min", setup:"No install needed — a single copy-paste file.", webBuildable:true,
    steps:[
      {h:"Build the route data", p:"Write down the main stations and routes with fares.",
       prompt:"Create a routes.js file with major Accra trotro stations (Circle, Kaneshie, Tema Station, Madina, Achimota, Lapaz, Dansoman, Adenta, Kasoa, 37, Tudu, Accra Central) and routes between them — each with start, destination, approximate fare in cedis, and a note (direct or change at a hub). Use editable placeholder fares I can correct.",
       see:"A tidy list of stations and routes with fares you can edit.",
       fix:"If fares are scattered through the code, ask: 'put every fare in one editable list.'",
       clip:"CLIP: you correcting the AI's fares with local knowledge — very shareable."},
      {h:"Build the app", p:"Two dropdowns and a 'Find my trotro' button.",
       prompt:"Build a single index.html (HTML+CSS+JS in one file) using routes.js: two dropdowns 'Where are you now?' and 'Where do you want to go?' filled from the stations, and a 'Find my trotro' button that shows the route, any change-over, and the fare. If no route exists, show a friendly message. Must work fully offline.",
       see:"Pick Madina → Circle, press the button, and the route + fare appears.",
       fix:"If the dropdowns are empty, ask: 'fill the dropdowns from the stations in routes.js.'",
       clip:"CLIP: first working answer — Madina to Circle, route + fare."},
      {h:"Make it look good", p:"Style it as a polished, mobile-first OHWPStudios build.",
       prompt:"Style index.html clean and mobile-first with an OHWPStudios header, Ghana accent colours, big tappable dropdowns and button, a result card, and a bottom disclaimer that routes/fares are approximate and community-maintained.",
       see:"A clean, branded page that looks right on a phone.",
       fix:"If it looks cramped on mobile, ask: 'make it mobile-first with big tap targets.'",
       clip:"CLIP: plain page → polished branded app."},
      {h:"Test & deploy", p:"Click through it, then publish on Cloudflare Pages.",
       prompt:"Help me test: dropdowns fill, a known route works, an unknown route shows the friendly message, and it looks good phone-sized. Then help me deploy the folder to Cloudflare Pages.",
       see:"A known route works, an unknown one shows the friendly message, and you have a live URL.",
       fix:"If deploy fails, ask Claude to walk through the Cloudflare Pages steps one at a time.",
       clip:"CLIP: the live URL — share it, tease Build #003."}
    ]
  },
```

- [ ] **Step 3: Verify the page still loads with no errors**

Run:
```bash
cd /c/dev/OpenBuild
python "C:/Users/USER/.claude/plugins/cache/anthropic-agent-skills/document-skills/da20c92503b2/skills/webapp-testing/scripts/with_server.py" --server "python -m http.server 8080" --port 8080 -- python -c "from playwright.sync_api import sync_playwright;
errs=[]
with sync_playwright() as p:
 b=p.chromium.launch(headless=True); pg=b.new_page(); pg.on('pageerror',lambda e:errs.append(str(e)))
 pg.goto('http://localhost:8080/index.html'); pg.wait_for_load_state('networkidle')
 b.close()
assert not errs, errs; print('LOADS_OK')"
```
Expected: `LOADS_OK` (the new fields are inert until Task 3 adds the render; the page must still load cleanly).

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat(hub): add start-block + success/recovery fields to builds #001 and #002"
```

---

## Task 2: Write full guides for #003, #004, #005

**Files:**
- Modify: `index.html` (the #003/#004/#005 entries in `BUILDS`, currently `index.html:525`–`557`)

- [ ] **Step 1: Replace the #003 entry**

Replace the build object that begins `num:"BUILD #003"` (currently `index.html:525`–`535`) with exactly:

```js
  {
    num:"BUILD #003", status:"soon", statusLabel:"Planned", url:"",
    icon:"💸", title:"MoMo Fee Calculator",
    desc:"Type what you're sending — see the fee and exactly what lands. Tiny to build, hugely relatable.",
    pills:["Money","Quick win","Coming"],
    disclaimer:"Fee structures differ by network and change — check official rates too.",
    time:"~45 min", setup:"No install needed — a single copy-paste file.", webBuildable:true,
    steps:[
      {h:"Set up the fee data", p:"List each network's fee tiers as editable numbers you can correct live.",
       prompt:"I'm building a Mobile Money fee calculator for Ghana. Create an editable data section at the top of the file with placeholder send-money fee tiers for MTN MoMo, Telecel Cash and AirtelTigo Money — each an array of {minAmount, maxAmount, fee} bands in cedis, plus any cap. Mark every number 'PLACEHOLDER — verify with official rates' so I can correct them on stream. Keep it simple.",
       see:"A clearly-labelled list of fee bands at the top of the file you can edit.",
       fix:"If the fees look baked into the logic, ask: 'move every fee into one editable list at the top.'",
       clip:"CLIP: you correcting the placeholder fees with real rates."},
      {h:"Build the calculator", p:"A network picker, an amount box, and an instant result.",
       prompt:"Build a single index.html (HTML+CSS+JS in one file, no external libraries, and no localStorage — use in-memory state only so it runs inside a Claude.ai Artifact) using those fee tiers: a network picker, an amount input, and an instant result showing the fee and exactly what the receiver gets. If the amount is outside the tiers, show a friendly message.",
       see:"Type an amount → the fee and 'what lands' update instantly.",
       fix:"If it's blank or errors on load, ask: 'remove any localStorage and use a plain variable.'",
       clip:"CLIP: first instant fee — type 100, see the cut."},
      {h:"Make it look good", p:"Style it as a polished, mobile-first OHWPStudios build.",
       prompt:"Style index.html mobile-first with an OHWPStudios header, Ghana accent colours, a big amount input and network buttons, a clear result card, and a bottom disclaimer that fees differ by network and change — check official rates.",
       see:"A clean, branded calculator that looks right on a phone.",
       fix:"If it looks cramped on mobile, ask: 'make it mobile-first with big tap targets.'",
       clip:"CLIP: plain page → polished branded app."},
      {h:"Test & ship", p:"Check a few amounts, then publish (or copy the Artifact).",
       prompt:"Help me test a few amounts against known fees, check the out-of-range message, and that it looks good phone-sized. Then help me deploy to Cloudflare Pages — or, on free Claude.ai web, copy the finished index.html from the Artifact.",
       see:"Correct fees for several amounts, and a shareable result.",
       fix:"If a fee looks wrong, correct the placeholder number in the data list at the top.",
       clip:"CLIP: the live URL — share it, tease Build #004."}
    ]
  },
```

- [ ] **Step 2: Replace the #004 entry**

Replace the build object that begins `num:"BUILD #004"` (currently `index.html:536`–`546`) with exactly:

```js
  {
    num:"BUILD #004", status:"soon", statusLabel:"Planned", url:"",
    icon:"📚", title:"Quiz Trainer (NSMQ/BECE)",
    desc:"A clean quiz app that drills past questions, tracks your score, and explains the answers.",
    pills:["Education","Interactive","Coming"],
    disclaimer:"A study aid — always cross-check with official syllabi and past papers.",
    time:"~50 min", setup:"No install needed — a single copy-paste file.", webBuildable:true,
    steps:[
      {h:"Add your questions", p:"Put the questions in one editable list you can swap out.",
       prompt:"I'm building a quiz trainer for Ghanaian students (NSMQ/BECE style). Create an editable questions list at the top of the file with ~8 placeholder questions for one subject — each with the question text, four options, the correct option, and a one-line explanation. Mark them 'PLACEHOLDER — replace with real past questions' so I can swap in real ones.",
       see:"A tidy, editable list of questions at the top of the file.",
       fix:"If questions are scattered in the code, ask: 'put all questions in one editable list at the top.'",
       clip:"CLIP: swapping in a real past question."},
      {h:"Build the quiz engine", p:"One question at a time, mark right/wrong, track score.",
       prompt:"Build a single index.html (HTML+CSS+JS in one file, no external libraries, no localStorage — in-memory state only so it works in a Claude.ai Artifact): show one question at a time with tappable options, mark right/wrong and show the explanation, track the score, and move to the next.",
       see:"Tap an answer → it marks correct/wrong and shows why.",
       fix:"If tapping does nothing, ask: 'use button onClick handlers, not a form submit.'",
       clip:"CLIP: first right/wrong with the explanation popping up."},
      {h:"Add the score screen", p:"Show the score, the misses, and a 'Try again'.",
       prompt:"At the end, show a score screen: 'You scored X out of Y', a short message, the questions missed with their explanations, and a 'Try again' button that restarts the quiz.",
       see:"A final score with a 'Try again' button that restarts.",
       fix:"If 'Try again' doesn't reset, ask: 'reset the score and question index on retry.'",
       clip:"CLIP: the score reveal."},
      {h:"Style & ship", p:"Polish it mobile-first, then publish (or copy the Artifact).",
       prompt:"Style it mobile-first with the OHWPStudios header, Ghana accent colours, big tappable options, a progress indicator, and a clear score screen. Add a disclaimer that it's a study aid — cross-check official syllabi. Then deploy to Cloudflare Pages, or copy the finished index.html from the Artifact on free web.",
       see:"A polished, branded quiz that works on a phone.",
       fix:"If options overflow on mobile, ask: 'make options full-width and stacked.'",
       clip:"CLIP: the live URL — share it, tease Build #005."}
    ]
  },
```

- [ ] **Step 3: Replace the #005 entry**

Replace the build object that begins `num:"BUILD #005"` (currently `index.html:547`–`556`) with exactly:

```js
  {
    num:"BUILD #005", status:"soon", statusLabel:"Planned", url:"",
    icon:"⛏️", title:"Galamsey Watch",
    desc:"Mapping galamsey's impact from public data — an awareness & monitoring tool, never accusation.",
    pills:["Civic","Maps","Coming"],
    disclaimer:"Awareness tool built from public information only — not enforcement or accusation of individuals.",
    time:"~2 hrs", setup:"Needs map/data tools on your computer — not a single file.", webBuildable:false,
    steps:[
      {h:"Gather public data (awareness only)", p:"Use only public, official data — nothing that names or accuses any person.",
       prompt:"I'm building an awareness map of galamsey (illegal mining) impact in Ghana using ONLY public, official data — for example published satellite-derived deforestation or water-turbidity layers, EPA / Forestry Commission reports, or open datasets. Help me find and download suitable open layers for affected regions. This is for public awareness and monitoring only — not enforcement or accusation of any individual.",
       see:"One or more open, public data layers downloaded.",
       fix:"If a source needs a login or names individuals, skip it — public, aggregate data only.",
       clip:"CLIP: the first public dataset loading."},
      {h:"Turn data into impact zones", p:"Process it into clear impact bands with a methodology note.",
       prompt:"Process the public data into clear impact bands (for example forest loss or water-quality change over time), saved in a web-friendly format like GeoJSON, with a short methodology note listing the sources.",
       see:"Impact bands plus a written note of where the data came from.",
       fix:"If the bands look arbitrary, ask Claude to explain the thresholds in plain words.",
       clip:"CLIP: impact zones emerging from raw data."},
      {h:"Build the awareness map", p:"A dark map with the layer, legend, sources and disclaimer.",
       prompt:"Build a dark MapLibre GL map of the affected regions showing the impact layer, a legend, a methodology/sources panel, and a prominent disclaimer that this is an awareness tool from public data only — not accusation of individuals or enforcement. Put it in a 'website' folder.",
       see:"A dark map with the impact layer, legend, sources panel and disclaimer.",
       fix:"If the disclaimer isn't obvious, ask: 'make the awareness-only disclaimer prominent.'",
       clip:"CLIP: the awareness map coming together."},
      {h:"Review & ship", p:"Confirm the framing names no one, then deploy.",
       prompt:"Review the map to confirm the awareness-only framing and that no individual is identified, then help me deploy it to Cloudflare Pages.",
       see:"A reviewed, deployed awareness map with no individual named.",
       fix:"If anything could identify a person, remove it before deploying.",
       clip:"CLIP: the live URL — awareness, responsibly."}
    ]
  }
```

> Note: this is the LAST entry in the `BUILDS` array — it has no trailing comma before the closing `]` (the original #005 entry was last too).

- [ ] **Step 4: Verify the page still loads with no errors**

Run the same load check as Task 1 Step 3.
Expected: `LOADS_OK`.

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "feat(hub): add full follow-along guides for builds #003, #004, #005"
```

---

## Task 3: Render the start block, success/recovery lines, and relabel the prompt

**Files:**
- Modify: `index.html` — CSS near `index.html:176`; `openBuild()` `index.html:602`; `copyP()` `index.html:633`

- [ ] **Step 1: Add CSS for the new blocks**

Immediately after the `.stepline .sc p{...}` rule (currently `index.html:182`), add:

```css
  .startblock{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:14px 16px;margin-bottom:18px}
  .startblock .sb-meta{font-size:13.5px;color:var(--muted);margin-bottom:8px}
  .startblock .sb-h{display:block;color:#fff;font-weight:700;margin-bottom:4px}
  .startblock .sb-paths{font-size:13.5px;color:var(--muted);line-height:1.7}
  .startblock .sb-paths b{color:#fff;font-weight:600}
  .sc .see{font-size:13px;color:#7fd49b;margin-top:8px;line-height:1.5}
  .sc .fix{font-size:13px;color:#e8c372;margin-top:5px;line-height:1.5}
  .sc .see b,.sc .fix b{font-weight:600}
```

- [ ] **Step 2: Add the `pathsText()` helper and render the start block + success/recovery lines**

Replace the entire `openBuild()` function (currently `index.html:602`–`631`) with exactly:

```js
function pathsText(b){
  const cc = `<b>1. Claude Code (paid):</b> paste each “Copy prompt” into Claude Code and follow along.`;
  const web = b.webBuildable
    ? `<b>2. Free Claude.ai web:</b> paste the same prompt into a new chat at claude.ai — the app appears in the preview (an Artifact) you can use right away and copy.`
    : `<b>2. Free Claude.ai web:</b> this build needs tools on your computer and can’t be rebuilt in a single chat — use the live tool instead (the button appears on the card once it’s shipped).`;
  return cc + '<br>' + web;
}
function openBuild(i){
  const b=BUILDS[i];
  const startBlock = b.time ? `<div class="startblock">
        <div class="sb-meta">⏱ ${b.time} · ${b.setup}</div>
        <div class="sb-paths"><span class="sb-h">Two ways to follow along:</span>${pathsText(b)}</div>
      </div>` : '';
  modal.innerHTML=`
    <div class="mhead">
      <button class="close" onclick="closeBuild()">✕</button>
      <span class="num">${b.num}</span>
      <h3>${b.icon} ${b.title}</h3>
      <p>${b.desc}</p>
    </div>
    <div class="mbody">
      ${startBlock}
      ${b.steps.map((s,n)=>`
        <div class="stepline">
          <div class="sn">${b.steps.length>1?String.fromCharCode(65+n):'•'}</div>
          <div class="sc">
            <h4>${s.h}</h4>
            <p>${s.p}</p>
            ${s.prompt && s.prompt[0]!=='(' ? `<div class="prompt">
              <span class="lbl">Copy prompt</span>
              <button class="copy" onclick="copyP(this)">Copy</button>
              ${s.prompt}</div>`:`<div class="note" style="background:var(--panel);border-color:var(--line-l);color:var(--muted)">${s.prompt}</div>`}
            ${s.see?`<div class="see">✓ <b>You'll see:</b> ${s.see}</div>`:''}
            ${s.fix?`<div class="fix">⚠ <b>If stuck:</b> ${s.fix}</div>`:''}
            ${s.clip?`<div class="clip"><b>📹 ${s.clip.split(':')[0]}:</b>${s.clip.split(':').slice(1).join(':')}</div>`:''}
          </div>
        </div>`).join('')}
    </div>
    <div class="mfoot">
      <span class="disc">⚠️ ${b.disclaimer}</span>
      ${b.status==='live'&&b.url?`<a class="btn primary" style="padding:10px 18px;font-size:14px" href="${b.url}" target="_blank" rel="noopener">🔗 Visit the live tool</a>`:''}
    </div>`;
  scrim.classList.add('show');document.body.style.overflow='hidden';
}
```

- [ ] **Step 3: Update `copyP()` to strip the new label**

Replace the `copyP()` function (currently `index.html:633`–`637`) with exactly:

```js
function copyP(btn){
  let txt=btn.parentElement.textContent.replace('Copy prompt','').replace('Copy','').trim();
  navigator.clipboard.writeText(txt).then(()=>{btn.textContent='Copied ✓';setTimeout(()=>btn.textContent='Copy',1500)});
}
```

- [ ] **Step 4: Quick load check**

Run the same load check as Task 1 Step 3.
Expected: `LOADS_OK`.

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "feat(hub): render start block + success/recovery lines; relabel prompt 'Copy prompt'"
```

---

## Task 4: Verify the guides headlessly

**Files:**
- Create (temporary): `tmp_verify_guides.py` (removed after the run; not committed)

- [ ] **Step 1: Write the verification script**

Create `tmp_verify_guides.py`:

```python
"""Verify the explicit build guides render correctly and the page is clean."""
from playwright.sync_api import sync_playwright

errors = []
with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    pg = b.new_page()
    pg.on("console", lambda m: errors.append(f"{m.type}: {m.text}") if m.type == "error" else None)
    pg.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
    pg.goto("http://localhost:8080/index.html")
    pg.wait_for_load_state("networkidle")

    cards = pg.locator("#grid .open")
    assert cards.count() >= 5, f"expected >=5 build cards, got {cards.count()}"

    # --- A web-buildable build (#003 MoMo) ---
    pg.locator('#grid .open').nth(2).click()
    pg.wait_for_timeout(300)
    sb = pg.locator(".startblock")
    assert sb.count() == 1, "start block missing"
    assert "Two ways to follow along" in sb.inner_text()
    assert "Free Claude.ai web" in sb.inner_text() and "Artifact" in sb.inner_text(), "web path text missing"
    steps = pg.locator(".stepline")
    assert steps.count() >= 4, f"#003 should have 4 steps, got {steps.count()}"
    assert pg.locator(".sc .see").count() >= 4, "missing 'You'll see' lines"
    assert pg.locator(".sc .fix").count() >= 4, "missing 'If stuck' lines"
    assert pg.locator(".prompt .lbl").first.inner_text() == "Copy prompt", "prompt not relabelled"
    # copy button works
    pg.locator(".prompt .copy").first.click()
    pg.wait_for_timeout(200)
    assert pg.locator(".prompt .copy").first.inner_text().startswith("Copied"), "copy did not fire"
    pg.locator(".close").click(); pg.wait_for_timeout(200)

    # --- A non-web-buildable build (#001 Flood) ---
    pg.locator('#grid .open').nth(0).click()
    pg.wait_for_timeout(300)
    sbt = pg.locator(".startblock").inner_text()
    assert "use the live tool" in sbt, "non-web build should tell free users to use the live tool"
    pg.locator(".close").click(); pg.wait_for_timeout(200)

    # --- No more "coming soon" placeholders anywhere ---
    for idx in range(cards.count()):
        pg.locator('#grid .open').nth(idx).click(); pg.wait_for_timeout(150)
        body = pg.locator(".mbody").inner_text().lower()
        assert "coming soon" not in body, f"build {idx} still has a placeholder"
        pg.locator(".close").click(); pg.wait_for_timeout(120)

    b.close()

print("console/page errors:", errors)
assert not errors, errors
print("GUIDES_OK")
```

- [ ] **Step 2: Run it**

```bash
cd /c/dev/OpenBuild
python "C:/Users/USER/.claude/plugins/cache/anthropic-agent-skills/document-skills/da20c92503b2/skills/webapp-testing/scripts/with_server.py" --server "python -m http.server 8080" --port 8080 -- python tmp_verify_guides.py 2>&1 | tail -12
```
Expected: `GUIDES_OK` (start block, success/recovery lines, relabelled+working copy button, the live-tool path for #001, and no remaining "coming soon").

- [ ] **Step 3: Remove the temp script**

```bash
rm -f tmp_verify_guides.py
```

- [ ] **Step 4: Commit (verification only — no code change)**

No commit needed if Step 3 only removed an untracked file. Confirm a clean tree:
```bash
git status --short
```
Expected: empty (all guide changes already committed in Tasks 1–3).

---

## Self-Review

**1. Spec coverage** (against `docs/superpowers/specs/2026-06-07-explicit-build-guides-design.md`):
- §3 data-model (`time`/`setup`/`webBuildable`, step `see`/`fix`) → Tasks 1–2 add them to all 5 builds. ✓
- §4 "Before you start" block → Task 3 `startBlock` + `pathsText()`. ✓
- §5 per-step presentation, "Copy prompt" relabel, ✓/⚠ lines → Task 3. ✓
- §6 new guides #003/#004/#005 → Task 2 (full content, editable placeholders, in-memory/no-localStorage prompts, awareness-only #005). ✓
- §7 render + `copyP()` + CSS → Task 3. ✓
- §8 guardrails (no-localStorage in web prompts, placeholders, galamsey awareness-only) → encoded in Task 2 prompt text. ✓
- §9 testing → Task 4 (web build, non-web build, copy, no "coming soon", no console errors). ✓

**2. Placeholder scan:** The word "PLACEHOLDER" appears only inside prompt text as intended editable-data guidance, not as a plan gap. Every step shows complete code/commands. ✓

**3. Type consistency:** Build fields `time`/`setup`/`webBuildable` and step fields `see`/`fix` are introduced in Tasks 1–2 and consumed by `startBlock`/`pathsText()`/step render in Task 3 with identical names. The render guards on `b.time` and `s.see`/`s.fix` so partially-updated data never throws. `copyP()` strips `'Copy prompt'` matching the new label. ✓

---

## Follow-on (out of scope here)
- Suggester credit on shipped cards; in-build micro-votes; suggestion intake — separate plans.
- Replacing editable placeholder fees/questions with real, host-verified values (done on stream).
