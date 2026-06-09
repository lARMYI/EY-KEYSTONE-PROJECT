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

  /* ---------- 3D tilt + glare on cards ---------- */
  document.querySelectorAll(TILT).forEach(card=>{
    if(getComputedStyle(card).position === 'static') card.style.position = 'relative';
    card.classList.add('tiltable');
    const glare = document.createElement('span');
    glare.className = 'tilt-glare';
    card.appendChild(glare);
    let raf = 0, rx = 0, ry = 0;
    card.addEventListener('pointermove', e=>{
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
    card.addEventListener('pointerleave', ()=>{
      card.style.transform = '';
      glare.style.opacity = '0';
    });
  });

  /* ---------- trailing cursor halo ---------- */
  const ring = document.createElement('div');
  ring.className = 'cursor-ring';
  document.body.appendChild(ring);
  let rx = innerWidth/2, ry = innerHeight/2, tx = rx, ty = ry, seen = false;
  addEventListener('pointermove', e=>{
    tx = e.clientX; ty = e.clientY;
    if(!seen){ seen = true; rx = tx; ry = ty; ring.style.opacity = '1'; }
  }, {passive:true});
  addEventListener('pointerdown', ()=> ring.classList.add('down'));
  addEventListener('pointerup', ()=> ring.classList.remove('down'));
  addEventListener('pointerleave', ()=> ring.style.opacity = '0');
  (function loop(){
    rx += (tx-rx)*0.2; ry += (ty-ry)*0.2;
    ring.style.transform = `translate(${rx}px,${ry}px) translate(-50%,-50%)`;
    requestAnimationFrame(loop);
  })();
  const hot = 'a,button,.btn,.chip,.lnode,.tier,'+TILT;
  document.querySelectorAll(hot).forEach(el=>{
    el.addEventListener('pointerenter', ()=> ring.classList.add('hot'));
    el.addEventListener('pointerleave', ()=> ring.classList.remove('hot'));
  });
})();
