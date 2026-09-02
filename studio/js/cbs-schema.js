/* Client Build Studio — node schemas, validator, migrations.
   The spine is data. This file is the only thing that decides whether a piece
   of that data is well formed, so every other module can assume it is.

   No eval, ever: a criterion's `test` is the NAME of a function registered in
   CBS_TESTS, never a string to be executed. CSP is script-src 'self'. */
(function (w) {
  'use strict';

  var SPINE_VERSION = '1.0.0';

  var KINDS = ['binary', 'evidence', 'review'];
  var LANES = ['deck', 'paper', 'experience', 'application', 'program', 'session'];
  var STATES = ['empty', 'drafted', 'redteamed', 'gated', 'published'];
  var READINESS = ['R0', 'R1', 'R2', 'R3', 'R4', 'R5'];

  /* Registry of auto-evaluable criterion tests. Populated by cbs-gate.js.
     A criterion naming a test that isn't registered is a validation error,
     not a silent pass. */
  var TESTS = {};

  var REQUIRED = {
    section:   ['id', 'n', 'title', 'settles', 'areas'],
    area:      ['id', 'title', 'purpose', 'questions', 'criteria'],
    artifact:  ['id', 'title', 'lane', 'pattern', 'outputs'],
    criterion: ['id', 'kind', 'text'],
    lane:      ['id', 'title', 'good', 'adapter'],
    pattern:   ['id', 'title', 'lane', 'sections'],
    persona:   ['id', 'name', 'reads_for']
  };

  function isNonEmptyString(v) { return typeof v === 'string' && v.trim().length > 0; }
  function isNonEmptyArray(v) { return Array.isArray(v) && v.length > 0; }

  function present(node, field) {
    var v = node[field];
    if (typeof v === 'number') return true;
    if (Array.isArray(v)) return v.length > 0;
    return isNonEmptyString(v);
  }

  function Errors() {
    var list = [];
    return {
      add: function (path, msg) { list.push({ path: path, msg: msg }); },
      list: function () { return list; },
      count: function () { return list.length; }
    };
  }

  function checkRequired(node, type, path, err) {
    var req = REQUIRED[type] || [];
    for (var i = 0; i < req.length; i++) {
      if (!present(node, req[i])) {
        err.add(path, 'missing required field "' + req[i] + '" on ' + type);
      }
    }
  }

  /* Depth-first cycle detection over artifact.inputs. Returns the first cycle
     found as an array of ids, or null. */
  function findCycle(artifacts) {
    var byId = {};
    artifacts.forEach(function (a) { byId[a.id] = a; });
    var state = {}; /* 1 = visiting, 2 = done */
    var stack = [];
    var cycle = null;

    function visit(id) {
      if (cycle) return;
      if (state[id] === 2) return;
      if (state[id] === 1) {
        cycle = stack.slice(stack.indexOf(id)).concat(id);
        return;
      }
      state[id] = 1;
      stack.push(id);
      var a = byId[id];
      var inputs = ((a && a.inputs) || []).concat((a && a.inputsAny) || []);
      for (var i = 0; i < inputs.length; i++) {
        if (byId[inputs[i]]) visit(inputs[i]);
        if (cycle) return;
      }
      stack.pop();
      state[id] = 2;
    }

    for (var i = 0; i < artifacts.length; i++) {
      visit(artifacts[i].id);
      if (cycle) break;
    }
    return cycle;
  }

  /* Walk the spine and collect every node with its path, so callers don't each
     re-implement the traversal. */
  function walk(spine) {
    var out = { sections: [], areas: [], artifacts: [], criteria: [] };
    (spine.sections || []).forEach(function (s, si) {
      var sp = 'sections[' + si + ']';
      out.sections.push({ node: s, path: sp });
      (s.areas || []).forEach(function (ar, ai) {
        var ap = sp + '.areas[' + ai + ']';
        out.areas.push({ node: ar, path: ap, section: s });
        (ar.criteria || []).forEach(function (c, ci) {
          out.criteria.push({ node: c, path: ap + '.criteria[' + ci + ']', area: ar, section: s });
        });
        (ar.artifacts || []).forEach(function (af, fi) {
          var fp = ap + '.artifacts[' + fi + ']';
          out.artifacts.push({ node: af, path: fp, area: ar, section: s });
          (af.criteria || []).forEach(function (c, ci) {
            out.criteria.push({ node: c, path: fp + '.criteria[' + ci + ']', artifact: af, area: ar, section: s });
          });
        });
      });
    });
    return out;
  }

  /* The validator. Returns { ok, errors, stats } — never throws, because a
     malformed spine has to be reportable in the UI, not a white screen. */
  function validateSpine(spine, opts) {
    opts = opts || {};
    var err = Errors();

    if (!spine || typeof spine !== 'object') {
      err.add('spine', 'spine is not an object');
      return { ok: false, errors: err.list(), stats: {} };
    }
    if (spine.spineVersion !== SPINE_VERSION) {
      err.add('spine.spineVersion',
        'expected ' + SPINE_VERSION + ', got ' + JSON.stringify(spine.spineVersion));
    }
    if (!isNonEmptyArray(spine.sections)) {
      err.add('spine.sections', 'spine has no sections');
    }

    var all = walk(spine);
    var seen = {};
    var laneIds = {};
    var patternIds = {};
    var personaIds = {};

    (spine.lanes || []).forEach(function (l, i) {
      checkRequired(l, 'lane', 'lanes[' + i + ']', err);
      if (LANES.indexOf(l.id) === -1) {
        err.add('lanes[' + i + ']', 'unknown lane id "' + l.id + '"');
      }
      laneIds[l.id] = true;
    });
    (spine.patterns || []).forEach(function (p, i) {
      checkRequired(p, 'pattern', 'patterns[' + i + ']', err);
      patternIds[p.id] = true;
    });
    (spine.personas || []).forEach(function (p, i) {
      checkRequired(p, 'persona', 'personas[' + i + ']', err);
      personaIds[p.id] = true;
    });

    function claimId(id, path) {
      if (!isNonEmptyString(id)) { err.add(path, 'node has no id'); return; }
      if (seen[id]) { err.add(path, 'duplicate id "' + id + '" (also at ' + seen[id] + ')'); return; }
      seen[id] = path;
    }

    all.sections.forEach(function (e) {
      checkRequired(e.node, 'section', e.path, err);
      claimId(e.node.id, e.path);
      if (!isNonEmptyArray(e.node.areas)) {
        err.add(e.path, 'section "' + e.node.id + '" has no areas');
      }
    });

    all.areas.forEach(function (e) {
      checkRequired(e.node, 'area', e.path, err);
      claimId(e.node.id, e.path);
      if (!isNonEmptyArray(e.node.criteria)) {
        err.add(e.path, 'area "' + e.node.id + '" has no criteria — every area must be checkable');
      }
      if (e.node.exemplar && !isNonEmptyString(e.node.exemplar.href)) {
        err.add(e.path + '.exemplar', 'exemplar needs an href into the worked example');
      }
    });

    all.artifacts.forEach(function (e) {
      checkRequired(e.node, 'artifact', e.path, err);
      claimId(e.node.id, e.path);
      var lane = e.node.lane;
      if (lane !== 'any' && LANES.indexOf(lane) === -1) {
        err.add(e.path, 'unknown lane "' + lane + '"');
      }
      if (!opts.skipPatternRefs && e.node.pattern && !patternIds[e.node.pattern]) {
        err.add(e.path, 'references unknown pattern "' + e.node.pattern + '"');
      }
      if (e.node.state && STATES.indexOf(e.node.state) === -1) {
        err.add(e.path, 'unknown state "' + e.node.state + '"');
      }
    });

    all.criteria.forEach(function (e) {
      checkRequired(e.node, 'criterion', e.path, err);
      claimId(e.node.id, e.path);
      if (KINDS.indexOf(e.node.kind) === -1) {
        err.add(e.path, 'unknown criterion kind "' + e.node.kind + '" (expected ' + KINDS.join('/') + ')');
      }
      if (e.node.kind === 'review' && !personaIds[e.node.persona]) {
        err.add(e.path, 'review criterion needs a known persona, got "' + e.node.persona + '"');
      }
      if (e.node.test) {
        if (typeof e.node.test !== 'string') {
          err.add(e.path, 'test must be the NAME of a registered test, not a function or expression');
        } else if (!opts.skipTestRefs && !TESTS[e.node.test]) {
          err.add(e.path, 'references unregistered test "' + e.node.test + '"');
        }
      }
    });

    /* Referential integrity on the dependency graph. */
    var artifactNodes = all.artifacts.map(function (e) { return e.node; });
    var artifactIds = {};
    artifactNodes.forEach(function (a) { artifactIds[a.id] = true; });
    all.artifacts.forEach(function (e) {
      (e.node.inputs || []).concat(e.node.inputsAny || []).forEach(function (dep) {
        if (!artifactIds[dep]) {
          err.add(e.path, 'input "' + dep + '" does not name any artifact');
        }
      });
    });
    var cycle = findCycle(artifactNodes);
    if (cycle) {
      err.add('spine.graph', 'dependency cycle: ' + cycle.join(' → '));
    }

    return {
      ok: err.count() === 0,
      errors: err.list(),
      stats: {
        sections: all.sections.length,
        areas: all.areas.length,
        artifacts: all.artifacts.length,
        criteria: all.criteria.length,
        lanes: (spine.lanes || []).length,
        patterns: (spine.patterns || []).length,
        personas: (spine.personas || []).length
      }
    };
  }

  /* Migrations run oldest-first. Each returns the upgraded spine. There is only
     one version today; the hook exists so an exported engagement from an older
     build can still be imported rather than rejected. */
  var MIGRATIONS = [];

  function migrate(spine) {
    if (!spine || typeof spine !== 'object') return spine;
    var applied = [];
    MIGRATIONS.forEach(function (m) {
      if (m.appliesTo(spine.spineVersion)) {
        spine = m.up(spine);
        applied.push(m.id);
      }
    });
    if (applied.length) spine.migrationsApplied = applied;
    return spine;
  }

  w.CBS_SCHEMA = {
    SPINE_VERSION: SPINE_VERSION,
    KINDS: KINDS,
    LANES: LANES,
    STATES: STATES,
    READINESS: READINESS,
    TESTS: TESTS,
    registerTest: function (name, fn) { TESTS[name] = fn; },
    walk: walk,
    findCycle: findCycle,
    validateSpine: validateSpine,
    migrate: migrate
  };
})(window);
