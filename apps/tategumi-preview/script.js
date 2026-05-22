/* ===== 縦書きプレビュアー script.js ===== */

(function () {
  'use strict';

  // --- DOM参照 ---
  const inputText       = document.getElementById('input-text');
  const tateArea        = document.getElementById('tategumi-area');
  const countTotal      = document.getElementById('count-total');
  const countEffective  = document.getElementById('count-effective');
  const countGenkou     = document.getElementById('count-genkou');
  const countLines      = document.getElementById('count-lines');
  const fontSizeSelect  = document.getElementById('font-size-select');
  const charsPerLine    = document.getElementById('chars-per-line-select');
  const fontFamilySel   = document.getElementById('font-family-select');
  const lineHeightSel   = document.getElementById('line-height-select');
  const btnSample       = document.getElementById('btn-sample');
  const tabInput        = document.getElementById('tab-input');
  const tabPreview      = document.getElementById('tab-preview');
  const panelInput      = document.getElementById('panel-input');
  const panelPreview    = document.getElementById('panel-preview');

  // --- サンプルテキスト（夏目漱石「吾輩は猫である」冒頭） ---
  const SAMPLE_TEXT =
    '吾輩《わがはい》は猫《ねこ》である。名前《なまえ》はまだ無《な》い。\n' +
    '\n' +
    'どこで生れたかとんと見当《けんとう》がつかぬ。何でも薄暗《うすぐら》いじめじめした所でニャーニャー泣《な》いていた事《こと》だけは記憶《きおく》している。吾輩はここで始めて人間《にんげん》というものを見た。しかもあとで聞くとそれは書生《しょせい》という人間中《にんげんちゅう》で一番獰猛《どうもう》な種族《しゅぞく》であったそうだ。この書生というのは時々我々《われわれ》を捕《つかま》えて煮《に》て食うという話である。しかし其《その》当時《とうじ》は何という考《かんが》えもなかったから別段《べつだん》恐《おそ》しいとも思わなかった。';

  // --- ルビ変換（《》記法 → <ruby>タグ） ---
  function convertRuby(text) {
    // XSS対策：まず全体をエスケープしてからrubyを復元
    const escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

    // 《》記法を検出して ruby タグに変換
    // パターン: 任意の文字列《よみがな》
    return escaped.replace(/([^《》\n]+?)《([^》\n]+?)》/g,
      '<ruby>$1<rt>$2</rt></ruby>');
  }

  // --- 改行を縦書き用の段落に変換 ---
  function convertToParagraphs(text) {
    const rubyConverted = convertRuby(text);
    // 改行を <br> に変換（縦書きでは改行が右方向への移動）
    return rubyConverted.replace(/\n/g, '<br>');
  }

  // --- 字数カウント ---
  function countChars(text) {
    const total = text.length;
    // スペース（全角・半角）・改行・タブを除外
    const effective = text.replace(/[\s　]/g, '').length;
    const genkou = effective === 0 ? 0 : Math.ceil(effective / 400);
    const lines = text === '' ? 0 : text.split('\n').length;
    return { total, effective, genkou, lines };
  }

  // --- プレビュー更新 ---
  function updatePreview() {
    let text = inputText.value;
    const MAX_CHARS = 100000;
    if (text.length > MAX_CHARS) {
      text = text.slice(0, MAX_CHARS);
      inputText.value = text;
    }

    // 字数カウント更新
    const { total, effective, genkou, lines } = countChars(text);
    countTotal.textContent     = total.toLocaleString();
    countEffective.textContent = effective.toLocaleString();
    countGenkou.textContent    = genkou.toLocaleString();
    countLines.textContent     = lines.toLocaleString();

    // 縦書きプレビュー更新
    if (text.trim() === '') {
      tateArea.innerHTML = '<div class="tategumi-placeholder">テキストを入力するとここに縦書き表示されます</div>';
    } else {
      tateArea.innerHTML = convertToParagraphs(text);
    }
  }

  // --- 設定変更：フォントサイズ ---
  function applyFontSize() {
    const size = fontSizeSelect.value;
    tateArea.style.fontSize = size + 'px';
  }

  // --- 設定変更：1行の文字数（カラム幅） ---
  function applyCharsPerLine() {
    const chars = parseInt(charsPerLine.value, 10);
    const fontSize = parseInt(fontSizeSelect.value, 10);
    const scrollOuter = document.querySelector('.tategumi-scroll-outer');
    const maxHeight = scrollOuter ? scrollOuter.clientHeight - 4 : 496;
    const calcHeight = chars * fontSize * 1.8;
    tateArea.style.height = Math.min(calcHeight, maxHeight) + 'px';
    tateArea.style.maxHeight = '100%';
  }

  // 行間数値取得
  function getLineHeightValue() {
    const val = lineHeightSel.value;
    if (val === 'narrow') return 1.8;
    if (val === 'wide')   return 2.8;
    return 2.2;
  }

  // --- 設定変更：フォントファミリー ---
  function applyFontFamily() {
    tateArea.classList.remove('font-mincho', 'font-gothic', 'font-maru-gothic');
    const val = fontFamilySel.value;
    if (val === 'mincho')      tateArea.classList.add('font-mincho');
    else if (val === 'gothic') tateArea.classList.add('font-gothic');
    else                       tateArea.classList.add('font-maru-gothic');
  }

  // --- 設定変更：行間 ---
  function applyLineHeight() {
    tateArea.classList.remove('lh-narrow', 'lh-normal', 'lh-wide');
    const val = lineHeightSel.value;
    if (val === 'narrow')     tateArea.classList.add('lh-narrow');
    else if (val === 'wide')  tateArea.classList.add('lh-wide');
    else                      tateArea.classList.add('lh-normal');
  }

  // --- 全設定を一括適用 ---
  function applyAllSettings() {
    applyFontSize();
    applyFontFamily();
    applyLineHeight();
    applyCharsPerLine();
  }

  // --- モバイルタブ切り替え ---
  function switchTab(tab) {
    if (tab === 'input') {
      tabInput.classList.add('active');
      tabInput.setAttribute('aria-selected', 'true');
      tabPreview.classList.remove('active');
      tabPreview.setAttribute('aria-selected', 'false');
      panelInput.classList.remove('hidden-mobile');
      panelPreview.classList.add('hidden-mobile');
    } else {
      tabPreview.classList.add('active');
      tabPreview.setAttribute('aria-selected', 'true');
      tabInput.classList.remove('active');
      tabInput.setAttribute('aria-selected', 'false');
      panelPreview.classList.remove('hidden-mobile');
      panelInput.classList.add('hidden-mobile');
    }
  }

  // --- isMobile判定 ---
  function isMobile() {
    return window.innerWidth < 768;
  }

  // --- 初期化 ---
  function init() {
    // 初期フォントクラス設定
    tateArea.classList.add('font-mincho', 'lh-normal');

    // モバイルでは入力パネルのみ表示
    if (isMobile()) {
      panelPreview.classList.add('hidden-mobile');
    }

    // イベントリスナー
    inputText.addEventListener('input', updatePreview);
    fontSizeSelect.addEventListener('change', function () {
      applyFontSize();
      applyCharsPerLine();
    });
    charsPerLine.addEventListener('change', applyCharsPerLine);
    fontFamilySel.addEventListener('change', applyFontFamily);
    lineHeightSel.addEventListener('change', function () {
      applyLineHeight();
      applyCharsPerLine();
    });

    btnSample.addEventListener('click', function () {
      inputText.value = SAMPLE_TEXT;
      updatePreview();
      // モバイルならプレビュータブへ自動切り替え
      if (isMobile()) switchTab('preview');
    });

    tabInput.addEventListener('click', function () {
      switchTab('input');
    });

    tabPreview.addEventListener('click', function () {
      switchTab('preview');
      updatePreview();
    });

    // リサイズ時にPC⇔モバイル切り替え
    window.addEventListener('resize', function () {
      if (!isMobile()) {
        panelInput.classList.remove('hidden-mobile');
        panelPreview.classList.remove('hidden-mobile');
      } else {
        const activeTab = tabInput.classList.contains('active') ? 'input' : 'preview';
        if (activeTab === 'input') {
          panelPreview.classList.add('hidden-mobile');
        } else {
          panelInput.classList.add('hidden-mobile');
        }
      }
    });

    // 初回レンダリング
    applyAllSettings();
    updatePreview();
  }

  // DOMContentLoaded後に起動
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
