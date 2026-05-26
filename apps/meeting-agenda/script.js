/**
 * 会議アジェンダ・議事録テンプレートビルダー
 * Vanilla JS — localStorage自動保存・リアルタイムプレビュー
 */

'use strict';

// =============================================
// テンプレートデータ
// =============================================
const TEMPLATES = {
  free: {
    label: 'フリー',
    agenda: []
  },
  regular: {
    label: '定例会議',
    agenda: [
      { title: '前回議事録の確認', owner: '', duration: 5, memo: '' },
      { title: 'KPI・進捗報告', owner: '', duration: 15, memo: '' },
      { title: '課題・リスク共有', owner: '', duration: 15, memo: '' },
      { title: '次回アクション確認', owner: '', duration: 10, memo: '' },
      { title: '連絡事項・その他', owner: '', duration: 5, memo: '' }
    ]
  },
  kickoff: {
    label: 'キックオフ',
    agenda: [
      { title: 'プロジェクト概要・背景説明', owner: '', duration: 10, memo: '' },
      { title: 'ゴール・スコープの確認', owner: '', duration: 15, memo: '' },
      { title: 'チームメンバー・役割紹介', owner: '', duration: 10, memo: '' },
      { title: 'スケジュール・マイルストーン確認', owner: '', duration: 15, memo: '' },
      { title: 'コミュニケーションルール・ツール決定', owner: '', duration: 10, memo: '' },
      { title: 'Q&A・懸念事項', owner: '', duration: 10, memo: '' }
    ]
  },
  retro: {
    label: '振り返り（レトロ）',
    agenda: [
      { title: 'チェックイン（全員ひとこと）', owner: '', duration: 5, memo: '' },
      { title: 'Keep（続けるべきこと）', owner: '', duration: 10, memo: '' },
      { title: 'Problem（問題・課題）', owner: '', duration: 10, memo: '' },
      { title: 'Try（試してみること）', owner: '', duration: 15, memo: '' },
      { title: 'アクションアイテム決定', owner: '', duration: 10, memo: '' }
    ]
  }
};

// =============================================
// 状態管理
// =============================================
let state = {
  template: 'free',
  title: '',
  date: '',
  duration: '',
  location: '',
  url: '',
  organizer: '',
  attendees: '',
  agenda: []
};

// =============================================
// DOM参照
// =============================================
const $ = id => document.getElementById(id);

const dom = {
  title:      $('meeting-title'),
  date:       $('meeting-date'),
  duration:   $('meeting-duration'),
  location:   $('meeting-location'),
  url:        $('meeting-url'),
  organizer:  $('meeting-organizer'),
  attendees:  $('meeting-attendees'),
  agendaList: $('agenda-list'),
  totalTime:  $('total-time'),
  previewContent: $('preview-content'),
  printBtn:   $('print-btn'),
  clearBtn:   $('clear-btn'),
  addBtn:     $('add-agenda-btn'),
  inputPanel:   $('panel-input'),
  previewPanel: $('panel-preview')
};

// =============================================
// localStorage
// =============================================
const STORAGE_KEY = 'meeting-agenda-v1';

function saveToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    // ストレージが使えない場合は無視
  }
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      Object.assign(state, saved);
    }
  } catch (e) {
    // 読み込み失敗時は初期状態
  }
}

// =============================================
// 状態→DOM反映
// =============================================
function syncDomFromState() {
  dom.title.value     = state.title;
  dom.date.value      = state.date;
  dom.duration.value  = state.duration;
  dom.location.value  = state.location;
  dom.url.value       = state.url;
  dom.organizer.value = state.organizer;
  dom.attendees.value = state.attendees;

  // テンプレートボタン
  document.querySelectorAll('.template-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.template === state.template);
  });

  renderAgendaList();
  renderPreview();
}

// =============================================
// アジェンダリスト描画
// =============================================
function renderAgendaList() {
  dom.agendaList.innerHTML = '';
  state.agenda.forEach((item, idx) => {
    const el = createAgendaItemEl(item, idx);
    dom.agendaList.appendChild(el);
  });
  updateTotalTime();
}

function createAgendaItemEl(item, idx) {
  const div = document.createElement('div');
  div.className = 'agenda-item';
  div.dataset.index = idx;

  div.innerHTML = `
    <div class="agenda-item-header">
      <span class="agenda-num">${idx + 1}</span>
      <input
        class="agenda-title-input"
        type="text"
        placeholder="議題名"
        value="${escapeHtml(item.title)}"
        aria-label="議題名 ${idx + 1}"
      >
      <div class="agenda-item-controls">
        <button class="agenda-ctrl-btn move-up" data-idx="${idx}" title="上へ" aria-label="上へ移動">▲</button>
        <button class="agenda-ctrl-btn move-down" data-idx="${idx}" title="下へ" aria-label="下へ移動">▼</button>
        <button class="agenda-ctrl-btn delete" data-idx="${idx}" title="削除" aria-label="削除">✕</button>
      </div>
    </div>
    <div class="agenda-item-meta">
      <div class="form-group">
        <span class="agenda-meta-label">担当者</span>
        <input type="text" class="agenda-owner" placeholder="例：山田" value="${escapeHtml(item.owner)}" aria-label="担当者 ${idx + 1}">
      </div>
      <div class="form-group">
        <span class="agenda-meta-label">所要時間（分）</span>
        <input type="number" class="agenda-duration" placeholder="5" min="1" max="240" value="${item.duration || ''}" aria-label="所要時間 ${idx + 1} 分">
      </div>
    </div>
    <div class="agenda-memo-area form-group">
      <span class="agenda-meta-label">メモ</span>
      <textarea class="agenda-memo" placeholder="補足・目的・資料リンクなど" aria-label="メモ ${idx + 1}">${escapeHtml(item.memo)}</textarea>
    </div>
  `;

  // イベント
  div.querySelector('.agenda-title-input').addEventListener('input', e => {
    state.agenda[idx].title = e.target.value;
    onStateChange();
  });
  div.querySelector('.agenda-owner').addEventListener('input', e => {
    state.agenda[idx].owner = e.target.value;
    onStateChange();
  });
  div.querySelector('.agenda-duration').addEventListener('input', e => {
    state.agenda[idx].duration = parseInt(e.target.value, 10) || 0;
    updateTotalTime();
    saveToStorage();
    renderPreview();
  });
  div.querySelector('.agenda-memo').addEventListener('input', e => {
    state.agenda[idx].memo = e.target.value;
    onStateChange();
  });
  div.querySelector('.move-up').addEventListener('click', () => moveAgenda(idx, -1));
  div.querySelector('.move-down').addEventListener('click', () => moveAgenda(idx, 1));
  div.querySelector('.delete').addEventListener('click', () => deleteAgenda(idx));

  return div;
}

function moveAgenda(idx, dir) {
  const newIdx = idx + dir;
  if (newIdx < 0 || newIdx >= state.agenda.length) return;
  const arr = state.agenda;
  [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
  onStateChange();
  renderAgendaList();
}

function deleteAgenda(idx) {
  state.agenda.splice(idx, 1);
  onStateChange();
  renderAgendaList();
}

function addAgenda() {
  state.agenda.push({ title: '', owner: '', duration: 0, memo: '' });
  onStateChange();
  renderAgendaList();
  // 追加した項目のタイトル入力にフォーカス
  const items = dom.agendaList.querySelectorAll('.agenda-item');
  const last = items[items.length - 1];
  if (last) {
    const input = last.querySelector('.agenda-title-input');
    if (input) {
      input.focus();
      input.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
}

function updateTotalTime() {
  const total = state.agenda.reduce((sum, item) => sum + (item.duration || 0), 0);
  dom.totalTime.textContent = total;
}

// =============================================
// プレビュー描画
// =============================================
function renderPreview() {
  const s = state;
  const hasTitle = s.title.trim() !== '';

  if (!hasTitle && s.agenda.length === 0) {
    dom.previewContent.innerHTML = `<p class="pv-empty">左の入力パネルに会議情報を入力するとプレビューが表示されます。</p>`;
    return;
  }

  const title = s.title || '（タイトル未入力）';

  // 日時フォーマット
  let dateStr = '';
  if (s.date) {
    const d = new Date(s.date);
    dateStr = `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日（${['日','月','火','水','木','金','土'][d.getDay()]}）${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  }

  // メタ情報テーブル
  const metaRows = [
    ['日時',   dateStr || '—'],
    ['場所',   s.location || '—'],
    s.url ? ['会議URL', `<a href="${escapeHtml(s.url)}">${escapeHtml(s.url)}</a>`] : null,
    ['主催者', s.organizer || '—'],
    ['参加者', s.attendees || '—'],
    s.duration ? ['予定時間', `${s.duration} 分`] : null
  ].filter(Boolean);

  const metaHtml = metaRows.map(([k, v]) =>
    `<tr><th>${k}</th><td>${v}</td></tr>`
  ).join('');

  // アジェンダテーブル
  let agendaHtml = '';
  if (s.agenda.length > 0) {
    const rows = s.agenda.map((item, i) => {
      return `<tr>
        <td style="text-align:center;white-space:nowrap">${i + 1}</td>
        <td>${escapeHtml(item.title) || '—'}</td>
        <td style="text-align:center;white-space:nowrap">${item.owner ? escapeHtml(item.owner) : '—'}</td>
        <td style="text-align:center;white-space:nowrap">${item.duration ? item.duration + '分' : '—'}</td>
        <td style="color:#64748b;font-size:.8em">${escapeHtml(item.memo) || ''}</td>
      </tr>`;
    }).join('');

    const total = s.agenda.reduce((sum, a) => sum + (a.duration || 0), 0);

    agendaHtml = `
      <div class="pv-agenda-heading">アジェンダ</div>
      <table class="pv-agenda-table">
        <thead>
          <tr>
            <th>#</th>
            <th>議題</th>
            <th>担当者</th>
            <th>時間</th>
            <th>メモ</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p class="pv-total">合計時間: ${total} 分</p>
    `;
  }

  // 議事メモ欄（印刷時に手書きできるスペース）
  const memoSection = `
    <div class="pv-memo-section">
      <p class="pv-memo-heading">議事メモ</p>
      <div class="pv-memo-box" aria-hidden="true"></div>
    </div>
  `;

  dom.previewContent.innerHTML = `
    <div class="pv-doc">
      <p class="pv-title">${escapeHtml(title)}</p>
      <table class="pv-meta-table"><tbody>${metaHtml}</tbody></table>
      ${agendaHtml}
      ${memoSection}
    </div>
  `;
}

// =============================================
// 状態変更ハンドラ
// =============================================
function onStateChange() {
  saveToStorage();
  renderPreview();
}

// =============================================
// 入力フィールドのイベント
// =============================================
function bindInputFields() {
  const fields = [
    [dom.title,     'title'],
    [dom.date,      'date'],
    [dom.duration,  'duration'],
    [dom.location,  'location'],
    [dom.url,       'url'],
    [dom.organizer, 'organizer'],
    [dom.attendees, 'attendees']
  ];
  fields.forEach(([el, key]) => {
    el.addEventListener('input', () => {
      state[key] = el.value;
      onStateChange();
    });
  });
}

// =============================================
// テンプレートボタン
// =============================================
function bindTemplateBtns() {
  document.querySelectorAll('.template-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tpl = btn.dataset.template;
      state.template = tpl;

      // アジェンダを上書き（空でないとき確認）
      const hasData = state.agenda.some(a => a.title.trim() !== '');
      if (hasData && state.agenda.length > 0) {
        if (!confirm('テンプレートを変更するとアジェンダ項目がリセットされます。続けますか？')) return;
      }

      // テンプレートのアジェンダをディープコピー
      state.agenda = TEMPLATES[tpl].agenda.map(a => ({ ...a }));

      document.querySelectorAll('.template-btn').forEach(b =>
        b.classList.toggle('active', b === btn)
      );
      onStateChange();
      renderAgendaList();
    });
  });
}

// =============================================
// モバイルタブ
// =============================================
function bindMobileTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.toggle('active', b === btn);
        b.setAttribute('aria-selected', b === btn ? 'true' : 'false');
      });
      if (tab === 'input') {
        dom.inputPanel.classList.remove('hidden');
        dom.previewPanel.classList.remove('active');
      } else {
        dom.inputPanel.classList.add('hidden');
        dom.previewPanel.classList.add('active');
        renderPreview();
      }
    });
  });
}

// =============================================
// 印刷
// =============================================
function bindPrintBtn() {
  dom.printBtn.addEventListener('click', () => {
    // デスクトップ: preview-panelは常にdisplay:block
    // モバイル: プレビューを一時的に表示してから印刷
    window.print();
  });
}

// =============================================
// リセット
// =============================================
function bindClearBtn() {
  dom.clearBtn.addEventListener('click', () => {
    if (!confirm('入力内容をすべてリセットしますか？')) return;
    state = {
      template: 'free',
      title: '', date: '', duration: '', location: '', url: '',
      organizer: '', attendees: '',
      agenda: []
    };
    saveToStorage();
    syncDomFromState();
    renderAgendaList();
  });
}

// =============================================
// ユーティリティ
// =============================================
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

// =============================================
// 初期化
// =============================================
function init() {
  loadFromStorage();
  syncDomFromState();
  bindInputFields();
  bindTemplateBtns();
  bindMobileTabs();
  bindPrintBtn();
  dom.addBtn.addEventListener('click', addAgenda);
  bindClearBtn();

  // 初期プレビュー
  renderPreview();
}

document.addEventListener('DOMContentLoaded', init);
