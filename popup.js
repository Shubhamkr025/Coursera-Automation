'use strict';

const DEFAULTS = { autoAdvance: true, unlockSeeking: true, playbackSpeed: 2, autoPlay: true, skipWaiting: true, aiChoice: 'claude' };
const TOGGLES = ['autoAdvance', 'unlockSeeking', 'autoPlay', 'skipWaiting'];

let _running = false;

// Load saved settings
chrome.storage.sync.get(DEFAULTS, s => {
  TOGGLES.forEach(id => { const el = document.getElementById(id); if (el) el.checked = !!s[id]; });
  const sr = document.getElementById('speedRange');
  const sl = document.getElementById('speedLbl');
  if (sr) sr.value = s.playbackSpeed ?? 2;
  if (sl) sl.textContent = (s.playbackSpeed ?? 2) + '×';
  const aiSel = document.getElementById('aiChoice');
  if (aiSel) aiSel.value = s.aiChoice || 'claude';
});

// Save toggle changes
TOGGLES.forEach(id =>
  document.getElementById(id)?.addEventListener('change', e =>
    chrome.storage.sync.set({ [id]: e.target.checked })
  )
);

// Speed slider
const sr = document.getElementById('speedRange');
const sl = document.getElementById('speedLbl');
sr?.addEventListener('input', () => {
  const v = parseFloat(sr.value);
  if (sl) sl.textContent = v + '×';
  chrome.storage.sync.set({ playbackSpeed: v });
});

// AI choice selector
document.getElementById('aiChoice')?.addEventListener('change', (e) => {
  chrome.storage.sync.set({ aiChoice: e.target.value });
  toast('AI: ' + (e.target.value === 'claude' ? 'Claude' : 'ChatGPT'));
});

// Poll main.js state
function poll() {
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    if (!tab?.id) return;
    chrome.scripting.executeScript(
      { target: { tabId: tab.id }, world: 'MAIN', func: () => typeof window.__cqnState === 'function' ? window.__cqnState() : null },
      results => {
        if (chrome.runtime.lastError) return;
        const st = results?.[0]?.result;
        if (!st) return;
        renderMarathon(st);
        if (st.courseComplete) showDoneStrip();
      }
    );
  });
}

function renderMarathon(st) {
  const on = !!st.marathon;
  const status = st.marathonStatus || 'idle';
  const done = status === 'done';
  const item = st.marathonItem || '';
  const videos = st.videosPlayed ?? 0;
  const quizzes = st.quizzesSolved ?? 0;
  const readings = st.readingsCompleted ?? 0;
  const skipped = st.itemsSkipped ?? 0;

  _running = on;

  const pill = document.getElementById('mPill');
  if (pill) {
    if (done) { pill.className = 'm-pill done'; pill.textContent = 'DONE'; }
    else {
      const cls = on ? (status === 'solving' ? ' solving' : status === 'reading' ? ' reading' : status === 'skipping' ? ' skp' : ' on') : '';
      pill.className = 'm-pill' + cls;
      const labels = { solving: 'SOLVING', reading: 'READING', skipping: 'SKIPPING', playing: 'PLAYING', loading: 'LOADING' };
      pill.textContent = on ? (labels[status] || 'RUNNING') : 'IDLE';
    }
  }

  const cur = document.getElementById('mCur');
  if (cur) {
    if (done) { cur.textContent = '🎓 Course complete!'; cur.className = 'm-cur done'; }
    else if (on && item) {
      const icons = { playing: '▶', solving: '🧠', reading: '📖', skipping: '⏭', loading: '⏳' };
      cur.textContent = (icons[status] || '▶') + ' ' + decodeURIComponent(item).replace(/-/g, ' ');
      cur.className = 'm-cur live';
    } else if (on) { cur.textContent = 'Loading…'; cur.className = 'm-cur live'; }
    else { cur.textContent = 'Not running'; cur.className = 'm-cur'; }
  }

  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set('mVid', videos);
  set('mQuiz', quizzes);
  set('mRead', readings);
  set('mSkip', skipped);

  const bar = document.getElementById('mBar');
  if (bar) {
    const total = videos + quizzes + readings + skipped;
    const pct = done ? 100 : (on && total > 0 ? Math.min(99, Math.round((videos + quizzes + readings) / total * 100)) : 0);
    bar.style.width = pct + '%';
  }

  const btn = document.getElementById('btnMarathon');
  if (btn) {
    btn.textContent = on ? '■  Stop Autopilot' : '▶  Start Full Autopilot';
    btn.className = on ? 'btn-run stop' : 'btn-run';
  }
}

function showDoneStrip() {
  const el = document.getElementById('doneStrip');
  if (el) el.className = 'done-strip show';
}

poll();
const tid = setInterval(poll, 1400);
window.addEventListener('unload', () => clearInterval(tid));

function send(action, quiet) {
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    if (!tab?.id) return;
    chrome.tabs.sendMessage(tab.id, { action }, () => { chrome.runtime.lastError; });
  });
  if (!quiet) toast('✓ Done!');
}

function toast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.style.display = 'block';
  setTimeout(() => { t.style.display = 'none'; }, 1800);
}

// Start/Stop Autopilot
document.getElementById('btnMarathon')?.addEventListener('click', () => {
  const ds = document.getElementById('doneStrip');
  if (_running) {
    send('marathonStop', true);
    _running = false;
    toast('■ Stopped');
    renderMarathon({ marathon: false, marathonStatus: 'idle', videosPlayed: 0, quizzesSolved: 0, readingsCompleted: 0, itemsSkipped: 0 });
    if (ds) ds.className = 'done-strip';
  } else {
    send('marathonStart', true);
    _running = true;
    toast('▶ Autopilot started!');
    if (ds) ds.className = 'done-strip';
    const pill = document.getElementById('mPill');
    const btn = document.getElementById('btnMarathon');
    if (pill) { pill.className = 'm-pill on'; pill.textContent = 'RUNNING'; }
    if (btn) { btn.textContent = '■  Stop Autopilot'; btn.className = 'btn-run stop'; }
  }
});

// Quick action buttons
document.getElementById('btnNext')?.addEventListener('click', () => send('nextLesson'));
document.getElementById('btnSkipEnd')?.addEventListener('click', () => send('skipToNearEnd'));
document.getElementById('btnComplete')?.addEventListener('click', () => send('completeNow'));

// Solve This Quiz button
document.getElementById('btnSolveQuiz')?.addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    if (!tab?.id) return;
    chrome.tabs.sendMessage(tab.id, { type: 'TRIGGER_SOLVE_QUIZ' }, () => {
      if (chrome.runtime.lastError) console.error(chrome.runtime.lastError);
    });
  });
  toast('🧠 Solving quiz...');
});
