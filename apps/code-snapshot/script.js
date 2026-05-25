'use strict';

// ===== テーマ定義 =====
const THEMES = {
  'atom-one-dark':             'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-dark.min.css',
  'github':                    'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css',
  'dracula':                   'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/dracula.min.css',
  'atom-one-dark-reasonable':  'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-dark-reasonable.min.css',
  'solarized-dark':            'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/base16/solarized-dark.min.css',
};

// テーマごとのウィンドウバー背景色
const THEME_WINDOW_BAR = {
  'atom-one-dark':             '#2d2d2d',
  'github':                    '#f6f8fa',
  'dracula':                   '#282a36',
  'atom-one-dark-reasonable':  '#2d2d2d',
  'solarized-dark':            '#002b36',
};

// ===== DOM参照 =====
const codeInput        = document.getElementById('code-input');
const langSelect       = document.getElementById('lang-select');
const themeSelect      = document.getElementById('theme-select');
const fontSizeSelect   = document.getElementById('font-size-select');
const paddingSelect    = document.getElementById('padding-select');
const filenameInput    = document.getElementById('filename-input');
const bgColorPicker    = document.getElementById('bg-color-picker');
const presetBtns       = document.querySelectorAll('.preset-btn');
const downloadBtn      = document.getElementById('download-btn');
const downloadBtnPreview = document.getElementById('download-btn-preview');
const hljsThemeLink    = document.getElementById('hljs-theme');
const codeHighlighted  = document.getElementById('code-highlighted');
const codePre          = document.getElementById('code-pre');
const codeCard         = document.getElementById('code-card');
const previewOuter     = document.getElementById('preview-outer');
const windowBar        = document.querySelector('.window-bar');
const windowFilename   = document.getElementById('window-filename');

// ===== 状態 =====
let currentBgColor = '#6366f1';

// ===== デフォルトコード =====
const DEFAULT_CODE = `// コードスニペット画像化ツール
// ここにコードを貼り付けてください

function greet(name) {
  return \`こんにちは、\${name}さん！\`;
}

console.log(greet('エンジニア'));`;

// ===== 初期化 =====
function init() {
  codeInput.value = DEFAULT_CODE;
  applyTheme(themeSelect.value);
  updatePreview();
  bindEvents();
}

// ===== イベント登録 =====
function bindEvents() {
  codeInput.addEventListener('input', updatePreview);
  langSelect.addEventListener('change', updatePreview);
  themeSelect.addEventListener('change', () => {
    applyTheme(themeSelect.value);
    updatePreview();
  });
  fontSizeSelect.addEventListener('change', updatePreview);
  paddingSelect.addEventListener('change', updatePreview);
  filenameInput.addEventListener('input', updateFilename);

  // 背景色プリセット
  presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      currentBgColor = btn.dataset.color;
      bgColorPicker.value = rgbToHex(currentBgColor) || currentBgColor;
      presetBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      applyBgColor();
    });
  });

  // カスタムカラーピッカー
  bgColorPicker.addEventListener('input', () => {
    currentBgColor = bgColorPicker.value;
    presetBtns.forEach(b => b.classList.remove('active'));
    applyBgColor();
  });

  // ダウンロードボタン（サイドパネル + プレビュー下）
  downloadBtn.addEventListener('click', handleDownload);
  downloadBtnPreview.addEventListener('click', handleDownload);

  // Tab キーでインデント
  codeInput.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = codeInput.selectionStart;
      const end   = codeInput.selectionEnd;
      codeInput.value = codeInput.value.substring(0, start) + '  ' + codeInput.value.substring(end);
      codeInput.selectionStart = codeInput.selectionEnd = start + 2;
      updatePreview();
    }
  });
}

// ===== テーマ適用 =====
function applyTheme(themeName) {
  const url = THEMES[themeName];
  if (url) hljsThemeLink.href = url;

  const barColor = THEME_WINDOW_BAR[themeName] || '#2d2d2d';
  windowBar.style.background = barColor;
}

// ===== 背景色適用 =====
function applyBgColor() {
  previewOuter.style.background = currentBgColor;
  codeCard.style.boxShadow = `0 20px 60px ${hexToRgba(currentBgColor, 0.5)}`;
}

// ===== ファイル名更新 =====
function updateFilename() {
  const name = filenameInput.value.trim();
  windowFilename.textContent = name;
  windowFilename.style.display = name ? 'inline' : 'none';
}

// ===== プレビュー更新 =====
function updatePreview() {
  const raw  = codeInput.value;
  const lang = langSelect.value;
  const fs   = fontSizeSelect.value;
  const pd   = paddingSelect.value;

  // コードエスケープ（XSS対策）
  const escaped = escapeHtml(raw);
  codeHighlighted.innerHTML = escaped;
  codeHighlighted.className = `hljs language-${lang}`;

  // Highlight.js でハイライト
  if (lang === 'plaintext') {
    codeHighlighted.classList.remove(`language-${lang}`);
    codeHighlighted.classList.add('plaintext');
  } else {
    try {
      hljs.highlightElement(codeHighlighted);
    } catch (_) {
      // ハイライト失敗時はそのまま表示
    }
  }

  // フォントサイズとパディング
  codeHighlighted.style.fontSize  = `${fs}px`;
  codeHighlighted.style.lineHeight = '1.6';
  codePre.style.padding = `${pd}px`;

  // 背景色
  applyBgColor();
  updateFilename();
}

// ===== PNG ダウンロード =====
async function handleDownload() {
  // 空入力バリデーション
  if (!codeInput.value.trim()) {
    codeInput.focus();
    codeInput.classList.add('input-error');
    setTimeout(() => codeInput.classList.remove('input-error'), 1500);
    return;
  }

  downloadBtn.disabled = true;
  downloadBtn.textContent = '生成中...';
  downloadBtnPreview.disabled = true;
  downloadBtnPreview.textContent = '生成中...';

  try {
    // キャプチャ前の調整
    codeCard.classList.add('capturing');
    const originalShadow = codeCard.style.boxShadow;
    codeCard.style.boxShadow = 'none';

    const canvas = await html2canvas(codeCard, {
      useCORS:       true,
      allowTaint:    false,
      scale:         2,           // 高解像度（2x）
      backgroundColor: null,
      logging:       false,
      removeContainer: true,
    });

    codeCard.classList.remove('capturing');
    codeCard.style.boxShadow = originalShadow;

    // ダウンロード
    const link = document.createElement('a');
    const filename = filenameInput.value.trim()
      ? filenameInput.value.trim().replace(/[^a-zA-Z0-9_\-\.]/g, '_') + '.png'
      : 'code-snapshot.png';
    link.download = filename;
    link.href = canvas.toDataURL('image/png');
    link.click();
  } catch (err) {
    console.error('画像生成エラー:', err);
    alert('画像の生成に失敗しました。ブラウザをリロードして再試行してください。');
    codeCard.classList.remove('capturing');
  } finally {
    downloadBtn.disabled = false;
    downloadBtn.textContent = 'PNG画像でダウンロード';
    downloadBtnPreview.disabled = false;
    downloadBtnPreview.textContent = 'PNG画像でダウンロード';
  }
}

// ===== ユーティリティ =====
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function hexToRgba(hex, alpha) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return `rgba(0,0,0,${alpha})`;
  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function rgbToHex(color) {
  // 既に #xxxxxx 形式ならそのまま返す
  if (/^#[0-9a-f]{6}$/i.test(color)) return color;
  return null;
}

// ===== 起動 =====
document.addEventListener('DOMContentLoaded', init);
