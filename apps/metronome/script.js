'use strict';

// ===== 定数 =====
const BPM_MIN = 20;
const BPM_MAX = 300;
const TAP_BUFFER_SIZE = 8;
const MEMO_STORAGE_KEY = 'metronome_memos';

// 速度記号テーブル
const TEMPO_NAMES = [
  { min: 201, max: 300, name: 'Presto' },
  { min: 169, max: 200, name: 'Vivace' },
  { min: 121, max: 168, name: 'Allegro' },
  { min:  90, max: 120, name: 'Moderato' },
  { min:  73, max:  89, name: 'Andante' },
  { min:  60, max:  72, name: 'Adagio' },
  { min:  20, max:  59, name: 'Largo' },
];

// ===== 状態 =====
let audioCtx = null;
let isRunning = false;
let currentBpm = 120;
let currentBeats = 4;       // 拍子の分子（拍数）
let currentDivision = 4;    // 拍子の分母
let swingPercent = 0;
let currentBeat = 0;        // 0始まりカウンタ
let schedulerTimer = null;
let nextNoteTime = 0.0;
let tapTimes = [];

// ===== DOM参照 =====
const bpmSlider    = document.getElementById('bpm-slider');
const bpmInputNum  = document.getElementById('bpm-input');
const bpmNumber    = document.getElementById('bpm-number');
const tempoNameEl  = document.getElementById('tempo-name');
const swingSlider  = document.getElementById('swing-slider');
const swingValue   = document.getElementById('swing-value');
const btnStartStop = document.getElementById('btn-start-stop');
const btnIcon      = document.getElementById('btn-icon');
const btnLabel     = document.getElementById('btn-label');
const timeSigBtns  = document.querySelectorAll('.time-sig-btn');
const beatDots     = [
  document.getElementById('beat-dot-1'),
  document.getElementById('beat-dot-2'),
  document.getElementById('beat-dot-3'),
  document.getElementById('beat-dot-4'),
  document.getElementById('beat-dot-5'),
  document.getElementById('beat-dot-6'),
];
const btnTap       = document.getElementById('btn-tap');
const tapResult    = document.getElementById('tap-result');
const btnResetTap  = document.getElementById('btn-reset-tap');
const songName     = document.getElementById('song-name');
const targetBpm    = document.getElementById('target-bpm');
const btnSaveMemo  = document.getElementById('btn-save-memo');
const memoSavedList = document.getElementById('memo-saved-list');

// ===== AudioContext 初期化 =====
function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// ===== クリック音生成 =====
// isAccent: 強拍（1拍目）は高い音
function scheduleClick(time, isAccent) {
  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.frequency.value = isAccent ? 1200 : 800;
  osc.type = 'sine';

  gain.gain.setValueAtTime(0.001, time);
  gain.gain.exponentialRampToValueAtTime(isAccent ? 0.7 : 0.45, time + 0.002);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.06);

  osc.start(time);
  osc.stop(time + 0.08);
}

// ===== スケジューラー =====
const LOOK_AHEAD   = 0.1;   // 先読み時間（秒）
const SCHEDULE_MS  = 25;    // ポーリング間隔（ms）

function getNoteDuration() {
  // スウィング補正: 偶数番目（強拍後）の拍を長く
  // スウィングなしの1拍の長さ
  const secondsPerBeat = 60.0 / currentBpm;
  return secondsPerBeat;
}

function scheduler() {
  const ctx = getAudioContext();
  const secondsPerBeat = 60.0 / currentBpm;

  // スウィング補正係数（0: なし, 0.5: 最大）
  // 奇数番目の間隔を長く、偶数番目を短くする
  const swingRatio = swingPercent / 100; // 0.0〜0.5

  while (nextNoteTime < ctx.currentTime + LOOK_AHEAD) {
    const beatIndex = currentBeat % currentBeats;
    const isAccent = beatIndex === 0;

    // スウィング: 偶数インデックス（2つ1組の1番目）は長め
    // ストレート: swingRatio = 0 → 均等
    let beatDuration;
    if (swingRatio === 0) {
      beatDuration = secondsPerBeat;
    } else {
      // 偶数拍（0,2,4...）: 2/3 * (1 + swing) → 長い
      // 奇数拍（1,3,5...）: 2/3 * (1 - swing) → 短い
      // ただし合計は2拍 = 2 * secondsPerBeat を保つ
      if (beatIndex % 2 === 0) {
        beatDuration = secondsPerBeat * (1 + swingRatio);
      } else {
        beatDuration = secondsPerBeat * (1 - swingRatio);
      }
    }

    scheduleClick(nextNoteTime, isAccent);
    scheduleVisual(nextNoteTime, beatIndex);

    nextNoteTime += beatDuration;
    currentBeat++;
  }
}

// ===== 視覚フィードバック =====
function scheduleVisual(time, beatIndex) {
  const ctx = getAudioContext();
  const delay = (time - ctx.currentTime) * 1000;
  const safeDelay = Math.max(0, delay);

  setTimeout(() => {
    flashBeat(beatIndex);
  }, safeDelay);
}

function flashBeat(beatIndex) {
  beatDots.forEach((dot, i) => {
    if (dot.classList.contains('hidden')) return;
    dot.classList.remove('accent', 'active');
    if (i === beatIndex) {
      if (beatIndex === 0) {
        dot.classList.add('accent');
      } else {
        dot.classList.add('active');
      }
      setTimeout(() => {
        dot.classList.remove('accent', 'active');
      }, 120);
    }
  });
}

function updateBeatDots() {
  beatDots.forEach((dot, i) => {
    if (i < currentBeats) {
      dot.classList.remove('hidden');
    } else {
      dot.classList.add('hidden');
    }
    dot.classList.remove('accent', 'active');
  });
}

// ===== 開始・停止 =====
function startMetronome() {
  const ctx = getAudioContext();
  isRunning = true;
  currentBeat = 0;
  nextNoteTime = ctx.currentTime + 0.05;
  schedulerTimer = setInterval(scheduler, SCHEDULE_MS);
  btnStartStop.classList.add('running');
  btnIcon.textContent = '⏹'; // STOP
  btnLabel.textContent = '停止';
  btnStartStop.setAttribute('aria-label', 'メトロノーム停止');
}

function stopMetronome() {
  isRunning = false;
  clearInterval(schedulerTimer);
  schedulerTimer = null;
  btnStartStop.classList.remove('running');
  btnIcon.textContent = '▶'; // PLAY
  btnLabel.textContent = '開始';
  btnStartStop.setAttribute('aria-label', 'メトロノーム開始');
  beatDots.forEach(dot => dot.classList.remove('accent', 'active'));
}

// ===== BPM設定 =====
function setBpm(value) {
  const bpm = Math.max(BPM_MIN, Math.min(BPM_MAX, Math.round(Number(value))));
  if (isNaN(bpm)) return;
  currentBpm = bpm;
  bpmSlider.value = bpm;
  bpmInputNum.value = bpm;
  bpmNumber.textContent = bpm;
  updateTempoName(bpm);
}

function updateTempoName(bpm) {
  for (const entry of TEMPO_NAMES) {
    if (bpm >= entry.min && bpm <= entry.max) {
      tempoNameEl.textContent = entry.name;
      return;
    }
  }
  tempoNameEl.textContent = '';
}

// ===== イベント: BPMスライダー =====
bpmSlider.addEventListener('input', () => {
  setBpm(bpmSlider.value);
});

// ===== イベント: BPM数値入力 =====
bpmInputNum.addEventListener('change', () => {
  setBpm(bpmInputNum.value);
});

bpmInputNum.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowUp') {
    setBpm(currentBpm + 1);
    e.preventDefault();
  } else if (e.key === 'ArrowDown') {
    setBpm(currentBpm - 1);
    e.preventDefault();
  }
});

// ===== イベント: 拍子ボタン =====
timeSigBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    timeSigBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentBeats    = parseInt(btn.dataset.beats, 10);
    currentDivision = parseInt(btn.dataset.division, 10);
    currentBeat = 0;
    updateBeatDots();

    // 6/8: BPM調整の参考表示（実際の音は1拍を小節の1/6として扱うため
    // 通常表示でOK — ユーザーが6拍打ちで指定する）
  });
});

// ===== イベント: スウィング =====
swingSlider.addEventListener('input', () => {
  swingPercent = parseInt(swingSlider.value, 10);
  swingValue.textContent = swingPercent + '%';
});

// ===== イベント: 開始・停止 =====
btnStartStop.addEventListener('click', () => {
  if (isRunning) {
    stopMetronome();
  } else {
    startMetronome();
  }
});

// ===== タップテンポ =====
// pointerdown を使うことでマウス・タッチ両対応しつつダブルファイアを防ぐ
let tapPointerActive = false;
btnTap.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  if (tapPointerActive) return;
  tapPointerActive = true;
  handleTap();
});
btnTap.addEventListener('pointerup', () => { tapPointerActive = false; });
btnTap.addEventListener('pointercancel', () => { tapPointerActive = false; });

function handleTap() {
  const now = performance.now();
  tapTimes.push(now);
  if (tapTimes.length > TAP_BUFFER_SIZE) {
    tapTimes.shift();
  }

  if (tapTimes.length < 2) {
    tapResult.textContent = 'もう一度タップしてください...';
    return;
  }

  const intervals = [];
  for (let i = 1; i < tapTimes.length; i++) {
    intervals.push(tapTimes[i] - tapTimes[i - 1]);
  }
  const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  const detectedBpm = Math.round(60000 / avgInterval);

  if (detectedBpm < BPM_MIN || detectedBpm > BPM_MAX) {
    tapResult.textContent = '検出範囲外（20〜300 BPM）';
    return;
  }

  setBpm(detectedBpm);
  tapResult.textContent = `検出BPM: ${detectedBpm}`;
}

btnResetTap.addEventListener('click', () => {
  tapTimes = [];
  tapResult.textContent = '';
});

// ===== 練習メモ =====
function loadMemos() {
  try {
    return JSON.parse(localStorage.getItem(MEMO_STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveMemos(memos) {
  localStorage.setItem(MEMO_STORAGE_KEY, JSON.stringify(memos));
}

function renderMemos() {
  const memos = loadMemos();
  memoSavedList.innerHTML = '';

  if (memos.length === 0) {
    memoSavedList.textContent = '';
    return;
  }

  memos.forEach((memo, index) => {
    const item = document.createElement('div');
    item.className = 'memo-item';

    const nameEl = document.createElement('span');
    nameEl.className = 'memo-item-name';
    nameEl.textContent = memo.name;

    const bpmEl = document.createElement('span');
    bpmEl.className = 'memo-item-bpm';
    bpmEl.textContent = memo.bpm ? `目標 ${memo.bpm} BPM` : '';

    const applyBtn = document.createElement('button');
    applyBtn.className = 'memo-item-apply';
    applyBtn.textContent = '適用';
    applyBtn.setAttribute('aria-label', `${memo.name}のBPMを適用`);
    applyBtn.addEventListener('click', () => {
      if (memo.bpm) {
        setBpm(memo.bpm);
      }
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'memo-item-delete';
    deleteBtn.textContent = '削除';
    deleteBtn.setAttribute('aria-label', `${memo.name}を削除`);
    deleteBtn.addEventListener('click', () => {
      const memos = loadMemos();
      memos.splice(index, 1);
      saveMemos(memos);
      renderMemos();
    });

    item.appendChild(nameEl);
    if (memo.bpm) item.appendChild(bpmEl);
    item.appendChild(applyBtn);
    item.appendChild(deleteBtn);
    memoSavedList.appendChild(item);
  });
}

btnSaveMemo.addEventListener('click', () => {
  const name = songName.value.trim();
  const bpm  = targetBpm.value ? parseInt(targetBpm.value, 10) : null;

  if (!name) {
    songName.focus();
    return;
  }

  const memos = loadMemos();
  memos.push({ name, bpm });
  saveMemos(memos);
  renderMemos();

  songName.value = '';
  targetBpm.value = '';
});

// ===== キーボードショートカット =====
document.addEventListener('keydown', (e) => {
  // Space: 開始/停止（入力フォームにフォーカスがない場合）
  const tag = document.activeElement && document.activeElement.tagName;
  if (e.code === 'Space' && tag !== 'INPUT' && tag !== 'TEXTAREA') {
    e.preventDefault();
    if (isRunning) {
      stopMetronome();
    } else {
      startMetronome();
    }
  }
  // T: タップテンポ（入力フォームにフォーカスがない場合）
  if (e.code === 'KeyT' && tag !== 'INPUT' && tag !== 'TEXTAREA') {
    handleTap();
  }
});

// ===== 初期化 =====
(function init() {
  setBpm(120);
  updateBeatDots();
  renderMemos();
})();
