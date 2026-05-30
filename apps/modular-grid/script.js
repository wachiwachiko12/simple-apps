'use strict';

// ===== 初期状態 =====
const state = {
  deviceWidth: 375,
  columns: 12,
  gutter: 16,
  margin: 24,
  baseline: 8,
  rowHeight: 60,
  showBaseline: true,
  colColor: '#5b8dee',
  baselineColor: '#e06c75',
  opacity: 20,
};

// プリセット定義
const PRESETS = {
  '12col': { columns: 12, gutter: 16, margin: 24, baseline: 8, rowHeight: 64 },
  '8pt':   { columns: 12, gutter: 8,  margin: 16, baseline: 8, rowHeight: 56 },
  'golden':{ columns: 8,  gutter: 20, margin: 32, baseline: 10, rowHeight: 80 },
  'bootstrap': { columns: 12, gutter: 30, margin: 15, baseline: 8, rowHeight: 60 },
  'material':  { columns: 12, gutter: 16, margin: 16, baseline: 8, rowHeight: 48 },
};

// Canvas高さ（デバイス幅に応じて調整）
function canvasHeight(w) {
  if (w >= 1440) return 900;
  if (w >= 768)  return 720;
  return 600;
}

// ===== DOM参照 =====
const canvas = document.getElementById('grid-canvas');
const ctx    = canvas.getContext('2d');

const sliders = {
  columns:   document.getElementById('columns'),
  gutter:    document.getElementById('gutter'),
  margin:    document.getElementById('margin'),
  baseline:  document.getElementById('baseline'),
  rowHeight: document.getElementById('row-height'),
  opacity:   document.getElementById('opacity'),
};

const outputs = {
  columns:   document.getElementById('columns-val'),
  gutter:    document.getElementById('gutter-val'),
  margin:    document.getElementById('margin-val'),
  baseline:  document.getElementById('baseline-val'),
  rowHeight: document.getElementById('row-height-val'),
  opacity:   document.getElementById('opacity-val'),
};

const colColorInput      = document.getElementById('col-color');
const baselineColorInput = document.getElementById('baseline-color');
const baselineToggle     = document.getElementById('baseline-toggle');
const sizeLabelEl        = document.getElementById('canvas-size-label');
const codeOutputCSS      = document.getElementById('code-output-css');
const codeOutputTailwind = document.getElementById('code-output-tailwind');
const btnCopy            = document.getElementById('btn-copy');
const btnDownload        = document.getElementById('btn-download');

// ===== ユーティリティ =====

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return { r, g, b };
}

// ===== Canvas描画 =====

function drawGrid() {
  const w = state.deviceWidth;
  const h = canvasHeight(w);
  canvas.width  = w;
  canvas.height = h;
  sizeLabelEl.textContent = `${w} × ${h} px`;

  ctx.clearRect(0, 0, w, h);

  // 白背景
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);

  const alpha = state.opacity / 100;
  const { r: cr, g: cg, b: cb } = hexToRgb(state.colColor);

  // ベースライングリッドを先に描く（カラムの下）
  if (state.showBaseline && state.baseline > 0) {
    const { r: br, g: bg, b: bb } = hexToRgb(state.baselineColor);
    ctx.strokeStyle = `rgba(${br},${bg},${bb},${alpha * 1.5})`;
    ctx.lineWidth = 1;
    for (let y = state.baseline; y < h; y += state.baseline) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
  }

  // 行モジュールハイライト（偶数行）
  if (state.rowHeight > 0) {
    ctx.fillStyle = `rgba(${cr},${cg},${cb},${alpha * 0.35})`;
    for (let y = 0; y < h; y += state.rowHeight * 2) {
      ctx.fillRect(0, y, w, state.rowHeight);
    }
  }

  // カラムグリッド
  const totalGutter  = state.gutter * (state.columns - 1);
  const totalMargin  = state.margin * 2;
  const contentWidth = w - totalMargin - totalGutter;
  const colWidth     = contentWidth / state.columns;

  if (colWidth > 0) {
    ctx.fillStyle = `rgba(${cr},${cg},${cb},${alpha})`;
    for (let i = 0; i < state.columns; i++) {
      const x = state.margin + i * (colWidth + state.gutter);
      ctx.fillRect(x, 0, colWidth, h);
    }
  }
}

// ===== コード生成 =====

function generateCSS() {
  const totalGutter  = state.gutter * (state.columns - 1);
  const totalMargin  = state.margin * 2;
  const contentWidth = state.deviceWidth - totalMargin - totalGutter;
  const colWidth     = Math.round(contentWidth / state.columns);

  return `:root {
  /* === Grid System === */
  --grid-columns: ${state.columns};
  --grid-gutter:  ${state.gutter}px;
  --grid-margin:  ${state.margin}px;
  --grid-col-width: ${colWidth}px;

  /* === Baseline === */
  --baseline:     ${state.baseline}px;
  --row-height:   ${state.rowHeight}px;

  /* === Viewport === */
  --viewport-width: ${state.deviceWidth}px;
  --content-width:  ${state.deviceWidth - totalMargin}px;
}

/* カラムスパン用ユーティリティ */
.col-1  { width: calc(var(--grid-col-width) * 1 + var(--grid-gutter) * 0); }
.col-2  { width: calc(var(--grid-col-width) * 2 + var(--grid-gutter) * 1); }
.col-3  { width: calc(var(--grid-col-width) * 3 + var(--grid-gutter) * 2); }
.col-4  { width: calc(var(--grid-col-width) * 4 + var(--grid-gutter) * 3); }
.col-6  { width: calc(var(--grid-col-width) * 6 + var(--grid-gutter) * 5); }
.col-12 { width: calc(var(--grid-col-width) * 12 + var(--grid-gutter) * 11); }`;
}

function generateTailwind() {
  const totalGutter  = state.gutter * (state.columns - 1);
  const totalMargin  = state.margin * 2;
  const contentWidth = state.deviceWidth - totalMargin - totalGutter;
  const colWidth     = Math.round(contentWidth / state.columns);
  const gutterRem    = (state.gutter / 16).toFixed(3);
  const marginRem    = (state.margin / 16).toFixed(3);

  return `/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      gridTemplateColumns: {
        // ${state.columns}-column grid (${state.deviceWidth}px viewport)
        'layout': 'repeat(${state.columns}, ${colWidth}px)',
      },
      gap: {
        'gutter': '${gutterRem}rem', /* ${state.gutter}px */
      },
      padding: {
        'margin': '${marginRem}rem', /* ${state.margin}px */
      },
      spacing: {
        'baseline': '${state.baseline}px',
        'row':      '${state.rowHeight}px',
      },
    },
  },
}`;
}

function updateCodeOutput() {
  codeOutputCSS.textContent      = generateCSS();
  codeOutputTailwind.textContent = generateTailwind();
}

// ===== 同期処理 =====

function syncFromState() {
  sliders.columns.value   = state.columns;
  sliders.gutter.value    = state.gutter;
  sliders.margin.value    = state.margin;
  sliders.baseline.value  = state.baseline;
  sliders.rowHeight.value = state.rowHeight;
  sliders.opacity.value   = state.opacity;

  outputs.columns.value   = state.columns;
  outputs.gutter.value    = state.gutter;
  outputs.margin.value    = state.margin;
  outputs.baseline.value  = state.baseline;
  outputs.rowHeight.value = state.rowHeight;
  outputs.opacity.value   = state.opacity;

  colColorInput.value      = state.colColor;
  baselineColorInput.value = state.baselineColor;
  baselineToggle.checked   = state.showBaseline;
}

function render() {
  drawGrid();
  updateCodeOutput();
}

// ===== イベントリスナー =====

// スライダー
Object.keys(sliders).forEach((key) => {
  sliders[key].addEventListener('input', () => {
    const val = parseInt(sliders[key].value, 10);
    if (key === 'rowHeight') {
      state.rowHeight = val;
      outputs.rowHeight.value = val;
    } else if (key === 'opacity') {
      state.opacity = val;
      outputs.opacity.value = val;
    } else {
      state[key] = val;
      outputs[key].value = val;
    }
    render();
  });
});

// カラー入力
colColorInput.addEventListener('input', () => {
  state.colColor = colColorInput.value;
  render();
});

baselineColorInput.addEventListener('input', () => {
  state.baselineColor = baselineColorInput.value;
  render();
});

// ベースライントグル
baselineToggle.addEventListener('change', () => {
  state.showBaseline = baselineToggle.checked;
  render();
});

// デバイスボタン
document.querySelectorAll('.device-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.device-btn').forEach((b) => {
      b.classList.remove('active');
      b.setAttribute('aria-pressed', 'false');
    });
    btn.classList.add('active');
    btn.setAttribute('aria-pressed', 'true');
    state.deviceWidth = parseInt(btn.dataset.width, 10);
    render();
  });
});

// プリセットボタン
document.querySelectorAll('.preset-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const preset = PRESETS[btn.dataset.preset];
    if (!preset) return;
    Object.assign(state, preset);
    document.querySelectorAll('.preset-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    syncFromState();
    render();
  });
});

// タブ切り替え
document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach((b) => {
      b.classList.remove('active');
      b.setAttribute('aria-selected', 'false');
    });
    btn.classList.add('active');
    btn.setAttribute('aria-selected', 'true');

    const tab = btn.dataset.tab;
    if (tab === 'css') {
      codeOutputCSS.classList.remove('hidden');
      codeOutputTailwind.classList.add('hidden');
    } else {
      codeOutputCSS.classList.add('hidden');
      codeOutputTailwind.classList.remove('hidden');
    }
  });
});

// コピーボタン
btnCopy.addEventListener('click', () => {
  const activeCode = codeOutputCSS.classList.contains('hidden')
    ? codeOutputTailwind.textContent
    : codeOutputCSS.textContent;

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(activeCode).then(() => {
      showCopied();
    }).catch(() => {
      fallbackCopy(activeCode);
    });
  } else {
    fallbackCopy(activeCode);
  }
});

function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity  = '0';
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
    showCopied();
  } catch (e) {
    // コピー失敗時は何もしない
  }
  document.body.removeChild(ta);
}

function showCopied() {
  btnCopy.textContent = 'コピー完了!';
  btnCopy.classList.add('copied');
  setTimeout(() => {
    btnCopy.textContent = 'コピー';
    btnCopy.classList.remove('copied');
  }, 2000);
}

// PNG出力
btnDownload.addEventListener('click', () => {
  // 現在のグリッドを高解像度で描画してからダウンロード
  const link = document.createElement('a');
  link.download = `grid-${state.deviceWidth}px-${state.columns}col.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
});

// ===== 初期化 =====

document.addEventListener('DOMContentLoaded', () => {
  syncFromState();
  render();
});
