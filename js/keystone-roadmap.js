/* ===========================================================
   Keystone Roadmap — the AI-native transformation memory.

   A single, versioned data structure (window.KEYSTONE_ROADMAP)
   that holds the firm's path from AI-assisted to AI-native:
   the definition, the L0–L5 maturity ladder, the three horizons
   (today / +12 months / +3 years), seven transformation pillars
   each charted across those horizons, a 12-quarter development
   plan, and a success scorecard.

   This file is BOTH the data (the new "AI memory") and a small,
   self-contained renderer + runtime for the supplemental pages
   (roadmap.html, maturity.html, quarters.html). It deliberately
   does not depend on keystone.js, so it is safe to load alone.

   Evidence discipline matches the rest of the site: EY-public
   facts are cited; everything proposed here is Keystone-proposed
   strategy for leadership to evaluate — not an EY commitment.
   =========================================================== */
(function(){
  'use strict';

  /* ------------------------------------------------------------------
     1 · THE DATA  (the AI memory)
     ------------------------------------------------------------------ */
  const R = {
    meta:{
      version:'1.0',
      updated:'2026 Q2',
      disclaimer:'Independent working concept for EY leadership review — not an authorized EY publication. Maturity levels, horizon targets, quarterly goals and scorecard values are Keystone-proposed planning artifacts, not EY commitments.'
    },

    /* ---- what "AI-native" means ---- */
    aiNative:{
      claim:'AI-native is not more AI. It is a different operating model.',
      definition:'An AI-native firm is one whose default unit of work is a governed agent, not a manual task — where knowledge and controls are executable, operations are software-defined, and capability compounds with every engagement. An AI-enabled firm bolts AI onto its existing process and keeps pricing the work in hours. An AI-native firm rebuilds the process around governed autonomy, and people move from doing the work to directing, supervising and governing the systems that do it.',
      line:'AI-enabled adds AI to the firm. AI-native rebuilds the firm as a governed system of agents.',
      chars:[
        ['Agents are the default unit','Work is performed by governed agents under human direction — not by a pyramid of manual juniors. The human job is to supervise, govern and extend.'],
        ['Governance is code, not paper','Policy, independence and controls run as executable checks at runtime — the Gate — so trust is enforced before production, not reviewed after the fact.'],
        ['Knowledge is an executable asset','Scarce risk, tax and independence judgment is encoded once into the Truth Layer and put in reach of every team — governed, cited, reusable.'],
        ['Operations are software-defined','The enterprise is compiled into a versioned environment — policy, data, workflows, agents and evidence as code — so it can be run, tested and certified like software.'],
        ['Capability compounds','Every engagement leaves a reusable primitive behind. The next governed system is faster to build than the last; the firm gets steeper, not just bigger.'],
        ['People move up the stack','The pyramid of grinders becomes a diamond of supervisors; new professions appear — orchestration engineer, AI risk officer, independence architect.'],
        ['Value is outcome-priced','Monetization shifts from billable hours and headcount to governed, reusable capacity — services delivered like software, priced on outcomes.']
      ]
    },

    /* ---- the L0–L5 maturity ladder ---- */
    levels:[
      ['L0','Manual','Work is done by people; AI is absent or used in the shadows with no governance.','Humans do · no AI','var(--dim)'],
      ['L1','Assisted','Individuals use AI copilots on discrete tasks. Ungoverned point tools, no shared memory, value still priced in hours.','Human leads · AI suggests','var(--blue)'],
      ['L2','Augmented','AI is embedded in real workflows through governed apps and named-domain pilots. Governance is still reviewed after the fact.','Human in the loop · AI drafts','var(--violet)'],
      ['L3','Orchestrated','Agents run multi-step workflows under supervision. Governance becomes code — nothing reaches production without clearing the Gate.','Human on the loop · agents act, humans approve','var(--teal)'],
      ['L4','Governed-autonomous','Certified agents run production workflows end-to-end; humans supervise the exceptions. Reusable primitives compound across domains.','Agents operate · humans govern','var(--gold-2)'],
      ['L5','AI-native','The firm runs as a governed system of agents that compounds and originates net-new systems at the frontier. People set policy and direction.','Humans direct · agents run the firm','var(--gold)']
    ],

    /* ---- the three horizons ---- */
    horizons:[
      {id:'h0',tag:'Today',when:'2026',level:'L1 → L2',name:'AI-assisted, not AI-native',color:'var(--blue)',
        body:'EY has made a firm-defining bet — EY.ai live, EYQ in 300k+ hands, the Agentic Platform with NVIDIA, agentic AI now embedded across assurance. But the capability is bolted onto the existing firm: point solutions, governance reviewed after the fact, and value still largely priced in hours. The ingredients exist; the operating model has not yet changed.',
        signals:['EY.ai and EYQ live across the firm','Agents concentrated in named domains (tax, risk, audit)','Governance applied after build, not as runtime code','Value still measured in hours and headcount']},
      {id:'h1',tag:'+12 months',when:'2027',level:'L3',name:'Governed systems in production',color:'var(--teal)',
        body:'The Gate v1 is published and clearing agents; the banking proving ground has certified its first governed systems on real regulated workflows; a core library of reusable primitives and a model router exist; and the first outcome-priced engagements are running. EY is no longer shipping point solutions — it is compiling governed capability.',
        signals:['Gate v1 cleared by Independence and Risk','First certified governed agents live in banking','Core primitive library + model router in use','First outcome-priced (services-as-software) pilots']},
      {id:'h2',tag:'+3 years',when:'2029',level:'L4 → L5',name:'A governed substrate across industries',color:'var(--gold)',
        body:'Keystone is EY.ai’s operating substrate. Certified agents run production workflows across banking, insurance, life sciences, healthcare, energy and government; capability compounds and begins to originate net-new systems at the frontier; the workforce has moved from pyramid to diamond. The firm is AI-native — trust turned into infrastructure.',
        signals:['Keystone is EY.ai’s governed operating substrate','Certified agent fleets across multiple regulated industries','Compounding primitives originate net-new systems','Diamond workforce; revenue mix shifting to outcomes']}
    ],

    /* ---- seven transformation pillars, charted across horizons ---- */
    pillars:[
      {id:'lab',code:'P1',tag:'The Lab — how EY builds',color:'var(--gold)',
        head:'From projects delivered to systems compiled.',
        what:'The Lab is how EY builds in the agentic era: forward-deployed teams that embed in a real workflow and turn frontier capability into reusable, governed systems — with the hyperscalers, inside EY’s constraints. It is the engine that moves the firm from one-off projects to a compounding library of foundational systems.',
        today:['L1 → L2','Projects & accelerators','Capability is delivered as bespoke projects and point accelerators. Each engagement starts near zero; little is reused; the asset is the deck, not the system.'],
        h1:['L3','Forward-deployed co-build','Forward-deployed teams run the Embed → Map → Co-build → Gate → Graduate loop in banking. The first systems graduate into a shared component library.'],
        h2:['L4 → L5','A compounding systems factory','The Lab originates net-new frontier systems and modernizes core technology at scale; every build leaves primitives behind, so the next one is faster. Building becomes assembly.'],
        metrics:['Reusable primitives in the library ↑','Time-to-graduate a system ↓','Share of builds assembled from existing primitives ↑'],
        claims:['ks1','ks5']},

      {id:'os',code:'P2',tag:'Keystone OS — the runtime',color:'var(--blue)',
        head:'From slideware transformation to environment-as-code.',
        what:'Keystone OS turns a regulated enterprise into an executable model: policy, controls, data, workflows, agents, synthetic customers, red-team adversaries and evidence all become versioned runtime components the Compiler assembles into a live governed environment. We don’t pitch the transformation; we compile it, run it, and let you watch.',
        today:['L1','Described, not executable','The enterprise lives in documents, decks and disconnected tools. Process and policy are written down, not runnable; you cannot test the firm before you change it.'],
        h1:['L3','First compiled environments','Banking workflows are compiled into governed environments; the Simulation Engine runs synthetic customers against governed agents under live policy while controls fire and evidence is logged.'],
        h2:['L4 → L5','The firm as software','Every regulated environment is a versioned, certifiable Playbook Lab; new policy ships as a code change and is proven in simulation before it touches production.'],
        metrics:['Workflows running as compiled environments ↑','Mean time to certify an environment ↓','Policy changes proven in simulation before production ↑'],
        claims:['ks1','ks5']},

      {id:'gate',code:'P3',tag:'The Gate — trust & certification',color:'var(--gold-2)',
        head:'From governance after the fact to a runtime operating license.',
        what:'The Gate is the operating license for every governed agentic system: identity, evaluation against a baseline, independence review, red-team, attestation and an issued Agent Passport — then lifecycle monitoring and retirement with an evidence trail. Before EY governs what agents do, it governs whether they may run at all. This is the moat peers still only experiment with.',
        today:['L1 → L2','Manual review, case by case','Risk and independence are assessed by people, late, per project. There is no standard passport, no shared evidence ledger, no automated red-team.',],
        h1:['L3','Gate v1, cleared by Risk','Gate v1 is published and cleared by Independence and Risk; every banking agent earns an Agent Passport before production; a standing oversight board clears every passport.'],
        h2:['L4 → L5','Certification as infrastructure','No agent runs anywhere in the firm without a current passport; certification is automated, continuous and published for inspection. Trust is enforced by the runtime itself.'],
        metrics:['Production agents with a current Agent Passport → 100%','Mean time-to-certify through the Gate ↓','Independence / red-team issues caught pre-production ↑'],
        claims:['ks1','ks3','ks5']},

      {id:'truth',code:'P4',tag:'The Truth Layer — knowledge & AI memory',color:'var(--violet)',
        head:'From scattered documents to a governed evidence graph.',
        what:'The Truth Layer is the knowledge substrate under the Lab: a versioned evidence graph that ingests the EY public record, the thesis, partner evidence, market signals and authorized internal material; extracts claim-level truth; binds every claim to exact source spans; scores authority and freshness; detects contradictions; and feeds agents governed, cited answers. RAG retrieves documents; the Truth Layer retrieves claims.',
        today:['L1','Retrieval over documents','Knowledge is searched, not governed. Answers cite documents at best; freshness, authority and contradictions are left to the reader. The firm’s judgment is not yet an asset agents can reuse.'],
        h1:['L3','Claim-level, cited memory','Every agent answer is grounded in claim-level truth with source spans and a truth status; the registry distinguishes EY-public fact from proposal. Encoded judgment is reused across teams.'],
        h2:['L4 → L5','A compounding judgment asset','The evidence graph spans every industry environment, detects contradictions automatically, and keeps itself fresh; the firm’s scarce judgment, encoded once, is in reach of every governed agent.'],
        metrics:['Answers bound to claim-level sources → 100%','Stale / conflicting claims surfaced and resolved ↑','Encoded judgment reused across engagements ↑'],
        claims:['ks1','ks5']},

      {id:'people',code:'P5',tag:'Workforce & Capability',color:'var(--teal)',
        head:'From a pyramid of grinders to a diamond of supervisors.',
        what:'AI-native changes the org chart, not just the tooling. People are reskilled to supervise agents, not replaced — the pyramid of manual juniors becomes a diamond of agent supervisors — and new professions appear: Agent Orchestration Engineer, AI Risk Officer, Model Ethics Counsel, Independence Architect, Agent Governance Specialist. EY proves it on itself first: Client Zero before client one.',
        today:['L1 → L2','Leveraged pyramid','Margin still comes from leveraged junior hours. AI assists individuals, but the org shape, the career ladder and the economics are unchanged.'],
        h1:['L3','Supervisors emerge','Forward-deployed teams reskill professionals to supervise governed agents; the first new-profession roles are filled and a Client Zero cohort runs Keystone internally before any client sees it.'],
        h2:['L4 → L5','The diamond, at scale','Small high-judgment teams direct fleets of governed agents; juniors operate at senior leverage; new professions are standard roles; capability stays with client teams after every engagement.'],
        metrics:['Professionals supervising governed agents ↑','New-profession roles filled ↑','Internal (Client Zero) workflows on Keystone ↑'],
        claims:['ks1','ks5']},

      {id:'ground',code:'P6',tag:'Proving Grounds — industry scale',color:'var(--blue)',
        head:'From banking proof to a multi-industry substrate.',
        what:'Banking is the first proving ground, not the product — three demonstrators, each with a named buyer, real pain and a measured target, proving the governed substrate underneath. From there the same substrate carries into insurance, life sciences, healthcare, energy and government. Nothing scales until the layer beneath it is certified.',
        today:['L2','Pilots in a few practices','Agentic work is real but concentrated — strongest in tax, risk and audit, thin everywhere else. No certified, reusable substrate carries proof from one domain to the next.'],
        h1:['L3','Banking, proven','Three banking demonstrators run certified on governed data, measured against manual baselines; the proving-ground model and the governed substrate are validated and ready to replicate.'],
        h2:['L4 → L5','Substrate across industries','Certified proving grounds operate across regulated industries; each new industry is faster to stand up because the substrate, Gate and primitives already exist.'],
        metrics:['Certified industry proving grounds live ↑','Cycle-time reduction vs manual baseline (40–60% target) ↑','Time to stand up a new industry ↓'],
        claims:['ks1','ks2','ks5']},

      {id:'econ',code:'P7',tag:'Operating Model & Economics',color:'var(--gold)',
        head:'From hours sold to capacity productized — services-as-software.',
        what:'The deepest shift is economic: from labor leverage (hours and headcount) to system leverage (governed, reusable capacity). EY owns the Lab as a strategic asset; the market puts it to work through four tiers — Explorer, Resident, Production, Marketplace. The firm stops selling only time and starts selling governed capability that compounds — services delivered like software, priced on outcomes.',
        today:['L1','Time & materials','Revenue tracks hours and headcount. Value created in one engagement rarely carries to the next; growth means hiring. The model is linear.'],
        h1:['L3','First productized capability','Certified systems are packaged for reuse and the first outcome-priced engagements run; the marketplace and tier model are stood up. Value starts to decouple from hours.'],
        h2:['L4 → L5','Compounding, outcome-priced','A growing share of revenue comes from governed, reusable capacity sold across the network; the firm gets steeper margins as primitives compound, not just larger headcount.'],
        metrics:['Revenue from productized / outcome-priced capability ↑','Cost-to-serve per governed workflow ↓','Value reused across engagements ↑'],
        claims:['ks1','ks5','mk5','mk6']}
    ],

    /* ---- four delivery phases (the spine of the quarters) ---- */
    phases:[
      ['Phase 0','Foundation','60–90 days','var(--gold)'],
      ['Phase 1','Banking Proving Ground','6–9 months','var(--teal)'],
      ['Phase 2','Systems Scale','12–18 months','var(--blue)'],
      ['Phase 3','Global Substrate','24–36 months','var(--gold-2)']
    ],

    /* ---- 12-quarter development plan ---- */
    quarters:[
      {q:'Q1',when:'2026 Q3',phase:0,level:'L2 entry',theme:'Stand up the foundation',
        goals:['Sign the venture charter — decision rights, governance board, IP, kill/scale gates','Publish Gate v1 and clear it with Independence and Risk','Name the core team and land one written partner commitment to compute + embedded engineers'],
        measure:'Charter signed · Gate v1 published · one partner committed in writing'},
      {q:'Q2',when:'2026 Q4',phase:1,level:'L2 → L3',theme:'First governed agent in the sandbox',
        goals:['Stand up the banking sandbox on governed data','Run the third-party-risk-review agent through the Gate against a manual baseline','Sign one lighthouse-bank sandbox LOI'],
        measure:'One governed agent live in sandbox · measured vs baseline · one signed LOI'},
      {q:'Q3',when:'2027 Q1',phase:1,level:'L3',theme:'First certified system in production',
        goals:['Issue the first Agent Passport to a production banking agent','Stand up the standing independent oversight board','Hit the cycle-time-reduction target on the first workflow (40–60%)'],
        measure:'First Agent Passport issued · oversight board live · target cycle-time reduction met'},
      {q:'Q4',when:'2027 Q2',phase:2,level:'L3',theme:'Three banking demonstrators',
        goals:['Take all three banking demonstrators to certified production','Extract the first reusable primitives into a shared component library','Stand up the Simulation Engine for banking workflows'],
        measure:'3 certified demonstrators live · primitive library v1 · simulation running'},
      {q:'Q5',when:'2027 Q3',phase:2,level:'L3 → L4',theme:'Primitives & the model router',
        goals:['Ship the model router and a fit-for-purpose model catalog','Grow the primitive library so new builds are assembled, not started from zero','Reskill the first Client Zero cohort to supervise governed agents'],
        measure:'Model router live · >50% of new builds reuse primitives · first supervisor cohort trained'},
      {q:'Q6',when:'2027 Q4',phase:2,level:'L4 entry',theme:'Simulation lab across domains',
        goals:['Extend simulation + certification across risk, tax, finance and cyber','Run new policy as a code change proven in simulation before production','Stand up the marketplace and the four access tiers'],
        measure:'4 domains in simulation · policy-as-code proven pre-production · marketplace v1 live'},
      {q:'Q7',when:'2028 Q1',phase:3,level:'L4',theme:'Second industry: insurance',
        goals:['Stand up the insurance proving ground on the existing substrate','Reuse the Gate, Truth Layer and primitives to cut stand-up time','Run the first outcome-priced engagement'],
        measure:'Insurance proving ground certified · stand-up time down vs banking · first outcome-priced deal'},
      {q:'Q8',when:'2028 Q2',phase:3,level:'L4',theme:'Marketplace & outcome pricing',
        goals:['Package certified systems for reuse across the network','Scale outcome-priced engagements beyond pilots','Make Agent Passports continuous — monitored, not point-in-time'],
        measure:'Marketplace catalog live · outcome-priced revenue share rising · continuous certification on'},
      {q:'Q9',when:'2028 Q3',phase:3,level:'L4',theme:'Multi-industry scale',
        goals:['Add life sciences and healthcare proving grounds','Hold 100% Agent-Passport coverage on every production agent','Fill new-profession roles as standard positions'],
        measure:'2 more industries live · 100% passport coverage · new-profession roles standardized'},
      {q:'Q10',when:'2028 Q4',phase:3,level:'L4 → L5',theme:'Agent fleet at scale',
        goals:['Scale governed agent fleets toward the Keystone-proposed 100k-by-2028 target','Run the oversight board and evidence ledger as steady-state infrastructure','Show compounding: primitives reused across most new systems'],
        measure:'Agent fleet scaling to target · steady-state governance · >50% of new systems reuse primitives'},
      {q:'Q11',when:'2029 Q1',phase:3,level:'L5 entry',theme:'Frontier & self-improvement',
        goals:['Stand up energy and government proving grounds','Originate net-new frontier systems, not just modernize existing ones','Begin self-improving primitives that sharpen with governed data'],
        measure:'2 more industries live · net-new frontier systems graduated · self-improvement measurable'},
      {q:'Q12',when:'2029 Q2',phase:3,level:'L5',theme:'AI-native substrate',
        goals:['Make Keystone EY.ai’s operating substrate across regulated industries','Shift a meaningful share of revenue to governed, outcome-priced capacity','Confirm the firm operates AI-native: agents run, humans govern'],
        measure:'Keystone is the operating substrate · outcome-priced revenue share at target · L5 confirmed'}
    ],

    /* ---- success scorecard ---- */
    scorecard:[
      {group:'Capability & Leverage',color:'var(--gold)',kpis:[
        ['Governed agents in production','How much of the firm actually runs on certified agents.','Pilots','First certified fleet (banking)','Toward the 100k-by-2028 target (Keystone-proposed)','↑'],
        ['Reusable primitives in the library','The compounding asset — how much of a new system is assembled, not built.','~0 formal','Core library v1','Hundreds, reused by default','↑'],
        ['Time-to-graduate a governed system','How fast frontier capability becomes a certified, reusable system.','Months, bespoke','Down vs baseline','Assembly-speed','↓']
      ]},
      {group:'Governance & Trust',color:'var(--gold-2)',kpis:[
        ['Production agents with a current passport','The trust guarantee — nothing runs without a current Gate certification.','n/a','100% in banking','100% firmwide','↑'],
        ['Mean time-to-certify through the Gate','How efficiently trust is enforced — without it, governance is a bottleneck.','Manual, slow','Gate v1 baseline','Continuous & automated','↓'],
        ['Issues caught pre-production','Independence / red-team / leakage problems stopped before they reach a client.','Late, manual','Caught at the Gate','Caught continuously','↑']
      ]},
      {group:'Economics',color:'var(--teal)',kpis:[
        ['Revenue from productized capability','The model shift — value sold as governed, reusable capacity, not only hours.','~all hours','First outcome-priced pilots','Material & growing share','↑'],
        ['Cost-to-serve per governed workflow','Whether system leverage actually beats labor leverage.','Labor-bound','Falling on certified work','Structurally lower','↓'],
        ['Cycle-time reduction vs baseline','The proof a governed agent beats the manual process it replaces.','—','40–60% on first agent','Standard across workflows','↑']
      ]},
      {group:'Adoption & Talent',color:'var(--blue)',kpis:[
        ['Professionals supervising agents','The pyramid-to-diamond shift, measured in people.','Few','First supervisor cohorts','Standard operating mode','↑'],
        ['New-profession roles filled','Orchestration engineers, AI risk officers, independence architects as real jobs.','~0','First roles filled','Standardized positions','↑'],
        ['Client Zero workflows on Keystone','EY running on its own governed systems before selling them.','Starting','Internal cohort live','Run-the-firm default','↑']
      ]}
    ]
  };

  window.KEYSTONE_ROADMAP = R;

  /* ------------------------------------------------------------------
     2 · RENDER  (data -> the same design language)
     ------------------------------------------------------------------ */
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const chips = arr => '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:14px">'+
    arr.map(c=>'<span class="haveitem">'+c+'</span>').join('')+'</div>';
  const autofit = min => 'grid-template-columns:repeat(auto-fit,minmax('+min+',1fr))';

  function renderChars(el){
    el.className='kf-grid';
    el.style.cssText=autofit('260px');
    el.innerHTML=R.aiNative.chars.map((c,i)=>
      '<div class="kf reveal" style="--d:'+(i*0.05)+'s"><div class="kf-n">'+String(i+1).padStart(2,'0')+'</div>'+
      '<div class="kf-t">'+esc(c[0])+'</div><p>'+esc(c[1])+'</p></div>').join('');
  }

  function renderLevels(el){
    el.className='tiers';
    el.innerHTML=R.levels.map((l,i)=>
      '<div class="tier reveal" style="--tc:'+l[4]+';--d:'+(i*0.05)+'s">'+
      '<div class="tnum">'+l[0]+'</div>'+
      '<div><div class="tn">'+esc(l[1])+'</div><div class="td">'+esc(l[2])+'</div></div>'+
      '<div class="tm">'+esc(l[3])+'</div></div>').join('');
  }

  function renderHorizons(el){
    el.className='lh';
    el.innerHTML=R.horizons.map(h=>
      '<div class="lhc reveal" style="border-top-color:'+h.color+'">'+
      '<div class="who" style="color:'+h.color+'">'+esc(h.tag)+' · '+esc(h.when)+'</div>'+
      '<h4>'+esc(h.name)+'</h4>'+
      '<div class="m" style="margin-top:12px"><span class="k">Maturity</span><span class="vv val">'+esc(h.level)+'</span></div>'+
      '<p style="margin:12px 0 4px;color:var(--mut);font-size:.92rem;line-height:1.55">'+esc(h.body)+'</p>'+
      '<div class="m" style="margin-top:12px"><span class="k">Signals you’re there</span></div>'+
      '<ul class="creds" style="margin-top:8px">'+h.signals.map(s=>'<li style="font-size:.86rem">'+esc(s)+'</li>').join('')+'</ul>'+
      '</div>').join('');
  }

  function renderScorecard(el){
    el.innerHTML=R.scorecard.map(g=>
      '<h3 class="subhead reveal" style="border-left:3px solid '+g.color+';padding-left:14px">'+esc(g.group)+'</h3>'+
      '<div class="kf-grid reveal" style="'+autofit('280px')+'">'+
      g.kpis.map(k=>
        '<div class="kf"><div class="kf-n" style="color:'+g.color+'">'+k[5]+' &nbsp;measure</div>'+
        '<div class="kf-t">'+esc(k[0])+'</div>'+
        '<p>'+esc(k[1])+'</p>'+
        '<div class="m" style="margin-top:12px"><span class="k">Today</span><span class="vv">'+esc(k[2])+'</span></div>'+
        '<div class="m" style="margin-top:6px"><span class="k">+12 months</span><span class="vv">'+esc(k[3])+'</span></div>'+
        '<div class="m" style="margin-top:6px"><span class="k">+3 years</span><span class="vv val">'+esc(k[4])+'</span></div>'+
        '</div>').join('')+'</div>').join('');
  }

  function renderPillars(el){
    el.innerHTML=R.pillars.map(p=>{
      const col=h=>'<div class="kf'+(h===p.h2?' kf-gold':'')+'"><div class="kf-n" style="color:'+p.color+'">'+esc(h[0])+'</div>'+
        '<div class="kf-t">'+esc(h[1])+'</div><p>'+esc(h[2])+'</p></div>';
      return '<div class="ro-pillar reveal" style="margin-top:58px">'+
        '<div class="kick"><span class="num">'+p.code+'</span><span class="tag">'+esc(p.tag)+'</span><span class="ln"></span></div>'+
        '<h3 class="h2 h2-sm" style="font-size:clamp(1.5rem,3.4vw,2.2rem)">'+esc(p.head)+'</h3>'+
        '<p class="lead">'+esc(p.what)+'</p>'+
        '<div class="kf-grid" style="'+autofit('250px')+';margin-top:22px">'+
        col(p.today)+col(p.h1)+col(p.h2)+'</div>'+
        '<div class="prow" style="margin-top:14px"><span class="pl">How we measure it</span></div>'+
        chips(p.metrics)+
        '</div>';
    }).join('');
  }

  function renderPhaseKey(el){
    el.style.cssText='display:flex;flex-wrap:wrap;gap:10px;margin-top:10px';
    el.innerHTML=R.phases.map(p=>
      '<span class="haveitem" style="border-color:'+p[3]+';color:'+p[3]+'"><b>'+p[0]+'</b> · '+esc(p[1])+' · '+esc(p[2])+'</span>').join('');
  }

  function renderQuarters(el){
    el.className='kf-grid';
    el.style.cssText=autofit('300px');
    el.innerHTML=R.quarters.map((q,i)=>{
      const ph=R.phases[q.phase];
      return '<div class="lhc reveal" style="border-top-color:'+ph[3]+';--d:'+(i*0.03)+'s">'+
        '<div class="who" style="color:'+ph[3]+'">'+q.q+' · '+esc(q.when)+' · '+ph[0]+'</div>'+
        '<h4>'+esc(q.theme)+'</h4>'+
        '<div class="m" style="margin-top:10px"><span class="k">Target maturity</span><span class="vv val">'+esc(q.level)+'</span></div>'+
        '<ul class="creds" style="margin-top:12px">'+q.goals.map(g=>'<li style="font-size:.88rem">'+esc(g)+'</li>').join('')+'</ul>'+
        '<div class="m" style="margin-top:14px"><span class="k">How we measure</span><span class="vv">'+esc(q.measure)+'</span></div>'+
        '</div>';
    }).join('');
  }

  function render(){
    let el;
    if(el=$('ro-chars')) renderChars(el);
    if(el=$('ro-levels')) renderLevels(el);
    if(el=$('ro-horizons')) renderHorizons(el);
    if(el=$('ro-scorecard')) renderScorecard(el);
    if(el=$('ro-pillars')) renderPillars(el);
    if(el=$('ro-phasekey')) renderPhaseKey(el);
    if(el=$('ro-quarters')) renderQuarters(el);
    /* fill any [data-ro] text slots */
    document.querySelectorAll('[data-ro]').forEach(node=>{
      const path=node.getAttribute('data-ro').split('.');
      let v=R; path.forEach(k=>{ v = (v&&v[k]!=null)?v[k]:v; });
      if(typeof v==='string') node.textContent=v;
    });
  }

  /* ------------------------------------------------------------------
     3 · RUNTIME  (reveals, nav, progress, spotlight) — self-contained
     ------------------------------------------------------------------ */
  function runtime(){
    document.body.classList.add('js');
    const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* reveals */
    const reveals=document.querySelectorAll('.reveal');
    if(reduce){ reveals.forEach(e=>e.classList.add('in')); }
    else{
      const ob=new IntersectionObserver(es=>es.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('in'); ob.unobserve(e.target); } }),{threshold:.12});
      reveals.forEach(e=>ob.observe(e));
    }

    /* nav + progress */
    const nav=$('nav'), prog=$('progress');
    function onScroll(){
      if(nav) nav.classList.toggle('scrolled',scrollY>40);
      if(prog){ const h=document.documentElement.scrollHeight-innerHeight; prog.style.width=(h>0?scrollY/h*100:0)+'%'; }
    }
    addEventListener('scroll',onScroll,{passive:true}); onScroll();

    /* spotlight follows the pointer (fine pointers only) */
    if(matchMedia('(pointer:fine)').matches){
      document.body.classList.add('has-pointer');
      addEventListener('pointermove',e=>{
        document.documentElement.style.setProperty('--mx',e.clientX+'px');
        document.documentElement.style.setProperty('--my',e.clientY+'px');
      },{passive:true});
    }

    /* animation-health fallback: if the timeline is frozen, force end-state */
    setTimeout(()=>{
      const t=document.timeline&&document.timeline.currentTime;
      if(typeof t==='number'&&t>0) return;
      document.body.classList.add('no-anim');
      document.querySelectorAll('.reveal').forEach(e=>e.classList.add('in'));
    },1400);
  }

  function boot(){ render(); runtime(); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot);
  else boot();
})();
