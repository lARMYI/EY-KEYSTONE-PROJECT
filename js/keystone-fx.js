/* ===========================================================
   Keystone FX — micro-interactions: 3D card tilt + glare,
   a trailing cursor halo, and interactive-hover feedback.
   All gated on a fine pointer + no reduced-motion.
   =========================================================== */
(function(){
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = matchMedia('(pointer: coarse)').matches;
  if(reduce || coarse) return;

  const TILT = '.inp,.pc,.lhc,.nl,.peer,.a3,.gb,.nc,.vscard';

  const isMouse = e => !e.pointerType || e.pointerType === 'mouse' || e.pointerType === 'pen';

  /* ---------- 3D tilt + glare on cards ---------- */
  document.querySelectorAll(TILT).forEach(card=>{
    if(getComputedStyle(card).position === 'static') card.style.position = 'relative';
    // add the .tiltable transition override lazily, on first hover — by then the
    // one-time .reveal fade/stagger has finished, so the override can't clobber it
    card.addEventListener('pointerenter', ()=> card.classList.add('tiltable'), {once:true});
    const glare = document.createElement('span');
    glare.className = 'tilt-glare';
    card.appendChild(glare);
    let raf = 0, rx = 0, ry = 0;
    card.addEventListener('pointermove', e=>{
      if(!isMouse(e)) return;                       // touch/scroll must not drive the tilt
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left)/r.width - 0.5;
      const py = (e.clientY - r.top)/r.height - 0.5;
      rx = py * -5.5; ry = px * 5.5;
      glare.style.setProperty('--gx', ((px+0.5)*100)+'%');
      glare.style.setProperty('--gy', ((py+0.5)*100)+'%');
      if(!raf) raf = requestAnimationFrame(()=>{
        card.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-6px)`;
        glare.style.opacity = '1';
        raf = 0;
      });
    });
    const clear = ()=>{
      if(raf){ cancelAnimationFrame(raf); raf = 0; }  // cancel a queued frame so it can't re-apply a stale tilt after leave
      card.style.transform = '';
      glare.style.opacity = '0';
    };
    card.addEventListener('pointerleave', clear);
    card.addEventListener('pointercancel', clear);    // touch-scroll takeover suppresses pointerleave
  });

  /* ---------- trailing cursor halo ---------- */
  const ring = document.createElement('div');
  ring.className = 'cursor-ring';
  document.body.appendChild(ring);
  let rx = innerWidth/2, ry = innerHeight/2, tx = rx, ty = ry, seen = false, hraf = 0;
  function loop(){
    const dx = tx - rx, dy = ty - ry;
    if(Math.abs(dx) + Math.abs(dy) < 0.1){          // converged → settle and stop scheduling (loop idles when the pointer is still)
      rx = tx; ry = ty;
      ring.style.transform = `translate(${rx}px,${ry}px) translate(-50%,-50%)`;
      hraf = 0; return;
    }
    rx += dx*0.2; ry += dy*0.2;
    ring.style.transform = `translate(${rx}px,${ry}px) translate(-50%,-50%)`;
    hraf = requestAnimationFrame(loop);
  }
  addEventListener('pointermove', e=>{
    if(!isMouse(e)) return;                          // don't summon the halo for touch
    tx = e.clientX; ty = e.clientY;
    if(!seen){ seen = true; rx = tx; ry = ty; }
    ring.style.opacity = '1';                        // re-show on every move — hide() (blur/leave/cancel) can fire repeatedly
    if(!hraf) hraf = requestAnimationFrame(loop);
  }, {passive:true});
  addEventListener('pointerdown', e=>{ if(isMouse(e)) ring.classList.add('down'); });
  addEventListener('pointerup', ()=> ring.classList.remove('down'));
  const hide = ()=>{ ring.style.opacity = '0'; };
  document.addEventListener('pointerleave', hide);   // pointer leaves the document (mouse out of window) — pointerleave doesn't bubble, so bind on document
  addEventListener('pointercancel', hide);
  addEventListener('blur', hide);
  const hot = 'a,button,.btn,.chip,.lnode,.tier,'+TILT;
  document.querySelectorAll(hot).forEach(el=>{
    el.addEventListener('pointerenter', e=>{ if(isMouse(e)) ring.classList.add('hot'); });
    el.addEventListener('pointerleave', ()=> ring.classList.remove('hot'));
  });
})();
