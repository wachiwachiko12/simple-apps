/* ============================================================
   Brand Style Guide Generator — script.js
   Vanilla JS, no external dependencies
   ============================================================ */

'use strict';

// ============================================================
// Constants
// ============================================================

const STORAGE_KEY = 'keisanlab_brand_style_guide_v1';

const DEFAULTS = {
  brandName: 'Keisanlab',
  brandTagline: '計算を、もっとシンプルに。',
  brandDescription: 'Keisanlabは、日常の計算・ビジネスの数字を素早く解決する無料Webツール群です。',
  colorPrimary: '#2563eb',
  colorSecondary: '#7c3aed',
  colorAccent: '#f59e0b',
  colorBackground: '#f8fafc',
  colorText: '#1e293b',
  fontHeading: 'Noto Sans JP',
  fontBody: 'Noto Sans JP',
  fontScaleBase: 16,
  logoStyle: 'text',
  logoTaglineShow: 'yes',
  usageNote: '最小サイズは幅120px以上。余白はロゴ高さの25%以上を確保すること。',
};

const COLOR_LABELS = {
  colorPrimary: 'Primary',
  colorSecondary: 'Secondary',
  colorAccent: 'Accent',
  colorBackground: 'Background',
  colorText: 'Text',
};

const FONT_SCALE_RATIOS = [
  { label: 'xs', ratio: 0.75 },
  { label: 'sm', ratio: 0.875 },
  { label: 'base', ratio: 1 },
  { label: 'lg', ratio: 1.125 },
  { label: 'xl', ratio: 1.25 },
  { label: '2xl', ratio: 1.5 },
  { label: '3xl', ratio: 1.875 },
  { label: '4xl', ratio: 2.25 },
];

// ============================================================
// State
// ============================================================

let state = Object.assign({}, DEFAULTS);
let googleFontLinkEl = null;
let fontLoadTimeout = null;

// ============================================================
// Utility — Color Conversions
// ============================================================

function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  const bigint = parseInt(clean, 16);
  if (isNaN(bigint)) return null;
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return { r, g, b };
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      default: h = ((r - g) / d + 4) / 6;
    }
  }
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

function formatColorValues(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return { rgb: '—', hsl: '—' };
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  return {
    rgb: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,
    hsl: `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`,
  };
}

function isValidHex(str) {
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(str);
}

// ============================================================
// localStorage
// ============================================================

function saveToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (_) { /* quota exceeded, ignore */ }
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    Object.assign(state, saved);
  } catch (_) { /* corrupted, ignore */ }
}

// ============================================================
// Google Fonts Loader
// ============================================================

function buildGoogleFontsUrl(headingFont, bodyFont) {
  const families = [...new Set([headingFont, bodyFont])]
    .filter(Boolean)
    .map(f => f.trim())
    .filter(f => f.length > 0);
  if (!families.length) return null;
  const params = families
    .map(f => 'family=' + encodeURIComponent(f) + ':wght@400;600;700;800;900')
    .join('&');
  return `https://fonts.googleapis.com/css2?${params}&display=swap`;
}

function loadGoogleFonts(headingFont, bodyFont) {
  clearTimeout(fontLoadTimeout);
  fontLoadTimeout = setTimeout(() => {
    const url = buildGoogleFontsUrl(headingFont, bodyFont);
    if (!url) return;
    if (googleFontLinkEl) {
      googleFontLinkEl.href = url;
    } else {
      googleFontLinkEl = document.createElement('link');
      googleFontLinkEl.rel = 'stylesheet';
      googleFontLinkEl.href = url;
      document.head.appendChild(googleFontLinkEl);
    }
  }, 400);
}

// ============================================================
// Color Input Sync
// ============================================================

const COLOR_KEYS = ['primary', 'secondary', 'accent', 'background', 'text'];

function syncColorDisplayValues(key) {
  const stateKey = 'color' + key.charAt(0).toUpperCase() + key.slice(1);
  const hex = state[stateKey];
  const el = document.getElementById('color-' + key + '-values');
  if (!el) return;
  const vals = formatColorValues(hex);
  el.textContent = vals.rgb + '\n' + vals.hsl;
}

function onColorPickerChange(key) {
  const picker = document.getElementById('color-' + key);
  const hexInput = document.getElementById('color-' + key + '-hex');
  if (!picker || !hexInput) return;

  picker.addEventListener('input', () => {
    const hex = picker.value;
    hexInput.value = hex;
    const stateKey = 'color' + key.charAt(0).toUpperCase() + key.slice(1);
    state[stateKey] = hex;
    syncColorDisplayValues(key);
    renderPreview();
    saveToStorage();
  });

  hexInput.addEventListener('input', () => {
    const raw = hexInput.value.trim();
    const hex = raw.startsWith('#') ? raw : '#' + raw;
    if (isValidHex(hex)) {
      picker.value = hex;
      const stateKey = 'color' + key.charAt(0).toUpperCase() + key.slice(1);
      state[stateKey] = hex;
      syncColorDisplayValues(key);
      renderPreview();
      saveToStorage();
      hexInput.style.borderColor = '';
      hexInput.removeAttribute('aria-invalid');
    } else {
      hexInput.style.borderColor = '#dc2626';
      hexInput.setAttribute('aria-invalid', 'true');
    }
  });
}

// ============================================================
// Form → State Sync
// ============================================================

function bindTextInput(id, stateKey, onChangeExtra) {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('input', () => {
    state[stateKey] = el.value;
    renderPreview();
    saveToStorage();
    if (onChangeExtra) onChangeExtra(el.value);
  });
}

function bindSelectInput(id, stateKey) {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('change', () => {
    state[stateKey] = el.value;
    renderPreview();
    saveToStorage();
  });
}

function bindNumberInput(id, stateKey) {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('input', () => {
    const num = parseFloat(el.value);
    if (!isNaN(num)) {
      state[stateKey] = num;
      renderPreview();
      saveToStorage();
    }
  });
}

// ============================================================
// Populate form from state
// ============================================================

function populateForm() {
  const map = {
    'brand-name': 'brandName',
    'brand-tagline': 'brandTagline',
    'brand-description': 'brandDescription',
    'font-heading': 'fontHeading',
    'font-body': 'fontBody',
    'usage-note': 'usageNote',
  };
  Object.entries(map).forEach(([id, key]) => {
    const el = document.getElementById(id);
    if (el) el.value = state[key] || '';
  });

  const numMap = {
    'font-scale-base': 'fontScaleBase',
  };
  Object.entries(numMap).forEach(([id, key]) => {
    const el = document.getElementById(id);
    if (el) el.value = state[key];
  });

  const selectMap = {
    'logo-style': 'logoStyle',
    'logo-tagline-show': 'logoTaglineShow',
  };
  Object.entries(selectMap).forEach(([id, key]) => {
    const el = document.getElementById(id);
    if (el) el.value = state[key];
  });

  COLOR_KEYS.forEach(key => {
    const stateKey = 'color' + key.charAt(0).toUpperCase() + key.slice(1);
    const picker = document.getElementById('color-' + key);
    const hexInput = document.getElementById('color-' + key + '-hex');
    if (picker) picker.value = state[stateKey];
    if (hexInput) hexInput.value = state[stateKey];
    syncColorDisplayValues(key);
  });
}

// ============================================================
// Logo Builder
// ============================================================

function buildLogoHTML(style, name, tagline, showTagline, primaryColor, bgColor, textColor) {
  const encodedName = escapeHTML(name || 'Brand');
  const encodedTagline = escapeHTML(tagline || '');
  const showTag = showTagline === 'yes' && encodedTagline;

  if (style === 'initial') {
    const initial = (name || 'B').charAt(0).toUpperCase();
    return `
      <div class="sg-logo-initial" style="background:${primaryColor};color:#fff;">
        ${escapeHTML(initial)}
      </div>
      <div>
        <div class="sg-logo-text" style="font-size:1.5rem;color:${textColor};">${encodedName}</div>
        ${showTag ? `<div class="sg-logo-tagline" style="color:${textColor};">${encodedTagline}</div>` : ''}
      </div>
    `;
  }

  if (style === 'badge') {
    return `
      <div class="sg-logo-badge" style="color:${primaryColor};">${encodedName}</div>
      ${showTag ? `<div class="sg-logo-tagline" style="color:${textColor};margin-left:0.5rem;">${encodedTagline}</div>` : ''}
    `;
  }

  // Default: text
  return `
    <div>
      <div class="sg-logo-text" style="color:${primaryColor};">${encodedName}</div>
      ${showTag ? `<div class="sg-logo-tagline" style="color:${textColor};">${encodedTagline}</div>` : ''}
    </div>
  `;
}

// ============================================================
// Color Chips Builder
// ============================================================

function buildColorChips() {
  const chips = [
    { key: 'colorPrimary', label: 'Primary' },
    { key: 'colorSecondary', label: 'Secondary' },
    { key: 'colorAccent', label: 'Accent' },
    { key: 'colorBackground', label: 'Background' },
    { key: 'colorText', label: 'Text' },
  ];

  return chips.map(({ key, label }) => {
    const hex = state[key] || '#cccccc';
    const vals = formatColorValues(hex);
    return `
      <div class="sg-color-chip">
        <div class="sg-color-swatch" style="background:${hex};"></div>
        <div class="sg-color-label">${label}</div>
        <div class="sg-color-hex">${hex.toUpperCase()}</div>
        <div class="sg-color-extra">${vals.rgb}<br>${vals.hsl}</div>
      </div>
    `;
  }).join('');
}

// ============================================================
// Font Scale Builder
// ============================================================

function buildFontScaleTable(baseSize, bodyFont) {
  const header = `
    <table class="sg-scale-table">
      <thead>
        <tr>
          <th>Size</th>
          <th>px</th>
          <th>rem</th>
          <th>Sample</th>
        </tr>
      </thead>
      <tbody>
  `;
  const rows = FONT_SCALE_RATIOS.map(({ label, ratio }) => {
    const px = Math.round(baseSize * ratio);
    const rem = (baseSize * ratio / 16).toFixed(3).replace(/\.?0+$/, '');
    const sampleStyle = `font-family:'${escapeHTML(bodyFont)}',sans-serif;font-size:${px}px;line-height:1.4;`;
    return `
      <tr>
        <td>${label}</td>
        <td>${px}px</td>
        <td>${rem}rem</td>
        <td style="${sampleStyle}">テキストサンプル Aa</td>
      </tr>
    `;
  }).join('');
  return header + rows + '</tbody></table>';
}

// ============================================================
// Preview Renderer
// ============================================================

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderPreview() {
  const preview = document.getElementById('style-guide-preview');
  if (!preview) return;

  const {
    brandName, brandTagline, brandDescription,
    colorPrimary, colorSecondary, colorAccent, colorBackground, colorText,
    fontHeading, fontBody, fontScaleBase,
    logoStyle, logoTaglineShow, usageNote,
  } = state;

  const headingFontStack = `'${escapeHTML(fontHeading)}', -apple-system, sans-serif`;
  const bodyFontStack = `'${escapeHTML(fontBody)}', -apple-system, sans-serif`;
  const basePx = parseFloat(fontScaleBase) || 16;

  const logoHTML = buildLogoHTML(
    logoStyle, brandName, brandTagline, logoTaglineShow,
    colorPrimary, colorBackground, colorText
  );

  const usageRuleText = escapeHTML(usageNote || 'ロゴの使用ルールを入力してください。');

  const html = `
    <div class="sg-doc">

      <!-- Cover -->
      <div class="sg-cover" style="background:${colorPrimary};color:${colorBackground};">
        <div class="sg-logo-wrap" style="font-family:${headingFontStack};">
          ${logoHTML}
        </div>
        <div class="sg-brand-meta">
          <h2 style="color:${colorBackground};">Brand Style Guide</h2>
          <p class="sg-brand-desc" style="font-family:${bodyFontStack};color:${colorBackground};">
            ${escapeHTML(brandDescription || 'ブランドの説明を入力してください。')}
          </p>
        </div>
      </div>

      <!-- Color Palette -->
      <div class="sg-section">
        <div class="sg-section-heading">Color Palette</div>
        <div class="sg-palette">
          ${buildColorChips()}
        </div>
      </div>

      <!-- Typography -->
      <div class="sg-section">
        <div class="sg-section-heading">Typography</div>
        <div class="sg-type-row">

          <div class="sg-type-block">
            <div class="sg-type-meta">Heading Font — ${escapeHTML(fontHeading)}</div>
            <div class="sg-type-sample-heading" style="font-family:${headingFontStack};font-size:${Math.round(basePx * 1.875)}px;font-weight:700;color:${colorText};">
              ${escapeHTML(brandName || 'Brand Name')}
            </div>
            <div class="sg-type-sample-heading" style="font-family:${headingFontStack};font-size:${Math.round(basePx * 1.25)}px;font-weight:600;color:${colorText};">
              見出し2 — Heading Level 2
            </div>
          </div>

          <div class="sg-type-block">
            <div class="sg-type-meta">Body Font — ${escapeHTML(fontBody)}</div>
            <div class="sg-type-sample-body" style="font-family:${bodyFontStack};font-size:${basePx}px;color:${colorText};">
              本文サンプルテキスト。読みやすさを重視したフォントを選択してください。ブランドの印象を伝える重要な要素です。<br>
              The quick brown fox jumps over the lazy dog.
            </div>
          </div>

          <div class="sg-type-block">
            <div class="sg-type-meta">Font Scale (base: ${basePx}px)</div>
            ${buildFontScaleTable(basePx, fontBody)}
          </div>

        </div>
      </div>

      <!-- Logo Usage -->
      <div class="sg-section">
        <div class="sg-section-heading">Logo &amp; Brand Assets</div>

        <div style="display:flex;flex-wrap:wrap;gap:1rem;margin-bottom:1.25rem;">

          <div style="flex:1;min-width:180px;padding:1.25rem;background:${colorBackground};border-radius:8px;border:1px solid #e2e8f0;display:flex;align-items:center;justify-content:center;">
            <div style="font-family:${headingFontStack};">
              ${buildLogoHTML(logoStyle, brandName, brandTagline, logoTaglineShow, colorPrimary, colorBackground, colorText)}
            </div>
          </div>

          <div style="flex:1;min-width:180px;padding:1.25rem;background:${colorText};border-radius:8px;display:flex;align-items:center;justify-content:center;">
            <div style="font-family:${headingFontStack};">
              ${buildLogoHTML(logoStyle, brandName, brandTagline, logoTaglineShow, colorBackground, colorText, colorBackground)}
            </div>
          </div>

          <div style="flex:1;min-width:180px;padding:1.25rem;background:${colorPrimary};border-radius:8px;display:flex;align-items:center;justify-content:center;">
            <div style="font-family:${headingFontStack};">
              ${buildLogoHTML(logoStyle, brandName, brandTagline, logoTaglineShow, colorBackground, colorPrimary, colorBackground)}
            </div>
          </div>

        </div>

        <div class="sg-usage-rule" style="border-color:${colorAccent};">
          ${usageRuleText}
        </div>
      </div>

      <!-- Color Application -->
      <div class="sg-section">
        <div class="sg-section-heading">Color Application</div>
        <div style="display:flex;flex-wrap:wrap;gap:0.75rem;">

          <div style="flex:1;min-width:200px;padding:1.25rem;background:${colorBackground};border-radius:8px;border:1px solid #e2e8f0;">
            <div style="font-family:${headingFontStack};font-size:1rem;font-weight:700;color:${colorText};margin-bottom:0.375rem;">
              ${escapeHTML(brandName || 'Brand')}
            </div>
            <p style="font-family:${bodyFontStack};font-size:0.85rem;color:${colorText};opacity:0.75;margin-bottom:0.75rem;line-height:1.5;">
              ${escapeHTML(brandTagline || '')}
            </p>
            <span style="display:inline-block;padding:0.4rem 0.875rem;background:${colorPrimary};color:${colorBackground};border-radius:6px;font-size:0.8rem;font-weight:700;font-family:${headingFontStack};">
              Primary Button
            </span>
          </div>

          <div style="flex:1;min-width:200px;padding:1.25rem;background:${colorPrimary};border-radius:8px;">
            <div style="font-family:${headingFontStack};font-size:1rem;font-weight:700;color:${colorBackground};margin-bottom:0.375rem;">
              Inverted Layout
            </div>
            <p style="font-family:${bodyFontStack};font-size:0.85rem;color:${colorBackground};opacity:0.8;margin-bottom:0.75rem;line-height:1.5;">
              プライマリカラー背景上のテキスト例
            </p>
            <span style="display:inline-block;padding:0.4rem 0.875rem;background:${colorAccent};color:${colorText};border-radius:6px;font-size:0.8rem;font-weight:700;font-family:${headingFontStack};">
              Accent Button
            </span>
          </div>

        </div>
      </div>

    </div>
  `;

  preview.innerHTML = html;
}

// ============================================================
// Reset
// ============================================================

function resetToDefaults() {
  if (!confirm('入力内容をリセットしてもよいですか？')) return;
  Object.assign(state, DEFAULTS);
  populateForm();
  renderPreview();
  loadGoogleFonts(state.fontHeading, state.fontBody);
  saveToStorage();
}

// ============================================================
// Init
// ============================================================

document.addEventListener('DOMContentLoaded', () => {

  // Load saved state
  loadFromStorage();

  // Populate form
  populateForm();

  // Bind text inputs
  bindTextInput('brand-name', 'brandName');
  bindTextInput('brand-tagline', 'brandTagline');
  bindTextInput('brand-description', 'brandDescription');
  bindTextInput('usage-note', 'usageNote');

  // Bind font inputs with Google Fonts loading
  bindTextInput('font-heading', 'fontHeading', () => {
    loadGoogleFonts(state.fontHeading, state.fontBody);
  });
  bindTextInput('font-body', 'fontBody', () => {
    loadGoogleFonts(state.fontHeading, state.fontBody);
  });

  // Bind number inputs
  bindNumberInput('font-scale-base', 'fontScaleBase');

  // Bind select inputs
  bindSelectInput('logo-style', 'logoStyle');
  bindSelectInput('logo-tagline-show', 'logoTaglineShow');

  // Bind color inputs
  COLOR_KEYS.forEach(key => onColorPickerChange(key));

  // Print button
  const btnPrint = document.getElementById('btn-print');
  if (btnPrint) {
    btnPrint.addEventListener('click', () => {
      window.print();
    });
  }

  // Reset button
  const btnReset = document.getElementById('btn-reset');
  if (btnReset) {
    btnReset.addEventListener('click', resetToDefaults);
  }

  // Initial render
  loadGoogleFonts(state.fontHeading, state.fontBody);
  renderPreview();
});
