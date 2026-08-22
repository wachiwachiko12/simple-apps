'use strict';

/* ============================================================
   State
   ============================================================ */
const state = {
  // timer core
  totalSec: 5 * 60,       // 設定された総秒数
  remainSec: 5 * 60,      // 残り秒数
  running: false,
  intervalId: null,

  // session
  mode: 'single',         // 'single' | 'session'
  sessions: [],           // [{ label, totalSec }]
  sessionIndex: 0,

  // UI
  fsOpen: false,

  // warning thresholds (seconds)
  warnAt: 120,            // 残り2分で黄色
  dangerAt: 60,           // 残り1分で赤
};

/* ============================================================
   DOM refs — inline
   ============================================================ */
const dom = {
  // single settings
  inputMin:    document.getElementById('input-min'),
  inputSec:    document.getElementById('input-sec'),
  inputMsg:    document.getElementById('input-message'),
  presetBtns:  Array.from(document.querySelectorAll('.preset-btn')),

  // single controls
  btnStart:    document.getElementById('btn-start'),
  btnPause:    document.getElementById('btn-pause'),
  btnReset:    document.getElementById('btn-reset'),
  btnFs:       document.getElementById('btn-fullscreen'),

  // inline display
  timerDisplay:document.getElementById('timer-display'),
  timerClock:  document.getElementById('timer-clock'),
  timerMsg:    document.getElementById('timer-msg'),
  timerStatus: document.getElementById('timer-status'),
  sessionProg: document.getElementById('session-progress'),

  // session settings
  sessionList:      document.getElementById('session-list'),
  btnAddSession:    document.getElementById('btn-add-session'),
  btnSessionStart:  document.getElementById('btn-session-start'),
  btnSessionFs:     document.getElementById('btn-session-fullscreen'),

  // inline next session button
  btnNextSession: document.getElementById('btn-next-session'),

  // tabs
  tabBtns:     Array.from(document.querySelectorAll('.tab-btn')),
  panelSingle: document.getElementById('panel-single'),
  panelSession:document.getElementById('panel-session'),
  panelScript: document.getElementById('panel-script'),

  // script estimation
  scriptInput:    document.getElementById('script-input'),
  inputCpm:       document.getElementById('input-cpm'),
  charCount:      document.getElementById('char-count'),
  estimatedTime:  document.getElementById('estimated-time'),
  scriptSections: document.getElementById('script-sections'),
  btnScriptApply: document.getElementById('btn-script-apply'),

  // fullscreen overlay
  fsOverlay:   document.getElementById('fs-overlay'),
  fsClock:     document.getElementById('fs-clock'),
  fsMsg:       document.getElementById('fs-msg'),
  fsStatus:    document.getElementById('fs-status'),
  fsProgress:  document.getElementById('fs-session-progress'),
  fsBtnStart:  document.getElementById('fs-btn-start'),
  fsBtnPause:  document.getElementById('fs-btn-pause'),
  fsBtnReset:  document.getElementById('fs-btn-reset'),
  fsBtnNext:   document.getElementById('fs-btn-next'),
  fsBtnExit:   document.getElementById('fs-btn-exit'),
};

/* ============================================================
   Utilities
   ============================================================ */
function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function getColorState(remainSec) {
  if (remainSec <= 0)              return 'state-done';
  if (remainSec <= state.dangerAt) return 'state-danger';
  if (remainSec <= state.warnAt)   return 'state-warning';
  return '';
}

/* ============================================================
   Display update
   ============================================================ */
function updateDisplay() {
  const timeStr = formatTime(Math.max(0, state.remainSec));
  const colorState = getColorState(state.remainSec);

  // inline clock
  dom.timerClock.textContent = timeStr;
  dom.timerMsg.textContent = getCurrentMessage();
  dom.timerStatus.textContent = getStatusText();
  setColorClass(dom.timerDisplay, colorState);

  // session progress
  if (state.mode === 'session' && state.sessions.length > 1) {
    dom.sessionProg.textContent = `セッション ${state.sessionIndex + 1} / ${state.sessions.length}`;
    dom.sessionProg.classList.remove('hidden');
  } else {
    dom.sessionProg.classList.add('hidden');
  }

  // fullscreen clock
  dom.fsClock.textContent = timeStr;
  dom.fsMsg.textContent = getCurrentMessage();
  dom.fsStatus.textContent = getStatusText();
  setColorClass(dom.fsOverlay, colorState);

  if (state.mode === 'session' && state.sessions.length > 1) {
    dom.fsProgress.textContent = `セッション ${state.sessionIndex + 1} / ${state.sessions.length}`;
  } else {
    dom.fsProgress.textContent = '';
  }

  // button states
  const running = state.running;
  dom.btnStart.disabled = running;
  dom.btnPause.disabled = !running;
  dom.fsBtnStart.disabled = running;
  dom.fsBtnPause.disabled = !running;

  // session next button (fullscreen + inline)
  const hasNext = state.mode === 'session' && state.sessionIndex < state.sessions.length - 1;
  dom.fsBtnNext.classList.toggle('hidden', !(state.remainSec <= 0 && hasNext));
  dom.btnNextSession.classList.toggle('hidden', !(state.remainSec <= 0 && hasNext));

  // highlight active session row
  Array.from(document.querySelectorAll('.session-item')).forEach((el, i) => {
    el.classList.toggle('active-session', state.mode === 'session' && i === state.sessionIndex);
  });
}

function setColorClass(el, newClass) {
  el.classList.remove('state-warning', 'state-danger', 'state-done');
  if (newClass) el.classList.add(newClass);
}

function getCurrentMessage() {
  if (state.mode === 'session' && state.sessions.length > 0) {
    return state.sessions[state.sessionIndex]?.label || '';
  }
  return dom.inputMsg.value.trim();
}

function getStatusText() {
  if (state.remainSec <= 0) return '時間終了';
  if (state.running)        return '進行中';
  return '待機中';
}

/* ============================================================
   Timer core
   ============================================================ */
function tick() {
  if (!state.running) return;
  state.remainSec--;
  updateDisplay();

  if (state.remainSec <= 0) {
    state.running = false;
    clearInterval(state.intervalId);
    state.intervalId = null;

    // セッションモードで次がある場合は自動進行しない（手動で Next を押す）
    updateDisplay();
  }
}

function startTimer() {
  if (state.running) return;
  if (state.remainSec <= 0) return;
  state.running = true;
  state.intervalId = setInterval(tick, 1000);
  updateDisplay();
}

function pauseTimer() {
  state.running = false;
  clearInterval(state.intervalId);
  state.intervalId = null;
  updateDisplay();
}

function resetTimer() {
  state.running = false;
  clearInterval(state.intervalId);
  state.intervalId = null;

  if (state.mode === 'session' && state.sessions.length > 0) {
    state.sessionIndex = 0;
    state.remainSec = state.sessions[0].totalSec;
    state.totalSec  = state.sessions[0].totalSec;
  } else {
    state.remainSec = state.totalSec;
  }
  updateDisplay();
}

function nextSession() {
  if (state.sessionIndex >= state.sessions.length - 1) return;
  state.sessionIndex++;
  state.totalSec  = state.sessions[state.sessionIndex].totalSec;
  state.remainSec = state.totalSec;
  state.running = false;
  clearInterval(state.intervalId);
  state.intervalId = null;
  updateDisplay();
}

/* ============================================================
   Single mode: read inputs
   ============================================================ */
function readSingleInputs() {
  let m = parseInt(dom.inputMin.value, 10) || 0;
  let s = parseInt(dom.inputSec.value, 10) || 0;
  m = Math.max(0, Math.min(99, m));
  s = Math.max(0, Math.min(59, s));
  dom.inputMin.value = m;
  dom.inputSec.value = s;
  return m * 60 + s;
}

function applySingleSettings() {
  const sec = readSingleInputs();
  state.totalSec  = sec;
  state.remainSec = sec;
  state.mode = 'single';
  state.running = false;
  clearInterval(state.intervalId);
  state.intervalId = null;
  updateDisplay();
}

/* ============================================================
   Session mode
   ============================================================ */
let sessionCounter = 0;

function createSessionItem(label = '', minutes = 5) {
  const id = ++sessionCounter;
  const item = document.createElement('div');
  item.className = 'session-item';
  item.dataset.id = id;

  const order = document.createElement('span');
  order.className = 'session-order';

  const labelInput = document.createElement('input');
  labelInput.type = 'text';
  labelInput.placeholder = 'ラベル（例: 発表）';
  labelInput.value = label;
  labelInput.maxLength = 40;
  labelInput.setAttribute('aria-label', 'セッション名');

  const minInput = document.createElement('input');
  minInput.type = 'number';
  minInput.min = '1';
  minInput.max = '99';
  minInput.value = minutes;
  minInput.inputMode = 'numeric';
  minInput.setAttribute('aria-label', '分数');

  const minLabel = document.createElement('span');
  minLabel.className = 'session-min-label';
  minLabel.textContent = '分';

  const removeBtn = document.createElement('button');
  removeBtn.className = 'btn-remove';
  removeBtn.textContent = '✕';
  removeBtn.setAttribute('aria-label', 'このセッションを削除');
  removeBtn.addEventListener('click', () => {
    item.remove();
    renumberSessions();
  });

  item.appendChild(order);
  item.appendChild(labelInput);
  item.appendChild(minInput);
  item.appendChild(minLabel);
  item.appendChild(removeBtn);

  return item;
}

function renumberSessions() {
  const items = dom.sessionList.querySelectorAll('.session-item');
  items.forEach((el, i) => {
    el.querySelector('.session-order').textContent = `${i + 1}.`;
  });
}

function buildSessionsFromUI() {
  const items = dom.sessionList.querySelectorAll('.session-item');
  const sessions = [];
  items.forEach(item => {
    const labelInput = item.querySelectorAll('input')[0];
    const minInput   = item.querySelectorAll('input')[1];
    const label = labelInput.value.trim() || `セッション ${sessions.length + 1}`;
    const minutes = Math.max(1, parseInt(minInput.value, 10) || 5);
    sessions.push({ label, totalSec: minutes * 60 });
  });
  return sessions;
}

function applySessionSettings() {
  const sessions = buildSessionsFromUI();
  if (sessions.length === 0) return;
  state.sessions = sessions;
  state.sessionIndex = 0;
  state.totalSec  = sessions[0].totalSec;
  state.remainSec = sessions[0].totalSec;
  state.mode = 'session';
  state.running = false;
  clearInterval(state.intervalId);
  state.intervalId = null;
  updateDisplay();
}

/* ============================================================
   Fullscreen overlay
   ============================================================ */
function openFullscreen() {
  state.fsOpen = true;
  dom.fsOverlay.classList.remove('hidden');
  // Try native fullscreen
  if (document.documentElement.requestFullscreen) {
    document.documentElement.requestFullscreen().catch(() => {});
  }
  updateDisplay();
}

function closeFullscreen() {
  state.fsOpen = false;
  dom.fsOverlay.classList.add('hidden');
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => {});
  }
}

/* ============================================================
   Event: Tab switching
   ============================================================ */
dom.tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab;
    dom.tabBtns.forEach(b => {
      b.classList.toggle('active', b.dataset.tab === tab);
      b.setAttribute('aria-selected', String(b.dataset.tab === tab));
    });
    dom.panelSingle.classList.toggle('hidden', tab !== 'single');
    dom.panelSession.classList.toggle('hidden', tab !== 'session');
    dom.panelScript.classList.toggle('hidden', tab !== 'script');
    // 原稿タブは見積もるだけでタイマーを持たないので、単発モードのまま扱う
    state.mode = tab === 'session' ? 'session' : 'single';
  });
});

/* ============================================================
   Script estimation
   持ち時間に原稿が収まるかは、当日ではなく準備中に知りたい。
   文字数を話速で割って所要時間を出し、そのままタイマーに送る。
   ============================================================ */

// 日本語の朗読はおおむね300字/分。NHKのニュース読みがこの辺りで、
// 落ち着いたプレゼンもほぼ同じ。利用者が変えられるよう入力にしている。
const DEFAULT_CPM = 300;

function getCpm() {
  const v = parseInt(dom.inputCpm.value, 10);
  if (!Number.isFinite(v) || v < 100 || v > 600) return DEFAULT_CPM;
  return v;
}

// 空白・改行・区切り記号は読み上げないので数えない
function countChars(text) {
  return text.replace(/\s/g, '').replace(/-{3,}/g, '').length;
}

function secondsFor(chars, cpm) {
  return Math.round((chars / cpm) * 60);
}

function splitSections(text) {
  // 「---」でも空行でも区切れるようにする
  const byRule = text.split(/^\s*-{3,}\s*$/m);
  const parts = (byRule.length > 1 ? byRule : text.split(/\n\s*\n/))
    .map(s => s.trim())
    .filter(s => s.length > 0);
  return parts;
}

function renderSections(parts, cpm) {
  const box = dom.scriptSections;
  box.textContent = '';

  if (parts.length <= 1) {
    const p = document.createElement('p');
    p.className = 'empty-sections';
    p.textContent = '空行または「---」で区切ると、段落ごとの所要時間がここに出ます。';
    box.appendChild(p);
    return;
  }

  parts.forEach((part, i) => {
    const chars = countChars(part);
    const sec = secondsFor(chars, cpm);

    const item = document.createElement('div');
    item.className = 'section-item';

    const left = document.createElement('div');
    const label = document.createElement('span');
    label.className = 'section-label';
    label.textContent = `セクション ${i + 1}`;
    const cnt = document.createElement('span');
    cnt.className = 'section-chars';
    cnt.textContent = `（${chars.toLocaleString()}文字）`;
    const preview = document.createElement('div');
    preview.className = 'section-preview';
    preview.textContent = part.replace(/\s+/g, ' ').slice(0, 34) + (part.length > 34 ? '…' : '');
    left.append(label, cnt, preview);

    const time = document.createElement('span');
    time.className = 'section-time';
    time.textContent = formatTime(sec);

    item.append(left, time);
    box.appendChild(item);
  });
}

function updateScriptStats() {
  const text = dom.scriptInput.value;
  const cpm = getCpm();
  const chars = countChars(text);
  const sec = secondsFor(chars, cpm);

  dom.charCount.textContent = `${chars.toLocaleString()}文字`;
  dom.estimatedTime.textContent = `推定: ${formatTime(sec)}`;
  dom.btnScriptApply.disabled = chars === 0;

  renderSections(splitSections(text), cpm);
  return sec;
}

if (dom.scriptInput) {
  dom.scriptInput.addEventListener('input', updateScriptStats);
  dom.inputCpm.addEventListener('input', updateScriptStats);

  dom.btnScriptApply.addEventListener('click', () => {
    const sec = updateScriptStats();
    if (sec <= 0) return;

    // 99分を超えるとシングルタイマーの入力に収まらない
    const capped = Math.min(sec, 99 * 60 + 59);
    dom.inputMin.value = Math.floor(capped / 60);
    dom.inputSec.value = capped % 60;
    applySingleSettings();

    // 設定した時間を確認できるよう、シングルタイマーへ切り替える
    const singleTab = dom.tabBtns.find(b => b.dataset.tab === 'single');
    if (singleTab) singleTab.click();
  });

  updateScriptStats();
}

/* ============================================================
   Event: Preset buttons
   ============================================================ */
dom.presetBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const min = parseInt(btn.dataset.min, 10);
    dom.inputMin.value = min;
    dom.inputSec.value = 0;
    dom.presetBtns.forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    applySingleSettings();
  });
});

/* ============================================================
   Event: Manual time input change
   ============================================================ */
[dom.inputMin, dom.inputSec].forEach(el => {
  el.addEventListener('change', () => {
    dom.presetBtns.forEach(b => b.classList.remove('selected'));
    applySingleSettings();
  });
});

/* ============================================================
   Event: Single controls
   ============================================================ */
dom.btnStart.addEventListener('click', () => {
  if (state.mode !== 'single') return;
  const sec = readSingleInputs();
  if (state.remainSec <= 0 || state.totalSec !== sec) {
    state.totalSec  = sec;
    state.remainSec = sec;
  }
  startTimer();
});

dom.btnPause.addEventListener('click', pauseTimer);
dom.btnReset.addEventListener('click', resetTimer);
dom.btnFs.addEventListener('click', openFullscreen);

/* ============================================================
   Event: Session controls
   ============================================================ */
dom.btnAddSession.addEventListener('click', () => {
  const item = createSessionItem();
  dom.sessionList.appendChild(item);
  renumberSessions();
});

dom.btnSessionStart.addEventListener('click', () => {
  applySessionSettings();
  startTimer();
});

dom.btnSessionFs.addEventListener('click', () => {
  applySessionSettings();
  openFullscreen();
});

/* ============================================================
   Event: Fullscreen overlay controls
   ============================================================ */
dom.fsBtnStart.addEventListener('click', startTimer);
dom.fsBtnPause.addEventListener('click', pauseTimer);
dom.fsBtnReset.addEventListener('click', resetTimer);
dom.fsBtnNext.addEventListener('click', nextSession);
dom.fsBtnExit.addEventListener('click', closeFullscreen);
dom.btnNextSession.addEventListener('click', nextSession);

// ESC key closes overlay
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && state.fsOpen) closeFullscreen();
  if (e.key === ' ' && state.fsOpen) {
    e.preventDefault();
    if (state.running) pauseTimer(); else startTimer();
  }
});

// Native fullscreen exit detection
document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement && state.fsOpen) {
    closeFullscreen();
  }
});

/* ============================================================
   Initialize default sessions
   ============================================================ */
function initDefaultSessions() {
  const defaults = [
    { label: '発表', minutes: 15 },
    { label: '質疑応答', minutes: 5 },
  ];
  defaults.forEach(({ label, minutes }) => {
    const item = createSessionItem(label, minutes);
    dom.sessionList.appendChild(item);
  });
  renumberSessions();
}

/* ============================================================
   Boot
   ============================================================ */
(function init() {
  // Select first preset (5分) by default
  dom.presetBtns[0].classList.add('selected');
  applySingleSettings();
  initDefaultSessions();
  updateDisplay();
})();
