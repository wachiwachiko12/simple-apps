'use strict';

// ===== 定数 =====
const OGP_W = 1200;
const OGP_H = 630;

// プリセット定義
const PRESETS = {
  blog: {
    title: '記事タイトルをここに入力してください',
    desc: 'ブログ記事の要約・説明文をここに入力します',
    site: 'My Blog',
    emoji: '📝',
    bg: '#1a2a4a',
    textColor: 'white',
    layout: 'left',
  },
  product: {
    title: '新製品・サービスの名称',
    desc: '製品の特徴や価値を一言で伝える説明文',
    site: 'Brand Name',
    emoji: '🚀',
    bg: '#0f766e',
    textColor: 'white',
    layout: 'center',
  },
  event: {
    title: 'イベント名・セミナータイトル',
    desc: '日時・場所・参加方法など概要を記載',
    site: 'Event Site',
    emoji: '🎉',
    bg: '#7c3aed',
    textColor: 'white',
    layout: 'center',
  },
};

// ===== DOM取得 =====
const previewCanvas = document.getElementById('preview-canvas');
const exportCanvas = document.getElementById('export-canvas');
const previewCtx = previewCanvas.getContext('2d');
const exportCtx = exportCanvas.getContext('2d');

const inputTitle = document.getElementById('input-title');
const inputDesc = document.getElementById('input-desc');
const inputSite = document.getElementById('input-site');
const inputEmoji = document.getElementById('input-emoji');

const counterTitle = document.getElementById('counter-title');
const counterDesc = document.getElementById('counter-desc');
const counterSite = document.getElementById('counter-site');

const presetBtns = document.querySelectorAll('.preset-btn');
const colorSwatches = document.querySelectorAll('.color-swatch');
const customColorInput = document.getElementById('custom-color');
const textColorRadios = document.querySelectorAll('input[name="text-color"]');
const layoutRadios = document.querySelectorAll('input[name="layout"]');

const downloadBtn = document.getElementById('btn-download');

// ===== 状態 =====
let state = {
  title: PRESETS.blog.title,
  desc: PRESETS.blog.desc,
  site: PRESETS.blog.site,
  emoji: PRESETS.blog.emoji,
  bg: PRESETS.blog.bg,
  textColor: PRESETS.blog.textColor,
  layout: PRESETS.blog.layout,
};

// ===== 文字カウンター =====
function updateCounter(counter, current, max) {
  counter.textContent = `${current} / ${max}`;
  counter.classList.toggle('warn', current >= max * 0.8 && current < max);
  counter.classList.toggle('over', current >= max);
}

// ===== Canvas 描画ヘルパー =====

/**
 * 背景グラデーションを描画
 */
function drawBackground(ctx, w, h, bg) {
  // 単色ベース
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // 右側に薄いオーバーレイでグラデーション感
  const grad = ctx.createLinearGradient(w * 0.4, 0, w, h);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.25)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

/**
 * 装飾ライン（左端アクセント）を描画
 */
function drawAccentLine(ctx, h, textColor) {
  const color = textColor === 'white' ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.3)';
  ctx.fillStyle = color;
  ctx.fillRect(60, 80, 6, h - 160);
}

/**
 * テキストの折り返し描画
 * @returns {number} 描画後のy座標
 */
function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight) {
  if (!text) return y;
  const chars = Array.from(text);
  let line = '';
  let currentY = y;

  for (let i = 0; i < chars.length; i++) {
    const testLine = line + chars[i];
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && line.length > 0) {
      ctx.fillText(line, x, currentY);
      currentY += lineHeight;
      line = chars[i];
    } else {
      line = testLine;
    }
  }
  if (line) {
    ctx.fillText(line, x, currentY);
    currentY += lineHeight;
  }
  return currentY;
}

/**
 * 装飾的な背景サークルを描画（右側デコレーション）
 */
function drawDecorCircles(ctx, w, h, textColor) {
  const alpha = textColor === 'white' ? 0.08 : 0.05;
  ctx.save();
  ctx.strokeStyle = textColor === 'white' ? `rgba(255,255,255,${alpha * 3})` : `rgba(0,0,0,${alpha * 3})`;
  ctx.lineWidth = 2;

  const cx = w * 0.82;
  const cy = h * 0.5;
  for (let r of [80, 150, 230]) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * メイン描画関数
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} w - 描画幅
 * @param {number} h - 描画高さ
 * @param {object} s - state
 */
function drawOGP(ctx, w, h, s) {
  const scale = w / OGP_W;
  const color = s.textColor === 'white' ? '#ffffff' : '#111827';
  const colorSub = s.textColor === 'white' ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.55)';
  const isCenter = s.layout === 'center';

  ctx.clearRect(0, 0, w, h);

  // 背景
  drawBackground(ctx, w, h, s.bg);

  // 装飾サークル
  drawDecorCircles(ctx, w, h, s.textColor);

  // 左端アクセントライン（左寄せのみ）
  if (!isCenter) {
    drawAccentLine(ctx, h, s.textColor);
  }

  const padX = isCenter ? w * 0.1 : 86 * scale;
  const maxW = isCenter ? w * 0.8 : w * 0.72;
  const baseX = isCenter ? w / 2 : padX;
  const textAlign = isCenter ? 'center' : 'left';

  ctx.textAlign = textAlign;
  ctx.textBaseline = 'top';

  // 絵文字（大きく表示）
  let contentStartY = h * 0.12;

  if (s.emoji) {
    const emojiFontSize = Math.round(80 * scale);
    ctx.font = `${emojiFontSize}px "Noto Sans JP", sans-serif`;
    ctx.fillStyle = color;
    ctx.fillText(s.emoji, baseX, contentStartY);
    contentStartY += emojiFontSize * 1.2;
  }

  // タイトル
  if (s.title) {
    const titleFontSize = Math.round(56 * scale);
    ctx.font = `900 ${titleFontSize}px "Noto Sans JP", sans-serif`;
    ctx.fillStyle = color;
    const titleLineH = titleFontSize * 1.35;
    contentStartY = drawWrappedText(ctx, s.title, baseX, contentStartY, maxW, titleLineH);
    contentStartY += titleFontSize * 0.3;
  }

  // 説明文
  if (s.desc) {
    const descFontSize = Math.round(28 * scale);
    ctx.font = `400 ${descFontSize}px "Noto Sans JP", sans-serif`;
    ctx.fillStyle = colorSub;
    const descLineH = descFontSize * 1.55;
    contentStartY = drawWrappedText(ctx, s.desc, baseX, contentStartY, maxW, descLineH);
  }

  // サイト名（下部）
  if (s.site) {
    const siteFontSize = Math.round(24 * scale);
    ctx.font = `700 ${siteFontSize}px "Noto Sans JP", sans-serif`;
    ctx.fillStyle = colorSub;
    ctx.textBaseline = 'bottom';
    const siteY = h - 60 * scale;
    ctx.fillText(s.site, baseX, siteY);
  }
}

// ===== 描画の実行 =====
function render() {
  drawOGP(previewCanvas.getContext('2d'), OGP_W, OGP_H, state);
}

// ===== プリセット適用 =====
function applyPreset(name) {
  const p = PRESETS[name];
  if (!p) return;

  state.title = p.title;
  state.desc = p.desc;
  state.site = p.site;
  state.emoji = p.emoji;
  state.bg = p.bg;
  state.textColor = p.textColor;
  state.layout = p.layout;

  // UI反映
  inputTitle.value = p.title;
  inputDesc.value = p.desc;
  inputSite.value = p.site;
  inputEmoji.value = p.emoji;

  // 背景色スウォッチ
  updateColorSwatchSelection(p.bg);
  customColorInput.value = p.bg;

  // テキストカラーラジオ
  textColorRadios.forEach(r => { r.checked = r.value === p.textColor; });

  // レイアウトラジオ
  layoutRadios.forEach(r => { r.checked = r.value === p.layout; });

  // カウンター更新
  updateCounter(counterTitle, p.title.length, 40);
  updateCounter(counterDesc, p.desc.length, 80);
  updateCounter(counterSite, p.site.length, 20);

  render();
}

// ===== 背景色スウォッチ選択状態 =====
function updateColorSwatchSelection(color) {
  colorSwatches.forEach(sw => {
    const isMatch = sw.dataset.color.toLowerCase() === color.toLowerCase();
    sw.classList.toggle('active', isMatch);
    sw.setAttribute('aria-pressed', String(isMatch));
  });
}

// ===== ダウンロード =====
function downloadPNG() {
  if (!state.title.trim()) {
    alert('タイトルを入力してからダウンロードしてください。');
    document.getElementById('input-title').focus();
    return;
  }

  drawOGP(exportCtx, OGP_W, OGP_H, state);

  const link = document.createElement('a');
  const titleSlug = state.title.trim().slice(0, 20).replace(/\s+/g, '-');
  link.download = `ogp-${titleSlug}.png`;
  link.href = exportCanvas.toDataURL('image/png');
  link.click();

  const btn = downloadBtn;
  const original = btn.textContent;
  btn.textContent = '✓ ダウンロードしました';
  btn.disabled = true;
  setTimeout(() => {
    btn.textContent = original;
    btn.disabled = false;
  }, 2000);
}

// ===== イベント登録 =====

// プリセットボタン
presetBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    presetBtns.forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-pressed', 'false');
    });
    btn.classList.add('active');
    btn.setAttribute('aria-pressed', 'true');
    applyPreset(btn.dataset.preset);
  });
});

// テキスト入力（リアルタイム）
inputTitle.addEventListener('input', () => {
  state.title = inputTitle.value;
  updateCounter(counterTitle, state.title.length, 40);
  render();
});

inputDesc.addEventListener('input', () => {
  state.desc = inputDesc.value;
  updateCounter(counterDesc, state.desc.length, 80);
  render();
});

inputSite.addEventListener('input', () => {
  state.site = inputSite.value;
  updateCounter(counterSite, state.site.length, 20);
  render();
});

inputEmoji.addEventListener('input', () => {
  state.emoji = inputEmoji.value;
  render();
});

// 背景色スウォッチ
colorSwatches.forEach(sw => {
  sw.addEventListener('click', () => {
    state.bg = sw.dataset.color;
    customColorInput.value = sw.dataset.color;
    updateColorSwatchSelection(sw.dataset.color);
    render();
  });
});

// カスタムカラー
customColorInput.addEventListener('input', () => {
  state.bg = customColorInput.value;
  // スウォッチの選択を全解除（カスタム色はプリセット外）
  colorSwatches.forEach(sw => {
    sw.classList.remove('active');
    sw.setAttribute('aria-pressed', 'false');
  });
  render();
});

// テキストカラー
textColorRadios.forEach(r => {
  r.addEventListener('change', () => {
    if (r.checked) {
      state.textColor = r.value;
      render();
    }
  });
});

// レイアウト
layoutRadios.forEach(r => {
  r.addEventListener('change', () => {
    if (r.checked) {
      state.layout = r.value;
      render();
    }
  });
});

// ダウンロード
downloadBtn.addEventListener('click', downloadPNG);

// ===== 初期化 =====
applyPreset('blog');
