'use strict';

/* ===== データモデル ===== */
const BASIC_KEYS = ['name','name-kana','birthday','address','tel','email','nearest-station','linkedin','github'];
const HOPE_KEYS  = ['hope-job','hope-location','hope-salary'];
const TEXT_KEYS  = ['summary','certifications'];

let careers = [];
let tags = { prog: [], tool: [], lang: [] };

// エンジニア特化フィールド用定数
const PHASE_VALUES = ['要件定義','基本設計','詳細設計','実装','テスト','運用保守'];
const ENV_VALUES   = ['AWS','GCP','Azure','Docker','Linux','Windows','Mac'];

/* ===== 初期化 ===== */
function init() {
  loadData();
  renderCareerList();
  renderTagInputs();
  bindEvents();
  setCreatedDate();
  updatePreview();
}

function setCreatedDate() {
  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth() + 1;
  const d = today.getDate();
  setText('p-created-date', `${y}年${m}月${d}日 作成`);
}

/* ===== LocalStorage ===== */
const LS_KEY = 'resume-gen-v1';

function saveData() {
  const data = {
    basic: {},
    hope: {},
    summary: document.getElementById('summary').value,
    certifications: document.getElementById('certifications').value,
    projScale: (document.getElementById('proj-scale') || {}).value || '',
    phases: getCheckedValues('phase-group'),
    envs: getCheckedValues('env-group'),
    careers,
    tags,
  };
  BASIC_KEYS.forEach(k => {
    const el = document.getElementById(k);
    if (el) data.basic[k] = el.value;
  });
  HOPE_KEYS.forEach(k => {
    const el = document.getElementById(k);
    if (el) data.hope[k] = el.value;
  });
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  } catch(e) {}
}

function loadData() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (data.basic) {
      BASIC_KEYS.forEach(k => {
        const el = document.getElementById(k);
        if (el && data.basic[k] !== undefined) el.value = data.basic[k];
      });
    }
    if (data.hope) {
      HOPE_KEYS.forEach(k => {
        const el = document.getElementById(k);
        if (el && data.hope[k] !== undefined) el.value = data.hope[k];
      });
    }
    if (data.summary !== undefined) document.getElementById('summary').value = data.summary;
    if (data.certifications !== undefined) document.getElementById('certifications').value = data.certifications;
    const psEl = document.getElementById('proj-scale');
    if (psEl && data.projScale !== undefined) psEl.value = data.projScale;
    if (Array.isArray(data.phases)) setCheckedValues('phase-group', data.phases);
    if (Array.isArray(data.envs))   setCheckedValues('env-group',   data.envs);
    if (Array.isArray(data.careers)) careers = data.careers;
    if (data.tags) tags = Object.assign({ prog: [], tool: [], lang: [] }, data.tags);
  } catch(e) {}
}

/* ===== タブ切り替え ===== */
function bindEvents() {
  // タブ
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    });
  });

  // 基本情報・希望条件フィールド
  [...BASIC_KEYS, ...HOPE_KEYS].forEach(k => {
    const el = document.getElementById(k);
    if (el) el.addEventListener('input', () => { saveData(); updatePreview(); });
  });

  // 職務要約
  const summaryEl = document.getElementById('summary');
  summaryEl.addEventListener('input', () => {
    document.getElementById('summary-count').textContent = summaryEl.value.length + ' 文字';
    saveData();
    updatePreview();
  });

  // 資格
  document.getElementById('certifications').addEventListener('input', () => {
    saveData();
    updatePreview();
  });

  // proj-scale
  const projScaleEl = document.getElementById('proj-scale');
  if (projScaleEl) projScaleEl.addEventListener('input', () => { saveData(); updatePreview(); });

  // チェックボックス群（担当フェーズ・開発環境）
  ['phase-group','env-group'].forEach(gid => {
    const g = document.getElementById(gid);
    if (!g) return;
    g.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      cb.addEventListener('change', () => { saveData(); updatePreview(); });
    });
  });

  // 職歴追加ボタン
  document.getElementById('add-career').addEventListener('click', () => {
    careers.push({
      company: '',
      type: '正社員',
      projectName: '',
      from: '',
      to: '',
      current: false,
      duties: '',
      achievements: '',
    });
    renderCareerList();
    saveData();
    updatePreview();
  });

  // タグ入力
  bindTagInput('prog-input', 'prog');
  bindTagInput('tool-input', 'tool');
  bindTagInput('lang-input', 'lang');
}

/* ===== タグ入力 ===== */
function bindTagInput(inputId, category) {
  const input = document.getElementById(inputId);
  input.addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ',' ) && input.value.trim()) {
      e.preventDefault();
      const val = input.value.trim().replace(/,$/, '');
      if (val && !tags[category].includes(val)) {
        tags[category].push(val);
        input.value = '';
        renderTagInputs();
        saveData();
        updatePreview();
      }
    }
    // Backspace で末尾タグ削除
    if (e.key === 'Backspace' && input.value === '' && tags[category].length > 0) {
      tags[category].pop();
      renderTagInputs();
      saveData();
      updatePreview();
    }
  });
}

function renderTagInputs() {
  renderTagList('prog-tags', 'prog');
  renderTagList('tool-tags', 'tool');
  renderTagList('lang-tags', 'lang');
}

function renderTagList(containerId, category) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  tags[category].forEach((tag, i) => {
    const badge = document.createElement('span');
    badge.className = 'tag-badge';
    badge.innerHTML = esc(tag) + `<button type="button" aria-label="${esc(tag)}を削除" data-cat="${category}" data-i="${i}">×</button>`;
    container.appendChild(badge);
  });
  container.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      tags[btn.dataset.cat].splice(+btn.dataset.i, 1);
      renderTagInputs();
      saveData();
      updatePreview();
    });
  });
}

/* ===== 職歴フォーム ===== */
function renderCareerList() {
  const list = document.getElementById('career-list');
  list.innerHTML = '';

  careers.forEach((career, i) => {
    const div = document.createElement('div');
    div.className = 'career-entry';
    const isFreelance = career.type === '業務委託（フリーランス）';
    div.innerHTML = `
      <div class="career-entry-head">
        <span class="career-entry-num">職歴 ${i + 1}</span>
        ${careers.length > 0 ? `<button class="remove-career-btn" data-i="${i}">削除</button>` : ''}
      </div>
      <label>会社名・屋号</label>
      <input type="text" class="ce-company" data-i="${i}" value="${esc(career.company)}" placeholder="〇〇株式会社">
      <label>雇用形態</label>
      <select class="ce-type" data-i="${i}">
        <option value="正社員" ${career.type === '正社員' ? 'selected' : ''}>正社員</option>
        <option value="契約社員" ${career.type === '契約社員' ? 'selected' : ''}>契約社員</option>
        <option value="派遣社員" ${career.type === '派遣社員' ? 'selected' : ''}>派遣社員</option>
        <option value="業務委託（フリーランス）" ${isFreelance ? 'selected' : ''}>業務委託（フリーランス）</option>
        <option value="アルバイト・パート" ${career.type === 'アルバイト・パート' ? 'selected' : ''}>アルバイト・パート</option>
        <option value="その他" ${career.type === 'その他' ? 'selected' : ''}>その他</option>
      </select>
      <div class="freelance-row" style="${isFreelance ? '' : 'display:none'}">
        <label>案件名</label>
        <input type="text" class="ce-project-name" data-i="${i}" value="${esc(career.projectName || '')}" placeholder="例: ECサイトリニューアル案件">
      </div>
      <label>在籍期間</label>
      <div class="career-period">
        <input type="month" class="ce-from" data-i="${i}" value="${esc(career.from)}">
        <span>〜</span>
        <input type="month" class="ce-to" data-i="${i}" value="${esc(career.to)}" ${career.current ? 'disabled' : ''}>
      </div>
      <label class="cb-label-inline"><input type="checkbox" class="ce-current" data-i="${i}" ${career.current ? 'checked' : ''}> 現在も在籍中</label>
      <label>業務内容</label>
      <textarea class="ce-duties" data-i="${i}" rows="4" placeholder="担当した業務・役割・プロジェクト内容など">${esc(career.duties)}</textarea>
      <label>実績</label>
      <textarea class="ce-achievements" data-i="${i}" rows="3" placeholder="定量的な成果・改善結果など">${esc(career.achievements)}</textarea>
    `;
    list.appendChild(div);
  });

  // イベントバインド
  list.querySelectorAll('.remove-career-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      careers.splice(+btn.dataset.i, 1);
      renderCareerList();
      saveData();
      updatePreview();
    });
  });

  const syncCareer = (e) => {
    const i = +e.target.dataset.i;
    const cls = e.target.className.split(' ')[0];
    if (cls === 'ce-company')       careers[i].company = e.target.value;
    if (cls === 'ce-type') {
      careers[i].type = e.target.value;
      // フリーランス案件行の表示切替
      const entry = list.querySelectorAll('.career-entry')[i];
      const frRow = entry && entry.querySelector('.freelance-row');
      if (frRow) frRow.style.display = e.target.value === '業務委託（フリーランス）' ? '' : 'none';
    }
    if (cls === 'ce-project-name')  careers[i].projectName = e.target.value;
    if (cls === 'ce-from')          careers[i].from = e.target.value;
    if (cls === 'ce-to')            careers[i].to = e.target.value;
    if (cls === 'ce-duties')        careers[i].duties = e.target.value;
    if (cls === 'ce-achievements')  careers[i].achievements = e.target.value;
    if (cls === 'ce-current') {
      careers[i].current = e.target.checked;
      const toInput = list.querySelector(`.ce-to[data-i="${i}"]`);
      if (toInput) toInput.disabled = e.target.checked;
    }
    saveData();
    updatePreview();
  };

  list.querySelectorAll('input, select, textarea').forEach(el => {
    el.addEventListener('input', syncCareer);
    el.addEventListener('change', syncCareer);
  });
}

/* ===== プレビュー更新 ===== */
function updatePreview() {
  const v = id => {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
  };

  // 基本情報
  setText('p-name',            v('name')            || '—');
  setText('p-name-kana',       v('name-kana')        || '—');
  setText('p-address',         v('address')          || '—');
  setText('p-tel',             v('tel')              || '—');
  setText('p-email',           v('email')            || '—');
  setText('p-nearest-station', v('nearest-station')  || '—');

  // 生年月日
  const bday = v('birthday');
  setText('p-birthday', bday ? fmtDate(bday) : '—');

  // Web links
  const linkedin = v('linkedin');
  const github   = v('github');
  const linksRow = document.getElementById('p-links-row');
  const linksCell = document.getElementById('p-links');
  if (linkedin || github) {
    linksRow.style.display = '';
    let html = '';
    if (linkedin) html += `<a href="${esc(linkedin)}" target="_blank" rel="noopener" class="links-cell">LinkedIn: ${esc(linkedin)}</a><br>`;
    if (github)   html += `<a href="${esc(github)}"   target="_blank" rel="noopener" class="links-cell">GitHub: ${esc(github)}</a>`;
    linksCell.innerHTML = html;
  } else {
    linksRow.style.display = 'none';
  }

  // 職務要約
  const summaryVal = v('summary');
  const summaryBody = document.getElementById('p-summary');
  summaryBody.textContent = summaryVal || '（職務要約を入力してください）';

  // 職務経歴（新しい順）
  const careerContainer = document.getElementById('p-career-list');
  careerContainer.innerHTML = '';
  if (careers.length === 0) {
    careerContainer.innerHTML = '<p class="empty-notice">職歴を追加してください</p>';
  } else {
    const sorted = [...careers].reverse();
    sorted.forEach(career => {
      const from = career.from ? career.from.replace('-', '年') + '月' : '—';
      const to   = career.current ? '現在' : (career.to ? career.to.replace('-', '年') + '月' : '—');
      const isFreelance = career.type === '業務委託（フリーランス）';
      const projRow = (isFreelance && career.projectName)
        ? `<div class="career-body-label">案件名</div><div class="career-body-text">${esc(career.projectName)}</div>` : '';

      const block = document.createElement('div');
      block.className = 'career-block';
      block.innerHTML = `
        <div class="career-block-head">
          <div class="career-company-name">${esc(career.company) || '（会社名未入力）'}</div>
          <div class="career-meta">${esc(career.type)} ／ ${from} 〜 ${to}</div>
        </div>
        <div class="career-block-body">
          ${projRow}
          ${career.duties ? `<div class="career-body-label">業務内容</div><div class="career-body-text">${esc(career.duties)}</div>` : ''}
          ${career.achievements ? `<div class="career-body-label">実績</div><div class="career-body-text">${esc(career.achievements)}</div>` : ''}
        </div>
      `;
      careerContainer.appendChild(block);
    });
  }

  // スキル・資格
  const skillsBody = document.getElementById('p-skills-body');
  skillsBody.innerHTML = '';

  const makeTagRow = (label, list) => {
    if (!list || list.length === 0) return;
    const row = document.createElement('div');
    row.className = 'skills-row';
    row.innerHTML = `<div class="skills-row-label">${label}</div>`;
    const tagWrap = document.createElement('div');
    tagWrap.className = 'skills-tag-list';
    list.forEach(tag => {
      const span = document.createElement('span');
      span.className = 'skill-tag';
      span.textContent = tag;
      tagWrap.appendChild(span);
    });
    row.appendChild(tagWrap);
    skillsBody.appendChild(row);
  };

  // 使用言語・フレームワーク
  makeTagRow('使用言語・フレームワーク', tags.prog);

  // 担当フェーズ（チェックボックス）
  const phases = getCheckedValues('phase-group');
  makeTagRow('担当フェーズ', phases);

  // 開発環境・OS（チェックボックス）
  const envs = getCheckedValues('env-group');
  makeTagRow('開発環境・OS', envs);

  // プロジェクト規模
  const projScale = v('proj-scale');
  if (projScale) {
    const row = document.createElement('div');
    row.className = 'skills-row';
    row.innerHTML = `<div class="skills-row-label">プロジェクト規模</div><div class="career-body-text">${esc(projScale)}</div>`;
    skillsBody.appendChild(row);
  }

  // ツール・環境
  makeTagRow('ツール・環境', tags.tool);

  // 語学
  makeTagRow('語学', tags.lang);

  const certs = v('certifications');
  if (certs) {
    const row = document.createElement('div');
    row.className = 'skills-row';
    row.innerHTML = `<div class="skills-row-label">保有資格</div><div class="cert-text">${esc(certs)}</div>`;
    skillsBody.appendChild(row);
  }

  // 希望条件
  const hopeJob = v('hope-job');
  const hopeLoc = v('hope-location');
  const hopeSal = v('hope-salary');
  const hopeSection = document.getElementById('p-hope-section');
  if (hopeJob || hopeLoc || hopeSal) {
    hopeSection.style.display = '';
    setText('p-hope-job',      hopeJob || '—');
    setText('p-hope-location', hopeLoc || '—');
    setText('p-hope-salary',   hopeSal || '—');
  } else {
    hopeSection.style.display = 'none';
  }
}

/* ===== ユーティリティ ===== */
function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function fmtDate(str) {
  if (!str) return '—';
  const [y, m, d] = str.split('-');
  return `${y}年${parseInt(m)}月${parseInt(d)}日`;
}

function esc(str) {
  return (str || '')
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

/* ===== モバイルビュー切り替え ===== */
function mobileShowPreview() {
  updatePreview();
  document.querySelector('.app-layout').classList.add('show-preview');
  document.getElementById('mb-form-btn').classList.remove('active');
  document.getElementById('mb-preview-btn').classList.add('active');
  window.scrollTo(0, 0);
}

function mobileShowForm() {
  document.querySelector('.app-layout').classList.remove('show-preview');
  document.getElementById('mb-form-btn').classList.add('active');
  document.getElementById('mb-preview-btn').classList.remove('active');
  window.scrollTo(0, 0);
}

/* ===== チェックボックス ユーティリティ ===== */
function getCheckedValues(groupId) {
  const g = document.getElementById(groupId);
  if (!g) return [];
  return Array.from(g.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);
}

function setCheckedValues(groupId, values) {
  const g = document.getElementById(groupId);
  if (!g || !Array.isArray(values)) return;
  g.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.checked = values.includes(cb.value);
  });
}

document.addEventListener('DOMContentLoaded', init);
