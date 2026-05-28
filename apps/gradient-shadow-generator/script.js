/* ============================================================
   グラデーション・シャドウCSSジェネレーター — script.js
   ============================================================ */

'use strict';

/* ============================================================
   デフォルト状態
   ============================================================ */

const DEFAULTS = {
  gradType: 'linear',
  gradAngle: 135,
  colorStops: [
    { color: '#6366f1', pct: 0 },
    { color: '#a855f7', pct: 100 }
  ],
  shadows: [
    { x: 0, y: 4, blur: 24, spread: 0, color: '#00000040', inset: false }
  ],
  bgColor: '#1a1a2e'
};

/* ============================================================
   プリセット定義
   ============================================================ */

const PRESETS = {
  glassmorphism: {
    gradType: 'linear',
    gradAngle: 135,
    colorStops: [
      { color: '#ffffff26', pct: 0 },
      { color: '#ffffff0d', pct: 100 }
    ],
    shadows: [
      { x: 0, y: 8, blur: 32, spread: 0, color: '#0000004d', inset: false },
      { x: 0, y: 1, blur: 0, spread: 0, color: '#ffffff33', inset: true }
    ],
    bgColor: '#0f172a'
  },
  neumorphism: {
    gradType: 'linear',
    gradAngle: 145,
    colorStops: [
      { color: '#e0e5ec', pct: 0 },
      { color: '#ffffff', pct: 100 }
    ],
    shadows: [
      { x: 9, y: 9, blur: 18, spread: 0, color: '#babecc', inset: false },
      { x: -9, y: -9, blur: 18, spread: 0, color: '#ffffff', inset: false }
    ],
    bgColor: '#e0e5ec'
  },
  sunset: {
    gradType: 'linear',
    gradAngle: 135,
    colorStops: [
      { color: '#f97316', pct: 0 },
      { color: '#ec4899', pct: 50 },
      { color: '#8b5cf6', pct: 100 }
    ],
    shadows: [
      { x: 0, y: 8, blur: 32, spread: -4, color: '#f9731680', inset: false }
    ],
    bgColor: '#1a1a2e'
  },
  ocean: {
    gradType: 'linear',
    gradAngle: 160,
    colorStops: [
      { color: '#0ea5e9', pct: 0 },
      { color: '#06b6d4', pct: 50 },
      { color: '#10b981', pct: 100 }
    ],
    shadows: [
      { x: 0, y: 12, blur: 40, spread: -8, color: '#0ea5e966', inset: false }
    ],
    bgColor: '#0f172a'
  },
  aurora: {
    gradType: 'conic',
    gradAngle: 0,
    colorStops: [
      { color: '#6366f1', pct: 0 },
      { color: '#a855f7', pct: 25 },
      { color: '#ec4899', pct: 50 },
      { color: '#10b981', pct: 75 },
      { color: '#6366f1', pct: 100 }
    ],
    shadows: [
      { x: 0, y: 0, blur: 48, spread: -8, color: '#a855f780', inset: false }
    ],
    bgColor: '#1a1a2e'
  },
  soft: {
    gradType: 'linear',
    gradAngle: 120,
    colorStops: [
      { color: '#fce4ec', pct: 0 },
      { color: '#e8eaf6', pct: 100 }
    ],
    shadows: [
      { x: 0, y: 4, blur: 16, spread: 0, color: '#00000014', inset: false },
      { x: 0, y: 1, blur: 4, spread: 0, color: '#00000008', inset: false }
    ],
    bgColor: '#f0f0f0'
  },
  neon: {
    gradType: 'linear',
    gradAngle: 90,
    colorStops: [
      { color: '#00ff88', pct: 0 },
      { color: '#00ccff', pct: 100 }
    ],
    shadows: [
      { x: 0, y: 0, blur: 20, spread: 0, color: '#00ff8880', inset: false },
      { x: 0, y: 0, blur: 60, spread: -10, color: '#00ccff4d', inset: false }
    ],
    bgColor: '#18181b'
  },
  minimal: {
    gradType: 'linear',
    gradAngle: 180,
    colorStops: [
      { color: '#f8fafc', pct: 0 },
      { color: '#f1f5f9', pct: 100 }
    ],
    shadows: [
      { x: 0, y: 1, blur: 3, spread: 0, color: '#0000001a', inset: false },
      { x: 0, y: 1, blur: 2, spread: -1, color: '#0000001a', inset: false }
    ],
    bgColor: '#ffffff'
  }
};

/* ============================================================
   状態管理
   ============================================================ */

let state = loadState() || deepClone(DEFAULTS);

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function saveState() {
  try {
    localStorage.setItem('gsg_state', JSON.stringify(state));
  } catch (e) { /* ignore */ }
}

function loadState() {
  try {
    const s = localStorage.getItem('gsg_state');
    return s ? JSON.parse(s) : null;
  } catch (e) {
    return null;
  }
}

/* ============================================================
   DOM参照
   ============================================================ */

const elGradType    = document.getElementById('grad-type');
const elGradAngle   = document.getElementById('grad-angle');
const elAngleVal    = document.getElementById('angle-val');
const elAngleRow    = document.getElementById('angle-row');
const elStopsList   = document.getElementById('color-stops-list');
const elAddStop     = document.getElementById('add-stop-btn');
const elShadowList  = document.getElementById('shadow-layers-list');
const elAddShadow   = document.getElementById('add-shadow-btn');
const elPreviewBg   = document.getElementById('preview-bg');
const elPreviewCard = document.getElementById('preview-card');
const elCssOutput   = document.getElementById('css-output');
const elTwOutput    = document.getElementById('tw-output');
const elCopyCss     = document.getElementById('copy-css-btn');
const elCopyTw      = document.getElementById('copy-tw-btn');
const elBgColor     = document.getElementById('preview-bg-color');
const elBgSwatches  = document.querySelectorAll('.bg-swatch');
const elPresetBtns  = document.querySelectorAll('.preset-btn');

/* ============================================================
   初期化
   ============================================================ */

document.addEventListener('DOMContentLoaded', init);

function init() {
  bindEvents();
  applyStateToUI();
  render();
}

/* ============================================================
   イベントバインド
   ============================================================ */

function bindEvents() {
  elGradType.addEventListener('change', () => {
    state.gradType = elGradType.value;
    toggleAngleRow();
    render();
  });

  elGradAngle.addEventListener('input', () => {
    state.gradAngle = parseInt(elGradAngle.value, 10);
    elAngleVal.textContent = state.gradAngle;
    render();
  });

  elAddStop.addEventListener('click', () => {
    state.colorStops.push({ color: '#ffffff', pct: 100 });
    renderStops();
    render();
  });

  elAddShadow.addEventListener('click', () => {
    state.shadows.push({ x: 0, y: 4, blur: 16, spread: 0, color: '#00000040', inset: false });
    renderShadows();
    render();
  });

  elBgColor.addEventListener('input', () => {
    state.bgColor = elBgColor.value;
    updateBgPreview();
    render();
  });

  elBgSwatches.forEach(sw => {
    sw.addEventListener('click', () => {
      state.bgColor = sw.dataset.color;
      elBgColor.value = state.bgColor;
      updateBgSwatchActive();
      updateBgPreview();
      render();
    });
  });

  elPresetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const preset = PRESETS[btn.dataset.preset];
      if (!preset) return;
      state = deepClone(preset);
      applyStateToUI();
      render();
      elPresetBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  elCopyCss.addEventListener('click', () => copyText(elCssOutput.textContent, elCopyCss));
  elCopyTw.addEventListener('click', () => copyText(elTwOutput.textContent, elCopyTw));
}

/* ============================================================
   UIへの状態反映
   ============================================================ */

function applyStateToUI() {
  elGradType.value = state.gradType;
  elGradAngle.value = state.gradAngle;
  elAngleVal.textContent = state.gradAngle;
  elBgColor.value = state.bgColor;
  toggleAngleRow();
  renderStops();
  renderShadows();
  updateBgSwatchActive();
  updateBgPreview();
}

function toggleAngleRow() {
  elAngleRow.style.display = (state.gradType === 'linear') ? '' : 'none';
}

/* ============================================================
   カラーストップ描画
   ============================================================ */

function renderStops() {
  elStopsList.innerHTML = '';
  state.colorStops.forEach((stop, i) => {
    const row = document.createElement('div');
    row.className = 'stop-row';

    // カラーピッカー
    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.value = normalizeHex6(stop.color);
    colorInput.setAttribute('aria-label', `カラーストップ ${i + 1} の色`);
    colorInput.addEventListener('input', () => {
      state.colorStops[i].color = colorInput.value;
      render();
    });

    // 位置スライダー
    const rangeInput = document.createElement('input');
    rangeInput.type = 'range';
    rangeInput.min = 0;
    rangeInput.max = 100;
    rangeInput.value = stop.pct;
    rangeInput.setAttribute('aria-label', `カラーストップ ${i + 1} の位置`);
    rangeInput.addEventListener('input', () => {
      state.colorStops[i].pct = parseInt(rangeInput.value, 10);
      pctLabel.textContent = `${rangeInput.value}%`;
      render();
    });

    // パーセント表示
    const pctLabel = document.createElement('span');
    pctLabel.className = 'stop-pct';
    pctLabel.textContent = `${stop.pct}%`;

    // 削除ボタン
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'remove-btn';
    removeBtn.textContent = '×';
    removeBtn.setAttribute('aria-label', `カラーストップ ${i + 1} を削除`);
    removeBtn.addEventListener('click', () => {
      if (state.colorStops.length <= 2) return; // 最低2色維持
      state.colorStops.splice(i, 1);
      renderStops();
      render();
    });

    row.appendChild(colorInput);
    row.appendChild(rangeInput);
    row.appendChild(pctLabel);
    row.appendChild(removeBtn);
    elStopsList.appendChild(row);
  });
}

/* ============================================================
   シャドウレイヤー描画
   ============================================================ */

function renderShadows() {
  elShadowList.innerHTML = '';
  state.shadows.forEach((sh, i) => {
    const card = document.createElement('div');
    card.className = 'shadow-layer-card';

    // ヘッダー
    const header = document.createElement('div');
    header.className = 'shadow-layer-header';

    const title = document.createElement('span');
    title.className = 'shadow-layer-title';
    title.textContent = `レイヤー ${i + 1}`;

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'remove-btn';
    removeBtn.textContent = '×';
    removeBtn.setAttribute('aria-label', `シャドウレイヤー ${i + 1} を削除`);
    removeBtn.addEventListener('click', () => {
      state.shadows.splice(i, 1);
      renderShadows();
      render();
    });

    header.appendChild(title);
    header.appendChild(removeBtn);
    card.appendChild(header);

    // グリッドフィールド
    const grid = document.createElement('div');
    grid.className = 'shadow-grid';

    const fields = [
      { label: 'X (px)', key: 'x', type: 'number', min: -100, max: 100 },
      { label: 'Y (px)', key: 'y', type: 'number', min: -100, max: 100 },
      { label: 'Blur (px)', key: 'blur', type: 'number', min: 0, max: 200 },
      { label: 'Spread (px)', key: 'spread', type: 'number', min: -100, max: 100 },
      { label: 'カラー', key: 'color', type: 'color' },
      { label: 'Inset', key: 'inset', type: 'select' }
    ];

    fields.forEach(field => {
      const wrapper = document.createElement('div');
      wrapper.className = 'shadow-field';

      const lbl = document.createElement('label');
      lbl.textContent = field.label;

      let input;

      if (field.type === 'number') {
        input = document.createElement('input');
        input.type = 'number';
        input.min = field.min;
        input.max = field.max;
        input.value = sh[field.key];
        input.setAttribute('aria-label', `${field.label}`);
        input.addEventListener('input', () => {
          state.shadows[i][field.key] = parseInt(input.value, 10) || 0;
          render();
        });
      } else if (field.type === 'color') {
        input = document.createElement('input');
        input.type = 'color';
        // 8桁HEX対応: color inputは6桁のみのため、alphaは別途管理
        input.value = normalizeHex6(sh.color);
        input.setAttribute('aria-label', `${field.label}`);
        input.addEventListener('input', () => {
          // アルファを保持しながら色変更
          const alpha = extractAlpha(state.shadows[i].color);
          state.shadows[i].color = applyAlpha(input.value, alpha);
          render();
        });
      } else if (field.type === 'select') {
        input = document.createElement('select');
        input.setAttribute('aria-label', `Inset`);
        const optNo = document.createElement('option');
        optNo.value = 'false';
        optNo.textContent = 'なし';
        const optYes = document.createElement('option');
        optYes.value = 'true';
        optYes.textContent = 'あり';
        input.appendChild(optNo);
        input.appendChild(optYes);
        input.value = sh.inset ? 'true' : 'false';
        input.addEventListener('change', () => {
          state.shadows[i].inset = input.value === 'true';
          render();
        });
      }

      wrapper.appendChild(lbl);
      wrapper.appendChild(input);
      grid.appendChild(wrapper);
    });

    card.appendChild(grid);
    elShadowList.appendChild(card);
  });
}

/* ============================================================
   背景色プレビュー更新
   ============================================================ */

function updateBgPreview() {
  elPreviewBg.style.background = state.bgColor;
  updateBgSwatchActive();
}

function updateBgSwatchActive() {
  elBgSwatches.forEach(sw => {
    sw.classList.toggle('active', sw.dataset.color === state.bgColor);
  });
}

/* ============================================================
   CSS生成
   ============================================================ */

function buildGradientCSS() {
  const stops = state.colorStops
    .slice()
    .sort((a, b) => a.pct - b.pct)
    .map(s => `${s.color} ${s.pct}%`)
    .join(', ');

  switch (state.gradType) {
    case 'radial':
      return `radial-gradient(ellipse at center, ${stops})`;
    case 'conic':
      return `conic-gradient(from 0deg at 50% 50%, ${stops})`;
    default:
      return `linear-gradient(${state.gradAngle}deg, ${stops})`;
  }
}

function buildShadowCSS() {
  if (state.shadows.length === 0) return 'none';
  return state.shadows.map(sh => {
    const inset = sh.inset ? 'inset ' : '';
    return `${inset}${sh.x}px ${sh.y}px ${sh.blur}px ${sh.spread}px ${sh.color}`;
  }).join(',\n  ');
}

function buildFullCSS() {
  const grad = buildGradientCSS();
  const shadow = buildShadowCSS();
  return `.card {\n  background: ${grad};\n  box-shadow: ${shadow};\n}`;
}

/* ============================================================
   Tailwind CSS生成
   ============================================================ */

const TW_GRADIENT_MAP = {
  'linear_0':   'bg-gradient-to-t',
  'linear_90':  'bg-gradient-to-r',
  'linear_180': 'bg-gradient-to-b',
  'linear_270': 'bg-gradient-to-l',
  'linear_45':  'bg-gradient-to-tr',
  'linear_135': 'bg-gradient-to-br',
  'linear_225': 'bg-gradient-to-bl',
  'linear_315': 'bg-gradient-to-tl'
};

const TW_SHADOW_MAP = [
  { key: 'shadow-sm',  x: 0, y: 1, blur: 2,  spread: 0 },
  { key: 'shadow',     x: 0, y: 1, blur: 3,  spread: 0 },
  { key: 'shadow-md',  x: 0, y: 4, blur: 6,  spread: -1 },
  { key: 'shadow-lg',  x: 0, y: 10, blur: 15, spread: -3 },
  { key: 'shadow-xl',  x: 0, y: 20, blur: 25, spread: -5 },
  { key: 'shadow-2xl', x: 0, y: 25, blur: 50, spread: -12 }
];

function buildTailwindCSS() {
  const classes = [];

  // グラデーション
  const gradCSS = buildGradientCSS();
  const mapKey = `linear_${state.gradAngle}`;
  if (state.gradType === 'linear' && TW_GRADIENT_MAP[mapKey] && state.colorStops.length === 2) {
    classes.push(TW_GRADIENT_MAP[mapKey]);
    classes.push(`from-[${state.colorStops[0].color}]`);
    classes.push(`to-[${state.colorStops[1].color}]`);
  } else {
    classes.push(`bg-[${gradCSS.replace(/\s+/g, '_')}]`);
  }

  // シャドウ
  if (state.shadows.length === 1 && !state.shadows[0].inset) {
    const sh = state.shadows[0];
    const matched = TW_SHADOW_MAP.find(t =>
      t.x === sh.x && t.y === sh.y && t.blur === sh.blur && t.spread === sh.spread
    );
    if (matched) {
      classes.push(matched.key);
    } else {
      const val = `${sh.x}px_${sh.y}px_${sh.blur}px_${sh.spread}px_${sh.color}`;
      classes.push(`shadow-[${val}]`);
    }
  } else if (state.shadows.length > 0) {
    const val = state.shadows.map(sh => {
      const inset = sh.inset ? 'inset_' : '';
      return `${inset}${sh.x}px_${sh.y}px_${sh.blur}px_${sh.spread}px_${sh.color}`;
    }).join(',');
    classes.push(`shadow-[${val}]`);
  }

  return classes.join(' ');
}

/* ============================================================
   レンダリング（メイン）
   ============================================================ */

function render() {
  const gradCSS   = buildGradientCSS();
  const shadowCSS = buildShadowCSS();
  const fullCSS   = buildFullCSS();
  const twCSS     = buildTailwindCSS();

  // プレビュー更新
  elPreviewCard.style.background  = gradCSS;
  elPreviewCard.style.boxShadow   = shadowCSS;
  elPreviewBg.style.background    = state.bgColor;

  // コード出力
  elCssOutput.textContent = fullCSS;
  elTwOutput.textContent  = twCSS;

  saveState();
}

/* ============================================================
   コピー機能
   ============================================================ */

function copyText(text, btn) {
  if (!text.trim()) return;
  navigator.clipboard.writeText(text).then(() => {
    const original = btn.textContent;
    btn.textContent = 'コピー完了!';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.textContent = original;
      btn.classList.remove('copied');
    }, 1800);
  }).catch(() => {
    // フォールバック
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  });
}

/* ============================================================
   ユーティリティ
   ============================================================ */

// 8桁HEX → 6桁HEX（color input用）
function normalizeHex6(hex) {
  if (!hex || !hex.startsWith('#')) return '#000000';
  if (hex.length === 9) return hex.slice(0, 7); // #RRGGBBAA → #RRGGBB
  if (hex.length === 5) return '#' + hex.slice(1, 4).split('').map(c => c + c).join(''); // #RGBA
  if (hex.length === 4) return '#' + hex.slice(1).split('').map(c => c + c).join(''); // #RGB
  return hex.slice(0, 7);
}

// HEXカラーからアルファ値を取得 (0-1)
function extractAlpha(hex) {
  if (!hex || hex.length < 8) return 1;
  const a = parseInt(hex.slice(7, 9), 16);
  return isNaN(a) ? 1 : +(a / 255).toFixed(2);
}

// 6桁HEXにアルファを付与
function applyAlpha(hex6, alpha) {
  if (alpha >= 1) return hex6;
  const a = Math.round(alpha * 255).toString(16).padStart(2, '0');
  return hex6 + a;
}
