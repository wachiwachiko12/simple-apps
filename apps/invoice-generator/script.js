'use strict';

const SENDER_KEYS = ['s-name','s-zip','s-addr','s-tel','s-email','s-bank','s-bank-name'];
const META_KEYS   = ['inv-number','inv-date','inv-due','inv-note'];

let items = [{ name: '', qty: 1, unit: '式', price: 0 }];

/* ===== 初期化 ===== */
function init() {
  loadSavedData();
  setDefaultDates();
  renderItemRows();
  bindEvents();
  updatePreview();
}

function setDefaultDates() {
  const today = new Date();
  const fmt = d => d.toISOString().slice(0, 10);
  const due = new Date(today);
  due.setMonth(due.getMonth() + 1);

  if (!document.getElementById('inv-date').value)
    document.getElementById('inv-date').value = fmt(today);
  if (!document.getElementById('inv-due').value)
    document.getElementById('inv-due').value = fmt(due);
  if (!document.getElementById('inv-number').value) {
    const count = parseInt(localStorage.getItem('inv-count') || '0') + 1;
    localStorage.setItem('inv-count', count);
    document.getElementById('inv-number').value =
      today.getFullYear() + '-' + String(count).padStart(3, '0');
  }
}

/* ===== LocalStorage ===== */
function loadSavedData() {
  SENDER_KEYS.forEach(k => {
    const v = localStorage.getItem('inv-' + k);
    if (v) document.getElementById(k).value = v;
  });
  META_KEYS.forEach(k => {
    const v = localStorage.getItem('inv-' + k);
    if (v) document.getElementById(k).value = v;
  });
  const savedItems = localStorage.getItem('inv-items');
  if (savedItems) {
    try { items = JSON.parse(savedItems); } catch(e) {}
  }
}

function saveData() {
  SENDER_KEYS.forEach(k =>
    localStorage.setItem('inv-' + k, document.getElementById(k).value));
  META_KEYS.forEach(k =>
    localStorage.setItem('inv-' + k, document.getElementById(k).value));
  localStorage.setItem('inv-items', JSON.stringify(items));
}

/* ===== タブ切り替え ===== */
function bindEvents() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    });
  });

  [...SENDER_KEYS, ...META_KEYS,
   'c-company','c-dept','c-name','tax-rate'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', () => { saveData(); updatePreview(); });
  });

  document.getElementById('add-row').addEventListener('click', () => {
    items.push({ name: '', qty: 1, unit: '式', price: 0 });
    renderItemRows();
    updatePreview();
  });
}

/* ===== 明細行レンダリング ===== */
function renderItemRows() {
  const list = document.getElementById('items-list');
  list.innerHTML = '';
  items.forEach((item, i) => {
    const div = document.createElement('div');
    div.className = 'item-row';
    div.innerHTML = `
      <label>品目・内容</label>
      <input type="text" class="item-name" data-i="${i}" value="${esc(item.name)}" placeholder="Webサイト制作費">
      <div class="item-row-nums">
        <div>
          <label>数量</label>
          <input type="number" class="item-qty" data-i="${i}" value="${item.qty}" min="0" step="0.5">
        </div>
        <div>
          <label>単位</label>
          <input type="text" class="item-unit" data-i="${i}" value="${esc(item.unit)}" placeholder="式">
        </div>
        <div>
          <label>単価 (円)</label>
          <input type="number" class="item-price" data-i="${i}" value="${item.price}" min="0">
        </div>
      </div>
      <div class="item-amount-display">小計: ${fmt(item.qty * item.price)}</div>
      ${items.length > 1 ? `<button class="remove-row-btn" data-i="${i}">この行を削除</button>` : ''}
    `;
    list.appendChild(div);
  });

  list.querySelectorAll('.item-name').forEach(el =>
    el.addEventListener('input', e => { items[+e.target.dataset.i].name = e.target.value; sync(); }));
  list.querySelectorAll('.item-qty').forEach(el =>
    el.addEventListener('input', e => { items[+e.target.dataset.i].qty = parseFloat(e.target.value) || 0; sync(); }));
  list.querySelectorAll('.item-unit').forEach(el =>
    el.addEventListener('input', e => { items[+e.target.dataset.i].unit = e.target.value; sync(); }));
  list.querySelectorAll('.item-price').forEach(el =>
    el.addEventListener('input', e => { items[+e.target.dataset.i].price = parseFloat(e.target.value) || 0; sync(); }));
  list.querySelectorAll('.remove-row-btn').forEach(el =>
    el.addEventListener('click', e => {
      items.splice(+e.target.dataset.i, 1);
      renderItemRows();
      updatePreview();
    }));
}

function sync() {
  renderItemRows();
  saveData();
  updatePreview();
}

/* ===== プレビュー更新 ===== */
function updatePreview() {
  const v = id => document.getElementById(id).value.trim();
  const taxRate = parseFloat(document.getElementById('tax-rate').value);

  // 発行者
  setText('p-sname', v('s-name') || '（氏名・会社名）');
  setText('p-szip',  v('s-zip'));
  setText('p-saddr', v('s-addr'));
  setText('p-stel',  v('s-tel') ? 'TEL: ' + v('s-tel') : '');
  setText('p-semail',v('s-email') ? 'Email: ' + v('s-email') : '');
  setText('p-bank',  v('s-bank') || '—');
  setText('p-bank-name', v('s-bank-name'));

  // 請求先
  setText('p-company', (v('c-company') || '〇〇株式会社') );
  setText('p-dept',    v('c-dept'));
  setText('p-cname',   v('c-name') ? v('c-name') + ' 様' : '　　御中');

  // メタ
  setText('p-number', v('inv-number'));
  setText('p-date',   fmtDate(v('inv-date')));
  setText('p-due',    fmtDate(v('inv-due')));
  setText('p-note',   v('inv-note'));

  // 明細
  const tbody = document.getElementById('p-items');
  tbody.innerHTML = '';
  let subtotal = 0;
  items.forEach(item => {
    const amount = (item.qty || 0) * (item.price || 0);
    subtotal += amount;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${esc(item.name) || '—'}</td>
      <td class="col-qty">${item.qty}</td>
      <td class="col-unit">${esc(item.unit)}</td>
      <td class="col-price">${fmt(item.price)}</td>
      <td class="col-amount">${fmt(amount)}</td>
    `;
    tbody.appendChild(tr);
  });

  const tax   = Math.floor(subtotal * taxRate);
  const total = subtotal + tax;

  setText('p-subtotal', fmt(subtotal));
  setText('p-tax-label', taxRate === 0 ? '消費税（非課税）' : `消費税（${Math.round(taxRate*100)}%）`);
  setText('p-tax',      fmt(tax));
  setText('p-total',    fmt(total));
  setText('p-grand-total', fmt(total));
}

/* ===== ユーティリティ ===== */
function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function fmt(n) {
  return '¥' + Math.round(n).toLocaleString('ja-JP');
}

function fmtDate(str) {
  if (!str) return '—';
  const [y, m, d] = str.split('-');
  return `${y}年${parseInt(m)}月${parseInt(d)}日`;
}

function esc(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
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

document.addEventListener('DOMContentLoaded', init);
