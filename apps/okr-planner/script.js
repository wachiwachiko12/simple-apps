'use strict';

// ===== 定数 =====
const STORAGE_KEY = 'okr-planner-v1';
const MAX_OBJECTIVES = 4;
const MAX_KEY_RESULTS = 5;
const THEMES = ['blue', 'purple', 'green', 'orange'];
const OBJ_ICONS = ['🎯', '🚀', '💡', '🌱'];

// ===== 状態 =====
let currentQuarter = 'Q1';
let data = {}; // { Q1: [...objectives], Q2: [...], Q3: [...], Q4: [...] }

// ===== データ構造 =====
function createObjective(index) {
  return {
    id: Date.now() + Math.random(),
    title: '',
    icon: OBJ_ICONS[index] || '🎯',
    theme: THEMES[index] || 'blue',
    keyResults: [createKeyResult(0)]
  };
}

function createKeyResult(index) {
  return {
    id: Date.now() + Math.random(),
    name: '',
    current: '',
    target: '',
    unit: '%'
  };
}

// ===== ストレージ =====
function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('localStorage save failed:', e);
  }
}

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      data = JSON.parse(raw);
    }
  } catch (e) {
    console.warn('localStorage load failed:', e);
    data = {};
  }
  // 四半期が存在しない場合は空配列で初期化
  ['Q1', 'Q2', 'Q3', 'Q4'].forEach(q => {
    if (!Array.isArray(data[q])) data[q] = [];
  });
}

// ===== 計算 =====
function calcKrRate(kr) {
  const cur = parseFloat(kr.current);
  const tgt = parseFloat(kr.target);
  if (isNaN(cur) || isNaN(tgt) || tgt === 0) return 0;
  const rate = Math.round((cur / tgt) * 100);
  return Math.min(rate, 100);
}

function calcObjRate(obj) {
  const krs = obj.keyResults.filter(kr => kr.name.trim() !== '');
  if (krs.length === 0) return 0;
  const total = krs.reduce((sum, kr) => sum + calcKrRate(kr), 0);
  return Math.round(total / krs.length);
}

function rateColor(rate) {
  if (rate <= 40) return 'red';
  if (rate <= 70) return 'yellow';
  return 'green';
}

// ===== SVG円グラフ =====
function buildDonutSVG(rate, theme, size = 48) {
  const colors = {
    blue:   ['#2563eb', '#dbeafe'],
    purple: ['#7c3aed', '#ede9fe'],
    green:  ['#16a34a', '#dcfce7'],
    orange: ['#ea580c', '#ffedd5']
  };
  const [fill, bg] = colors[theme] || colors.blue;
  const r = 18;
  const cx = 24;
  const cy = 24;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - rate / 100);
  return `<svg width="${size}" height="${size}" viewBox="0 0 48 48" aria-hidden="true">
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${bg}" stroke-width="6"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${fill}" stroke-width="6"
      stroke-dasharray="${circumference.toFixed(2)}"
      stroke-dashoffset="${offset.toFixed(2)}"
      stroke-linecap="round"
      transform="rotate(-90 ${cx} ${cy})"/>
    <text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle"
      font-size="10" font-weight="700" fill="${fill}">${rate}%</text>
  </svg>`;
}

// ===== サマリーダッシュボード描画 =====
function renderSummary() {
  const grid = document.getElementById('summary-grid');
  const objectives = data[currentQuarter];

  if (objectives.length === 0) {
    grid.innerHTML = '<p class="summary-empty">Objectiveを追加すると達成率が表示されます</p>';
    return;
  }

  grid.innerHTML = objectives.map(obj => {
    const rate = calcObjRate(obj);
    const name = obj.title || '（タイトル未設定）';
    return `<div class="summary-card theme-${obj.theme}">
      <div class="summary-donut">${buildDonutSVG(rate, obj.theme, 44)}</div>
      <div class="summary-info">
        <div class="summary-obj-name" title="${escapeHtml(name)}">${escapeHtml(name)}</div>
        <div class="summary-rate">${rate}%</div>
      </div>
    </div>`;
  }).join('');
}

// ===== KRアイテムのHTML生成 =====
function buildKrItemHTML(kr, krIndex, objId) {
  const rate = calcKrRate(kr);
  const color = rateColor(rate);
  const barWidth = rate;

  return `<div class="kr-item" data-kr-id="${kr.id}">
    <div class="kr-row1">
      <span class="kr-number">KR${krIndex + 1}</span>
      <input
        class="kr-name-input"
        type="text"
        value="${escapeAttr(kr.name)}"
        placeholder="成果指標を入力（例: 新規顧客3件獲得）"
        aria-label="Key Result ${krIndex + 1} 名称"
        data-field="name"
        data-kr-id="${kr.id}"
      >
      <button class="btn-delete-kr" aria-label="KR${krIndex + 1}を削除" data-delete-kr="${kr.id}" data-obj-id="${objId}">&#10005;</button>
    </div>
    <div class="kr-row2">
      <div class="kr-value-group">
        <input
          class="kr-val-input"
          type="number"
          value="${escapeAttr(kr.current)}"
          placeholder="現在値"
          aria-label="現在値"
          data-field="current"
          data-kr-id="${kr.id}"
          inputmode="decimal"
        >
        <span class="kr-sep">/</span>
        <input
          class="kr-val-input"
          type="number"
          value="${escapeAttr(kr.target)}"
          placeholder="目標値"
          aria-label="目標値"
          data-field="target"
          data-kr-id="${kr.id}"
          inputmode="decimal"
        >
        <input
          class="kr-unit-input"
          type="text"
          value="${escapeAttr(kr.unit)}"
          placeholder="単位"
          aria-label="単位"
          data-field="unit"
          data-kr-id="${kr.id}"
        >
      </div>
      <div class="kr-progress-wrap">
        <div class="kr-progress-bar-bg">
          <div class="kr-progress-bar ${color}" style="width:${barWidth}%"></div>
        </div>
        <div class="kr-rate-text">${rate}%</div>
      </div>
    </div>
  </div>`;
}

// ===== OKRボード描画 =====
function renderBoard() {
  const board = document.getElementById('okr-board');
  const objectives = data[currentQuarter];

  board.innerHTML = objectives.map(obj => {
    const rate = calcObjRate(obj);
    const canAddKR = obj.keyResults.length < MAX_KEY_RESULTS;

    return `<article class="obj-card theme-${obj.theme}" data-obj-id="${obj.id}" aria-label="Objective: ${escapeAttr(obj.title || 'タイトル未設定')}">
      <div class="obj-card-header">
        <div class="obj-color-bar"></div>
        <span class="obj-icon" aria-hidden="true">${obj.icon}</span>
        <div class="obj-title-wrap">
          <input
            class="obj-title-input"
            type="text"
            value="${escapeAttr(obj.title)}"
            placeholder="Objectiveを入力（例: 売上目標達成）"
            aria-label="Objective タイトル"
            data-obj-id="${obj.id}"
            data-field="title"
          >
        </div>
        <div class="obj-rate-badge">
          <div class="obj-donut-wrap">${buildDonutSVG(rate, obj.theme, 48)}</div>
          <span class="obj-rate-label">達成率</span>
        </div>
        <div class="obj-actions">
          <button class="btn-icon delete-obj" aria-label="Objectiveを削除" data-delete-obj="${obj.id}">&#128465;</button>
        </div>
      </div>
      <div class="kr-list">
        ${obj.keyResults.map((kr, i) => buildKrItemHTML(kr, i, obj.id)).join('')}
      </div>
      <div class="add-kr-wrap">
        <button
          class="add-kr-btn"
          data-obj-id="${obj.id}"
          ${canAddKR ? '' : 'disabled'}
          aria-label="Key Resultを追加"
        >+ Key Resultを追加 ${canAddKR ? `(${obj.keyResults.length}/${MAX_KEY_RESULTS})` : '（上限）'}</button>
      </div>
    </article>`;
  }).join('');

  // Objective追加ボタンの活性制御
  const addObjBtn = document.getElementById('add-objective-btn');
  addObjBtn.disabled = objectives.length >= MAX_OBJECTIVES;

  renderSummary();
}

// ===== イベント委譲 =====
function setupEvents() {
  // 四半期タブ
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentQuarter = btn.dataset.q;
      document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.toggle('active', b === btn);
        b.setAttribute('aria-selected', b === btn ? 'true' : 'false');
      });
      renderBoard();
    });
  });

  // Objective追加
  document.getElementById('add-objective-btn').addEventListener('click', () => {
    const objectives = data[currentQuarter];
    if (objectives.length >= MAX_OBJECTIVES) return;
    objectives.push(createObjective(objectives.length));
    saveData();
    renderBoard();
  });

  // ボード内イベント委譲
  const board = document.getElementById('okr-board');

  board.addEventListener('input', (e) => {
    const t = e.target;
    const krId = t.dataset.krId;
    const objId = t.dataset.objId;
    const field = t.dataset.field;

    if (!field) return;

    if (objId && !krId) {
      // Objective タイトル変更
      const obj = findObj(objId);
      if (obj) {
        obj[field] = t.value;
        saveData();
        refreshObjRate(obj);
      }
    } else if (krId) {
      // KR フィールド変更
      const kr = findKR(krId);
      if (kr) {
        kr[field] = t.value;
        saveData();
        // 進捗バー & レートのみ即時更新
        const objId2 = findObjIdByKrId(krId);
        if (objId2) {
          refreshKrBar(kr, t);
          const obj = findObj(objId2);
          if (obj) refreshObjRate(obj);
        }
      }
    }
  });

  board.addEventListener('click', (e) => {
    // KR削除
    const deleteKrBtn = e.target.closest('[data-delete-kr]');
    if (deleteKrBtn) {
      const krId = deleteKrBtn.dataset.deleteKr;
      const objId = deleteKrBtn.dataset.objId;
      const obj = findObj(objId);
      if (obj && obj.keyResults.length > 1) {
        obj.keyResults = obj.keyResults.filter(kr => String(kr.id) !== String(krId));
        saveData();
        renderBoard();
      }
      return;
    }

    // Objective削除
    const deleteObjBtn = e.target.closest('[data-delete-obj]');
    if (deleteObjBtn) {
      const objId = deleteObjBtn.dataset.deleteObj;
      data[currentQuarter] = data[currentQuarter].filter(o => String(o.id) !== String(objId));
      saveData();
      renderBoard();
      return;
    }

    // KR追加
    const addKrBtn = e.target.closest('.add-kr-btn');
    if (addKrBtn) {
      const objId = addKrBtn.dataset.objId;
      const obj = findObj(objId);
      if (obj && obj.keyResults.length < MAX_KEY_RESULTS) {
        obj.keyResults.push(createKeyResult(obj.keyResults.length));
        saveData();
        renderBoard();
      }
      return;
    }
  });
}

// ===== 差分更新ヘルパー =====
function refreshKrBar(kr, inputEl) {
  const krItem = inputEl.closest('.kr-item');
  if (!krItem) return;
  const rate = calcKrRate(kr);
  const color = rateColor(rate);
  const bar = krItem.querySelector('.kr-progress-bar');
  const rateText = krItem.querySelector('.kr-rate-text');
  if (bar) {
    bar.style.width = rate + '%';
    bar.className = `kr-progress-bar ${color}`;
  }
  if (rateText) rateText.textContent = rate + '%';
}

function refreshObjRate(obj) {
  const card = document.querySelector(`[data-obj-id="${obj.id}"]`);
  if (!card) return;
  const rate = calcObjRate(obj);
  const donutWrap = card.querySelector('.obj-donut-wrap');
  if (donutWrap) donutWrap.innerHTML = buildDonutSVG(rate, obj.theme, 48);
  renderSummary();
}

// ===== 検索ヘルパー =====
function findObj(objId) {
  return data[currentQuarter].find(o => String(o.id) === String(objId));
}

function findKR(krId) {
  for (const obj of data[currentQuarter]) {
    const kr = obj.keyResults.find(k => String(k.id) === String(krId));
    if (kr) return kr;
  }
  return null;
}

function findObjIdByKrId(krId) {
  for (const obj of data[currentQuarter]) {
    if (obj.keyResults.some(k => String(k.id) === String(krId))) {
      return obj.id;
    }
  }
  return null;
}

// ===== XSSエスケープ =====
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(str) {
  return String(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ===== 初期化 =====
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  setupEvents();
  renderBoard();
});
