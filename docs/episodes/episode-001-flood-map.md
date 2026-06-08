# Host Script — Build #001: Accra Flood‑Risk Map

*Your live playbook. The build card on the hub shows viewers the public **story**; this is the on‑air flow — cues, reveals, micro‑vote timing. Don't read it verbatim; riff.*

**Promise:** "Today we find out which parts of Accra flood — not from a report, but from the **shape of the land itself** — and it's simple enough you could rebuild it yourself."
**Runtime:** ~2 hrs · **Tools:** Claude Code + Python · **Disclaimer must be said on air** (see below).

---

## Cold open (first ~60 sec)
- Hook with the stakes: *"On June 3rd, 2015, floodwater at Kwame Nkrumah Circle carried fuel from a filling station — one spark, and more than 150 people died. Accra floods almost every single rainy season."*
- Turn it forward: *"Why? Today we let the land answer — and by the end you'll be able to check your own area."*
- Ask the chat: **"Does your area flood? Drop it now — we'll check it live later."** (Pin it.)

## Running order

**A · Get the elevation data** *(while it downloads)*
- One‑liner: *"A DEM is just a height map — every point's height above sea level."*
- 💧 Drop a fact: *"Accra makes ~1 million tonnes of plastic a year and recycles under 10% — and it ends up choking the Odaw, the city's main drain."*
- 📹 **Clip:** the first elevation render — "Accra's shape appears."

**B · Turn elevation into flood risk**
- Explain simply: *"Water runs downhill and pools where it's low, flat, and lots of water funnels in. We're scoring exactly that."*
- Banter: *"Notice — we never told the computer where floods happen. It's working it out from gravity alone."*
- 📹 **Clip:** watercourses emerging from raw elevation (big visual moment).

**C · Check it against real floods** — THE reveal
- **Fire the micro‑vote FIRST:** *"Call it before the reveal — will Circle, Kaneshie, Weija land in the red? Vote 👍/👎."*
- Then drop the pins. 📹 **HEADLINE CLIP:** real hotspots sitting inside the red zones.
- 💧 Fact: *"Building codes ban construction in waterways — but weak enforcement means homes went up right on the drains."*

**D · Build & deploy the map** — the payoff
- *"Now anyone can check their own area."* Pull up a viewer's area from the chat.
- 📹 **Clip:** the live URL going public.

## Disclaimer (say clearly, once, around the reveal)
> "This is an **educational prototype** built from public elevation data — **not** an official flood warning. For real alerts, follow **GMet** and **NADMO**."

## Outro / CTA
- Recap: *"We turned gravity into a flood map, live, in about two hours — and you can rebuild it from the prompts on the site."*
- CTAs: **vote on the next build** (open-build.ohwpstudios.org), **join @openbuildch** for alerts, **share the clip**.
- Tease #002 (Which Trotro?).

## Clip list (for the editor — 4 verticals)
1. Elevation render appears  2. Watercourses emerging *(lead clip)*  3. Real hotspots matching red zones **(headline)**  4. The live URL — "check your area."

## Verified facts (sources)
- June 3, 2015: >150 killed at Kwame Nkrumah Circle; floodwater + leaked GOIL fuel + a spark. — [Wikipedia](https://en.wikipedia.org/wiki/2015_Accra_floods)
- Causes: choked Odaw drain (plastic), wetlands built over, homes on waterways, weak enforcement. — [Accra Street Journal, 2026](https://accrastreetjournal.com/2026/05/26/accras-expanding-flood-map-threatens-to-swallow-the-capital-as-poor-planning-fuels-crisis/)
- Plastic: ~1M tonnes/yr, <10% recycled.

*After the cycle: add the suggester credit + flip the card to live (see GO‑LIVE‑GUIDE.md).*
