/* ===========================================================
   Keystone 3D — the SPINE.
   One keystone object, fixed behind all content, that morphs
   through the argument as you scroll:
     hero (whole)  ->  #model (splits into 3 sides)
     ->  #flywheel (becomes the spinning hub + satellites)
     ->  #trust (reassembles inside the Gate frame)
     ->  #cta (seals, front-facing, glowing — the passport)
   Progressive enhancement: no THREE / WebGL => SVG arch remains.
   =========================================================== */
(function(){
  const canvas = document.getElementById('hero3d');
  if(!canvas || !window.THREE) return;
  try{ const t = canvas.getContext('webgl') || canvas.getContext('experimental-webgl'); if(!t) return; }
  catch(e){ return; }

  const THREE = window.THREE;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = matchMedia('(pointer: coarse)').matches;

  let renderer;
  // no preserveDrawingBuffer: nothing reads the canvas back (no toDataURL/readPixels),
  // and it forces a full-screen framebuffer copy every frame — pure GPU cost.
  try{ renderer = new THREE.WebGLRenderer({ canvas, alpha:true, antialias:true }); }
  catch(e){ return; }
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  if('outputEncoding' in renderer) renderer.outputEncoding = THREE.sRGBEncoding;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
  camera.position.set(0, 0, 8);

  /* ---- procedural studio env so the metal reads as gold ---- */
  function makeEnv(){
    const c = document.createElement('canvas'); c.width = 512; c.height = 256;
    const x = c.getContext('2d');
    const g = x.createLinearGradient(0,0,0,256);
    g.addColorStop(0,'#0c1626'); g.addColorStop(.42,'#05070c');
    g.addColorStop(.5,'#0a0805'); g.addColorStop(1,'#020304');
    x.fillStyle = g; x.fillRect(0,0,512,256);
    const warm = x.createRadialGradient(350,64,4,350,64,120);
    warm.addColorStop(0,'rgba(255,238,188,1)'); warm.addColorStop(.5,'rgba(255,196,110,.5)'); warm.addColorStop(1,'rgba(255,196,110,0)');
    x.fillStyle = warm; x.fillRect(0,0,512,256);
    const warm2 = x.createRadialGradient(160,56,4,160,56,84);
    warm2.addColorStop(0,'rgba(255,214,150,.85)'); warm2.addColorStop(1,'rgba(255,214,150,0)');
    x.fillStyle = warm2; x.fillRect(0,0,512,256);
    const cool = x.createRadialGradient(120,196,6,120,196,150);
    cool.addColorStop(0,'rgba(110,160,255,.5)'); cool.addColorStop(1,'rgba(110,160,255,0)');
    x.fillStyle = cool; x.fillRect(0,0,512,256);
    const tex = new THREE.CanvasTexture(c);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    const pm = new THREE.PMREMGenerator(renderer);
    const env = pm.fromEquirectangular(tex).texture;
    tex.dispose(); pm.dispose();
    return env;
  }
  scene.environment = makeEnv();

  const mat = new THREE.MeshPhysicalMaterial({
    color: 0xD89A20, metalness: 1.0, roughness: 0.255,
    clearcoat: 0.6, clearcoatRoughness: 0.55, reflectivity: 1.0, envMapIntensity: 1.7
  });

  /* ---- the keystone, built as 3 voussoir wedges (split-able) ---- */
  const TL={x:-1.28,y:1.08}, TR={x:1.28,y:1.08}, BR={x:0.82,y:-1.18}, BL={x:-0.82,y:-1.18};
  const lx=(a,b,f)=>a+(b-a)*f;
  function wedgeShape(f0,f1){
    const s=new THREE.Shape();
    s.moveTo(lx(TL.x,TR.x,f0), TL.y);
    s.lineTo(lx(TL.x,TR.x,f1), TR.y);
    s.lineTo(lx(BL.x,BR.x,f1), BR.y);
    s.lineTo(lx(BL.x,BR.x,f0), BL.y);
    s.closePath(); return s;
  }
  const keyGroup = new THREE.Group();
  const wedges = [];
  [[0,1/3],[1/3,2/3],[2/3,1]].forEach(([a,b],i)=>{
    const geo = new THREE.ExtrudeGeometry(wedgeShape(a,b),
      {depth:.62, bevelEnabled:true, bevelThickness:.09, bevelSize:.07, bevelSegments:4, steps:1, curveSegments:5});
    geo.translate(0, 0.05, -0.31);                 // center the whole assembly on the origin
    const m = new THREE.Mesh(geo, mat);
    m.userData.dir = (i===0?-1 : i===2?1 : 0);
    keyGroup.add(m); wedges.push(m);
  });
  scene.add(keyGroup);

  /* ---- the Gate: a rounded portal frame the keystone locks into ---- */
  function rr(w,h,r){
    const s=new THREE.Shape(); const x=-w/2, y=-h/2;
    s.moveTo(x+r,y); s.lineTo(x+w-r,y); s.quadraticCurveTo(x+w,y,x+w,y+r);
    s.lineTo(x+w,y+h-r); s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
    s.lineTo(x+r,y+h); s.quadraticCurveTo(x,y+h,x,y+h-r);
    s.lineTo(x,y+r); s.quadraticCurveTo(x,y,x+r,y); return s;
  }
  const frameShape = rr(3.5,3.3,0.34);
  frameShape.holes.push(rr(2.92,2.72,0.22));
  const frameGeo = new THREE.ExtrudeGeometry(frameShape,
    {depth:.26, bevelEnabled:true, bevelThickness:.05, bevelSize:.04, bevelSegments:3, steps:1, curveSegments:8});
  frameGeo.center();
  const frameMat = new THREE.MeshPhysicalMaterial({color:0xC7902A, metalness:1, roughness:.34, envMapIntensity:1.35, transparent:true, opacity:0});
  const gateFrame = new THREE.Mesh(frameGeo, frameMat);
  gateFrame.visible = false;
  scene.add(gateFrame);

  /* ---- orbit / flywheel satellites ---- */
  const NODES = 7;
  const nGeo = new THREE.SphereGeometry(0.05, 16, 16);
  const nMat = new THREE.MeshStandardMaterial({color:0xE9B84A, metalness:.4, roughness:.55, emissive:0x4a3208, emissiveIntensity:.42, transparent:true, opacity:1});
  const nodes = [];
  for(let i=0;i<NODES;i++){ const m=new THREE.Mesh(nGeo,nMat); nodes.push(m); scene.add(m); }

  /* ---- seal glow (finale) ---- */
  function glowTex(){
    const c=document.createElement('canvas'); c.width=c.height=128; const x=c.getContext('2d');
    const g=x.createRadialGradient(64,64,0,64,64,64);
    g.addColorStop(0,'rgba(255,226,150,.95)'); g.addColorStop(.4,'rgba(233,184,74,.45)'); g.addColorStop(1,'rgba(233,184,74,0)');
    x.fillStyle=g; x.fillRect(0,0,128,128); return new THREE.CanvasTexture(c);
  }
  const sealGlow = new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex(), transparent:true, opacity:0, blending:THREE.AdditiveBlending, depthWrite:false}));
  sealGlow.scale.set(4,4,1); sealGlow.visible=false; scene.add(sealGlow);

  /* ---- lights ---- */
  const k1 = new THREE.DirectionalLight(0xffe6b0, 2.0); k1.position.set(4,6,5); scene.add(k1);
  const rim = new THREE.DirectionalLight(0x6f9bff, 1.5); rim.position.set(-6,-1,-4); scene.add(rim);
  scene.add(new THREE.AmbientLight(0x18222e, 0.45));

  /* ---- sizing (self-healing against init layout races) ---- */
  let cssW = 0, cssH = 0;
  function resize(){
    const r = canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
    cssW = w; cssH = h;
    renderer.setPixelRatio(Math.min(devicePixelRatio||1, coarse ? 1.5 : 2));  // cap MSAA cost on touch GPUs
    renderer.setSize(w, h, false);
    camera.aspect = w/h; camera.updateProjectionMatrix();
  }
  resize();
  addEventListener('resize', ()=>{ resize(); computeAnchors(); }, {passive:true});
  try{ new ResizeObserver(()=>{ resize(); computeAnchors(); }).observe(canvas); }catch(e){}
  // the fixed canvas box doesn't change when the DOCUMENT grows, but the scroll
  // anchors do — recompute them when page height shifts (lens notes injected,
  // passport minted, disclosure rows pinned) or when late fonts reflow.
  try{ new ResizeObserver(()=> computeAnchors()).observe(document.body); }catch(e){}
  if(document.fonts && document.fonts.ready){ document.fonts.ready.then(()=> computeAnchors()).catch(()=>{}); }
  [120,300,700,1500].forEach(d=> setTimeout(()=>{ resize(); computeAnchors(); }, d));  // timer heal where rAF/RO are frozen

  /* ---- cursor parallax ---- */
  let mpx=0, mpy=0;
  if(!coarse){
    addEventListener('pointermove', e=>{ mpx=(e.clientX/innerWidth-0.5); mpy=(e.clientY/innerHeight-0.5); }, {passive:true});
  }

  /* ===== SCENE TIMELINE (anchored to sections, by scroll) ===== */
  const DEFS = [
    {sel:'#top',     scale:.50, lift:1.46, split:0, gate:0, seal:0, nodes:1.0, flat:0, spinY:.0013, nspd:.32},
    {sel:'#model',   scale:.45, lift:1.34, split:1, gate:0, seal:0, nodes:.55, flat:0, spinY:.0009, nspd:.30},
    {sel:'#flywheel',scale:.42, lift:1.40, split:0, gate:0, seal:0, nodes:1.0, flat:1, spinY:.0007, nspd:.85},
    {sel:'#trust',   scale:.47, lift:1.40, split:0, gate:1, seal:0, nodes:.22, flat:0, spinY:.0005, nspd:.25},
    {sel:'#cta',     scale:.55, lift:1.36, split:0, gate:0, seal:1, nodes:0.0, flat:0, spinY:0,     nspd:0},
  ];
  const KEYS = ['scale','lift','split','gate','seal','nodes','flat','spinY','nspd'];
  let ANCH = [];
  function computeAnchors(){
    ANCH = DEFS.map(d=>{
      const el = document.querySelector(d.sel);
      let y = 0;
      if(el){ const top = el.getBoundingClientRect().top + scrollY; y = d.sel==='#top' ? 0 : top + el.offsetHeight*0.5; }
      return Object.assign({}, d, {y});
    }).sort((a,b)=>a.y-b.y);
  }
  computeAnchors();
  setTimeout(computeAnchors, 600);           // re-measure once fonts/layout settle

  const smooth = v => v*v*(3-2*v);
  const cur = {};                            // smoothed current scene props
  function targetAt(scy){
    if(!ANCH.length) return DEFS[0];
    if(scy <= ANCH[0].y) return ANCH[0];
    for(let i=0;i<ANCH.length-1;i++){
      if(scy <= ANCH[i+1].y){
        const t = smooth((scy-ANCH[i].y)/Math.max(1, ANCH[i+1].y-ANCH[i].y));
        const o = {};
        KEYS.forEach(k=> o[k] = ANCH[i][k] + (ANCH[i+1][k]-ANCH[i][k])*t);
        return o;
      }
    }
    return ANCH[ANCH.length-1];
  }

  /* ---- animation ---- */
  let rotY = 0, nodePhase = 0, lastT = 0;
  const clock = new THREE.Clock();

  function render(t){
    const frontW = Math.min(1, (cur.gate + cur.seal));     // face the camera in gate/seal
    const lift = cur.lift, sc = cur.scale, z = -0.4*cur.seal;
    const float = reduce ? 0 : Math.sin(t*0.8)*0.06*(1-frontW*0.8);

    /* keystone group */
    keyGroup.position.set(0, lift+float, z);
    keyGroup.scale.setScalar(sc);
    keyGroup.rotation.y = rotY*(1-frontW) + mpx*0.16*(1-frontW);
    keyGroup.rotation.x = (reduce?0:Math.sin(t*0.6)*0.03)*(1-frontW) + mpy*0.07*(1-frontW);
    keyGroup.rotation.z = 0;
    wedges.forEach(m=>{
      const d = m.userData.dir;
      m.position.x = d * cur.split * 0.95;
      m.position.z = (d===0 ? cur.split*0.18 : 0);          // center piece eases forward
      m.rotation.z = -d * cur.split * 0.08;
    });

    /* gate frame */
    const gv = cur.gate;
    gateFrame.visible = gv > 0.02;
    if(gateFrame.visible){
      frameMat.opacity = gv*0.92;
      gateFrame.position.set(0, lift+float, z-0.12);
      gateFrame.scale.setScalar(sc*(0.78+0.22*gv));
      gateFrame.rotation.y = keyGroup.rotation.y*0.4;
      gateFrame.rotation.x = keyGroup.rotation.x*0.4;
    }

    /* satellites: blend tilted orbit (hero) <-> flat wheel (flywheel) */
    const av = cur.nodes;
    nMat.opacity = av;
    const orb = 3.0*sc;
    nodes.forEach((n,i)=>{
      n.visible = av > 0.03;
      if(!n.visible) return;
      const a = nodePhase + (i/NODES)*Math.PI*2;
      const tiltY = Math.sin(a)*orb*0.34;
      const flatY = Math.sin(a)*orb;
      const tiltZ = Math.sin(a)*orb;
      const flatZ = 0.0;
      n.position.set(
        Math.cos(a)*orb,
        lift + tiltY + (flatY-tiltY)*cur.flat,
        z + tiltZ + (flatZ-tiltZ)*cur.flat
      );
      const pulse = 0.7 + 0.5*(0.5+0.5*Math.sin(t*1.3+i));
      n.scale.setScalar(Math.max(0.001, pulse*av*(0.8+0.4*cur.flat)));
    });

    /* seal glow finale — gated so it only blooms once the CTA is truly
       on screen; otherwise it washes #decision in gold and kills contrast */
    const svRaw = cur.seal;
    const svG = Math.max(0, (svRaw-0.55)/0.45);
    const sv = svG*svG*(3-2*svG);
    sealGlow.visible = sv > 0.02;
    if(sealGlow.visible){
      sealGlow.material.opacity = sv*0.55;
      sealGlow.position.set(0, lift+float, z-0.5);
      sealGlow.scale.setScalar(3.0*sc + sv*1.4 + (reduce?0:0.4*Math.sin(t*1.4)));
    }

    renderer.render(scene, camera);
  }

  let healFrames = 0;
  function frame(){
    requestAnimationFrame(frame);
    // self-heal against init layout races — but only until the size is stable for
    // a stretch of frames. window resize + the canvas ResizeObserver cover every
    // later change, so we stop the per-frame getBoundingClientRect (a forced
    // layout read) once settled instead of paying it for the page's lifetime.
    if(healFrames < 20){
      const r = canvas.getBoundingClientRect();
      if(Math.max(1,Math.round(r.width))!==cssW || Math.max(1,Math.round(r.height))!==cssH){ resize(); computeAnchors(); healFrames = 0; }
      else healFrames++;
    }
    const t = clock.getElapsedTime();
    const dt = Math.min(0.05, Math.max(0.001, t - lastT)); lastT = t;   // frame-rate independent (no 2x spin on 120Hz)
    const tgt = targetAt(scrollY);
    KEYS.forEach(k=>{ cur[k] = (cur[k]===undefined? tgt[k] : cur[k] + (tgt[k]-cur[k])*0.08); });
    rotY += (reduce?0:cur.spinY*dt*60);
    nodePhase += (reduce?0:cur.nspd)*dt;
    render(t);
  }

  document.body.classList.add('has-3d');
  frame();
})();
