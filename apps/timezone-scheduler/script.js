'use strict';

// ========== 定数・設定 ==========

const CITY_PRESETS = [
  { label: '東京',          tz: 'Asia/Tokyo' },
  { label: 'ニューヨーク',   tz: 'America/New_York' },
  { label: 'ロンドン',      tz: 'Europe/London' },
  { label: '上海',          tz: 'Asia/Shanghai' },
  { label: 'シンガポール',   tz: 'Asia/Singapore' },
  { label: 'ロサンゼルス',   tz: 'America/Los_Angeles' },
  { label: 'シドニー',      tz: 'Australia/Sydney' },
  { label: 'パリ',          tz: 'Europe/Paris' },
  { label: 'ベルリン',      tz: 'Europe/Berlin' },
  { label: 'ドバイ',        tz: 'Asia/Dubai' },
];

const MAX_CITIES = 6;
const WORK_START = 9;  // 業務開始時刻（時）
const WORK_END = 18;   // 業務終了時刻（時）

// ========== 状態管理 ==========

let selectedCities = []; // { label, tz }
let currentDate = getTodayString();

// ========== 初期化 ==========

document.addEventListener('DOMContentLoaded', () => {
  initDatePicker();
  initAddCityButton();

  // デフォルト都市: 東京・ニューヨーク・ロンドン
  addCity('Asia/Tokyo');
  addCity('America/New_York');
  addCity('Europe/London');

  renderAll();
});

function getTodayString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ========== 日付ピッカー ==========

function initDatePicker() {
  const picker = document.getElementById('date-picker');
  picker.value = currentDate;
  picker.addEventListener('change', () => {
    currentDate = picker.value || getTodayString();
    renderAll();
  });
}

// ========== 都市追加・削除 ==========

function initAddCityButton() {
  const btn = document.getElementById('add-city-btn');
  const sel = document.getElementById('city-select');

  btn.addEventListener('click', () => {
    const tz = sel.value;
    if (!tz) return;
    addCity(tz);
    sel.value = '';
    renderAll();
  });

  // Enter キーでも追加
  sel.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') btn.click();
  });
}

function addCity(tz) {
  if (selectedCities.length >= MAX_CITIES) return;
  if (selectedCities.find(c => c.tz === tz)) return;

  const preset = CITY_PRESETS.find(p => p.tz === tz);
  if (!preset) return;

  selectedCities.push({ label: preset.label, tz: preset.tz });
}

function removeCity(tz) {
  selectedCities = selectedCities.filter(c => c.tz !== tz);
  renderAll();
}

// ========== タイムゾーンユーティリティ ==========

/**
 * 指定日付・時刻（UTC）を指定タイムゾーンで何時か取得する
 * @param {Date} utcDate
 * @param {string} tz  IANA timezone string
 * @returns {number} 0〜23 の時刻（整数）
 */
function getLocalHour(utcDate, tz) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: 'numeric',
    hour12: false,
  });
  const parts = formatter.formatToParts(utcDate);
  const hourPart = parts.find(p => p.type === 'hour');
  return parseInt(hourPart.value, 10) % 24;
}

/**
 * 指定日付・時刻（UTC）を指定タイムゾーンで "HH:00" 形式で取得
 */
function getLocalTimeLabel(utcDate, tz) {
  const hour = getLocalHour(utcDate, tz);
  return `${String(hour).padStart(2, '0')}:00`;
}

/**
 * 選択日の0:00 UTCを基準に、UTCの各時刻を取得
 * DST対応のため、選択日の各時刻をそのままUTCとして扱い、
 * 各都市の対応時刻をIntl.DateTimeFormatで算出する
 */
function buildUTCDates(dateStr) {
  // dateStr: "YYYY-MM-DD"
  const [y, mo, d] = dateStr.split('-').map(Number);
  const dates = [];
  for (let h = 0; h < 24; h++) {
    // UTCの選択日の各時刻を生成
    dates.push(new Date(Date.UTC(y, mo - 1, d, h, 0, 0)));
  }
  return dates;
}

/**
 * タイムゾーンのオフセット文字列を取得（例: "UTC+9", "UTC-5"）
 * DST込みの現在オフセット
 */
function getTzOffsetLabel(tz, dateStr) {
  const [y, mo, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, mo - 1, d, 12, 0, 0));

  const utcFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    hour: 'numeric',
    hour12: false,
  });
  const localFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: 'numeric',
    hour12: false,
  });

  const utcHour = parseInt(utcFormatter.formatToParts(date).find(p => p.type === 'hour').value, 10);
  const localHour = parseInt(localFormatter.formatToParts(date).find(p => p.type === 'hour').value, 10) % 24;

  let diff = localHour - utcHour;
  // 日付をまたぐ場合の補正
  if (diff > 12) diff -= 24;
  if (diff < -12) diff += 24;

  const sign = diff >= 0 ? '+' : '';
  return `UTC${sign}${diff}`;
}

// ========== 推奨時間帯計算 ==========

/**
 * 全都市の業務時間（9〜18時）が重なるUTCの時間インデックスを返す
 * @param {string} dateStr
 * @returns {number[]} UTCの時間インデックス（0〜23）の配列
 */
function calcRecommendedSlots(dateStr) {
  if (selectedCities.length < 2) return [];

  const utcDates = buildUTCDates(dateStr);
  const recommended = [];

  for (let i = 0; i < 24; i++) {
    const utcDate = utcDates[i];
    const allWork = selectedCities.every(city => {
      const localHour = getLocalHour(utcDate, city.tz);
      return localHour >= WORK_START && localHour < WORK_END;
    });
    if (allWork) {
      recommended.push(i);
    }
  }
  return recommended;
}

// ========== グリッドレンダリング ==========

function renderAll() {
  renderCityTags();
  renderGrid();
  renderSummary();
}

function renderCityTags() {
  const container = document.getElementById('city-tags');
  container.innerHTML = '';

  selectedCities.forEach(city => {
    const tag = document.createElement('div');
    tag.className = 'city-tag';
    tag.setAttribute('role', 'listitem');

    const name = document.createElement('span');
    name.textContent = city.label;

    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-btn';
    removeBtn.type = 'button';
    removeBtn.setAttribute('aria-label', `${city.label}を削除`);
    removeBtn.innerHTML = '&times;';
    removeBtn.addEventListener('click', () => removeCity(city.tz));

    tag.appendChild(name);
    tag.appendChild(removeBtn);
    container.appendChild(tag);
  });
}

function renderGrid() {
  const thead = document.getElementById('grid-head');
  const tbody = document.getElementById('grid-body');

  thead.innerHTML = '';
  tbody.innerHTML = '';

  if (selectedCities.length === 0) {
    const wrapper = document.querySelector('.grid-scroll');
    wrapper.innerHTML = '<p class="empty-grid-message">都市を追加してください。</p>';
    return;
  }

  // グリッドが削除されていた場合は再生成
  let table = document.getElementById('time-grid');
  if (!table) {
    const wrapper = document.querySelector('.grid-scroll');
    wrapper.innerHTML = '';
    table = document.createElement('table');
    table.id = 'time-grid';
    table.className = 'time-grid';
    table.setAttribute('aria-label', '都市別時刻表');
    const newThead = document.createElement('thead');
    newThead.id = 'grid-head';
    const newTbody = document.createElement('tbody');
    newTbody.id = 'grid-body';
    table.appendChild(newThead);
    table.appendChild(newTbody);
    wrapper.appendChild(table);
  }

  const utcDates = buildUTCDates(currentDate);
  const recommendedSlots = calcRecommendedSlots(currentDate);
  const now = new Date();

  // ===== ヘッダー行 =====
  const headerRow = document.createElement('tr');

  const thTime = document.createElement('th');
  thTime.scope = 'col';
  thTime.textContent = 'UTC';
  headerRow.appendChild(thTime);

  selectedCities.forEach(city => {
    const th = document.createElement('th');
    th.scope = 'col';

    const cityName = document.createElement('span');
    cityName.className = 'city-name';
    cityName.textContent = city.label;

    const offsetLabel = document.createElement('span');
    offsetLabel.className = 'tz-offset';
    offsetLabel.textContent = getTzOffsetLabel(city.tz, currentDate);

    th.appendChild(cityName);
    th.appendChild(offsetLabel);
    headerRow.appendChild(th);
  });

  document.getElementById('grid-head').appendChild(headerRow);

  // ===== データ行（24行）=====
  const gridBody = document.getElementById('grid-body');

  // 今日かどうか判定
  const todayStr = getTodayString();
  const isToday = currentDate === todayStr;
  const currentUTCHour = now.getUTCHours();

  for (let i = 0; i < 24; i++) {
    const utcDate = utcDates[i];
    const isRecommended = recommendedSlots.includes(i);
    const isCurrentHour = isToday && i === currentUTCHour;

    const tr = document.createElement('tr');

    // UTC時刻ラベル列
    const tdLabel = document.createElement('td');
    tdLabel.className = 'cell-time-label';
    tdLabel.textContent = `${String(i).padStart(2, '0')}:00`;
    if (isCurrentHour) {
      tdLabel.classList.add('cell-current');
    }
    tr.appendChild(tdLabel);

    // 各都市の列
    selectedCities.forEach(city => {
      const td = document.createElement('td');
      const localHour = getLocalHour(utcDate, city.tz);
      const isWork = localHour >= WORK_START && localHour < WORK_END;

      const timeLabel = `${String(localHour).padStart(2, '0')}:00`;

      if (isRecommended) {
        td.className = 'cell-recommended';
        td.setAttribute('aria-label', `${city.label} ${timeLabel} 推奨時間帯`);
      } else if (isWork) {
        td.className = 'cell-work';
        td.setAttribute('aria-label', `${city.label} ${timeLabel} 業務時間`);
      } else {
        td.className = 'cell-off';
        td.setAttribute('aria-label', `${city.label} ${timeLabel}`);
      }

      if (isCurrentHour) {
        td.classList.add('cell-current');
      }

      td.textContent = timeLabel;
      tr.appendChild(td);
    });

    gridBody.appendChild(tr);
  }
}

// ========== サマリーレンダリング ==========

function renderSummary() {
  const container = document.getElementById('summary-content');
  container.innerHTML = '';

  if (selectedCities.length < 2) {
    container.innerHTML = '<p class="summary-placeholder">都市を2つ以上追加すると、推奨時間帯が表示されます。</p>';
    return;
  }

  const recommendedSlots = calcRecommendedSlots(currentDate);

  if (recommendedSlots.length === 0) {
    const noOverlap = document.createElement('div');
    noOverlap.className = 'summary-no-overlap';
    noOverlap.textContent = '選択した都市の業務時間（9:00〜18:00）が重なる時間帯はありません。都市の組み合わせを変えてお試しください。';
    container.appendChild(noOverlap);
    return;
  }

  // 連続する時間帯をグループ化
  const groups = groupConsecutiveSlots(recommendedSlots);
  const utcDates = buildUTCDates(currentDate);

  groups.forEach(group => {
    const startUTCHour = group[0];
    const endUTCHour = group[group.length - 1] + 1; // 終了は次の時刻
    const durationHours = group.length;

    const box = document.createElement('div');
    box.className = 'summary-overlap';

    const title = document.createElement('div');
    title.className = 'summary-overlap-title';

    // 代表都市（最初の都市）で表示
    const refCity = selectedCities[0];
    const startLocalHour = getLocalHour(utcDates[startUTCHour], refCity.tz);
    const endLocalHour = getLocalHour(utcDates[Math.min(endUTCHour, 23)], refCity.tz);
    const endDisplay = endUTCHour < 24
      ? getLocalHour(utcDates[endUTCHour], refCity.tz)
      : (startLocalHour + durationHours) % 24;

    title.textContent = `重複業務時間: ${durationHours}時間（${refCity.label} ${String(startLocalHour).padStart(2, '0')}:00〜${String(endDisplay).padStart(2, '0')}:00）`;
    box.appendChild(title);

    // 各都市の対応時刻を表示
    const detail = document.createElement('div');
    detail.className = 'summary-overlap-detail';

    const cityRow = document.createElement('div');
    cityRow.className = 'city-time-row';

    selectedCities.forEach(city => {
      const cityStartHour = getLocalHour(utcDates[startUTCHour], city.tz);
      const cityEndHour = endUTCHour < 24
        ? getLocalHour(utcDates[endUTCHour], city.tz)
        : (cityStartHour + durationHours) % 24;

      const badge = document.createElement('span');
      badge.className = 'city-time-badge';
      badge.textContent = `${city.label} ${String(cityStartHour).padStart(2, '0')}:00〜${String(cityEndHour).padStart(2, '0')}:00`;
      cityRow.appendChild(badge);
    });

    detail.appendChild(cityRow);
    box.appendChild(detail);
    container.appendChild(box);
  });
}

/**
 * 連続する数値の配列をグループ化する
 * 例: [2,3,4,10,11] → [[2,3,4],[10,11]]
 */
function groupConsecutiveSlots(slots) {
  if (slots.length === 0) return [];

  const groups = [];
  let current = [slots[0]];

  for (let i = 1; i < slots.length; i++) {
    if (slots[i] === slots[i - 1] + 1) {
      current.push(slots[i]);
    } else {
      groups.push(current);
      current = [slots[i]];
    }
  }
  groups.push(current);
  return groups;
}
