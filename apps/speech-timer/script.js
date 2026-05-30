'use strict';

// =========================================
// Speech Timer — script.js
// =========================================

// ---- 定数 ----
const CHARS_PER_MIN = 300;          // 日本語推定話速（文字/分）
const WARN_SECONDS  = 60;           // 黄色警告 残り60秒
const DANGER_SECONDS = 30;          // 赤警告 残り30秒
const MAX_HISTORY   = 5;            // 保存する履歴数
const STORAGE_KEY   = 'speechTimerHistory';

// ---- DOM参照 ----
const scriptInput    = document.getElementById('script-input');
const charCountEl    = document.getElementById('char-count');
const estimatedEl    = document.getElementById('estimated-time');
const inputMinutes   = document.getElementById('input-minutes');
const inputSeconds   = document.getElementById('input-seconds');
const presetBtns     = document.querySelectorAll('.preset-btn');
const timerDisplay   = document.getElementById('timer-display');
const timerText      = document.getElementById('timer-text');
const progressBar    = document.getElementById('progress-bar');
const progressWrap   = document.querySelector('.progress-bar-wrap');
const paceValue      = document.getElementById('pace-value');
const btnStart       = document.getElementById('btn-start');
const btnPause       = document.getElementById('btn-pause');
const btnReset       = document.getElementById('btn-reset');
const sectionsList   = document.getElementById('sections-list');
const historyList    = document.getElementById('history-list');
const btnClearHistory = document.getElementById('btn-clear-history');

// ---- タイマー状態 ----
let totalSeconds  = 0;   // 設定した合計秒数
let remaining     = 0;   // 残り秒数
let elapsed       = 0;   // 経過秒数
let timerId       = null;
let isRunning     = false;
let startTime     = null; // Date.now() at start (for accurate elapsed)
let elapsedAtPause = 0;  // 一時停止時の経過秒数

// ---- Web Audio API ----
let audioCtx = null;

function getAudioCtx() {
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      // 非対応ブラウザは無音で続行
    }
  }
  return audioCtx;
}

/**
 * ビープ音を鳴らす
 * @param {number} frequency - 周波数(Hz)
 * @param {number} duration  - 長さ(ms)
 * @param {number} volume    - 音量 0〜1
 */
function beep(frequency = 880, duration = 200, volume = 0.4) {
  const ctx = getAudioCtx();
  if (!ctx) return;

  try {
    const oscillator = ctx.createOscillator();
    const gainNode   = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    gainNode.gain.setValueAtTime(volume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration / 1000);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration / 1000);
  } catch (e) {
    // ignore
  }
}

/** 残り30秒の警告音（短いビープ2回） */
function beepWarning() {
  beep(880, 180, 0.35);
  setTimeout(() => beep(880, 180, 0.35), 300);
}

/** 時間切れアラーム（3回） */
function beepAlarm() {
  beep(660, 300, 0.5);
  setTimeout(() => beep(660, 300, 0.5), 450);
  setTimeout(() => beep(440, 500, 0.5), 900);
}

// =========================================
// 原稿テキストエリア — 文字数・推定時間
// =========================================

function getScriptText() {
  return scriptInput.value;
}

function countChars(text) {
  // 空白・改行・--- 区切りを除いた文字数
  return text.replace(/\s/g, '').replace(/---/g, '').length;
}

function updateScriptStats() {
  const text  = getScriptText();
  const chars = countChars(text);
  const mins  = chars / CHARS_PER_MIN;
  const m     = Math.floor(mins);
  const s     = Math.round((mins - m) * 60);

  charCountEl.textContent  = `${chars.toLocaleString()}文字`;
  estimatedEl.textContent  = `推定: ${m}分${String(s).padStart(2, '0')}秒`;

  updateSections(text);
}

// =========================================
// セクション分割
// =========================================

function updateSections(text) {
  const parts = text.split(/^---$/m).map(s => s.trim()).filter(s => s.length > 0);

  if (parts.length <= 1) {
    sectionsList.innerHTML = '<p class="empty-sections">原稿を「---」で区切るとここに表示されます。</p>';
    return;
  }

  const totalChars = parts.reduce((sum, p) => sum + countChars(p), 0) || 1;
  let html = '';

  parts.forEach((part, i) => {
    const chars    = countChars(part);
    const minsFrac = chars / CHARS_PER_MIN;
    const m        = Math.floor(minsFrac);
    const s        = Math.round((minsFrac - m) * 60);
    const preview  = part.replace(/\n/g, ' ').slice(0, 30) + (part.length > 30 ? '…' : '');

    html += `
      <div class="section-item">
        <div>
          <span class="section-label">セクション ${i + 1}</span>
          <span class="section-chars">（${chars.toLocaleString()}文字）</span>
          <div style="font-size:0.78rem;color:#9ca3af;margin-top:0.125rem;">${escapeHtml(preview)}</div>
        </div>
        <span class="section-time">${m}:${String(s).padStart(2, '0')}</span>
      </div>
    `;
  });

  sectionsList.innerHTML = html;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// =========================================
// タイマー設定
// =========================================

function getSetSeconds() {
  const m = parseInt(inputMinutes.value, 10) || 0;
  const s = parseInt(inputSeconds.value, 10) || 0;
  return m * 60 + s;
}

function formatTime(sec) {
  const absSec = Math.abs(sec);
  const m = Math.floor(absSec / 60);
  const s = absSec % 60;
  const sign = sec < 0 ? '-' : '';
  return `${sign}${m}:${String(s).padStart(2, '0')}`;
}

function setTimerDisplay(sec) {
  timerText.textContent = formatTime(sec);
  updateTimerColor(sec);
}

function updateTimerColor(sec) {
  timerDisplay.classList.remove('warn', 'danger', 'overtime');
  progressBar.classList.remove('warn', 'danger');

  if (!isRunning && elapsed === 0) {
    // 初期状態: 緑
    return;
  }

  if (sec < 0) {
    timerDisplay.classList.add('overtime');
    progressBar.classList.add('danger');
  } else if (sec <= DANGER_SECONDS) {
    timerDisplay.classList.add('danger');
    progressBar.classList.add('danger');
  } else if (sec <= WARN_SECONDS) {
    timerDisplay.classList.add('warn');
    progressBar.classList.add('warn');
  }
}

function updateProgressBar() {
  if (totalSeconds === 0) {
    progressBar.style.width = '0%';
    return;
  }
  const pct = Math.min((elapsed / totalSeconds) * 100, 100);
  progressBar.style.width = `${pct}%`;
  progressWrap.setAttribute('aria-valuenow', Math.round(pct));
}

function updatePace() {
  if (elapsed === 0) {
    paceValue.textContent = '-- 文字/分';
    return;
  }
  const chars   = countChars(getScriptText());
  const elapsedMin = elapsed / 60;
  const pace    = elapsedMin > 0 ? Math.round(chars / elapsedMin) : 0;
  paceValue.textContent = `${pace.toLocaleString()} 文字/分`;
}

// =========================================
// プリセットボタン
// =========================================

presetBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const mins = parseInt(btn.dataset.minutes, 10);
    inputMinutes.value = mins;
    inputSeconds.value = 0;
    presetBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    // タイマーが止まっていれば表示も更新
    if (!isRunning && elapsed === 0) {
      totalSeconds = getSetSeconds();
      remaining    = totalSeconds;
      setTimerDisplay(remaining);
      updateProgressBar();
    }
  });
});

// 入力欄の変更でプリセットの active を解除
[inputMinutes, inputSeconds].forEach(el => {
  el.addEventListener('input', () => {
    presetBtns.forEach(b => b.classList.remove('active'));
    if (!isRunning && elapsed === 0) {
      totalSeconds = getSetSeconds();
      remaining    = totalSeconds;
      setTimerDisplay(remaining);
      updateProgressBar();
    }
  });
});

// =========================================
// タイマー本体
// =========================================

let dangerBeeped = false;
let alarmBeeped  = false;

function tick() {
  const now        = Date.now();
  elapsed          = elapsedAtPause + Math.floor((now - startTime) / 1000);
  remaining        = totalSeconds - elapsed;

  // 残り30秒: 警告音（1回のみ）
  if (remaining <= DANGER_SECONDS && remaining > 0 && !dangerBeeped) {
    dangerBeeped = true;
    beepWarning();
  }

  // 表示更新
  setTimerDisplay(remaining);
  updateProgressBar();
  updatePace();

  // 時間切れ: アラーム音（1回のみ）+ オーバータイム継続表示
  if (remaining <= 0 && !alarmBeeped) {
    alarmBeeped = true;
    beepAlarm();
  }
}

function startTimer() {
  if (isRunning) return;

  totalSeconds = getSetSeconds();
  if (totalSeconds <= 0) {
    alert('発表時間を設定してください。');
    return;
  }

  // AudioContext はユーザー操作内で初期化
  getAudioCtx();

  isRunning    = true;
  startTime    = Date.now();
  dangerBeeped = (totalSeconds - elapsedAtPause) <= DANGER_SECONDS;
  alarmBeeped  = elapsedAtPause >= totalSeconds;

  timerId = setInterval(tick, 500);

  btnStart.disabled = true;
  btnPause.disabled = false;
}

function pauseTimer() {
  if (!isRunning) return;

  isRunning      = false;
  elapsedAtPause = elapsed;
  clearInterval(timerId);
  timerId = null;

  btnStart.disabled  = false;
  btnPause.disabled  = true;
  btnStart.textContent = '再開';
}

function resetTimer() {
  isRunning      = false;
  clearInterval(timerId);
  timerId = null;

  // 履歴保存（elapsed と totalSeconds を 0 にリセットする前に実行）
  const prevElapsed      = elapsed;
  const prevTotalSeconds = totalSeconds || getSetSeconds();

  elapsedAtPause = 0;
  elapsed        = 0;
  dangerBeeped   = false;
  alarmBeeped    = false;

  totalSeconds = getSetSeconds();
  remaining    = totalSeconds;

  timerDisplay.classList.remove('warn', 'danger', 'overtime');
  progressBar.classList.remove('warn', 'danger');

  setTimerDisplay(remaining);
  updateProgressBar();
  paceValue.textContent = '-- 文字/分';

  btnStart.disabled    = false;
  btnStart.textContent = '開始';
  btnPause.disabled    = true;

  if (prevElapsed > 0) {
    saveHistory(prevElapsed, prevTotalSeconds);
    renderHistory();
  }
}

// =========================================
// 履歴
// =========================================

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveHistory(elapsedSec, limitSec) {
  const history = loadHistory();
  const item = {
    date:       new Date().toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
    elapsed:    elapsedSec,
    limit:      limitSec,
    over:       elapsedSec > limitSec,
  };
  history.unshift(item);
  if (history.length > MAX_HISTORY) history.length = MAX_HISTORY;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch {
    // ignore quota errors
  }
}

function renderHistory() {
  const history = loadHistory();
  if (history.length === 0) {
    historyList.innerHTML = '<p class="empty-msg">まだ練習記録がありません。</p>';
    return;
  }

  let html = '';
  history.forEach(item => {
    const resultClass = item.over ? 'over' : 'ok';
    const label       = item.over
      ? `オーバー ${formatTime(item.elapsed - item.limit)}`
      : `${formatTime(item.elapsed)} / ${formatTime(item.limit)}`;

    html += `
      <div class="history-item">
        <span class="history-date">${escapeHtml(item.date)}</span>
        <span class="history-result ${resultClass}">${escapeHtml(label)}</span>
      </div>
    `;
  });
  historyList.innerHTML = html;
}

// =========================================
// イベントリスナー
// =========================================

scriptInput.addEventListener('input', updateScriptStats);

btnStart.addEventListener('click', startTimer);
btnPause.addEventListener('click', pauseTimer);
btnReset.addEventListener('click', resetTimer);

btnClearHistory.addEventListener('click', () => {
  if (confirm('履歴をすべて削除しますか？')) {
    localStorage.removeItem(STORAGE_KEY);
    renderHistory();
  }
});

// =========================================
// 初期化
// =========================================

(function init() {
  totalSeconds = getSetSeconds();
  remaining    = totalSeconds;
  setTimerDisplay(remaining);
  updateProgressBar();
  updateScriptStats();
  renderHistory();
})();
