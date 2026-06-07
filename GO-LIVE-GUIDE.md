# Open Build — Go‑Live Guide

Everything you need to **check that it all works** and **run a build cycle**. Plain steps, copy‑paste commands. Windows / PowerShell.

---

## Your links & keys

| Thing | Value |
|---|---|
| **Hub (public site)** | https://open-build.ohwpstudios.org  (also https://open-build.pages.dev) |
| **Vote/announce backend** | https://ohwp-vote.ghwmelite.workers.dev |
| **Announcements channel** | `@openbuildch` (public) |
| **Suggestions group** | your private Telegram group (the bot posts new suggestions there) |
| **Admin key** | stored locally at `vote-backend\.admin-secret` (never commit it) |
| **Poll id** | `current` |

> 💡 In every command below, `$secret = Get-Content vote-backend\.admin-secret` loads your admin key.

---

## Part 1 — Pre‑launch check (≈10 min, all on the live site)

Open **https://open-build.ohwpstudios.org** on your laptop and tick these off:

- [ ] **Brand** — gold "O" in the browser tab, **Open Build** in the header & footer, **OHWPStudios.org ↗** button top‑right opens your main site.
- [ ] **Vote** — tap an option → the bars fill, percentages show, a **Leading** badge appears, and you can't vote twice. A **🟢 N watching now** chip shows.
- [ ] **Real‑time (the big one)** — open the site on your **phone** too. Vote on one device → the other updates in **~1 second**, and the "watching" count goes up. (If it's slow it silently falls back to a 5‑second refresh — still works.)
- [ ] **Suggestions** — scroll to **"You name the problem"**, fill the form, hit **Send suggestion** → you see "Thank you", and the suggestion **appears in your private Telegram group**.
- [ ] **Build alerts** — tap **Get build alerts → Telegram** → it opens **@openbuildch** to join.
- [ ] **Share** — tap **WhatsApp** / **Copy link** in the hero. Paste the link into a WhatsApp chat → it shows the **branded preview card**.
- [ ] **Install (PWA)** — browser menu → **Install app** / **Add to Home Screen** → it opens like an app and works offline.
- [ ] **Build guides** — open any build card → step‑by‑step guide with **Copy prompt** buttons and the "two ways to follow" block.

If all ticked, the site is healthy. 🎉

---

## Part 2 — Running a build cycle (your weekly loop)

**1. Shortlist 3 problems.** If you're changing the ballot options, edit `index.html` → find `const VOTE` → update `options` (keep each `id` short), then run `.\deploy-hub.ps1` (see Part 4). **The ids in your ballot must match the ids in the publish command below.**

**2. Publish the vote** (zeroes the counts and auto‑announces to the channel):
```powershell
cd C:\dev\OpenBuild
$secret = Get-Content vote-backend\.admin-secret
curl -Method POST "https://ohwp-vote.ghwmelite.workers.dev/api/poll/current/init" `
  -Headers @{ Authorization="Bearer $secret"; "Content-Type"="application/json" } `
  -Body '{"options":[{"id":"momo","name":"MoMo Fee Calculator"},{"id":"trotro","name":"Which Trotro?"},{"id":"quiz","name":"NSMQ Quiz Trainer"}],"reset":true,"announce":true}'
```
→ Expect `{"ok"...,"counts":{...all 0}}` and a **"🗳️ Voting is open"** post in @openbuildch.

**3. On stream day — tell people you're live:**
```powershell
$secret = Get-Content vote-backend\.admin-secret
curl -Method POST "https://ohwp-vote.ghwmelite.workers.dev/api/announce" `
  -Headers @{ Authorization="Bearer $secret"; "Content-Type"="application/json" } `
  -Body '{"text":"🔴 We are LIVE now — building this week''s winner. Watch + vote: https://open-build.ohwpstudios.org"}'
```

**4. See the result anytime:**
```powershell
curl "https://ohwp-vote.ghwmelite.workers.dev/api/poll/current"
```

**5. Ship the winner.** After you build & deploy the tool, flip its card to live (Part 3) and announce it:
```powershell
$secret = Get-Content vote-backend\.admin-secret
curl -Method POST "https://ohwp-vote.ghwmelite.workers.dev/api/announce" `
  -Headers @{ Authorization="Bearer $secret"; "Content-Type"="application/json" } `
  -Body '{"text":"🚀 Shipped! <b>Which Trotro?</b> is live — try it on the hub."}'
```

---

## Part 3 — Common edits (then run `.\deploy-hub.ps1`)

All of these are small edits in **`index.html`**, then **publish with `.\deploy-hub.ps1`**.

**Flip a build to LIVE** (find its entry in `const BUILDS`):
```js
status:"live", statusLabel:"Live", url:"https://your-tool.pages.dev",
suggestedBy:"@kojo", votePct:62,   // optional — shows "🏆 Community pick" credit
```

**Show the next‑stream countdown** — find `const SITE` → set:
```js
nextStream: "2026-06-19T20:00:00+00:00",   // your stream date/time (UTC offset)
```
(Leave it `""` to hide it again.)

**Add names to the builders wall** — in `const SITE`:
```js
builders: [{ handle:"@kojo", note:"suggested Which Trotro?" }],
```

**Turn on analytics** — no code: Cloudflare dashboard → **Workers & Pages → open-build → Metrics / Web Analytics → Enable**.

---

## Part 4 — Publishing site changes

After editing `index.html` (or brand assets), publish with **one command**:
```powershell
cd C:\dev\OpenBuild
.\deploy-hub.ps1
```
→ Wait for **"Hub deployed"**, then **hard‑refresh** the site (`Ctrl+Shift+R`) to see changes.

> The backend (vote/announce) rarely changes. If you ever need to redeploy it: `cd vote-backend; npm run deploy`.

---

## Part 5 — If something looks off

| Symptom | Fix |
|---|---|
| Site shows old version after editing | Run `.\deploy-hub.ps1`, then **hard‑refresh** (`Ctrl+Shift+R`). Favicons are sticky — reopen the tab. |
| Vote not updating live | It auto‑falls back to a 5‑sec refresh — still works. Check the backend is up: open https://ohwp-vote.ghwmelite.workers.dev/api/poll/current (should return JSON). |
| `announce` returns `502` | The bot isn't a **channel admin**. Add it to @openbuildch → Administrators → enable "Post Messages". |
| Suggestions not arriving in Telegram | The bot must be a **member of your suggestions group**. |
| Vote counts wrong on the page | The ballot `id`s in `index.html` (`VOTE.options`) must match the `id`s you `init` with. |
| Need a new admin key | `cd vote-backend; npx wrangler secret put ADMIN_SECRET` (then update `vote-backend\.admin-secret`). |

---

## Reference

- **Brand assets** (Telegram photos, banners, thumbnail, header, OG card): the `brand/` folder — see `brand/README.md`.
- **Site feature config**: `index.html`, search for **`SITE FEATURES`**.
- **Don't commit**: `vote-backend\.admin-secret` and `vote-backend\.dev.vars` (already git‑ignored).

*You're ready. Run Part 1, then Part 2 when you go live. 🟢*
