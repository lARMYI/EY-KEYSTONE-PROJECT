/* Client Build Studio — three-tier generation.

   Tier 1  Composer     deterministic, offline, always available
   Tier 2  Live agent   window.claude.complete({messages}), when the host has one
   Tier 3  Prompt pack  copy out, paste back through a validating importer

   The rule that makes this safe: Tier 2 output is MERGED ONTO the Tier 1 draft,
   part by part, and only where it returned real content for a part the pattern
   actually declares. A failed, empty or garbled call therefore degrades to a
   real draft rather than to nothing. Tier 1 runs first, every time, including
   when Tier 2 is available. */
(function (w) {
  'use strict';

  var S = w.CBS_STATE, G = w.CBS_GRAPH, GATE = w.CBS_GATE;

  var PIPELINE = ['Route', 'Retrieve', 'Draft', 'Red team', 'Gate'];

  /* ------------------------------------------------------------- tokens */
  function tokenMap() {
    var i = S.get().intake || {};
    var laneId = i.lane;
    var lane = laneId && w.CBS_LANE_BY_ID[laneId];
    return {
      client: i.client, trigger: i.trigger, decision: i.decision,
      decider: i.decider, stakes: i.stakes,
      lane: lane ? lane.title.toLowerCase() : laneId
    };
  }

  /* An unresolved token becomes a visible marker. It never silently vanishes —
     that is the difference between an incomplete draft and a misleading one. */
  function resolve(str) {
    var map = tokenMap();
    return String(str || '').replace(/\{\{(\w+)\}\}/g, function (_, key) {
      var v = map[key];
      return (typeof v === 'string' && v.trim()) ? v.trim() : '[NEEDS INPUT: ' + key + ']';
    });
  }

  /* --------------------------------------------------------- Tier 1 */
  function upstreamContext(artifactId) {
    var hit = G.findArtifact(artifactId);
    if (!hit) return [];
    var deps = (hit.artifact.inputs || []).concat(hit.artifact.inputsAny || []);
    return deps.map(function (id) {
      var d = G.findArtifact(id);
      var a = S.artifact(id);
      if (!d || !a.draft) return null;
      return { id: id, title: d.artifact.title, text: GATE.draftText(id) };
    }).filter(Boolean);
  }

  function compose(artifactId) {
    var hit = G.findArtifact(artifactId);
    if (!hit) return null;
    var pattern = w.CBS_PATTERN_BY_ID[hit.artifact.pattern];
    var parts = (pattern && pattern.sections) || [{ h: hit.artifact.title, hint: hit.artifact.outputs, fill: '' }];
    return {
      parts: parts.map(function (p) {
        return { h: p.h, hint: p.hint || '', body: resolve(p.fill || '') };
      }),
      pattern: hit.artifact.pattern,
      composedAt: new Date().toISOString()
    };
  }

  /* --------------------------------------------------------- Tier 2 */
  function available() {
    return !!(w.claude && typeof w.claude.complete === 'function');
  }

  function briefFor(artifactId) {
    var hit = G.findArtifact(artifactId);
    var pattern = w.CBS_PATTERN_BY_ID[hit.artifact.pattern];
    var crits = G.criteriaFor(artifactId);
    var laneId = S.lane();
    var lane = laneId && w.CBS_LANE_BY_ID[laneId];
    var i = S.get().intake || {};

    return {
      artifact: { id: artifactId, title: hit.artifact.title, outputs: hit.artifact.outputs },
      section: hit.section.title,
      area: { title: hit.area.title, purpose: hit.area.purpose, questions: hit.area.questions },
      pattern: pattern ? { id: pattern.id, purpose: pattern.purpose, parts: pattern.sections.map(function (p) { return { h: p.h, hint: p.hint }; }) } : null,
      lane: lane ? { id: lane.id, title: lane.title, good: lane.good } : null,
      commission: i,
      criteria: crits.map(function (e) {
        return { kind: e.criterion.kind, text: e.criterion.text, severity: e.criterion.severity || 'normal' };
      }),
      upstream: upstreamContext(artifactId)
    };
  }

  function systemPrompt() {
    return [
      'You are drafting one artifact inside the Client Build Studio, a method for building',
      'client deliverables. You will be given the artifact\'s pattern (an ordered list of parts),',
      'the commission answers, upstream artifacts already drafted, and the criteria this artifact',
      'must pass.',
      '',
      'Rules:',
      '- Return ONLY a JSON object: {"parts":[{"h":"<exact part heading>","body":"<content>"}]}',
      '- Use the EXACT part headings given in the pattern. Do not add, rename or reorder parts.',
      '- Write in the register of a senior consultant addressing a named decision-maker. Plain,',
      '  specific, unhedged. No marketing language.',
      '- Never invent a fact, figure, date, name or source. Where evidence is required and you do',
      '  not have it, write the literal marker [NEEDS EVIDENCE: <what is needed>].',
      '- Where a judgement is the author\'s to make, write [NEEDS DECISION: <what to decide>].',
      '- These markers are load-bearing: the Gate refuses to certify a draft that still contains',
      '  them, which is the correct outcome for content you could not honestly supply.'
    ].join('\n');
  }

  /* Defensive parse: models wrap JSON in prose or fences often enough that a
     naive JSON.parse would drop otherwise-good output on the floor. */
  function extractJSON(text) {
    if (typeof text !== 'string') return null;
    var t = text.trim();
    var fence = t.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fence) t = fence[1].trim();
    try { return JSON.parse(t); } catch (e) { /* fall through */ }
    var start = t.indexOf('{'), end = t.lastIndexOf('}');
    if (start !== -1 && end > start) {
      try { return JSON.parse(t.slice(start, end + 1)); } catch (e2) { /* give up */ }
    }
    return null;
  }

  /* The merge. Base is always the Tier 1 draft. */
  function merge(base, incoming) {
    if (!incoming || !Array.isArray(incoming.parts)) {
      return { draft: base, merged: 0, total: base.parts.length };
    }
    var byHeading = {};
    incoming.parts.forEach(function (p) {
      if (p && typeof p.h === 'string' && typeof p.body === 'string' && p.body.trim()) {
        byHeading[p.h.trim().toLowerCase()] = p.body.trim();
      }
    });
    var merged = 0;
    var parts = base.parts.map(function (p) {
      var hit = byHeading[String(p.h).trim().toLowerCase()];
      if (hit) { merged++; return { h: p.h, hint: p.hint, body: hit }; }
      return p;
    });
    return { draft: { parts: parts, pattern: base.pattern, composedAt: base.composedAt }, merged: merged, total: parts.length };
  }

  /* Runs the five visible stages. onStage(index, state, note) drives the UI. */
  function generate(artifactId, onStage) {
    onStage = onStage || function () {};
    var hit = G.findArtifact(artifactId);
    if (!hit) return Promise.resolve({ ok: false, error: 'Unknown artifact.' });
    var title = hit.artifact.title;

    /* Stage 1 — Route. Tier 1 always produces the base. */
    onStage(0, 'run', 'Resolving pattern and scope');
    var base = compose(artifactId);
    if (!base) return Promise.resolve({ ok: false, error: 'No pattern for this artifact.' });
    onStage(0, 'done', 'Pattern ' + base.pattern);

    /* Stage 2 — Retrieve. Local only: spine, pattern, upstream drafts, claims. */
    onStage(1, 'run', 'Gathering upstream artifacts');
    var brief = briefFor(artifactId);
    onStage(1, 'done', brief.upstream.length + ' upstream artifact(s), ' + brief.criteria.length + ' criteria');

    if (!available()) {
      onStage(2, 'skip', 'No live agent — composed draft stands');
      onStage(3, 'skip', 'Red team runs at the Gate');
      onStage(4, 'done', 'Composed');
      return Promise.resolve(commit(1, base, 'Composed deterministically (Tier 1) — no live agent on this host.'));
    }

    /* Stage 3 — Draft. */
    onStage(2, 'run', 'Calling the live agent');
    var messages = [
      { role: 'user', content: systemPrompt() + '\n\nBRIEF:\n' + JSON.stringify(brief, null, 2) }
    ];

    return Promise.resolve()
      .then(function () { return w.claude.complete({ messages: messages }); })
      .then(function (reply) {
        var parsed = extractJSON(typeof reply === 'string' ? reply : (reply && reply.text));
        var m = merge(base, parsed);
        if (!m.merged) {
          onStage(2, 'done', 'Agent returned nothing usable — composed draft stands');
          onStage(3, 'skip', 'Red team runs at the Gate');
          onStage(4, 'done', 'Composed');
          return commit(1, base, 'Live agent returned no usable parts; the Tier 1 draft was kept.');
        }
        onStage(2, 'done', m.merged + ' of ' + m.total + ' parts from the agent');
        onStage(3, 'run', 'Checking for unsupported assertions');
        var markers = GATE.hasMarkers(m.draft.parts.map(function (p) { return p.body; }).join('\n'));
        onStage(3, 'done', markers ? 'Evidence markers left in place' : 'No open markers');
        onStage(4, 'done', 'Ready for the Gate');
        return commit(2, m.draft, m.merged + ' of ' + m.total + ' parts drafted by the live agent; the rest are the composed baseline.');
      })
      ['catch'](function (err) {
        /* A failed call must never cost the user their draft. */
        onStage(2, 'done', 'Agent call failed — composed draft stands');
        onStage(3, 'skip', '');
        onStage(4, 'done', 'Composed');
        return commit(1, base, 'Live agent unreachable (' + (err && err.message || err) + '); the Tier 1 draft was kept.');
      });

    function commit(tier, draft, note) {
      S.setArtifact(artifactId, { state: 'drafted', tier: tier, draft: draft });
      S.log('gen', 'Drafted "' + title + '" · Tier ' + tier + '. ' + note, 'tier-' + tier);
      return { ok: true, tier: tier, draft: draft, note: note };
    }
  }

  /* --------------------------------------------------------- Tier 3 */

  /* ------------------------------------------- agentic figures and code */
  /* Both follow the same shape as generate(): Tier 1 composes something real
     first, the agent is asked to improve on it, and anything the agent returns
     that does not validate is dropped rather than repaired. The difference is
     what "validate" means — a figure is a spec cbs-visuals clamps, and code is
     a string that only ever renders inside the opaque-origin preview frame. */

  var VISUAL_RULES = [
    'You are proposing FIGURES for one artifact in a client deliverable.',
    '',
    'Return ONLY a JSON object: {"figures":[{"kind":"<kind>","title":"...","caption":"...",',
    '"series":[{"name":"...","points":[{"label":"...","value":0}]}],"nodes":[{"label":"...","note":"..."}],',
    '"axes":{"x":"...","y":"..."},"zeroBased":true}]}',
    '',
    'Rules:',
    '- "kind" MUST be one of the kinds listed in the brief. Anything else is discarded.',
    '- Charts take "series"; diagrams and mockups take "nodes". Supply only the one its kind needs.',
    '- "caption" states, in words, the comparison the reader is being asked to make. It is checked.',
    '- Never invent a figure. Use only numbers present in the upstream artifacts or the claim',
    '  registry. If you have none, put [NEEDS EVIDENCE: <what is needed>] in the caption and use',
    '  zeroes for the values — an honest empty chart beats a plausible invented one.',
    '- Never set zeroBased to false unless the brief gives you a reason a truncated axis is honest.',
    '- You are returning DATA, not drawings. Do not return SVG, HTML, or any markup.'
  ].join('\n');

  var CODE_RULES = [
    'You are writing one HTML+CSS section for a client deliverable.',
    '',
    'Return ONLY a JSON object: {"html":"...","css":"...","js":"..."}',
    '',
    'Rules:',
    '- "html" is the section body only. No <html>, <head>, <body> or <script> tags.',
    '- Design tokens are already in scope as CSS custom properties. USE THEM rather than',
    '  hard-coding values: var(--bg) var(--surface) var(--ink) var(--muted) var(--accent)',
    '  var(--line) var(--radius) var(--space-1..6) var(--text-xs..3xl) var(--font-display)',
    '  var(--font-ui) var(--font-mono) var(--motion-dur) var(--motion-ease).',
    '- It MUST NOT overflow horizontally at 390px. Use fluid widths, minmax() grids and',
    '  wrapping. Fixed pixel widths above 320px are the usual cause of failure, and the',
    '  studio measures this at 390px rather than taking your word for it.',
    '- Every interactive element is a real <a> or <button>, so keyboard operation comes from',
    '  the platform. Nothing essential may depend on script.',
    '- Wrap any motion in @media (prefers-reduced-motion: no-preference).',
    '- "js" is optional and may be empty. It is stripped from the exported document.'
  ].join('\n');

  function visualBrief(artifactId) {
    var brief = briefFor(artifactId);
    brief.availableKinds = w.CBS_VISUALS ? w.CBS_VISUALS.KINDS.map(function (k) {
      var m = w.CBS_VISUALS.META[k] || {};
      return { kind: k, label: m.label, takes: m.needs };
    }) : [];
    brief.claims = S.claimsFor().map(function (c) {
      return { text: c.text, status: c.status, source: c.source };
    });
    return brief;
  }

  /* Tier 1 figures: one composed spec per artifact, honest placeholders inside. */
  function composeVisuals(artifactId) {
    var existing = (S.artifact(artifactId).draft || {}).visuals;
    if (existing && existing.length) return existing.slice();
    return [w.CBS_VISUALS.composeSpec('chart.bar', {})];
  }

  function proposeVisuals(artifactId) {
    var V = w.CBS_VISUALS;
    if (!V) return Promise.resolve({ ok: false, error: 'The visual engine is not loaded on this page.' });
    var base = composeVisuals(artifactId);

    if (!available()) {
      return Promise.resolve({ ok: true, tier: 1, specs: base, dropped: 0 });
    }

    var messages = [{
      role: 'user',
      content: VISUAL_RULES + '\n\nBRIEF:\n' + JSON.stringify(visualBrief(artifactId), null, 2)
    }];

    return Promise.resolve()
      .then(function () { return w.claude.complete({ messages: messages }); })
      .then(function (reply) {
        var parsed = extractJSON(typeof reply === 'string' ? reply : (reply && reply.text));
        var raw = (parsed && Array.isArray(parsed.figures)) ? parsed.figures : [];
        var dropped = 0;
        var specs = raw.map(function (f) {
          if (!f || V.KINDS.indexOf(f.kind) === -1) { dropped++; return null; }
          var spec = V.validate(f.kind, f);
          var meta = V.META[f.kind] || {};
          /* A chart with no points and a diagram with no nodes are not figures. */
          if (meta.needs === 'series' && !spec.series.length) { dropped++; return null; }
          if (meta.needs === 'nodes' && !spec.nodes.length) { dropped++; return null; }
          return spec;
        }).filter(Boolean).slice(0, 8);

        if (!specs.length) {
          S.log('info', 'Agent returned no valid figure specs for ' + artifactId + ' — the composed figure stands.', 'agent');
          return { ok: true, tier: 1, specs: base, dropped: dropped };
        }
        S.log('agent', 'Agent proposed ' + specs.length + ' figure(s) for ' + artifactId +
          (dropped ? '; ' + dropped + ' discarded as invalid' : '') + '.', 'agent');
        return { ok: true, tier: 2, specs: specs, dropped: dropped };
      })
      ['catch'](function (e) {
        S.log('info', 'Figure call failed (' + (e && e.message) + ') — the composed figure stands.', 'agent');
        return { ok: true, tier: 1, specs: base, dropped: 0 };
      });
  }

  function proposeCode(artifactId) {
    var M = w.CBS_MAKERS;
    if (!M) return Promise.resolve({ ok: false, error: 'The maker engine is not loaded on this page.' });
    var base = M.composeSection(artifactId);

    if (!available()) {
      return Promise.resolve({ ok: true, tier: 1, code: base });
    }

    var brief = briefFor(artifactId);
    brief.composedBaseline = base;
    var messages = [{ role: 'user', content: CODE_RULES + '\n\nBRIEF:\n' + JSON.stringify(brief, null, 2) }];

    return Promise.resolve()
      .then(function () { return w.claude.complete({ messages: messages }); })
      .then(function (reply) {
        var parsed = extractJSON(typeof reply === 'string' ? reply : (reply && reply.text));
        var html = parsed && typeof parsed.html === 'string' ? parsed.html : '';
        if (!html.trim()) {
          S.log('info', 'Agent returned no usable section for ' + artifactId + ' — the composed section stands.', 'agent');
          return { ok: true, tier: 1, code: base };
        }
        var code = {
          html: html.slice(0, 60000),
          css: (parsed && typeof parsed.css === 'string' ? parsed.css : '').slice(0, 40000),
          js: (parsed && typeof parsed.js === 'string' ? parsed.js : '').slice(0, 20000)
        };
        S.log('agent', 'Agent drafted a section for ' + artifactId + '. It renders only inside the sandboxed frame.', 'agent');
        return { ok: true, tier: 2, code: code };
      })
      ['catch'](function (e) {
        S.log('info', 'Section call failed (' + (e && e.message) + ') — the composed section stands.', 'agent');
        return { ok: true, tier: 1, code: base };
      });
  }

  /* Copy-out packs, so the makers are never dead on a host with no agent. */
  function visualPack(artifactId) {
    return VISUAL_RULES + '\n\nBRIEF:\n' + JSON.stringify(visualBrief(artifactId), null, 2);
  }
  function codePack(artifactId) {
    var brief = briefFor(artifactId);
    brief.composedBaseline = w.CBS_MAKERS ? w.CBS_MAKERS.composeSection(artifactId) : null;
    return CODE_RULES + '\n\nBRIEF:\n' + JSON.stringify(brief, null, 2);
  }

  function promptPack(artifactId) {
    var brief = briefFor(artifactId);
    return [
      systemPrompt(),
      '',
      'BRIEF:',
      JSON.stringify(brief, null, 2),
      '',
      'Return only the JSON object. Paste it back into the studio\'s "Import response" box.'
    ].join('\n');
  }

  function importResponse(artifactId, text) {
    var parsed = extractJSON(text);
    if (!parsed) return { ok: false, error: 'No JSON object found in that text.' };
    if (!Array.isArray(parsed.parts)) return { ok: false, error: 'The JSON has no "parts" array.' };
    var base = S.artifact(artifactId).draft || compose(artifactId);
    var m = merge(base, parsed);
    if (!m.merged) {
      return { ok: false, error: 'None of the part headings matched this artifact\'s pattern. Headings must match exactly.' };
    }
    S.setArtifact(artifactId, { state: 'drafted', tier: 3, draft: m.draft });
    var hit = G.findArtifact(artifactId);
    S.log('gen', 'Imported a Tier 3 response into "' + (hit ? hit.artifact.title : artifactId) + '" · ' +
      m.merged + ' of ' + m.total + ' parts.', 'tier-3');
    return { ok: true, merged: m.merged, total: m.total };
  }

  /* ----------------------------------------------- node proposals (expand) */
  /* Turns a structural gap into a schema-conforming node the human can accept,
     edit, or reject. Deterministic — it reads diagnose() rather than inventing
     a need. Never auto-accepted. */
  function proposeNodes() {
    var findings = G.diagnose();
    var view = G.resolved();
    var out = [];

    findings.forEach(function (f) {
      if (f.kind === 'empty-area') {
        var area = null;
        view.sections.forEach(function (s) {
          s.areas.forEach(function (a) {
            if ((s.title + ' · ' + a.title) === f.where) area = { area: a, section: s };
          });
        });
        if (!area) return;
        out.push({
          kind: 'artifact',
          reason: 'This area is in scope but produces nothing, so its criteria have nothing to attach to.',
          node: {
            id: 'ov-af-' + area.area.id,
            areaId: area.area.id,
            title: area.area.title + ' note',
            lane: S.lane() || 'any',
            pattern: 'pat-context-brief',
            outputs: 'A short written output for ' + area.area.title.toLowerCase() + ', so this area\'s criteria have something to test.',
            weight: 4,
            criteria: [{
              id: 'ov-c-' + area.area.id,
              kind: 'binary',
              text: 'Answers every question this area asks.'
            }]
          }
        });
      }
      if (f.kind === 'soft-criteria') {
        out.push({
          kind: 'note',
          reason: f.msg,
          node: null
        });
      }
    });

    if (!out.length) {
      out.push({ kind: 'none', reason: 'The diagnosis found nothing that a new node would fix.', node: null });
    }
    return out;
  }

  function acceptProposal(p) {
    if (!p || !p.node) return { ok: false, error: 'Nothing to accept.' };
    var trial = JSON.parse(JSON.stringify(S.get().overlay));
    var bucket = p.kind === 'area' ? 'areas' : 'artifacts';
    trial[bucket].push(p.node);

    /* Validate the merged result BEFORE committing — a proposal that would
       break the spine is rejected, not accepted and apologised for. */
    var saved = S.get().overlay;
    S.get().overlay = trial;
    var res = w.CBS_SCHEMA.validateSpine(G.resolved(), { skipTestRefs: true });
    S.get().overlay = saved;

    if (!res.ok) {
      return { ok: false, error: 'That proposal would break the spine: ' + res.errors[0].msg };
    }
    S.acceptProposal(p.kind, p.node, 'agent');
    return { ok: true, node: p.node };
  }

  w.CBS_AGENT = {
    PIPELINE: PIPELINE,
    available: available,
    resolve: resolve,
    compose: compose,
    generate: generate,
    promptPack: promptPack,
    proposeVisuals: proposeVisuals,
    proposeCode: proposeCode,
    visualPack: visualPack,
    codePack: codePack,
    importResponse: importResponse,
    briefFor: briefFor,
    proposeNodes: proposeNodes,
    acceptProposal: acceptProposal,
    extractJSON: extractJSON,
    merge: merge
  };
})(window);
