# The Keystone Lab — EY.ai

A cinematic, single-page pitch site for **The Keystone Lab**: EY's proposed frontier systems lab that turns frontier AI into governed, certifiable enterprise infrastructure. Working concept for leadership review.

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

A 20-section scrollytelling narrative (Why now → What changes → the Lab → Keystone AI OS → the Truth Layer → the Gate → the platform → partners → banking proof → … → Why John → staging → no-lose → the ask), carried by:

- **A morphing 3D keystone spine** (`js/keystone3d.js`) — one WebGL keystone, fixed behind all content, that morphs as you scroll: whole at the hero → splits into three voussoir wedges at the platform section → becomes a spinning flywheel hub → locks inside the golden Gate frame → seals front-facing and glowing at the CTA. Falls back silently to a drawn SVG arch if Three.js or WebGL is unavailable.
- **The interactive Keystone Gate** (`js/gate.js`) — pick an agent, run a six-step certification (Identity → Evaluation → Independence → Red-team → Attestation → Passport), and mint a unique Agent Passport with stamps, an evidence hash, and a certified badge.
- **The Keystone OS simulation readout** (`js/kos.js`) — live-counting run stats, a streaming console with BLOCKED / CONTAINED / HELD events, and an "Environment certified" bar.
- **The Keystone briefing agent** (`js/keystone-ai.js`) — a slide-out chat drawer running a visible 5-stage pipeline (Router → Retrieve → Draft → Red team → Gate) over a per-section knowledge base, a 15-fact data ontology, and a claim registry with truth statuses (Verified EY-public claims link to the actual ey.com sources). Streams rich text and charts; refusals render as on-thesis "Gate · policy hold" cards.
- **Micro-interactions** (`js/keystone-fx.js`) — 3D tilt + glare on cards, a trailing cursor halo, magnetic buttons, cursor spotlight, scroll-synced flywheel, counters, and reveals (`js/keystone.js`).

## Structure

```
index.html          page shell — all section content lives here
css/keystone.css    the full design system (tokens, atmosphere, components, chat)
js/keystone3d.js    WebGL keystone spine (Three.js r128, progressive enhancement)
js/keystone.js      core: reveals, counters, flywheel, generated grids, health fallback
js/gate.js          interactive Gate certification + Agent Passport
js/kos.js           Keystone OS simulation readout
js/keystone-fx.js   card tilt/glare + cursor halo (fine pointers only)
js/keystone-ai.js   the briefing agent (chat drawer, agent pipeline, truth layer)
```

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
