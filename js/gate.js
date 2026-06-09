/* ===========================================================
   The Keystone Gate — interactive certification.
   Run an agent through 6 governed checks; mint an Agent Passport.
   Pure DOM/CSS so it's crisp, accessible, and reduced-motion safe.
   =========================================================== */
(function(){
  const root = document.getElementById('gate');
  if(!root) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const STEPS = [
    { g:'01', name:'Identity',     sub:'Bind owner, scope & permissions',  pass:'Identity bound · scope locked',     stamp:'ID' },
    { g:'02', name:'Evaluation',   sub:'Eval harness vs. manual baseline',  pass:'+47% vs baseline · 0 criticals',    stamp:'EVAL' },
    { g:'03', name:'Independence', sub:'Conflict & restricted-use check',   pass:'No independence conflict',          stamp:'IND' },
    { g:'04', name:'Red-team',     sub:'Adversarial probes & jailbreaks',   pass:'128 probes · 0 breaches',           stamp:'RED' },
    { g:'05', name:'Attestation',  sub:'Evidence written to the ledger',    pass:'Evidence sealed · hash written',    stamp:'ATT' },
    { g:'06', name:'Passport',     sub:'Certified for regulated operation', pass:'Agent Passport issued',             stamp:'PASS' },
  ];

  const stationsEl = document.getElementById('stations');
  const railFill   = document.getElementById('railFill');
  const token      = document.getElementById('agentToken');
  const stage      = document.getElementById('gateStage');
  const runBtn     = document.getElementById('gateRun');
  const pickEl     = document.getElementById('agentName');

  /* build the 6 stations */
  stationsEl.innerHTML = STEPS.map((s,i)=>`
    <div class="station" data-i="${i}">
      <div class="st-dot"><span class="st-g">${s.g}</span><span class="st-check">✓</span></div>
      <div class="st-name">${s.name}</div>
      <div class="st-sub">${s.sub}</div>
      <div class="st-stat" id="stat-${i}">Pending</div>
    </div>`).join('');

  const stations = [...stationsEl.querySelectorAll('.station')];
  const N = STEPS.length;
  let running = false;

  function setToken(i){
    // place token over station i (0..N-1), centered on the station column
    const pct = ((i+0.5)/N)*100;
    token.style.left = pct+'%';
    railFill.style.width = pct+'%';
  }
  function reset(){
    stations.forEach((st,i)=>{ st.className='station'; document.getElementById('stat-'+i).textContent='Pending'; });
    setToken(0);
    token.classList.remove('done');
    stage.classList.remove('show');
    stage.innerHTML='';
  }

  function genPassportNo(){
    const yr = new Date().getFullYear();
    const rnd = (Date.now().toString(36)+Math.random().toString(36).slice(2)).toUpperCase().replace(/[^A-Z0-9]/g,'');
    return `KS-AP-${yr}-${rnd.slice(0,6)}`;
  }
  function hashGlyphs(seed){
    // decorative 'evidence hash' — 24 deterministic-ish cells
    let h=0; for(const c of seed) h=(h*31 + c.charCodeAt(0))>>>0;
    let out='';
    for(let i=0;i<28;i++){ h=(h*1103515245+12345)>>>0; out+=(h>>16)&1 ? '1':'0'; }
    return out;
  }

  function mint(){
    const agent = pickEl ? pickEl.value : 'Governed Agent';
    const no = genPassportNo();
    const date = new Date().toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'});
    const hash = hashGlyphs(no+agent);
    const stamps = STEPS.map(s=>`<span class="pp-stamp">${s.stamp}<i>✓</i></span>`).join('');
    const cells = [...hash].map(b=>`<i class="${b==='1'?'on':''}"></i>`).join('');
    stage.innerHTML = `
      <div class="passport" id="passport" role="img" aria-label="Agent Passport — Certified">
        <div class="pp-sheen" aria-hidden="true"></div>
        <div class="pp-top">
          <div class="pp-seal"><span class="pp-key"></span></div>
          <div class="pp-id">
            <div class="pp-kicker">EY.ai · The Keystone Gate</div>
            <div class="pp-name">Agent Passport</div>
          </div>
          <div class="pp-badge">Certified</div>
        </div>
        <div class="pp-grid">
          <div><dt>Agent</dt><dd>${agent}</dd></div>
          <div><dt>Class</dt><dd>Regulated · production-eligible</dd></div>
          <div><dt>Passport No.</dt><dd class="mono">${no}</dd></div>
          <div><dt>Issued</dt><dd>${date}</dd></div>
          <div><dt>Gate</dt><dd>Keystone Gate v1</dd></div>
          <div><dt>Independence</dt><dd>Cleared</dd></div>
        </div>
        <div class="pp-stamps">${stamps}</div>
        <div class="pp-hash" aria-hidden="true">${cells}</div>
        <div class="pp-foot">Issued under EY independence &amp; assurance standards · revocable · continuously monitored</div>
      </div>
      <div class="gate-again">
        <button class="btn ghost magnetic" id="gateAgain">Certify another agent</button>
        <span class="gate-note">Every agent earns its passport the same way. No exceptions.</span>
      </div>`;
    requestAnimationFrame(()=> stage.classList.add('show'));
    setTimeout(()=> stage.classList.add('show'), 40); // rAF-frozen / throttled-tab fallback
    const again = document.getElementById('gateAgain');
    if(again) again.addEventListener('click', ()=>{ reset(); run(); });
    token.classList.add('done');
    runBtn.disabled = false;
    runBtn.textContent = 'Run certification';
    running = false;
  }

  function run(){
    if(running) return;
    running = true;
    reset();
    runBtn.disabled = true;
    runBtn.textContent = 'Certifying…';
    const stepMs = reduce ? 60 : 720;
    const checkMs = reduce ? 30 : 360;

    let i = 0;
    function step(){
      if(i>=N){ mint(); return; }
      const st = stations[i];
      const stat = document.getElementById('stat-'+i);
      st.classList.add('active');
      setToken(i);
      stat.textContent = 'Checking…';
      setTimeout(()=>{
        st.classList.remove('active'); st.classList.add('pass');
        stat.textContent = STEPS[i].pass;
        i++;
        setTimeout(step, stepMs - checkMs);
      }, checkMs);
    }
    // small lead-in so the token visibly departs
    setTimeout(step, reduce?0:260);
  }

  runBtn.addEventListener('click', run);
  reset();
})();
