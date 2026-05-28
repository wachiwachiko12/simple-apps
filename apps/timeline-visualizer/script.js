'use strict';

(function () {
  const STORAGE_KEY = 'timeline-visualizer.v1';

  /* ========================================================
   *  DATA MODEL
   * ====================================================== */
  let events = [];   // { id, title, date, category, color, desc }
  let editingId = null;
  let currentLayout = 'horizontal';

  function nextId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function loadEvents() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) events = JSON.parse(raw);
    } catch (e) {
      events = [];
    }
  }

  function saveEvents() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
    } catch (e) {
      console.warn('localStorage save failed', e);
    }
  }

  function sortedEvents() {
    return events.slice().sort((a, b) => a.date.localeCompare(b.date));
  }

  /* ========================================================
   *  DOM REFERENCES
   * ====================================================== */
  const form          = document.getElementById('event-form');
  const inputTitle    = document.getElementById('event-title');
  const inputDate     = document.getElementById('event-date');
  const inputCategory = document.getElementById('event-category');
  const inputColor    = document.getElementById('event-color');
  const inputDesc     = document.getElementById('event-desc');
  const btnAddEvent   = document.getElementById('btn-add-event');
  const btnCancelEdit = document.getElementById('btn-cancel-edit');
  const btnSample     = document.getElementById('btn-sample');
  const formError     = document.getElementById('form-error');

  const timelineEmpty   = document.getElementById('timeline-empty');
  const timelineCanvas  = document.getElementById('timeline-canvas');
  const timelineInner   = document.getElementById('timeline-inner');
  const eventListSection = document.getElementById('event-list-section');
  const eventList       = document.getElementById('event-list');

  const btnHorizontal = document.getElementById('btn-horizontal');
  const btnVertical   = document.getElementById('btn-vertical');
  const btnPng        = document.getElementById('btn-png');
  const btnExportJson = document.getElementById('btn-export-json');
  const btnImportInput = document.getElementById('import-json-input');
  const btnClear      = document.getElementById('btn-clear');

  const categoryDatalist = document.getElementById('category-list');
  const presetColors  = document.getElementById('preset-colors');

  /* ========================================================
   *  TOAST
   * ====================================================== */
  let toastEl = null;
  let toastTimer = null;

  function showToast(msg) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'toast';
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2500);
  }

  /* ========================================================
   *  CATEGORY DATALIST
   * ====================================================== */
  function updateCategoryDatalist() {
    const cats = [...new Set(events.map(e => e.category).filter(Boolean))];
    categoryDatalist.innerHTML = cats.map(c => `<option value="${escHtml(c)}">`).join('');
  }

  /* ========================================================
   *  FORM HANDLING
   * ====================================================== */
  function setError(msg) {
    formError.textContent = msg;
  }

  function clearError() {
    formError.textContent = '';
  }

  function resetForm() {
    form.reset();
    inputColor.value = '#3b82f6';
    document.querySelectorAll('.color-preset.selected').forEach(b => b.classList.remove('selected'));
    editingId = null;
    btnAddEvent.textContent = 'イベントを追加';
    btnCancelEdit.style.display = 'none';
    clearError();
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    clearError();

    const title = inputTitle.value.trim();
    const date  = inputDate.value;

    if (!title) {
      setError('タイトルを入力してください。');
      inputTitle.focus();
      return;
    }
    if (!date) {
      setError('日付を選択してください。');
      inputDate.focus();
      return;
    }

    if (editingId) {
      const idx = events.findIndex(ev => ev.id === editingId);
      if (idx !== -1) {
        events[idx] = {
          id: editingId,
          title,
          date,
          category: inputCategory.value.trim(),
          color: inputColor.value,
          desc: inputDesc.value.trim(),
        };
      }
      showToast('イベントを更新しました');
    } else {
      events.push({
        id: nextId(),
        title,
        date,
        category: inputCategory.value.trim(),
        color: inputColor.value,
        desc: inputDesc.value.trim(),
      });
      showToast('イベントを追加しました');
    }

    saveEvents();
    resetForm();
    render();
  });

  btnCancelEdit.addEventListener('click', () => {
    resetForm();
  });

  /* preset color buttons */
  presetColors.addEventListener('click', (e) => {
    const btn = e.target.closest('.color-preset');
    if (!btn) return;
    inputColor.value = btn.dataset.color;
    document.querySelectorAll('.color-preset.selected').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
  });

  /* ========================================================
   *  SAMPLE DATA
   * ====================================================== */
  const SAMPLE_EVENTS = [
    { id: 's1', title: 'プロジェクト開始',   date: '2024-01-10', category: 'マイルストーン', color: '#3b82f6', desc: 'プロジェクトキックオフ。チーム編成完了。' },
    { id: 's2', title: '要件定義完了',        date: '2024-02-05', category: 'マイルストーン', color: '#10b981', desc: 'ステークホルダーのサインオフ取得。' },
    { id: 's3', title: 'デザインレビュー',    date: '2024-03-01', category: 'レビュー',       color: '#f59e0b', desc: 'UIプロトタイプのフィードバック収集。' },
    { id: 's4', title: '開発フェーズ開始',    date: '2024-04-15', category: '開発',           color: '#8b5cf6', desc: 'バックエンド・フロントエンド並行開発スタート。' },
    { id: 's5', title: 'α版リリース',         date: '2024-06-20', category: 'リリース',       color: '#ef4444', desc: '社内向けαテスト開始。' },
    { id: 's6', title: 'β版公開',             date: '2024-08-01', category: 'リリース',       color: '#ec4899', desc: '限定ユーザーにβ版を公開。' },
    { id: 's7', title: '正式リリース',         date: '2024-09-30', category: 'マイルストーン', color: '#3b82f6', desc: '一般公開。プレスリリース配信。' },
  ];

  btnSample.addEventListener('click', () => {
    if (events.length > 0) {
      if (!confirm('現在のイベントを削除してサンプルデータを読み込みますか？')) return;
    }
    events = SAMPLE_EVENTS.map(e => ({ ...e }));
    saveEvents();
    render();
    showToast('サンプルデータを読み込みました');
  });

  /* ========================================================
   *  LAYOUT TOGGLE
   * ====================================================== */
  btnHorizontal.addEventListener('click', () => {
    currentLayout = 'horizontal';
    btnHorizontal.classList.add('active');
    btnHorizontal.setAttribute('aria-pressed', 'true');
    btnVertical.classList.remove('active');
    btnVertical.setAttribute('aria-pressed', 'false');
    renderTimeline();
  });

  btnVertical.addEventListener('click', () => {
    currentLayout = 'vertical';
    btnVertical.classList.add('active');
    btnVertical.setAttribute('aria-pressed', 'true');
    btnHorizontal.classList.remove('active');
    btnHorizontal.setAttribute('aria-pressed', 'false');
    renderTimeline();
  });

  /* ========================================================
   *  CLEAR
   * ====================================================== */
  btnClear.addEventListener('click', () => {
    if (events.length === 0) return;
    if (!confirm('全イベントを削除しますか？この操作は取り消せません。')) return;
    events = [];
    saveEvents();
    resetForm();
    render();
    showToast('全イベントを削除しました');
  });

  /* ========================================================
   *  JSON EXPORT / IMPORT
   * ====================================================== */
  btnExportJson.addEventListener('click', () => {
    if (events.length === 0) { showToast('エクスポートするイベントがありません'); return; }
    const json = JSON.stringify({ version: 1, events }, null, 2);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'timeline-' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('JSONをエクスポートしました');
  });

  btnImportInput.addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      let imported = [];
      if (Array.isArray(parsed)) {
        imported = parsed;
      } else if (parsed.events && Array.isArray(parsed.events)) {
        imported = parsed.events;
      } else {
        throw new Error('invalid format');
      }
      events = imported.map(ev => ({
        id:       ev.id       || nextId(),
        title:    ev.title    || '無題',
        date:     ev.date     || '',
        category: ev.category || '',
        color:    ev.color    || '#3b82f6',
        desc:     ev.desc     || '',
      })).filter(ev => ev.date);
      saveEvents();
      render();
      showToast(`${events.length}件のイベントをインポートしました`);
    } catch (err) {
      alert('インポートに失敗しました。正しいJSONファイルを選択してください。');
    } finally {
      btnImportInput.value = '';
    }
  });

  /* ========================================================
   *  PNG EXPORT
   * ====================================================== */
  btnPng.addEventListener('click', async () => {
    if (events.length === 0) { showToast('エクスポートするイベントがありません'); return; }
    if (typeof html2canvas === 'undefined') {
      showToast('PNG出力ライブラリを読み込み中です。しばらくお待ちください。');
      return;
    }
    try {
      document.body.classList.add('exporting');
      const canvas = await html2canvas(timelineInner, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        logging: false,
      });
      document.body.classList.remove('exporting');
      const url = canvas.toDataURL('image/png');
      const a   = document.createElement('a');
      a.href     = url;
      a.download = 'timeline-' + new Date().toISOString().slice(0, 10) + '.png';
      a.click();
      showToast('PNG画像を保存しました');
    } catch (err) {
      document.body.classList.remove('exporting');
      alert('PNG出力に失敗しました: ' + err.message);
    }
  });

  /* ========================================================
   *  UTILITY
   * ====================================================== */
  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${y}年${parseInt(m)}月${parseInt(d)}日`;
  }

  function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  /* ========================================================
   *  TIMELINE RENDER — HORIZONTAL
   * ====================================================== */
  function renderHorizontal(sorted) {
    timelineInner.className = 'timeline-inner horizontal';
    timelineInner.innerHTML = '';

    const axis = document.createElement('div');
    axis.className = 'tl-axis';
    timelineInner.appendChild(axis);

    const eventsWrap = document.createElement('div');
    eventsWrap.className = 'tl-events';

    sorted.forEach((ev, i) => {
      const position = i % 2 === 0 ? 'above' : 'below';
      const wrap = document.createElement('div');
      wrap.className = `tl-event-wrap ${position}`;
      wrap.dataset.id = ev.id;

      const card = buildCard(ev, 'horizontal');
      const stem = document.createElement('div');
      stem.className = 'tl-stem';
      const dot  = document.createElement('div');
      dot.className = 'tl-dot';
      dot.style.background = ev.color || '#3b82f6';

      wrap.appendChild(card);
      wrap.appendChild(stem);
      wrap.appendChild(dot);
      eventsWrap.appendChild(wrap);
    });

    timelineInner.appendChild(eventsWrap);
  }

  /* ========================================================
   *  TIMELINE RENDER — VERTICAL
   * ====================================================== */
  function renderVertical(sorted) {
    timelineInner.className = 'timeline-inner vertical';
    timelineInner.innerHTML = '';

    const axis = document.createElement('div');
    axis.className = 'tl-axis';
    timelineInner.appendChild(axis);

    const eventsWrap = document.createElement('div');
    eventsWrap.className = 'tl-events';

    sorted.forEach((ev) => {
      const wrap = document.createElement('div');
      wrap.className = 'tl-event-wrap';
      wrap.dataset.id = ev.id;

      const dot  = document.createElement('div');
      dot.className = 'tl-dot';
      dot.style.background = ev.color || '#3b82f6';

      const stem = document.createElement('div');
      stem.className = 'tl-stem';

      const card = buildCard(ev, 'vertical');

      wrap.appendChild(dot);
      wrap.appendChild(stem);
      wrap.appendChild(card);
      eventsWrap.appendChild(wrap);
    });

    timelineInner.appendChild(eventsWrap);
  }

  /* ========================================================
   *  BUILD CARD ELEMENT
   * ====================================================== */
  function buildCard(ev, layout) {
    const card = document.createElement('div');
    card.className = 'tl-card';
    card.style.borderLeftColor = ev.color || '#3b82f6';
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', `${ev.title} ${formatDate(ev.date)}`);

    const dateEl = document.createElement('div');
    dateEl.className = 'tl-card-date';
    dateEl.textContent = formatDate(ev.date);

    const titleEl = document.createElement('div');
    titleEl.className = 'tl-card-title';
    titleEl.textContent = ev.title;

    card.appendChild(dateEl);
    card.appendChild(titleEl);

    if (ev.category) {
      const cat = document.createElement('span');
      cat.className = 'tl-card-category';
      cat.style.background = ev.color || '#3b82f6';
      cat.textContent = ev.category;
      card.appendChild(cat);
    }

    if (ev.desc) {
      const desc = document.createElement('div');
      desc.className = 'tl-card-desc';
      desc.textContent = ev.desc;
      card.appendChild(desc);
    }

    /* クリック→編集フォームにセット */
    card.addEventListener('click', () => startEdit(ev.id));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); startEdit(ev.id); }
    });

    return card;
  }

  /* ========================================================
   *  EVENT LIST RENDER
   * ====================================================== */
  function renderEventList(sorted) {
    if (sorted.length === 0) {
      eventListSection.style.display = 'none';
      return;
    }
    eventListSection.style.display = 'block';
    eventList.innerHTML = '';

    sorted.forEach((ev) => {
      const item = document.createElement('div');
      item.className = 'event-item';
      item.style.borderLeftColor = ev.color || '#3b82f6';

      const info = document.createElement('div');
      info.className = 'event-item-info';

      const titleEl = document.createElement('div');
      titleEl.className = 'event-item-title';
      titleEl.textContent = ev.title;

      const meta = document.createElement('div');
      meta.className = 'event-item-meta';
      meta.textContent = formatDate(ev.date) + (ev.category ? ' ・ ' + ev.category : '');

      info.appendChild(titleEl);
      info.appendChild(meta);

      const actions = document.createElement('div');
      actions.className = 'event-item-actions';

      const editBtn = document.createElement('button');
      editBtn.className = 'btn-edit';
      editBtn.textContent = '編集';
      editBtn.setAttribute('aria-label', `${ev.title}を編集`);
      editBtn.addEventListener('click', () => startEdit(ev.id));

      const delBtn = document.createElement('button');
      delBtn.className = 'btn-delete';
      delBtn.textContent = '削除';
      delBtn.setAttribute('aria-label', `${ev.title}を削除`);
      delBtn.addEventListener('click', () => deleteEvent(ev.id));

      actions.appendChild(editBtn);
      actions.appendChild(delBtn);
      item.appendChild(info);
      item.appendChild(actions);
      eventList.appendChild(item);
    });
  }

  /* ========================================================
   *  EDIT / DELETE
   * ====================================================== */
  function startEdit(id) {
    const ev = events.find(e => e.id === id);
    if (!ev) return;
    editingId = id;
    inputTitle.value    = ev.title;
    inputDate.value     = ev.date;
    inputCategory.value = ev.category;
    inputColor.value    = ev.color;
    inputDesc.value     = ev.desc;
    btnAddEvent.textContent = 'イベントを更新';
    btnCancelEdit.style.display = 'inline-flex';

    /* preset color active state */
    document.querySelectorAll('.color-preset').forEach(b => {
      b.classList.toggle('selected', b.dataset.color === ev.color);
    });

    /* フォームまでスクロール */
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    inputTitle.focus();
  }

  function deleteEvent(id) {
    const ev = events.find(e => e.id === id);
    if (!ev) return;
    if (!confirm(`「${ev.title}」を削除しますか？`)) return;
    events = events.filter(e => e.id !== id);
    if (editingId === id) resetForm();
    saveEvents();
    render();
    showToast('イベントを削除しました');
  }

  /* ========================================================
   *  MAIN RENDER
   * ====================================================== */
  function renderTimeline() {
    const sorted = sortedEvents();
    if (sorted.length === 0) {
      timelineEmpty.style.display = 'block';
      timelineCanvas.style.display = 'none';
      return;
    }
    timelineEmpty.style.display = 'none';
    timelineCanvas.style.display = 'block';

    if (currentLayout === 'horizontal') {
      renderHorizontal(sorted);
    } else {
      renderVertical(sorted);
    }
  }

  function render() {
    const sorted = sortedEvents();
    renderTimeline();
    renderEventList(sorted);
    updateCategoryDatalist();
  }

  /* ========================================================
   *  BOOT
   * ====================================================== */
  document.addEventListener('DOMContentLoaded', () => {
    loadEvents();
    render();
  });

})();
