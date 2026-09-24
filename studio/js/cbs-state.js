/* Client Build Studio — engagement state.

   One engagement at a time, persisted to localStorage, exportable as JSON and
   re-importable to the same state. The shipped spine is never mutated: agent
   proposals land in `overlay`, which is merged over the spine at read time.

   Everything that changes state goes through `set()` so the event bus fires
   once and the renderer never has to guess what moved. */
(function (w) {
  'use strict';

  var KEY = 'cbs.engagement.v1';
  var STATE_VERSION = '1.0.0';

  /* ------------------------------------------------------------- event bus */
  var listeners = {};
  function on(evt, fn) {
    (listeners[evt] || (listeners[evt] = [])).push(fn);
    return function off() {
      listeners[evt] = (listeners[evt] || []).filter(function (f) { return f !== fn; });
    };
  }
  function emit(evt, payload) {
    (listeners[evt] || []).forEach(function (fn) {
      try { fn(payload); } catch (e) { /* a bad listener must not break state */ }
    });
    if (evt !== '*') emit('*', { evt: evt, payload: payload });
  }

  /* ---------------------------------------------------------------- shapes */
  function blank() {
    return {
      stateVersion: STATE_VERSION,
      spineVersion: (w.CBS_SPINE && w.CBS_SPINE.spineVersion) || null,
      id: 'eng-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      intake: {},
      artifacts: {},   /* id -> { state, tier, draft, updatedAt, passport } */
      criteria: {},    /* id -> { result, note, at } */
      claims: {},      /* id -> { text, status, source, asOf } */
      reviews: {},     /* criterionId -> { persona, findings[], resolution } */
      overlay: { areas: [], artifacts: [] },
      promoted: [],    /* patterns promoted out of this engagement */
      log: []
    };
  }

  var engagement = null;

  function load() {
    var raw = null;
    try { raw = w.localStorage.getItem(KEY); } catch (e) { raw = null; }
    if (!raw) { engagement = blank(); return engagement; }
    try {
      var parsed = JSON.parse(raw);
      engagement = normalise(parsed);
    } catch (e) {
      engagement = blank();
      engagement.log.push(entry('error', 'Stored engagement was unreadable; started a fresh one.'));
    }
    return engagement;
  }

  /* Fill in anything a older or hand-edited export is missing, rather than
     rejecting it. An import that half-works is more useful than a refusal. */
  function normalise(e) {
    var base = blank();
    if (!e || typeof e !== 'object') return base;
    Object.keys(base).forEach(function (k) {
      if (e[k] === undefined || e[k] === null) e[k] = base[k];
    });
    if (!e.overlay || typeof e.overlay !== 'object') e.overlay = { areas: [], artifacts: [] };
    if (!Array.isArray(e.overlay.areas)) e.overlay.areas = [];
    if (!Array.isArray(e.overlay.artifacts)) e.overlay.artifacts = [];
    if (!Array.isArray(e.log)) e.log = [];
    if (!Array.isArray(e.promoted)) e.promoted = [];
    e.stateVersion = STATE_VERSION;
    return e;
  }

  function save() {
    if (!engagement) return;
    engagement.updatedAt = new Date().toISOString();
    try {
      w.localStorage.setItem(KEY, JSON.stringify(engagement));
    } catch (err) {
      /* Quota or a private window. The session still works in memory; say so
         once rather than failing silently or throwing on every keystroke. */
      if (!save._warned) {
        save._warned = true;
        emit('storage:unavailable', String(err && err.message || err));
      }
    }
  }

  function get() { return engagement || load(); }

  function entry(kind, msg, provenance) {
    return { t: new Date().toISOString(), kind: kind, msg: msg, provenance: provenance || 'human' };
  }

  function log(kind, msg, provenance) {
    var e = get();
    e.log.push(entry(kind, msg, provenance));
    if (e.log.length > 500) e.log = e.log.slice(-500);
    save();
    emit('log', e.log[e.log.length - 1]);
  }

  /* Generic mutator. `path` is a dotted path into the engagement. */
  function set(path, value, opts) {
    var e = get();
    var parts = path.split('.');
    var cur = e;
    for (var i = 0; i < parts.length - 1; i++) {
      if (typeof cur[parts[i]] !== 'object' || cur[parts[i]] === null) cur[parts[i]] = {};
      cur = cur[parts[i]];
    }
    cur[parts[parts.length - 1]] = value;
    save();
    emit('change', { path: path, value: value, quiet: !!(opts && opts.quiet) });
    return value;
  }

  /* --------------------------------------------------------------- intake */
  function setIntake(id, value) {
    set('intake.' + id, value);
    emit('intake', { id: id, value: value });
  }
  function intakeComplete() {
    var e = get();
    return (w.CBS_INTAKE || []).every(function (f) {
      var v = e.intake[f.id];
      return typeof v === 'string' && v.trim().length > 0;
    });
  }
  function lane() { return (get().intake.lane) || null; }

  /* ------------------------------------------------------------- artifacts */
  function artifact(id) {
    var e = get();
    if (!e.artifacts[id]) {
      e.artifacts[id] = { state: 'empty', tier: null, draft: null, updatedAt: null, passport: null };
    }
    return e.artifacts[id];
  }
  function setArtifact(id, patch) {
    var a = artifact(id);
    Object.keys(patch).forEach(function (k) { a[k] = patch[k]; });
    a.updatedAt = new Date().toISOString();
    save();
    emit('artifact', { id: id, artifact: a });
    return a;
  }

  /* ------------------------------------------------------------- criteria */
  function criterion(id) {
    var e = get();
    if (!e.criteria[id]) e.criteria[id] = { result: null, note: '', at: null };
    return e.criteria[id];
  }
  function setCriterion(id, result, note) {
    var c = criterion(id);
    c.result = result;
    if (note !== undefined) c.note = note;
    c.at = new Date().toISOString();
    save();
    emit('criterion', { id: id, criterion: c });
    return c;
  }

  /* --------------------------------------------------------------- claims */
  function addClaim(claim) {
    var e = get();
    var id = claim.id || ('cl-' + (Object.keys(e.claims).length + 1));
    e.claims[id] = {
      id: id,
      text: claim.text || '',
      status: claim.status || 'unsourced',
      source: claim.source || '',
      asOf: claim.asOf || '',
      artifactId: claim.artifactId || null
    };
    save();
    emit('claim', { id: id, claim: e.claims[id] });
    return e.claims[id];
  }
  function setClaim(id, patch) {
    var e = get();
    if (!e.claims[id]) return null;
    Object.keys(patch).forEach(function (k) { e.claims[id][k] = patch[k]; });
    save();
    emit('claim', { id: id, claim: e.claims[id] });
    return e.claims[id];
  }
  function removeClaim(id) {
    var e = get();
    delete e.claims[id];
    save();
    emit('claim', { id: id, claim: null });
  }
  function claimsFor(artifactId) {
    var e = get();
    return Object.keys(e.claims)
      .map(function (k) { return e.claims[k]; })
      .filter(function (c) { return !artifactId || c.artifactId === artifactId; });
  }

  /* -------------------------------------------------------------- reviews */
  function review(criterionId) {
    var e = get();
    if (!e.reviews[criterionId]) {
      e.reviews[criterionId] = { persona: null, findings: [], resolution: null, at: null };
    }
    return e.reviews[criterionId];
  }
  function setReview(criterionId, patch) {
    var r = review(criterionId);
    Object.keys(patch).forEach(function (k) { r[k] = patch[k]; });
    r.at = new Date().toISOString();
    save();
    emit('review', { id: criterionId, review: r });
    return r;
  }

  /* -------------------------------------------------------------- overlay */
  /* Agent-proposed nodes, accepted by a human. Merged over the shipped spine
     at read time by cbs-graph.js — the spine file itself is immutable here. */
  function acceptProposal(kind, node, provenance) {
    var e = get();
    var bucket = kind === 'area' ? e.overlay.areas : e.overlay.artifacts;
    node.origin = { provenance: provenance || 'agent', at: new Date().toISOString() };
    bucket.push(node);
    save();
    log('proposal', 'Accepted ' + kind + ' "' + (node.title || node.id) + '" into the overlay.', provenance);
    emit('overlay', { kind: kind, node: node });
    return node;
  }
  function removeOverlayNode(kind, id) {
    var e = get();
    var key = kind === 'area' ? 'areas' : 'artifacts';
    e.overlay[key] = e.overlay[key].filter(function (n) { return n.id !== id; });
    save();
    emit('overlay', { kind: kind, node: null });
  }

  function promotePattern(pattern) {
    var e = get();
    e.promoted.push(pattern);
    save();
    log('promotion', 'Promoted pattern "' + (pattern.title || pattern.id) + '" to the library.');
    emit('promoted', pattern);
    return pattern;
  }

  /* ------------------------------------------------------- import / export */
  function exportJSON() {
    return JSON.stringify(get(), null, 2);
  }
  function importJSON(text) {
    var parsed;
    try { parsed = JSON.parse(text); }
    catch (e) { return { ok: false, error: 'That is not valid JSON.' }; }
    if (!parsed || typeof parsed !== 'object' || !parsed.intake) {
      return { ok: false, error: 'That JSON is not an engagement export (no intake block).' };
    }
    engagement = normalise(parsed);
    save();
    emit('imported', engagement);
    emit('change', { path: '*', value: null });
    return { ok: true, engagement: engagement };
  }
  function reset() {
    engagement = blank();
    save();
    emit('reset', engagement);
    emit('change', { path: '*', value: null });
    return engagement;
  }

  w.CBS_STATE = {
    STATE_VERSION: STATE_VERSION,
    on: on, emit: emit,
    load: load, get: get, save: save, set: set, reset: reset,
    log: log,
    setIntake: setIntake, intakeComplete: intakeComplete, lane: lane,
    artifact: artifact, setArtifact: setArtifact,
    criterion: criterion, setCriterion: setCriterion,
    addClaim: addClaim, setClaim: setClaim, removeClaim: removeClaim, claimsFor: claimsFor,
    review: review, setReview: setReview,
    acceptProposal: acceptProposal, removeOverlayNode: removeOverlayNode,
    promotePattern: promotePattern,
    exportJSON: exportJSON, importJSON: importJSON
  };

  load();
})(window);
