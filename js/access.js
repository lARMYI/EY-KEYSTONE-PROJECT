/* Keystone access gate, signed-token API bridge, and admin metrics portal. */
(function () {
  'use strict';
  const TOKEN_KEY = 'keystoneAccessToken';
  const ROLE_KEY = 'keystoneAccessRole';
  const VISITOR_KEY = 'keystoneVisitorId';
  const body = document.body;

  function token() { try { return localStorage.getItem(TOKEN_KEY) || ''; } catch (_) { return ''; } }
  function clearSession() {
    try { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(ROLE_KEY); } catch (_) {}
  }
  function api(path, options) {
    options = options || {};
    options.headers = Object.assign({'Content-Type': 'application/json'}, options.headers || {});
    const current = token();
    if (current) options.headers.Authorization = 'Bearer ' + current;
    return fetch(path, options).then(async function (response) {
      let data = {};
      try { data = await response.json(); } catch (_) {}
      if (!response.ok) {
        const error = new Error(data.error || ('Request failed (' + response.status + ')'));
        error.status = response.status;
        if (response.status === 401 && path !== '/api/access') lock();
        throw error;
      }
      return data;
    });
  }

  window.keystoneAccess = {
    token: token,
    role: function () { try { return localStorage.getItem(ROLE_KEY) || ''; } catch (_) { return ''; } },
    api: api,
    logChat: function (question, section) {
      return api('/api/analytics/chat', {method: 'POST', body: JSON.stringify({question: question, section: section || ''})}).catch(function () {});
    }
  };

  window.claude = {
    complete: async function (request) {
      const data = await api('/api/claude', {method: 'POST', body: JSON.stringify(request || {})});
      return data.content;
    }
  };

  const gate = document.createElement('div');
  gate.id = 'ks-access';
  gate.innerHTML = '<div class="ksa-card" role="dialog" aria-modal="true" aria-labelledby="ksa-title">' +
    '<div class="ksa-mark"><i></i><span>EY KEYSTONE</span></div>' +
    '<div class="ksa-kicker">Leadership briefing · controlled access</div>' +
    '<h1 id="ksa-title">Enter the briefing.</h1>' +
    '<p>This working concept and its live briefing agent are available to invited reviewers.</p>' +
    '<form id="ksa-form"><label for="ksa-code">Access code</label><div class="ksa-entry"><input id="ksa-code" type="password" autocomplete="current-password" spellcheck="false" required><button type="submit">Unlock</button></div><div id="ksa-error" role="alert"></div></form>' +
    '<div class="ksa-foot">Independent working concept · not an authorized EY publication</div></div>';
  body.appendChild(gate);

  const form = gate.querySelector('#ksa-form');
  const input = gate.querySelector('#ksa-code');
  const error = gate.querySelector('#ksa-error');
  const submit = gate.querySelector('button');

  function lock(message) {
    clearSession();
    body.classList.add('ks-locked');
    body.classList.remove('ks-unlocked');
    gate.hidden = false;
    if (message) error.textContent = message;
    setTimeout(function () { input.focus(); }, 50);
  }

  function unlock(role) {
    body.classList.remove('ks-locked');
    body.classList.add('ks-unlocked');
    gate.hidden = true;
    error.textContent = '';
    if (role === 'admin') addMetricsButton();
  }

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    if (!input.value.trim()) return;
    submit.disabled = true;
    submit.textContent = 'Checking…';
    error.textContent = '';
    let visitorId = '';
    try { visitorId = localStorage.getItem(VISITOR_KEY) || ''; } catch (_) {}
    try {
      const result = await api('/api/access', {method: 'POST', body: JSON.stringify({code: input.value.trim(), visitorId: visitorId})});
      localStorage.setItem(TOKEN_KEY, result.token);
      localStorage.setItem(ROLE_KEY, result.role);
      localStorage.setItem(VISITOR_KEY, result.visitorId);
      input.value = '';
      unlock(result.role);
    } catch (err) {
      error.textContent = err.message || 'Access could not be verified.';
      input.select();
    } finally {
      submit.disabled = false;
      submit.textContent = 'Unlock';
    }
  });

  let metricsButton;
  function addMetricsButton() {
    if (metricsButton) return;
    metricsButton = document.createElement('button');
    metricsButton.className = 'ks-metrics-button';
    metricsButton.textContent = 'Metrics';
    metricsButton.addEventListener('click', openMetrics);
    body.appendChild(metricsButton);
  }

  async function openMetrics() {
    let modal = document.getElementById('ks-metrics');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'ks-metrics';
      modal.innerHTML = '<div class="ksm-card" role="dialog" aria-modal="true" aria-label="Keystone metrics"><div class="ksm-head"><div><span>Private operations</span><h2>Keystone metrics</h2></div><button aria-label="Close">×</button></div><div class="ksm-body">Loading…</div></div>';
      modal.querySelector('button').onclick = function () { modal.remove(); };
      modal.onclick = function (event) { if (event.target === modal) modal.remove(); };
      body.appendChild(modal);
    }
    const pane = modal.querySelector('.ksm-body');
    try {
      const data = await api('/api/metrics');
      const s = data.summary;
      pane.innerHTML = '<div class="ksm-stats">' +
        stat('Reviewer visits', s.reviewerVisits) + stat('Unique reviewers', s.uniqueReviewers) + stat('Reviewer chats', s.reviewerChats) + stat('Admin chats excluded', s.adminChatsExcluded) +
        '</div><h3>Recent chats</h3><div class="ksm-list"></div>';
      const list = pane.querySelector('.ksm-list');
      (data.chats || []).slice(0, 50).forEach(function (chat) {
        const row = document.createElement('div');
        row.className = 'ksm-row';
        const when = new Date(chat.timestamp * 1000).toLocaleString();
        row.innerHTML = '<div><b></b><span></span></div><p></p>';
        row.querySelector('b').textContent = chat.admin ? 'ADMIN · EXCLUDED' : 'REVIEWER';
        row.querySelector('span').textContent = when + (chat.section ? ' · ' + chat.section : '');
        row.querySelector('p').textContent = chat.question;
        list.appendChild(row);
      });
      if (!list.children.length) list.textContent = 'No chats recorded yet.';
    } catch (err) { pane.textContent = err.message || 'Metrics unavailable.'; }
  }
  function stat(label, value) { return '<div><b>' + String(value || 0) + '</b><span>' + label + '</span></div>'; }

  const existing = token();
  if (!existing) {
    lock();
  } else {
    api('/api/session').then(function (session) { unlock(session.role); }).catch(function () { lock('Your access session expired. Please enter the code again.'); });
  }
})();
