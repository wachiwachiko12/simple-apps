'use strict';

/* =============================================
   SVG Icon Colorizer — script.js
   ============================================= */

// ===== サンプルSVGデータ =====
const SAMPLES = [
  {
    label: 'ハート',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#e74c3c" stroke="none"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`
  },
  {
    label: '星',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#f1c40f" stroke="#e67e22" stroke-width="0.5"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>`
  },
  {
    label: 'チェック',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#27ae60" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" fill="#eafaf1" stroke="#27ae60"/><polyline points="9 12 11 14 15 10"/></svg>`
  },
  {
    label: '家',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#3498db" stroke="none"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>`
  },
  {
    label: '設定',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#7f8c8d" stroke="none"><path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/></svg>`
  }
];

// ===== 状態 =====
let parsedSvgEl = null;      // DOMに挿入したSVGElement
let colorMap = new Map();    // originalHex -> newHex
let originalSvgString = '';  // 元のSVGコード文字列

// ===== DOM参照 =====
const svgInput       = document.getElementById('svg-input');
const svgFileInput   = document.getElementById('svg-file-input');
const fileLabelText  = document.getElementById('file-label-text');
const parseBtn       = document.getElementById('parse-btn');
const parseError     = document.getElementById('parse-error');
const colorEditor    = document.getElementById('color-editor');
const colorList      = document.getElementById('color-list');
const previewSection = document.getElementById('preview-section');
const previewArea    = document.getElementById('preview-area');
const downloadBtn    = document.getElementById('download-btn');
const outWidth       = document.getElementById('out-width');
const outHeight      = document.getElementById('out-height');
const tabPaste       = document.getElementById('tab-paste');
const tabUpload      = document.getElementById('tab-upload');
const panePaste      = document.getElementById('pane-paste');
const paneUpload     = document.getElementById('pane-upload');
const sampleGrid     = document.getElementById('sample-grid');
const fileLabel      = document.querySelector('.file-label');

// ===== 初期化 =====
document.addEventListener('DOMContentLoaded', () => {
  buildSamples();
  bindTabs();
  bindFileInput();
  bindDragDrop();
  parseBtn.addEventListener('click', handleParse);
  downloadBtn.addEventListener('click', handleDownload);
  outWidth.addEventListener('input', updatePreview);
  outHeight.addEventListener('input', updatePreview);
});

// ===== サンプルボタンを生成 =====
function buildSamples() {
  SAMPLES.forEach((item, idx) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'sample-btn';
    btn.setAttribute('aria-label', `サンプル: ${item.label}`);
    btn.innerHTML = item.svg + `<span>${item.label}</span>`;
    btn.addEventListener('click', () => {
      svgInput.value = item.svg;
      switchTab('paste');
      handleParse();
    });
    sampleGrid.appendChild(btn);
  });
}

// ===== タブ切り替え =====
function bindTabs() {
  tabPaste.addEventListener('click', () => switchTab('paste'));
  tabUpload.addEventListener('click', () => switchTab('upload'));
}

function switchTab(which) {
  if (which === 'paste') {
    tabPaste.classList.add('active');
    tabUpload.classList.remove('active');
    panePaste.classList.add('active');
    paneUpload.classList.remove('active');
  } else {
    tabUpload.classList.add('active');
    tabPaste.classList.remove('active');
    paneUpload.classList.add('active');
    panePaste.classList.remove('active');
  }
}

// ===== ファイル入力 =====
function bindFileInput() {
  svgFileInput.addEventListener('change', () => {
    const file = svgFileInput.files[0];
    if (file) loadFile(file);
  });
}

function loadFile(file) {
  if (!file.name.toLowerCase().endsWith('.svg') && file.type !== 'image/svg+xml') {
    showError('SVGファイルを選択してください（.svg）');
    return;
  }
  fileLabelText.textContent = file.name;
  const reader = new FileReader();
  reader.onload = (e) => {
    svgInput.value = e.target.result;
    switchTab('upload');
  };
  reader.readAsText(file, 'utf-8');
}

// ===== ドラッグ&ドロップ =====
function bindDragDrop() {
  fileLabel.addEventListener('dragover', (e) => {
    e.preventDefault();
    fileLabel.classList.add('drag-over');
  });
  fileLabel.addEventListener('dragleave', () => {
    fileLabel.classList.remove('drag-over');
  });
  fileLabel.addEventListener('drop', (e) => {
    e.preventDefault();
    fileLabel.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) loadFile(file);
  });
}

// ===== SVGパース & 色検出 =====
function handleParse() {
  clearError();
  const raw = svgInput.value.trim();
  if (!raw) {
    showError('SVGコードを入力するか、ファイルをアップロードしてください。');
    return;
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(raw, 'image/svg+xml');
  const errNode = doc.querySelector('parsererror');
  if (errNode) {
    showError('SVGのパースに失敗しました。正しいSVGコードか確認してください。');
    return;
  }

  const svgEl = doc.documentElement;
  if (svgEl.tagName.toLowerCase() !== 'svg') {
    showError('SVG要素が見つかりません。');
    return;
  }

  originalSvgString = raw;
  parsedSvgEl = svgEl;
  colorMap = new Map();

  const colors = extractColors(svgEl);
  if (colors.size === 0) {
    showError('色（fill/stroke）が検出されませんでした。SVGにfill・stroke属性が含まれているか確認してください。');
    return;
  }

  colors.forEach((info, hex) => {
    colorMap.set(hex, hex); // 初期値は同じ色
  });

  renderColorList(colors);
  colorEditor.classList.remove('hidden');
  previewSection.classList.remove('hidden');
  updatePreview();

  // スクロール
  colorEditor.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ===== 色抽出 =====
function extractColors(svgEl) {
  const colorInfo = new Map(); // normalizedHex -> { original, usageCount, attributes: Set }

  const allEls = [svgEl, ...svgEl.querySelectorAll('*')];

  allEls.forEach((el) => {
    ['fill', 'stroke'].forEach((attr) => {
      const val = el.getAttribute(attr);
      if (!val) return;

      const normalized = normalizeColor(val);
      if (!normalized) return;

      if (!colorInfo.has(normalized)) {
        colorInfo.set(normalized, { original: val, count: 0, attrs: new Set() });
      }
      const entry = colorInfo.get(normalized);
      entry.count += 1;
      entry.attrs.add(attr);
    });
  });

  // style属性のインラインCSS も対応
  allEls.forEach((el) => {
    const styleAttr = el.getAttribute('style');
    if (!styleAttr) return;
    const fillMatch = styleAttr.match(/fill\s*:\s*([^;]+)/);
    const strokeMatch = styleAttr.match(/stroke\s*:\s*([^;]+)/);
    [fillMatch, strokeMatch].forEach((m, i) => {
      if (!m) return;
      const attr = i === 0 ? 'fill' : 'stroke';
      const val = m[1].trim();
      const normalized = normalizeColor(val);
      if (!normalized) return;
      if (!colorInfo.has(normalized)) {
        colorInfo.set(normalized, { original: val, count: 0, attrs: new Set() });
      }
      const entry = colorInfo.get(normalized);
      entry.count += 1;
      entry.attrs.add(attr + '(style)');
    });
  });

  return colorInfo;
}

// ===== 色の正規化（#rrggbb形式に変換）=====
function normalizeColor(val) {
  if (!val) return null;
  const v = val.trim().toLowerCase();

  // none / transparent / inherit / currentColor は除外
  if (['none', 'transparent', 'inherit', 'currentcolor'].includes(v)) return null;
  if (v.startsWith('url(')) return null;

  // #rrggbb
  if (/^#[0-9a-f]{6}$/.test(v)) return v;

  // #rgb -> #rrggbb
  if (/^#[0-9a-f]{3}$/.test(v)) {
    return '#' + v[1] + v[1] + v[2] + v[2] + v[3] + v[3];
  }

  // #rrggbbaa -> #rrggbb（アルファは無視）
  if (/^#[0-9a-f]{8}$/.test(v)) return v.slice(0, 7);

  // rgb(r, g, b) or rgba(r, g, b, a)
  const rgbMatch = v.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgbMatch) {
    return '#' +
      parseInt(rgbMatch[1]).toString(16).padStart(2, '0') +
      parseInt(rgbMatch[2]).toString(16).padStart(2, '0') +
      parseInt(rgbMatch[3]).toString(16).padStart(2, '0');
  }

  // 名前付き色
  const namedColors = {
    black: '#000000', white: '#ffffff', red: '#ff0000', green: '#008000',
    blue: '#0000ff', yellow: '#ffff00', orange: '#ffa500', purple: '#800080',
    pink: '#ffc0cb', gray: '#808080', grey: '#808080', brown: '#a52a2a',
    cyan: '#00ffff', magenta: '#ff00ff', lime: '#00ff00', navy: '#000080',
    teal: '#008080', silver: '#c0c0c0', gold: '#ffd700', coral: '#ff7f50',
    salmon: '#fa8072', violet: '#ee82ee', indigo: '#4b0082', maroon: '#800000',
    olive: '#808000', aqua: '#00ffff', fuchsia: '#ff00ff', beige: '#f5f5dc',
    ivory: '#fffff0', khaki: '#f0e68c', lavender: '#e6e6fa', linen: '#faf0e6',
    mint: '#98ff98', tan: '#d2b48c', turquoise: '#40e0d0', wheat: '#f5deb3',
  };
  if (namedColors[v]) return namedColors[v];

  return null;
}

// ===== カラーリスト描画 =====
function renderColorList(colorInfo) {
  colorList.innerHTML = '';

  colorInfo.forEach((info, hex) => {
    const row = document.createElement('div');
    row.className = 'color-row';

    const swatch = document.createElement('div');
    swatch.className = 'color-swatch-old';
    swatch.style.background = hex;
    swatch.title = '元の色: ' + hex;

    const arrow = document.createElement('span');
    arrow.className = 'color-arrow';
    arrow.textContent = '→';
    arrow.setAttribute('aria-hidden', 'true');

    const pickerWrap = document.createElement('div');
    pickerWrap.className = 'color-picker-wrap';

    const picker = document.createElement('input');
    picker.type = 'color';
    picker.value = hex;
    picker.dataset.originalHex = hex;
    picker.setAttribute('aria-label', `色 ${hex} を変更`);
    picker.addEventListener('input', (e) => {
      colorMap.set(hex, e.target.value);
      updatePreview();
    });

    pickerWrap.appendChild(picker);

    const infoDiv = document.createElement('div');
    infoDiv.className = 'color-info';

    const hexSpan = document.createElement('span');
    hexSpan.className = 'color-hex';
    hexSpan.textContent = hex;

    const usageSpan = document.createElement('span');
    usageSpan.className = 'color-usage';
    const attrList = [...info.attrs].join(', ');
    usageSpan.textContent = `${attrList} × ${info.count}`;

    infoDiv.appendChild(hexSpan);
    infoDiv.appendChild(usageSpan);

    row.appendChild(swatch);
    row.appendChild(arrow);
    row.appendChild(pickerWrap);
    row.appendChild(infoDiv);
    colorList.appendChild(row);
  });
}

// ===== プレビュー更新 =====
function updatePreview() {
  if (!parsedSvgEl) return;

  const modified = buildModifiedSvg();
  const parser = new DOMParser();
  const doc = parser.parseFromString(modified, 'image/svg+xml');
  const svgEl = doc.documentElement;

  previewArea.innerHTML = '';
  previewArea.appendChild(document.adoptNode(svgEl));
}

// ===== 変更後SVGを文字列で組み立て =====
function buildModifiedSvg() {
  let result = originalSvgString;

  // サイズ変更
  const w = outWidth.value.trim();
  const h = outHeight.value.trim();

  // まず元のwidth/height属性を書き換え
  if (w) {
    result = result.replace(/(<svg[^>]*)\bwidth\s*=\s*["'][^"']*["']/, `$1width="${w}"`);
    if (!result.includes('width=')) {
      result = result.replace('<svg', `<svg width="${w}"`);
    }
  }
  if (h) {
    result = result.replace(/(<svg[^>]*)\bheight\s*=\s*["'][^"']*["']/, `$1height="${h}"`);
    if (!result.includes('height=')) {
      result = result.replace('<svg', `<svg height="${h}"`);
    }
  }

  // 色置換（16進数カラー: #rrggbb, #rgb, #rrggbbaa, 名前付き色, rgb()）
  colorMap.forEach((newHex, origHex) => {
    if (newHex === origHex) return; // 変更なし

    // #rrggbb 形式
    result = replaceColorInSvg(result, origHex, newHex);
  });

  return result;
}

// ===== SVG文字列内の色を安全に置換 =====
function replaceColorInSvg(svgStr, fromHex, toHex) {
  // 属性値内の色を置換（fill="#..." stroke="#..." style="fill:#...;stroke:#..."）
  // 大文字小文字を区別しない正規表現で各種形式を置換

  let result = svgStr;

  // 3桁形式（#rgb）の元の色があれば、それも検索対象に
  const short3 = hexToShort3(fromHex);

  // ダブルクォート内の色
  const escapedFrom = escapeRegExp(fromHex);
  result = result.replace(new RegExp(`(["';\\s])${escapedFrom}(["';\\s]|$)`, 'gi'), `$1${toHex}$2`);
  result = result.replace(new RegExp(`(["';\\s])${escapedFrom}(["';\\s]|$)`, 'gi'), `$1${toHex}$2`);

  if (short3 && short3 !== fromHex) {
    const escapedShort = escapeRegExp(short3);
    result = result.replace(new RegExp(`(["';\\s])${escapedShort}(["';\\s]|$)`, 'gi'), `$1${toHex}$2`);
  }

  return result;
}

function hexToShort3(hex) {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return null;
  const r = hex[1]; const R = hex[2];
  const g = hex[3]; const G = hex[4];
  const b = hex[5]; const B = hex[6];
  if (r === R && g === G && b === B) return `#${r}${g}${b}`;
  return null;
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ===== ダウンロード =====
function handleDownload() {
  if (!parsedSvgEl) return;
  const modified = buildModifiedSvg();
  const blob = new Blob([modified], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'icon-colorized.svg';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

// ===== エラー表示 =====
function showError(msg) {
  parseError.textContent = msg;
}

function clearError() {
  parseError.textContent = '';
}
