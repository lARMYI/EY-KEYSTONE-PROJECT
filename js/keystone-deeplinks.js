/* ===========================================================
   Keystone deep-links — injects a contextual "go deeper" button
   into each pitch section, pointing at the matching in-depth area
   of the AI-native roadmap supplement. Each link carries ?from=<id>
   so the destination can offer a one-click route back to exactly
   the section the reader came from.

   Loaded on index.html only. Self-contained; runs after the DOM
   is parsed (it is included at the end of <body>).
   =========================================================== */
(function(){
  'use strict';

  /* section id -> { href, label } for the deeper area */
  const MAP = {
    /* Part 1 — why now / what changes */
    whynow:   {href:'roadmap.html',                 label:'Becoming AI-native — the roadmap'},
    thesis:   {href:'roadmap.html#whatai',          label:'What AI-native actually means'},
    /* Part 2 — what Keystone is + the deep dives */
    keystone: {href:'maturity.html',                label:'The seven pillars, charted'},
    lab:      {href:'maturity.html#pillar-lab',     label:'The Lab — today → +3 years'},
    build:    {href:'maturity.html#pillar-people',  label:'Workforce — pyramid → diamond'},
    keystoneos:{href:'maturity.html#pillar-os',     label:'Keystone OS — today → +3 years'},
    truth:    {href:'maturity.html#pillar-truth',   label:'The Truth Layer — today → +3 years'},
    trust:    {href:'maturity.html#pillar-gate',    label:'The Gate — today → +3 years'},
    /* Part 3 — what it proves first */
    lighthouse:{href:'maturity.html#pillar-ground', label:'Proving Grounds — today → +3 years'},
    products: {href:'maturity.html#pillar-lab',     label:'Frontier → system, charted'},
    /* Part 4 — why EY can win */
    model:    {href:'maturity.html#pillar-econ',    label:'The economics — today → +3 years'},
    partners: {href:'maturity.html#pillar-econ',    label:'Co-build & the operating model'},
    adoption: {href:'maturity.html#pillar-econ',    label:'Market model — today → +3 years'},
    /* Part 5 — why John */
    whyjohn:  {href:'quarters.html',                label:'The twelve-quarter plan he would run'},
    /* Part 6 — the 90-day proof */
    decision: {href:'quarters.html#plan',           label:'Where day 90 leads — quarter by quarter'},
    /* Part 7 — the scale path */
    ask:      {href:'quarters.html',                label:'The full twelve-quarter plan'},
    nolose:   {href:'roadmap.html#scorecard',       label:'How we measure success'},
    flywheel: {href:'roadmap.html#ladder',          label:'How maturity compounds — L0 → L5'},
    shape:    {href:'roadmap.html#horizons',        label:'Today, +12 months, +3 years'}
  };

  function withFrom(href,id){
    const hash = href.indexOf('#');
    return hash>-1
      ? href.slice(0,hash)+'?from='+id+href.slice(hash)
      : href+'?from='+id;
  }

  function run(){
    Object.keys(MAP).forEach(id=>{
      const sec=document.getElementById(id);
      if(!sec || sec.querySelector('.deepdive')) return;
      const host=sec.querySelector('.wrap')||sec;
      const m=MAP[id];
      const div=document.createElement('div');
      div.className='deepdive';
      const a=document.createElement('a');
      a.className='btn ghost magnetic';
      a.href=withFrom(m.href,id);
      a.innerHTML=m.label+' <span class="dl-ar" aria-hidden="true">→</span>';
      div.innerHTML='<span class="dl-k">Go deeper</span>';
      div.appendChild(a);
      host.appendChild(div);
    });
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',run);
  else run();
})();
