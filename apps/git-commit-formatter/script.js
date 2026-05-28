'use strict';

// ===== 定数 =====
const COMMIT_TYPES = [
  { name: 'feat',     icon: '✨', desc: '新機能の追加' },
  { name: 'fix',      icon: '🐛', desc: 'バグの修正' },
  { name: 'docs',     icon: '📝', desc: 'ドキュメントの変更' },
  { name: 'style',    icon: '💄', desc: '書式・スタイルの変更' },
  { name: 'refactor', icon: '♻️',  desc: 'リファクタリング' },
  { name: 'test',     icon: '✅', desc: 'テストの追加・修正' },
  { name: 'chore',    icon: '🔧', desc: 'ビルド・設定変更' },
  { name: 'perf',     icon: '⚡', desc: 'パフォーマンス改善' },
  { name: 'ci',       icon: '👷', desc: 'CI設定の変更' },
  { name: 'build',    icon: '📦', desc: 'ビルドシステムの変更' },
];

const SCOPE_SUGGESTIONS = [
  'api', 'auth', 'ui', 'database', 'core', 'config',
  'deps', 'docs', 'router', 'store', 'utils', 'test',
  'ci', 'build', 'security', 'logger', 'cache', 'model',
];

const STORAGE_KEY = 'git-commit-formatter-history';
const MAX_HISTORY = 5;

// ===== 状態 =====
let selectedType = '';
let history = [];

// ===== DOM 取得 =====
const typeGrid       = document.getElementById('type-grid');
const scopeInput     = document.getElementById('scope-input');
const scopeSuggest   = document.getElementById('scope-suggestions');
const subjectInput   = document.getElementById('subject-input');
const subjectCounter = document.getElementById('subject-counter');
const bodyInput      = document.getElementById('body-input');
const closesInput    = document.getElementById('closes-input');
const breakingCb     = document.getElementById('breaking-checkbox');
const breakingWrap   = document.getElementById('breaking-detail-wrap');
const breakingDetail = document.getElementById('breaking-detail');
const previewOutput  = document.getElementById('preview-output');
const copyBtn        = document.getElementById('copy-btn');
const copyFeedback   = document.getElementById('copy-feedback');
const historyList    = document.getElementById('history-list');
const historyEmpty   = document.getElementById('history-empty');
const clearHistoryBtn = document.getElementById('clear-history-btn');

// ===== タイプボタン生成 =====
function buildTypeGrid() {
  COMMIT_TYPES.forEach(t => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'type-btn';
    btn.setAttribute('aria-pressed', 'false');
    btn.dataset.type = t.name;

    const iconEl = document.createElement('span');
    iconEl.className = 'type-icon';
    iconEl.setAttribute('aria-hidden', 'true');
    iconEl.textContent = t.icon;

    const infoEl = document.createElement('span');
    infoEl.className = 'type-info';

    const nameEl = document.createElement('span');
    nameEl.className = 'type-name';
    nameEl.textContent = t.name;

    const descEl = document.createElement('span');
    descEl.className = 'type-desc';
    descEl.textContent = t.desc;

    infoEl.appendChild(nameEl);
    infoEl.appendChild(descEl);
    btn.appendChild(iconEl);
    btn.appendChild(infoEl);

    btn.addEventListener('click', () => selectType(t.name, btn));

    typeGrid.appendChild(btn);
  });
}

function selectType(typeName, clickedBtn) {
  // 既に選択済みなら解除
  if (selectedType === typeName) {
    selectedType = '';
    clickedBtn.classList.remove('selected');
    clickedBtn.setAttribute('aria-pressed', 'false');
  } else {
    // 他のボタンの選択を解除
    typeGrid.querySelectorAll('.type-btn').forEach(b => {
      b.classList.remove('selected');
      b.setAttribute('aria-pressed', 'false');
    });
    selectedType = typeName;
    clickedBtn.classList.add('selected');
    clickedBtn.setAttribute('aria-pressed', 'true');
  }
  updatePreview();
}

// ===== スコープサジェスト =====
function showSuggestions(value) {
  const q = value.trim().toLowerCase();
  const filtered = q
    ? SCOPE_SUGGESTIONS.filter(s => s.startsWith(q) && s !== q)
    : SCOPE_SUGGESTIONS.slice(0, 8);

  scopeSuggest.innerHTML = '';
  if (!filtered.length) {
    scopeSuggest.classList.remove('visible');
    scopeInput.setAttribute('aria-expanded', 'false');
    return;
  }

  filtered.forEach((s, idx) => {
    const item = document.createElement('div');
    item.className = 'suggestion-item';
    item.textContent = s;
    item.setAttribute('role', 'option');
    item.setAttribute('id', 'suggestion-' + idx);
    item.addEventListener('mousedown', e => {
      e.preventDefault();
      scopeInput.value = s;
      scopeSuggest.classList.remove('visible');
      updatePreview();
    });
    scopeSuggest.appendChild(item);
  });

  scopeSuggest.classList.add('visible');
  scopeInput.setAttribute('aria-expanded', 'true');
}

scopeInput.addEventListener('input', () => {
  showSuggestions(scopeInput.value);
  updatePreview();
});

scopeInput.addEventListener('focus', () => {
  showSuggestions(scopeInput.value);
});

scopeInput.addEventListener('blur', () => {
  setTimeout(() => {
    scopeSuggest.classList.remove('visible');
    scopeInput.setAttribute('aria-expanded', 'false');
  }, 150);
});

// ===== 件名カウンター =====
subjectInput.addEventListener('input', () => {
  const len = subjectInput.value.length;
  subjectCounter.textContent = len + ' / 72';
  subjectCounter.classList.toggle('warn', len > 50);
  updatePreview();
});

// ===== 本文・Closes・Breaking =====
bodyInput.addEventListener('input', updatePreview);
closesInput.addEventListener('input', updatePreview);

breakingCb.addEventListener('change', () => {
  breakingWrap.classList.toggle('visible', breakingCb.checked);
  updatePreview();
});

breakingDetail.addEventListener('input', updatePreview);

// ===== プレビュー生成 =====
function buildCommitMessage() {
  const type    = selectedType;
  const scope   = scopeInput.value.trim();
  const subject = subjectInput.value.trim();
  const body    = bodyInput.value.trim();
  const closes  = closesInput.value.trim();
  const isBreaking = breakingCb.checked;
  const breakingMsg = breakingDetail.value.trim();

  if (!type && !subject) return '';

  // header
  let header = type || '(タイプ未選択)';
  if (scope) header += '(' + scope + ')';
  if (isBreaking) header += '!';
  header += ': ' + (subject || '(説明を入力してください)');

  const lines = [header];

  // body
  if (body) {
    lines.push('');
    lines.push(body);
  }

  // footers
  const footers = [];

  if (isBreaking && breakingMsg) {
    footers.push('BREAKING CHANGE: ' + breakingMsg);
  } else if (isBreaking && !breakingMsg) {
    footers.push('BREAKING CHANGE: (変更内容を入力してください)');
  }

  if (closes) {
    const nums = closes.split(/[,\s]+/).map(n => n.replace(/^#/, '').trim()).filter(Boolean);
    nums.forEach(n => footers.push('Closes #' + n));
  }

  if (footers.length) {
    lines.push('');
    footers.forEach(f => lines.push(f));
  }

  return lines.join('\n');
}

function updatePreview() {
  const msg = buildCommitMessage();
  if (!msg) {
    previewOutput.textContent = 'タイプと説明を入力するとここにプレビューが表示されます';
    previewOutput.classList.add('placeholder');
    copyBtn.disabled = true;
  } else {
    previewOutput.textContent = msg;
    previewOutput.classList.remove('placeholder');
    copyBtn.disabled = false;
  }
}

// ===== コピー =====
copyBtn.addEventListener('click', () => {
  const msg = buildCommitMessage();
  if (!msg) return;

  navigator.clipboard.writeText(msg).then(() => {
    copyBtn.textContent = 'コピー完了!';
    copyBtn.classList.add('copied');
    copyFeedback.textContent = 'クリップボードにコピーしました';

    setTimeout(() => {
      copyBtn.textContent = 'コピー';
      copyBtn.classList.remove('copied');
      copyFeedback.textContent = '';
    }, 2000);

    saveToHistory(msg);
  }).catch(() => {
    // フォールバック（HTTPなど）
    const el = document.createElement('textarea');
    el.value = msg;
    el.style.position = 'fixed';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);

    copyBtn.textContent = 'コピー完了!';
    copyBtn.classList.add('copied');
    copyFeedback.textContent = 'クリップボードにコピーしました';

    setTimeout(() => {
      copyBtn.textContent = 'コピー';
      copyBtn.classList.remove('copied');
      copyFeedback.textContent = '';
    }, 2000);

    saveToHistory(msg);
  });
});

// ===== 履歴 =====
function loadHistory() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    history = data ? JSON.parse(data) : [];
  } catch {
    history = [];
  }
}

function saveToHistory(msg) {
  // 同一メッセージは先頭に移動
  history = history.filter(h => h !== msg);
  history.unshift(msg);
  if (history.length > MAX_HISTORY) history = history.slice(0, MAX_HISTORY);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch { /* quota exceeded など */ }
  renderHistory();
}

function renderHistory() {
  historyList.innerHTML = '';

  if (!history.length) {
    historyEmpty.style.display = 'block';
    return;
  }

  historyEmpty.style.display = 'none';

  history.forEach(msg => {
    const li = document.createElement('li');
    li.className = 'history-item';
    li.setAttribute('role', 'button');
    li.setAttribute('tabindex', '0');
    li.setAttribute('aria-label', 'コミットメッセージを選択: ' + msg.split('\n')[0]);

    const msgEl = document.createElement('span');
    msgEl.className = 'history-msg';
    msgEl.textContent = msg;

    const icon = document.createElement('span');
    icon.className = 'history-copy-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = '📋';

    li.appendChild(msgEl);
    li.appendChild(icon);

    const apply = () => {
      navigator.clipboard.writeText(msg).catch(() => {
        const el = document.createElement('textarea');
        el.value = msg;
        el.style.position = 'fixed';
        el.style.opacity = '0';
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      });
      copyFeedback.textContent = '履歴からコピーしました';
      setTimeout(() => { copyFeedback.textContent = ''; }, 2000);
    };

    li.addEventListener('click', apply);
    li.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); apply(); }
    });

    historyList.appendChild(li);
  });
}

clearHistoryBtn.addEventListener('click', () => {
  if (!history.length) return;
  history = [];
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* noop */ }
  renderHistory();
});

// ===== 初期化 =====
function init() {
  buildTypeGrid();
  loadHistory();
  renderHistory();
  updatePreview();
}

document.addEventListener('DOMContentLoaded', init);
