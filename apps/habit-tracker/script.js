'use strict';

/* ===========================================================
   習慣トラッカー — script.js
   データ構造:
     habits: [{ id, name, icon, color, freq, freqCount, createdAt }]
     logs:   { "YYYY-MM-DD": { habitId: true|false, ... } }
   =========================================================== */

const STORAGE_KEY_HABITS = 'habit_tracker_habits';
const STORAGE_KEY_LOGS   = 'habit_tracker_logs';

// ---- State ----
let habits = [];
let logs   = {};
let selectedEmoji = '⭐';
let selectedColor = '#4CAF50';
let editingHabitId = null;
let heatmapHabitId = null;

// ---- Helpers ----

/**
 * YYYY-MM-DD 形式で日付文字列を返す（ローカル時間基準）
 */
function dateKey(date) {
  const d = date || new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

/**
 * 今日の dateKey
 */
function todayKey() {
  return dateKey(new Date());
}

/**
 * 曜日ラベル（日本語短縮）
 */
const DAY_LABELS_JA = ['日','月','火','水','木','金','土'];

/**
 * 日付を N 日前に戻す
 */
function subtractDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() - n);
  return d;
}

/**
 * 習慣が指定日に「達成」かどうか
 */
function isAchieved(habitId, dateStr) {
  return !!(logs[dateStr] && logs[dateStr][habitId]);
}

/**
 * 現在のストリーク（連続達成日数）を計算
 * 毎日習慣: 昨日・今日を含む連続日数
 * 週N回習慣: 簡易実装（毎日と同様に連続日でカウント）
 */
function calcStreak(habitId) {
  const today = new Date();
  let streak = 0;
  let i = 0;

  // 今日が達成済みなら今日からカウント、未達成なら昨日から
  const startFrom = isAchieved(habitId, dateKey(today)) ? 0 : 1;

  for (let offset = startFrom; offset < 365; offset++) {
    const d = subtractDays(today, offset);
    if (isAchieved(habitId, dateKey(d))) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

/**
 * 最長ストリーク（過去1年分）
 */
function calcBestStreak(habitId) {
  const today = new Date();
  let best = 0;
  let current = 0;
  for (let i = 365; i >= 0; i--) {
    const d = subtractDays(today, i);
    if (isAchieved(habitId, dateKey(d))) {
      current++;
      if (current > best) best = current;
    } else {
      current = 0;
    }
  }
  return best;
}

/**
 * 今月の達成率（%）
 */
function calcMonthlyRate(habitId) {
  const today = new Date();
  const year  = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysPassed  = today.getDate();

  let achieved = 0;
  for (let d = 1; d <= daysPassed; d++) {
    const key = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    if (isAchieved(habitId, key)) achieved++;
  }
  return daysPassed === 0 ? 0 : Math.round((achieved / daysPassed) * 100);
}

/**
 * 通算達成日数
 */
function calcTotalDays(habitId) {
  let count = 0;
  Object.keys(logs).forEach(dateStr => {
    if (logs[dateStr][habitId]) count++;
  });
  return count;
}

// ---- Storage ----

function loadData() {
  try {
    const h = localStorage.getItem(STORAGE_KEY_HABITS);
    const l = localStorage.getItem(STORAGE_KEY_LOGS);
    habits = h ? JSON.parse(h) : [];
    logs   = l ? JSON.parse(l) : {};
  } catch(e) {
    habits = [];
    logs   = {};
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY_HABITS, JSON.stringify(habits));
  localStorage.setItem(STORAGE_KEY_LOGS,   JSON.stringify(logs));
}

// ---- Render ----

function renderAll() {
  renderTodaySummary();
  renderHabitList();
  renderHeatmapSelect();
  renderHeatmap();
  renderStats();
}

function renderTodaySummary() {
  const today = new Date();
  const dayLabel = DAY_LABELS_JA[today.getDay()];
  const dateStr = `${today.getFullYear()}/${String(today.getMonth()+1).padStart(2,'0')}/${String(today.getDate()).padStart(2,'0')}`;
  document.getElementById('today-date').textContent = `今日: ${dateStr}（${dayLabel}）`;

  const total = habits.length;
  const done  = habits.filter(h => isAchieved(h.id, todayKey())).length;
  document.getElementById('today-count').textContent = `${done}/${total}`;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  document.getElementById('progress-bar').style.width = pct + '%';
}

function renderHabitList() {
  const list       = document.getElementById('habit-list');
  const emptyState = document.getElementById('empty-state');

  list.innerHTML = '';

  if (habits.length === 0) {
    emptyState.style.display = '';
    return;
  }
  emptyState.style.display = 'none';

  habits.forEach((habit, index) => {
    const li = createHabitItem(habit, index);
    list.appendChild(li);
  });
}

function createHabitItem(habit, index) {
  const today = new Date();
  const achieved = isAchieved(habit.id, todayKey());
  const streak   = calcStreak(habit.id);
  const best     = calcBestStreak(habit.id);

  const li = document.createElement('li');
  li.className = 'habit-item';
  li.dataset.id = habit.id;
  li.style.setProperty('--habit-color', habit.color);

  // チェックボタン
  const checkBtn = document.createElement('button');
  checkBtn.className = 'habit-check-btn' + (achieved ? ' done' : '');
  checkBtn.setAttribute('aria-label', achieved ? `${habit.name} 達成済み` : `${habit.name} を達成する`);
  checkBtn.setAttribute('aria-pressed', achieved ? 'true' : 'false');
  checkBtn.style.setProperty('--habit-color', habit.color);
  checkBtn.textContent = achieved ? '✓' : habit.icon;
  checkBtn.addEventListener('click', () => toggleAchievement(habit.id));
  li.appendChild(checkBtn);

  // 中央情報エリア
  const info = document.createElement('div');
  info.className = 'habit-info';

  // 名前行
  const nameRow = document.createElement('div');
  nameRow.className = 'habit-name-row';

  if (!achieved) {
    const iconSpan = document.createElement('span');
    iconSpan.className = 'habit-icon';
    iconSpan.textContent = habit.icon;
    nameRow.appendChild(iconSpan);
  }

  const nameSpan = document.createElement('span');
  nameSpan.className = 'habit-name';
  nameSpan.textContent = habit.name;
  nameRow.appendChild(nameSpan);
  info.appendChild(nameRow);

  // メタ行（ストリーク・頻度）
  const meta = document.createElement('div');
  meta.className = 'habit-meta';

  if (streak > 0) {
    const streakBadge = document.createElement('span');
    streakBadge.className = 'streak-badge';
    streakBadge.innerHTML = `<span class="flame">🔥</span>${streak}日`;
    meta.appendChild(streakBadge);
  }

  if (best > streak) {
    const bestSpan = document.createElement('span');
    bestSpan.className = 'streak-best';
    bestSpan.textContent = `最長:${best}日`;
    meta.appendChild(bestSpan);
  }

  const freqSpan = document.createElement('span');
  freqSpan.className = 'freq-label';
  freqSpan.textContent = habit.freq === 'daily' ? '毎日' : `週${habit.freqCount}回`;
  meta.appendChild(freqSpan);

  info.appendChild(meta);

  // 週間カレンダー
  const weekCal = document.createElement('div');
  weekCal.className = 'week-calendar';
  weekCal.setAttribute('aria-label', '過去7日の達成状況');

  for (let i = 6; i >= 0; i--) {
    const d    = subtractDays(today, i);
    const key  = dateKey(d);
    const done = isAchieved(habit.id, key);
    const isToday = (i === 0);

    const dayWrap = document.createElement('div');
    dayWrap.className = 'week-day';

    const label = document.createElement('div');
    label.className = 'week-day-label';
    label.textContent = DAY_LABELS_JA[d.getDay()];
    dayWrap.appendChild(label);

    const cell = document.createElement('div');
    cell.className = 'week-day-cell' + (done ? ' achieved' : ' missed') + (isToday ? ' today' : '');
    cell.style.setProperty('--habit-color', habit.color);
    cell.textContent = done ? '○' : '×';
    cell.setAttribute('title', `${key}: ${done ? '達成' : '未達成'}`);
    dayWrap.appendChild(cell);

    weekCal.appendChild(dayWrap);
  }
  info.appendChild(weekCal);
  li.appendChild(info);

  // アクションボタン（並び替え・編集）
  const actions = document.createElement('div');
  actions.className = 'habit-actions';

  if (index > 0) {
    const upBtn = document.createElement('button');
    upBtn.className = 'habit-action-btn';
    upBtn.innerHTML = '&#9650;';
    upBtn.setAttribute('aria-label', `${habit.name} を上に移動`);
    upBtn.addEventListener('click', () => moveHabit(habit.id, -1));
    actions.appendChild(upBtn);
  }

  const editBtn = document.createElement('button');
  editBtn.className = 'habit-action-btn edit-btn';
  editBtn.textContent = '✎';
  editBtn.setAttribute('aria-label', `${habit.name} を編集`);
  editBtn.addEventListener('click', () => openEditModal(habit.id));
  actions.appendChild(editBtn);

  if (index < habits.length - 1) {
    const downBtn = document.createElement('button');
    downBtn.className = 'habit-action-btn';
    downBtn.innerHTML = '&#9660;';
    downBtn.setAttribute('aria-label', `${habit.name} を下に移動`);
    downBtn.addEventListener('click', () => moveHabit(habit.id, 1));
    actions.appendChild(downBtn);
  }

  li.appendChild(actions);
  return li;
}

function renderHeatmapSelect() {
  const select = document.getElementById('heatmap-habit-select');
  select.innerHTML = '';
  habits.forEach(h => {
    const opt = document.createElement('option');
    opt.value = h.id;
    opt.textContent = `${h.icon} ${h.name}`;
    if (h.id === heatmapHabitId) opt.selected = true;
    select.appendChild(opt);
  });
  if (habits.length > 0 && !heatmapHabitId) {
    heatmapHabitId = habits[0].id;
  }
}

function renderHeatmap() {
  const section = document.getElementById('heatmap-section');
  const container = document.getElementById('heatmap-container');
  if (habits.length === 0) {
    section.style.display = 'none';
    return;
  }
  section.style.display = '';

  const habitId = heatmapHabitId || (habits[0] && habits[0].id);
  if (!habitId) return;

  const habit = habits.find(h => h.id === habitId);
  const color = habit ? habit.color : '#4CAF50';

  // 当月1日 ～ 末日
  const today = new Date();
  const year  = today.getFullYear();
  const month = today.getMonth();
  const firstDay  = new Date(year, month, 1);
  const lastDay   = new Date(year, month + 1, 0);
  const totalDays = lastDay.getDate();

  // GitHub風: 日曜始まり
  const startDow = firstDay.getDay(); // 0=日

  container.innerHTML = '';

  // 曜日ラベルカラム
  const wrap = document.createElement('div');
  wrap.className = 'heatmap-wrap';

  const dayLabels = document.createElement('div');
  dayLabels.className = 'heatmap-day-labels';
  ['日','月','火','水','木','金','土'].forEach(l => {
    const span = document.createElement('div');
    span.className = 'heatmap-day-label';
    span.textContent = l;
    dayLabels.appendChild(span);
  });
  wrap.appendChild(dayLabels);

  const grid = document.createElement('div');
  grid.className = 'heatmap-grid';

  // 先頭の空セル
  for (let i = 0; i < startDow; i++) {
    const cell = document.createElement('div');
    cell.className = 'heatmap-cell';
    cell.style.background = 'transparent';
    grid.appendChild(cell);
  }

  for (let d = 1; d <= totalDays; d++) {
    const key      = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const done     = isAchieved(habitId, key);
    const isFuture = new Date(year, month, d) > today;
    const cell = document.createElement('div');

    if (isFuture) {
      cell.className = 'heatmap-cell level-0';
      cell.setAttribute('title', `${month+1}/${d}: 未来`);
    } else if (done) {
      // 達成済み: ストリーク継続中は level-4、そうでなければ level-3 で達成感を出す
      const streak = calcStreak(habitId);
      cell.className = 'heatmap-cell level-4';
      cell.style.background = color;
      cell.setAttribute('title', `${month+1}/${d}: 達成`);
    } else {
      cell.className = 'heatmap-cell level-0';
      cell.setAttribute('title', `${month+1}/${d}: 未達成`);
    }

    grid.appendChild(cell);
  }

  wrap.appendChild(grid);
  container.appendChild(wrap);

  // 凡例の達成色を選択中習慣のカラーに同期
  const legendAchieved = document.getElementById('legend-achieved');
  if (legendAchieved) {
    legendAchieved.style.background = color;
  }
}

function renderStats() {
  const section = document.getElementById('stats-section');
  const grid    = document.getElementById('stats-grid');
  if (habits.length === 0) {
    section.style.display = 'none';
    return;
  }
  section.style.display = '';

  // 全習慣の合算統計
  const today = new Date();
  const year  = today.getFullYear();
  const month = today.getMonth();
  const daysPassed = today.getDate();

  let totalAchievedDays = 0;
  let totalPossible     = 0;
  let maxStreak = 0;

  habits.forEach(h => {
    for (let d = 1; d <= daysPassed; d++) {
      const key = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      if (isAchieved(h.id, key)) totalAchievedDays++;
      totalPossible++;
    }
    const s = calcStreak(h.id);
    if (s > maxStreak) maxStreak = s;
  });

  const monthlyRate = totalPossible === 0 ? 0 : Math.round((totalAchievedDays / totalPossible) * 100);
  const totalDaysAll = Object.keys(logs).reduce((acc, dateStr) => {
    const dayDone = Object.values(logs[dateStr]).some(v => v);
    return acc + (dayDone ? 1 : 0);
  }, 0);

  grid.innerHTML = '';

  const stats = [
    { emoji: '📅', value: `${monthlyRate}%`, label: '今月達成率' },
    { emoji: '🔥', value: maxStreak,           label: '最長ストリーク' },
    { emoji: '✅', value: totalAchievedDays,   label: '今月達成数' },
    { emoji: '📊', value: habits.length,       label: '登録習慣数' },
  ];

  stats.forEach(s => {
    const card = document.createElement('div');
    card.className = 'stat-card';
    card.innerHTML = `
      <div class="stat-emoji">${s.emoji}</div>
      <div class="stat-value">${s.value}</div>
      <div class="stat-label">${s.label}</div>
    `;
    grid.appendChild(card);
  });
}

// ---- Actions ----

function toggleAchievement(habitId) {
  const key = todayKey();
  if (!logs[key]) logs[key] = {};
  logs[key][habitId] = !logs[key][habitId];
  saveData();
  renderAll();
}

function moveHabit(habitId, direction) {
  const idx = habits.findIndex(h => h.id === habitId);
  if (idx < 0) return;
  const newIdx = idx + direction;
  if (newIdx < 0 || newIdx >= habits.length) return;
  const temp = habits[idx];
  habits[idx] = habits[newIdx];
  habits[newIdx] = temp;
  saveData();
  renderAll();
}

function deleteHabit(habitId) {
  if (!confirm('この習慣を削除しますか？記録もすべて削除されます。')) return;
  habits = habits.filter(h => h.id !== habitId);
  // ログからも削除
  Object.keys(logs).forEach(dateStr => {
    delete logs[dateStr][habitId];
  });
  if (heatmapHabitId === habitId) {
    heatmapHabitId = habits.length > 0 ? habits[0].id : null;
  }
  saveData();
  closeModal();
  renderAll();
}

// ---- Modal ----

function openAddModal() {
  editingHabitId = null;
  document.getElementById('modal-title').textContent = '習慣を追加';
  document.getElementById('btn-save-habit').textContent = '追加する';
  document.getElementById('btn-delete-habit').style.display = 'none';
  document.getElementById('edit-habit-id').value = '';
  document.getElementById('habit-name').value = '';
  setSelectedEmoji('⭐');
  setSelectedColor('#4CAF50');
  document.getElementById('habit-freq').value = 'daily';
  document.getElementById('freq-count-wrap').style.display = 'none';
  document.getElementById('habit-freq-count').value = 3;
  openModal();
}

function openEditModal(habitId) {
  const habit = habits.find(h => h.id === habitId);
  if (!habit) return;
  editingHabitId = habitId;
  document.getElementById('modal-title').textContent = '習慣を編集';
  document.getElementById('btn-save-habit').textContent = '保存する';
  document.getElementById('btn-delete-habit').style.display = '';
  document.getElementById('edit-habit-id').value = habitId;
  document.getElementById('habit-name').value = habit.name;
  setSelectedEmoji(habit.icon);
  setSelectedColor(habit.color);
  document.getElementById('habit-freq').value = habit.freq;
  if (habit.freq === 'weekly') {
    document.getElementById('freq-count-wrap').style.display = '';
    document.getElementById('habit-freq-count').value = habit.freqCount || 3;
  } else {
    document.getElementById('freq-count-wrap').style.display = 'none';
  }
  openModal();
}

function openModal() {
  const overlay = document.getElementById('modal-overlay');
  overlay.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  setTimeout(() => document.getElementById('habit-name').focus(), 100);
}

function closeModal() {
  document.getElementById('modal-overlay').style.display = 'none';
  document.body.style.overflow = '';
}

function setSelectedEmoji(emoji) {
  selectedEmoji = emoji;
  document.querySelectorAll('.emoji-btn').forEach(btn => {
    btn.classList.toggle('selected', btn.dataset.emoji === emoji);
  });
}

function setSelectedColor(color) {
  selectedColor = color;
  document.querySelectorAll('.color-btn').forEach(btn => {
    btn.classList.toggle('selected', btn.dataset.color === color);
  });
}

function saveHabit(e) {
  e.preventDefault();
  const name = document.getElementById('habit-name').value.trim();
  if (!name) return;

  const freq = document.getElementById('habit-freq').value;
  const freqCount = freq === 'weekly'
    ? parseInt(document.getElementById('habit-freq-count').value, 10) || 3
    : 1;

  if (editingHabitId) {
    // 編集
    const habit = habits.find(h => h.id === editingHabitId);
    if (habit) {
      habit.name      = name;
      habit.icon      = selectedEmoji;
      habit.color     = selectedColor;
      habit.freq      = freq;
      habit.freqCount = freqCount;
    }
  } else {
    // 新規
    const newHabit = {
      id: 'h_' + Date.now() + '_' + Math.random().toString(36).slice(2),
      name,
      icon: selectedEmoji,
      color: selectedColor,
      freq,
      freqCount,
      createdAt: new Date().toISOString(),
    };
    habits.push(newHabit);
    if (!heatmapHabitId) heatmapHabitId = newHabit.id;
  }

  saveData();
  closeModal();
  renderAll();
}

// ---- Event Bindings ----

document.addEventListener('DOMContentLoaded', () => {
  loadData();
  renderAll();

  // 追加ボタン
  document.getElementById('btn-open-modal').addEventListener('click', openAddModal);

  // モーダル閉じる
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('modal-overlay')) closeModal();
  });

  // フォーム送信
  document.getElementById('habit-form').addEventListener('submit', saveHabit);

  // 削除ボタン
  document.getElementById('btn-delete-habit').addEventListener('click', () => {
    if (editingHabitId) deleteHabit(editingHabitId);
  });

  // 絵文字ピッカー
  document.getElementById('emoji-picker').addEventListener('click', e => {
    const btn = e.target.closest('.emoji-btn');
    if (!btn) return;
    setSelectedEmoji(btn.dataset.emoji);
  });

  // カラーピッカー
  document.getElementById('color-picker').addEventListener('click', e => {
    const btn = e.target.closest('.color-btn');
    if (!btn) return;
    setSelectedColor(btn.dataset.color);
  });

  // 頻度セレクト
  document.getElementById('habit-freq').addEventListener('change', e => {
    document.getElementById('freq-count-wrap').style.display =
      e.target.value === 'weekly' ? '' : 'none';
  });

  // ヒートマップ習慣選択
  document.getElementById('heatmap-habit-select').addEventListener('change', e => {
    heatmapHabitId = e.target.value;
    renderHeatmap();
  });

  // キーボード: Escape でモーダル閉じる
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
  });
});
