/* Client Build Studio — the six lanes.
   Sections, areas and criteria are media-neutral. A lane supplies three things
   and only three: what "good" means in that medium, the extra criteria that
   medium imposes, and a publish adapter that assembles certified artifacts
   into something openable.

   `adapter` is the NAME of a function registered in cbs-publish.js. Never a
   function body in data, never a string to evaluate. */
(function (w) {
  'use strict';

  var LANES = [
    {
      id: 'deck', title: 'Deck', icon: '▤',
      oneLiner: 'Slides for a room with a clock running.',
      good: 'One idea per slide, the ask on slide one and slide last, and a deck that survives being read without the presenter. Speaker notes carry the nuance; the slide carries the claim.',
      worked: 'deep',
      artifacts: ['lp-deck-title', 'lp-deck-ask', 'lp-deck-situation', 'lp-deck-evidence', 'lp-deck-options', 'lp-deck-plan', 'lp-deck-appendix'],
      criteria: [
        { id: 'c-lane-deck-1', kind: 'binary', text: 'One idea per slide — no slide carries two arguments.', severity: 'high' },
        { id: 'c-lane-deck-2', kind: 'binary', text: 'The ask appears on the first content slide and the last.' },
        { id: 'c-lane-deck-3', kind: 'binary', text: 'Every slide reads without the presenter; nuance lives in the notes.' },
        { id: 'c-lane-deck-4', kind: 'review', persona: 'p-exec', text: 'A reader flipping at speed still receives the argument.' }
      ],
      adapter: 'adapt-deck'
    },
    {
      id: 'paper', title: 'Paper', icon: '▦',
      oneLiner: 'A document that has to survive being read alone, slowly, by someone looking for holes.',
      good: 'An executive summary that is complete on its own, a body that descends in one direction, and a source apparatus that a hostile analyst can walk. Confidence is calibrated in words, not asserted in bold.',
      worked: 'deep',
      artifacts: ['lp-paper-summary', 'lp-paper-problem', 'lp-paper-analysis', 'lp-paper-options', 'lp-paper-recommendation', 'lp-paper-sources'],
      criteria: [
        { id: 'c-lane-paper-1', kind: 'binary', text: 'The executive summary stands alone and contains the recommendation.', severity: 'high' },
        { id: 'c-lane-paper-2', kind: 'binary', text: 'Confidence language is calibrated — likelihood is stated in words with agreed meanings.' },
        { id: 'c-lane-paper-3', kind: 'binary', text: 'Facts and inferences are distinguishable on the page.' },
        { id: 'c-lane-paper-4', kind: 'review', persona: 'p-analyst', text: 'The source apparatus survives being walked end to end.' }
      ],
      adapter: 'adapt-paper'
    },
    {
      id: 'experience', title: 'Experience', icon: '◈',
      oneLiner: 'A site or interactive narrative the reader moves through themselves.',
      good: 'Decision-first, above the fold. Motion carries meaning rather than attention. Every enhancement degrades. The reader can descend into detail and return to exactly where they were.',
      worked: 'deep',
      artifacts: ['lp-exp-hero', 'lp-exp-thesis', 'lp-exp-mechanism', 'lp-exp-proof', 'lp-exp-interactive', 'lp-exp-decision', 'lp-exp-sources'],
      criteria: [
        { id: 'c-lane-exp-1', kind: 'binary', text: 'The ask is above the fold on first paint.', severity: 'high' },
        { id: 'c-lane-exp-2', kind: 'binary', text: 'Every enhancement has a working fallback — no blank states.', severity: 'high' },
        { id: 'c-lane-exp-3', kind: 'binary', text: 'Deep links carry a return path back to the reader\'s position.' },
        { id: 'c-lane-exp-4', kind: 'binary', text: 'The whole thing is operable by keyboard.' },
        { id: 'c-lane-exp-5', kind: 'binary', text: 'No horizontal overflow at 390px.', test: 't-responsive', severity: 'high' }
      ],
      adapter: 'adapt-experience'
    },
    {
      id: 'application', title: 'Application', icon: '◇',
      oneLiner: 'A working tool or prototype the client can operate.',
      good: 'The demo path is the real path. State is legible. Failure modes are designed, not discovered. A prototype that only works on the happy path is a video, not an application.',
      worked: 'thin',
      artifacts: ['lp-app-jobs', 'lp-app-flow', 'lp-app-states', 'lp-app-data', 'lp-app-demo'],
      criteria: [
        { id: 'c-lane-app-1', kind: 'binary', text: 'The demo path uses the real mechanism, not a scripted mock.', severity: 'high' },
        { id: 'c-lane-app-2', kind: 'binary', text: 'Empty, loading, error and permission-denied states are all designed.' },
        { id: 'c-lane-app-3', kind: 'binary', text: 'What is real and what is stubbed is stated plainly to the client.', severity: 'high' },
        { id: 'c-lane-app-4', kind: 'review', persona: 'p-builder', text: 'The prototype does not hide the hard part.' }
      ],
      adapter: 'adapt-application'
    },
    {
      id: 'program', title: 'Program', icon: '▥',
      oneLiner: 'A roadmap, operating model, or multi-quarter plan.',
      good: 'Dates gated on capability rather than optimism. Every phase has a measure that says whether it worked, and a stop condition. A plan with no kill metric is a wish.',
      worked: 'thin',
      artifacts: ['lp-prog-horizons', 'lp-prog-phases', 'lp-prog-measures', 'lp-prog-enablers', 'lp-prog-stop'],
      criteria: [
        { id: 'c-lane-prog-1', kind: 'binary', text: 'Every phase has a yes/no measure that decides whether to continue.', severity: 'high' },
        { id: 'c-lane-prog-2', kind: 'binary', text: 'A stop condition — a kill metric — is stated for the programme as a whole.', severity: 'high' },
        { id: 'c-lane-prog-3', kind: 'binary', text: 'Dates are gated on capability and dependency, and the gating is visible.' },
        { id: 'c-lane-prog-4', kind: 'review', persona: 'p-cfo', text: 'The run rate in the later phases is visible, not buried.' }
      ],
      adapter: 'adapt-program'
    },
    {
      id: 'session', title: 'Session', icon: '◎',
      oneLiner: 'A workshop, briefing, or war game the client participates in.',
      good: 'Every module produces an artifact. The session has a decision it is trying to reach, and it is legible whether it got there. Facilitation notes are specific enough for someone else to run it.',
      worked: 'thin',
      artifacts: ['lp-sess-outcome', 'lp-sess-agenda', 'lp-sess-modules', 'lp-sess-materials', 'lp-sess-capture'],
      criteria: [
        { id: 'c-lane-sess-1', kind: 'binary', text: 'The session names the decision it is trying to reach.', severity: 'high' },
        { id: 'c-lane-sess-2', kind: 'binary', text: 'Every module produces a named artifact, not a discussion.' },
        { id: 'c-lane-sess-3', kind: 'binary', text: 'Someone other than the author could run it from the notes.' },
        { id: 'c-lane-sess-4', kind: 'binary', text: 'Capture is designed — what leaves the room is decided before it starts.' }
      ],
      adapter: 'adapt-session'
    }
  ];

  if (w.CBS_SPINE) w.CBS_SPINE.lanes = LANES;
  w.CBS_LANES = LANES;

  w.CBS_LANE_BY_ID = LANES.reduce(function (m, l) { m[l.id] = l; return m; }, {});
})(window);
