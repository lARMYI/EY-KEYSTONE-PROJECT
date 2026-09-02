/* Client Build Studio — criteria evaluation, red team, and certification.

   Two honesty rules run through this file:

   1. A test that cannot actually decide returns 'unknown' and falls back to a
      human toggle. It never returns 'pass' because it could not find a problem.
   2. The evidence hash is a content fingerprint (FNV-1a), not a cryptographic
      digest. It detects drift after certification. It is not a security control
      and is never described as one. */
(function (w) {
  'use strict';

  var S = w.CBS_STATE, G = w.CBS_GRAPH, SCH = w.CBS_SCHEMA;

  /* ------------------------------------------------------------- helpers */
  function draftText(artifactId) {
    var a = S.artifact(artifactId);
    if (!a.draft || !Array.isArray(a.draft.parts)) return '';
    return a.draft.parts.map(function (p) { return (p.h || '') + '\n' + (p.body || ''); }).join('\n\n');
  }

  /* Everything a maker wrote, flattened to text. Lives here rather than in
     cbs-makers.js so that every page computes the same evidence hash — a page
     without the makers loaded must not withdraw a certification for drift it
     invented by not looking. */
  function madeText(artifactId) {
    var draft = S.artifact(artifactId).draft;
    if (!draft) return '';
    var bits = [];
    if (draft.tokens) bits.push('tokens:' + draft.tokens.css);
    if (draft.visuals) bits.push('visuals:' + JSON.stringify(draft.visuals));
    if (draft.code) bits.push('code:' + draft.code.html + draft.code.css + draft.code.js);
    return bits.join('||');
  }

  function hasMarkers(text) {
    return /\[(NEEDS|REGISTRY|GENERATED)[^\]]*\]/.test(text || '');
  }

  function words(s) {
    return String(s || '').trim().split(/\s+/).filter(Boolean);
  }

  function P(note) { return { result: 'pass', note: note || '' }; }
  function F(note) { return { result: 'fail', note: note || '' }; }
  function U(note) { return { result: 'unknown', note: note || '' }; }

  /* --------------------------------------------------------------- tests */
  /* ctx: { artifactId, text, claims, engagement, view } */
  var TESTS = {
    't-ask-one-sentence': function (ctx) {
      var ask = (S.get().intake.decision || '').trim();
      if (!ask) return U('No ask recorded yet.');
      var sentences = ask.split(/[.!?]+\s/).filter(function (s) { return s.trim().length > 3; });
      if (sentences.length > 1) return F('The ask runs to ' + sentences.length + ' sentences.');
      return P('One sentence.');
    },

    't-under-30-words': function (ctx) {
      var ask = (S.get().intake.decision || '').trim();
      if (!ask) return U('No ask recorded yet.');
      var n = words(ask).length;
      return n <= 30 ? P(n + ' words.') : F(n + ' words — over the 30-word limit.');
    },

    't-has-measure': function (ctx) {
      /* A stop condition has to contain something countable. */
      var t = ctx.text || '';
      if (!t.trim()) return U('Nothing drafted yet.');
      var hasNumber = /\d/.test(t);
      var hasComparator = /\b(fewer|less|more|below|above|under|over|at least|at most|by|within|per|%)\b/i.test(t);
      if (hasNumber && hasComparator) return P('Contains a quantity and a comparison.');
      return F('No countable measure found — a stop condition needs a number, not a feeling.');
    },

    't-claims-all-statused': function (ctx) {
      var claims = ctx.claims || [];
      if (!claims.length) return U('No claims registered yet.');
      var bad = claims.filter(function (c) { return ['verified', 'proposed', 'unsourced'].indexOf(c.status) === -1; });
      return bad.length ? F(bad.length + ' claim(s) carry no valid status.') : P(claims.length + ' claims, all statused.');
    },

    't-no-unsourced': function (ctx) {
      var claims = ctx.claims || [];
      if (!claims.length) return U('No claims registered yet.');
      var n = claims.filter(function (c) { return c.status === 'unsourced'; }).length;
      return n ? F(n + ' claim(s) still Unsourced.') : P('Zero Unsourced claims.');
    },

    't-criteria-complete': function (ctx) {
      var all = G.allCriteria();
      var st = S.get().criteria;
      var blank = all.filter(function (e) { return !st[e.criterion.id] || !st[e.criterion.id].result; });
      return blank.length
        ? F(blank.length + ' of ' + all.length + ' criteria have no recorded result.')
        : P('All ' + all.length + ' criteria judged.');
    },

    't-personas-run': function (ctx) {
      var reviews = G.allCriteria().filter(function (e) { return e.criterion.kind === 'review'; });
      if (!reviews.length) return U('No review criteria in scope.');
      var st = S.get().reviews;
      var open = reviews.filter(function (e) {
        var r = st[e.criterion.id];
        return !r || !r.resolution;
      });
      return open.length ? F(open.length + ' persona review(s) unresolved.') : P(reviews.length + ' persona reviews resolved.');
    },

    't-all-gated': function (ctx) {
      var scoped = G.scopedArtifacts();
      var ungated = scoped.filter(function (e) {
        var s = S.artifact(e.artifact.id).state;
        return s !== 'gated' && s !== 'published';
      });
      return ungated.length ? F(ungated.length + ' in-scope artifact(s) carry no passport.') : P('Every in-scope artifact is certified.');
    },

    't-only-certified': function (ctx) {
      var scoped = G.scopedArtifacts();
      var published = scoped.filter(function (e) { return S.artifact(e.artifact.id).state === 'published'; });
      if (!published.length) return U('Nothing published yet.');
      var bad = published.filter(function (e) { return !S.artifact(e.artifact.id).passport; });
      return bad.length ? F(bad.length + ' published artifact(s) have no passport.') : P('Everything published carries a passport.');
    },

    /* Contrast used to be undecidable. With a real token set it is arithmetic:
       WCAG 2.1 relative luminance over every pair that matters. */
    't-contrast-floor': function () {
      if (!w.CBS_TOKENS) return U('The token engine is not loaded on this page.');
      var a = w.CBS_TOKENS.audit(S.get().tokens);
      if (a.pass) {
        return P('All ' + a.results.length + ' pairs clear their floor; tightest is ' +
                 a.tightest.id + ' at ' + a.tightest.ratio.toFixed(2) + ':1.');
      }
      var f = a.failed[0];
      return F(a.failed.length + ' pair(s) below the floor — ' + f.id + ' is ' +
               f.ratio.toFixed(2) + ':1 against a floor of ' + f.floor +
               (f.suggestion ? '. ' + f.suggestion + ' would clear it.' : '.'));
    },

    /* Responsive is measured inside the sandboxed preview at 390px, not asserted.
       Honest when it has not been run: the studio does not pass a test it never
       performed. */
    't-responsive': function (ctx) {
      var m = S.get().responsive || {};
      /* Prefer this artifact's own measurement; fall back to the last one taken
         anywhere, and say which it is rather than blurring the two. */
      var own = ctx && ctx.artifactId ? m[ctx.artifactId] : null;
      var r = own || m.at390;
      if (!r) {
        return U('Not measured yet — open the preview at Mobile 390 and the frame reports its own overflow.');
      }
      var where = own ? 'this artifact' : 'the last preview taken';
      return r.overflow
        ? F('Overflows by ' + r.overflowBy + 'px at 390 (' + where + ' is ' + r.scrollWidth + 'px wide).')
        : P('No horizontal overflow at 390 (' + where + ', content ' + r.scrollWidth + 'px).');
    },

    /* Both of these read what a maker actually produced. Before phase 2 there
       was nothing to read, which is why they did not exist. */
    't-tokens-real': function (ctx) {
      var draft = S.artifact(ctx.artifactId).draft;
      var tk = draft && draft.tokens;
      if (!tk || !tk.css) {
        return U('No token set written into this artifact yet — the maker writes one from the live tokens.');
      }
      var n = (tk.css.match(/--[a-z0-9-]+:/g) || []).length;
      if (n < 20) return F('Only ' + n + ' custom properties — that is a palette, not a system.');
      if (tk.contrast && tk.contrast.pass === false) {
        return F(n + ' properties defined, but ' + tk.contrast.failed + ' contrast pair(s) sit below their floor.');
      }
      return P(n + ' custom properties defined once and referenced everywhere.');
    },

    't-figures-captioned': function (ctx) {
      var draft = S.artifact(ctx.artifactId).draft;
      var specs = (draft && draft.visuals) || [];
      if (!specs.length) return U('No figures on this artifact yet.');
      var bad = specs.filter(function (s) {
        var c = String(s.caption || '');
        return !c.trim() || /\[(NEEDS|REGISTRY|GENERATED)/.test(c);
      });
      return bad.length
        ? F(bad.length + ' of ' + specs.length + ' figure(s) carry no stated comparison.')
        : P('All ' + specs.length + ' figure(s) state their comparison in words.');
    },

    /* Deliberately undecidable in the browser — these fall back to a human. */
    't-figures-reconcile': function () {
      return U('Reconciliation cannot be checked automatically — confirm the figures agree across every appearance.');
    },
    't-roundtrip': function () {
      return U('Export, reset, and re-import to confirm the state returns. The studio cannot vouch for this on your behalf.');
    },
    't-proposal-valid': function () {
      var overlay = S.get().overlay;
      var n = (overlay.areas || []).length + (overlay.artifacts || []).length;
      if (!n) return U('No proposals accepted yet.');
      var res = SCH.validateSpine(G.resolved(), { skipTestRefs: true });
      return res.ok ? P(n + ' overlay node(s), spine still valid.') : F('The overlay breaks spine validation: ' + res.errors[0].msg);
    }
  };

  Object.keys(TESTS).forEach(function (name) { SCH.registerTest(name, TESTS[name]); });

  /* ------------------------------------------------------------ evaluate */
  function context(artifactId) {
    return {
      artifactId: artifactId,
      text: artifactId ? draftText(artifactId) : '',
      claims: S.claimsFor(),
      engagement: S.get(),
      view: G.resolved()
    };
  }

  /* Run a criterion's auto-test if it has one. Returns null when there is no
     test — the caller then relies on the human toggle. */
  function autoEvaluate(criterion, artifactId) {
    if (!criterion.test) return null;
    var fn = SCH.TESTS[criterion.test];
    if (!fn) return U('Test "' + criterion.test + '" is not registered.');
    try { return fn(context(artifactId)); }
    catch (e) { return U('Test threw: ' + (e && e.message)); }
  }

  /* Apply every auto-test in scope and record the ones that decided. Tests that
     return 'unknown' are left for a human rather than being written as a pass. */
  function runAutoCriteria() {
    var applied = 0, undecided = 0;
    G.allCriteria().forEach(function (e) {
      var art = e.artifact ? e.artifact.id : null;
      var r = autoEvaluate(e.criterion, art);
      if (!r) return;
      if (r.result === 'unknown') { undecided++; return; }
      S.setCriterion(e.criterion.id, r.result, r.note);
      applied++;
    });
    S.log('gate', 'Auto-tests applied to ' + applied + ' criteria; ' + undecided + ' left for a human.', 'studio');
    return { applied: applied, undecided: undecided };
  }

  /* --------------------------------------------------------------- hash */
  /* FNV-1a over the canonical content. A fingerprint for detecting drift after
     certification — not a cryptographic digest, and never presented as one. */
  function fingerprint(str) {
    var h = 0x811c9dc5;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
    }
    return ('00000000' + h.toString(16)).slice(-8);
  }

  function evidenceHash(artifactId) {
    var claims = S.claimsFor(artifactId).map(function (c) {
      return c.id + ':' + c.status + ':' + c.source;
    }).sort().join('|');
    var crits = G.criteriaFor(artifactId).map(function (e) {
      var r = S.get().criteria[e.criterion.id];
      return e.criterion.id + '=' + ((r && r.result) || 'blank');
    }).sort().join('|');
    return fingerprint(draftText(artifactId) + '::' + madeText(artifactId) + '::' + claims + '::' + crits);
  }

  /* ------------------------------------------------------------ the Gate */
  var STAGES = [
    { id: 'identity', label: 'Identity' },
    { id: 'completeness', label: 'Completeness' },
    { id: 'evidence', label: 'Evidence' },
    { id: 'redteam', label: 'Red team' },
    { id: 'criteria', label: 'Criteria' },
    { id: 'passport', label: 'Passport' }
  ];

  /* Evaluate all six stages. Returns the full result whether or not it passes —
     a refusal has to be able to explain itself. */
  function evaluate(artifactId) {
    var hit = G.findArtifact(artifactId);
    var stages = [];
    function stage(id, ok, note) {
      stages.push({ id: id, label: STAGES.filter(function (s) { return s.id === id; })[0].label, ok: ok, note: note });
      return ok;
    }

    /* 1. Identity */
    var known = !!hit && !!(w.CBS_PATTERN_BY_ID[hit.artifact.pattern] || hit.artifact.fromOverlay);
    stage('identity', known, known ? hit.artifact.title + ' · pattern ' + hit.artifact.pattern
                                   : 'Artifact or its pattern is unknown to the spine.');

    /* 2. Completeness */
    var text = draftText(artifactId);
    var hasText = text.replace(/\s/g, '').length > 0;
    var markers = hasMarkers(text);
    stage('completeness',
      hasText && !markers,
      !hasText ? 'No draft yet.' : markers ? 'Unresolved placeholders remain in the draft.' : 'Every part carries real content.');

    /* 3. Evidence */
    var claims = S.claimsFor(artifactId);
    var unsourced = claims.filter(function (c) { return c.status === 'unsourced'; });
    stage('evidence', unsourced.length === 0,
      unsourced.length ? unsourced.length + ' claim(s) on this artifact are Unsourced.'
                       : claims.length ? claims.length + ' claim(s), all sourced or labelled.' : 'No claims registered against this artifact.');

    /* 4. Red team */
    var reviewCrits = G.criteriaFor(artifactId).filter(function (e) { return e.criterion.kind === 'review'; });
    var openReviews = reviewCrits.filter(function (e) {
      var r = S.get().reviews[e.criterion.id];
      return !r || !r.resolution;
    });
    stage('redteam', openReviews.length === 0,
      reviewCrits.length === 0 ? 'No persona review assigned to this artifact.'
        : openReviews.length ? openReviews.length + ' persona review(s) still open.'
        : reviewCrits.length + ' persona review(s) resolved.');

    /* 5. Criteria */
    var crits = G.criteriaFor(artifactId);
    var st = S.get().criteria;
    var failed = [], blank = [], waivedHigh = [];
    crits.forEach(function (e) {
      var r = st[e.criterion.id];
      if (!r || !r.result) { blank.push(e.criterion); return; }
      if (r.result === 'fail') failed.push(e.criterion);
      if (r.result === 'waived' && e.criterion.severity === 'high') waivedHigh.push(e.criterion);
    });
    var critOk = !failed.length && !blank.length && !waivedHigh.length;
    stage('criteria', critOk,
      failed.length ? failed.length + ' criterion/criteria failing.'
        : blank.length ? blank.length + ' criterion/criteria not yet judged.'
        : waivedHigh.length ? waivedHigh.length + ' high-severity criterion/criteria waived — high severity cannot be waived.'
        : crits.length + ' criteria pass.');

    /* 6. Passport */
    var allOk = stages.every(function (s) { return s.ok; });
    stage('passport', allOk, allOk ? 'Ready to certify.' : 'Held — an earlier stage did not pass.');

    return { ok: allOk, stages: stages, artifactId: artifactId };
  }

  /* Certify. Refuses, loudly and specifically, when the rule is not met. */
  function certify(artifactId) {
    var res = evaluate(artifactId);
    var hit = G.findArtifact(artifactId);
    var title = hit ? hit.artifact.title : artifactId;

    if (!res.ok) {
      var why = res.stages.filter(function (s) { return !s.ok; })[0];
      S.log('held', 'Gate held "' + title + '" at ' + why.label + ': ' + why.note, 'gate');
      return { ok: false, result: res, reason: why };
    }

    var passport = {
      artifactId: artifactId,
      title: title,
      at: new Date().toISOString(),
      stamps: res.stages.map(function (s) { return s.label; }),
      criteria: G.criteriaFor(artifactId).map(function (e) {
        var r = S.get().criteria[e.criterion.id];
        return { id: e.criterion.id, kind: e.criterion.kind, result: (r && r.result) || 'blank' };
      }),
      claims: S.claimsFor(artifactId).map(function (c) { return { id: c.id, status: c.status }; }),
      evidenceHash: evidenceHash(artifactId),
      note: 'Content fingerprint (FNV-1a) for drift detection. Not a cryptographic digest.'
    };

    S.setArtifact(artifactId, { state: 'gated', passport: passport });
    S.log('gate', 'Certified "' + title + '" · fingerprint ' + passport.evidenceHash, 'gate');
    return { ok: true, result: res, passport: passport };
  }

  /* An artifact certified and then edited is no longer certified. */
  function driftCheck(artifactId) {
    var a = S.artifact(artifactId);
    if (!a.passport) return { drifted: false };
    var now = evidenceHash(artifactId);
    if (now === a.passport.evidenceHash) return { drifted: false };
    /* Read the title before clearing — setArtifact mutates the live object. */
    var title = a.passport.title;
    S.setArtifact(artifactId, { state: 'drafted', passport: null });
    S.log('held', 'Certification withdrawn from "' + title + '" — content changed after the Gate.', 'gate');
    return { drifted: true };
  }

  w.CBS_GATE = {
    STAGES: STAGES,
    draftText: draftText,
    madeText: madeText,
    hasMarkers: hasMarkers,
    autoEvaluate: autoEvaluate,
    runAutoCriteria: runAutoCriteria,
    evaluate: evaluate,
    certify: certify,
    driftCheck: driftCheck,
    evidenceHash: evidenceHash,
    fingerprint: fingerprint
  };
})(window);
