/* Client Build Studio — the preview bridge.

   Owns the sandboxed <iframe> that renders authored code, decks, streaming text
   and 3D scenes, and switches it between device widths so "works on mobile" is
   something you look at rather than something you assert.

   The frame is loaded with sandbox="allow-scripts" and WITHOUT allow-same-origin,
   so it runs on an opaque origin: it cannot read this page's localStorage, cannot
   touch this DOM, and cannot be read back. Verified in the test suite, not just
   asserted here. Because preview.html is fetched over http it carries its own
   CSP, which is why executable previews need no change to the studio's policy. */
(function (w) {
  'use strict';

  var d = w.document;
  var R = w.CBS_RENDER;
  var el = R.el, mount = R.mount;

  var DEVICES = [
    { id: 'mobile',  label: 'Mobile',  width: 390,  height: 780, note: 'iPhone-class' },
    { id: 'tablet',  label: 'Tablet',  width: 768,  height: 900, note: 'iPad portrait' },
    { id: 'desktop', label: 'Desktop', width: 1440, height: 900, note: 'Laptop' }
  ];

  var threeSrc = null;       /* cached three.js source, fetched once, lazily */
  var threeFailed = false;

  /* The library cannot be <script src>'d inside an opaque-origin frame, so the
     parent fetches it (same-origin, allowed by connect-src 'self') and posts the
     source across for the frame to inline. */
  function loadThree() {
    if (threeSrc) return Promise.resolve(threeSrc);
    if (threeFailed) return Promise.resolve(null);
    return w.fetch('../vendor/three.min.js')
      .then(function (r) { return r.ok ? r.text() : null; })
      .then(function (t) { threeSrc = t; if (!t) threeFailed = true; return t; })
      ['catch'](function () { threeFailed = true; return null; });
  }

  /* ---------------------------------------------------------- the surface */
  /* Returns a controller: { node, show(payload), setDevice(id), measure() } */
  function create(opts) {
    opts = opts || {};
    var deviceId = opts.device || 'desktop';
    var pending = null;              /* payload queued until the frame says ready */
    var ready = false;
    var lastMeasure = null;
    var onMeasure = opts.onMeasure || function () {};

    var frame = el('iframe', {
      src: 'preview.html',
      sandbox: 'allow-scripts',      /* no allow-same-origin: opaque origin */
      title: 'Live preview',
      loading: 'lazy',
      class: 'pv-frame'
    });

    var scaler = el('div.pv-scaler', null, frame);
    var stageBox = el('div.pv-stage', null, scaler);
    var status = el('div.pv-status');

    function device() {
      return DEVICES.filter(function (x) { return x.id === deviceId; })[0] || DEVICES[2];
    }

    /* Size the frame to the real device width, then scale it down to fit the
       column. The page inside genuinely believes it is that wide — which is
       what makes the overflow measurement meaningful. */
    function fit() {
      var dev = device();
      var avail = (stageBox.clientWidth || 640) - 2;
      /* Never scale a narrow device UP — a blown-up phone view would misrepresent
         type size and touch targets. Scale down only, and centre what is left. */
      var scale = Math.min(1, avail / dev.width);
      frame.style.width = dev.width + 'px';
      frame.style.height = dev.height + 'px';
      scaler.style.transform = 'scale(' + scale.toFixed(4) + ')';
      scaler.style.width = dev.width + 'px';
      scaler.style.height = dev.height + 'px';
      /* The scaler is transform-scaled, so its layout box keeps the unscaled
         size; pin the stage to the visual height instead. */
      stageBox.style.height = Math.round(dev.height * scale) + 'px';
      scaler.style.marginBottom = Math.round(dev.height * (scale - 1)) + 'px';
    }

    var tabs = el('div.pv-tabs', { role: 'tablist', 'aria-label': 'Preview width' },
      DEVICES.map(function (dev) {
        return el('button.etab', {
          type: 'button', role: 'tab',
          'aria-selected': dev.id === deviceId ? 'true' : 'false',
          title: dev.note + ' — ' + dev.width + '×' + dev.height,
          text: dev.label + ' ' + dev.width,
          onclick: function () { setDevice(dev.id); }
        });
      }));

    function setDevice(id) {
      deviceId = id;
      Array.prototype.forEach.call(tabs.children, function (b, i) {
        b.setAttribute('aria-selected', DEVICES[i].id === id ? 'true' : 'false');
      });
      fit();
      /* Give layout a beat, then re-measure at the new width. */
      w.setTimeout(function () { send({ type: 'measure' }); }, 120);
    }

    function send(payload) {
      if (!ready) { pending = payload; return; }
      try { frame.contentWindow.postMessage(JSON.stringify(payload), '*'); }
      catch (e) { /* frame gone */ }
    }

    /* show() is the whole public surface: hand it a payload and it renders. */
    function show(payload) {
      if (!payload) return;
      if (payload.type === 'scene') {
        loadThree().then(function (src) {
          var p = Object.assign({}, payload);
          p.lib = src || '';
          send(p);
        });
        return;
      }
      send(payload);
    }

    function paintStatus(m) {
      if (!m) { status.textContent = ''; return; }
      var dev = device();
      mount(status, [
        R.chip(dev.width + '×' + dev.height),
        R.chip('content ' + m.scrollWidth + 'px', m.overflow ? 'red' : 'teal'),
        m.overflow
          ? R.chip('overflows by ' + m.overflowBy + 'px', 'red')
          : R.chip('no horizontal overflow', 'teal')
      ]);
    }

    function onMessage(e) {
      if (e.source !== frame.contentWindow) return;
      var msg;
      try { msg = JSON.parse(e.data); } catch (err) { return; }
      if (!msg || !msg.type) return;
      if (msg.type === 'ready') {
        ready = true;
        fit();
        if (pending) { var p = pending; pending = null; show(p); }
        return;
      }
      if (msg.type === 'measure') {
        lastMeasure = msg;
        paintStatus(msg);
        /* Record the 390px reading so t-responsive can decide later, when the
           preview is not open. Only the mobile width is load-bearing. */
        if (msg.viewport <= 400 && w.CBS_STATE) {
          var cur = w.CBS_STATE.get().responsive || {};
          cur.at390 = { scrollWidth: msg.scrollWidth, overflow: msg.overflow, overflowBy: msg.overflowBy, at: new Date().toISOString() };
          w.CBS_STATE.set('responsive', cur, { quiet: true });
        }
        onMeasure(msg);
        return;
      }
      if (msg.type === 'error') {
        mount(status, R.chip('preview error: ' + String(msg.message).slice(0, 80), 'red'));
      }
    }

    w.addEventListener('message', onMessage);
    w.addEventListener('resize', fit);

    var node = el('div.pv-wrap', null, [
      el('div.row-between', { style: 'margin-bottom:10px' }, [tabs, status]),
      stageBox
    ]);

    /* Fit once the element is actually in the document and has a width. */
    w.setTimeout(fit, 60);

    return {
      node: node,
      show: show,
      setDevice: setDevice,
      measure: function () { send({ type: 'measure' }); return lastMeasure; },
      lastMeasure: function () { return lastMeasure; },
      destroy: function () {
        w.removeEventListener('message', onMessage);
        w.removeEventListener('resize', fit);
      }
    };
  }

  /* --------------------------------------------------- payload builders */
  /* Turn an artifact's draft into something the preview can render. Each is a
     pure function of the draft, so the preview never sees studio internals. */
  function payloadFor(artifactId) {
    var S = w.CBS_STATE, G = w.CBS_GRAPH;
    var a = S.artifact(artifactId);
    var hit = G.findArtifact(artifactId);
    if (!hit || !a.draft) return null;
    var kind = hit.artifact.visual || hit.artifact.kind;

    if (kind === 'code' && a.draft.code) {
      return { type: 'code', html: a.draft.code.html, css: a.draft.code.css, js: a.draft.code.js };
    }
    if (kind === 'scene') {
      var tk = w.CBS_TOKENS.derive(S.get().tokens);
      return {
        type: 'scene',
        shape: (a.draft.scene && a.draft.scene.shape) || 'keystone',
        satellites: (a.draft.scene && a.draft.scene.satellites) || 8,
        accent: tk.model.accent
      };
    }
    if (kind === 'stream') {
      return { type: 'stream', text: w.CBS_GATE.draftText(artifactId), speed: 22 };
    }
    /* Anything else previews as a deck of its parts — always something real. */
    return {
      type: 'deck',
      slides: [{
        title: hit.artifact.title,
        parts: (a.draft.parts || []).map(function (p) { return { h: p.h, body: p.body }; })
      }]
    };
  }

  w.CBS_PREVIEW = {
    DEVICES: DEVICES,
    create: create,
    payloadFor: payloadFor,
    loadThree: loadThree
  };
})(window);
