'use strict';

// ===== 定数 =====
const CIRCUMFERENCE = 2 * Math.PI * 88; // r=88 の円周長 ≒ 553

const MODES = {
  FOCUS:       { key: 'focus',       label: '集中タイム',   cssClass: 'focus-mode',       badgeText: '集中タイム',   defaultMinutes: 25 },
  SHORT_BREAK: { key: 'short_break', label: '短い休憩',     cssClass: 'short-break-mode', badgeText: '短い休憩 (5分)',  defaultMinutes: 5  },
  LONG_BREAK:  { key: 'long_break',  label: '長い休憩',     cssClass: 'long-break-mode',  badgeText: '長い休憩 (15分)', defaultMinutes: 15 },
};

const SHORT_BREAK_MINUTES = 5;
const LONG_BREAK_MINUTES  = 15;
const POMODOROS_BEFORE_LONG_BREAK = 4;

const STORAGE_KEY_TASKS    = 'pomodoro_tasks_v2';
const STORAGE_KEY_STATS    = 'pomodoro_stats_v1';

// ===== 状態 =====
let state = {
  mode: MODES.FOCUS,
  focusDurationMinutes: 25,
  totalSeconds: 25 * 60,
  remainingSeconds: 25 * 60,
  running: false,
  intervalId: null,
  sessionPomodoros: 0,         // 今セッション（リセット前）のポモドーロ数
  todayPomodoros: 0,
  todayCompletedTasks: 0,
  activeTaskId: null,
};

let tasks = [];

// ===== DOM参照 =====
const timerSection    = document.getElementById('timer-section');
const modeBadge       = document.getElementById('mode-badge');
const ringProgress    = document.getElementById('ring-progress');
const timerDisplay    = document.getElementById('timer-display');
const btnStart        = document.getElementById('btn-start');
const btnPause        = document.getElementById('btn-pause');
const btnReset        = document.getElementById('btn-reset');
const activeTaskBar   = document.getElementById('active-task-bar');
const activeTaskName  = document.getElementById('active-task-name');
const todayPomodorosEl= document.getElementById('today-pomodoros');
const todayTasksEl    = document.getElementById('today-tasks');
const taskForm        = document.getElementById('task-form');
const taskInput       = document.getElementById('task-input');
const taskPomodoros   = document.getElementById('task-pomodoros');
const taskList        = document.getElementById('task-list');
const taskEmptyMsg    = document.getElementById('task-empty-msg');
const durationBtns    = document.querySelectorAll('.duration-btn');

// ===== 初期化 =====
function init() {
  loadTasks();
  loadStats();
  ringProgress.style.strokeDasharray = CIRCUMFERENCE;
  updateRing(1.0);
  renderTasks();
  updateStatsUI();
  updateDocumentTitle();

  // イベントリスナー
  btnStart.addEventListener('click', startTimer);
  btnPause.addEventListener('click', pauseTimer);
  btnReset.addEventListener('click', resetTimer);
  taskForm.addEventListener('submit', handleAddTask);

  durationBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (state.running) return; // 動作中は変更不可
      const minutes = parseInt(btn.dataset.minutes, 10);
      setFocusDuration(minutes);
      durationBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
}

// ===== タイマー制御 =====
function startTimer() {
  if (state.running) return;
  state.running = true;
  timerSection.classList.add('running');
  btnStart.disabled = true;
  btnPause.disabled = false;

  state.intervalId = setInterval(() => {
    state.remainingSeconds--;

    if (state.remainingSeconds <= 0) {
      state.remainingSeconds = 0;
      updateTimerUI();
      timerComplete();
    } else {
      updateTimerUI();
    }
  }, 1000);
}

function pauseTimer() {
  if (!state.running) return;
  clearInterval(state.intervalId);
  state.running = false;
  timerSection.classList.remove('running');
  btnStart.disabled = false;
  btnPause.disabled = true;
}

function resetTimer() {
  clearInterval(state.intervalId);
  state.running = false;
  timerSection.classList.remove('running');
  state.remainingSeconds = state.totalSeconds;
  btnStart.disabled = false;
  btnPause.disabled = true;
  updateTimerUI();
  updateDocumentTitle();
}

function timerComplete() {
  clearInterval(state.intervalId);
  state.running = false;
  timerSection.classList.remove('running');
  btnStart.disabled = false;
  btnPause.disabled = true;

  playBeep();

  if (state.mode === MODES.FOCUS) {
    // 集中タイム完了
    state.sessionPomodoros++;
    state.todayPomodoros++;

    // アクティブタスクのポモドーロ消費数を更新
    if (state.activeTaskId) {
      const task = tasks.find(t => t.id === state.activeTaskId);
      if (task) {
        task.usedPomodoros = (task.usedPomodoros || 0) + 1;
        saveTasks();
        renderTasks();
      }
    }

    saveTodayStats();
    updateStatsUI();

    // 次のモードを決定
    if (state.sessionPomodoros % POMODOROS_BEFORE_LONG_BREAK === 0) {
      switchMode(MODES.LONG_BREAK);
    } else {
      switchMode(MODES.SHORT_BREAK);
    }
  } else {
    // 休憩タイム完了 → 集中タイムへ
    switchMode(MODES.FOCUS);
  }

  document.title = '⏰ タイマー終了! | ポモドーロタイマー';
  // 3秒後にタイトルを通常状態に戻す
  setTimeout(() => updateDocumentTitle(), 3000);
}

function switchMode(newMode) {
  state.mode = newMode;

  // CSSクラス更新
  timerSection.classList.remove('focus-mode', 'short-break-mode', 'long-break-mode', 'running');
  timerSection.classList.add(newMode.cssClass);

  // 時間設定
  let minutes;
  if (newMode === MODES.FOCUS) {
    minutes = state.focusDurationMinutes;
  } else if (newMode === MODES.SHORT_BREAK) {
    minutes = SHORT_BREAK_MINUTES;
  } else {
    minutes = LONG_BREAK_MINUTES;
  }

  state.totalSeconds = minutes * 60;
  state.remainingSeconds = state.totalSeconds;
  state.running = false;
  btnStart.disabled = false;
  btnPause.disabled = true;

  modeBadge.textContent = newMode.badgeText;
  updateTimerUI();
  updateDocumentTitle();

  // 集中モードに戻ったとき duration-btn の active 状態を保持
  if (newMode === MODES.FOCUS) {
    durationBtns.forEach(b => {
      b.classList.toggle('active', parseInt(b.dataset.minutes, 10) === state.focusDurationMinutes);
    });
  }
}

function setFocusDuration(minutes) {
  state.focusDurationMinutes = minutes;
  if (state.mode === MODES.FOCUS) {
    state.totalSeconds = minutes * 60;
    state.remainingSeconds = state.totalSeconds;
    updateTimerUI();
  }
}

// ===== UI更新 =====
function updateTimerUI() {
  const m = Math.floor(state.remainingSeconds / 60);
  const s = state.remainingSeconds % 60;
  timerDisplay.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

  const ratio = state.totalSeconds > 0 ? state.remainingSeconds / state.totalSeconds : 0;
  updateRing(ratio);
  updateDocumentTitle();
}

function updateRing(ratio) {
  // ratio = 1.0 で満タン、0 で空
  const offset = CIRCUMFERENCE * (1 - ratio);
  ringProgress.style.strokeDashoffset = offset;
}

function updateDocumentTitle() {
  const m = Math.floor(state.remainingSeconds / 60);
  const s = state.remainingSeconds % 60;
  const timeStr = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  const modeLabel = state.mode === MODES.FOCUS ? '集中' : '休憩';
  document.title = `${timeStr} [${modeLabel}] | ポモドーロタイマー`;
}

function updateStatsUI() {
  todayPomodorosEl.textContent = state.todayPomodoros;
  todayTasksEl.textContent = state.todayCompletedTasks;
}

function updateActiveTaskBar() {
  if (state.activeTaskId) {
    const task = tasks.find(t => t.id === state.activeTaskId);
    if (task && !task.completed) {
      activeTaskName.textContent = task.name;
      return;
    }
    state.activeTaskId = null;
  }
  activeTaskName.textContent = 'タスクを選択してください';
}

// ===== 音声 =====
function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3);

    gainNode.gain.setValueAtTime(0.5, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.8);

    // 2回目のビープ
    setTimeout(() => {
      try {
        const ctx2 = new (window.AudioContext || window.webkitAudioContext)();
        const osc2 = ctx2.createOscillator();
        const gain2 = ctx2.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx2.destination);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(880, ctx2.currentTime);
        osc2.frequency.exponentialRampToValueAtTime(440, ctx2.currentTime + 0.3);
        gain2.gain.setValueAtTime(0.5, ctx2.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.001, ctx2.currentTime + 0.8);
        osc2.start(ctx2.currentTime);
        osc2.stop(ctx2.currentTime + 0.8);
      } catch (e) { /* 無視 */ }
    }, 500);
  } catch (e) {
    // AudioContext非対応環境では無視
  }
}

// ===== タスク管理 =====
function handleAddTask(e) {
  e.preventDefault();
  const name = taskInput.value.trim();
  if (!name) return;

  const task = {
    id: Date.now().toString(),
    name,
    plannedPomodoros: parseInt(taskPomodoros.value, 10),
    usedPomodoros: 0,
    completed: false,
    createdAt: new Date().toISOString(),
  };

  tasks.push(task);
  saveTasks();
  renderTasks();

  taskInput.value = '';
  taskInput.focus();
}

function setActiveTask(taskId) {
  if (state.activeTaskId === taskId) {
    state.activeTaskId = null;
  } else {
    state.activeTaskId = taskId;
  }
  renderTasks();
  updateActiveTaskBar();
}

function toggleComplete(taskId) {
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;

  task.completed = !task.completed;

  if (task.completed) {
    state.todayCompletedTasks++;
    // アクティブタスクが完了したら解除
    if (state.activeTaskId === taskId) {
      state.activeTaskId = null;
      updateActiveTaskBar();
    }
  } else {
    state.todayCompletedTasks = Math.max(0, state.todayCompletedTasks - 1);
  }

  saveTasks();
  saveTodayStats();
  updateStatsUI();
  renderTasks();
}

function deleteTask(taskId) {
  tasks = tasks.filter(t => t.id !== taskId);
  if (state.activeTaskId === taskId) {
    state.activeTaskId = null;
    updateActiveTaskBar();
  }
  saveTasks();
  renderTasks();
}

// ===== タスクのレンダリング =====
function renderTasks() {
  taskList.innerHTML = '';

  // 未完了を上、完了を下に並べる
  const sorted = [
    ...tasks.filter(t => !t.completed),
    ...tasks.filter(t => t.completed),
  ];

  if (sorted.length === 0) {
    taskEmptyMsg.style.display = '';
    return;
  }
  taskEmptyMsg.style.display = 'none';

  sorted.forEach(task => {
    const li = document.createElement('li');
    li.className = 'task-item';
    if (task.id === state.activeTaskId && !task.completed) li.classList.add('active');
    if (task.completed) li.classList.add('completed');

    // ポモドーロアイコン文字列を生成
    const pomodoroIcons = buildPomodoroIcons(task.usedPomodoros, task.plannedPomodoros);

    li.innerHTML = `
      <button class="btn-task-select" data-id="${escapeAttr(task.id)}" aria-label="${task.id === state.activeTaskId ? 'アクティブタスク解除' : 'このタスクをアクティブにする'}" aria-pressed="${task.id === state.activeTaskId}">
        &#9654;
      </button>
      <span class="task-name">${escapeHtml(task.name)}</span>
      <span class="task-pomodoros" aria-label="ポモドーロ ${task.usedPomodoros}/${task.plannedPomodoros}">
        ${pomodoroIcons}
      </span>
      <button class="btn-task-complete" data-id="${escapeAttr(task.id)}" aria-label="${task.completed ? '完了を取り消す' : 'タスクを完了にする'}" aria-pressed="${task.completed}">
        &#10003;
      </button>
      <button class="btn-task-delete" data-id="${escapeAttr(task.id)}" aria-label="タスクを削除">
        &#10005;
      </button>
    `;

    // イベント委譲のためにli単位でリスナーを付ける
    li.querySelector('.btn-task-select').addEventListener('click', () => {
      if (!task.completed) setActiveTask(task.id);
    });
    li.querySelector('.btn-task-complete').addEventListener('click', () => toggleComplete(task.id));
    li.querySelector('.btn-task-delete').addEventListener('click', () => deleteTask(task.id));

    taskList.appendChild(li);
  });
}

function buildPomodoroIcons(used, planned) {
  // 例: 使用2/予定3 → "&#127813;&#127813;/3"
  const maxShow = 6;
  const displayUsed   = Math.min(used, maxShow);
  const tomato = '&#127813;';

  let icons = '';
  for (let i = 0; i < displayUsed; i++) icons += tomato;
  if (used > maxShow) icons += `+${used - maxShow}`;
  icons += `/${planned}`;
  return `<span class="task-pomodoro-icon">${icons}</span>`;
}

// ===== localStorage =====
function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(tasks));
  } catch (e) { /* quota exceeded など */ }
}

function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TASKS);
    if (raw) tasks = JSON.parse(raw);
  } catch (e) {
    tasks = [];
  }
}

function saveTodayStats() {
  const today = new Date().toISOString().slice(0, 10);
  try {
    const data = { date: today, pomodoros: state.todayPomodoros, completedTasks: state.todayCompletedTasks };
    localStorage.setItem(STORAGE_KEY_STATS, JSON.stringify(data));
  } catch (e) { /* 無視 */ }
}

function loadStats() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_STATS);
    if (!raw) return;
    const data = JSON.parse(raw);
    const today = new Date().toISOString().slice(0, 10);
    if (data.date === today) {
      state.todayPomodoros = data.pomodoros || 0;
      state.todayCompletedTasks = data.completedTasks || 0;
    } else {
      // 日付が変わったらリセット
      localStorage.removeItem(STORAGE_KEY_STATS);
    }
  } catch (e) { /* 無視 */ }
}

// ===== XSSエスケープ =====
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeAttr(str) {
  return String(str).replace(/"/g, '&quot;');
}

// ===== 起動 =====
document.addEventListener('DOMContentLoaded', init);
