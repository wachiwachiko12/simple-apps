'use strict';

// ===== 定数 =====
const SAMPLE_TEXT = 'あのイーハトーヴォをすきとおった風、夏でも底に冷たさをもつ青いそら';

const STEPS = [
  { key: 'h1',    label: 'h1',    step: 5 },
  { key: 'h2',    label: 'h2',    step: 4 },
  { key: 'h3',    label: 'h3',    step: 3 },
  { key: 'h4',    label: 'h4',    step: 2 },
  { key: 'h5',    label: 'h5',    step: 1 },
  { key: 'h6',    label: 'h6',    step: 0 },
  { key: 'p',     label: 'p',     step: -1 },
  { key: 'small', label: 'small', step: -2 },
];

const CSS_VAR_NAMES = {
  h1: '--text-5xl',
  h2: '--text-4xl',
  h3: '--text-3xl',
  h4: '--text-2xl',
  h5: '--text-xl',
  h6: '--text-lg',
  p:  '--text-base',
  small: '--text-sm',
};

const TAILWIND_KEYS = {
  h1: "'5xl'",
  h2: "'4xl'",
  h3: "'3xl'",
  h4: "'2xl'",
  h5: "'xl'",
  h6: "'lg'",
  p:  "'base'",
  small: "'sm'",
};

const STORAGE_KEY = 'typography-scale-v1';

// ===== 状態 =====
let state = {
  baseSize: 16,
  baseUnit: 'px',
  ratio: 1.2,
  lineHeight: 1.5,
  letterSpacing: 0,
  activeTab: 'css',
};

// ===== DOM参照 =====
const baseSizeSlider      = document.getElementById('base-size');
const baseSizeVal         = document.getElementById('base-size-val');
const baseUnitSelect      = document.getElementById('base-unit');
const lineHeightSlider    = document.getElementById('line-height-base');
const lineHeightVal       = document.getElementById('line-height-val');
const letterSpacingSlider = document.getElementById('letter-spacing-base');
const letterSpacingVal    = document.getElementById('letter-spacing-val');
const ratioGrid           = document.getElementById('ratio-grid');
const previewArea         = document.getElementById('preview-area');
const cssOutput           = document.getElementById('css-output');
const tailwindOutput      = document.getElementById('tailwind-output');
const copyCssBtn          = document.getElementById('copy-css');
const copyTailwindBtn     = document.getElementById('copy-tailwind');
const tabBtns             = document.querySelectorAll('.tab-btn');
const tabContents         = document.querySelectorAll('.tab-content');

// ===== 計算 =====
function calcFontSize(baseSize, ratio, step) {
  return baseSize * Math.pow(ratio, step);
}

function toRem(px, basePx) {
  return px / basePx;
}

function round(val, digits) {
  const factor = Math.pow(10, digits);
  return Math.round(val * factor) / factor;
}

// ===== レンダリング =====
function buildPreviewRows() {
  const { baseSize, baseUnit, ratio, lineHeight, letterSpacing } = state;
  const basePx = baseUnit === 'rem' ? baseSize * 16 : baseSize;

  previewArea.innerHTML = '';

  STEPS.forEach(({ key, label, step }) => {
    const px = calcFontSize(basePx, ratio, step);
    const rem = toRem(px, 16);
    const displayPx = round(px, 2);
    const displayRem = round(rem, 4);

    const row = document.createElement('div');
    row.className = 'preview-row';
    row.setAttribute('role', 'listitem');

    const meta = document.createElement('div');
    meta.className = 'preview-meta';
    meta.innerHTML = `
      <span class="preview-label">${label}</span>
      <span class="preview-size">${displayPx}px / ${displayRem}rem</span>
    `;

    const text = document.createElement('div');
    text.className = 'preview-text';
    // スマホで極端に大きくなる場合は 72px を上限とする
    const clampedPx = Math.min(displayPx, 72);
    text.style.fontSize = `${clampedPx}px`;
    text.style.lineHeight = String(lineHeight);
    text.style.letterSpacing = `${round(letterSpacing, 4)}em`;
    text.textContent = SAMPLE_TEXT;
    text.setAttribute('aria-hidden', 'true');

    row.appendChild(meta);
    row.appendChild(text);
    previewArea.appendChild(row);
  });
}

function buildCssOutput() {
  const { baseSize, baseUnit, ratio, lineHeight, letterSpacing } = state;
  const basePx = baseUnit === 'rem' ? baseSize * 16 : baseSize;

  const lines = [':root {'];
  STEPS.forEach(({ key, step }) => {
    const px   = calcFontSize(basePx, ratio, step);
    const rem  = round(toRem(px, 16), 4);
    const varName = CSS_VAR_NAMES[key];
    lines.push(`  ${varName}: ${rem}rem;`);
  });
  lines.push(`  --line-height-base: ${lineHeight};`);
  if (letterSpacing !== 0) {
    lines.push(`  --letter-spacing-base: ${round(letterSpacing, 4)}em;`);
  }
  lines.push('}');

  cssOutput.textContent = lines.join('\n');
}

function buildTailwindOutput() {
  const { baseSize, baseUnit, ratio, lineHeight, letterSpacing } = state;
  const basePx = baseUnit === 'rem' ? baseSize * 16 : baseSize;

  const lines = [
    '// tailwind.config.js',
    'module.exports = {',
    '  theme: {',
    '    extend: {',
    '      fontSize: {',
  ];

  STEPS.forEach(({ key, step }) => {
    const px   = calcFontSize(basePx, ratio, step);
    const rem  = round(toRem(px, 16), 4);
    const twKey = TAILWIND_KEYS[key];
    lines.push(`        ${twKey}: ['${rem}rem', { lineHeight: '${lineHeight}' }],`);
  });

  lines.push(
    '      },',
    '    },',
    '  },',
    '};'
  );

  tailwindOutput.textContent = lines.join('\n');
}

function render() {
  buildPreviewRows();
  buildCssOutput();
  buildTailwindOutput();
  saveToStorage();
}

// ===== コピー機能 =====
function copyText(text, btn) {
  navigator.clipboard.writeText(text).then(() => {
    const original = btn.textContent;
    btn.textContent = 'コピーしました！';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.textContent = original;
      btn.classList.remove('copied');
    }, 2000);
  }).catch(() => {
    // フォールバック
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    const original = btn.textContent;
    btn.textContent = 'コピーしました！';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.textContent = original;
      btn.classList.remove('copied');
    }, 2000);
  });
}

// ===== タブ切り替え =====
function switchTab(tabName) {
  state.activeTab = tabName;
  tabBtns.forEach(btn => {
    const isActive = btn.dataset.tab === tabName;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-selected', String(isActive));
  });
  tabContents.forEach(content => {
    content.classList.toggle('active', content.id === `tab-${tabName}`);
  });
}

// ===== localStorage =====
function saveToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      baseSize: state.baseSize,
      baseUnit: state.baseUnit,
      ratio: state.ratio,
      lineHeight: state.lineHeight,
      letterSpacing: state.letterSpacing,
    }));
  } catch (_) { /* quota exceeded — ignore */ }
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (typeof saved.baseSize === 'number')      state.baseSize = saved.baseSize;
    if (saved.baseUnit === 'px' || saved.baseUnit === 'rem') state.baseUnit = saved.baseUnit;
    if (typeof saved.ratio === 'number')         state.ratio = saved.ratio;
    if (typeof saved.lineHeight === 'number')    state.lineHeight = saved.lineHeight;
    if (typeof saved.letterSpacing === 'number') state.letterSpacing = saved.letterSpacing;
  } catch (_) { /* corrupt data — ignore */ }
}

// ===== UIへの反映 =====
function syncUIFromState() {
  baseSizeSlider.value    = state.baseSize;
  baseSizeVal.textContent = state.baseSize;
  baseUnitSelect.value    = state.baseUnit;

  lineHeightSlider.value    = state.lineHeight;
  lineHeightVal.textContent = round(state.lineHeight, 2);

  letterSpacingSlider.value    = state.letterSpacing;
  letterSpacingVal.textContent = round(state.letterSpacing, 3);

  // 比率ボタンのアクティブ状態
  const ratioStr = String(state.ratio);
  document.querySelectorAll('.ratio-btn').forEach(btn => {
    const match = parseFloat(btn.dataset.ratio) === state.ratio;
    btn.classList.toggle('active', match);
    btn.setAttribute('aria-pressed', String(match));
  });
}

// ===== イベント登録 =====
function bindEvents() {
  // ベースサイズスライダー
  baseSizeSlider.addEventListener('input', () => {
    state.baseSize = parseFloat(baseSizeSlider.value);
    baseSizeVal.textContent = state.baseSize;
    render();
  });

  // 単位選択
  baseUnitSelect.addEventListener('change', () => {
    state.baseUnit = baseUnitSelect.value;
    render();
  });

  // 行間スライダー
  lineHeightSlider.addEventListener('input', () => {
    state.lineHeight = round(parseFloat(lineHeightSlider.value), 2);
    lineHeightVal.textContent = state.lineHeight;
    render();
  });

  // 字間スライダー
  letterSpacingSlider.addEventListener('input', () => {
    state.letterSpacing = round(parseFloat(letterSpacingSlider.value), 3);
    letterSpacingVal.textContent = state.letterSpacing;
    render();
  });

  // 比率ボタン
  ratioGrid.addEventListener('click', (e) => {
    const btn = e.target.closest('.ratio-btn');
    if (!btn) return;
    state.ratio = parseFloat(btn.dataset.ratio);

    document.querySelectorAll('.ratio-btn').forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-pressed', 'false');
    });
    btn.classList.add('active');
    btn.setAttribute('aria-pressed', 'true');
    render();
  });

  // タブ切り替え
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // コピーボタン
  copyCssBtn.addEventListener('click', () => {
    copyText(cssOutput.textContent, copyCssBtn);
  });

  copyTailwindBtn.addEventListener('click', () => {
    copyText(tailwindOutput.textContent, copyTailwindBtn);
  });
}

// ===== 初期化 =====
function init() {
  loadFromStorage();
  syncUIFromState();
  bindEvents();
  render();
}

document.addEventListener('DOMContentLoaded', init);
