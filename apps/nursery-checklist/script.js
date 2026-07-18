'use strict';

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

const DEFAULT_ITEMS = [
  { id: 'd1',  name: '連絡帳',       days: [] },
  { id: 'd2',  name: 'お着替え（上下）', days: [] },
  { id: 'd3',  name: 'おむつ',        days: [] },
  { id: 'd4',  name: 'おしりふき',    days: [] },
  { id: 'd5',  name: 'タオル',        days: [] },
  { id: 'd6',  name: 'エプロン',      days: [] },
  { id: 'd7',  name: '帽子',          days: [] },
  { id: 'd8',  name: '水筒',          days: [] },
  { id: 'd9',  name: '給食袋',        days: [] },
  { id: 'd10', name: 'ナフキン',      days: [] },
];

let items = [];
let checkedIds = new Set();
let editingId = null;

/* ── Utilities ── */

function getToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getTodayDayIndex() {
  return new Date().getDay(); // 0=日, 1=月, ..., 6=土
}

function getMsUntilMidnight() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return midnight - now;
}

// 今日表示すべき項目（days が空 = 毎日、それ以外は曜日一致のみ）
function getActiveItems() {
  const today = getTodayDayIndex();
  return items.filter(i => !i.days || i.days.length === 0 || i.days.includes(today));
}

/* ── Storage ── */

function loadData() {
  const savedItems = localStorage.getItem('nursery_items');
  if (savedItems) {
    items = JSON.parse(savedItems).map(i => ({
      days: [], // 旧データ移行: days がなければ毎日表示
      ...i,
    }));
  } else {
    items = DEFAULT_ITEMS.map(i => ({ ...i }));
    saveItems();
  }

  const savedState = localStorage.getItem('nursery_state');
  if (savedState) {
    const state = JSON.parse(savedState);
    checkedIds = state.date === getToday() ? new Set(state.checked || []) : new Set();
  } else {
    checkedIds = new Set();
  }
  saveState();
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
  const label = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${WEEKDAYS[d.getDay()]}）`;
  document.getElementById('date-label').textContent = label;
}

function dayBadgesHtml(days) {
  if (!days || days.length === 0) return '';
  const tags = days.map(d => `<span class="day-badge">${WEEKDAYS[d]}</span>`).join('');
  return `<span class="day-badges">${tags}</span>`;
}

function renderList() {
  const ul = document.getElementById('checklist');
  ul.innerHTML = '';

  const active = getActiveItems();

  if (active.length === 0) {
    const li = document.createElement('li');
    li.className = 'empty-state';
    li.innerHTML = '<div class="empty-icon">📋</div><p>今日の項目がありません。下のフォームから追加してください。</p>';
    ul.appendChild(li);
  } else {
    active.forEach(item => {
      const isChecked = checkedIds.has(item.id);
      const li = document.createElement('li');
      li.className = 'check-item' + (isChecked ? ' checked' : '');
      li.dataset.id = item.id;
      li.innerHTML = `
        <button class="check-btn" aria-pressed="${isChecked}" aria-label="${escHtml(item.name)}をチェック">
          <span class="check-icon"><i class="bi bi-check-lg"></i></span>
          <span class="check-name">${escHtml(item.name)}${dayBadgesHtml(item.days)}</span>
        </button>
        <button class="edit-btn" aria-label="${escHtml(item.name)}を編集"><i class="bi bi-pencil"></i></button>
        <button class="del-btn"  aria-label="${escHtml(item.name)}を削除"><i class="bi bi-trash3"></i></button>
      `;
      li.querySelector('.check-btn').addEventListener('click', () => toggleCheck(item.id));
      li.querySelector('.edit-btn').addEventListener('click', () => openEditModal(item.id));
      li.querySelector('.del-btn').addEventListener('click',  () => deleteItem(item.id));
      ul.appendChild(li);
    });
  }

  // 今日は非表示だが存在する項目を案内
  const hiddenCount = items.length - active.length;
  const hiddenNote = document.getElementById('hidden-note');
  if (hiddenCount > 0) {
    hiddenNote.hidden = false;
    hiddenNote.textContent = `※ 今日の曜日設定外の項目が ${hiddenCount} 件あります（他の曜日に表示されます）`;
  } else {
    hiddenNote.hidden = true;
  }

  updateProgress(active);
}

function updateProgress(active) {
  if (!active) active = getActiveItems();
  const total = active.length;
  const done  = active.filter(i => checkedIds.has(i.id)).length;
  const pct   = total === 0 ? 0 : Math.round(done / total * 100);

  document.getElementById('progress-text').textContent = `${done} / ${total} 個 チェック済み`;
  document.getElementById('progress-pct').textContent  = `${pct}%`;
  document.getElementById('progress-bar').style.width  = `${pct}%`;

  const banner = document.getElementById('complete-banner');
  banner.hidden = !(total > 0 && done === total);
}

/* ── Actions ── */

function toggleCheck(id) {
  checkedIds.has(id) ? checkedIds.delete(id) : checkedIds.add(id);
  saveState();
  renderList();
}

function addItem(name) {
  const trimmed = name.trim();
  if (!trimmed) return false;
  items.push({ id: 'u' + Date.now(), name: trimmed, days: [] });
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

/* ── Edit modal ── */

function openEditModal(id) {
  const item = items.find(i => i.id === id);
  if (!item) return;
  editingId = id;

  document.getElementById('edit-name').value = item.name;

  // 曜日ボタンの選択状態を復元
  document.querySelectorAll('.day-btn').forEach(btn => {
    const day = parseInt(btn.dataset.day);
    btn.classList.toggle('selected', (item.days || []).includes(day));
    btn.setAttribute('aria-pressed', String((item.days || []).includes(day)));
  });

  document.getElementById('edit-modal').hidden = false;
  document.getElementById('edit-name').focus();
}

function closeEditModal() {
  document.getElementById('edit-modal').hidden = true;
  editingId = null;
}

function saveEdit() {
  if (!editingId) return;
  const name = document.getElementById('edit-name').value.trim();
  if (!name) {
    document.getElementById('edit-name').focus();
    return;
  }

  const selectedDays = [...document.querySelectorAll('.day-btn.selected')]
    .map(btn => parseInt(btn.dataset.day))
    .sort((a, b) => a - b);

  const idx = items.findIndex(i => i.id === editingId);
  if (idx !== -1) {
    items[idx] = { ...items[idx], name, days: selectedDays };
    saveItems();
  }
  closeEditModal();
  renderList();
}

/* ── Midnight reset ── */

function scheduleMidnightReset() {
  setTimeout(() => {
    checkedIds = new Set();
    saveState();
    renderDateBar();
    renderList();
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

  // 追加フォーム
  const addInput = document.getElementById('add-input');
  const btnAdd   = document.getElementById('btn-add');
  const errEl    = document.getElementById('add-error');

  function handleAdd() {
    if (!addInput.value.trim()) { errEl.hidden = false; addInput.focus(); return; }
    errEl.hidden = true;
    addItem(addInput.value);
    addInput.value = '';
    addInput.focus();
  }
  btnAdd.addEventListener('click', handleAdd);
  addInput.addEventListener('keydown', e => { if (e.key === 'Enter') handleAdd(); });

  // 編集モーダル
  document.getElementById('edit-save').addEventListener('click', saveEdit);
  document.getElementById('edit-cancel').addEventListener('click', closeEditModal);
  document.getElementById('edit-modal').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeEditModal();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeEditModal();
  });

  // 曜日ボタントグル
  document.querySelectorAll('.day-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const isSelected = btn.classList.toggle('selected');
      btn.setAttribute('aria-pressed', String(isSelected));
    });
  });

  // 編集モーダル内 Enter で保存
  document.getElementById('edit-name').addEventListener('keydown', e => {
    if (e.key === 'Enter') saveEdit();
  });
});
