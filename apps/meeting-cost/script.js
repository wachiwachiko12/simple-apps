'use strict';

// ===== 定数 =====
const STORAGE_KEY = 'meeting_cost_settings';

/** 職種マスタ：ラベル・年収（万円）・時給（円） */
const JOB_TYPES = [
  { id: 'manager',        label: 'マネージャー',          annual: 800, hourly: 4808 },
  { id: 'senior-eng',     label: 'シニアエンジニア',       annual: 700, hourly: 4207 },
  { id: 'engineer',       label: 'エンジニア',             annual: 550, hourly: 3313 },
  { id: 'designer',       label: 'デザイナー',             annual: 500, hourly: 3012 },
  { id: 'sales',          label: '営業',                  annual: 550, hourly: 3313 },
  { id: 'back-office',    label: 'バックオフィス',          annual: 450, hourly: 2711 },
];

/** 早見表の会議時間リスト（分） */
const PRESET_DURATIONS = [30, 60, 90, 120];

/** デフォルト参加者 */
const DEFAULT_PARTICIPANTS = [
  { jobId: 'engineer', count: 3 },
  { jobId: 'manager',  count: 1 },
  { jobId: 'designer', count: 1 },
];

// ===== 状態 =====
let participants = [];  // { jobId, count }
let timerInterval = null;
let elapsedSeconds = 0;
let isRunning = false;

// ===== DOM取得 =====
const counterValue  = document.getElementById('counter-value');
const counterTime   = document.getElementById('counter-time');
const counterRate   = document.getElementById('counter-rate');
const btnStart      = document.getElementById('btn-start');
const btnStop       = document.getElementById('btn-stop');
const btnReset      = document.getElementById('btn-reset');
const participantsList = document.getElementById('participants-list');
const btnAddParticipant = document.getElementById('btn-add-participant');
const costTableBody = document.getElementById('cost-table-body');
const meetingValueInput = document.getElementById('meeting-value');
const roiResult     = document.getElementById('roi-result');

// ===== ユーティリティ =====

/**
 * 秒数を "HH:MM:SS" にフォーマット
 */
function formatElapsed(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
}

/**
 * 円を日本語通貨フォーマットに変換
 */
function formatYen(value) {
  return '¥' + Math.floor(value).toLocaleString('ja-JP');
}

/**
 * 全参加者の1秒あたりコスト（円/秒）を計算
 */
function calcCostPerSecond() {
  return participants.reduce((sum, p) => {
    const job = JOB_TYPES.find((j) => j.id === p.jobId);
    if (!job || p.count <= 0) return sum;
    return sum + (job.hourly / 3600) * p.count;
  }, 0);
}

/**
 * 全参加者の合計人数
 */
function calcTotalHeads() {
  return participants.reduce((sum, p) => sum + (p.count || 0), 0);
}

// ===== タイマー =====

function startTimer() {
  if (isRunning) return;
  isRunning = true;
  btnStart.disabled = true;
  btnStop.disabled  = false;
  counterValue.classList.add('running');

  timerInterval = setInterval(() => {
    elapsedSeconds++;
    updateCounterDisplay();
  }, 1000);
}

function stopTimer() {
  if (!isRunning) return;
  isRunning = false;
  clearInterval(timerInterval);
  timerInterval = null;
  btnStart.disabled = false;
  btnStop.disabled  = true;
  counterValue.classList.remove('running');
  updateROI();
}

function resetTimer() {
  stopTimer();
  elapsedSeconds = 0;
  updateCounterDisplay();
  roiResult.innerHTML = '';
  roiResult.className = 'roi-result';
  meetingValueInput.value = 0;
}

function updateCounterDisplay() {
  const costPerSec = calcCostPerSecond();
  const totalCost  = costPerSec * elapsedSeconds;
  const costPerMin = costPerSec * 60;

  counterValue.textContent = formatYen(totalCost);
  counterTime.textContent  = formatElapsed(elapsedSeconds);
  counterRate.textContent  = formatYen(costPerMin) + ' / 分';
}

// ===== 参加者 =====

/**
 * 参加者行のDOMを生成して返す
 */
function createParticipantRow(jobId, count, index) {
  const row = document.createElement('div');
  row.className = 'participant-row';
  row.dataset.index = index;

  // 職種セレクト
  const select = document.createElement('select');
  select.setAttribute('aria-label', `参加者${index + 1}の職種`);
  JOB_TYPES.forEach((job) => {
    const opt = document.createElement('option');
    opt.value = job.id;
    opt.textContent = `${job.label}（時給 ${job.hourly.toLocaleString('ja-JP')}円）`;
    if (job.id === jobId) opt.selected = true;
    select.appendChild(opt);
  });

  // 人数入力
  const numInput = document.createElement('input');
  numInput.type = 'number';
  numInput.min  = '1';
  numInput.max  = '50';
  numInput.value = count;
  numInput.setAttribute('aria-label', `参加者${index + 1}の人数`);

  // 時給表示
  const hourlyEl = document.createElement('span');
  hourlyEl.className = 'participant-hourly';
  const job = JOB_TYPES.find((j) => j.id === jobId);
  hourlyEl.textContent = `×${count}名`;

  // 削除ボタン
  const btnRemove = document.createElement('button');
  btnRemove.className = 'btn-remove-participant';
  btnRemove.innerHTML = '&#x2715;';
  btnRemove.setAttribute('aria-label', `参加者${index + 1}を削除`);

  // イベント
  select.addEventListener('change', () => {
    participants[index].jobId = select.value;
    updateHourlyLabel(hourlyEl, select.value, parseInt(numInput.value, 10) || 1);
    onParticipantsChange();
  });

  numInput.addEventListener('input', () => {
    const v = parseInt(numInput.value, 10);
    participants[index].count = isNaN(v) || v < 1 ? 1 : v;
    updateHourlyLabel(hourlyEl, select.value, participants[index].count);
    onParticipantsChange();
  });

  btnRemove.addEventListener('click', () => {
    participants.splice(index, 1);
    renderParticipants();
    onParticipantsChange();
  });

  row.appendChild(select);
  row.appendChild(numInput);
  row.appendChild(hourlyEl);
  row.appendChild(btnRemove);
  return row;
}

function updateHourlyLabel(el, jobId, count) {
  el.textContent = `×${count}名`;
}

function renderParticipants() {
  participantsList.innerHTML = '';
  participants.forEach((p, i) => {
    participantsList.appendChild(createParticipantRow(p.jobId, p.count, i));
  });
  updateCostTable();
  updateCounterDisplay();
  updateROI();
}

function addParticipant() {
  participants.push({ jobId: 'engineer', count: 1 });
  renderParticipants();
  saveSettings();
}

function onParticipantsChange() {
  updateCostTable();
  updateCounterDisplay();
  updateROI();
  saveSettings();
}

// ===== 早見表 =====

function updateCostTable() {
  const costPerSec = calcCostPerSecond();
  const totalHeads = calcTotalHeads();
  costTableBody.innerHTML = '';

  PRESET_DURATIONS.forEach((min) => {
    const totalCost = costPerSec * min * 60;
    const perHead   = totalHeads > 0 ? totalCost / totalHeads : 0;

    const label = min >= 60 ? `${min / 60}時間` : `${min}分`;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${label}</td>
      <td>
        <span class="cost-amount">${formatYen(totalCost)}</span>
        ${totalHeads > 0 ? `<br><span class="cost-per-head">一人あたり ${formatYen(perHead)}</span>` : ''}
      </td>
      <td>${totalHeads}名参加</td>
    `;
    costTableBody.appendChild(tr);
  });
}

// ===== ROI =====

function updateROI() {
  const totalCost = calcCostPerSecond() * elapsedSeconds;
  const value     = parseFloat(meetingValueInput.value) || 0;

  if (totalCost <= 0 || elapsedSeconds === 0) {
    roiResult.innerHTML = '';
    roiResult.className = 'roi-result';
    return;
  }

  const roi = (value / totalCost) * 100;
  const isPositive = roi >= 100;
  const isNeutral  = value === 0;

  roiResult.className = `roi-result ${isNeutral ? 'neutral' : isPositive ? 'positive' : 'negative'}`;

  let verdictText, detailText;

  if (isNeutral) {
    verdictText = '会議の価値を入力してください';
    detailText  = '上の入力欄に、この会議で得た成果の金銭的価値を入力するとROIを計算します。';
  } else if (roi >= 200) {
    verdictText = '非常に高い投資対効果です';
    detailText  = `コスト ${formatYen(totalCost)} に対して ${formatYen(value)} の価値を生み出しました。`;
  } else if (roi >= 100) {
    verdictText = 'この会議はコストに見合っています';
    detailText  = `コスト ${formatYen(totalCost)} に対して ${formatYen(value)} の価値を生み出しました。`;
  } else if (roi >= 50) {
    verdictText = 'やや費用対効果が低い会議です';
    detailText  = `コスト ${formatYen(totalCost)} に対して価値は ${formatYen(value)}。会議の目的を絞ることで改善できます。`;
  } else {
    verdictText = 'この会議は割に合っていません';
    detailText  = `コスト ${formatYen(totalCost)} に対して価値はわずか ${formatYen(value)}。この会議は本当に必要でしたか？`;
  }

  roiResult.innerHTML = `
    <div class="roi-percentage">${isNeutral ? '—' : Math.round(roi) + '%'}</div>
    <div class="roi-verdict">${verdictText}</div>
    <div class="roi-detail">${detailText}</div>
  `;
}

// ===== localStorage =====

function saveSettings() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(participants));
  } catch (_) {
    // localStorage 不使用環境では無視
  }
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const saved = JSON.parse(raw);
    if (!Array.isArray(saved) || saved.length === 0) return false;
    // バリデーション
    const validJobIds = JOB_TYPES.map((j) => j.id);
    participants = saved
      .filter((p) => validJobIds.includes(p.jobId) && Number.isInteger(p.count) && p.count >= 1)
      .slice(0, 20);
    return participants.length > 0;
  } catch (_) {
    return false;
  }
}

// ===== イベント登録 =====

btnStart.addEventListener('click', startTimer);
btnStop.addEventListener('click',  stopTimer);
btnReset.addEventListener('click', resetTimer);
btnAddParticipant.addEventListener('click', addParticipant);
meetingValueInput.addEventListener('input', updateROI);

// ===== 初期化 =====

(function init() {
  if (!loadSettings()) {
    participants = DEFAULT_PARTICIPANTS.map((p) => ({ ...p }));
  }
  renderParticipants();
  updateCounterDisplay();
})();
