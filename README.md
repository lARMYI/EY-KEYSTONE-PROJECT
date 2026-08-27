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

Or deploy as-is to GitHub Pages / Netlify / any static host (`index.html` is the entry point). Everything is **first-party** — the fonts are self-hosted in `fonts/` and Three.js (r128) is vendored in `vendor/` — so the site makes **no external requests** and renders fully offline. (If `vendor/three.min.js` is ever missing, the 3D keystone falls back to a drawn SVG arch.)

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
- **The Keystone briefing agent** (`js/keystone-ai.js`) — a slide-out chat drawer running a visible 5-stage pipeline (Router → Retrieve → Draft → Red team → Gate) over a per-section knowledge base, a 21-fact data ontology, and a claim registry with truth statuses (Verified EY-public claims link to the actual ey.com sources). Streams rich text and charts; refusals render as on-thesis "Gate · policy hold" cards.
- **Micro-interactions** (`js/keystone-fx.js`) — 3D tilt + glare on cards, a trailing cursor halo, magnetic buttons, cursor spotlight, scroll-synced flywheel, counters, and reveals (`js/keystone.js`).

## Structure

```
index.html             page shell — all main pitch content lives here
roadmap.html           supplement — "Becoming AI-native": definition, maturity ladder, horizons, scorecard
maturity.html          supplement — the seven transformation pillars, charted across the three horizons
quarters.html          supplement — the twelve-quarter development plan (Phase 0 → Phase 3)
css/keystone.css       the full design system (tokens, atmosphere, components, chat)
css/fonts.css          self-hosted @font-face (replaces the Google Fonts CDN)
fonts/                 Fraunces / Hanken Grotesk / JetBrains Mono variable WOFF2 (latin)
vendor/three.min.js    vendored Three.js r128 (MIT) — no CDN dependency
_headers               security headers (CSP etc.) for Netlify / Cloudflare Pages
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

## Client Build Studio — the method, as an application

`studio/` is a separate app that generalizes the method this pitch site was built
by, so it can be run for any client and any deliverable. The pitch site is left
untouched and becomes its **worked example**: every area in the studio links to
the place in `index.html` (or a supplement) where that move is visible in
something that shipped.

```
studio/index.html      the playbook — sections, areas, artifacts, all from the spine
studio/build.html      the Commission, the Board, the Workbench, the Gate
studio/library.html    lanes, patterns, the criteria catalog, the personas
studio/publish.html    assembly, the three exports, and the expansion loop
studio/css/studio.css  studio components (tokens come from css/keystone.css)
studio/js/cbs-*.js     schema, spine, lanes, patterns, state, graph, render,
                       gate, agent, publish, console, page controllers
```

### The spine

`studio/js/cbs-spine.js` holds the whole method as data: **8 sections → 30 areas →
64 artifacts → 105 criteria**, plus 6 lanes, 64 patterns and 6 red-team personas.
Nothing in the HTML is content and nothing in the spine is markup — empty the
spine and the pages render empty rather than stale. `cbs-schema.js` validates it
at load on every page (duplicate ids, unknown criterion kinds, dead inputs,
dependency cycles, criteria naming unregistered tests, areas with nothing that can
fail) and reports failures in the UI instead of white-screening.

Sections: **Commission · Frame · Ground · Shape · Make · Prove · Publish · Expand.**

### Criteria and the Gate

Three kinds of criterion — **binary** (a yes/no, some auto-tested), **evidence**
(every claim carries Verified / Proposed / Unsourced), and **review** (a named
persona must not find the named failure). The Gate certifies an artifact only when
every binary criterion passes, zero claims are Unsourced, and every persona review
is resolved; high-severity criteria cannot be waived. Certification mints an
**Artifact Passport**, and editing a certified artifact withdraws its certification
automatically.

Two honesty rules are load-bearing here: an auto-test that cannot decide returns
`unknown` and falls back to a human rather than passing by default, and the
evidence hash is an FNV-1a **content fingerprint for drift detection**, labelled as
such — not a cryptographic digest.

### Three-tier generation

| Tier | Mechanism | Available |
| --- | --- | --- |
| 1 — Composer | Deterministic: pattern template × commission answers × upstream drafts | Always, offline |
| 2 — Live agent | `window.claude.complete({messages})` — the same contract `js/keystone-ai.js` uses | When the host provides it |
| 3 — Prompt pack | Copy a full prompt into any Claude session, paste the JSON back through a validating importer | Always |

Tier 2 output is **merged onto** the Tier 1 draft part by part, so a failed, empty
or garbled call degrades to a real draft rather than a blank one. Every artifact
displays the tier that produced it.

### Self-organizing, self-creating

The graph engine (`cbs-graph.js`) prunes scope from the commission answers,
resolves AND/OR dependency groups, computes readiness **R0–R5**, surfaces exactly
one **next best action**, and runs `diagnose()` — a self-audit for dead inputs,
areas that produce nothing, unsourced claims and criteria that never fail.

Expansion has three human-accepted paths: **node proposals** (the agent reads the
diagnosis and proposes a schema-conforming node; a proposal that would break
validation is refused, not accepted and apologised for), **draft generation**, and
**pattern promotion** (a certified artifact becomes a library pattern with its
criteria attached and its client content stripped). Accepted nodes land in a
localStorage **overlay** merged over the spine at read time — `cbs-spine.js` is
never written by the browser.

### Publish

Three outputs: a self-contained **deliverable** in the lane's shape (only certified
artifacts, with anything omitted named in the certification record),
**`engagement.json`** (the portable memory, re-importable to the same state), and
**`BUILD-ORDER.md`** (dependency-ordered build list, design tokens, the criteria as
acceptance tests, the claim registry, and a prompt per artifact — enough for an
agentic coding tool to scaffold the full thing). Clipboard is the guaranteed export
path under this site's CSP; the download button is a feature-detected enhancement.

### Running and constraints

Served by the same static host — `python3 -m http.server 8000`, then
`http://localhost:8000/studio/`. No build step, no dependencies, no external
requests. All four studio pages carry the identical `<meta>` CSP as the rest of the
site, so `script-src 'self'` holds: no inline `<script>`, no `eval`, and a
criterion's `test` is the **name** of a registered function rather than a string to
evaluate. Every node is built with `createElement` / `textContent` — there is no
`innerHTML` path for engagement text, agent output, or an imported file.

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

Keep the model call server-side — never ship API keys in this page. There are no secrets in this repo: the only model path is the `window.claude.complete({messages})` contract, which an integrator wires to a same-origin endpoint (`connect-src 'self'`). No API key, token, or `Authorization` header is ever shipped to the browser.

## Security headers (CSP) & a fully first-party site

Defense-in-depth against injection, verified with a headless-browser pass (0 CSP violations, 0 page errors, no external requests, all interactions intact):

- **Everything is first-party.** Fonts are self-hosted (`fonts/`) and Three.js r128 is vendored (`vendor/three.min.js`, MIT), so the site makes **no external network requests** and the CSP is a clean `default-src 'self'` with **no third-party origins at all** — nothing to pin, nothing to be compromised remotely.
- **Content-Security-Policy** ships two ways so it applies on every host:
  - a `<meta http-equiv="Content-Security-Policy">` tag in every HTML page (works even on GitHub Pages, which can't set headers);
  - a real header in **`_headers`** (Netlify / Cloudflare Pages) that additionally carries the header-only directives (`frame-ancestors`, `X-Frame-Options`, `Referrer-Policy`, `X-Content-Type-Options`, `Permissions-Policy`, `COOP`).
  - Policy (identical on every page): `default-src 'self'`; `script-src 'self'` (no inline `<script>`, no `'unsafe-eval'`); `style-src 'self' 'unsafe-inline'` (the site uses inline `style=` attributes); `font-src 'self'`; `img-src 'self' data:` (the CSS grain is a data-URI SVG); `connect-src 'self'`; `object-src 'none'`; `base-uri 'self'`.
  - **Keep the `<meta>` CSP and the `_headers` CSP in sync** when editing.
- **Three.js is vendored, not SRI-pinned from a CDN.** `vendor/three.min.js` is byte-for-byte the r128 build the published cdnjs SRI hash pins (verified by re-hashing on vendoring — see `vendor/README.md`). Same-origin under `default-src 'self'` is a stronger guarantee than SRI on a remote file, and if the file is ever missing the 3D keystone degrades to a drawn SVG arch.
- **Fonts are self-hosted.** The Fraunces / Hanken Grotesk / JetBrains Mono variable WOFF2s (latin subset) live in `fonts/`, declared by `css/fonts.css`. The latin `unicode-range` covers all the site's Latin text; the few decorative glyphs (◆ → ← ↗) fall back to the system font, exactly as before. (SRI doesn't apply to `@font-face` files anyway; same-origin + CSP is the control.)

## Robustness notes

Built into the design and worth preserving when editing:

- **Progressive enhancement everywhere** — no WebGL → SVG arch; no LLM → graceful chat fallback; no fine pointer → tilt/halo disabled.
- **Animation-health fallback** — if the document timeline freezes (throttled/background tab), everything force-reveals to its end state and counters fill in; a watcher restores animation when the tab recovers.
- **Reduced motion** — `prefers-reduced-motion` collapses animations to instant states across all modules.
- **Accessibility** — keyboard-operable disclosure rows (OS stack, risk matrix), `aria-expanded` state, labeled canvases, `aria-live` chat log, Escape closes the drawer.
