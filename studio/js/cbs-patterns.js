/* Client Build Studio — the pattern library and the intake contract.

   A pattern is a template with a shape: an ordered list of parts, each with a
   heading, a hint for the human, and a `fill` string the deterministic composer
   resolves against the engagement. Tokens are {{name}} and resolve from intake
   answers or upstream artifact outputs. Unresolved tokens become explicit
   [NEEDS ...] markers rather than silently disappearing — a draft is allowed to
   be incomplete, but it is never allowed to look complete when it is not. */
(function (w) {
  'use strict';

  /* ---------------------------------------------------------------- intake */
  /* The Commission. Six questions, asked one at a time. Every token the
     composer can reach originates here. */
  var INTAKE = [
    {
      id: 'client', label: 'Who is the client?',
      hint: 'Name them, and say what business they are actually in.',
      placeholder: 'A tier-one retail bank, mid-Atlantic, 14m customers',
      tokens: ['client']
    },
    {
      id: 'trigger', label: 'What changed?',
      hint: 'The recent event that makes this live now. A date or a trigger, not a trend.',
      placeholder: 'Their model risk committee rejected the third agentic pilot in March',
      tokens: ['trigger']
    },
    {
      id: 'decision', label: 'What decision are you asking for?',
      hint: 'One sentence, with a verb the decider can actually perform.',
      placeholder: 'Fund a 90-day governed-agent proof at £400k, scale-or-stop at the end',
      tokens: ['decision']
    },
    {
      id: 'decider', label: 'Who decides, and by when?',
      hint: 'A named role. Not a committee, not "the business".',
      placeholder: 'Group COO, at the April board',
      tokens: ['decider']
    },
    {
      id: 'stakes', label: 'What does no cost them?',
      hint: 'The cost of doing nothing, in their units.',
      placeholder: 'Another year of pilots that never clear model risk, while two competitors ship',
      tokens: ['stakes']
    },
    {
      id: 'lane', label: 'What form does this take?',
      hint: 'How the room consumes things — not what you enjoy making.',
      type: 'lane',
      tokens: ['lane']
    }
  ];

  function P(id, title, lane, purpose, parts, extra) {
    var p = { id: id, title: title, lane: lane, purpose: purpose, sections: parts };
    if (extra) for (var k in extra) if (extra.hasOwnProperty(k)) p[k] = extra[k];
    return p;
  }

  /* ------------------------------------------------- method patterns (any) */
  var METHOD = [
    P('pat-context-brief', 'Context brief', 'any',
      'States the client\'s situation in their terms before any offer is made.', [
        { h: 'The situation', hint: 'Where they are, in their vocabulary.', fill: '{{client}} is operating in a situation that has recently changed.' },
        { h: 'What changed', hint: 'The trigger, with a date.', fill: '{{trigger}}' },
        { h: 'What has been tried', hint: 'Prior attempts and what happened to them.', fill: '[NEEDS EVIDENCE: what they have already tried, and the outcome]' },
        { h: 'Who wants this', hint: 'Internal sponsor and internal resistance.', fill: '[NEEDS EVIDENCE: internal sponsor, and who benefits from no]' }
      ]),

    P('pat-ask', 'The one-sentence ask', 'any',
      'The single decision, the named decider, the date, and the cheapest version of yes.', [
        { h: 'The ask', hint: 'One sentence. Under 30 words.', fill: '{{decision}}' },
        { h: 'Who decides', hint: 'A named role and a date.', fill: '{{decider}}' },
        { h: 'The smallest yes', hint: 'A cheaper version they could approve today.', fill: '[NEEDS DECISION: the smallest version of yes, and what it costs]' },
        { h: 'What no costs', hint: 'In their units.', fill: '{{stakes}}' }
      ]),

    P('pat-room-model', 'Room model', 'any',
      'Everyone present when the decision is made, including the silent ones.', [
        { h: 'The decider', hint: 'Who can actually say yes.', fill: '{{decider}}' },
        { h: 'The blocker', hint: 'Who can stop it without saying no out loud.', fill: '[NEEDS DECISION: who blocks, and what they fear]' },
        { h: 'The table', hint: 'Role · wants · fears · what makes them say no.', fill: '[NEEDS EVIDENCE: attendee table — each row needs a fear, not just a want]' },
        { h: 'After you leave', hint: 'What gets said in the room once you are gone.', fill: '[NEEDS DECISION: the after-you-leave conversation]' }
      ]),

    P('pat-lane-decision', 'Lane decision', 'any',
      'The medium chosen, and the two rejected with reasons.', [
        { h: 'Chosen', hint: 'The lane and why this room consumes it.', fill: 'This engagement runs in the {{lane}} lane.' },
        { h: 'Rejected', hint: 'Two lanes considered and why not.', fill: '[NEEDS DECISION: two lanes rejected, with reasons]' },
        { h: 'Survives forwarding', hint: 'Does it stand alone without you?', fill: '[NEEDS DECISION: whether it must survive being forwarded unnarrated]' }
      ]),

    P('pat-thesis', 'Thesis', 'any',
      'The falsifiable claim, plus what would prove and disprove it.', [
        { h: 'The claim', hint: 'Specific enough that a reasonable person could disagree.', fill: '[NEEDS DECISION: the falsifiable claim behind "{{decision}}"]' },
        { h: 'What would prove it', hint: 'Achievable inside the timeframe.', fill: '[NEEDS DECISION: the proof condition]' },
        { h: 'What would disprove it', hint: 'The disproof condition. Required, not optional.', fill: '[NEEDS DECISION: the disproof condition]' }
      ]),

    P('pat-audience', 'Audience model', 'any',
      'What the reader believes, the words they use, and the altitude they operate at.', [
        { h: 'Already believes', hint: 'Work with these.', fill: '[NEEDS EVIDENCE: what {{decider}} already believes about this]' },
        { h: 'Must overturn', hint: 'The belief in the way.', fill: '[NEEDS DECISION: the belief that has to change]' },
        { h: 'Their vocabulary', hint: 'Their words for the core concepts, not yours.', fill: '[NEEDS EVIDENCE: the client\'s own terms]' },
        { h: 'Altitude ladder', hint: 'Decision → mechanism → implementation.', fill: 'Opens at decision altitude for {{decider}}, descends to mechanism, then implementation.' }
      ]),

    P('pat-nolose', 'No-lose framing', 'any',
      'Smallest committed step, what survives failure, and the stop condition.', [
        { h: 'Smallest step', hint: 'The cheapest committed move.', fill: '[NEEDS DECISION: the smallest committed step]' },
        { h: 'What survives failure', hint: 'What they keep if this stops.', fill: '[NEEDS DECISION: what {{client}} retains if this is stopped]' },
        { h: 'Stop condition', hint: 'A measurable kill metric.', fill: '[NEEDS DECISION: the measurable stop condition]' },
        { h: 'Cost of inaction', hint: 'In their units.', fill: '{{stakes}}' }
      ]),

    P('pat-counter', 'Counter-case', 'any',
      'The three strongest arguments against, at full strength.', [
        { h: 'Strongest objection', hint: 'Steelmanned, not strawmanned.', fill: '[NEEDS DECISION: the best argument against this]' },
        { h: 'Second and third', hint: 'Two more, honestly stated.', fill: '[NEEDS DECISION: two further objections]' },
        { h: 'Conceded', hint: 'At least one objection that is simply correct.', fill: '[NEEDS DECISION: the objection you concede]' },
        { h: 'The incumbent\'s line', hint: 'What they say to keep the account.', fill: '[NEEDS EVIDENCE: the incumbent\'s displacement argument]' }
      ]),

    P('pat-claims', 'Claim registry', 'any',
      'Every factual assertion with a truth status and a source.', [
        { h: 'Registry', hint: 'id · claim · status · source · where it appears.', fill: '[REGISTRY: claims are added as the deliverable is drafted]' },
        { h: 'Load-bearing', hint: 'Claims whose failure collapses the argument.', fill: '[NEEDS DECISION: which claims are load-bearing]' },
        { h: 'Proposed constructs', hint: 'Your own frameworks, labelled as such.', fill: '[NEEDS DECISION: which claims are your construct rather than the record\'s]' }
      ], { registry: true }),

    P('pat-sources', 'Source appendix', 'any',
      'Numbered sources, each with what it supports and an as-of date.', [
        { h: 'Sources', hint: 'Reachable: a URL, a document, or a named person and date.', fill: '[REGISTRY: sources accumulate from the claim registry]' },
        { h: 'As-of dates', hint: 'Every figure carries one.', fill: '[NEEDS EVIDENCE: as-of dates for every figure]' }
      ], { registry: true }),

    P('pat-ontology', 'Data ontology', 'any',
      'Definitions before numbers, and the reconciliation map.', [
        { h: 'Entities', hint: 'What counts as one of each.', fill: '[NEEDS DECISION: the entities and their boundaries]' },
        { h: 'Metric definitions', hint: 'Including what is excluded.', fill: '[NEEDS DECISION: each metric, with exclusions]' },
        { h: 'Reconciliation map', hint: 'Which numbers must agree with which.', fill: '[NEEDS DECISION: which figures must reconcile]' },
        { h: 'Client\'s own definitions', hint: 'Where theirs differs from yours.', fill: '[NEEDS EVIDENCE: where {{client}} defines these differently]' }
      ]),

    P('pat-assumptions', 'Assumptions register', 'any',
      'What you are assuming, its impact if wrong, and its falsifier.', [
        { h: 'Load-bearing assumptions', hint: 'The ones that change the recommendation.', fill: '[NEEDS DECISION: assumptions that change the recommendation if wrong]' },
        { h: 'Falsifiers', hint: 'What you would need to see to change your mind.', fill: '[NEEDS DECISION: the falsifier for each assumption]' }
      ]),

    P('pat-spine', 'Narrative spine', 'any',
      'The ordered parts, what each earns, and the cut list.', [
        { h: 'The chain', hint: 'Minimum parts from problem to ask.', fill: '[NEEDS DECISION: the ordered chain of parts]' },
        { h: 'What each part earns', hint: 'The next part.', fill: '[NEEDS DECISION: what each part earns]' },
        { h: 'Cut list', hint: 'Parts removable without collapsing the argument.', fill: '[NEEDS DECISION: what can be cut]' },
        { h: 'Drop-off point', hint: 'Where the reader most likely stops.', fill: '[NEEDS DECISION: where readers stop, and what they have by then]' }
      ]),

    P('pat-throughline', 'Through-line', 'any',
      'The image that carries the mechanism, and where it breaks.', [
        { h: 'The image', hint: 'One image that explains the mechanism.', fill: '[NEEDS DECISION: the through-line image]' },
        { h: 'What it maps to', hint: 'Structural mapping, not mood.', fill: '[NEEDS DECISION: what each part of the image maps to]' },
        { h: 'Where it breaks', hint: 'Every metaphor has a limit. State it.', fill: '[NEEDS DECISION: where the metaphor stops holding]' }
      ]),

    P('pat-sectionmap', 'Section map', 'any',
      'Each part: name, one job, what the reader gains, transition out.', [
        { h: 'Parts', hint: 'Name and the single job of each.', fill: '[NEEDS DECISION: named parts, one job each]' },
        { h: 'Reader gain', hint: 'What they know at the end that they did not before.', fill: '[NEEDS DECISION: reader gain per part]' },
        { h: 'Transitions', hint: 'How each part hands to the next.', fill: '[NEEDS DECISION: transitions]' }
      ]),

    P('pat-disclosure', 'Disclosure plan', 'any',
      'What is surface, what is deep, and how the reader moves between.', [
        { h: 'Surface layer', hint: 'Complete on its own.', fill: '[NEEDS DECISION: what lives above the fold]' },
        { h: 'Deep layer', hint: 'Optional detail.', fill: '[NEEDS DECISION: what lives beneath]' },
        { h: 'Descent and return', hint: 'How they go down and get back.', fill: '[NEEDS DECISION: the descent and return mechanism]' }
      ]),

    P('pat-visual', 'Visual system', 'any',
      'Tokens defined once, referenced everywhere.', [
        { h: 'Tokens', hint: 'Colour, type, spacing, radius, motion. The maker below writes this part from the live token set.', fill: '[NEEDS DECISION: the token set — open the maker and adopt or edit the tokens]' },
        { h: 'Type scale', hint: 'Display, UI, mono. Written from the chosen ratio.', fill: '[NEEDS DECISION: the type scale]' },
        { h: 'Contrast floor', hint: 'At least 4.5:1 for body text.', fill: 'Body text holds at least 4.5:1 against its ground.' },
        { h: 'Motion policy', hint: 'Decorative only; reduced-motion honoured.', fill: 'Motion is decorative. Nothing is understandable only through animation. prefers-reduced-motion collapses to instant states.' }
      ]),

    P('pat-charts', 'Evidence figures', 'any',
      'Each figure: comparison, encoding, source claims, caption.', [
        { h: 'The comparison', hint: 'State in words what the reader should compare. The maker writes one line per figure.', fill: '[NEEDS DECISION: the comparison each figure makes — add a figure in the maker]' },
        { h: 'Encoding', hint: 'Chart form, axis, and whether it starts at zero.', fill: '[NEEDS DECISION: encoding and axis treatment]' },
        { h: 'Source claims', hint: 'Every figure resolves to a registry claim.', fill: '[REGISTRY: figures resolve to claim ids]' },
        { h: 'Caption', hint: 'The figure should read without it, but write it anyway.', fill: '[NEEDS DECISION: captions]' }
      ]),

    P('pat-moments', 'Interaction plan', 'any',
      'Each moment: the belief it changes, its fallback, its keyboard path.', [
        { h: 'The moment', hint: 'The single interaction that changes belief.', fill: '[NEEDS DECISION: the interactive moment]' },
        { h: 'Belief changed', hint: 'What the reader believes after that they did not before.', fill: '[NEEDS DECISION: the belief it changes]' },
        { h: 'Static fallback', hint: 'What it degrades to.', fill: '[NEEDS DECISION: the static fallback]' },
        { h: 'Keyboard path', hint: 'How it is operated without a pointer.', fill: '[NEEDS DECISION: the keyboard path]' }
      ]),

    P('pat-criteria-run', 'Criteria run report', 'any',
      'Every criterion, its result, and what changed because of it.', [
        { h: 'Results', hint: 'Pass, fail, or waived with a reason.', fill: '[GENERATED: the criteria run produces this]' },
        { h: 'Changes made', hint: 'What the failures caused you to change.', fill: '[GENERATED: changes recorded during the run]' }
      ], { generated: true }),

    P('pat-redteam', 'Red team findings', 'any',
      'Per persona: findings, severity, resolution.', [
        { h: 'Findings', hint: 'What each assigned persona found.', fill: '[GENERATED: the red team run produces this]' },
        { h: 'Resolutions', hint: 'Resolved, conceded, or accepted with a reason.', fill: '[GENERATED: resolutions recorded during the run]' }
      ], { generated: true }),

    P('pat-passport', 'Artifact passports', 'any',
      'One passport per certified artifact.', [
        { h: 'Passports', hint: 'Stamps, criteria results, claim statuses, evidence hash.', fill: '[GENERATED: the Gate mints these]' }
      ], { generated: true }),

    P('pat-robustness', 'Robustness check', 'any',
      'The degradation matrix.', [
        { h: 'Enhancements', hint: 'Every clever part.', fill: '[NEEDS DECISION: list the enhancements]' },
        { h: 'Failure modes', hint: 'What happens when each one fails.', fill: '[NEEDS DECISION: failure mode per enhancement]' },
        { h: 'Fallbacks', hint: 'What the reader gets instead.', fill: '[NEEDS DECISION: fallback per enhancement]' }
      ]),

    P('pat-deliverable', 'The deliverable', 'any',
      'The assembled, self-contained output in the lane\'s format.', [
        { h: 'Assembly', hint: 'Certified artifacts only.', fill: '[GENERATED: the lane adapter assembles this]' }
      ], { generated: true }),

    P('pat-memory', 'engagement.json', 'any',
      'The complete portable engagement record.', [
        { h: 'Export', hint: 'Intake, overlay, artifacts, claims, results, passports, run log.', fill: '[GENERATED: exported by the studio]' }
      ], { generated: true }),

    P('pat-buildorder', 'BUILD-ORDER.md', 'any',
      'Instructions an agent or a team can build the full thing from.', [
        { h: 'Repo layout', hint: 'Every file and what goes in it.', fill: '[GENERATED: derived from the lane and the artifacts]' },
        { h: 'Build order', hint: 'File by file, in dependency order.', fill: '[GENERATED: derived from the artifact graph]' },
        { h: 'Acceptance tests', hint: 'The criteria, travelling as tests.', fill: '[GENERATED: the criteria set]' }
      ], { generated: true }),

    P('pat-diagnosis', 'Gap report', 'any',
      'What the method did not cover.', [
        { h: 'Structural gaps', hint: 'Orphans, dead inputs, empty areas.', fill: '[GENERATED: diagnose() produces this]' },
        { h: 'Unfired criteria', hint: 'Criteria that never failed — too soft.', fill: '[GENERATED: from the criteria run]' },
        { h: 'Manual work', hint: 'What you did by hand outside the method.', fill: '[NEEDS DECISION: work done outside the method]' }
      ], { generated: true }),

    P('pat-proposal', 'Accepted proposals', 'any',
      'The spine overlay, with provenance.', [
        { h: 'Proposed nodes', hint: 'New areas and artifacts, schema-valid.', fill: '[GENERATED: agent proposals, human-accepted]' },
        { h: 'Provenance', hint: 'Who, what tier, when.', fill: '[GENERATED: stamped on accept]' }
      ], { generated: true }),

    P('pat-promotion', 'Promoted patterns', 'any',
      'New library patterns with criteria attached.', [
        { h: 'Pattern', hint: 'Stated generally enough for a different client.', fill: '[NEEDS DECISION: the general form of what worked]' },
        { h: 'Criteria', hint: 'A pattern without criteria is not ready.', fill: '[NEEDS DECISION: criteria that travel with it]' },
        { h: 'Stripped', hint: 'Client-identifying material removed.', fill: '[NEEDS DECISION: confirm client material is stripped]' }
      ])
  ];

  /* ------------------------------------------------- lane artifact patterns */
  /* `makes` names a real output the artifact carries beyond its prose parts:
     'tokens' a design system, 'visual' a set of drawn figures, 'code' an HTML+CSS
     section previewed at real device widths. attachLaneArtifacts copies it onto
     the artifact so the Workbench knows which maker to open. */
  function LP(id, title, lane, purpose, parts, makes) {
    return P(id, title, lane, purpose, parts, makes ? { makes: makes } : null);
  }

  var LANE_PATTERNS = [
    /* deck */
    LP('lp-deck-title', 'Title slide', 'deck', 'Who, what, when — and nothing else.', [
      { h: 'Title', hint: 'The subject, not a slogan.', fill: '{{decision}}' },
      { h: 'For', hint: 'The decider and the date.', fill: 'Prepared for {{decider}}' }
    ]),
    LP('lp-deck-ask', 'The ask slide', 'deck', 'Slide one of content. The decision, stated.', [
      { h: 'The ask', hint: 'One sentence.', fill: '{{decision}}' },
      { h: 'Decision needed by', hint: 'Named role, date.', fill: '{{decider}}' },
      { h: 'If no', hint: 'The cost of inaction.', fill: '{{stakes}}' }
    ]),
    LP('lp-deck-situation', 'Situation slide', 'deck', 'What changed, in their terms.', [
      { h: 'What changed', hint: 'The trigger.', fill: '{{trigger}}' },
      { h: 'Why it matters now', hint: 'The clock.', fill: '[NEEDS DECISION: why now rather than next year]' }
    ]),
    LP('lp-deck-evidence', 'Evidence slide', 'deck', 'The figure that carries the argument.', [
      { h: 'The comparison', hint: 'What the reader should compare.', fill: '[NEEDS DECISION: the comparison]' },
      { h: 'Source', hint: 'Registry claim id and as-of date.', fill: '[REGISTRY: claim id]' }
    ], 'visual'),
    LP('lp-deck-options', 'Options slide', 'deck', 'Real options with real trade-offs, not one option and two decoys.', [
      { h: 'Options', hint: 'Three, each genuinely viable.', fill: '[NEEDS DECISION: three viable options]' },
      { h: 'Trade-offs', hint: 'What each costs and forecloses.', fill: '[NEEDS DECISION: trade-off per option]' }
    ]),
    LP('lp-deck-plan', 'Plan slide', 'deck', 'What happens on approval, with a stop condition.', [
      { h: 'First 30 days', hint: 'Concrete.', fill: '[NEEDS DECISION: the first 30 days]' },
      { h: 'Stop condition', hint: 'When to kill it.', fill: '[NEEDS DECISION: the stop condition]' }
    ]),
    LP('lp-deck-appendix', 'Appendix', 'deck', 'Everything the room might ask for, out of the main flow.', [
      { h: 'Backup', hint: 'Detail that would break the main narrative.', fill: '[NEEDS DECISION: backup material]' },
      { h: 'Sources', hint: 'The full apparatus.', fill: '[REGISTRY: sources]' }
    ]),

    /* paper */
    LP('lp-paper-summary', 'Executive summary', 'paper', 'Complete on its own, contains the recommendation.', [
      { h: 'Situation', hint: 'Two sentences.', fill: '{{trigger}}' },
      { h: 'Recommendation', hint: 'The ask, stated as a recommendation.', fill: '{{decision}}' },
      { h: 'Confidence', hint: 'Calibrated language, not bold text.', fill: '[NEEDS DECISION: calibrated confidence statement]' }
    ]),
    LP('lp-paper-problem', 'Problem statement', 'paper', 'The problem at the altitude the reader operates at.', [
      { h: 'The problem', hint: 'In the client\'s terms.', fill: '[NEEDS DECISION: the problem, in {{client}}\'s terms]' },
      { h: 'Why it persists', hint: 'What has stopped it being solved.', fill: '[NEEDS EVIDENCE: why prior attempts failed]' }
    ]),
    LP('lp-paper-analysis', 'Analysis', 'paper', 'Facts and inferences visibly distinguished.', [
      { h: 'What is established', hint: 'Facts, sourced.', fill: '[REGISTRY: verified claims]' },
      { h: 'What we infer', hint: 'Inferences, labelled.', fill: '[NEEDS DECISION: inferences, labelled as such]' },
      { h: 'Key assumptions', hint: 'Surfaced, with falsifiers.', fill: '[NEEDS DECISION: assumptions and falsifiers]' }
    ], 'visual'),
    LP('lp-paper-options', 'Options analysis', 'paper', 'Options with criteria applied consistently.', [
      { h: 'Options', hint: 'Genuinely viable alternatives.', fill: '[NEEDS DECISION: the options]' },
      { h: 'Evaluation criteria', hint: 'Applied identically to each.', fill: '[NEEDS DECISION: evaluation criteria]' }
    ]),
    LP('lp-paper-recommendation', 'Recommendation', 'paper', 'What to do, what it costs, and when to stop.', [
      { h: 'Recommendation', hint: 'The ask.', fill: '{{decision}}' },
      { h: 'Cost and run rate', hint: 'Year one and year two.', fill: '[NEEDS EVIDENCE: cost and year-two run rate]' },
      { h: 'Stop condition', hint: 'The kill metric.', fill: '[NEEDS DECISION: the stop condition]' }
    ]),
    LP('lp-paper-sources', 'Sources', 'paper', 'The apparatus a hostile analyst can walk.', [
      { h: 'Sources', hint: 'Numbered, reachable, dated.', fill: '[REGISTRY: sources]' }
    ]),

    /* experience */
    LP('lp-exp-hero', 'Hero', 'experience', 'The ask, above the fold, on first paint.', [
      { h: 'Headline', hint: 'The decision, not a slogan.', fill: '{{decision}}' },
      { h: 'Sub', hint: 'Who it is for and what happens next.', fill: 'For {{decider}}. {{stakes}}' },
      { h: 'Primary action', hint: 'One. Where it goes.', fill: '[NEEDS DECISION: the primary action]' }
    ], 'code'),
    LP('lp-exp-thesis', 'Thesis section', 'experience', 'The falsifiable claim, early.', [
      { h: 'The claim', hint: 'Arguable.', fill: '[NEEDS DECISION: the thesis]' },
      { h: 'What would prove it', hint: 'Inside the timeframe.', fill: '[NEEDS DECISION: proof condition]' }
    ]),
    LP('lp-exp-mechanism', 'Mechanism section', 'experience', 'How it actually works, carried by the through-line.', [
      { h: 'The mechanism', hint: 'The parts and how they connect.', fill: '[NEEDS DECISION: the mechanism]' },
      { h: 'Deep dive', hint: 'Where the builder descends.', fill: '[NEEDS DECISION: the deep-dive target]' }
    ]),
    LP('lp-exp-proof', 'Proof section', 'experience', 'What it proves first — the concrete demonstrator.', [
      { h: 'First proof', hint: 'One thing, provable.', fill: '[NEEDS DECISION: the first proof]' },
      { h: 'Measure', hint: 'How you will know.', fill: '[NEEDS DECISION: the measure]' }
    ]),
    LP('lp-exp-interactive', 'Interactive moment', 'experience', 'The one mechanism the reader operates themselves.', [
      { h: 'The moment', hint: 'What they do.', fill: '[NEEDS DECISION: the interaction]' },
      { h: 'Fallback', hint: 'The static state.', fill: '[NEEDS DECISION: static fallback]' }
    ], 'code'),
    LP('lp-exp-decision', 'Decision section', 'experience', 'The ask again, as checkable gates.', [
      { h: 'The gates', hint: 'Yes/no, checkable.', fill: '[NEEDS DECISION: the checkable gates]' },
      { h: 'The ask', hint: 'Restated.', fill: '{{decision}}' }
    ]),
    LP('lp-exp-sources', 'Sources section', 'experience', 'Footnoted claims, linked from in-text superscripts.', [
      { h: 'Sources', hint: 'Every claim, footnoted.', fill: '[REGISTRY: sources]' }
    ]),

    /* application */
    LP('lp-app-jobs', 'Jobs to be done', 'application', 'What the user is hiring this to do.', [
      { h: 'Primary job', hint: 'One sentence.', fill: '[NEEDS DECISION: the primary job]' },
      { h: 'Who', hint: 'The actual operator.', fill: '[NEEDS DECISION: the operator role]' }
    ]),
    LP('lp-app-flow', 'Core flow', 'application', 'The demo path, which is the real path.', [
      { h: 'Steps', hint: 'Screen by screen.', fill: '[NEEDS DECISION: the core flow]' },
      { h: 'What is real', hint: 'And what is stubbed. State it plainly.', fill: '[NEEDS DECISION: real vs stubbed]' }
    ], 'visual'),
    LP('lp-app-states', 'State design', 'application', 'Empty, loading, error, permission-denied.', [
      { h: 'States', hint: 'All four, designed.', fill: '[NEEDS DECISION: the four states]' }
    ]),
    LP('lp-app-data', 'Data contract', 'application', 'What goes in, what comes out, what is stored.', [
      { h: 'Inputs and outputs', hint: 'Shapes.', fill: '[NEEDS DECISION: data shapes]' },
      { h: 'Storage', hint: 'Where state lives and for how long.', fill: '[NEEDS DECISION: storage and retention]' }
    ]),
    LP('lp-app-demo', 'Demo script', 'application', 'The five minutes that has to work.', [
      { h: 'Script', hint: 'Exact steps.', fill: '[NEEDS DECISION: the demo script]' },
      { h: 'Failure recovery', hint: 'What you say when it breaks.', fill: '[NEEDS DECISION: recovery line]' }
    ], 'code'),

    /* program */
    LP('lp-prog-horizons', 'Horizons', 'program', 'Today, mid, long — with what changes between.', [
      { h: 'Horizons', hint: 'Three, with the shift between each.', fill: '[NEEDS DECISION: the three horizons]' }
    ]),
    LP('lp-prog-phases', 'Phases', 'program', 'Each phase with a theme and an exit.', [
      { h: 'Phases', hint: 'Theme, duration, exit condition.', fill: '[NEEDS DECISION: the phases]' },
      { h: 'Gating', hint: 'What each phase waits on.', fill: '[NEEDS DECISION: capability gating]' }
    ], 'visual'),
    LP('lp-prog-measures', 'Measures', 'program', 'A yes/no per phase that decides continuation.', [
      { h: 'Measures', hint: 'Binary, per phase.', fill: '[NEEDS DECISION: the measure per phase]' }
    ]),
    LP('lp-prog-enablers', 'Enablers', 'program', 'The cross-cutting things the plan also has to carry.', [
      { h: 'Enablers', hint: 'Funding, access, security, talent, procurement, exit.', fill: '[NEEDS DECISION: the enablers]' }
    ]),
    LP('lp-prog-stop', 'Stop condition', 'program', 'The kill metric for the programme.', [
      { h: 'Kill metric', hint: 'Measurable. A plan without one is a wish.', fill: '[NEEDS DECISION: the kill metric]' }
    ]),

    /* session */
    LP('lp-sess-outcome', 'Session outcome', 'session', 'The decision the session is trying to reach.', [
      { h: 'Decision sought', hint: 'One.', fill: '{{decision}}' },
      { h: 'How you will know', hint: 'What leaving with it looks like.', fill: '[NEEDS DECISION: the success signal]' }
    ]),
    LP('lp-sess-agenda', 'Agenda', 'session', 'Timed, with a decision point.', [
      { h: 'Agenda', hint: 'Module, duration, output.', fill: '[NEEDS DECISION: the agenda]' }
    ]),
    LP('lp-sess-modules', 'Modules', 'session', 'Each producing a named artifact.', [
      { h: 'Modules', hint: 'Each with an artifact, not a discussion.', fill: '[NEEDS DECISION: modules and their artifacts]' }
    ]),
    LP('lp-sess-materials', 'Materials', 'session', 'What is in the room.', [
      { h: 'Materials', hint: 'Pre-read, in-room, handout.', fill: '[NEEDS DECISION: materials]' }
    ]),
    LP('lp-sess-capture', 'Capture plan', 'session', 'What leaves the room, decided before it starts.', [
      { h: 'Capture', hint: 'Who records what, and what is sent after.', fill: '[NEEDS DECISION: the capture plan]' }
    ])
  ];

  var PATTERNS = METHOD.concat(LANE_PATTERNS);

  /* Attach lane-scoped artifacts to the Make section's lane-artifacts area.
     Each carries appliesWhen so scope pruning shows only the chosen lane's
     pieces. This is why "add a lane" does not mean "edit the spine". */
  function attachLaneArtifacts(spine, lanes) {
    var area = null;
    (spine.sections || []).forEach(function (s) {
      (s.areas || []).forEach(function (a) {
        if (a.id === 'a-lane-artifacts') area = a;
      });
    });
    if (!area) return;
    var byId = {};
    PATTERNS.forEach(function (p) { byId[p.id] = p; });

    /* The deliverable genuinely consumes the last piece of whichever lane is
       in scope; wiring it here keeps the graph honest without the spine having
       to know which lanes exist. */
    var deliverable = null;
    (spine.sections || []).forEach(function (s) {
      (s.areas || []).forEach(function (a) {
        (a.artifacts || []).forEach(function (af) {
          if (af.id === 'af-deliverable') deliverable = af;
        });
      });
    });

    area.artifacts = [];
    lanes.forEach(function (lane) {
      (lane.artifacts || []).forEach(function (pid, i) {
        var p = byId[pid];
        if (!p) return;
        area.artifacts.push({
          id: 'af-' + pid,
          title: p.title,
          lane: lane.id,
          pattern: pid,
          outputs: p.purpose,
          makes: p.makes,
          appliesWhen: { lane: lane.id },
          weight: 9 - Math.min(i, 4),
          inputs: i === 0 ? ['af-sectionmap'] : ['af-' + lane.artifacts[i - 1]],
          criteria: []
        });
      });
      var last = (lane.artifacts || [])[(lane.artifacts || []).length - 1];
      if (deliverable && last) {
        /* An OR-group: exactly one lane is ever in scope, so requiring all of
           them would be wrong and reporting the other five as pruned would be
           noise. inputsAny means "at least one of these". */
        deliverable.inputsAny = (deliverable.inputsAny || []).concat(['af-' + last]);
      }
    });
  }

  w.CBS_INTAKE = INTAKE;
  w.CBS_PATTERNS = PATTERNS;
  w.CBS_PATTERN_BY_ID = PATTERNS.reduce(function (m, p) { m[p.id] = p; return m; }, {});

  if (w.CBS_SPINE) {
    w.CBS_SPINE.patterns = PATTERNS;
    attachLaneArtifacts(w.CBS_SPINE, w.CBS_LANES || []);
  }
})(window);
