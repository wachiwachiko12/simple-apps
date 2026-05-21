'use strict';

// ===== WCAG 2.1 計算ロジック =====

/**
 * HEX値を { r, g, b } に変換
 * @param {string} hex - "#rrggbb" 形式
 * @returns {{ r: number, g: number, b: number } | null}
 */
function hexToRgb(hex) {
  const cleaned = hex.replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(cleaned)) return null;
  return {
    r: parseInt(cleaned.slice(0, 2), 16),
    g: parseInt(cleaned.slice(2, 4), 16),
    b: parseInt(cleaned.slice(4, 6), 16),
  };
}

/**
 * 相対輝度（WCAG 2.1 仕様）
 * @param {string} hex
 * @returns {number | null}
 */
function getLuminance(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * コントラスト比（WCAG 2.1 仕様）
 * @param {string} hex1
 * @param {string} hex2
 * @returns {number | null}
 */
function getContrastRatio(hex1, hex2) {
  const l1 = getLuminance(hex1);
  const l2 = getLuminance(hex2);
  if (l1 === null || l2 === null) return null;
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// ===== プリセット =====

const PRESETS = [
  { name: '黒地に白',      fg: '#ffffff', bg: '#000000' },
  { name: '白地に黒',      fg: '#000000', bg: '#ffffff' },
  { name: '白地に紺',      fg: '#1a2a4a', bg: '#ffffff' },
  { name: '白地にダーク',  fg: '#111827', bg: '#f9fafb' },
  { name: '紺地に白',      fg: '#ffffff', bg: '#1e3a5f' },
  { name: '黄地に黒',      fg: '#000000', bg: '#fde047' },
  { name: '赤地に白',      fg: '#ffffff', bg: '#dc2626' },
  { name: '緑地に白',      fg: '#ffffff', bg: '#16a34a' },
  { name: '灰地に黒',      fg: '#111827', bg: '#e5e7eb' },
  { name: 'グレー配色',    fg: '#374151', bg: '#f3f4f6' },
];

// ===== DOM取得 =====

const fgPicker = document.getElementById('fg-picker');
const fgHex    = document.getElementById('fg-hex');
const bgPicker = document.getElementById('bg-picker');
const bgHex    = document.getElementById('bg-hex');
const swapBtn  = document.getElementById('swap-btn');

const previewArea   = document.getElementById('preview-area');
const previewNormal = document.getElementById('preview-normal');
const previewLarge  = document.getElementById('preview-large');
const previewBold   = document.getElementById('preview-bold');

const ratioNumber = document.getElementById('ratio-number');
const resultsGrid = document.getElementById('results-grid');
const swatchesGrid = document.getElementById('swatches-grid');

// ===== ユーティリティ =====

/**
 * 入力値を正規化して有効な "#rrggbb" HEXを返す
 * @param {string} val
 * @returns {string | null}
 */
function normalizeHex(val) {
  const v = val.trim();
  // 先頭 # なしの場合も許容
  const withHash = v.startsWith('#') ? v : '#' + v;
  // 3桁HEX を 6桁に展開
  if (/^#[0-9a-fA-F]{3}$/.test(withHash)) {
    const [, a, b, c] = withHash;
    return `#${a}${a}${b}${b}${c}${c}`.toLowerCase();
  }
  if (/^#[0-9a-fA-F]{6}$/.test(withHash)) {
    return withHash.toLowerCase();
  }
  return null;
}

/**
 * コントラスト比を "XX.XX:1" 形式でフォーマット
 */
function formatRatio(ratio) {
  if (ratio === null) return '—';
  return ratio.toFixed(2) + ':1';
}

// ===== 更新処理 =====

/**
 * 判定バッジを更新
 * @param {string} badgeId
 * @param {number | null} ratio
 * @param {number} threshold
 */
function updateBadge(badgeId, ratio, threshold) {
  const badge = document.getElementById(badgeId);
  if (!badge) return;
  if (ratio === null) {
    badge.textContent = '—';
    badge.className = 'criteria-badge';
    return;
  }
  const pass = ratio >= threshold;
  badge.textContent = pass ? '✅ 合格' : '❌ 不合格';
  badge.className = 'criteria-badge ' + (pass ? 'pass' : 'fail');
}

/**
 * メインの更新関数 — 色が変わるたびに呼ぶ
 */
function update() {
  const fgVal = normalizeHex(fgHex.value);
  const bgVal = normalizeHex(bgHex.value);

  // HEX入力エラー表示
  fgHex.classList.toggle('input-error', fgVal === null);
  bgHex.classList.toggle('input-error', bgVal === null);

  if (fgVal === null || bgVal === null) {
    ratioNumber.textContent = '—';
    ['badge-normal-aa', 'badge-normal-aaa', 'badge-large-aa', 'badge-large-aaa', 'badge-ui-aa'].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.textContent = '—'; el.className = 'criteria-badge'; }
    });
    return;
  }

  // プレビュー更新
  [previewNormal, previewLarge, previewBold].forEach(el => {
    el.style.color = fgVal;
  });
  previewArea.style.backgroundColor = bgVal;

  // カラーピッカー同期
  fgPicker.value = fgVal;
  bgPicker.value = bgVal;

  // コントラスト比計算
  const ratio = getContrastRatio(fgVal, bgVal);
  ratioNumber.textContent = formatRatio(ratio);

  // 判定更新
  // 通常テキスト
  updateBadge('badge-normal-aa',  ratio, 4.5);
  updateBadge('badge-normal-aaa', ratio, 7);
  // 大きいテキスト
  updateBadge('badge-large-aa',   ratio, 3);
  updateBadge('badge-large-aaa',  ratio, 4.5);
  // UIコンポーネント
  updateBadge('badge-ui-aa',      ratio, 3);
}

// ===== カラーピッカーとHEX入力の連動 =====

fgPicker.addEventListener('input', () => {
  fgHex.value = fgPicker.value.toLowerCase();
  update();
});

bgPicker.addEventListener('input', () => {
  bgHex.value = bgPicker.value.toLowerCase();
  update();
});

fgHex.addEventListener('input', () => {
  const hex = normalizeHex(fgHex.value);
  if (hex) fgPicker.value = hex;
  update();
});

bgHex.addEventListener('input', () => {
  const hex = normalizeHex(bgHex.value);
  if (hex) bgPicker.value = hex;
  update();
});

// HEX入力欄でフォーカスを外れたとき、#なし入力を補完
fgHex.addEventListener('blur', () => {
  const hex = normalizeHex(fgHex.value);
  if (hex) fgHex.value = hex;
});

bgHex.addEventListener('blur', () => {
  const hex = normalizeHex(bgHex.value);
  if (hex) bgHex.value = hex;
});

// ===== 入れ替えボタン =====

swapBtn.addEventListener('click', () => {
  const tmpHex = fgHex.value;
  fgHex.value = bgHex.value;
  bgHex.value = tmpHex;

  const tmpPicker = fgPicker.value;
  fgPicker.value = bgPicker.value;
  bgPicker.value = tmpPicker;

  update();
});

// ===== カラースワッチ生成 =====

function buildSwatches() {
  swatchesGrid.innerHTML = '';

  PRESETS.forEach((preset) => {
    const ratio = getContrastRatio(preset.fg, preset.bg);

    const item = document.createElement('button');
    item.className = 'swatch-item';
    item.setAttribute('role', 'listitem');
    item.setAttribute('aria-label', `${preset.name}（コントラスト比 ${formatRatio(ratio)}）を適用`);
    item.type = 'button';

    // プレビュー
    const preview = document.createElement('div');
    preview.className = 'swatch-preview';
    preview.setAttribute('aria-hidden', 'true');

    const fgBlock = document.createElement('div');
    fgBlock.className = 'swatch-fg';
    fgBlock.style.backgroundColor = preset.fg;

    const bgBlock = document.createElement('div');
    bgBlock.className = 'swatch-bg';
    bgBlock.style.backgroundColor = preset.bg;

    preview.appendChild(fgBlock);
    preview.appendChild(bgBlock);

    // テキスト情報
    const info = document.createElement('div');
    info.className = 'swatch-info';

    const name = document.createElement('div');
    name.className = 'swatch-name';
    name.textContent = preset.name;

    const ratioEl = document.createElement('div');
    ratioEl.className = 'swatch-ratio';
    ratioEl.textContent = formatRatio(ratio);

    info.appendChild(name);
    info.appendChild(ratioEl);

    item.appendChild(preview);
    item.appendChild(info);

    // クリックで適用
    item.addEventListener('click', () => {
      fgHex.value = preset.fg;
      bgHex.value = preset.bg;
      fgPicker.value = preset.fg;
      bgPicker.value = preset.bg;
      update();
    });

    swatchesGrid.appendChild(item);
  });
}

// ===== 初期化 =====

buildSwatches();
update();
