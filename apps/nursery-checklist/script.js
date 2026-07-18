'use strict';

const DEFAULT_ITEMS = [
  { id: 'd1', name: '連絡帳' },
  { id: 'd2', name: 'お着替え（上下）' },
  { id: 'd3', name: 'おむつ' },
  { id: 'd4', name: 'おしりふき' },
  { id: 'd5', name: 'タオル' },
  { id: 'd6', name: 'エプロン' },
  { id: 'd7', name: '帽子' },
  { id: 'd8', name: '水筒' },
  { id: 'd9', name: '給食袋' },
  { id: 'd10', name: 'ナフキン' },
];

let items = [];
let checkedIds = new Set();

/* ── Utilities ── */

function getToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getMsUntilMidnight() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return midnight - now;
}

/* ── Storage ── */

function loadData() {
  const savedItems = localStorage.getItem('nursery_items');
  if (savedItems) {
    items = JSON.parse(savedItems);
  } else {
    items = DEFAULT_ITEMS.map(i => ({ ...i }));
    saveItems();
  }

  const savedState = localStorage.getItem('nursery_state');
  if (savedState) {
    const state = JSON.parse(savedState);
    if (state.date === getToday()) {
      checkedIds = new Set(state.checked || []);
    } else {
      checkedIds = new Set();
      saveState();
    }
  } else {
    checkedIds = new Set();
    saveState();
  }
}

function saveItems() {
  localStorage.setItem('nursery_items', JSON.stringify(items));
}

function saveState() {
  localStorage.setItem('nursery_state', JSON.stringify({
    date: getToday(),
    checked: [...checkedIds],
  }));
}

/* ── Render ── */

function renderDateBar() {
  const d = new Date();
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
  const label = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${weekdays[d.getDay()]}）`;
  document.getElementById('date-label').textContent = label;
}

function renderList() {
  const ul = document.getElementById('checklist');
  ul.innerHTML = '';

  if (items.length === 0) {
    const li = document.createElement('li');
    li.className = 'empty-state';
    li.innerHTML = '<div class="empty-icon">📋</div><p>項目がありません。下のフォームから追加してください。</p>';
    ul.appendChild(li);
  } else {
    items.forEach(item => {
      const isChecked = checkedIds.has(item.id);
      const li = document.createElement('li');
      li.className = 'check-item' + (isChecked ? ' checked' : '');
      li.dataset.id = item.id;
      li.innerHTML = `
        <button class="check-btn" aria-pressed="${isChecked}" aria-label="${item.name}をチェック">
          <span class="check-icon"><i class="bi bi-check-lg"></i></span>
          <span class="check-name">${escHtml(item.name)}</span>
        </button>
        <button class="del-btn" aria-label="${item.name}を削除"><i class="bi bi-trash3"></i></button>
      `;
      li.querySelector('.check-btn').addEventListener('click', () => toggleCheck(item.id));
      li.querySelector('.del-btn').addEventListener('click', () => deleteItem(item.id));
      ul.appendChild(li);
    });
  }

  updateProgress();
}

function updateProgress() {
  const total = items.length;
  const done  = items.filter(i => checkedIds.has(i.id)).length;
  const pct   = total === 0 ? 0 : Math.round(done / total * 100);

  document.getElementById('progress-text').textContent = `${done} / ${total} 個 チェック済み`;
  document.getElementById('progress-pct').textContent  = `${pct}%`;
  document.getElementById('progress-bar').style.width  = `${pct}%`;

  const banner = document.getElementById('complete-banner');
  if (total > 0 && done === total) {
    banner.hidden = false;
  } else {
    banner.hidden = true;
  }
}

/* ── Actions ── */

function toggleCheck(id) {
  if (checkedIds.has(id)) {
    checkedIds.delete(id);
  } else {
    checkedIds.add(id);
  }
  saveState();
  renderList();
}

function addItem(name) {
  const trimmed = name.trim();
  if (!trimmed) return false;
  const id = 'u' + Date.now();
  items.push({ id, name: trimmed });
  saveItems();
  renderList();
  return true;
}

function deleteItem(id) {
  items = items.filter(i => i.id !== id);
  checkedIds.delete(id);
  saveItems();
  saveState();
  renderList();
}

/* ── Midnight reset ── */

function scheduleMidnightReset() {
  setTimeout(() => {
    checkedIds = new Set();
    saveState();
    renderList();
    renderDateBar();
    scheduleMidnightReset();
  }, getMsUntilMidnight());
}

/* ── Helpers ── */

function escHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ── Init ── */

document.addEventListener('DOMContentLoaded', () => {
  loadData();
  renderDateBar();
  renderList();
  scheduleMidnightReset();

  const addInput = document.getElementById('add-input');
  const btnAdd   = document.getElementById('btn-add');
  const errEl    = document.getElementById('add-error');

  function handleAdd() {
    const val = addInput.value;
    if (!val.trim()) {
      errEl.hidden = false;
      addInput.focus();
      return;
    }
    errEl.hidden = true;
    addItem(val);
    addInput.value = '';
    addInput.focus();
  }

  btnAdd.addEventListener('click', handleAdd);
  addInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') handleAdd();
  });
});
