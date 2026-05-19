'use strict';

// ===== 定数 =====
const MAX_CRITERIA = 10;
const MAX_OPTIONS = 8;
const STORAGE_KEY = 'decision_matrix_v1';

// ===== プリセット定義 =====
const PRESETS = {
  job: {
    criteria: [
      { name: '給与・報酬',         weight: 8 },
      { name: '働き方の自由度',     weight: 7 },
      { name: '将来性・スキルアップ', weight: 6 },
      { name: '人間関係・社風',     weight: 5 },
      { name: '通勤・立地',         weight: 3 },
    ],
    options: ['A社（現職）', 'B社（第一志望）', 'C社（条件重視）'],
    scores: [
      [6, 5, 8, 6, 7],
      [8, 7, 9, 7, 5],
      [9, 4, 5, 5, 8],
    ],
  },
  project: {
    criteria: [
      { name: '単価・報酬',       weight: 9 },
      { name: 'スキルアップ',     weight: 7 },
      { name: '稼働時間・負荷',   weight: 6 },
      { name: '継続性・安定性',   weight: 5 },
      { name: 'クライアント評判', weight: 4 },
    ],
    options: ['案件A（長期契約）', '案件B（高単価）', '案件C（スキル系）'],
    scores: [
      [6, 5, 7, 9, 8],
      [9, 6, 5, 4, 6],
      [5, 9, 6, 5, 7],
    ],
  },
  tool: {
    criteria: [
      { name: '機能の充実度',   weight: 8 },
      { name: '料金・コスト',   weight: 7 },
      { name: '操作性・UX',   weight: 6 },
      { name: 'サポート体制',  weight: 4 },
      { name: '連携・拡張性',  weight: 5 },
    ],
    options: ['ツールA', 'ツールB', 'ツールC'],
    scores: [
      [9, 5, 8, 7, 8],
      [7, 9, 7, 5, 6],
      [6, 7, 6, 8, 9],
    ],
  },
};

// ===== アプリ状態 =====
let state = {
  criteria: [],
  options: [],
  scores: [],  // scores[optionIndex][criterionIndex]
};

// ===== デフォルト初期状態 =====
function getDefaultState() {
  return {
    criteria: [
      { name: '給与・報酬',           weight: 8 },
      { name: '働き方の自由度',       weight: 7 },
      { name: '将来性・スキルアップ', weight: 6 },
      { name: '人間関係',             weight: 5 },
    ],
    options: ['選択肢A', '選択肢B', '選択肢C'],
    scores: [
      [5, 5, 5, 5],
      [5, 5, 5, 5],
      [5, 5, 5, 5],
    ],
  };
}

// ===== localStorage =====
function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (_) {
    // 無視
  }
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const saved = JSON.parse(raw);
    if (
      Array.isArray(saved.criteria) && saved.criteria.length > 0 &&
      Array.isArray(saved.options) && saved.options.length > 0 &&
      Array.isArray(saved.scores)
    ) {
      state = saved;
      return true;
    }
  } catch (_) {
    // 無視
  }
  return false;
}

// ===== スコアマトリクスのサイズ調整 =====
function resizeScores() {
  const numOptions = state.options.length;
  const numCriteria = state.criteria.length;

  // optionの数に合わせる
  while (state.scores.length < numOptions) {
    state.scores.push(new Array(numCriteria).fill(5));
  }
  state.scores = state.scores.slice(0, numOptions);

  // criteriaの数に合わせる
  for (let i = 0; i < state.scores.length; i++) {
    const row = state.scores[i];
    while (row.length < numCriteria) {
      row.push(5);
    }
    state.scores[i] = row.slice(0, numCriteria);
  }
}

// ===== 評価基準リスト描画 =====
function renderCriteriaList() {
  const container = document.getElementById('criteria-list');
  container.innerHTML = '';

  state.criteria.forEach((crit, i) => {
    const item = document.createElement('div');
    item.className = 'criteria-item';
    item.setAttribute('role', 'listitem');

    const indexEl = document.createElement('span');
    indexEl.className = 'item-index';
    indexEl.textContent = `${i + 1}`;

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'input-name';
    nameInput.value = crit.name;
    nameInput.placeholder = `基準${i + 1}の名前`;
    nameInput.setAttribute('aria-label', `評価基準${i + 1}の名前`);
    nameInput.addEventListener('input', (e) => {
      state.criteria[i].name = e.target.value;
      updateTableHeader();
      saveState();
    });

    const weightLabel = document.createElement('span');
    weightLabel.className = 'weight-label';
    weightLabel.textContent = '重み';

    const weightInput = document.createElement('input');
    weightInput.type = 'number';
    weightInput.className = 'input-weight';
    weightInput.value = crit.weight;
    weightInput.min = 1;
    weightInput.max = 10;
    weightInput.setAttribute('aria-label', `評価基準${i + 1}の重み（1〜10）`);
    weightInput.addEventListener('input', (e) => {
      const val = clampInt(e.target.value, 1, 10);
      if (e.target.value !== '' && parseInt(e.target.value, 10) !== val) e.target.value = val;
      state.criteria[i].weight = val;
      updateTableHeader();
      renderResults();
      saveState();
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-delete';
    deleteBtn.setAttribute('aria-label', `評価基準「${crit.name || i + 1}」を削除`);
    deleteBtn.textContent = '×';
    deleteBtn.addEventListener('click', () => {
      if (state.criteria.length <= 1) return;
      state.criteria.splice(i, 1);
      for (let r = 0; r < state.scores.length; r++) {
        state.scores[r].splice(i, 1);
      }
      renderAll();
      saveState();
    });

    item.appendChild(indexEl);
    item.appendChild(nameInput);
    item.appendChild(weightLabel);
    item.appendChild(weightInput);
    item.appendChild(deleteBtn);
    container.appendChild(item);
  });

  // 追加ボタンの有効/無効
  document.getElementById('btn-add-criterion').disabled = state.criteria.length >= MAX_CRITERIA;
}

// ===== 選択肢リスト描画 =====
function renderOptionsList() {
  const container = document.getElementById('options-list');
  container.innerHTML = '';

  state.options.forEach((opt, i) => {
    const item = document.createElement('div');
    item.className = 'option-item';
    item.setAttribute('role', 'listitem');

    const indexEl = document.createElement('span');
    indexEl.className = 'item-index';
    indexEl.textContent = `${i + 1}`;

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'input-name';
    nameInput.value = opt;
    nameInput.placeholder = `選択肢${i + 1}の名前`;
    nameInput.setAttribute('aria-label', `選択肢${i + 1}の名前`);
    nameInput.addEventListener('input', (e) => {
      state.options[i] = e.target.value;
      updateTableOptionNames();
      renderResults();
      saveState();
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-delete';
    deleteBtn.setAttribute('aria-label', `選択肢「${opt || i + 1}」を削除`);
    deleteBtn.textContent = '×';
    deleteBtn.addEventListener('click', () => {
      if (state.options.length <= 1) return;
      state.options.splice(i, 1);
      state.scores.splice(i, 1);
      renderAll();
      saveState();
    });

    item.appendChild(indexEl);
    item.appendChild(nameInput);
    item.appendChild(deleteBtn);
    container.appendChild(item);
  });

  document.getElementById('btn-add-option').disabled = state.options.length >= MAX_OPTIONS;
}

// ===== スコアテーブル描画（フルビルド） =====
function renderScoreTable() {
  renderTableHeader();
  renderTableBody();
}

function renderTableHeader() {
  const thead = document.getElementById('score-thead');
  thead.innerHTML = '';
  const tr = document.createElement('tr');

  // 選択肢列ヘッダー
  const thOption = document.createElement('th');
  thOption.className = 'th-option';
  thOption.textContent = '選択肢';
  tr.appendChild(thOption);

  // 各評価基準列ヘッダー
  state.criteria.forEach((crit) => {
    const th = document.createElement('th');
    const nameEl = document.createElement('span');
    nameEl.textContent = crit.name || '（未入力）';

    const weightEl = document.createElement('span');
    weightEl.className = 'weight-badge';
    weightEl.textContent = `重み: ${crit.weight}`;

    th.appendChild(nameEl);
    th.appendChild(weightEl);
    tr.appendChild(th);
  });

  thead.appendChild(tr);
}

function updateTableHeader() {
  renderTableHeader();
  renderResults();
}

function renderTableBody() {
  const tbody = document.getElementById('score-tbody');
  tbody.innerHTML = '';

  state.options.forEach((opt, optIdx) => {
    const tr = document.createElement('tr');

    // 選択肢名セル
    const tdName = document.createElement('td');
    tdName.className = 'td-option-name';
    tdName.textContent = opt || `選択肢${optIdx + 1}`;
    tr.appendChild(tdName);

    // スコアセル
    state.criteria.forEach((_, critIdx) => {
      const td = document.createElement('td');
      const input = document.createElement('input');
      input.type = 'number';
      input.className = 'score-input';
      input.min = 1;
      input.max = 10;
      input.value = state.scores[optIdx][critIdx];
      input.setAttribute('aria-label', `${opt || '選択肢' + (optIdx + 1)} の ${state.criteria[critIdx].name || '基準' + (critIdx + 1)} スコア`);

      applyScoreColor(input, state.scores[optIdx][critIdx]);

      input.addEventListener('input', (e) => {
        const val = clampInt(e.target.value, 1, 10);
        if (e.target.value !== '' && parseInt(e.target.value, 10) !== val) e.target.value = val;
        state.scores[optIdx][critIdx] = val;
        applyScoreColor(e.target, val);
        renderResults();
        saveState();
      });

      td.appendChild(input);
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });
}

function updateTableOptionNames() {
  const tbody = document.getElementById('score-tbody');
  const rows = tbody.querySelectorAll('tr');
  rows.forEach((tr, i) => {
    const tdName = tr.querySelector('.td-option-name');
    if (tdName) {
      tdName.textContent = state.options[i] || `選択肢${i + 1}`;
    }
  });
}

function applyScoreColor(input, val) {
  input.classList.remove('score-high', 'score-low');
  if (val >= 8) input.classList.add('score-high');
  else if (val <= 3) input.classList.add('score-low');
}

// ===== 集計ロジック =====
function calcWeightedScores() {
  return state.options.map((opt, optIdx) => {
    let total = 0;
    state.criteria.forEach((crit, critIdx) => {
      total += (state.scores[optIdx][critIdx] || 5) * crit.weight;
    });
    return { name: opt || `選択肢${optIdx + 1}`, score: total };
  });
}

// ===== 結果描画 =====
function renderResults() {
  const container = document.getElementById('result-list');

  if (state.options.length === 0 || state.criteria.length === 0) {
    container.innerHTML = '<p class="empty-state">評価基準と選択肢を設定するとランキングが表示されます</p>';
    return;
  }

  const results = calcWeightedScores();
  const maxScore = Math.max(...results.map((r) => r.score));
  const sorted = results
    .map((r, i) => ({ ...r, originalIdx: i }))
    .sort((a, b) => b.score - a.score);

  container.innerHTML = '';

  sorted.forEach((item, rank) => {
    const el = document.createElement('div');
    el.className = 'result-item' + (rank === 0 ? ' result-top' : '');
    el.setAttribute('aria-label', `${rank + 1}位: ${item.name} スコア${item.score}点`);

    // 順位
    const rankEl = document.createElement('div');
    rankEl.className = 'result-rank';
    rankEl.textContent = rank === 0 ? '1st' : `${rank + 1}位`;

    // 情報ブロック
    const infoEl = document.createElement('div');
    infoEl.className = 'result-info';

    const nameEl = document.createElement('div');
    nameEl.className = 'result-name';
    nameEl.textContent = item.name;

    // バー
    const barWrap = document.createElement('div');
    barWrap.className = 'result-bar-wrap';
    barWrap.setAttribute('role', 'img');
    barWrap.setAttribute('aria-hidden', 'true');

    const bar = document.createElement('div');
    bar.className = 'result-bar';
    const barPct = maxScore > 0 ? Math.round((item.score / maxScore) * 100) : 0;
    bar.style.width = barPct + '%';

    barWrap.appendChild(bar);
    infoEl.appendChild(nameEl);
    infoEl.appendChild(barWrap);

    // スコアブロック
    const scoreBlock = document.createElement('div');
    scoreBlock.className = 'result-score-block';

    const scoreEl = document.createElement('div');
    scoreEl.className = 'result-score';
    scoreEl.textContent = item.score;

    const scoreLabelEl = document.createElement('div');
    scoreLabelEl.className = 'result-score-label';
    scoreLabelEl.textContent = '加重合計';

    scoreBlock.appendChild(scoreEl);
    scoreBlock.appendChild(scoreLabelEl);

    el.appendChild(rankEl);
    el.appendChild(infoEl);
    el.appendChild(scoreBlock);

    // 推奨バッジ（1位のみ）
    if (rank === 0) {
      const badge = document.createElement('span');
      badge.className = 'badge-recommended';
      badge.textContent = '推奨';
      el.appendChild(badge);
    }

    container.appendChild(el);
  });
}

// ===== 全体再描画 =====
function renderAll() {
  resizeScores();
  renderCriteriaList();
  renderOptionsList();
  renderScoreTable();
  renderResults();
}

// ===== ユーティリティ =====
function clampInt(val, min, max) {
  const n = parseInt(val, 10);
  if (!Number.isInteger(n)) return min;
  return Math.min(Math.max(n, min), max);
}

// ===== プリセット読み込み =====
function loadPreset(key) {
  const preset = PRESETS[key];
  if (!preset) return;

  state.criteria = preset.criteria.map((c) => ({ ...c }));
  state.options = [...preset.options];
  state.scores = preset.scores.map((row) => [...row]);

  renderAll();
  saveState();
}

// ===== リセット =====
function resetState() {
  state = getDefaultState();
  renderAll();
  saveState();
}

// ===== イベント登録 =====
document.getElementById('btn-add-criterion').addEventListener('click', () => {
  if (state.criteria.length >= MAX_CRITERIA) return;
  state.criteria.push({ name: '', weight: 5 });
  resizeScores();
  renderCriteriaList();
  renderScoreTable();
  renderResults();
  saveState();

  // 追加した入力欄にフォーカス
  const inputs = document.querySelectorAll('#criteria-list .input-name');
  if (inputs.length > 0) inputs[inputs.length - 1].focus();
});

document.getElementById('btn-add-option').addEventListener('click', () => {
  if (state.options.length >= MAX_OPTIONS) return;
  state.options.push('');
  resizeScores();
  renderOptionsList();
  renderScoreTable();
  renderResults();
  saveState();

  const inputs = document.querySelectorAll('#options-list .input-name');
  if (inputs.length > 0) inputs[inputs.length - 1].focus();
});

document.getElementById('btn-reset').addEventListener('click', () => {
  if (confirm('入力内容をリセットしてデフォルト状態に戻しますか？')) {
    resetState();
  }
});

document.querySelectorAll('.btn-preset').forEach((btn) => {
  btn.addEventListener('click', (e) => {
    const key = e.currentTarget.dataset.preset;
    loadPreset(key);
  });
});

// ===== 初期化 =====
if (!loadState()) {
  state = getDefaultState();
}
renderAll();
