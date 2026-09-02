/* Client Build Studio — the self-organizing engine.

   Everything here is derived, never stored: the merged spine, what is in scope
   for this engagement, what is ready to work on, how far along it is, and what
   is structurally wrong with it. If the UI ever needs to know "what next", it
   asks here rather than deciding for itself. */
(function (w) {
  'use strict';

  var S = function () { return w.CBS_STATE; };

  /* ----------------------------------------------------- merged spine view */
  /* Shipped spine + accepted overlay nodes. Overlay areas attach to their
     named section; overlay artifacts attach to their named area. Nothing is
     written back to CBS_SPINE — this returns a fresh view every call. */
  function resolved() {
    var base = w.CBS_SPINE;
    var overlay = S().get().overlay || { areas: [], artifacts: [] };
    var view = {
      spineVersion: base.spineVersion,
      meta: base.meta,
      personas: base.personas,
      lanes: base.lanes,
      patterns: (base.patterns || []).concat(S().get().promoted || []),
      sections: base.sections.map(function (s) {
        return {
          id: s.id, n: s.n, title: s.title, settles: s.settles, blurb: s.blurb,
          areas: (s.areas || []).map(function (a) {
            return {
              id: a.id, title: a.title, purpose: a.purpose, questions: a.questions,
              exemplar: a.exemplar, expand: a.expand, appliesWhen: a.appliesWhen,
              criteria: (a.criteria || []).slice(),
              artifacts: (a.artifacts || []).slice(),
              sectionId: s.id
            };
          })
        };
      })
    };

    var areaById = {}, sectionById = {};
    view.sections.forEach(function (s) {
      sectionById[s.id] = s;
      s.areas.forEach(function (a) { areaById[a.id] = a; });
    });

    (overlay.areas || []).forEach(function (node) {
      var sec = sectionById[node.sectionId];
      if (!sec) return;
      var copy = JSON.parse(JSON.stringify(node));
      copy.fromOverlay = true;
      copy.artifacts = copy.artifacts || [];
      copy.criteria = copy.criteria || [];
      sec.areas.push(copy);
      areaById[copy.id] = copy;
    });
    (overlay.artifacts || []).forEach(function (node) {
      var area = areaById[node.areaId];
      if (!area) return;
      var copy = JSON.parse(JSON.stringify(node));
      copy.fromOverlay = true;
      copy.criteria = copy.criteria || [];
      area.artifacts.push(copy);
    });

    return view;
  }

  /* ------------------------------------------------------------ scoping */
  /* appliesWhen is a plain object of intake-field → required value. No
     expressions, no eval — a predicate you can read in the data file. */
  function inScope(node) {
    var when = node && node.appliesWhen;
    if (!when) return true;
    var intake = S().get().intake || {};
    return Object.keys(when).every(function (k) {
      var want = when[k];
      var got = intake[k];
      return Array.isArray(want) ? want.indexOf(got) !== -1 : want === got;
    });
  }

  function eachArtifact(view, fn) {
    (view || resolved()).sections.forEach(function (s) {
      s.areas.forEach(function (a) {
        (a.artifacts || []).forEach(function (af) { fn(af, a, s); });
      });
    });
  }

  function scopedArtifacts(view) {
    view = view || resolved();
    var out = [];
    eachArtifact(view, function (af, a, s) {
      if (inScope(a) && inScope(af)) out.push({ artifact: af, area: a, section: s });
    });
    return out;
  }

  function scopedAreas(view) {
    view = view || resolved();
    var out = [];
    view.sections.forEach(function (s) {
      s.areas.forEach(function (a) { if (inScope(a)) out.push({ area: a, section: s }); });
    });
    return out;
  }

  function findArtifact(id, view) {
    var hit = null;
    eachArtifact(view, function (af, a, s) { if (af.id === id) hit = { artifact: af, area: a, section: s }; });
    return hit;
  }

  /* ----------------------------------------------------------- dependency */
  var DRAFTED_OR_BETTER = { drafted: 1, redteamed: 1, gated: 1, published: 1 };

  /* An artifact is ready when every in-scope input is at least drafted.
     Out-of-scope inputs are ignored rather than deadlocking the board — but
     diagnose() reports them, because a silently ignored dependency is a bug in
     the spine, not a feature. */
  function satisfied(dep, view) {
    var d = findArtifact(dep, view);
    if (!d) return true;                                   /* unknown: not our blocker */
    if (!inScope(d.area) || !inScope(d.artifact)) return true; /* pruned: ignored */
    return !!DRAFTED_OR_BETTER[S().artifact(dep).state];
  }

  /* `inputs` is an AND-group: every one must be satisfied.
     `inputsAny` is an OR-group: at least one IN-SCOPE member must be. Lane
     artifacts use this, because exactly one lane is ever in scope and requiring
     all six would deadlock the board. */
  function anyGroupMet(hit, view) {
    var any = hit.artifact.inputsAny || [];
    if (!any.length) return true;
    var relevant = any.filter(function (dep) {
      var d = findArtifact(dep, view);
      return d && inScope(d.area) && inScope(d.artifact);
    });
    if (!relevant.length) return true;   /* none in scope — nothing to wait for */
    return relevant.some(function (dep) {
      return !!DRAFTED_OR_BETTER[S().artifact(dep).state];
    });
  }

  function isReady(id, view) {
    view = view || resolved();
    var hit = findArtifact(id, view);
    if (!hit) return false;
    var allMet = (hit.artifact.inputs || []).every(function (dep) { return satisfied(dep, view); });
    return allMet && anyGroupMet(hit, view);
  }

  function blockers(id, view) {
    view = view || resolved();
    var hit = findArtifact(id, view);
    if (!hit) return [];
    var out = (hit.artifact.inputs || []).filter(function (dep) { return !satisfied(dep, view); });
    if (!anyGroupMet(hit, view)) {
      (hit.artifact.inputsAny || []).forEach(function (dep) {
        var d = findArtifact(dep, view);
        if (d && inScope(d.area) && inScope(d.artifact)) out.push(dep);
      });
    }
    return out;
  }

  /* The organizing engine: exactly one card, always. Highest weight among the
     artifacts that are ready and not yet certified. Ties break by section
     order, so the method's own sequence is the tiebreaker. */
  function nextBestAction(view) {
    view = view || resolved();
    var candidates = scopedArtifacts(view).filter(function (e) {
      var st = S().artifact(e.artifact.id).state;
      return st !== 'gated' && st !== 'published' && isReady(e.artifact.id, view);
    });
    if (!candidates.length) return null;
    candidates.sort(function (a, b) {
      var wa = a.artifact.weight || 5, wb = b.artifact.weight || 5;
      if (wb !== wa) return wb - wa;
      if (a.section.n !== b.section.n) return a.section.n - b.section.n;
      return 0;
    });
    return candidates[0];
  }

  /* ---------------------------------------------------------- readiness */
  var LADDER = [
    { id: 'R0', label: 'Blank', note: 'Nothing committed yet.' },
    { id: 'R1', label: 'Framed', note: 'The Commission is answered.' },
    { id: 'R2', label: 'Grounded', note: 'Claims are registered and sourced.' },
    { id: 'R3', label: 'Drafted', note: 'Every in-scope artifact has a draft.' },
    { id: 'R4', label: 'Certified', note: 'Every in-scope artifact carries a passport.' },
    { id: 'R5', label: 'Published', note: 'The deliverable has been assembled and exported.' }
  ];

  function readiness(view) {
    view = view || resolved();
    var st = S();
    var scoped = scopedArtifacts(view);
    var total = scoped.length || 1;
    var counts = { empty: 0, drafted: 0, redteamed: 0, gated: 0, published: 0 };
    scoped.forEach(function (e) { counts[st.artifact(e.artifact.id).state]++; });

    var claims = st.claimsFor();
    var unsourced = claims.filter(function (c) { return c.status === 'unsourced'; }).length;

    var drafted = counts.drafted + counts.redteamed + counts.gated + counts.published;
    var certified = counts.gated + counts.published;

    var level = 0;
    if (st.intakeComplete()) level = 1;
    if (level >= 1 && claims.length > 0 && unsourced === 0) level = 2;
    if (level >= 1 && drafted === scoped.length && scoped.length > 0) level = Math.max(level, 3);
    if (level >= 3 && certified === scoped.length && scoped.length > 0) level = 4;
    if (level >= 4 && counts.published > 0) level = 5;

    return {
      level: LADDER[level],
      index: level,
      ladder: LADDER,
      counts: counts,
      total: scoped.length,
      draftedPct: Math.round((drafted / total) * 100),
      certifiedPct: Math.round((certified / total) * 100),
      claims: claims.length,
      unsourced: unsourced
    };
  }

  /* ---------------------------------------------------------- diagnose() */
  /* The self-audit. Findings are structural — things that are wrong with the
     method or this engagement's shape, not things that are merely unfinished. */
  function diagnose(view) {
    view = view || resolved();
    var st = S();
    var findings = [];
    function add(severity, kind, msg, where) {
      findings.push({ severity: severity, kind: kind, msg: msg, where: where || '' });
    }

    var scoped = scopedArtifacts(view);
    var scopedIds = {};
    scoped.forEach(function (e) { scopedIds[e.artifact.id] = true; });

    /* Dependencies pruned out of scope — the graph silently ignores these. */
    scoped.forEach(function (e) {
      (e.artifact.inputs || []).forEach(function (dep) {
        var d = findArtifact(dep, view);
        if (!d) {
          add('high', 'dead-input', 'Input "' + dep + '" names no artifact.', e.artifact.title);
        } else if (!scopedIds[dep]) {
          add('med', 'pruned-input', 'Depends on "' + d.artifact.title + '", which this engagement\'s scope excludes.', e.artifact.title);
        }
      });
      /* An OR-group only misfires when NONE of its members survive scoping. */
      var any = e.artifact.inputsAny || [];
      if (any.length) {
        var live = any.filter(function (dep) { return scopedIds[dep]; });
        var known = any.filter(function (dep) { return !!findArtifact(dep, view); });
        if (known.length < any.length) {
          add('high', 'dead-input', 'An alternative input names no artifact.', e.artifact.title);
        } else if (!live.length) {
          add('high', 'pruned-input', 'None of its alternative inputs survive this engagement\'s scope.', e.artifact.title);
        }
      }
    });

    /* Artifacts nobody checks. */
    scoped.forEach(function (e) {
      var own = (e.artifact.criteria || []).length;
      var area = (e.area.criteria || []).length;
      if (own + area === 0) {
        add('high', 'no-criteria', 'Has no criteria of its own and sits in an area with none — nothing can fail.', e.artifact.title);
      }
    });

    /* Areas in scope that produce nothing in this engagement. */
    scopedAreas(view).forEach(function (e) {
      var produced = (e.area.artifacts || []).filter(function (af) { return inScope(af); });
      if (!produced.length) {
        add('med', 'empty-area', 'In scope but produces no artifact — its criteria have nothing to attach to.', e.section.title + ' · ' + e.area.title);
      }
    });

    /* Sections with nothing in them at all. */
    view.sections.forEach(function (s) {
      var n = 0;
      s.areas.forEach(function (a) {
        if (!inScope(a)) return;
        n += (a.artifacts || []).filter(inScope).length;
      });
      if (n === 0) add('med', 'empty-section', 'No in-scope artifacts in this whole section.', s.title);
    });

    /* Evidence gaps. */
    st.claimsFor().forEach(function (c) {
      if (c.status === 'unsourced') {
        add('high', 'unsourced-claim', 'Claim is unsourced and will block the Gate: "' + trim(c.text, 70) + '"', c.id);
      }
    });

    /* Orphans — nothing downstream consumes them and they are not terminal. */
    var consumed = {};
    scoped.forEach(function (e) {
      (e.artifact.inputs || []).concat(e.artifact.inputsAny || [])
        .forEach(function (dep) { consumed[dep] = true; });
    });
    scoped.forEach(function (e) {
      var isTerminal = e.section.id === 's-publish' || e.section.id === 's-expand';
      if (!consumed[e.artifact.id] && !isTerminal) {
        add('low', 'orphan', 'Nothing downstream consumes this — it may not be earning its place.', e.artifact.title);
      }
    });

    /* Criteria that have never failed are criteria that cannot fail. */
    var judged = 0, failed = 0;
    allCriteria(view).forEach(function (c) {
      var r = st.get().criteria[c.criterion.id];
      if (r && r.result) { judged++; if (r.result === 'fail') failed++; }
    });
    if (judged >= 8 && failed === 0) {
      add('low', 'soft-criteria', judged + ' criteria judged and not one failed. Criteria that never fail are not testing anything.', 'Criteria run');
    }

    /* Blocked work. */
    scoped.forEach(function (e) {
      var b = blockers(e.artifact.id, view);
      if (b.length && st.artifact(e.artifact.id).state === 'empty') {
        add('low', 'blocked', 'Waiting on ' + b.length + ' upstream artifact' + (b.length > 1 ? 's' : '') + '.', e.artifact.title);
      }
    });

    var order = { high: 0, med: 1, low: 2 };
    findings.sort(function (a, b) { return order[a.severity] - order[b.severity]; });
    return findings;
  }

  function trim(s, n) {
    s = String(s || '');
    return s.length > n ? s.slice(0, n - 1) + '…' : s;
  }

  /* Every criterion that applies to this engagement, with its owner. */
  function allCriteria(view) {
    view = view || resolved();
    var out = [];
    view.sections.forEach(function (s) {
      s.areas.forEach(function (a) {
        if (!inScope(a)) return;
        (a.criteria || []).forEach(function (c) {
          out.push({ criterion: c, area: a, section: s, artifact: null });
        });
        (a.artifacts || []).forEach(function (af) {
          if (!inScope(af)) return;
          (af.criteria || []).forEach(function (c) {
            out.push({ criterion: c, area: a, section: s, artifact: af });
          });
        });
      });
    });
    /* Lane criteria apply to the whole engagement. */
    var laneId = S().lane();
    var lane = laneId && w.CBS_LANE_BY_ID && w.CBS_LANE_BY_ID[laneId];
    if (lane) {
      (lane.criteria || []).forEach(function (c) {
        out.push({ criterion: c, area: null, section: null, artifact: null, lane: lane });
      });
    }
    return out;
  }

  /* Criteria that apply to one artifact: its own, plus its area's. */
  function criteriaFor(artifactId, view) {
    view = view || resolved();
    var hit = findArtifact(artifactId, view);
    if (!hit) return [];
    return (hit.artifact.criteria || []).map(function (c) { return { criterion: c, scope: 'artifact' }; })
      .concat((hit.area.criteria || []).map(function (c) { return { criterion: c, scope: 'area' }; }));
  }

  w.CBS_GRAPH = {
    resolved: resolved,
    inScope: inScope,
    scopedArtifacts: scopedArtifacts,
    scopedAreas: scopedAreas,
    findArtifact: findArtifact,
    isReady: isReady,
    blockers: blockers,
    nextBestAction: nextBestAction,
    readiness: readiness,
    diagnose: diagnose,
    allCriteria: allCriteria,
    criteriaFor: criteriaFor,
    LADDER: LADDER
  };
})(window);
