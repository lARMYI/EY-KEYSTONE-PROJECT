/* Client Build Studio — the build experience.
   Three views behind one hash router: the Commission, the Board, the Workbench. */
(function (w) {
  'use strict';

  var d = w.document;
  var R = w.CBS_RENDER, S = w.CBS_STATE, G = w.CBS_GRAPH, A = w.CBS_AGENT, GATE = w.CBS_GATE;
  var el = R.el, mount = R.mount, append = R.append;
  var SVGNS = 'http://www.w3.org/2000/svg';

  var root = null;

  function svg(tag, attrs) {
    var n = d.createElementNS(SVGNS, tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'class') n.setAttribute('class', attrs[k]);
      else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2), attrs[k]);
      else n.setAttribute(k, attrs[k]);
    });
    return n;
  }

  /* =================================================== 1. THE COMMISSION */
  var qIndex = 0;

  function renderCommission() {
    var fields = w.CBS_INTAKE;
    qIndex = Math.max(0, Math.min(qIndex, fields.length - 1));
    var f = fields[qIndex];
    var val = S.get().intake[f.id] || '';

    var body;
    if (f.type === 'lane') {
      body = el('div.lane-pick', null, (w.CBS_LANES || []).map(function (lane) {
        return el('button.lane-opt', {
          type: 'button',
          'aria-pressed': val === lane.id ? 'true' : 'false',
          onclick: function () { S.setIntake('lane', lane.id); renderCommission(); }
        }, [
          el('span.li', { text: lane.icon }),
          el('span.lt', { text: lane.title }),
          el('span.lo', { text: lane.oneLiner })
        ]);
      }));
    } else {
      var ta = el('textarea.q-input', {
        id: 'q-input', rows: 3, placeholder: f.placeholder || '',
        'aria-describedby': 'q-hint'
      });
      ta.value = val;
      ta.addEventListener('input', function () { S.setIntake(f.id, ta.value); });
      ta.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); step(1); }
      });
      body = ta;
    }

    mount(root, el('div.commission', null, [
      el('div.q-step', { text: 'The Commission · question ' + (qIndex + 1) + ' of ' + fields.length }),
      el('h1.q-label', { text: f.label }),
      el('p.q-hint', { id: 'q-hint', text: f.hint }),
      body,
      el('div.q-nav', null, [
        qIndex > 0 ? el('button.btn.ghost', { type: 'button', text: '← Back', onclick: function () { step(-1); } }) : null,
        el('button.btn', {
          type: 'button',
          text: qIndex === fields.length - 1 ? 'Open the board →' : 'Next →',
          onclick: function () { step(1); }
        }),
        S.intakeComplete() && qIndex < fields.length - 1
          ? el('button.btn.ghost', { type: 'button', text: 'Skip to board', onclick: function () { go('#board'); } })
          : null,
        el('div.q-dots', { 'aria-hidden': 'true' }, fields.map(function (x, i) {
          var filled = (S.get().intake[x.id] || '').length > 0;
          return el('span.q-dot' + (i === qIndex ? '.on' : (filled ? '.done' : '')));
        }))
      ]),
      el('p.small.dimmed', { style: 'margin-top:26px', text: 'Answers are stored locally in this browser and drive everything downstream — scope, drafts, and the criteria that apply. ⌘/Ctrl+Enter moves on.' })
    ]));

    var input = R.$('#q-input');
    if (input) input.focus();
  }

  function step(dir) {
    var fields = w.CBS_INTAKE;
    var next = qIndex + dir;
    if (next < 0) return;
    if (next >= fields.length) {
      if (!S.intakeComplete()) {
        var missing = fields.filter(function (f) { return !(S.get().intake[f.id] || '').trim(); });
        qIndex = fields.indexOf(missing[0]);
        R.toast('Still needed: ' + missing[0].label);
        renderCommission();
        return;
      }
      S.log('info', 'Commission complete for "' + S.get().intake.client + '" in the ' + S.lane() + ' lane.', 'human');
      go('#board');
      return;
    }
    qIndex = next;
    renderCommission();
  }

  /* ========================================================= 2. THE BOARD */
  function archSVG(scoped) {
    var n = scoped.length;
    var cx = 200, cy = 190, r1 = 108, r2 = 168;
    var node = svg('svg', {
      viewBox: '0 0 400 208', role: 'img',
      'aria-label': 'The engagement as an arch: ' + n + ' artifacts, ' +
        scoped.filter(function (e) { return isCert(e.artifact.id); }).length + ' certified.'
    });
    var mid = Math.floor(n / 2);

    scoped.forEach(function (e, i) {
      var a0 = Math.PI - (i / n) * Math.PI;
      var a1 = Math.PI - ((i + 1) / n) * Math.PI;
      var gap = 0.004;
      a0 -= gap; a1 += gap;
      function pt(r, a) { return [(cx + r * Math.cos(a)).toFixed(2), (cy - r * Math.sin(a)).toFixed(2)]; }
      var p = ['M', pt(r1, a0), 'L', pt(r2, a0),
        'A', r2, r2, 0, 0, 1, pt(r2, a1),
        'L', pt(r1, a1),
        'A', r1, r1, 0, 0, 0, pt(r1, a0), 'Z'].join(' ');

      var st = S.artifact(e.artifact.id).state;
      var cls = 'vous st-' + st;
      if (i === mid) cls += ' key';
      if (!G.isReady(e.artifact.id)) cls += ' blocked';

      var path = svg('path', {
        d: p, class: cls, tabindex: '0', role: 'button',
        onclick: function () { go('#wb/' + e.artifact.id); },
        onkeydown: function (ev) { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); go('#wb/' + e.artifact.id); } }
      });
      var t = svg('title', {});
      t.textContent = e.artifact.title + ' — ' + st + (G.isReady(e.artifact.id) ? '' : ' (blocked)');
      path.appendChild(t);
      node.appendChild(path);
    });

    var ground = svg('line', { x1: 20, y1: 196, x2: 380, y2: 196, class: 'arch-ground' });
    node.appendChild(ground);
    return node;
  }

  function isCert(id) {
    var s = S.artifact(id).state;
    return s === 'gated' || s === 'published';
  }

  function renderBoard() {
    if (!S.intakeComplete()) { go('#commission'); return; }
    var view = G.resolved();
    var scoped = G.scopedArtifacts(view);
    var r = G.readiness(view);
    var nba = G.nextBestAction(view);
    var lane = w.CBS_LANE_BY_ID[S.lane()];

    var bySection = {};
    scoped.forEach(function (e) {
      (bySection[e.section.id] = bySection[e.section.id] || { section: e.section, items: [] }).items.push(e);
    });

    mount(root, [
      el('header.s-hero', { style: 'padding-bottom:26px' }, [
        el('span.eyebrow', { text: 'The Board · ' + (lane ? lane.title + ' lane' : 'no lane') }),
        el('h1', { style: 'font-size:clamp(1.9rem,4vw,2.8rem)', text: S.get().intake.client || 'Untitled engagement' }),
        el('p.lede', { text: S.get().intake.decision || '' })
      ]),

      el('div.board-top', null, [
        el('div.arch-wrap', null, [
          archSVG(scoped),
          el('p.arch-caption', {
            text: r.certifiedPct + '% certified · ' + r.counts.gated + ' of ' + r.total + ' voussoirs set'
          })
        ]),
        nba ? el('div.nba', null, [
          el('span.eyebrow', { text: 'Next best action' }),
          el('h3', { text: nba.artifact.title }),
          el('p', { text: nba.artifact.outputs }),
          el('div.inline', null, [
            R.chip(nba.section.title, 'gold'),
            R.chip(nba.area.title),
            R.chip(S.artifact(nba.artifact.id).state)
          ]),
          el('div.inline', { style: 'margin-top:14px' }, [
            el('button.btn', { type: 'button', text: 'Open the workbench →', onclick: function () { go('#wb/' + nba.artifact.id); } })
          ])
        ]) : el('div.nba', null, [
          el('span.eyebrow', { text: 'Next best action' }),
          el('h3', { text: 'Everything in scope is certified' }),
          el('p', { text: 'There is nothing ready to work on. Assemble the deliverable, or expand the spine to take on more.' }),
          el('a.btn', { href: 'publish.html', text: 'Go to publish →' })
        ])
      ]),

      el('div', { id: 'board-ladder', style: 'margin-bottom:26px' }),

      el('div.row-between', { style: 'margin-bottom:16px' }, [
        el('h2.s-h2', { style: 'margin:0', text: 'The work' }),
        el('div.inline', null, [
          R.chip(r.counts.empty + ' empty'),
          R.chip(r.counts.drafted + ' drafted', 'blue'),
          R.chip(r.counts.gated + ' certified', 'teal'),
          r.unsourced ? R.chip(r.unsourced + ' unsourced claims', 'red') : null
        ])
      ]),

      el('div.stack', null, Object.keys(bySection).map(function (sid) {
        var grp = bySection[sid];
        return el('section.sec', null, [
          el('div.sec-head', null, [
            el('span.sec-n', { text: String(grp.section.n) }),
            el('h3.sec-title', { text: grp.section.title }),
            R.chip(grp.items.filter(function (e) { return isCert(e.artifact.id); }).length + '/' + grp.items.length + ' certified',
              grp.items.every(function (e) { return isCert(e.artifact.id); }) ? 'teal' : null)
          ]),
          el('div.board-cols', null, grp.items.map(function (e) {
            var st = S.artifact(e.artifact.id).state;
            var ready = G.isReady(e.artifact.id, view);
            var blocked = G.blockers(e.artifact.id, view);
            return el('button.bcard.st-' + st, {
              type: 'button',
              disabled: !ready,
              onclick: function () { go('#wb/' + e.artifact.id); },
              title: ready ? 'Open ' + e.artifact.title : 'Blocked by ' + blocked.length + ' upstream artifact(s)'
            }, [
              el('span.bt', { text: e.artifact.title }),
              el('span.bs', { text: e.area.title }),
              el('div.inline', null, [
                R.chip(st, st === 'gated' || st === 'published' ? 'teal' : (st === 'drafted' ? 'blue' : null)),
                !ready ? R.chip('blocked ×' + blocked.length, 'red') : null,
                e.artifact.lane !== 'any' ? R.chip(e.artifact.lane) : null
              ])
            ]);
          }))
        ]);
      })),

      el('div.s-block', null, [
        el('h2.s-h2', { text: 'Diagnosis' }),
        el('p.s-sub', { text: 'The app audits its own shape against this engagement — dead inputs, areas that produce nothing, unsourced claims, criteria that never fail.' }),
        el('div', { id: 'board-integrity' })
      ])
    ]);

    R.renderLadder(R.$('#board-ladder'), r);
    R.renderIntegrity(R.$('#board-integrity'), { diagnose: true });
  }

  /* ===================================================== 3. THE WORKBENCH */
  function renderWorkbench(artifactId) {
    var view = G.resolved();
    var hit = G.findArtifact(artifactId, view);
    if (!hit) { R.toast('No such artifact.'); go('#board'); return; }

    var art = S.artifact(artifactId);
    var pattern = w.CBS_PATTERN_BY_ID[hit.artifact.pattern];

    mount(root, [
      el('div.row-between', { style: 'margin-bottom:20px' }, [
        el('div', null, [
          el('span.eyebrow', { text: hit.section.title + ' · ' + hit.area.title }),
          el('h1', { style: 'font-family:var(--disp);font-size:clamp(1.6rem,3.4vw,2.3rem);font-weight:600', text: hit.artifact.title })
        ]),
        el('div.inline', null, [
          el('span', { id: 'wb-status' }),
          el('button.btn.ghost', { type: 'button', text: '← Board', onclick: function () { go('#board'); } })
        ])
      ]),

      el('div.wb', null, [
        briefCol(hit, pattern),
        draftCol(hit, pattern),
        critCol(hit)
      ])
    ]);
    paintStatus(artifactId);
  }

  /* The tier badge is the honesty signal — which tier produced this draft. It
     has to repaint whenever the draft or its certification changes. */
  function paintStatus(artifactId) {
    var host = R.$('#wb-status');
    if (!host) return;
    var art = S.artifact(artifactId);
    mount(host, el('span.inline', null, [
      art.tier ? el('span.tier-badge.t' + art.tier, {
        text: 'Tier ' + art.tier + ' draft',
        title: art.tier === 1 ? 'Composed deterministically from the pattern — no model involved.'
             : art.tier === 2 ? 'Drafted by a live agent on top of the composed baseline.'
             : 'Pasted back from a prompt pack and merged onto the composed baseline.'
      }) : null,
      R.chip(art.state, isCert(artifactId) ? 'teal' : (art.state === 'drafted' ? 'blue' : null))
    ]));
  }

  function briefCol(hit, pattern) {
    var deps = (hit.artifact.inputs || []).concat(hit.artifact.inputsAny || []);
    return el('div.wb-col', null, [
      el('h4', { text: 'Brief' }),
      el('dl.wb-brief', null, [
        el('dt', { text: 'Why this exists' }), el('dd', { text: hit.area.purpose }),
        el('dt', { text: 'What it produces' }), el('dd', { text: hit.artifact.outputs }),
        pattern ? el('dt', { text: 'Pattern' }) : null,
        pattern ? el('dd', { text: pattern.title + ' — ' + pattern.purpose }) : null,
        el('dt', { text: 'Questions this answers' }),
        el('dd', null, el('ul.area-qs', null, (hit.area.questions || []).map(function (q) {
          return el('li', { text: q });
        }))),
        deps.length ? el('dt', { text: 'Consumes' }) : null,
        deps.length ? el('dd', null, el('div.stack', { style: 'gap:6px' }, deps.map(function (id) {
          var dh = G.findArtifact(id);
          if (!dh) return null;
          var ds = S.artifact(id).state;
          return el('button.bcard', {
            type: 'button', style: 'padding:8px 10px',
            onclick: function () { go('#wb/' + id); }
          }, [el('span.bs', { text: dh.artifact.title + ' · ' + ds })]);
        }).filter(Boolean))) : null,
        hit.area.exemplar ? el('dt', { text: 'Worked example' }) : null,
        hit.area.exemplar ? el('dd', null, R.exemplarLink(hit.area.exemplar)) : null
      ])
    ]);
  }

  function draftCol(hit, pattern) {
    var id = hit.artifact.id;
    var col = el('div.wb-col');
    var pipe = el('div.pipe', { 'aria-live': 'polite', 'aria-label': 'Generation pipeline' },
      A.PIPELINE.map(function (name, i) {
        return el('div.pipe-stage', { dataset: { stage: String(i) }, text: name });
      }));

    function setStage(i, state, note) {
      var n = pipe.querySelector('[data-stage="' + i + '"]');
      if (!n) return;
      n.className = 'pipe-stage ' + state;
      n.textContent = A.PIPELINE[i] + (note ? ' · ' + note : '');
    }

    var partsBox = el('div');

    function paintParts() {
      var art = S.artifact(id);
      var draft = art.draft;
      if (!draft) {
        mount(partsBox, el('div.empty-note', { text: 'No draft yet. Compose one below — the deterministic composer works with no model at all.' }));
        return;
      }
      mount(partsBox, draft.parts.map(function (p, i) {
        var ta = el('textarea', { rows: 3, 'aria-label': p.h });
        ta.value = p.body || '';
        if (GATE.hasMarkers(p.body)) ta.classList.add('needs');
        ta.addEventListener('input', function () {
          var cur = S.artifact(id);
          cur.draft.parts[i].body = ta.value;
          S.setArtifact(id, { draft: cur.draft });
          ta.classList.toggle('needs', GATE.hasMarkers(ta.value));
          if (GATE.driftCheck(id).drifted) { paintStatus(id); refreshCrits(); }
        });
        return el('div.draft-part', null, [
          el('label', { text: p.h }),
          p.hint ? el('div.hint', { text: p.hint }) : null,
          ta
        ]);
      }));
    }

    var tierNote = el('p.small.dimmed');
    function paintTierNote() {
      tierNote.textContent = A.available()
        ? 'A live agent is available on this host. It drafts on top of the composed baseline — if it fails or returns nothing usable, the composed draft stands.'
        : 'No live agent on this host. The composer works offline and always produces a real draft; the prompt pack lets you use any Claude session and paste the result back.';
    }
    paintTierNote();

    append(col, [
      el('h4', { text: 'Draft' }),
      pipe,
      el('div.inline', { style: 'margin-bottom:14px' }, [
        el('button.btn', {
          type: 'button', text: A.available() ? 'Generate' : 'Compose draft',
          onclick: function (e) {
            var btn = e.currentTarget;
            btn.disabled = true;
            A.PIPELINE.forEach(function (_, i) { setStage(i, '', ''); });
            A.generate(id, setStage).then(function (res) {
              btn.disabled = false;
              paintParts();
              paintStatus(id);
              if (res && res.ok) R.toast('Tier ' + res.tier + ' draft ready');
              else R.toast((res && res.error) || 'Generation failed');
              refreshCrits();
            });
          }
        }),
        el('button.btn.ghost', {
          type: 'button', text: 'Prompt pack',
          onclick: function () { R.copyText(A.promptPack(id), 'Prompt copied — paste it into any Claude session'); }
        }),
        el('button.btn.ghost', {
          type: 'button', text: 'Import response',
          onclick: function () { importBox.classList.toggle('hidden'); if (!importBox.classList.contains('hidden')) importBox.querySelector('textarea').focus(); }
        })
      ]),
      tierNote
    ]);

    var importTa = el('textarea.export-box', { rows: 8, placeholder: '{"parts":[{"h":"…","body":"…"}]}', style: 'min-height:150px', 'aria-label': 'Paste the agent response' });
    var importBox = el('div.hidden', { style: 'margin:14px 0' }, [
      el('p.small.dimmed', { style: 'margin-bottom:8px', text: 'Paste the JSON back. Headings must match the pattern exactly; anything that does not match is ignored rather than guessed at.' }),
      importTa,
      el('div.inline', { style: 'margin-top:10px' }, [
        el('button.btn', {
          type: 'button', text: 'Merge it in',
          onclick: function () {
            var res = A.importResponse(id, importTa.value);
            if (res.ok) {
              R.toast('Merged ' + res.merged + ' of ' + res.total + ' parts');
              importTa.value = ''; importBox.classList.add('hidden');
              paintParts(); paintStatus(id); refreshCrits();
            } else R.toast(res.error);
          }
        })
      ])
    ]);
    append(col, importBox);
    append(col, partsBox);
    paintParts();

    /* ---- claims ---- */
    append(col, el('h4', { style: 'margin-top:26px', text: 'Claims on this artifact' }));
    var claimsBox = el('div');
    append(col, claimsBox);

    function paintClaims() {
      var claims = S.claimsFor(id);
      if (!claims.length) {
        mount(claimsBox, el('p.small.dimmed', { text: 'No claims registered. Register every factual assertion this artifact makes — an Unsourced claim blocks the Gate.' }));
      } else {
        mount(claimsBox, claims.map(function (c) {
          var sel = el('select.st-sel.' + c.status, { 'aria-label': 'Truth status for claim ' + c.id }, [
            el('option', { value: 'verified', text: 'Verified' }),
            el('option', { value: 'proposed', text: 'Proposed' }),
            el('option', { value: 'unsourced', text: 'Unsourced' })
          ]);
          sel.value = c.status;
          sel.addEventListener('change', function () {
            S.setClaim(c.id, { status: sel.value });
            sel.className = 'st-sel ' + sel.value;
            GATE.driftCheck(id);
            paintClaims(); refreshCrits();
          });
          var src = el('input.q-input', { style: 'font-size:.8rem;padding:7px 9px;min-height:0', placeholder: 'Source — a URL, a document, or a named person and date', 'aria-label': 'Source for claim ' + c.id });
          src.value = c.source || '';
          src.addEventListener('input', function () { S.setClaim(c.id, { source: src.value }); });
          return el('div.claim-row', null, [
            el('div', null, [el('div.claim-t', { text: c.text }), el('div.claim-src', null, src)]),
            el('div.inline', { style: 'flex-direction:column;align-items:flex-end;gap:6px' }, [
              sel,
              el('button.icon-btn', {
                type: 'button', text: '×', title: 'Remove claim', 'aria-label': 'Remove claim',
                onclick: function () { S.removeClaim(c.id); paintClaims(); refreshCrits(); }
              })
            ])
          ]);
        }));
      }
      var add = el('input.q-input', { style: 'font-size:.85rem;min-height:0;margin-top:10px', placeholder: 'Add a claim this artifact asserts, then press Enter', 'aria-label': 'New claim' });
      add.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter' || !add.value.trim()) return;
        e.preventDefault();
        S.addClaim({ text: add.value.trim(), status: 'unsourced', artifactId: id });
        GATE.driftCheck(id);
        paintClaims(); refreshCrits();
      });
      append(claimsBox, add);
    }
    paintClaims();

    return col;
  }

  var refreshCrits = function () {};

  function critCol(hit) {
    var id = hit.artifact.id;
    var col = el('div.wb-col');
    var listBox = el('div.crits');
    var gateBox = el('div', { style: 'margin-top:18px' });

    function paint() {
      var crits = G.criteriaFor(id);
      var st = S.get().criteria;

      if (!crits.length) {
        mount(listBox, el('p.small.dimmed', { text: 'No criteria attach to this artifact — the diagnosis flags that as a gap.' }));
      } else {
        mount(listBox, crits.map(function (e) {
          var c = e.criterion;
          var cur = (st[c.id] && st[c.id].result) || null;

          function tick(label, val, cls) {
            return el('button.tick' + (cls ? '.' + cls : ''), {
              type: 'button', text: label,
              'aria-pressed': cur === val ? 'true' : 'false',
              'aria-label': label + ' — ' + c.text,
              onclick: function () {
                S.setCriterion(c.id, cur === val ? null : val);
                GATE.driftCheck(id);
                paint();
              }
            });
          }

          var actions = el('div.crit-actions', null, [
            tick('Y', 'pass'), tick('N', 'fail', 'no'), tick('W', 'waived', 'wv')
          ]);
          var row = R.criterionRow(c, { scope: e.scope, actions: actions, result: cur });

          if (c.kind === 'review') {
            var r = S.review(c.id);
            var box = el('div', { style: 'grid-column:1/-1;margin-top:8px' });
            var findings = el('textarea.q-input', {
              rows: 2, style: 'font-size:.82rem;min-height:0',
              placeholder: 'What did ' + R.personaName(c.persona) + ' find?',
              'aria-label': 'Findings from ' + R.personaName(c.persona)
            });
            findings.value = r.findings.join('\n');
            findings.addEventListener('input', function () {
              S.setReview(c.id, { persona: c.persona, findings: findings.value.split('\n').filter(Boolean) });
            });
            var res = el('select.st-sel', { 'aria-label': 'Resolution' }, [
              el('option', { value: '', text: 'Open' }),
              el('option', { value: 'resolved', text: 'Resolved' }),
              el('option', { value: 'conceded', text: 'Conceded' }),
              el('option', { value: 'accepted', text: 'Accepted with reason' })
            ]);
            res.value = r.resolution || '';
            res.addEventListener('change', function () {
              S.setReview(c.id, { persona: c.persona, resolution: res.value || null });
              GATE.driftCheck(id); paint();
            });
            append(box, [findings, el('div.inline', { style: 'margin-top:6px' }, [res])]);
            append(row, box);
          }

          if (c.test) {
            var auto = el('div', { style: 'grid-column:1/-1' });
            var out = GATE.autoEvaluate(c, id);
            if (out) {
              append(auto, el('p.small', {
                style: 'margin-top:6px;color:' + (out.result === 'pass' ? 'var(--teal)' : out.result === 'fail' ? 'var(--red)' : 'var(--dim)'),
                text: 'auto-test: ' + out.result + (out.note ? ' — ' + out.note : '')
              }));
            }
            append(row, auto);
          }
          return row;
        }));
      }
      paintGate();
    }

    function paintGate() {
      var art = S.artifact(id);
      var res = GATE.evaluate(id);

      var stages = el('div.stack', { style: 'gap:6px;margin-bottom:14px' }, res.stages.map(function (s) {
        return el('div.inline', { style: 'justify-content:space-between;gap:10px;font-size:.8rem' }, [
          el('span', { style: 'color:' + (s.ok ? 'var(--teal)' : 'var(--dim)'), text: (s.ok ? '✓ ' : '· ') + s.label }),
          el('span.dimmed.small', { style: 'text-align:right;flex:1', text: s.note })
        ]);
      }));

      var kids = [el('h4', { text: 'The Gate' }), stages];

      if (art.passport) {
        kids.push(el('div.passport', null, [
          el('div.pp-t', { text: 'Artifact passport' }),
          el('div.stamps', null, art.passport.stamps.map(function (s) { return el('span.stamp', { text: s }); })),
          el('div.pp-row', null, [el('span', { text: 'certified' }), el('span', { text: art.passport.at.slice(0, 16).replace('T', ' ') })]),
          el('div.pp-row', null, [el('span', { text: 'criteria' }), el('span', { text: String(art.passport.criteria.length) })]),
          el('div.pp-row', null, [el('span', { text: 'claims' }), el('span', { text: String(art.passport.claims.length) })]),
          el('div.pp-hash', { text: 'fingerprint ' + art.passport.evidenceHash + ' — ' + art.passport.note })
        ]));
        /* Promotion closes the loop: a certified artifact becomes a pattern the
           next engagement starts from. Client-identifying content is stripped —
           the hints travel, the answers do not. */
        kids.push(el('button.btn.ghost', {
          type: 'button', style: 'margin-top:10px', text: 'Promote to a pattern',
          title: 'Adds a reusable pattern to the library, with this artifact\'s criteria attached and its client content stripped.',
          onclick: function () {
            var src = w.CBS_PATTERN_BY_ID[hit.artifact.pattern];
            var promoted = {
              id: 'pat-promoted-' + hit.artifact.id,
              title: hit.artifact.title + ' (promoted)',
              lane: hit.artifact.lane,
              purpose: hit.artifact.outputs,
              sections: (art.draft.parts || []).map(function (part, i) {
                return {
                  h: part.h,
                  hint: (src && src.sections[i] && src.sections[i].hint) || 'Carried over from a certified artifact.',
                  fill: (src && src.sections[i] && src.sections[i].fill) || ''
                };
              }),
              criteria: G.criteriaFor(id).map(function (e) {
                return { id: 'promoted-' + e.criterion.id, kind: e.criterion.kind, text: e.criterion.text,
                         severity: e.criterion.severity, persona: e.criterion.persona };
              }),
              promotedFrom: hit.artifact.id
            };
            S.promotePattern(promoted);
            R.toast('Promoted — the body text was stripped, the shape and criteria travel');
          }
        }));
      } else {
        kids.push(el('button.btn', {
          type: 'button', text: res.ok ? 'Certify at the Gate' : 'Attempt certification',
          onclick: function () {
            var out = GATE.certify(id);
            if (out.ok) R.toast('Certified · fingerprint ' + out.passport.evidenceHash);
            else R.toast('Held at ' + out.reason.label + ': ' + out.reason.note);
            paint(); paintStatus(id);
          }
        }));
      }

      kids.push(el('button.btn.ghost', {
        type: 'button', style: 'margin-top:10px', text: 'Run auto-tests',
        onclick: function () {
          var out = GATE.runAutoCriteria();
          R.toast(out.applied + ' decided, ' + out.undecided + ' left for you');
          paint();
        }
      }));

      mount(gateBox, kids);
    }

    refreshCrits = paint;
    append(col, [el('h4', { text: 'Criteria' }), listBox, gateBox]);
    paint();
    return col;
  }

  /* ========================================================== 4. ROUTER */
  function go(hash) {
    if (w.location.hash === hash) route();
    else w.location.hash = hash;
  }

  function route() {
    var h = w.location.hash || '';
    if (h.indexOf('#wb/') === 0) { renderWorkbench(h.slice(4)); }
    else if (h === '#board') { renderBoard(); }
    else { renderCommission(); }
    w.scrollTo(0, 0);
    R.reveals(root);
  }

  function boot() {
    R.shell('build.html');
    root = R.$('#view');
    if (!S.intakeComplete() && !w.location.hash) w.location.hash = '#commission';
    w.addEventListener('hashchange', route);
    route();
    w.CBS_CONSOLE.init();
  }

  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window);
