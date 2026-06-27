/* ============================================================
   カラーコード変換ツール — script.js
   機能: HEX/RGB/HSL 相互変換、WCAGコントラスト比、補色パレット、CSS変数出力
   ============================================================ */

'use strict';

// ============================================================
// DOM References
// ============================================================
const colorPicker   = document.getElementById('colorPicker');
const pickerLabel   = document.querySelector('.picker-label');
const colorPreview  = document.getElementById('colorPreview');
const hexInput      = document.getElementById('hexInput');
const rInput        = document.getElementById('rInput');
const gInput        = document.getElementById('gInput');
const bInput        = document.getElementById('bInput');
const hInput        = document.getElementById('hInput');
const sInput        = document.getElementById('sInput');
const lInput        = document.getElementById('lInput');
const copyRgbBtn    = document.getElementById('copyRgb');
const copyHslBtn    = document.getElementById('copyHsl');

const fgPicker      = document.getElementById('fgPicker');
const fgHex         = document.getElementById('fgHex');
const bgPicker      = document.getElementById('bgPicker');
const bgHex         = document.getElementById('bgHex');
const contrastPreview = document.getElementById('contrastPreview');
const previewText   = document.getElementById('previewText');
const ratioValue    = document.getElementById('ratioValue');
const wcagBadges    = document.getElementById('wcagBadges');

const paletteGrid   = document.getElementById('paletteGrid');
const cssOutput     = document.getElementById('cssOutput');
const copyCssBtn    = document.getElementById('copyCssBtn');

// ============================================================
// Color Conversion Utilities
// ============================================================

/**
 * HEX (#rrggbb) → { r, g, b }
 */
function hexToRgb(hex) {
  const clean = hex.replace('#', '').trim();
  if (clean.length !== 6) return null;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
  return { r, g, b };
}

/**
 * { r, g, b } → HEX string (lowercase, with #)
 */
function rgbToHex(r, g, b) {
  const toHex = n => Math.round(clamp(n, 0, 255)).toString(16).padStart(2, '0');
  return '#' + toHex(r) + toHex(g) + toHex(b);
}

/**
 * { r, g, b } → { h, s, l }  (h: 0-360, s: 0-100, l: 0-100)
 */
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s;
  const l = (max + min) / 2;
  const d = max - min;

  if (d === 0) {
    h = 0; s = 0;
  } else {
    s = d / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

/**
 * { h, s, l } → { r, g, b }  (h: 0-360, s: 0-100, l: 0-100)
 */
function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360;
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = n => {
    const k = (n + h / 30) % 12;
    return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
  };
  return {
    r: Math.round(f(0) * 255),
    g: Math.round(f(8) * 255),
    b: Math.round(f(4) * 255),
  };
}

function clamp(v, min, max) {
  return Math.min(Math.max(v, min), max);
}

// ============================================================
// State
// ============================================================
let currentRgb = { r: 124, g: 58, b: 237 };  // #7c3aed

function getCurrentHex() {
  return rgbToHex(currentRgb.r, currentRgb.g, currentRgb.b);
}

// ============================================================
// Update UI from currentRgb
// ============================================================
function updateAllFromRgb() {
  const { r, g, b } = currentRgb;
  const hex = rgbToHex(r, g, b);
  const hsl = rgbToHsl(r, g, b);

  // Preview box
  colorPreview.style.background = hex;
  colorPicker.value = hex;

  // Inputs
  hexInput.value = hex;
  rInput.value = r;
  gInput.value = g;
  bInput.value = b;
  hInput.value = hsl.h;
  sInput.value = hsl.s;
  lInput.value = hsl.l;

  // Sections
  updatePalette(hsl.h, hsl.s, hsl.l);
  updateCssOutput(hex, r, g, b, hsl.h, hsl.s, hsl.l);
}

// ============================================================
// Input Handlers
// ============================================================

// Color picker
colorPicker.addEventListener('input', () => {
  const rgb = hexToRgb(colorPicker.value);
  if (rgb) { currentRgb = rgb; updateAllFromRgb(); }
});

// Make the label trigger the hidden color input
pickerLabel.addEventListener('click', () => {
  colorPicker.click();
});

// HEX input
hexInput.addEventListener('input', () => {
  const val = hexInput.value.trim();
  const hex = val.startsWith('#') ? val : '#' + val;
  if (hex.length === 7) {
    const rgb = hexToRgb(hex);
    if (rgb) { currentRgb = rgb; updateAllFromRgb(); }
  }
});

// RGB inputs
[rInput, gInput, bInput].forEach(input => {
  input.addEventListener('input', () => {
    const r = clamp(parseInt(rInput.value) || 0, 0, 255);
    const g = clamp(parseInt(gInput.value) || 0, 0, 255);
    const b = clamp(parseInt(bInput.value) || 0, 0, 255);
    currentRgb = { r, g, b };
    updateAllFromRgb();
  });
});

// HSL inputs
[hInput, sInput, lInput].forEach(input => {
  input.addEventListener('input', () => {
    const h = clamp(parseInt(hInput.value) || 0, 0, 360);
    const s = clamp(parseInt(sInput.value) || 0, 0, 100);
    const l = clamp(parseInt(lInput.value) || 0, 0, 100);
    const rgb = hslToRgb(h, s, l);
    currentRgb = { r: rgb.r, g: rgb.g, b: rgb.b };
    // Update without re-triggering HSL to avoid rounding drift
    const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
    colorPreview.style.background = hex;
    colorPicker.value = hex;
    hexInput.value = hex;
    rInput.value = rgb.r;
    gInput.value = rgb.g;
    bInput.value = rgb.b;
    updatePalette(h, s, l);
    updateCssOutput(hex, rgb.r, rgb.g, rgb.b, h, s, l);
  });
});

// Copy buttons for HEX
document.querySelector('.copy-btn[data-target="hexInput"]').addEventListener('click', function () {
  copyToClipboard(hexInput.value, this);
});

// Copy RGB
copyRgbBtn.addEventListener('click', function () {
  const val = `rgb(${rInput.value}, ${gInput.value}, ${bInput.value})`;
  copyToClipboard(val, this);
});

// Copy HSL
copyHslBtn.addEventListener('click', function () {
  const val = `hsl(${hInput.value}, ${sInput.value}%, ${lInput.value}%)`;
  copyToClipboard(val, this);
});

// ============================================================
// WCAG Contrast Checker
// ============================================================

/**
 * Relative luminance per WCAG 2.1
 */
function relativeLuminance(r, g, b) {
  const srgb = [r, g, b].map(c => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
}

function contrastRatio(rgb1, rgb2) {
  const l1 = relativeLuminance(rgb1.r, rgb1.g, rgb1.b);
  const l2 = relativeLuminance(rgb2.r, rgb2.g, rgb2.b);
  const lighter = Math.max(l1, l2);
  const darker  = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function updateContrast() {
  const fg = hexToRgb(fgHex.value) || { r: 255, g: 255, b: 255 };
  const bg = hexToRgb(bgHex.value) || { r: 124, g: 58, b: 237 };
  const ratio = contrastRatio(fg, bg);

  ratioValue.textContent = ratio.toFixed(2);

  // Preview
  contrastPreview.style.background = bgHex.value;
  previewText.style.color = fgHex.value;

  // WCAG badges
  const checks = [
    { label: 'AA 通常テキスト', threshold: 4.5 },
    { label: 'AA 大テキスト',   threshold: 3.0 },
    { label: 'AAA 通常テキスト',threshold: 7.0 },
  ];

  wcagBadges.innerHTML = checks.map(({ label, threshold }) => {
    const pass = ratio >= threshold;
    const icon = pass ? 'bi-check-circle-fill' : 'bi-x-circle-fill';
    const cls  = pass ? 'pass' : 'fail';
    const word = pass ? '合格' : '不合格';
    return `<span class="wcag-badge ${cls}"><i class="bi ${icon}"></i> ${label} — ${word} (${threshold}:1)</span>`;
  }).join('');
}

// Contrast input events
fgPicker.addEventListener('input', () => {
  fgHex.value = fgPicker.value;
  updateContrast();
});
bgPicker.addEventListener('input', () => {
  bgHex.value = bgPicker.value;
  updateContrast();
});
fgHex.addEventListener('input', () => {
  const hex = fgHex.value.startsWith('#') ? fgHex.value : '#' + fgHex.value;
  if (hex.length === 7 && hexToRgb(hex)) {
    fgPicker.value = hex;
    updateContrast();
  }
});
bgHex.addEventListener('input', () => {
  const hex = bgHex.value.startsWith('#') ? bgHex.value : '#' + bgHex.value;
  if (hex.length === 7 && hexToRgb(hex)) {
    bgPicker.value = hex;
    updateContrast();
  }
});

// ============================================================
// Palette Generator
// ============================================================
function updatePalette(h, s, l) {
  // Clamp lightness for comfortable viewing
  const sl = clamp(s, 30, 90);
  const ll = clamp(l < 20 ? 40 : l > 85 ? 55 : l, 30, 70);

  const harmonies = [
    { label: '選択色',    h: h,             s: sl, l: ll },
    { label: '補色',      h: (h + 180) % 360, s: sl, l: ll },
    { label: '類似色 +30', h: (h + 30)  % 360, s: sl, l: ll },
    { label: '類似色 −30', h: (h - 30 + 360) % 360, s: sl, l: ll },
    { label: 'トライアド+', h: (h + 120) % 360, s: sl, l: ll },
    { label: 'トライアド−', h: (h - 120 + 360) % 360, s: sl, l: ll },
  ];

  paletteGrid.innerHTML = harmonies.map(({ label, h: ph, s: ps, l: pl }) => {
    const rgb = hslToRgb(ph, ps, pl);
    const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
    return `
      <div class="palette-swatch" data-hex="${hex}" role="button" tabindex="0" aria-label="${label}: ${hex}">
        <div class="swatch-color" style="background:${hex};"></div>
        <div class="swatch-info">
          <span class="swatch-label">${label}</span>
          <span class="swatch-hex">${hex.toUpperCase()}</span>
          <span class="swatch-copied">コピー完了!</span>
        </div>
      </div>`;
  }).join('');

  // Click / keyboard to copy
  paletteGrid.querySelectorAll('.palette-swatch').forEach(swatch => {
    const onActivate = () => {
      const hex = swatch.dataset.hex;
      navigator.clipboard.writeText(hex.toUpperCase()).then(() => {
        const copied = swatch.querySelector('.swatch-copied');
        const hexEl  = swatch.querySelector('.swatch-hex');
        hexEl.style.display = 'none';
        copied.style.display = 'block';
        setTimeout(() => {
          hexEl.style.display = '';
          copied.style.display = 'none';
        }, 2000);
      }).catch(() => {});
    };
    swatch.addEventListener('click', onActivate);
    swatch.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onActivate(); } });
  });
}

// ============================================================
// CSS Variable Output
// ============================================================
function updateCssOutput(hex, r, g, b, h, s, l) {
  const upper = hex.toUpperCase();
  cssOutput.textContent =
`:root {\n  --color-primary: ${upper};\n  --color-primary-rgb: rgb(${r}, ${g}, ${b});\n  --color-primary-hsl: hsl(${h}, ${s}%, ${l}%);\n}`;
}

copyCssBtn.addEventListener('click', function () {
  copyToClipboard(cssOutput.textContent, this);
});

// ============================================================
// Copy Utility
// ============================================================
function copyToClipboard(text, btn) {
  navigator.clipboard.writeText(text).then(() => {
    const original = btn.innerHTML;
    btn.innerHTML = '<i class="bi bi-check-lg"></i> コピー完了';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.innerHTML = original;
      btn.classList.remove('copied');
    }, 2000);
  }).catch(() => {
    // Fallback for older browsers
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

// ============================================================
// Initialize AdSense
// ============================================================
function initAdsense() {
  try {
    (adsbygoogle = window.adsbygoogle || []).push({});
    (adsbygoogle = window.adsbygoogle || []).push({});
  } catch (e) {}
}

// ============================================================
// Boot
// ============================================================
function init() {
  updateAllFromRgb();
  updateContrast();
  initAdsense();
}

init();
