'use strict';

// ===========================
// 割増率定義
// ===========================
const OT_TYPES = [
  {
    id: 'ot-statutory',
    label: '法定内残業',
    rate: 0.00,
    badge: '+0%'
  },
  {
    id: 'ot-legal25',
    label: '法定外残業（月60時間以内）',
    rate: 0.25,
    badge: '+25%'
  },
  {
    id: 'ot-legal50',
    label: '法定外残業（月60時間超）',
    rate: 0.50,
    badge: '+50%'
  },
  {
    id: 'ot-night',
    label: '深夜残業（22時〜5時）',
    rate: 0.50,
    badge: '+50%'
  },
  {
    id: 'ot-holiday',
    label: '休日労働',
    rate: 0.35,
    badge: '+35%'
  },
  {
    id: 'ot-nightholiday',
    label: '深夜休日労働',
    rate: 0.60,
    badge: '+60%'
  }
];

// ===========================
// Chart.js インスタンス保持
// ===========================
let otChart = null;

// ===========================
// 初期化
// ===========================
document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initWageAutoCalc();
  initCalcButton();
});

// ===========================
// タブ切り替え
// ===========================
function initTabs() {
  const tabs = document.querySelectorAll('.tab-btn');
  tabs.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.dataset.tab;

      // タブ状態更新
      tabs.forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');

      // パネル切り替え
      document.getElementById('panel-monthly').hidden = (targetTab !== 'monthly');
      document.getElementById('panel-hourly').hidden = (targetTab !== 'hourly');

      // base-wage-display をリセット
      document.getElementById('base-wage-display').hidden = true;
    });
  });
}

// ===========================
// 月給・所定労働時間 → 基本賃金 自動計算
// ===========================
function initWageAutoCalc() {
  const salaryInput = document.getElementById('monthly-salary');
  const hoursInput = document.getElementById('monthly-hours');
  const display = document.getElementById('base-wage-display');
  const valueEl = document.getElementById('base-wage-value');

  function updateBaseWage() {
    const salary = parseFloat(salaryInput.value);
    const hours = parseFloat(hoursInput.value);
    if (salary > 0 && hours > 0) {
      const baseWage = salary / hours;
      valueEl.textContent = formatNum(Math.round(baseWage * 100) / 100);
      display.hidden = false;
    } else {
      display.hidden = true;
    }
  }

  salaryInput.addEventListener('input', updateBaseWage);
  hoursInput.addEventListener('input', updateBaseWage);
}

// ===========================
// 計算ボタン
// ===========================
function initCalcButton() {
  document.getElementById('calc-btn').addEventListener('click', () => {
    clearError();

    const baseWage = getBaseWage();
    if (baseWage === null) return; // エラー表示済み

    const breakdown = calcBreakdown(baseWage);
    renderResults(baseWage, breakdown);
  });
}

// ===========================
// 基本時給を取得
// ===========================
function getBaseWage() {
  const isMonthly = !document.getElementById('panel-monthly').hidden;

  if (isMonthly) {
    const salary = parseFloat(document.getElementById('monthly-salary').value);
    const hours = parseFloat(document.getElementById('monthly-hours').value);

    if (!salary || salary <= 0) {
      showError('月給を入力してください。');
      return null;
    }
    if (!hours || hours <= 0) {
      showError('月所定労働時間を入力してください。');
      return null;
    }
    if (hours > 400) {
      showError('月所定労働時間は400時間以内で入力してください。');
      return null;
    }
    return salary / hours;
  } else {
    const wage = parseFloat(document.getElementById('hourly-wage').value);
    if (!wage || wage <= 0) {
      showError('時給を入力してください。');
      return null;
    }
    return wage;
  }
}

// ===========================
// 残業代内訳計算
// ===========================
function calcBreakdown(baseWage) {
  return OT_TYPES.map(type => {
    const hours = parseFloat(document.getElementById(type.id).value) || 0;
    // 割増賃金 = 基本賃金 × (1 + 割増率) × 時間
    const amount = Math.round(baseWage * (1 + type.rate) * hours);
    const baseAmount = Math.round(baseWage * hours);
    const premiumAmount = amount - baseAmount;
    return {
      ...type,
      hours,
      amount,
      baseAmount,
      premiumAmount
    };
  });
}

// ===========================
// 結果描画
// ===========================
function renderResults(baseWage, breakdown) {
  const totalAmount = breakdown.reduce((sum, r) => sum + r.amount, 0);
  const totalBase = breakdown.reduce((sum, r) => sum + r.baseAmount, 0);
  const totalPremium = breakdown.reduce((sum, r) => sum + r.premiumAmount, 0);
  const unpaid2years = totalAmount * 24;

  // 合計ハイライト
  document.getElementById('total-amount').textContent = '¥' + formatNum(totalAmount);
  document.getElementById('total-base').textContent = '¥' + formatNum(totalBase);
  document.getElementById('total-premium').textContent = '¥' + formatNum(totalPremium);
  document.getElementById('unpaid-amount').textContent = '¥' + formatNum(unpaid2years);

  // 内訳テーブル
  renderBreakdownTable(breakdown, totalAmount);

  // グラフ
  renderChart(breakdown);

  // 表示
  const resultsEl = document.getElementById('results');
  resultsEl.hidden = false;
  resultsEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ===========================
// 内訳テーブル描画
// ===========================
function renderBreakdownTable(breakdown, totalAmount) {
  const tbody = document.getElementById('breakdown-tbody');
  tbody.innerHTML = '';

  breakdown.forEach(row => {
    if (row.hours <= 0) return;
    const tr = document.createElement('tr');

    const tdLabel = document.createElement('td');
    tdLabel.textContent = row.label;

    const tdHours = document.createElement('td');
    tdHours.textContent = row.hours + '時間';

    const tdRate = document.createElement('td');
    tdRate.textContent = '+' + (row.rate * 100) + '%';

    const tdAmount = document.createElement('td');
    tdAmount.className = 'amount-cell';
    tdAmount.textContent = '¥' + formatNum(row.amount);

    tr.appendChild(tdLabel);
    tr.appendChild(tdHours);
    tr.appendChild(tdRate);
    tr.appendChild(tdAmount);
    tbody.appendChild(tr);
  });

  // 0時間のみのとき
  if (tbody.children.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 4;
    td.textContent = '残業時間が入力されていません';
    td.style.textAlign = 'center';
    td.style.color = '#9ca3af';
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  document.getElementById('breakdown-total').textContent = '¥' + formatNum(totalAmount);
}

// ===========================
// Chart.js グラフ描画
// ===========================
function renderChart(breakdown) {
  const filtered = breakdown.filter(r => r.hours > 0);
  const labels = filtered.map(r => r.label);
  const data = filtered.map(r => r.amount);

  const colors = [
    '#94a3b8', // 法定内: グレー
    '#f59e0b', // 25%: アンバー
    '#f97316', // 50%(法定外): オレンジ
    '#dc2626', // 50%(深夜): レッド
    '#be123c', // 35%: ローズ
    '#7f1d1d'  // 60%: ダークレッド
  ];

  // 色インデックスをOT_TYPESの順に合わせる
  const colorMap = OT_TYPES.reduce((acc, t, i) => {
    acc[t.id] = colors[i];
    return acc;
  }, {});
  const bgColors = filtered.map(r => colorMap[r.id] || '#dc2626');

  const ctx = document.getElementById('ot-chart').getContext('2d');

  if (otChart) {
    otChart.destroy();
    otChart = null;
  }

  if (filtered.length === 0) {
    return;
  }

  otChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: '残業代（円）',
        data,
        backgroundColor: bgColors,
        borderRadius: 6,
        borderSkipped: false
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => '¥' + formatNum(ctx.parsed.y)
          }
        }
      },
      scales: {
        x: {
          ticks: {
            font: { size: 11 },
            maxRotation: 30,
            minRotation: 0,
            callback: function(val, index) {
              const label = this.getLabelForValue(val);
              // 長いラベルは省略
              if (label.length > 10) {
                return label.substring(0, 10) + '…';
              }
              return label;
            }
          },
          grid: { display: false }
        },
        y: {
          ticks: {
            font: { size: 11 },
            callback: val => '¥' + formatNum(val)
          },
          grid: { color: '#f1f5f9' }
        }
      }
    }
  });
}

// ===========================
// エラー表示・クリア
// ===========================
function showError(msg) {
  const el = document.getElementById('error-msg');
  const text = document.getElementById('error-text');
  text.textContent = msg;
  el.hidden = false;
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function clearError() {
  document.getElementById('error-msg').hidden = true;
}

// ===========================
// 数値フォーマット（カンマ区切り）
// ===========================
function formatNum(n) {
  return Math.round(n).toLocaleString('ja-JP');
}
