/* Client Build Studio — the run console.

   A drawer that streams everything the studio does, with a provenance stamp on
   every line. Modelled on the pitch site's Keystone OS readout: the point is
   that an agent's actions are legible after the fact, not that they look busy
   while they happen. */
(function (w) {
  'use strict';

  var R = w.CBS_RENDER, S = w.CBS_STATE;
  var el = R.el, mount = R.mount, append = R.append;
  var drawer = null, logNode = null, fab = null, open = false;

  function timeOf(iso) {
    try { return new Date(iso).toTimeString().slice(0, 8); } catch (e) { return '--:--:--'; }
  }

  function line(entry) {
    return el('div.log-line', null, [
      el('span.lk.' + (entry.kind || 'info'), { text: entry.kind || 'info' }),
      el('div', null, [
        el('div.lm', { text: entry.msg }),
        el('div.lt', { text: timeOf(entry.t) + ' · ' + (entry.provenance || 'human') })
      ])
    ]);
  }

  function render() {
    if (!logNode) return;
    var log = S.get().log || [];
    if (!log.length) {
      mount(logNode, el('p.dimmed.small', { text: 'Nothing has run yet. Every generation, gate result, proposal and export is recorded here with who or what did it.' }));
      return;
    }
    mount(logNode, log.slice(-200).reverse().map(line));
  }

  function setOpen(next) {
    open = next;
    drawer.classList.toggle('open', open);
    drawer.setAttribute('aria-hidden', open ? 'false' : 'true');
    fab.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) { render(); drawer.querySelector('.icon-btn').focus(); }
    else fab.focus();
  }

  function init() {
    if (drawer) return;
    logNode = el('div.console-log', { id: 'cbs-log', role: 'log', 'aria-live': 'polite', 'aria-label': 'Run console' });

    drawer = el('aside.console', { 'aria-hidden': 'true', 'aria-label': 'Run console' }, [
      el('div.console-head', null, [
        el('b', { text: 'Run console' }),
        el('div.inline', null, [
          el('button.icon-btn', {
            type: 'button', title: 'Clear the log', 'aria-label': 'Clear the log',
            text: '⌫',
            onclick: function () { S.get().log = []; S.save(); render(); }
          }),
          el('button.icon-btn', {
            type: 'button', title: 'Close', 'aria-label': 'Close run console',
            text: '×',
            onclick: function () { setOpen(false); }
          })
        ])
      ]),
      logNode
    ]);

    fab = el('button.console-fab', {
      type: 'button', 'aria-expanded': 'false', 'aria-controls': 'cbs-log',
      title: 'Run console', 'aria-label': 'Open run console', text: '▤',
      onclick: function () { setOpen(!open); }
    });

    w.document.body.appendChild(drawer);
    w.document.body.appendChild(fab);

    w.document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && open) setOpen(false);
    });

    S.on('log', function () { if (open) render(); });
    S.on('imported', render);
    S.on('reset', render);
    S.on('storage:unavailable', function (msg) {
      R.toast('Storage is unavailable here — this engagement lives in memory only.');
      S.get().log.push({ t: new Date().toISOString(), kind: 'error', msg: 'localStorage unavailable: ' + msg, provenance: 'system' });
      if (open) render();
    });
  }

  w.CBS_CONSOLE = { init: init, render: render, open: function () { init(); setOpen(true); } };
})(window);
