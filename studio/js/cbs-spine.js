/* Client Build Studio — THE SPINE.
   Sections → areas → artifacts → criteria. Everything the app renders comes
   from here. Nothing in this file is HTML and nothing in the HTML is content.

   Lanes and patterns are attached by cbs-lanes.js and cbs-patterns.js, which
   load after this file. Exemplars point into the worked example that ships in
   this repo — the Keystone Lab pitch site one directory up. */
(function (w) {
  'use strict';

  /* Red-team readers. Each one is a lens with a named failure it hunts for. */
  var PERSONAS = [
    {
      id: 'p-cfo', name: 'The Skeptical CFO', short: 'CFO',
      reads_for: 'Money claimed without a source, run-rate hidden inside a pilot, and benefits with no named owner.',
      opens_with: 'What does this cost me in year two, and who is accountable for the number you just showed me?'
    },
    {
      id: 'p-regulator', name: 'The Regulator', short: 'Regulator',
      reads_for: 'Control claims with no evidence behind them, accountability that dissolves under pressure, and "we will govern it" as a promise rather than a mechanism.',
      opens_with: 'Show me the control, not the intention. Who attests, and against what standard?'
    },
    {
      id: 'p-incumbent', name: 'The Incumbent Vendor', short: 'Incumbent',
      reads_for: 'Everything they would say in the room after you leave to keep the account.',
      opens_with: 'We already do this, it is in the platform they bought last year, and switching costs them a year.'
    },
    {
      id: 'p-exec', name: 'The Bored Executive', short: 'Executive',
      reads_for: 'The ask buried below the fold, the first thirty seconds spent on preamble, and any slide that does not change a decision.',
      opens_with: 'I have four minutes. What are you asking me to approve?'
    },
    {
      id: 'p-builder', name: 'The Implementation Lead', short: 'Builder',
      reads_for: 'Anything still undefined at build time — interfaces, owners, data, the definition of done.',
      opens_with: 'I have to build this on Monday. What is still a noun with no verb attached?'
    },
    {
      id: 'p-analyst', name: "The Client's Own Analyst", short: 'Analyst',
      reads_for: 'Numbers that do not reconcile across pages, cherry-picked sources, and a chart whose axis is doing the arguing.',
      opens_with: 'Your figure on page three and your figure on page nine cannot both be true.'
    }
  ];

  function ex(href, label) { return { href: href, label: label }; }

  var SECTIONS = [
    /* ---------------------------------------------------------------- 0 */
    {
      id: 's-commission', n: 0, title: 'Commission',
      settles: 'Who this is for, what decision it drives, what is at stake, and what form it takes.',
      blurb: 'Everything downstream is derived from these answers. Get them thin and the whole build is thin.',
      areas: [
        {
          id: 'a-client', title: 'Client & context',
          purpose: 'Establish who the client is and the situation they are actually in — not the situation the brief describes.',
          questions: [
            'Who is the client, and what business are they in?',
            'What changed recently that makes this live now?',
            'What have they already tried, and what happened?',
            'Who inside the client wants this, and who does not?'
          ],
          exemplar: ex('../index.html#whynow', 'Why now — the situation stated before the offer'),
          expand: 'Add a question here when a class of engagement keeps surfacing context the intake missed. Each new question becomes a field on the Commission and a variable the composer can reach.',
          criteria: [
            { id: 'c-client-1', kind: 'binary', text: 'The context is stated in the client\'s terms, not the seller\'s.', severity: 'high' },
            { id: 'c-client-2', kind: 'binary', text: 'At least one thing that changed recently is named, with a date or a trigger event.' },
            { id: 'c-client-3', kind: 'review', persona: 'p-incumbent', text: 'The incumbent cannot read this and say "nothing has changed".' }
          ],
          artifacts: [
            {
              id: 'af-context', title: 'Context brief', lane: 'any', pattern: 'pat-context-brief',
              outputs: 'A half-page statement of the client\'s situation, what changed, and what they have already tried.',
              weight: 10,
              criteria: [
                { id: 'c-af-context-1', kind: 'evidence', text: 'Every claim about the client\'s situation is Verified against something they said or published, or labelled Proposed.' }
              ]
            }
          ]
        },
        {
          id: 'a-ask', title: 'The ask',
          purpose: 'Name the single decision you are asking someone to make. One sentence. If there are two, you have two engagements.',
          questions: [
            'What is the one decision you want made?',
            'By whom, by when?',
            'What is the smallest version of yes?',
            'What does no cost them?'
          ],
          exemplar: ex('../index.html#decision', 'The 90-day proof — one scale-or-stop decision, six checkable gates'),
          expand: 'If a lane repeatedly needs a different shape of ask (a funding gate vs. a build approval), add an ask type here rather than forking the section.',
          criteria: [
            { id: 'c-ask-1', kind: 'binary', text: 'The ask is one sentence containing a verb the decision-maker can actually perform.', test: 't-ask-one-sentence', severity: 'high' },
            { id: 'c-ask-2', kind: 'binary', text: 'A named role can say yes to it. Not a committee, not "the business".' },
            { id: 'c-ask-3', kind: 'binary', text: 'There is a smallest version of yes that costs less than the full ask.' },
            { id: 'c-ask-4', kind: 'review', persona: 'p-exec', text: 'A reader with four minutes finds the ask without scrolling or hunting.' }
          ],
          artifacts: [
            {
              id: 'af-ask', title: 'The one-sentence ask', lane: 'any', pattern: 'pat-ask',
              outputs: 'One sentence, a named decider, a date, and the smallest version of yes.',
              inputs: ['af-context'], weight: 10,
              criteria: [
                { id: 'c-af-ask-1', kind: 'binary', text: 'Fits in one sentence under 30 words.', test: 't-under-30-words' }
              ]
            }
          ]
        },
        {
          id: 'a-room', title: 'The room',
          purpose: 'Model the people who will be present when the decision is made, including the ones who never speak.',
          questions: [
            'Who is in the room, and what does each of them fear?',
            'Who is the real decider, and who is the real blocker?',
            'What will be said about this after you leave?',
            'What is the one objection you cannot answer yet?'
          ],
          exemplar: ex('../index.html#model', 'Why EY can win — written against what the room already believes'),
          expand: 'Add a persona to the library when a recurring reader is not covered by the six that ship. Personas are data; a new one becomes assignable to review criteria everywhere at once.',
          criteria: [
            { id: 'c-room-1', kind: 'binary', text: 'The real decider and the real blocker are named separately.', severity: 'high' },
            { id: 'c-room-2', kind: 'binary', text: 'At least one objection is written down that the deliverable does not yet answer.' },
            { id: 'c-room-3', kind: 'review', persona: 'p-incumbent', text: 'The after-you-leave conversation is anticipated somewhere in the deliverable.' }
          ],
          artifacts: [
            {
              id: 'af-room', title: 'Room model', lane: 'any', pattern: 'pat-room-model',
              outputs: 'A table of attendees: role, what they want, what they fear, what would make them say no.',
              inputs: ['af-context'], weight: 8,
              criteria: [
                { id: 'c-af-room-1', kind: 'binary', text: 'Every attendee row has a fear, not just a want.' }
              ]
            }
          ]
        },
        {
          id: 'a-lane', title: 'The lane',
          purpose: 'Choose the medium. The method is the same across all six; the artifacts and the publish adapter are not.',
          questions: [
            'What form does this need to take to land with this room?',
            'How long do you have, and how long will they give it?',
            'Does it need to survive being forwarded without you?',
            'Will anyone have to build from it afterwards?'
          ],
          exemplar: ex('../index.html', 'The experience lane, built — a scrollytelling decision site'),
          expand: 'Adding a lane means adding a lane spec, its patterns, and a publish adapter. The sections, areas and criteria above it do not change — that is the test of whether a lane is really a lane.',
          criteria: [
            { id: 'c-lane-1', kind: 'binary', text: 'The lane is chosen for how the room consumes things, not for what you enjoy making.', severity: 'high' },
            { id: 'c-lane-2', kind: 'binary', text: 'If it will be forwarded without you, the deliverable stands alone without narration.' },
            { id: 'c-lane-3', kind: 'review', persona: 'p-builder', text: 'If someone must build from this afterwards, the lane produces something buildable.' }
          ],
          artifacts: [
            {
              id: 'af-lane', title: 'Lane decision', lane: 'any', pattern: 'pat-lane-decision',
              outputs: 'The chosen lane, the reason, and the two lanes rejected with why.',
              inputs: ['af-room'], weight: 7,
              criteria: []
            }
          ]
        }
      ]
    },

    /* ---------------------------------------------------------------- 1 */
    {
      id: 's-frame', n: 1, title: 'Frame',
      settles: 'The one sentence the whole deliverable serves, and the shape of the argument around it.',
      blurb: 'A frame is not a headline. It is the thing every other piece has to earn its place against.',
      areas: [
        {
          id: 'a-decision', title: 'Decision statement',
          purpose: 'Turn the ask into a statement the room can argue with — specific enough to be wrong.',
          questions: [
            'What must be true for them to say yes?',
            'What would prove it, inside the time you have?',
            'What is the falsifiable version of your claim?'
          ],
          exemplar: ex('../index.html#thesis', 'The thesis — own the governed systems layer, or run downstream of it'),
          expand: 'Frames that keep recurring across engagements should be promoted into the pattern library as a named frame, with its own criteria.',
          criteria: [
            { id: 'c-dec-1', kind: 'binary', text: 'The statement is specific enough that a reasonable person could disagree with it.', severity: 'high' },
            { id: 'c-dec-2', kind: 'binary', text: 'What would prove it is named, and is achievable within the stated timeframe.' },
            { id: 'c-dec-3', kind: 'review', persona: 'p-analyst', text: 'The statement does not survive by being too vague to test.' }
          ],
          artifacts: [
            {
              id: 'af-thesis', title: 'Thesis', lane: 'any', pattern: 'pat-thesis',
              outputs: 'The falsifiable claim, what would prove it, and what would disprove it.',
              inputs: ['af-ask'], weight: 10,
              criteria: [
                { id: 'c-af-thesis-1', kind: 'binary', text: 'A disproof condition is stated, not just a proof condition.', severity: 'high' }
              ]
            }
          ]
        },
        {
          id: 'a-audience', title: 'Audience model',
          purpose: 'Write for the reader who decides, at the altitude they actually operate at.',
          questions: [
            'What does this reader already believe?',
            'What vocabulary do they use for this problem?',
            'What altitude do they need — decision, mechanism, or implementation?'
          ],
          exemplar: ex('../index.html#keystone', 'What Keystone is — four things, executive altitude, deep dives beneath'),
          expand: 'Altitude bands are a reusable control. Add one when a lane needs a level the current three do not cover.',
          criteria: [
            { id: 'c-aud-1', kind: 'binary', text: 'The deliverable opens at decision altitude and descends, never the reverse.', severity: 'high' },
            { id: 'c-aud-2', kind: 'binary', text: 'The client\'s own vocabulary is used for the core concepts, not the seller\'s coinages.' },
            { id: 'c-aud-3', kind: 'review', persona: 'p-exec', text: 'Nothing above the fold requires prior context to understand.' }
          ],
          artifacts: [
            {
              id: 'af-audience', title: 'Audience model', lane: 'any', pattern: 'pat-audience',
              outputs: 'Beliefs to work with, beliefs to overturn, vocabulary list, and the altitude ladder.',
              inputs: ['af-room'], weight: 8, criteria: []
            }
          ]
        },
        {
          id: 'a-stakes', title: 'Stakes & the no-lose frame',
          purpose: 'Make the downside of yes small and the downside of no legible. A decision only moves when saying yes is cheap.',
          questions: [
            'What is the smallest committed step?',
            'What does the client keep even if this fails?',
            'What is the cost of doing nothing, in their units?'
          ],
          exemplar: ex('../index.html#nolose', 'Staged as a no-lose option — what survives if it stops'),
          expand: 'The no-lose construction is lane-independent and one of the highest-leverage moves here. Variants belong in the pattern library.',
          criteria: [
            { id: 'c-stk-1', kind: 'binary', text: 'A stop condition is stated — the deliverable says when to kill this.', severity: 'high' },
            { id: 'c-stk-2', kind: 'binary', text: 'What the client retains on failure is named and is worth something.' },
            { id: 'c-stk-3', kind: 'evidence', text: 'The cost of doing nothing is Verified or explicitly labelled Proposed.' },
            { id: 'c-stk-4', kind: 'review', persona: 'p-cfo', text: 'The CFO can see the year-two run rate, not just the pilot price.' }
          ],
          artifacts: [
            {
              id: 'af-nolose', title: 'No-lose framing', lane: 'any', pattern: 'pat-nolose',
              outputs: 'The smallest committed step, what survives failure, the stop condition, and the cost of inaction.',
              inputs: ['af-thesis'], weight: 9,
              criteria: [
                { id: 'c-af-nolose-1', kind: 'binary', text: 'The stop condition is a measurable, not a feeling.', test: 't-has-measure' }
              ]
            }
          ]
        },
        {
          id: 'a-counter', title: 'The counter-case',
          purpose: 'Write the strongest version of the argument against you, in the deliverable, before someone else does it in the room.',
          questions: [
            'What is the best argument for not doing this?',
            'Who benefits from no, and what will they say?',
            'Which of their objections is actually correct?'
          ],
          exemplar: ex('../index.html#adoption', 'Adoption — the objection handled inside the argument'),
          expand: 'Counter-cases are reusable across engagements in the same market. Promote strong ones to patterns.',
          criteria: [
            { id: 'c-cnt-1', kind: 'binary', text: 'The counter-case is stated at full strength, not as a strawman.', severity: 'high' },
            { id: 'c-cnt-2', kind: 'binary', text: 'At least one objection is conceded as correct.' },
            { id: 'c-cnt-3', kind: 'review', persona: 'p-incumbent', text: 'The incumbent\'s best line is already on the page, answered.' }
          ],
          artifacts: [
            {
              id: 'af-counter', title: 'Counter-case', lane: 'any', pattern: 'pat-counter',
              outputs: 'The three strongest arguments against, each with a response or a concession.',
              inputs: ['af-thesis', 'af-room'], weight: 8, criteria: []
            }
          ]
        }
      ]
    },

    /* ---------------------------------------------------------------- 2 */
    {
      id: 's-ground', n: 2, title: 'Ground',
      settles: 'What is true, what is proposed, and how a reader can tell the difference without trusting you.',
      blurb: 'This is the section that makes the rest defensible. Skip it and every number becomes a liability.',
      areas: [
        {
          id: 'a-claims', title: 'Claim registry',
          purpose: 'Register every factual assertion the deliverable makes, with a truth status attached.',
          questions: [
            'What are you asserting as fact?',
            'Which assertions are yours rather than the record\'s?',
            'Which would collapse the argument if wrong?'
          ],
          exemplar: ex('../index.html#sources', 'Sources & evidence — every claim footnoted, in-text superscripts linking back'),
          expand: 'The registry is the single mechanism the Gate enforces. New truth statuses are a schema change, not a content change — think hard before adding one.',
          criteria: [
            { id: 'c-clm-1', kind: 'binary', text: 'Every factual claim carries Verified, Proposed, or Unsourced.', test: 't-claims-all-statused', severity: 'high' },
            { id: 'c-clm-2', kind: 'binary', text: 'Zero claims remain Unsourced at publish.', test: 't-no-unsourced', severity: 'high' },
            { id: 'c-clm-3', kind: 'binary', text: 'Claims that are the author\'s own construct are visibly labelled as proposed, not implied as fact.' },
            { id: 'c-clm-4', kind: 'review', persona: 'p-regulator', text: 'No control or compliance claim is asserted without a mechanism behind it.' }
          ],
          artifacts: [
            {
              id: 'af-claims', title: 'Claim registry', lane: 'any', pattern: 'pat-claims',
              outputs: 'Every claim with an id, its text, truth status, source, and where it appears.',
              inputs: ['af-thesis'], weight: 10,
              criteria: [
                { id: 'c-af-claims-1', kind: 'binary', text: 'Load-bearing claims are flagged — the ones whose failure collapses the argument.' }
              ]
            }
          ]
        },
        {
          id: 'a-sources', title: 'Source discipline',
          purpose: 'Cite what can be checked, at the resolution someone could actually check it.',
          questions: [
            'Is the source primary, or someone reporting a primary?',
            'Would the source survive the client\'s own analyst pulling it up?',
            'Is the number current, and current as of when?'
          ],
          exemplar: ex('../index.html#sources', 'The sources block — EY-public and peer claims footnoted separately'),
          expand: 'Source tiers (primary / reported / vendor / internal) are worth encoding as data once a lane needs to sort by them.',
          criteria: [
            { id: 'c-src-1', kind: 'binary', text: 'Every source is reachable — a URL, a document name, or a named person and date.', severity: 'high' },
            { id: 'c-src-2', kind: 'binary', text: 'Vendor marketing is never cited as evidence for the vendor\'s own capability.' },
            { id: 'c-src-3', kind: 'binary', text: 'Every figure carries an as-of date.' },
            { id: 'c-src-4', kind: 'review', persona: 'p-analyst', text: 'No source is cherry-picked from a document that, read whole, says something else.' }
          ],
          artifacts: [
            {
              id: 'af-sources', title: 'Source appendix', lane: 'any', pattern: 'pat-sources',
              outputs: 'A numbered source list, each with what it supports and an as-of date.',
              inputs: ['af-claims'], weight: 9, criteria: []
            }
          ]
        },
        {
          id: 'a-ontology', title: 'Data ontology',
          purpose: 'Fix the definitions before the numbers. Most reconciliation failures are definition failures.',
          questions: [
            'What are the entities and what exactly counts as one?',
            'Which numbers must reconcile with which?',
            'Where does the client already have a different definition?'
          ],
          exemplar: ex('../roadmap.html', 'The roadmap supplement — one data structure driving every page'),
          expand: 'Ontologies are the most reusable asset across engagements with the same client. Promote them aggressively.',
          criteria: [
            { id: 'c-ont-1', kind: 'binary', text: 'Every metric has a written definition, including what is excluded.', severity: 'high' },
            { id: 'c-ont-2', kind: 'binary', text: 'Numbers that appear more than once reconcile across every appearance.', test: 't-figures-reconcile', severity: 'high' },
            { id: 'c-ont-3', kind: 'review', persona: 'p-analyst', text: 'Two figures in the deliverable cannot be shown to contradict each other.' }
          ],
          artifacts: [
            {
              id: 'af-ontology', title: 'Data ontology', lane: 'any', pattern: 'pat-ontology',
              outputs: 'Entities, metric definitions with exclusions, and the reconciliation map.',
              inputs: ['af-claims'], weight: 7, criteria: []
            }
          ]
        },
        {
          id: 'a-assumptions', title: 'Assumptions register',
          purpose: 'Surface what you are assuming, so the reader argues with the assumption rather than dismissing the conclusion.',
          questions: [
            'What are you assuming that you have not stated?',
            'Which assumption, if wrong, changes the recommendation?',
            'What would you need to see to change your mind?'
          ],
          exemplar: ex('../quarters.html', 'The honest read of the dates — assumptions stated, phases re-dated'),
          expand: 'A key-assumptions check is a standard tradecraft move. Encode named check types here as they prove useful.',
          criteria: [
            { id: 'c-asm-1', kind: 'binary', text: 'Every load-bearing assumption is written down where the reader can see it.', severity: 'high' },
            { id: 'c-asm-2', kind: 'binary', text: 'For each, what would falsify it is stated.' },
            { id: 'c-asm-3', kind: 'review', persona: 'p-regulator', text: 'No assumption is doing silent work inside a control claim.' }
          ],
          artifacts: [
            {
              id: 'af-assumptions', title: 'Assumptions register', lane: 'any', pattern: 'pat-assumptions',
              outputs: 'Each assumption, its impact if wrong, and its falsifier.',
              inputs: ['af-thesis'], weight: 7, criteria: []
            }
          ]
        }
      ]
    },

    /* ---------------------------------------------------------------- 3 */
    {
      id: 's-shape', n: 3, title: 'Shape',
      settles: 'The order the argument is experienced in, and what carries the reader between parts.',
      blurb: 'Structure is an argument. The order you reveal things in is doing as much work as the things themselves.',
      areas: [
        {
          id: 'a-spine', title: 'Narrative spine',
          purpose: 'Sequence the argument so each part earns the next. If a part can be cut without breaking the chain, cut it.',
          questions: [
            'What is the minimum chain of parts from problem to ask?',
            'Which part can be removed without the argument collapsing?',
            'Where does the reader most likely stop reading?'
          ],
          exemplar: ex('../index.html', 'Seven executive parts, each with supporting detail beneath it'),
          expand: 'Spine shapes (decision-first, chronological, problem-solution, options-tradeoff) are patterns. Add one when a lane needs it.',
          criteria: [
            { id: 'c-spn-1', kind: 'binary', text: 'Every part earns the next — no part is there only because the format expects it.', severity: 'high' },
            { id: 'c-spn-2', kind: 'binary', text: 'The ask appears in the first part and again in the last.' },
            { id: 'c-spn-3', kind: 'review', persona: 'p-exec', text: 'A reader who stops a third of the way through has still received the argument.' }
          ],
          artifacts: [
            {
              id: 'af-spine', title: 'Narrative spine', lane: 'any', pattern: 'pat-spine',
              outputs: 'The ordered parts, what each one earns, and the cut list.',
              inputs: ['af-thesis', 'af-audience'], weight: 10, criteria: []
            }
          ]
        },
        {
          id: 'a-throughline', title: 'Through-line',
          purpose: 'Find the single image or mechanism that carries the whole thing, and use it structurally rather than decoratively.',
          questions: [
            'What is the one image that explains the mechanism?',
            'Does it hold at every altitude, or break under detail?',
            'Is it doing structural work, or is it ornament?'
          ],
          exemplar: ex('../index.html#keystone', 'The keystone — one image that survives from hero to CTA and carries the mechanism'),
          expand: 'A through-line that survives a whole engagement is rare and valuable. Promote it with its failure modes documented.',
          criteria: [
            { id: 'c-thr-1', kind: 'binary', text: 'The through-line explains the mechanism, not just the mood.', severity: 'high' },
            { id: 'c-thr-2', kind: 'binary', text: 'It holds under detail — it does not break when the reader descends an altitude.' },
            { id: 'c-thr-3', kind: 'review', persona: 'p-builder', text: 'The metaphor does not hide a decision that still has to be made.' }
          ],
          artifacts: [
            {
              id: 'af-throughline', title: 'Through-line', lane: 'any', pattern: 'pat-throughline',
              outputs: 'The image, what it maps to, where it holds, and where it breaks.',
              inputs: ['af-spine'], weight: 7, criteria: []
            }
          ]
        },
        {
          id: 'a-sectionmap', title: 'Section map',
          purpose: 'Turn the spine into named parts with a job each, so drafting has a target rather than a mood.',
          questions: [
            'What is each part called, and what is its one job?',
            'What does the reader know at the end of it that they did not before?',
            'What is the transition into the next part?'
          ],
          exemplar: ex('../index.html#lighthouse', 'What it proves first — a part with exactly one job'),
          expand: 'Section maps differ most between lanes. This is where lane specificity legitimately enters the method.',
          criteria: [
            { id: 'c-map-1', kind: 'binary', text: 'Every part has exactly one job, written down.', severity: 'high' },
            { id: 'c-map-2', kind: 'binary', text: 'No two parts have the same job.' },
            { id: 'c-map-3', kind: 'review', persona: 'p-builder', text: 'Someone could build each part from its entry without asking what it is for.' }
          ],
          artifacts: [
            {
              id: 'af-sectionmap', title: 'Section map', lane: 'any', pattern: 'pat-sectionmap',
              outputs: 'Each part: name, job, what the reader gains, and the transition out.',
              inputs: ['af-spine'], weight: 9, criteria: []
            }
          ]
        },
        {
          id: 'a-disclosure', title: 'Progressive disclosure',
          purpose: 'Let the executive read the top layer and the builder descend, without either being served the other\'s document.',
          questions: [
            'What belongs above the fold and what belongs beneath?',
            'How does a reader descend, and how do they get back?',
            'What does the skimmer take away?'
          ],
          exemplar: ex('../index.html#lab', 'Deep dives beneath the executive layer, with back-navigation preserved'),
          expand: 'Disclosure mechanics are lane-specific (an appendix, a deep-dive page, a speaker note). Add mechanisms per lane.',
          criteria: [
            { id: 'c-dsc-1', kind: 'binary', text: 'The top layer is complete on its own — detail is optional, not required.', severity: 'high' },
            { id: 'c-dsc-2', kind: 'binary', text: 'Every descent has a return path back to where the reader was.' },
            { id: 'c-dsc-3', kind: 'review', persona: 'p-exec', text: 'The skimmer gets the argument without opening anything.' }
          ],
          artifacts: [
            {
              id: 'af-disclosure', title: 'Disclosure plan', lane: 'any', pattern: 'pat-disclosure',
              outputs: 'The layer map: what is surface, what is deep, and how the reader moves between them.',
              inputs: ['af-sectionmap'], weight: 6, criteria: []
            }
          ]
        }
      ]
    },

    /* ---------------------------------------------------------------- 4 */
    {
      id: 's-make', n: 4, title: 'Make',
      settles: 'The actual pieces, drafted against a pattern and grounded in the registry.',
      blurb: 'This is the only section whose artifacts change by lane. Everything above and below it is media-neutral.',
      areas: [
        {
          id: 'a-lane-artifacts', title: 'Lane artifacts',
          purpose: 'Draft the pieces this medium is made of, each against a named pattern.',
          questions: [
            'What are the pieces this lane requires?',
            'Which pattern does each piece follow?',
            'Which pieces are load-bearing and which are supporting?'
          ],
          exemplar: ex('../index.html#products', 'Three banking demonstrators — the load-bearing pieces of the experience lane'),
          expand: 'This area holds the lane-scoped artifacts. Adding a pattern to a lane makes it draftable here immediately.',
          criteria: [
            { id: 'c-lna-1', kind: 'binary', text: 'Every piece follows a named pattern rather than being improvised.', severity: 'high' },
            { id: 'c-lna-2', kind: 'binary', text: 'Load-bearing pieces are drafted before supporting ones.' },
            { id: 'c-lna-3', kind: 'evidence', text: 'Every factual assertion in every piece resolves to a registry claim.' },
            { id: 'c-lna-4', kind: 'review', persona: 'p-builder', text: 'Nothing is left as a placeholder that a reader would mistake for content.' }
          ],
          artifacts: [] /* populated per-lane by cbs-patterns.js */
        },
        {
          id: 'a-visual', title: 'Visual system',
          purpose: 'Decide the visual language once, so every piece inherits it instead of negotiating it.',
          questions: [
            'What are the tokens — colour, type, spacing, motion?',
            'What does the system signal about the sender?',
            'What is the accessible contrast floor?'
          ],
          exemplar: ex('../css/keystone.css', 'The design system — tokens in :root, one navy ground, one metallic gold'),
          expand: 'A visual system per client is worth keeping. Promote token sets to the pattern library as named themes.',
          criteria: [
            { id: 'c-vis-1', kind: 'binary', text: 'Tokens are defined once and referenced everywhere — no ad-hoc values in pieces.', severity: 'high' },
            { id: 'c-vis-2', kind: 'binary', text: 'Body text meets at least 4.5:1 contrast against its ground.', test: 't-contrast-floor' },
            { id: 'c-vis-3', kind: 'binary', text: 'Motion is decorative only — nothing is understandable solely through animation.' },
            { id: 'c-vis-4', kind: 'review', persona: 'p-exec', text: 'The visual system reads as the client\'s register, not the agency\'s showreel.' }
          ],
          artifacts: [
            {
              id: 'af-visual', title: 'Visual system', lane: 'any', pattern: 'pat-visual',
              outputs: 'Token set, type scale, contrast floor, and the motion policy.',
              inputs: ['af-audience'], weight: 6, criteria: []
            }
          ]
        },
        {
          id: 'a-evidence-viz', title: 'Charts & evidence',
          purpose: 'Show numbers in the form that makes them checkable, not the form that makes them impressive.',
          questions: [
            'What is the comparison the reader actually needs to make?',
            'Does the axis start where honesty requires?',
            'Can the figure be read without the caption?'
          ],
          exemplar: ex('../maturity.html', 'Seven pillars charted across three horizons, each with the metric that proves the move'),
          expand: 'Chart patterns belong here with their honesty criteria attached, so a new chart type arrives pre-constrained.',
          criteria: [
            { id: 'c-viz-1', kind: 'binary', text: 'Every chart states the comparison it is making, in words.', severity: 'high' },
            { id: 'c-viz-2', kind: 'binary', text: 'No truncated axis without an explicit break marker.' },
            { id: 'c-viz-3', kind: 'evidence', text: 'Every figure in every chart resolves to a registry claim with a source.' },
            { id: 'c-viz-4', kind: 'review', persona: 'p-analyst', text: 'No chart\'s visual encoding overstates the size of the effect.' }
          ],
          artifacts: [
            {
              id: 'af-charts', title: 'Evidence figures', lane: 'any', pattern: 'pat-charts',
              outputs: 'Each figure: the comparison, the encoding, the source claims, and the caption.',
              inputs: ['af-claims', 'af-ontology'], weight: 7, criteria: []
            }
          ]
        },
        {
          id: 'a-moments', title: 'Interactive moments',
          purpose: 'Spend interactivity where it changes belief. Everywhere else it is a cost.',
          questions: [
            'Which single moment would change what the reader believes?',
            'Does the moment work if the interaction fails?',
            'Is anything essential reachable only through interaction?'
          ],
          exemplar: ex('../index.html#trust', 'The Gate — a mechanism the reader operates rather than reads about'),
          expand: 'Interactive moments are expensive. Promote one only when it has demonstrably moved a room.',
          criteria: [
            { id: 'c-mom-1', kind: 'binary', text: 'Nothing essential is reachable only through interaction.', severity: 'high' },
            { id: 'c-mom-2', kind: 'binary', text: 'Every interactive moment degrades to a static state that still communicates.' },
            { id: 'c-mom-3', kind: 'binary', text: 'Every interactive moment is keyboard-operable.' },
            { id: 'c-mom-4', kind: 'review', persona: 'p-builder', text: 'The moment is buildable in the time available, or it is cut.' }
          ],
          artifacts: [
            {
              id: 'af-moments', title: 'Interaction plan', lane: 'any', pattern: 'pat-moments',
              outputs: 'Each moment: the belief it changes, its static fallback, and its keyboard path.',
              inputs: ['af-sectionmap'], weight: 5, criteria: []
            }
          ]
        }
      ]
    },

    /* ---------------------------------------------------------------- 5 */
    {
      id: 's-prove', n: 5, title: 'Prove',
      settles: 'Nothing ships uncertified. The Gate is the mechanism, not the intention.',
      blurb: 'The criteria were written before the draft existed. That is what makes this a test rather than a review.',
      areas: [
        {
          id: 'a-criteria-run', title: 'Criteria run',
          purpose: 'Walk every criterion on every in-scope artifact and record a real result.',
          questions: [
            'Which criteria pass, and which are you hoping nobody checks?',
            'Which failures are cosmetic and which are structural?',
            'What did you change as a result?'
          ],
          exemplar: ex('../index.html#decision', 'Six checkable yes/no gates — the criteria model this section generalises'),
          expand: 'A criterion that never fails is not pulling its weight. Retire it, or sharpen it until it can fail.',
          criteria: [
            { id: 'c-crt-1', kind: 'binary', text: 'Every in-scope criterion has a recorded result — no blanks.', test: 't-criteria-complete', severity: 'high' },
            { id: 'c-crt-2', kind: 'binary', text: 'At least one criterion failed on first run and was fixed. If none did, the criteria are too soft.' },
            { id: 'c-crt-3', kind: 'binary', text: 'High-severity failures are fixed, not waived.' }
          ],
          artifacts: [
            {
              id: 'af-criteria-run', title: 'Criteria run report', lane: 'any', pattern: 'pat-criteria-run',
              outputs: 'Every criterion, its result, and what changed because of it.',
              inputs: ['af-lane', 'af-nolose', 'af-counter', 'af-sources', 'af-ontology',
                       'af-assumptions', 'af-throughline', 'af-disclosure', 'af-visual',
                       'af-charts', 'af-robustness'],
              weight: 9, criteria: []
            }
          ]
        },
        {
          id: 'a-redteam', title: 'Red team',
          purpose: 'Read the deliverable as each assigned persona and record what they would actually say.',
          questions: [
            'What does each persona find first?',
            'Which finding is legitimate?',
            'What did you change, and what did you consciously accept?'
          ],
          exemplar: ex('../index.html#adoption', 'Objections handled inside the argument rather than deferred to Q&A'),
          expand: 'New personas are the cheapest expansion in the whole method — one data entry, assignable everywhere.',
          criteria: [
            { id: 'c-red-1', kind: 'binary', text: 'Every assigned persona has been run and its findings recorded.', test: 't-personas-run', severity: 'high' },
            { id: 'c-red-2', kind: 'binary', text: 'Each finding is resolved, conceded, or explicitly accepted with a reason.' },
            { id: 'c-red-3', kind: 'binary', text: 'No finding is closed by asserting the persona is wrong without evidence.' }
          ],
          artifacts: [
            {
              id: 'af-redteam', title: 'Red team findings', lane: 'any', pattern: 'pat-redteam',
              outputs: 'Per persona: findings, severity, resolution, and what was accepted.',
              inputs: ['af-criteria-run'], weight: 9, criteria: []
            }
          ]
        },
        {
          id: 'a-gate', title: 'The Gate',
          purpose: 'Certify each artifact. Certification is mechanical: it either passes the stated rule or it does not.',
          questions: [
            'Does every binary criterion pass?',
            'Are there zero Unsourced claims?',
            'Is every persona review resolved?'
          ],
          exemplar: ex('../index.html#trust', 'The Keystone Gate — six-step certification minting a passport with an evidence hash'),
          expand: 'The Gate rule itself is deliberately hard to change. Adding a stage is a schema-level decision, not a content one.',
          criteria: [
            { id: 'c-gat-1', kind: 'binary', text: 'Every published artifact carries a passport.', test: 't-all-gated', severity: 'high' },
            { id: 'c-gat-2', kind: 'binary', text: 'No artifact was certified with a waived high-severity criterion.', severity: 'high' },
            { id: 'c-gat-3', kind: 'review', persona: 'p-regulator', text: 'The certification record would survive being asked to produce evidence.' }
          ],
          artifacts: [
            {
              id: 'af-passports', title: 'Artifact passports', lane: 'any', pattern: 'pat-passport',
              outputs: 'One passport per certified artifact: stamps, criteria results, claim statuses, evidence hash.',
              inputs: ['af-redteam'], weight: 10, criteria: []
            }
          ]
        },
        {
          id: 'a-robustness', title: 'Accessibility & robustness',
          purpose: 'The deliverable has to work for the reader who is not using it the way you imagined.',
          questions: [
            'Does it work by keyboard alone?',
            'Does it work with motion reduced, with a slow connection, printed?',
            'Does it work when the clever part fails?'
          ],
          exemplar: ex('../README.md', 'Robustness notes — progressive enhancement, animation-health fallback, reduced motion'),
          expand: 'Robustness criteria are lane-specific in their mechanics but universal in their intent. Add per-lane checks here.',
          criteria: [
            { id: 'c-rob-1', kind: 'binary', text: 'Fully operable by keyboard, in reading order.', severity: 'high' },
            { id: 'c-rob-2', kind: 'binary', text: 'prefers-reduced-motion is honoured and the content still makes sense.' },
            { id: 'c-rob-3', kind: 'binary', text: 'Every enhancement degrades — nothing essential is lost when it fails.' },
            { id: 'c-rob-4', kind: 'binary', text: 'Readable at the smallest viewport or page size the room will actually use.' }
          ],
          artifacts: [
            {
              id: 'af-robustness', title: 'Robustness check', lane: 'any', pattern: 'pat-robustness',
              outputs: 'The degradation matrix: each enhancement, its failure mode, and its fallback.',
              inputs: ['af-moments'], weight: 6, criteria: []
            }
          ]
        }
      ]
    },

    /* ---------------------------------------------------------------- 6 */
    {
      id: 's-publish', n: 6, title: 'Publish',
      settles: 'It leaves the building — assembled, portable, and buildable by someone else.',
      blurb: 'Three outputs, because a deliverable that cannot be resumed or extended is a dead end.',
      areas: [
        {
          id: 'a-assembly', title: 'Assembly',
          purpose: 'Assemble certified artifacts into the lane\'s deliverable. Only certified artifacts are eligible.',
          questions: [
            'Which artifacts are certified and in scope?',
            'Does the assembled whole still read as one voice?',
            'Does it stand alone without you narrating it?'
          ],
          exemplar: ex('../index.html', 'The assembled deliverable — one page carrying the whole argument'),
          expand: 'Each lane\'s publish adapter lives here. A new lane is not finished until its adapter produces something openable.',
          criteria: [
            { id: 'c-asy-1', kind: 'binary', text: 'Only certified artifacts appear in the deliverable.', test: 't-only-certified', severity: 'high' },
            { id: 'c-asy-2', kind: 'binary', text: 'The assembled deliverable reads as one voice, not as stitched fragments.' },
            { id: 'c-asy-3', kind: 'binary', text: 'It stands alone — a reader who was not in the room understands the ask.' },
            { id: 'c-asy-4', kind: 'review', persona: 'p-exec', text: 'Forwarded with no covering note, it still lands.' }
          ],
          artifacts: [
            {
              id: 'af-deliverable', title: 'The deliverable', lane: 'any', pattern: 'pat-deliverable',
              outputs: 'The assembled, self-contained deliverable in the lane\'s format.',
              inputs: ['af-passports'], weight: 10, criteria: []
            }
          ]
        },
        {
          id: 'a-memory', title: 'Memory export',
          purpose: 'Export the engagement so it can be resumed, forked, or audited later.',
          questions: [
            'Can someone else pick this up from the export alone?',
            'Does the export carry the claims and their sources?',
            'Does it carry why things were decided, not just what?'
          ],
          exemplar: ex('../js/keystone-roadmap.js', 'One data structure that is both the memory and the renderer'),
          expand: 'The export format is the interoperability surface. Version it deliberately and never break it silently.',
          criteria: [
            { id: 'c-mem-1', kind: 'binary', text: 'The export re-imports to the same state it was taken from.', test: 't-roundtrip', severity: 'high' },
            { id: 'c-mem-2', kind: 'binary', text: 'Claims, sources and criteria results are all carried, not just the prose.' },
            { id: 'c-mem-3', kind: 'binary', text: 'Decisions carry their reasons.' }
          ],
          artifacts: [
            {
              id: 'af-memory', title: 'engagement.json', lane: 'any', pattern: 'pat-memory',
              outputs: 'The complete portable engagement record.',
              inputs: ['af-deliverable'], weight: 8, criteria: []
            }
          ]
        },
        {
          id: 'a-handoff', title: 'Build order & handoff',
          purpose: 'Produce the instructions that let an agent or a team build the full thing from here.',
          questions: [
            'What would someone need to build this at full scale?',
            'What are the acceptance tests?',
            'What is the file-by-file order?'
          ],
          exemplar: ex('../README.md', 'The repo README — structure, contracts, and what to preserve when editing'),
          expand: 'The build order is where the studio hands off to agentic coding tools. Keep its prompts explicit and its criteria attached.',
          criteria: [
            { id: 'c-hnd-1', kind: 'binary', text: 'The build order names every file and what goes in it.', severity: 'high' },
            { id: 'c-hnd-2', kind: 'binary', text: 'The criteria travel with it as acceptance tests.' },
            { id: 'c-hnd-3', kind: 'review', persona: 'p-builder', text: 'A builder could start on Monday without asking a clarifying question.' }
          ],
          artifacts: [
            {
              id: 'af-buildorder', title: 'BUILD-ORDER.md', lane: 'any', pattern: 'pat-buildorder',
              outputs: 'Repo layout, file-by-file build order, tokens, acceptance criteria, and a prompt per file.',
              inputs: ['af-memory'], weight: 8, criteria: []
            }
          ]
        }
      ]
    },

    /* ---------------------------------------------------------------- 7 */
    {
      id: 's-expand', n: 7, title: 'Expand',
      settles: 'How the playbook grows — the part that makes this an application rather than a document.',
      blurb: 'Every engagement should leave the method better than it found it, or the method is just overhead.',
      areas: [
        {
          id: 'a-diagnose', title: 'Gap diagnosis',
          purpose: 'Let the app audit itself and say what is missing, rather than waiting to be told.',
          questions: [
            'Which areas produced nothing this engagement?',
            'Which criteria never fired?',
            'What did you do by hand that the method did not cover?'
          ],
          exemplar: ex('../quarters.html', 'The honest read — stating where the plan does not hold'),
          expand: 'Every new diagnostic check is a permanent improvement. Add one whenever a gap is found the hard way.',
          criteria: [
            { id: 'c-dia-1', kind: 'binary', text: 'The diagnosis ran and its findings were read, not dismissed.', severity: 'high' },
            { id: 'c-dia-2', kind: 'binary', text: 'Work done by hand outside the method is recorded as a gap.' }
          ],
          artifacts: [
            {
              id: 'af-diagnosis', title: 'Gap report', lane: 'any', pattern: 'pat-diagnosis',
              outputs: 'Structural gaps, unused areas, unfired criteria, and manual work that escaped the method.',
              inputs: ['af-criteria-run'], weight: 5, criteria: []
            }
          ]
        },
        {
          id: 'a-proposals', title: 'Node proposals',
          purpose: 'Let the agent propose new areas and artifacts into the spine — and let a human accept, edit, or reject each one.',
          questions: [
            'What area should exist that does not?',
            'Does the proposal conform to the schema?',
            'Is this general, or is it specific to this one client?'
          ],
          exemplar: ex('../index.html#flywheel', 'The flywheel — a system designed to compound rather than repeat'),
          expand: 'This is the expansion mechanism itself. Proposals land in an overlay; the shipped spine is never written by the browser.',
          criteria: [
            { id: 'c-prp-1', kind: 'binary', text: 'Every accepted proposal validates against the schema.', test: 't-proposal-valid', severity: 'high' },
            { id: 'c-prp-2', kind: 'binary', text: 'No proposal was auto-accepted — every one was reviewed by a human.', severity: 'high' },
            { id: 'c-prp-3', kind: 'binary', text: 'Client-specific material was kept out of the general spine.' }
          ],
          artifacts: [
            {
              id: 'af-proposals', title: 'Accepted proposals', lane: 'any', pattern: 'pat-proposal',
              outputs: 'The spine overlay: new areas and artifacts, each with its provenance stamp.',
              inputs: ['af-diagnosis'], weight: 5, criteria: []
            }
          ]
        },
        {
          id: 'a-promotion', title: 'Pattern promotion',
          purpose: 'Promote an artifact that worked into a reusable pattern, so the next engagement starts further along.',
          questions: [
            'Which artifact would you want to start from next time?',
            'What is general about it, and what was client-specific?',
            'What criteria should travel with it?'
          ],
          exemplar: ex('../index.html#shape', 'The scale path — designed so each stage makes the next cheaper'),
          expand: 'Promotion is what makes the playbook compound. A pattern with no criteria attached is not ready to promote.',
          criteria: [
            { id: 'c-pro-1', kind: 'binary', text: 'Every promoted pattern carries its own criteria.', severity: 'high' },
            { id: 'c-pro-2', kind: 'binary', text: 'Client-identifying material is stripped before promotion.', severity: 'high' },
            { id: 'c-pro-3', kind: 'binary', text: 'The pattern is stated generally enough to apply to a different client.' }
          ],
          artifacts: [
            {
              id: 'af-promoted', title: 'Promoted patterns', lane: 'any', pattern: 'pat-promotion',
              outputs: 'New library patterns, each with criteria and a worked example.',
              inputs: ['af-proposals'], weight: 5, criteria: []
            }
          ]
        }
      ]
    }
  ];

  w.CBS_SPINE = {
    spineVersion: '1.0.0',
    meta: {
      name: 'Client Build Studio',
      tagline: 'Build anything for a client — framed, grounded, certified, published.',
      exemplar: {
        title: 'The Keystone Lab',
        href: '../index.html',
        note: 'The worked example that ships with this studio: a decision-first pitch site built by this method. Every area links to the place in it where that move is visible.'
      }
    },
    personas: PERSONAS,
    lanes: [],     /* filled by cbs-lanes.js */
    patterns: [],  /* filled by cbs-patterns.js */
    sections: SECTIONS
  };
})(window);
