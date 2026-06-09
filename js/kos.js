/* ===========================================================
   Keystone OS — Simulation Engine readout.
   Counts the run stats up and triggers the streaming console
   + certification bar when the panel scrolls into view.
   Reduced-motion / throttled-tab safe: snaps to final state.
   =========================================================== */
(function(){
  const sim = document.getElementById('kos-sim');
  if(!sim) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const stats = [...sim.querySelectorAll('.kos-sv')];
  const finalVal = el => (el.dataset.target||'0') + (el.dataset.suffix||'');

  function run(){
    sim.classList.add('kos-live');                       // fires the CSS console + cert animations
    const frozen = document.body.classList.contains('no-anim');
    if(reduce || frozen){ stats.forEach(el=> el.textContent = finalVal(el)); return; }
    stats.forEach(el=>{
      const t = parseFloat(el.dataset.target), suf = el.dataset.suffix||'';
      const st = performance.now(), dur = 1500; let done = false;
      (function step(now){
        let p = Math.min((now-st)/dur, 1); p = 1-Math.pow(1-p,3);
        el.textContent = Math.round(t*p) + suf;
        if(p<1) requestAnimationFrame(step); else { el.textContent = t+suf; done = true; }
      })(performance.now());
      setTimeout(()=>{ if(!done) el.textContent = t+suf; }, dur+600);   // rAF-frozen fallback
    });
  }

  let ran = false;
  const go = ()=>{ if(ran) return; ran = true; run(); };
  try{
    const obs = new IntersectionObserver(es=>es.forEach(e=>{ if(e.isIntersecting) go(); }), {threshold:.3});
    obs.observe(sim);
  }catch(e){ go(); }
  setTimeout(go, 2600);    // safety if the observer never fires
})();
