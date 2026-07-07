/* ===========================================================
   Keystone Intelligence Layer — the executive command deck
   + the day-90 readiness board.
   One deterministic simulation, three lenses (Board / Risk /
   Delivery): KPI instruments with sparklines, a live signal
   feed, and a computed decision brief. Every number is either
   drawn from the page's own stated figures or clearly part of
   the labeled proving-ground simulation.
   Reduced-motion / throttled-tab safe: snaps to final state.
   =========================================================== */
(function(){
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const still = () => reduce || document.body.classList.contains('no-anim');

  /* deterministic pseudo-random for sparkline texture (fixed seed → same page every load) */
  function prng(seed){ let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function series(seed, base, drift, n){
    const r = prng(seed); const out = []; let v = base;
    for(let i = 0; i < n; i++){ v = Math.max(2, Math.min(24, v + (r() - 0.44) * drift)); out.push(v); }
    return out;
  }

  /* ---------------- the command deck ---------------- */
  const deck = document.getElementById('intel-deck');
  if(deck){
    const LENSES = {
      board: {
        kpis: [
          { v:12,           c:'Governed agents in the simulated proving ground', sp:series(11, 8, 8, 14) },
          { v:47, pre:'+', suf:'%', c:'Value vs manual baseline · in the 40–60% target band', sp:series(23, 9, 9, 14) },
          { v:100, suf:'%', c:'Evidence coverage',              sp:series(31, 19, 3, 14) },
          { v:4,  suf:'/6', c:'Day-90 gates green',             sp:series(47, 7, 7, 14) },
        ],
        feed: [
          ['ok','gate','2 agents certified this run · passports issued','now'],
          ['ok','baseline','third-party review cycle time −47% vs manual','2m'],
          ['warn','pipeline','target state: 2 lighthouse banks in named conversations · 1 LOI','9m'],
          ['ok','evidence','14,902 records sealed · lineage 100%','12m'],
          ['ok','decision','target state: 4 of 6 day-90 gates green · 2 open with owners','15m'],
        ],
        pool: [
          ['ok','marketplace','target state: 1 certified system listed for reuse'],
          ['ok','gate','re-certification cadence met · 12/12 in window'],
          ['warn','partner','target state: compute commitment · term sheet in legal review'],
        ],
        brief: 'In this authored day-90 replay, certification and measured value are live; the partner and bank commitments are the open gates. The instrument is the proposal — in production, every figure would trace to a sealed run.',
      },
      risk: {
        kpis: [
          { v:0,  c:'Red-team breaches',                sp:series(53, 5, 4, 14) },
          { v:9,  c:'Controls fired this run',          sp:series(61, 9, 8, 14) },
          { v:2,  c:'Open exceptions · owners assigned',sp:series(71, 8, 6, 14) },
          { v:0,  c:'Independence conflicts',           sp:series(83, 4, 3, 14) },
        ],
        feed: [
          ['block','independence','prohibited pairing attempted · BLOCKED at policy','now'],
          ['warn','drift.watch','KYC agent output variance +2.1σ · re-eval scheduled','1m'],
          ['ok','redteam#04','tool-misuse probe · CONTAINED · evidence sealed','4m'],
          ['warn','control.model-risk','fired · escalation routed to supervisor','7m'],
          ['ok','data.boundary','cross-tenant read attempt · HELD · lineage intact','11m'],
        ],
        pool: [
          ['ok','evidence.ledger','hash chain verified · 0 gaps'],
          ['block','policy.independence','restricted-use catalog match · BLOCKED'],
          ['ok','redteam#02','prompt-injection sweep · 128 probes · 0 breaches'],
        ],
        brief: 'In this replay, posture is defensible: zero breaches, zero independence conflicts, and both open exceptions are routed with owners. The proposal: supervision becomes continuous — the ledger watching, not a quarterly review.',
      },
      delivery: {
        kpis: [
          { v:500, c:'Synthetic customers in the simulated run', sp:series(91, 11, 9, 14) },
          { v:28,  c:'Primitives reused · Phase-1 target',       sp:series(101, 8, 8, 14) },
          { v:44, pre:'−', suf:'%', c:'Cycle time vs baseline · in the 40–60% target band', sp:series(113, 9, 8, 14) },
          { v:61,  c:'Supervisors trained · Phase-1 target',     sp:series(127, 7, 7, 14) },
        ],
        feed: [
          ['ok','assembly','target state: primitive reused: eval-harness v3 · build −12 days','now'],
          ['ok','workflow.kyc','132 simulated cases cleared inside approved lanes','3m'],
          ['warn','workflow.tprm','1 case escalated to human supervisor · in lane','6m'],
          ['ok','capability','target state: 12 supervisors certified on governed ops','10m'],
          ['ok','graduation','target state: 1 system componentized for the library','14m'],
        ],
        pool: [
          ['ok','assembly','target state: control-pack template reused · config only'],
          ['ok','workflow.reg-report','target state: draft filed for supervisor review'],
          ['warn','capacity','target state: FDT#2 at 85% allocation · hiring gate open'],
        ],
        brief: 'This room rehearses what comes after a yes: if day 90 scales, reused primitives and trained supervisors are what the ledger must show by Phase 1. The claim being tested — the second engagement is faster than the first.',
      },
    };

    const kpisEl  = document.getElementById('intelKpis');
    const feedEl  = document.getElementById('intelFeed');
    const briefEl = document.getElementById('intelBriefText');
    const tabs    = [...deck.querySelectorAll('.intel-lens')];
    let current = 'board', seen = false, vis = false, rotTimer = 0, rotIdx = 0;

    function sparkSVG(svg, pts){
      const W = 100, H = 26, step = W / (pts.length - 1);
      const xy = pts.map((v, i) => (i * step).toFixed(1) + ',' + (H - v).toFixed(1));
      svg.innerHTML =
        '<polyline class="ik-area" points="0,' + H + ' ' + xy.join(' ') + ' ' + W + ',' + H + '"/>' +
        '<polyline class="ik-line" points="' + xy.join(' ') + '"/>';
    }
    function countUp(el){
      const t = parseFloat(el.dataset.target), pre = el.dataset.prefix || '', suf = el.dataset.suffix || '';
      const fin = () => { el.textContent = pre + t + suf; };
      if(still()){ fin(); return; }
      const st = performance.now(), dur = 850; let done = false;
      (function step(now){
        let p = Math.min((now - st) / dur, 1); p = 1 - Math.pow(1 - p, 3);
        el.textContent = pre + Math.round(t * p) + suf;
        if(p < 1) requestAnimationFrame(step); else { done = true; fin(); }
      })(performance.now());
      setTimeout(() => { if(!done) fin(); }, dur + 500);
    }
    function sigRow(s, animate){
      const d = document.createElement('div');
      d.className = 'intel-sig' + (animate ? ' pre' : '');
      d.innerHTML = '<i class="sd"></i><span class="ss"></span><span class="sm"></span><span class="st2"></span>';
      d.querySelector('.sd').classList.add(s[0]);
      d.querySelector('.ss').textContent = s[1];
      d.querySelector('.sm').textContent = s[2];
      d.querySelector('.st2').textContent = s[3] || 'now';
      return d;
    }
    function render(lens, animate){
      const L = LENSES[lens];
      /* KPIs */
      kpisEl.innerHTML = '';
      L.kpis.forEach(k => {
        const d = document.createElement('div'); d.className = 'intel-kpi';
        const v = document.createElement('div'); v.className = 'ik-v';
        v.dataset.target = k.v; if(k.pre) v.dataset.prefix = k.pre; if(k.suf) v.dataset.suffix = k.suf;
        v.textContent = '0';
        const c = document.createElement('div'); c.className = 'ik-c'; c.textContent = k.c;
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', 'ik-spark'); svg.setAttribute('viewBox', '0 0 100 26');
        svg.setAttribute('preserveAspectRatio', 'none'); svg.setAttribute('aria-hidden', 'true');
        sparkSVG(svg, k.sp);
        d.appendChild(v); d.appendChild(c); d.appendChild(svg); kpisEl.appendChild(d);
        if(animate) countUp(v); else v.textContent = (k.pre || '') + k.v + (k.suf || '');
      });
      /* feed */
      feedEl.innerHTML = '';
      L.feed.forEach((s, i) => {
        const row = sigRow(s, animate && !still());
        feedEl.appendChild(row);
        if(animate && !still()) setTimeout(() => row.classList.remove('pre'), 90 + i * 140);
      });
      /* brief */
      briefEl.textContent = L.brief;
      rotIdx = 0;
    }
    function rotate(){
      if(still() || !seen || !vis) return;
      const L = LENSES[current];
      const s = L.pool[rotIdx % L.pool.length]; rotIdx++;
      const row = sigRow([s[0], s[1], s[2], 'now'], true);
      feedEl.appendChild(row);
      requestAnimationFrame(() => row.classList.remove('pre'));
      while(feedEl.children.length > 6) feedEl.removeChild(feedEl.firstChild);
    }
    function setLens(lens){
      if(!LENSES[lens]) return;
      current = lens;
      tabs.forEach(t => {
        const on = t.dataset.lens === lens;
        t.classList.toggle('on', on);
        t.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      render(lens, seen);
    }
    tabs.forEach(t => t.addEventListener('click', () => setLens(t.dataset.lens)));

    /* first activation on scroll-into-view; static render as safety */
    render('board', false);
    const go = () => { if(seen) return; seen = true; render(current, true);
      /* arm unconditionally except for immutable reduced-motion — rotate()
         self-gates per tick, so rotation resumes if a frozen tab recovers */
      if(!reduce) rotTimer = setInterval(rotate, 5200); };
    let obsAlive = false;
    try{
      const obs = new IntersectionObserver(es => es.forEach(e => {
        obsAlive = true;
        vis = e.isIntersecting;
        if(vis) go();
      }), { threshold: .25 });
      obs.observe(deck);
    }catch(e){ vis = true; go(); }
    /* safety: if the observer never reported at all (frozen tab), render anyway */
    setTimeout(() => { if(!obsAlive && !seen){ vis = true; go(); } }, 3200);
  }

  /* ---------------- the day-90 readiness board ---------------- */
  const board = document.getElementById('ready');
  if(board){
    const rows = [...board.querySelectorAll('.ready-row')];
    const verdict = document.getElementById('readyVerdict');
    const meter = [...verdict.querySelectorAll('.rv-meter i')];
    const rvCount = document.getElementById('rvCount');
    const rvText = document.getElementById('rvText');

    function judge(){
      const n = rows.filter(r => r.classList.contains('on')).length;
      rvCount.textContent = n + '/6';
      meter.forEach((seg, i) => seg.classList.toggle('lit', i < n));
      verdict.classList.remove('rv-scale', 'rv-hold', 'rv-stop');
      if(n === 6){ verdict.classList.add('rv-scale');
        rvText.textContent = 'SCALE — the proof is on the board. Open Phase 1: the Banking Proving Ground.'; }
      else if(n >= 4){ verdict.classList.add('rv-hold');
        rvText.textContent = 'HOLD — close the open gates before capital scales. Each open line gets an owner and a date.'; }
      else if(n >= 1){ verdict.classList.add('rv-stop');
        rvText.textContent = 'STOP — the proof is not there. EY keeps the Gate IP, the control models, and the playbooks, and walks away whole.'; }
      else { rvText.textContent = 'Six gates. The decision reads itself off the board.'; }
    }
    const pb = document.getElementById('printBrief');
    if(pb) pb.addEventListener('click', () => { try{ window.print(); }catch(e){} });

    rows.forEach(r => {
      r.setAttribute('role', 'switch');
      r.setAttribute('tabindex', '0');
      r.setAttribute('aria-checked', 'false');
      /* accessible name comes from the row's own contents (title + detail) — no aria-label override */
      const toggle = () => {
        const on = r.classList.toggle('on');
        r.setAttribute('aria-checked', on ? 'true' : 'false');
        r.querySelector('.rr-s').textContent = on ? 'Yes' : 'Open';
        judge();
      };
      r.addEventListener('click', toggle);
      r.addEventListener('keydown', e => { if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); toggle(); } });
    });
    judge();
  }
})();
