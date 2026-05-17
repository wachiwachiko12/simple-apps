'use strict';

// ===== 定数 =====
const STORAGE_KEY = 'bcg_data_v1';

// Canvas出力サイズ: 91mm × 55mm @ 300dpi相当
// 1mm = 300/25.4 px ≈ 11.811 px
const CANVAS_W = Math.round(91 * 300 / 25.4);  // 1075
const CANVAS_H = Math.round(55 * 300 / 25.4);  // 650

// FontFace ロード済みフラグ
let fontLoaded = false;

// ===== アプリ状態 =====
const state = {
  name: '',
  kana: '',
  title: '',
  company: '',
  email: '',
  phone: '',
  website: '',
  invoice: '',
  template: 'simple',  // 'simple' | 'dark'
  accent: '#1a237e',
};

// ===== DOM参照 =====
const formFields = {
  name:    document.getElementById('name'),
  kana:    document.getElementById('name-kana'),
  title:   document.getElementById('title'),
  company: document.getElementById('company'),
  email:   document.getElementById('email'),
  phone:   document.getElementById('phone'),
  website: document.getElementById('website'),
  invoice: document.getElementById('invoice'),
};

const prevEls = {
  name:    document.getElementById('prev-name'),
  kana:    document.getElementById('prev-kana'),
  title:   document.getElementById('prev-title'),
  company: document.getElementById('prev-company'),
  email:   document.getElementById('prev-email'),
  phone:   document.getElementById('prev-phone'),
  website: document.getElementById('prev-website'),
  invoice: document.getElementById('prev-invoice'),
};

const cardInner   = document.getElementById('card-inner');
const cardAccent  = document.getElementById('card-accent');
const btnDownload = document.getElementById('btn-download');
const btnPrint    = document.getElementById('btn-print');
const btnReset    = document.getElementById('btn-reset');
const btnDownloadM = document.getElementById('btn-download-mobile');
const btnPrintM    = document.getElementById('btn-print-mobile');
const printCard    = document.getElementById('print-card');

// ===== Noto Sans JP をFontFace APIでロード =====
async function loadNotoFont() {
  if (fontLoaded) return;
  try {
    // Google FontsのNoto Sans JPはブラウザで既にlink要素でロードしているが、
    // Canvas描画用に明示的にFontFace登録して確実にロードする
    const font = new FontFace(
      'Noto Sans JP',
      "url('https://fonts.gstatic.com/s/notosansjp/v53/-F6jfjtqLzI2JPCgQBnw7HFyzSD-AsregP8VFBEi75vY0rw-oME.woff2') format('woff2')",
      { weight: '700', style: 'normal' }
    );
    await font.load();
    document.fonts.add(font);

    const fontReg = new FontFace(
      'Noto Sans JP',
      "url('https://fonts.gstatic.com/s/notosansjp/v53/-F6jfjtqLzI2JPCgQBnw7HFyzSD-AsregP8VFBEi75vY0rw-oME.woff2') format('woff2')",
      { weight: '400', style: 'normal' }
    );
    await fontReg.load();
    document.fonts.add(fontReg);

    fontLoaded = true;
  } catch (e) {
    // フォントロード失敗時はシステムフォントにフォールバック
    console.warn('Noto Sans JP font load failed, using system font.', e);
    fontLoaded = true;
  }
}

// ===== 状態をDOMに反映 =====
function updatePreview() {
  // テキスト更新
  const nameVal = state.name || '（氏名）';
  const titleVal = state.title || '（肩書き）';

  prevEls.name.textContent    = nameVal;
  prevEls.kana.textContent    = state.kana;
  prevEls.title.textContent   = titleVal;
  prevEls.company.textContent = state.company;
  prevEls.email.textContent   = state.email;
  prevEls.phone.textContent   = state.phone;
  prevEls.website.textContent = state.website;

  if (state.invoice) {
    prevEls.invoice.textContent = '適格請求書番号: ' + state.invoice;
  } else {
    prevEls.invoice.textContent = '';
  }

  // テンプレート切り替え
  cardInner.classList.remove('tpl-simple', 'tpl-dark');
  cardInner.classList.add('tpl-' + state.template);

  // アクセントカラー
  cardAccent.style.background = state.accent;

  // CSS変数でアクセントカラーを名前テキストにも反映
  cardInner.style.setProperty('--accent', state.accent);

  if (state.template === 'simple') {
    cardInner.style.background = '#fff';
    cardInner.style.color = '#1a1a2e';
    prevEls.name.style.color = state.accent;
  } else {
    cardInner.style.background = '#1a1a2e';
    cardInner.style.color = '#f0f0f0';
    prevEls.name.style.color = '#ffffff';
  }

  // 印刷用エリアも更新
  updatePrintArea();
}

// ===== 印刷用エリアを更新 =====
function updatePrintArea() {
  const isDark = state.template === 'dark';
  const bg     = isDark ? '#1a1a2e' : '#ffffff';
  const fg     = isDark ? '#f0f0f0' : '#1a1a2e';

  printCard.innerHTML = '';
  printCard.style.cssText = `
    width: 91mm;
    height: 55mm;
    display: flex;
    overflow: hidden;
    font-family: "Noto Sans JP", sans-serif;
    background: ${bg};
    color: ${fg};
  `;

  const accent = document.createElement('div');
  accent.style.cssText = `width: 3mm; min-width: 3mm; background: ${state.accent};`;
  printCard.appendChild(accent);

  const content = document.createElement('div');
  content.style.cssText = `
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 5mm 6mm 4mm 5mm;
    overflow: hidden;
  `;

  const top = document.createElement('div');
  if (state.company) {
    const co = document.createElement('p');
    co.style.cssText = `font-size: 7pt; opacity: 0.7; margin:0;`;
    co.textContent = state.company;
    top.appendChild(co);
  }
  if (state.title) {
    const ti = document.createElement('p');
    ti.style.cssText = `font-size: 8pt; font-weight: 600; margin:0;`;
    ti.textContent = state.title;
    top.appendChild(ti);
  }
  content.appendChild(top);

  const center = document.createElement('div');
  center.style.cssText = `text-align: center;`;
  const nm = document.createElement('p');
  nm.style.cssText = `font-size: 20pt; font-weight: 700; letter-spacing: 0.08em; margin: 0; color: ${isDark ? '#fff' : state.accent};`;
  nm.textContent = state.name || '氏名';
  center.appendChild(nm);
  if (state.kana) {
    const kn = document.createElement('p');
    kn.style.cssText = `font-size: 7pt; opacity: 0.6; margin: 1mm 0 0 0;`;
    kn.textContent = state.kana;
    center.appendChild(kn);
  }
  content.appendChild(center);

  const bottom = document.createElement('div');
  const contacts = [
    state.email,
    state.phone,
    state.website,
    state.invoice ? ('適格請求書番号: ' + state.invoice) : '',
  ].filter(Boolean);
  contacts.forEach(txt => {
    const p = document.createElement('p');
    p.style.cssText = `font-size: 7pt; margin: 0.5mm 0; opacity: 0.85;`;
    p.textContent = txt;
    bottom.appendChild(p);
  });
  content.appendChild(bottom);

  printCard.appendChild(content);
}

// ===== Canvas描画でPNGを生成 =====
async function generateCanvas() {
  await loadNotoFont();

  const canvas = document.createElement('canvas');
  canvas.width  = CANVAS_W;
  canvas.height = CANVAS_H;
  const ctx = canvas.getContext('2d');

  const isDark = state.template === 'dark';
  const bg     = isDark ? '#1a1a2e' : '#ffffff';
  const fg     = isDark ? '#f0f0f0' : '#1a1a2e';
  const accent = state.accent;

  // 背景
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // 左アクセントバー (約10px at 96dpi → 300dpi相当で31px)
  const barW = Math.round(CANVAS_W * 0.03);
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, barW, CANVAS_H);

  const padX = Math.round(CANVAS_W * 0.05);
  const padY = Math.round(CANVAS_H * 0.08);
  const contentX = barW + padX;
  const contentW = CANVAS_W - barW - padX * 2;

  ctx.textBaseline = 'top';

  // ===== 上部: 会社名・肩書き =====
  let topY = padY;

  if (state.company) {
    ctx.fillStyle = fg;
    ctx.globalAlpha = 0.65;
    ctx.font = `400 ${Math.round(CANVAS_H * 0.09)}px "Noto Sans JP", sans-serif`;
    ctx.fillText(clipText(ctx, state.company, contentW), contentX, topY);
    topY += Math.round(CANVAS_H * 0.11);
    ctx.globalAlpha = 1.0;
  }

  if (state.title) {
    ctx.fillStyle = fg;
    ctx.font = `600 ${Math.round(CANVAS_H * 0.1)}px "Noto Sans JP", sans-serif`;
    ctx.fillText(clipText(ctx, state.title, contentW), contentX, topY);
  }

  // ===== 中央: 氏名 =====
  const nameSize = Math.round(CANVAS_H * 0.22);
  ctx.font = `700 ${nameSize}px "Noto Sans JP", sans-serif`;
  ctx.fillStyle = isDark ? '#ffffff' : accent;
  const nameText = state.name || '氏名';
  const nameW = ctx.measureText(nameText).width;
  const nameX = barW + (CANVAS_W - barW - nameW) / 2;
  const nameY = (CANVAS_H - nameSize) / 2 - Math.round(CANVAS_H * 0.03);
  ctx.fillText(nameText, nameX, nameY);

  if (state.kana) {
    const kanaSize = Math.round(CANVAS_H * 0.075);
    ctx.font = `400 ${kanaSize}px "Noto Sans JP", sans-serif`;
    ctx.fillStyle = fg;
    ctx.globalAlpha = 0.55;
    const kanaW = ctx.measureText(state.kana).width;
    const kanaX = barW + (CANVAS_W - barW - kanaW) / 2;
    ctx.fillText(state.kana, kanaX, nameY + nameSize + Math.round(CANVAS_H * 0.02));
    ctx.globalAlpha = 1.0;
  }

  // ===== 下部: 連絡先 =====
  const contactSize = Math.round(CANVAS_H * 0.09);
  ctx.font = `400 ${contactSize}px "Noto Sans JP", sans-serif`;
  ctx.fillStyle = fg;
  ctx.globalAlpha = 0.85;

  const contacts = [
    state.email,
    state.phone,
    state.website,
  ].filter(Boolean);

  const lineH = Math.round(contactSize * 1.4);
  const totalH = contacts.length * lineH;
  let contactY = CANVAS_H - padY - totalH;

  contacts.forEach(txt => {
    ctx.fillText(clipText(ctx, txt, contentW), contentX, contactY);
    contactY += lineH;
  });

  // インボイス番号（より小さく）
  if (state.invoice) {
    ctx.globalAlpha = 0.5;
    const invSize = Math.round(CANVAS_H * 0.07);
    ctx.font = `400 ${invSize}px "Noto Sans JP", sans-serif`;
    ctx.fillText(
      clipText(ctx, '適格請求書番号: ' + state.invoice, contentW),
      contentX,
      contactY + Math.round(CANVAS_H * 0.01)
    );
  }

  ctx.globalAlpha = 1.0;
  return canvas;
}

// テキストをwidthに収める
function clipText(ctx, text, maxWidth) {
  if (!text) return '';
  let t = text;
  const ellipsis = '…';
  while (ctx.measureText(t).width > maxWidth && t.length > 1) {
    t = t.slice(0, -1);
  }
  if (t !== text) t = t.slice(0, -1) + ellipsis;
  return t;
}

// ===== ダウンロード =====
async function downloadPNG() {
  btnDownload.disabled = true;
  btnDownload.textContent = '生成中...';
  if (btnDownloadM) {
    btnDownloadM.disabled = true;
    btnDownloadM.textContent = '生成中...';
  }

  try {
    const canvas = await generateCanvas();
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = 'meishi_' + (state.name || 'card') + '.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (e) {
    alert('PNG生成に失敗しました。お使いのブラウザをご確認ください。');
    console.error(e);
  } finally {
    btnDownload.disabled = false;
    btnDownload.textContent = 'PNGで保存（300dpi相当）';
    if (btnDownloadM) {
      btnDownloadM.disabled = false;
      btnDownloadM.textContent = 'PNGで保存';
    }
  }
}

// ===== 印刷 =====
function printCard_fn() {
  window.print();
}

// ===== localStorageに保存 =====
function saveToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    // プライベートモード等でlocalStorageが使えない場合は無視
  }
}

// ===== localStorageから復元 =====
function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    Object.assign(state, saved);
  } catch (e) {
    // パース失敗は無視
  }
}

// ===== フォームフィールドを状態から復元 =====
function restoreFormFields() {
  Object.keys(formFields).forEach(key => {
    if (formFields[key]) {
      formFields[key].value = state[key] || '';
    }
  });

  // テンプレートラジオ
  const radios = document.querySelectorAll('input[name="template"]');
  radios.forEach(r => {
    r.checked = (r.value === state.template);
  });

  // カラーボタン
  document.querySelectorAll('.color-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.color === state.accent);
  });
}

// ===== インボイス番号バリデーション =====
function validateInvoice(val) {
  if (!val) return true; // 任意なので空はOK
  return /^T\d{13}$/.test(val);
}

// ===== イベントハンドラ: フォーム入力 =====
function bindFormEvents() {
  Object.keys(formFields).forEach(key => {
    const el = formFields[key];
    if (!el) return;
    el.addEventListener('input', () => {
      state[key] = el.value.trim();
      if (key === 'invoice') {
        const valid = validateInvoice(state[key]);
        el.classList.toggle('invalid', !valid);
      }
      updatePreview();
      saveToStorage();
    });
  });

  // テンプレートラジオ
  document.querySelectorAll('input[name="template"]').forEach(radio => {
    radio.addEventListener('change', () => {
      state.template = radio.value;
      updatePreview();
      saveToStorage();
    });
  });

  // カラーボタン
  document.querySelectorAll('.color-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.accent = btn.dataset.color;
      document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      // CSS変数をルートに反映
      document.documentElement.style.setProperty('--accent', state.accent);
      updatePreview();
      saveToStorage();
    });
  });
}

// ===== タブ切り替え（モバイル） =====
function bindTabEvents() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;
      tabBtns.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');

      document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
      const panel = document.getElementById('panel-' + target);
      if (panel) panel.classList.add('active');
    });
  });
}

// ===== リセット =====
function resetAll() {
  if (!confirm('入力内容をリセットしますか？')) return;

  const defaultState = {
    name: '', kana: '', title: '', company: '',
    email: '', phone: '', website: '', invoice: '',
    template: 'simple', accent: '#1a237e',
  };
  Object.assign(state, defaultState);
  restoreFormFields();
  document.documentElement.style.setProperty('--accent', state.accent);
  updatePreview();
  saveToStorage();
}

// ===== 初期化 =====
function init() {
  // storageから復元
  loadFromStorage();
  restoreFormFields();

  // CSS変数を現在のアクセントカラーで初期化
  document.documentElement.style.setProperty('--accent', state.accent);

  // 最初のパネルを表示（モバイル: 入力パネル）
  document.getElementById('panel-form').classList.add('active');

  // イベントバインド
  bindFormEvents();
  bindTabEvents();

  // ダウンロードボタン
  btnDownload.addEventListener('click', downloadPNG);
  if (btnDownloadM) btnDownloadM.addEventListener('click', downloadPNG);

  // 印刷ボタン
  btnPrint.addEventListener('click', printCard_fn);
  if (btnPrintM) btnPrintM.addEventListener('click', printCard_fn);

  // リセットボタン
  btnReset.addEventListener('click', resetAll);

  // 初回プレビュー描画
  updatePreview();

  // フォントを事前ロード（ダウンロードを素早くするため）
  loadNotoFont();
}

document.addEventListener('DOMContentLoaded', init);
