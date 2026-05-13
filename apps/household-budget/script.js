'use strict';

// ===========================
// 定数
// ===========================
const STORAGE_KEY = 'household_budget_entries';

const EXPENSE_CATEGORIES = [
  '食費', '交通費', '住居費', '光熱費', '通信費',
  '医療費', '娯楽費', '日用品', '衣服', 'その他支出'
];

const INCOME_CATEGORIES = ['給与', '副業', 'その他収入'];

const CHART_COLORS = [
  '#2d6a4f', '#52b788', '#95d5b2', '#b7e4c7',
  '#d8f3dc', '#1b4332', '#40916c', '#74c69d',
  '#a8dadc', '#457b9d'
];

// ===========================
// 状態管理
// ===========================
let entries = [];
let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth() + 1; // 1-indexed
let expenseChart = null;

// ===========================
// XSS対策: DOMエスケープ
// ===========================
function escapeHtml(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(String(str)));
  return div.innerHTML;
}

// ===========================
// localStorage
// ===========================
function loadEntries() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    entries = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(entries)) entries = [];
  } catch (e) {
    entries = [];
  }
}

function saveEntries() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch (e) {
    // storageが満杯の場合は無視
  }
}

// ===========================
// 金額フォーマット
// ===========================
function formatAmount(num) {
  return '¥' + Number(num).toLocaleString('ja-JP');
}

// ===========================
// 月フィルタ
// ===========================
function getFilteredEntries() {
  const prefix = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
  return entries.filter(e => e.date.startsWith(prefix));
}

// ===========================
// 月ラベル更新
// ===========================
function updateMonthLabel() {
  const el = document.getElementById('current-month-label');
  el.textContent = `${currentYear}年${currentMonth}月`;
}

// ===========================
// サマリー更新
// ===========================
function updateSummary() {
  const filtered = getFilteredEntries();
  const totalIncome  = filtered.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0);
  const totalExpense = filtered.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0);
  const balance = totalIncome - totalExpense;

  document.getElementById('total-income').textContent  = formatAmount(totalIncome);
  document.getElementById('total-expense').textContent = formatAmount(totalExpense);

  const balanceEl = document.getElementById('total-balance');
  balanceEl.textContent = formatAmount(balance);
  balanceEl.style.color = balance < 0 ? 'var(--expense-color)' : 'var(--balance-color)';
}

// ===========================
// グラフ更新
// ===========================
function updateChart() {
  const filtered = getFilteredEntries().filter(e => e.type === 'expense');

  const canvas  = document.getElementById('expense-chart');
  const emptyEl = document.getElementById('chart-empty');

  if (filtered.length === 0) {
    canvas.style.display = 'none';
    emptyEl.style.display = 'block';
    if (expenseChart) {
      expenseChart.destroy();
      expenseChart = null;
    }
    return;
  }

  canvas.style.display = 'block';
  emptyEl.style.display = 'none';

  // カテゴリ集計
  const totals = {};
  filtered.forEach(e => {
    totals[e.category] = (totals[e.category] || 0) + e.amount;
  });

  const labels = Object.keys(totals);
  const data   = Object.values(totals);
  const colors = labels.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]);

  if (expenseChart) {
    expenseChart.data.labels = labels;
    expenseChart.data.datasets[0].data   = data;
    expenseChart.data.datasets[0].backgroundColor = colors;
    expenseChart.update();
    return;
  }

  expenseChart = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors,
        borderWidth: 2,
        borderColor: '#fff'
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            font: { size: 12 },
            boxWidth: 14,
            padding: 12
          }
        },
        tooltip: {
          callbacks: {
            label(ctx) {
              const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
              const pct   = total > 0 ? Math.round(ctx.parsed / total * 100) : 0;
              return ` ${ctx.label}: ${formatAmount(ctx.parsed)} (${pct}%)`;
            }
          }
        }
      }
    }
  });
}

// ===========================
// 一覧レンダリング
// ===========================
function renderList() {
  const filtered = getFilteredEntries()
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date));

  const container = document.getElementById('entries-list');
  container.innerHTML = '';

  if (filtered.length === 0) {
    const p = document.createElement('p');
    p.className = 'list-empty';
    p.textContent = 'まだ記録がありません';
    container.appendChild(p);
    return;
  }

  filtered.forEach(entry => {
    const item = document.createElement('div');
    item.className = `entry-item ${entry.type}`;
    item.dataset.id = entry.id;

    // 日付
    const dateEl = document.createElement('span');
    dateEl.className = 'entry-date';
    dateEl.textContent = entry.date.slice(5); // MM-DD

    // カテゴリ＋メモ
    const infoEl = document.createElement('div');
    infoEl.className = 'entry-info';

    const catEl = document.createElement('span');
    catEl.className = 'entry-category';
    catEl.textContent = entry.category;

    infoEl.appendChild(catEl);

    if (entry.memo) {
      const memoEl = document.createElement('span');
      memoEl.className = 'entry-memo';
      memoEl.textContent = entry.memo;
      infoEl.appendChild(memoEl);
    }

    // 金額
    const amtEl = document.createElement('span');
    amtEl.className = 'entry-amount';
    amtEl.textContent = (entry.type === 'income' ? '+' : '-') + formatAmount(entry.amount);

    // 削除ボタン
    const delBtn = document.createElement('button');
    delBtn.className = 'btn-delete';
    delBtn.setAttribute('aria-label', `${entry.date} ${entry.category} の記録を削除`);
    delBtn.textContent = '✕';
    delBtn.addEventListener('click', () => deleteEntry(entry.id));

    item.appendChild(dateEl);
    item.appendChild(infoEl);
    item.appendChild(amtEl);
    item.appendChild(delBtn);

    container.appendChild(item);
  });
}

// ===========================
// UI全更新
// ===========================
function refreshUI() {
  updateMonthLabel();
  updateSummary();
  updateChart();
  renderList();
}

// ===========================
// エントリ追加
// ===========================
function addEntry(date, type, category, amount, memo) {
  const entry = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    date,
    type,
    category,
    amount,
    memo
  };
  entries.push(entry);
  saveEntries();
}

// ===========================
// エントリ削除
// ===========================
function deleteEntry(id) {
  entries = entries.filter(e => e.id !== id);
  saveEntries();
  refreshUI();
}

// ===========================
// CSVエクスポート
// ===========================
function exportCSV() {
  const all = entries.slice().sort((a, b) => a.date.localeCompare(b.date));

  if (all.length === 0) {
    alert('エクスポートするデータがありません。');
    return;
  }

  const headers = ['日付', '種別', 'カテゴリ', '金額', 'メモ'];
  const rows = all.map(e => [
    e.date,
    e.type === 'income' ? '収入' : '支出',
    e.category,
    e.amount,
    e.memo || ''
  ]);

  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\r\n');

  // BOM付きUTF-8でExcel対応
  const bom = '﻿';
  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `household-budget-${currentYear}${String(currentMonth).padStart(2, '0')}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ===========================
// カテゴリ選択肢の切り替え
// ===========================
function updateCategoryOptions(type) {
  const sel = document.getElementById('entry-category');
  const expenseGroup = sel.querySelector('#expense-categories');
  const incomeGroup  = sel.querySelector('#income-categories');

  if (type === 'income') {
    expenseGroup.hidden = true;
    incomeGroup.hidden  = false;
    // 収入カテゴリの最初を選択
    sel.value = INCOME_CATEGORIES[0];
  } else {
    expenseGroup.hidden = false;
    incomeGroup.hidden  = true;
    sel.value = EXPENSE_CATEGORIES[0];
  }
}

// ===========================
// 今日の日付をデフォルト設定
// ===========================
function setDefaultDate() {
  const today = new Date();
  const yyyy  = today.getFullYear();
  const mm    = String(today.getMonth() + 1).padStart(2, '0');
  const dd    = String(today.getDate()).padStart(2, '0');
  document.getElementById('entry-date').value = `${yyyy}-${mm}-${dd}`;
}

// ===========================
// バリデーション
// ===========================
function validateForm(date, amount) {
  if (!date) return '日付を入力してください。';
  if (!amount || isNaN(amount) || amount <= 0) return '正の金額を入力してください。';
  if (!Number.isInteger(Number(amount))) return '金額は整数で入力してください。';
  return null;
}

// ===========================
// フォーム送信
// ===========================
function handleFormSubmit(e) {
  e.preventDefault();

  const dateVal     = document.getElementById('entry-date').value;
  const typeVal     = document.getElementById('entry-type').value;
  const categoryVal = document.getElementById('entry-category').value;
  const amountRaw   = document.getElementById('entry-amount').value;
  const memoRaw     = document.getElementById('entry-memo').value.trim();

  const errEl = document.getElementById('form-error');
  const errorMsg = validateForm(dateVal, amountRaw);

  if (errorMsg) {
    errEl.textContent = errorMsg;
    return;
  }

  errEl.textContent = '';

  addEntry(dateVal, typeVal, categoryVal, parseInt(amountRaw, 10), memoRaw);

  // 入力した月に表示を合わせる
  const [y, m] = dateVal.split('-').map(Number);
  currentYear  = y;
  currentMonth = m;

  // フォームリセット（日付は今日に戻す）
  document.getElementById('entry-amount').value = '';
  document.getElementById('entry-memo').value   = '';
  setDefaultDate();

  refreshUI();
}

// ===========================
// DOMContentLoaded
// ===========================
document.addEventListener('DOMContentLoaded', () => {
  loadEntries();
  setDefaultDate();
  updateCategoryOptions('expense'); // 初期は支出

  refreshUI();

  // フォーム送信
  document.getElementById('entry-form').addEventListener('submit', handleFormSubmit);

  // 種別変更でカテゴリを切り替え
  document.getElementById('entry-type').addEventListener('change', function () {
    updateCategoryOptions(this.value);
  });

  // 月ナビ
  document.getElementById('btn-prev-month').addEventListener('click', () => {
    currentMonth--;
    if (currentMonth < 1) { currentMonth = 12; currentYear--; }
    refreshUI();
  });

  document.getElementById('btn-next-month').addEventListener('click', () => {
    currentMonth++;
    if (currentMonth > 12) { currentMonth = 1; currentYear++; }
    refreshUI();
  });

  // CSVエクスポート
  document.getElementById('btn-export-csv').addEventListener('click', exportCSV);
});
