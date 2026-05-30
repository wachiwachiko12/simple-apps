/* =========================================
   Markdown Slide Maker — script.js
   機能: エディタ・プレビュー・テーマ・サムネイル
         フルスクリーンプレゼン・自動保存・PDF出力
   ========================================= */

(function () {
  'use strict';

  /* ---------- 定数 ---------- */
  const STORAGE_KEY = 'markdown-slides-v1';
  const THEME_KEY   = 'markdown-slides-theme-v1';

  const SAMPLE_MD = `# Markdownスライド作成ツール

**ブラウザ完結・登録不要・無料**

---

## 主な機能

- Markdownでスライド作成
- \`---\` でスライドを区切る
- 4種類のテーマ
- フルスクリーン発表
- PDF出力対応

---

## コード例

\`\`\`js
// Hello World
console.log('こんにちは、世界！');
\`\`\`

プレゼン発表はこのツールにおまかせ。

---

## テーブル例

| 機能 | 対応 |
|------|------|
| Markdown | ✅ |
| テーマ | 4種 |
| PDF | ✅ |

---

## はじめましょう

1. 左のエディタを編集する
2. テーマを選ぶ
3. **発表開始** をクリック 🎉
`;

  /* ---------- DOM 参照 ---------- */
  const mdEditor         = document.getElementById('md-editor');
  const slidePreview     = document.getElementById('slide-preview');
  const themeSelect      = document.getElementById('theme-select');
  const btnPresent       = document.getElementById('btn-present');
  const btnPrint         = document.getElementById('btn-print');
  const btnClear         = document.getElementById('btn-clear');
  const slideCountEl     = document.getElementById('slide-count');
  const currentSlideLabel = document.getElementById('current-slide-label');
  const saveIndicator    = document.getElementById('save-indicator');
  const thumbnails       = document.getElementById('thumbnails');

  // プレビューナビゲーション
  const previewPrev      = document.getElementById('preview-prev');
  const previewNext      = document.getElementById('preview-next');

  // フルスクリーン
  const presentOverlay   = document.getElementById('present-overlay');
  const presentSlide     = document.getElementById('present-slide');
  const presentCounter   = document.getElementById('present-counter');
  const btnPrev          = document.getElementById('btn-prev');
  const btnNext          = document.getElementById('btn-next');
  const btnExit          = document.getElementById('btn-exit');

  /* ---------- 状態 ---------- */
  let slides       = [];   // パース済みスライド HTML 配列
  let currentIndex = 0;    // プレビュー表示中スライド index
  let presentIndex = 0;    // プレゼン中スライド index
  let currentTheme = 'dark';
  let saveTimer    = null;

  /* ---------- 初期化 ---------- */
  function init() {
    // marked.js 設定
    if (typeof marked !== 'undefined') {
      marked.setOptions({
        breaks: true,
        gfm: true,
      });
    }

    // テーマ復元
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme) {
      currentTheme = savedTheme;
      themeSelect.value = savedTheme;
    }

    // コンテンツ復元
    const saved = localStorage.getItem(STORAGE_KEY);
    mdEditor.value = saved || SAMPLE_MD;

    // 初回レンダリング
    render();

    // イベント登録
    mdEditor.addEventListener('input', onEditorInput);
    themeSelect.addEventListener('change', onThemeChange);
    btnPresent.addEventListener('click', startPresentation);
    btnPrint.addEventListener('click', doPrint);
    btnClear.addEventListener('click', doReset);
    previewPrev.addEventListener('click', () => navigatePreview(-1));
    previewNext.addEventListener('click', () => navigatePreview(1));

    // フルスクリーン操作
    btnPrev.addEventListener('click', () => navigatePresent(-1));
    btnNext.addEventListener('click', () => navigatePresent(1));
    btnExit.addEventListener('click', endPresentation);
    document.addEventListener('keydown', onKeyDown);

    // プレゼン中クリックで次へ（ボタン外）
    presentSlide.addEventListener('click', () => navigatePresent(1));
  }

  /* ---------- Markdown → スライド配列 ---------- */
  function parseSlides(md) {
    // 行を確認して "---" 単独行でスライドを分割
    const parts = md.split(/\n---\n|\n---$/m);
    return parts
      .map(p => p.trim())
      .filter(p => p.length > 0)
      .map(p => {
        if (typeof marked !== 'undefined') {
          const raw = marked.parse(p);
          // XSS対策: DOMPurifyが利用可能な場合はサニタイズする
          return (typeof DOMPurify !== 'undefined') ? DOMPurify.sanitize(raw) : raw;
        }
        // marked.js が読み込まれていない場合のフォールバック
        return '<pre>' + escapeHtml(p) + '</pre>';
      });
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  /* ---------- レンダリング ---------- */
  function render() {
    slides = parseSlides(mdEditor.value);
    if (slides.length === 0) {
      slides = ['<p>スライドがありません。左のエディタにMarkdownを入力してください。</p>'];
    }

    // currentIndex の範囲チェック
    if (currentIndex >= slides.length) {
      currentIndex = slides.length - 1;
    }

    // スライド枚数更新
    slideCountEl.textContent = slides.length;
    updateCurrentSlideLabel();

    // プレビュー更新
    renderPreview();

    // サムネイル更新
    renderThumbnails();
  }

  function renderPreview() {
    // テーマクラス設定
    slidePreview.className = 'slide-preview theme-' + currentTheme;
    slidePreview.innerHTML = slides[currentIndex] || '';
  }

  function renderThumbnails() {
    thumbnails.innerHTML = '';
    slides.forEach((html, i) => {
      const item = document.createElement('div');
      item.className = 'thumb-item' + (i === currentIndex ? ' active' : '');
      item.setAttribute('role', 'listitem');
      item.setAttribute('aria-label', 'スライド ' + (i + 1));
      item.setAttribute('tabindex', '0');

      const num = document.createElement('div');
      num.className = 'thumb-number';
      num.textContent = 'スライド ' + (i + 1);

      const inner = document.createElement('div');
      inner.className = 'thumb-inner theme-' + currentTheme;
      inner.innerHTML = html;

      item.appendChild(num);
      item.appendChild(inner);
      thumbnails.appendChild(item);

      // クリック / Enter でスライドを選択
      item.addEventListener('click', () => selectSlide(i));
      item.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          selectSlide(i);
        }
      });
    });
  }

  function updateCurrentSlideLabel() {
    currentSlideLabel.textContent = 'スライド ' + (currentIndex + 1) + ' / ' + slides.length;
  }

  /* ---------- スライド選択・ナビゲーション ---------- */
  function selectSlide(index) {
    currentIndex = index;
    renderPreview();
    renderThumbnails();
    updateCurrentSlideLabel();
  }

  function navigatePreview(dir) {
    const next = currentIndex + dir;
    if (next >= 0 && next < slides.length) {
      selectSlide(next);
    }
  }

  /* ---------- テーマ変更 ---------- */
  function onThemeChange() {
    currentTheme = themeSelect.value;
    localStorage.setItem(THEME_KEY, currentTheme);
    renderPreview();
    renderThumbnails();

    // フルスクリーン中もテーマを反映
    if (!presentOverlay.hidden) {
      presentSlide.className = 'present-slide theme-' + currentTheme;
    }
  }

  /* ---------- エディタ入力 ---------- */
  function onEditorInput() {
    render();
    scheduleSave();
  }

  /* ---------- 自動保存 ---------- */
  function scheduleSave() {
    if (saveTimer) clearTimeout(saveTimer);
    saveIndicator.textContent = '保存中...';
    saveIndicator.style.color = '#f59e0b';
    saveTimer = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, mdEditor.value);
      saveIndicator.textContent = '自動保存済み';
      saveIndicator.style.color = '#16a34a';
    }, 800);
  }

  /* ---------- リセット ---------- */
  function doReset() {
    if (!window.confirm('内容をリセットしてサンプルに戻しますか？')) return;
    mdEditor.value = SAMPLE_MD;
    currentIndex = 0;
    render();
    localStorage.setItem(STORAGE_KEY, SAMPLE_MD);
    saveIndicator.textContent = '自動保存済み';
    saveIndicator.style.color = '#16a34a';
  }

  /* ---------- PDF印刷 ---------- */
  function doPrint() {
    window.print();
  }

  /* ---------- フルスクリーンプレゼン ---------- */
  function startPresentation() {
    presentIndex = currentIndex;
    renderPresentSlide();
    presentOverlay.hidden = false;
    document.body.style.overflow = 'hidden';
    btnExit.focus();
  }

  function endPresentation() {
    presentOverlay.hidden = true;
    document.body.style.overflow = '';
    btnPresent.focus();
  }

  function renderPresentSlide() {
    presentSlide.className = 'present-slide theme-' + currentTheme;
    presentSlide.innerHTML = slides[presentIndex] || '';
    presentCounter.textContent = (presentIndex + 1) + ' / ' + slides.length;
  }

  function navigatePresent(dir) {
    const next = presentIndex + dir;
    if (next >= 0 && next < slides.length) {
      presentIndex = next;
      renderPresentSlide();
    }
  }

  /* ---------- キーボード操作 ---------- */
  function onKeyDown(e) {
    // フルスクリーン外はスキップ
    if (presentOverlay.hidden) return;

    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
      case ' ':
        e.preventDefault();
        navigatePresent(1);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault();
        navigatePresent(-1);
        break;
      case 'Escape':
        endPresentation();
        break;
    }
  }

  /* ---------- 起動 ---------- */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
