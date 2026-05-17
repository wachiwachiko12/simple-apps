'use strict';

// ===== 定数 =====
const CYCLE_MINUTES = 90; // REM周期（分）
const MIN_CYCLES = 4;
const MAX_CYCLES = 6;
const RECOMMENDED_CYCLES = 5; // 7.5時間 = おすすめ

const STORAGE_KEY = 'sleep_optimizer_settings';

// ===== DOM取得 =====
const tabWakeup = document.getElementById('tab-wakeup');
const tabBedtime = document.getElementById('tab-bedtime');
const panelWakeup = document.getElementById('panel-wakeup');
const panelBedtime = document.getElementById('panel-bedtime');

const wakeupTimeInput = document.getElementById('wakeup-time');
const wakeupLatencyInput = document.getElementById('wakeup-latency');
const wakeupResults = document.getElementById('wakeup-results');

const bedtimeTimeInput = document.getElementById('bedtime-time');
const bedtimeLatencyInput = document.getElementById('bedtime-latency');
const bedtimeResults = document.getElementById('bedtime-results');

// ===== ユーティリティ =====

/**
 * "HH:MM" を { h, m } に分解
 */
function parseTime(str) {
  const [h, m] = str.split(':').map(Number);
  return { h, m };
}

/**
 * 分数を "HH:MM" 文字列に変換（0〜1440分）
 */
function minutesToHHMM(totalMinutes) {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * 時刻文字列 "HH:MM" を分数（0〜1439）に変換
 */
function timeToMinutes(str) {
  const { h, m } = parseTime(str);
  return h * 60 + m;
}

/**
 * 総睡眠分を "X時間Y分" に整形
 */
function formatSleepDuration(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h}時間`;
  return `${h}時間${m}分`;
}

/**
 * サイクル数からステージドットを生成
 */
function buildStageDots(cycles) {
  const container = document.createElement('div');
  container.className = 'stage-icons';
  container.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < cycles; i++) {
    // ノンREM
    const nrem = document.createElement('span');
    nrem.className = 'stage-dot nrem';
    nrem.title = 'ノンREM睡眠';
    // REM
    const rem = document.createElement('span');
    rem.className = 'stage-dot rem';
    rem.title = 'REM睡眠';
    container.appendChild(nrem);
    container.appendChild(rem);
  }
  return container;
}

// ===== 計算ロジック =====

/**
 * 起床時刻から逆算：就寝候補リストを返す
 * @param {string} wakeupStr - "HH:MM"
 * @param {number} latencyMin - 入眠所要時間（分）
 * @returns {Array<{bedtime: string, sleepMinutes: number, cycles: number, recommended: boolean}>}
 */
function calcBedtimesFromWakeup(wakeupStr, latencyMin) {
  const wakeupMinutes = timeToMinutes(wakeupStr);
  const results = [];

  for (let cycles = MAX_CYCLES; cycles >= MIN_CYCLES; cycles--) {
    const sleepMinutes = cycles * CYCLE_MINUTES;
    // 就寝時刻 = 起床 − 睡眠時間 − 入眠所要時間
    const bedtimeMinutes = wakeupMinutes - sleepMinutes - latencyMin;
    results.push({
      bedtime: minutesToHHMM(bedtimeMinutes),
      sleepMinutes,
      cycles,
      recommended: cycles === RECOMMENDED_CYCLES,
    });
  }

  return results;
}

/**
 * 就寝時刻から順算：起床候補リストを返す
 * @param {string} bedtimeStr - "HH:MM"
 * @param {number} latencyMin - 入眠所要時間（分）
 * @returns {Array<{wakeup: string, sleepMinutes: number, cycles: number, recommended: boolean}>}
 */
function calcWakeupsFromBedtime(bedtimeStr, latencyMin) {
  const bedtimeMinutes = timeToMinutes(bedtimeStr);
  const results = [];

  for (let cycles = MIN_CYCLES; cycles <= MAX_CYCLES; cycles++) {
    const sleepMinutes = cycles * CYCLE_MINUTES;
    // 起床時刻 = 就寝 + 入眠所要時間 + 睡眠時間
    const wakeupMinutes = bedtimeMinutes + latencyMin + sleepMinutes;
    results.push({
      wakeup: minutesToHHMM(wakeupMinutes),
      sleepMinutes,
      cycles,
      recommended: cycles === RECOMMENDED_CYCLES,
    });
  }

  return results;
}

// ===== レンダリング =====

/**
 * 就寝候補カードを生成（起床モード）
 */
function renderWakeupResults(results) {
  wakeupResults.innerHTML = '';

  const label = document.createElement('p');
  label.className = 'results-label';
  label.textContent = 'おすすめ就寝時刻';
  wakeupResults.appendChild(label);

  const cards = document.createElement('div');
  cards.className = 'result-cards';

  results.forEach((item) => {
    const card = document.createElement('div');
    card.className = 'result-card' + (item.recommended ? ' recommended' : '');

    const timeEl = document.createElement('div');
    timeEl.className = 'card-time';
    timeEl.textContent = item.bedtime;

    const infoEl = document.createElement('div');
    infoEl.className = 'card-info';

    const hoursEl = document.createElement('div');
    hoursEl.className = 'card-hours';
    hoursEl.textContent = `${formatSleepDuration(item.sleepMinutes)}の睡眠`;

    const cyclesEl = document.createElement('div');
    cyclesEl.className = 'card-cycles';
    cyclesEl.textContent = `${item.cycles}サイクル（90分×${item.cycles}）`;

    infoEl.appendChild(hoursEl);
    infoEl.appendChild(cyclesEl);
    infoEl.appendChild(buildStageDots(item.cycles));

    card.appendChild(timeEl);
    card.appendChild(infoEl);

    if (item.recommended) {
      const badge = document.createElement('span');
      badge.className = 'badge-recommended';
      badge.textContent = 'おすすめ';
      card.appendChild(badge);
    }

    cards.appendChild(card);
  });

  wakeupResults.appendChild(cards);
}

/**
 * 起床候補カードを生成（就寝モード）
 */
function renderBedtimeResults(results) {
  bedtimeResults.innerHTML = '';

  const label = document.createElement('p');
  label.className = 'results-label';
  label.textContent = 'おすすめ起床時刻';
  bedtimeResults.appendChild(label);

  const cards = document.createElement('div');
  cards.className = 'result-cards';

  results.forEach((item) => {
    const card = document.createElement('div');
    card.className = 'result-card' + (item.recommended ? ' recommended' : '');

    const timeEl = document.createElement('div');
    timeEl.className = 'card-time';
    timeEl.textContent = item.wakeup;

    const infoEl = document.createElement('div');
    infoEl.className = 'card-info';

    const hoursEl = document.createElement('div');
    hoursEl.className = 'card-hours';
    hoursEl.textContent = `${formatSleepDuration(item.sleepMinutes)}の睡眠`;

    const cyclesEl = document.createElement('div');
    cyclesEl.className = 'card-cycles';
    cyclesEl.textContent = `${item.cycles}サイクル（90分×${item.cycles}）`;

    infoEl.appendChild(hoursEl);
    infoEl.appendChild(cyclesEl);
    infoEl.appendChild(buildStageDots(item.cycles));

    card.appendChild(timeEl);
    card.appendChild(infoEl);

    if (item.recommended) {
      const badge = document.createElement('span');
      badge.className = 'badge-recommended';
      badge.textContent = 'おすすめ';
      card.appendChild(badge);
    }

    cards.appendChild(card);
  });

  bedtimeResults.appendChild(cards);
}

// ===== バリデーション =====

function validateLatency(input, errorEl) {
  const val = parseInt(input.value, 10);
  const valid = Number.isInteger(val) && val >= 1 && val <= 60;
  if (errorEl) errorEl.hidden = valid || input.value === '';
  input.classList.toggle('input-error', !valid && input.value !== '');
  return valid ? val : 14;
}

// ===== 計算トリガー =====

function computeWakeup() {
  const wakeupStr = wakeupTimeInput.value;
  const errEl = document.getElementById('wakeup-latency-error');
  const latency = validateLatency(wakeupLatencyInput, errEl);
  if (!wakeupStr) return;
  const results = calcBedtimesFromWakeup(wakeupStr, latency);
  renderWakeupResults(results);
  saveSettings();
}

function computeBedtime() {
  const bedtimeStr = bedtimeTimeInput.value;
  const errEl = document.getElementById('bedtime-latency-error');
  const latency = validateLatency(bedtimeLatencyInput, errEl);
  if (!bedtimeStr) return;
  const results = calcWakeupsFromBedtime(bedtimeStr, latency);
  renderBedtimeResults(results);
  saveSettings();
}

// ===== localStorage =====

function saveSettings() {
  const settings = {
    wakeupTime: wakeupTimeInput.value,
    wakeupLatency: wakeupLatencyInput.value,
    bedtimeTime: bedtimeTimeInput.value,
    bedtimeLatency: bedtimeLatencyInput.value,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (_) {
    // localStorage 不使用環境では無視
  }
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const settings = JSON.parse(raw);
    if (settings.wakeupTime) wakeupTimeInput.value = settings.wakeupTime;
    if (settings.wakeupLatency) wakeupLatencyInput.value = settings.wakeupLatency;
    if (settings.bedtimeTime) bedtimeTimeInput.value = settings.bedtimeTime;
    if (settings.bedtimeLatency) bedtimeLatencyInput.value = settings.bedtimeLatency;
  } catch (_) {
    // 破損データは無視
  }
}

// ===== タブ切り替え =====

function switchTab(mode) {
  if (mode === 'wakeup') {
    tabWakeup.classList.add('active');
    tabWakeup.setAttribute('aria-selected', 'true');
    tabBedtime.classList.remove('active');
    tabBedtime.setAttribute('aria-selected', 'false');
    panelWakeup.classList.remove('hidden');
    panelBedtime.classList.add('hidden');
    computeWakeup();
  } else {
    tabBedtime.classList.add('active');
    tabBedtime.setAttribute('aria-selected', 'true');
    tabWakeup.classList.remove('active');
    tabWakeup.setAttribute('aria-selected', 'false');
    panelBedtime.classList.remove('hidden');
    panelWakeup.classList.add('hidden');
    computeBedtime();
  }
}

// ===== イベント登録 =====

tabWakeup.addEventListener('click', () => switchTab('wakeup'));
tabBedtime.addEventListener('click', () => switchTab('bedtime'));

// リアルタイム計算
wakeupTimeInput.addEventListener('input', computeWakeup);
wakeupLatencyInput.addEventListener('input', computeWakeup);
bedtimeTimeInput.addEventListener('input', computeBedtime);
bedtimeLatencyInput.addEventListener('input', computeBedtime);

// ===== 初期化 =====
loadSettings();
computeWakeup();
computeBedtime();
