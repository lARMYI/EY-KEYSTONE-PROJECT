# The Keystone Lab — a working concept for EY

A cinematic, single-page pitch site for **The Keystone Lab**: EY's proposed frontier systems lab that turns frontier AI into governed, certifiable enterprise infrastructure. Independent working concept for leadership review — not an authorized EY publication (the disclaimer is visible in the hero and footer).

Static site — no build step, no framework, no dependencies to install. Open it and it runs.

## Running it

Any static file server works:

```bash
# from the repo root
python3 -m http.server 8000
# then open http://localhost:8000
```

Or deploy as-is to GitHub Pages / Netlify / any static host (`index.html` is the entry point). Three.js (r128) and the Fraunces / Hanken Grotesk / JetBrains Mono fonts load from CDNs, so a network connection is needed for the full experience.

## What's on the page

A decision-first scrollytelling narrative. The hero carries the ask (a 90-day scale-or-stop decision), and the page is organized as seven executive parts, each with clearly labeled supporting-detail sections beneath it:

1. **Why now** (`#whynow`, `#thesis`, `#futures`) — own the governed systems layer or run downstream of someone else's, with a three-futures scenario board (Own / Rent / Wait at 9/18/36 months, labeled strategic inference)
2. **What Keystone is** (`#keystone`) — the four-thing executive layer: *the Lab builds it, the OS runs it, the Gate certifies it, the Proving Ground proves it* — with deep dives (`#lab`, `#build`, `#keystoneos`, `#truth`, `#intel`, `#trust`)
3. **What it proves first** (`#lighthouse`, `#products`) — three banking demonstrators
4. **Why EY can win** (`#model`, `#partners`, `#adoption`) — trust, independence, domain complexity, EY.ai momentum
5. **Why John** (`#whyjohn`) — operator fit, not biography
6. **The 90-day proof** (`#decision`) — six checkable yes/no gates, now an interactive readiness board (flip each gate; the scale / hold / stop verdict computes itself) with a printable one-page decision brief
7. **The scale path** (`#ask`, `#nolose`, `#flywheel`, `#shape`) — 9 / 18 / 36 months, staged as a no-lose option

A closing **Sources & evidence** section (`#sources`) footnotes every EY-public and peer claim (EY newsroom, Deloitte, KPMG, Accenture); in-text superscripts link to it. All of it carried by:

- **A morphing 3D keystone spine** (`js/keystone3d.js`) — one WebGL keystone, fixed behind all content, that morphs as you scroll: whole at the hero → splits into three voussoir wedges at the platform section → becomes a spinning flywheel hub → locks inside the golden Gate frame → seals front-facing and glowing at the CTA. Falls back silently to a drawn SVG arch if Three.js or WebGL is unavailable.
- **The interactive Keystone Gate** (`js/gate.js`) — pick an agent, run a six-step certification (Identity → Evaluation → Independence → Red-team → Attestation → Passport), and mint a unique Agent Passport with stamps, an evidence hash, and a certified badge.
- **The Keystone OS simulation readout** (`js/kos.js`) — live-counting run stats, a streaming console with BLOCKED / CONTAINED / HELD events, and an "Environment certified" bar.
- **The Intelligence Layer command deck** (`js/keystone-intel.js`) — a lens-switchable executive instrument panel (Board / Risk / Delivery rooms) over the evidence ledger: KPI tiles with sparklines, a streaming signal feed, and a per-room decision brief. Deterministic, clearly badged as *simulated evidence · Keystone-proposed* and framed as a day-90 replay, not live telemetry. The same module powers the interactive day-90 readiness board and the print-brief button in `#decision`.
- **The adaptive audience lens** (`js/keystone-lens.js`) — pick a seat (Leadership / Risk & Independence / Technology / Client) and the page re-briefs itself: authored "through your lens" callouts appear in key sections, a five-stop reading path is offered, and the briefing agent adopts the persona. Supports `?lens=risk`-style deep links, persists the choice, and offers a dismissible "resume where this device left off" toast on return visits. Pure progressive enhancement — without JS the page is unchanged.
- **The Keystone briefing agent** (`js/keystone-ai.js`) — a slide-out chat drawer running a visible 5-stage pipeline (Router → Retrieve → Draft → Red team → Gate) over a per-section knowledge base, a 15-fact data ontology, and a claim registry with truth statuses (Verified EY-public claims link to the actual ey.com sources). Streams rich text and charts; refusals render as on-thesis "Gate · policy hold" cards. When no LLM is reachable it degrades to a **static brief** — a verbatim answer assembled from the page's own knowledge base, streamed through the same pipeline UI with an honest "Static brief · no model" badge.
- **Micro-interactions** (`js/keystone-fx.js`) — 3D tilt + glare on cards, a trailing cursor halo, magnetic buttons, cursor spotlight, scroll-synced flywheel, counters, and reveals (`js/keystone.js`).

## Structure

```
index.html            page shell — all section content lives here (incl. the print-only decision brief)
css/keystone.css      the full design system (tokens, atmosphere, components, chat, print brief)
js/keystone3d.js      WebGL keystone spine (Three.js r128, progressive enhancement)
js/keystone.js        core: reveals, counters, flywheel, generated grids, health fallback
js/gate.js            interactive Gate certification + Agent Passport + evidence-trace drill-down
js/kos.js             Keystone OS simulation readout
js/keystone-intel.js  Intelligence Layer command deck + day-90 readiness board + print brief
js/keystone-lens.js   adaptive audience lens (personas, reading paths, resume toast)
js/keystone-fx.js     card tilt/glare + cursor halo (fine pointers only)
js/keystone-ai.js     the briefing agent (chat drawer, agent pipeline, truth layer, static fallback)
```

Design tokens live in `:root` in `css/keystone.css` — navy ground (`#070A10`), metallic gold (`#E9B84A`), Fraunces for display, Hanken Grotesk for UI, JetBrains Mono for labels.

## The briefing agent and its LLM

`js/keystone-ai.js` calls `window.claude.complete({messages})` (the hosted-artifact contract it was designed against, model `claude-haiku-4-5`). When that API is absent — e.g. on a plain static host — the chat degrades to the **static brief** path: it retrieves the best-matching knowledge-base section for the question, streams it verbatim through the same pipeline UI, and badges the reply "Static brief · no model" so the reader knows nothing was generated.

To wire a real backend, define the same contract **before** `js/keystone-ai.js` loads:

```html
<script>
  window.claude = {
    complete: async ({ messages }) => {
      // proxy to your LLM endpoint; return the assistant reply as a string
      const r = await fetch('/api/complete', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages }),
      });
      return (await r.json()).text;
    },
  };
</script>
```

Keep the model call server-side — never ship API keys in this page.

## Robustness notes

Built into the design and worth preserving when editing:

- **Progressive enhancement everywhere** — no WebGL → SVG arch; no LLM → static-brief chat fallback; no fine pointer → tilt/halo disabled; no JS → the lens layer and interactive boards simply don't appear, and the readiness checklist still reads as a checklist.
- **Animation-health fallback** — if the document timeline freezes (throttled/background tab), everything force-reveals to its end state and counters fill in; a watcher restores animation when the tab recovers.
- **Reduced motion** — `prefers-reduced-motion` collapses animations to instant states across all modules.
- **Accessibility** — keyboard-operable disclosure rows (OS stack, risk matrix), `aria-expanded` state, labeled canvases, `aria-live` chat log, Escape closes the drawer.
