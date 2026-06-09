(function(){
const C={gold:'#E9B84A',blue:'#5B97FF',teal:'#37D6B2',red:'#FF6B6B',violet:'#B498FF'};
  const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer=window.matchMedia('(pointer:fine)').matches;
  document.body.classList.add('js');

  /* ===== ANIMATION HEALTH FALLBACK =====
     If the document timeline never advances (background/throttled tab),
     CSS animations & transitions stay frozen and IntersectionObservers
     may never fire, so content (incl. JS-driven counters) would be
     invisible. Detect that and force everything to its end-state. */
  (function animHealth(){
    setTimeout(()=>{
      const t=document.timeline.currentTime;
      if(typeof t==='number'&&t>0) return; // healthy
      document.body.classList.add('no-anim');
      document.querySelectorAll('.reveal').forEach(e=>e.classList.add('in'));
      document.querySelectorAll('.nc .v,.a3 .v').forEach(v=>{
        if(v.dataset.target&&!v.textContent) v.textContent=(v.dataset.prefix||'')+v.dataset.target+(v.dataset.suffix||'');
      });
    },1400);
    /* recovery: if the document timeline starts advancing again (tab un-throttled),
       drop the no-anim fallback so transitions and streaming come back */
    let _tlLast=document.timeline.currentTime||0;
    setInterval(()=>{
      const t=document.timeline.currentTime||0;
      if(t>_tlLast && document.body.classList.contains('no-anim')) document.body.classList.remove('no-anim');
      _tlLast=t;
    },2000);
  })();

  /* ===== KINETIC HEADLINE TIMING ===== */
  document.querySelectorAll('.hero-title .line').forEach((line,li)=>{
    line.querySelectorAll('.word').forEach((w,wi)=>{
      w.style.setProperty('--wd',(0.4 + li*0.16 + wi*0.075)+'s');
    });
  });

  /* ===== HERO ARCHITECTURE (the keystone arch, drawn) ===== */
  (function buildArch(){
    const host=document.getElementById('heroArch'); if(!host) return;
    const W=1000,H=600,cx=500,spring=470;
    const ri=300, rm=330, ro=362;
    const arc=(r)=>{let p=[];const N=72;for(let i=0;i<=N;i++){const a=Math.PI-(i/N)*Math.PI;p.push((cx+r*Math.cos(a)).toFixed(1)+' '+(spring-r*Math.sin(a)).toFixed(1));}return 'M'+p.join(' L');};
    let s='';
    s+=`<defs>
      <linearGradient id="archgrad" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0" stop-color="rgba(233,184,74,.04)"/>
        <stop offset=".55" stop-color="rgba(233,184,74,.5)"/>
        <stop offset="1" stop-color="rgba(251,217,140,.95)"/>
      </linearGradient>
      <radialGradient id="keyglow"><stop offset="0" stop-color="rgba(233,184,74,.5)"/><stop offset="1" stop-color="rgba(233,184,74,0)"/></radialGradient>
    </defs>`;
    s+=`<circle class="aglow" cx="${cx}" cy="${spring-ro+30}" r="180" fill="url(#keyglow)"/>`;
    [[ro,.18,0],[rm,.34,.18],[ri,.6,.36]].forEach(([r,o,d])=>{ s+=`<path class="ring" d="${arc(r)}" pathLength="1" style="opacity:${o};animation-delay:${d}s"/>`; });
    [cx-ro,cx-ri,cx+ri,cx+ro].forEach(x=>{ s+=`<line class="ring" x1="${x}" y1="${spring}" x2="${x}" y2="${H}" pathLength="1" style="opacity:.32;animation-delay:.55s"/>`; });
    s+=`<line class="ring" x1="${cx-ro}" y1="${spring}" x2="${cx+ro}" y2="${spring}" pathLength="1" style="opacity:.22;animation-delay:.65s"/>`;
    [32,57,80,100,123,148].forEach((deg,i)=>{const a=deg*Math.PI/180;s+=`<line class="tick" x1="${(cx+ri*Math.cos(a)).toFixed(1)}" y1="${(spring-ri*Math.sin(a)).toFixed(1)}" x2="${(cx+ro*Math.cos(a)).toFixed(1)}" y2="${(spring-ro*Math.sin(a)).toFixed(1)}" style="animation-delay:${1.7+i*.05}s"/>`;});
    const top=spring-ro,bot=spring-ri,kw=36,kwb=27;
    s+=`<polygon class="key" points="${cx-kw},${top} ${cx+kw},${top} ${cx+kwb},${bot} ${cx-kwb},${bot}"/>`;
    host.innerHTML=`<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMax meet">${s}</svg>`;
  })();

  /* ===== HERO PARTICLE FIELD ===== */
  (function heroFx(){
    const cv=document.getElementById('heroFx'); if(!cv||reduce) return;
    const ctx=cv.getContext('2d'); const dpr=Math.min(devicePixelRatio||1,2);
    let w=0,h=0,parts=[],raf=0,vis=true;
    function resize(){const r=cv.getBoundingClientRect();w=cv.width=Math.max(1,r.width*dpr);h=cv.height=Math.max(1,r.height*dpr);}
    function seed(){const n=Math.round(Math.min(56,w/dpr/26));parts=[];for(let i=0;i<n;i++)parts.push({x:Math.random()*w,y:Math.random()*h,r:(Math.random()*1.6+.4)*dpr,v:(Math.random()*.18+.05)*dpr,a:Math.random()*.5+.12,tw:Math.random()*Math.PI*2});}
    function draw(){ctx.clearRect(0,0,w,h);for(const p of parts){p.y-=p.v;p.tw+=.02;if(p.y<-6){p.y=h+6;p.x=Math.random()*w;}const fl=p.a*(0.6+0.4*Math.sin(p.tw));ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,7);ctx.fillStyle='rgba(233,184,74,'+fl.toFixed(3)+')';ctx.shadowBlur=6*dpr;ctx.shadowColor='rgba(233,184,74,.6)';ctx.fill();}ctx.shadowBlur=0;raf=requestAnimationFrame(draw);}
    resize();seed();draw();
    addEventListener('resize',()=>{cancelAnimationFrame(raf);resize();seed();draw();},{passive:true});
    new IntersectionObserver(es=>{es.forEach(e=>{vis=e.isIntersecting;if(vis){if(!raf)raf=requestAnimationFrame(draw);}else{cancelAnimationFrame(raf);raf=0;}});}).observe(cv);
  })();

  /* ===== CURSOR SPOTLIGHT + PARALLAX ===== */
  let mxT=innerWidth/2,myT=innerHeight*0.4;
  if(finePointer && !reduce){
    document.body.classList.add('has-pointer');
    addEventListener('pointermove',e=>{
      mxT=e.clientX;myT=e.clientY;
      document.body.style.setProperty('--mx',e.clientX+'px');
      document.body.style.setProperty('--my',e.clientY+'px');
    },{passive:true});
  }
  const heroArchEl=document.getElementById('heroArch');
  const heroInnerEl=document.querySelector('.hero .inner');
  function heroParallax(){
    const y=scrollY, vh=innerHeight;
    if(y<vh*1.1 && heroArchEl){
      const mx=(mxT/innerWidth-0.5);
      heroArchEl.style.transform=`translateX(calc(-50% + ${mx*18}px)) translateY(${y*-0.10}px)`;
      if(heroInnerEl){heroInnerEl.style.transform=`translateY(${y*0.16}px)`;heroInnerEl.style.opacity=Math.max(0,1-y/(vh*0.78));}
    }
    rafP=0;
  }
  let rafP=0;
  addEventListener('scroll',()=>{if(!rafP)rafP=requestAnimationFrame(heroParallax);},{passive:true});
  if(finePointer&&!reduce)addEventListener('pointermove',()=>{if(!rafP)rafP=requestAnimationFrame(heroParallax);},{passive:true});

  /* FROM->TO */
  const FT=[['What we build','Projects and point solutions','Products: foundational agentic systems'],
    ['Leverage','Labor leverage \u2014 hours and headcount','System leverage \u2014 governed, reusable capacity'],
    ['What clients get','Time and decks','Governed systems and reusable capability'],
    ['How we scale','Add headcount, linear','Reuse governed primitives, compounding'],
    ['The org','Pyramid of manual juniors','Diamond of agent supervisors'],
    ['The moat','Brand and relationships','The governed systems layer big tech cannot build alone'],
    ['Independence','Managed after the fact','Engineered into every system at the Gate']];
  document.getElementById('ft').innerHTML=FT.map((r,i)=>`<div class="ftrow reveal" style="--d:${i*.06}s"><div class="from"><span class="l">From</span>${r[1]}</div><div class="arr">→</div><div class="to"><span class="l">${r[0]} · to</span>${r[2]}</div></div>`).join('');

  /* ZONES */
  const Z=[
    {i:'F',n:'The Frontier',r:'Futures & R&D',c:C.gold,p:'Early access to frontier models and hardware through partners. Horizon scanning by a small frontier research cell. Next-gen prototypes before they are systems. Where the future gets built first.'},
    {i:'S',n:'The Proving Ground',r:'Governed experimentation',c:C.blue,p:'A compliant environment where client teams, banking first, experiment with agents on synthetic or governed data with zero production risk. The regulated AI proving ground.'},
    {i:'B',n:'The Systems Assembly',r:'Co-build',c:C.teal,p:'Forward deployed teams and client teams turn frontier capability into reusable governed systems: control planes, routers, primitives. Where experiments become infrastructure.'},
    {i:'G',n:'The Gate',r:'Certification',c:C.red,p:'The Keystone Gate. Identity, attestation, independence, red-team. Nothing leaves the Lab without being certified for regulated enterprise operation. The trust spine.'},
    {i:'→',n:'Graduation',r:'To the business',c:C.violet,p:'Certified, gate-passed systems graduate to the marketplace, into EY delivery, and into the AI-native operating model.'}];
  document.getElementById('zones').innerHTML=Z.map((z,i)=>`<div class="zone reveal" style="--zc:${z.c};--d:${i*.05}s"><div class="zi">${z.i}</div><div><div class="zn">${z.n}</div><div class="zr">${z.r}</div><p>${z.p}</p></div></div>`).join('');

  /* PARTNERS */
  const P=[['NVIDIA','The agentic platform spine: EY.ai Agentic Platform, AI-Q Blueprints, reasoning models, compute. On-prem via the Dell AI Factory.'],
    ['Microsoft','The Azure data plane and the Copilot surface. EY is a repeat Microsoft partner-award winner.'],
    ['Dell','On-prem AI Factory for regulated and sovereign clients: EY.ai enterprise private.'],
    ['CrowdStrike','The Agentic SOC: security at machine speed for the Lab and its tenants.'],
    ['Model providers','A fit-for-purpose catalog: Anthropic, OpenAI, Google, and open weights, chosen per workload.'],
    ['EY.ai platform','The connective tissue: EYQ reaches 300k+ professionals and becomes the marketplace for graduates.']];
  document.getElementById('partners-grid').innerHTML=P.map((p,i)=>`<div class="pc reveal" style="--d:${i*.05}s"><div class="pn">${p[0]}</div><p>${p[1]}</p></div>`).join('');

  /* TIERS */
  const T=[['Explorer','Proving-ground access for client teams to test and experiment safely.','Experiment',C.blue],
    ['Resident','Embed with a forward deployed team to co-build a specific governed system.','Co-build',C.teal],
    ['Production','Deploy the certified system live in the regulated environment.','Operate',C.gold],
    ['Marketplace','Reuse the certified system across the network, everywhere it fits.','Reuse',C.violet]];
  document.getElementById('tiers').innerHTML=T.map((t,i)=>`<div class="tier reveal" style="--tc:${t[3]};--d:${i*.07}s"><div class="tnum">${i+1}</div><div><div class="tn">${t[0]}</div><div class="td">${t[1]}</div></div><div class="tm">${t[2]}</div></div>`).join('');

  /* PIPE */
  const PIPE=[['Stage 1','Frontier prototype','Built on early partner access'],['Stage 2','Sandbox experiment','Tested on governed data'],['Stage 3','Assembly co-build','Hardened to product standard'],['Stage 4','Gate clearance','Governance, attestation, red-team'],['Stage 5','Graduation','Marketplace + delivery + library']];
  document.getElementById('pipe').innerHTML=PIPE.map(p=>`<div class="pst"><div class="s">${p[0]}</div><b>${p[1]}</b><span>${p[2]}</span></div>`).join('');
  const SYS=['Agent Identity System','Agentic Control Plane','Model Routing Layer','Evaluation &amp; Simulation Harness','Tool Governance Framework','Evidence &amp; Attestation Ledger','Human-Agent Workflow Engine','Independence &amp; Conflict Engine'];
  const DEMO=['AI Control Testing','KYC / AML Review','Regulatory Reporting','Agentic SOC','Tax Provision Review','Credit Risk Analysis'];
  document.getElementById('chips').innerHTML=
    `<div class="chipgrp"><div class="chl">Foundational systems · the real product</div><div class="chrow">`+SYS.map(c=>`<span class="chip sys">${c}</span>`).join('')+`</div></div>`+
    `<div class="chipgrp"><div class="chl">Industry demonstrators · the first proving grounds</div><div class="chrow">`+DEMO.map(c=>`<span class="chip">${c}</span>`).join('')+`</div></div>`;

  /* FLYWHEEL */
  const FW=[['EY owns and builds the Lab','EY\u2019s strategic commitment owns the asset and the governance spine.'],
    ['Big tech contributes the frontier','Compute, models, hardware, and embedded engineers, contributed not sold.'],
    ['The market puts it to work','Banks and other regulated enterprises test, co-build, and deploy on it.'],
    ['Their data sharpens the systems','Use cases and governed data make every system better; FDTs co-build.'],
    ['Systems clear the Gate','Identity, attestation, independence, red-team. Only the certified leave.'],
    ['EY becomes AI-native','Embedding the systems changes EY\u2019s people, process, and tech. EY runs on what it builds.'],
    ['It compounds into the next frontier','Every governed system makes the next one faster to build.']];
  const ring=document.getElementById('ring'),fwnum=document.getElementById('fwnum'),N=FW.length,R=130;
  FW.forEach((s,i)=>{const a=(i/N)*2*Math.PI - Math.PI/2;const x=180+R*Math.cos(a),y=180+R*Math.sin(a);
    const c=document.createElementNS('http://www.w3.org/2000/svg','circle');c.setAttribute('cx',x);c.setAttribute('cy',y);c.setAttribute('r',13);c.setAttribute('class','fnode');c.dataset.i=i;ring.appendChild(c);});
  document.getElementById('fwsteps').innerHTML=FW.map((s,i)=>`<div class="fwstep dim" data-i="${i}"><div class="si">Step ${i+1} of ${N}</div><h3>${s[0]}</h3><p>${s[1]}</p></div>`).join('');
  function setFW(i){
    ring.style.transform='rotate('+(-(i/N)*360)+'deg)';
    fwnum.textContent=i+1;
    document.querySelectorAll('.fnode').forEach(n=>n.classList.toggle('active',+n.dataset.i===i));
    document.querySelectorAll('.fwstep').forEach(s=>s.classList.toggle('dim',+s.dataset.i!==i));
  }
  setFW(0);
  /* deterministic: the step whose centre is nearest the viewport middle is active,
     so the number, ring rotation, lit node and text can never disagree */
  const fwSteps=[...document.querySelectorAll('.fwstep')];
  let fwCur=-1;
  function fwUpdate(){
    const mid=innerHeight*0.5; let best=0,bestD=Infinity;
    for(let i=0;i<fwSteps.length;i++){
      const r=fwSteps[i].getBoundingClientRect();
      const d=Math.abs((r.top+r.height/2)-mid);
      if(d<bestD){bestD=d;best=i;}
    }
    if(best!==fwCur){fwCur=best;setFW(best);}
  }
  addEventListener('scroll',fwUpdate,{passive:true});
  addEventListener('resize',fwUpdate,{passive:true});
  fwUpdate();

  /* REVEAL */
  const rObs=new IntersectionObserver(es=>{es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');rObs.unobserve(e.target);}});},{threshold:.15});
  document.querySelectorAll('.reveal').forEach(el=>rObs.observe(el));

  /* COUNTERS */
  function count(el){const tg=parseFloat(el.dataset.target),pre=el.dataset.prefix||'',suf=el.dataset.suffix||'';
    const final=()=>{el.textContent=pre+tg+suf;};
    if(reduce||document.body.classList.contains('no-anim')){final();return;}
    const st=performance.now(),dur=1500;let done=false;
    function step(now){let p=Math.min((now-st)/dur,1);p=1-Math.pow(1-p,3);let v=tg*p;v=Number.isInteger(tg)?Math.round(v):Math.round(v*10)/10;el.textContent=pre+v+suf;if(p<1)requestAnimationFrame(step);else{done=true;final();}}
    requestAnimationFrame(step);
    setTimeout(()=>{if(!done)final();},2200);}
  const cObs=new IntersectionObserver(es=>{es.forEach(e=>{if(e.isIntersecting){count(e.target);cObs.unobserve(e.target);}});},{threshold:.5});
  document.querySelectorAll('.nc .v').forEach(v=>cObs.observe(v));

  /* SCROLL: progress + nav */
  const prog=document.getElementById('progress'),nav=document.getElementById('nav');
  function onScroll(){const h=document.documentElement.scrollHeight-innerHeight;prog.style.width=(scrollY/h*100)+'%';nav.classList.toggle('scrolled',scrollY>40);}
  addEventListener('scroll',onScroll,{passive:true});onScroll();

  /* MAGNETIC BUTTONS */
  if(!reduce){document.querySelectorAll('.magnetic').forEach(b=>{
    b.addEventListener('mousemove',e=>{const r=b.getBoundingClientRect();b.style.transform='translate('+((e.clientX-r.left-r.width/2)*.25)+'px,'+((e.clientY-r.top-r.height/2)*.35)+'px)';});
    b.addEventListener('mouseleave',()=>b.style.transform='');});}

  /* PROGRESSIVE DISCLOSURE: click-to-pin for OS stack + risk matrix */
  document.querySelectorAll('.kos-stack .kos-layer, .matrix .mrow').forEach(el=>{
    el.setAttribute('tabindex','0');
    el.setAttribute('role','button');
    el.setAttribute('aria-expanded','false');
    const t=()=>{ const o=el.classList.toggle('open'); el.setAttribute('aria-expanded',o?'true':'false'); };
    el.addEventListener('click',t);
    el.addEventListener('keydown',e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); t(); } });
  });
})();