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

1. **Why now** (`#whynow`, `#thesis`) — own the governed systems layer or run downstream of someone else's
2. **What Keystone is** (`#keystone`) — the four-thing executive layer: *the Lab builds it, the OS runs it, the Gate certifies it, the Proving Ground proves it* — with deep dives (`#lab`, `#build`, `#keystoneos`, `#truth`, `#trust`)
3. **What it proves first** (`#lighthouse`, `#products`) — three banking demonstrators
4. **Why EY can win** (`#model`, `#partners`, `#adoption`) — trust, independence, domain complexity, EY.ai momentum
5. **Why John** (`#whyjohn`) — operator fit, not biography
6. **The 90-day proof** (`#decision`) — six checkable yes/no gates
7. **The scale path** (`#ask`, `#nolose`, `#flywheel`, `#shape`) — 9 / 18 / 36 months, staged as a no-lose option

A closing **Sources & evidence** section (`#sources`) footnotes every EY-public and peer claim (EY newsroom, Deloitte, KPMG, Accenture); in-text superscripts link to it. All of it carried by:

- **A morphing 3D keystone spine** (`js/keystone3d.js`) — one WebGL keystone, fixed behind all content, that morphs as you scroll: whole at the hero → splits into three voussoir wedges at the platform section → becomes a spinning flywheel hub → locks inside the golden Gate frame → seals front-facing and glowing at the CTA. Falls back silently to a drawn SVG arch if Three.js or WebGL is unavailable.
- **The interactive Keystone Gate** (`js/gate.js`) — pick an agent, run a six-step certification (Identity → Evaluation → Independence → Red-team → Attestation → Passport), and mint a unique Agent Passport with stamps, an evidence hash, and a certified badge.
- **The Keystone OS simulation readout** (`js/kos.js`) — live-counting run stats, a streaming console with BLOCKED / CONTAINED / HELD events, and an "Environment certified" bar.
- **The Keystone briefing agent** (`js/keystone-ai.js`) — a slide-out chat drawer running a visible 5-stage pipeline (Router → Retrieve → Draft → Red team → Gate) over a per-section knowledge base, a 15-fact data ontology, and a claim registry with truth statuses (Verified EY-public claims link to the actual ey.com sources). Streams rich text and charts; refusals render as on-thesis "Gate · policy hold" cards.
- **Micro-interactions** (`js/keystone-fx.js`) — 3D tilt + glare on cards, a trailing cursor halo, magnetic buttons, cursor spotlight, scroll-synced flywheel, counters, and reveals (`js/keystone.js`).

## Structure

```
index.html             page shell — all main pitch content lives here
roadmap.html           supplement — "Becoming AI-native": definition, maturity ladder, horizons, scorecard
maturity.html          supplement — the seven transformation pillars, charted across the three horizons
quarters.html          supplement — the twelve-quarter development plan (Phase 0 → Phase 3)
css/keystone.css       the full design system (tokens, atmosphere, components, chat)
js/keystone3d.js       WebGL keystone spine (Three.js r128, progressive enhancement)
js/keystone.js         core: reveals, counters, flywheel, generated grids, health fallback
js/gate.js             interactive Gate certification + Agent Passport
js/kos.js              Keystone OS simulation readout
js/keystone-fx.js      card tilt/glare + cursor halo (fine pointers only)
js/keystone-ai.js      the briefing agent (chat drawer, agent pipeline, truth layer)
js/keystone-roadmap.js the AI-native roadmap "memory" (data) + self-contained renderer/runtime
```

## The AI-native roadmap supplement

Three companion pages turn the pitch's "Prove → Scale → Transform" arc into a concrete transformation plan, in the same design language as `index.html` (the main page is left untouched). They are driven entirely by one data structure — `window.KEYSTONE_ROADMAP` in `js/keystone-roadmap.js` — which is both the **new "AI memory"** and the page renderer:

- **`roadmap.html`** — what *AI-native* means (vs AI-assisted), the **L0–L5 maturity ladder** (Manual → Assisted → Augmented → Orchestrated → Governed-autonomous → AI-native), the **three horizons** (today / +12 months / +3 years), a **success scorecard** across capability, governance, economics and talent, and **twelve cross-cutting enablers** the plan must also carry (funding, an independence firewall, data access, security, liability, client procurement, change management, vendor exit, evaluation, talent, regulator engagement, compute cost).
- **`maturity.html`** — **seven pillars** (the Lab, Keystone OS, the Gate, the Truth Layer, Workforce, Proving Grounds, Economics), each charted *today / +12 months / +3 years* with the metric that proves the move.
- **`quarters.html`** — a **12-quarter** development plan across four phases (each quarter: a theme, a target maturity level and a yes/no measure), plus an **honest, capability-gated read of the dates** — independence clearance and bank procurement move slower than any Gantt chart, so the later phases re-date by roughly +12–24 months and L5 is treated as a destination, not a 2029 deliverable, with a stated stop-condition (kill metric).

### Cross-navigation

`index.html` is wired to the supplement two ways: an **"AI-native roadmap"** nav link, and a **"Go deeper" deep-dive button injected into every pitch section** by `js/keystone-deeplinks.js`, each pointing at the matching in-depth area (e.g. the Gate section → `maturity.html#pillar-gate`). Every deep link carries `?from=<section-id>`, and the supplement pages read it to show a fixed **"← Back to: <section>"** pill (`renderBack` in `keystone-roadmap.js`) that returns the reader to exactly where they were.

`keystone-roadmap.js` is deliberately self-contained (its own reveals, nav, progress and animation-health fallback) so the supplements do **not** depend on `keystone.js`. The same facts are mirrored into the briefing agent's memory in `js/keystone-ai.js` (new `ainative` / `roadmap` KB topics, new chartable `FACTS`, and new `CLAIMS` ids — `ey7`, `mk5–mk7`, `ks5–ks7`) so the agent can discuss the roadmap with the same evidence discipline. Everything proposed here is labeled **Keystone-proposed**; EY-public facts stay cited to EY's record.

Design tokens live in `:root` in `css/keystone.css` — navy ground (`#070A10`), metallic gold (`#E9B84A`), Fraunces for display, Hanken Grotesk for UI, JetBrains Mono for labels.

## The briefing agent and its LLM

`js/keystone-ai.js` calls `window.claude.complete({messages})` (the hosted-artifact contract it was designed against, model `claude-haiku-4-5`). When that API is absent — e.g. on a plain static host — the chat UI still loads and degrades gracefully: it replies "The live agent isn't reachable right now" and points the reader at the relevant page section.

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

- **Progressive enhancement everywhere** — no WebGL → SVG arch; no LLM → graceful chat fallback; no fine pointer → tilt/halo disabled.
- **Animation-health fallback** — if the document timeline freezes (throttled/background tab), everything force-reveals to its end state and counters fill in; a watcher restores animation when the tab recovers.
- **Reduced motion** — `prefers-reduced-motion` collapses animations to instant states across all modules.
- **Accessibility** — keyboard-operable disclosure rows (OS stack, risk matrix), `aria-expanded` state, labeled canvases, `aria-live` chat log, Escape closes the drawer.
