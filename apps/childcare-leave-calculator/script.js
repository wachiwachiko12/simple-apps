'use strict';

/* ============================================================
   育児休業給付金計算ツール — script.js
   ============================================================ */

// 賃金日額上限（2024年8月〜）
const DAILY_WAGE_CAP = 13670;

// 社会保険料免除率（概算）
const SOCIAL_INS_EXEMPT_RATE = 0.14;

// 2025年改正：最初28日間の給付率（それ以前は67%なので改正で上乗せされる分はUIでは実質80%と表示）
// 実際の給付金計算上は通常通り67%で計算し、「実質」として免除分を合算して説明する
const REFORM_DAYS = 28;

// 給付率
const RATE_HIGH = 0.67;    // 最初180日
const RATE_LOW  = 0.50;    // 181日以降

// DOM references
const salaryInput    = document.getElementById('monthly-salary');
const leaveStartInput = document.getElementById('leave-start');
const leaveMonthsSelect = document.getElementById('leave-months');
const reform2025CB   = document.getElementById('reform2025');
const reformNote     = document.getElementById('reform-note');
const calcBtn        = document.getElementById('calc-btn');
const resultsDiv     = document.getElementById('results');
const reformSummaryNote = document.getElementById('reform-summary-note');

// Chart instance
let benefitChart = null;

/* ---------- Init ---------- */
function init() {
  // Set default start date to today
  const today = new Date();
  leaveStartInput.value = formatDate(today);

  // Toggle reform note on checkbox change
  reform2025CB.addEventListener('change', () => {
    reformNote.hidden = !reform2025CB.checked;
  });

  // Calc button
  calcBtn.addEventListener('click', calculate);

  // Allow Enter key on inputs
  [salaryInput, leaveStartInput, leaveMonthsSelect].forEach(el => {
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter') calculate();
    });
  });
}

/* ---------- Main calculation ---------- */
function calculate() {
  // Validate
  const salary = parseFloat(salaryInput.value);
  const startDateStr = leaveStartInput.value;
  const months = parseInt(leaveMonthsSelect.value, 10);

  if (!salary || salary <= 0) {
    alert('育休前の月収を入力してください。');
    salaryInput.focus();
    return;
  }
  if (!startDateStr) {
    alert('育休開始日を選択してください。');
    leaveStartInput.focus();
    return;
  }
  if (!months || months < 1 || months > 24) {
    alert('育休期間を選択してください。');
    leaveMonthsSelect.focus();
    return;
  }

  const isReform = reform2025CB.checked;
  const startDate = new Date(startDateStr);

  // 賃金日額（上限適用）
  const dailyWage = Math.min(salary * 12 / 365, DAILY_WAGE_CAP);

  // 月ごとの給付金を計算
  const monthlyData = [];
  let totalDaysSoFar = 0;
  let totalBenefit = 0;

  for (let m = 0; m < months; m++) {
    const monthStart = addMonths(startDate, m);
    const monthEnd   = addMonths(startDate, m + 1);
    const daysInMonth = Math.round((monthEnd - monthStart) / (1000 * 60 * 60 * 24));

    // この月に含まれる累計日数範囲: totalDaysSoFar 〜 totalDaysSoFar + daysInMonth
    const dayStart = totalDaysSoFar + 1;
    const dayEnd   = totalDaysSoFar + daysInMonth;

    // 2025年改正フラグ（最初28日以内の月か）
    const isReformMonth = isReform && dayStart <= REFORM_DAYS;
    const reformDaysThisMonth = isReformMonth
      ? Math.min(REFORM_DAYS - dayStart + 1, daysInMonth)
      : 0;
    const normalDaysThisMonth = daysInMonth - reformDaysThisMonth;

    // 給付率の計算（180日閾値で按分）
    const rate = computeMonthRate(dayStart, dayEnd, daysInMonth);

    // 給付金基準額（改正適用日数は80%、残りは通常レート）
    const benefit = Math.floor(
      dailyWage * reformDaysThisMonth * 0.80 +
      dailyWage * normalDaysThisMonth * rate
    );

    // 社会保険料免除額（月収ベース）
    const exempt = Math.floor(salary * SOCIAL_INS_EXEMPT_RATE);

    // 合計手取り概算
    const totalTakehome = benefit + exempt;

    monthlyData.push({
      month: m + 1,
      date: monthStart,
      daysInMonth,
      dayStart,
      dayEnd,
      rate,
      benefit,
      exempt,
      totalTakehome,
      isReformMonth,
      reformDaysThisMonth,
    });

    totalBenefit += benefit;
    totalDaysSoFar += daysInMonth;
  }

  // サマリー計算
  const monthlyAvg = Math.round(totalBenefit / months);
  // 通常手取り（月収から社会保険料・所得税を引いた概算）≈ 月収 × 0.80
  const normalTakehome = salary * 0.80;
  const avgTakehomeWithExempt = monthlyAvg + Math.floor(salary * SOCIAL_INS_EXEMPT_RATE);
  const takehomeRate = Math.round((avgTakehomeWithExempt / normalTakehome) * 100);

  // --- DOM更新 ---
  document.getElementById('total-benefit').textContent = formatYen(totalBenefit);
  document.getElementById('monthly-avg').textContent   = formatYen(monthlyAvg);
  document.getElementById('takehome-rate').textContent = `${takehomeRate}%`;

  reformSummaryNote.hidden = !isReform;

  // テーブル更新
  renderTable(monthlyData);

  // グラフ更新
  renderChart(monthlyData);

  // 結果表示
  resultsDiv.hidden = false;
  resultsDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ---------- 給付率の按分計算 ---------- */
function computeMonthRate(dayStart, dayEnd, daysInMonth) {
  // 180日境界で按分
  const THRESHOLD = 180;
  if (dayEnd <= THRESHOLD) {
    return RATE_HIGH;
  }
  if (dayStart > THRESHOLD) {
    return RATE_LOW;
  }
  // 月をまたぐ
  const daysHigh = THRESHOLD - dayStart + 1;
  const daysLow  = daysInMonth - daysHigh;
  return (daysHigh * RATE_HIGH + daysLow * RATE_LOW) / daysInMonth;
}

/* ---------- テーブル描画 ---------- */
function renderTable(data) {
  const tbody = document.getElementById('monthly-tbody');
  tbody.innerHTML = '';

  data.forEach(row => {
    const tr = document.createElement('tr');
    if (row.isReformMonth) tr.classList.add('reform-row');

    const rateDisplay = (row.rate * 100).toFixed(1) + '%';
    const rateClass   = row.rate >= RATE_HIGH ? 'rate-high' : 'rate-low';

    tr.innerHTML = `
      <td>${row.month}ヶ月目${row.isReformMonth ? ' <span style="color:var(--primary);font-size:0.75rem;">★改正</span>' : ''}<br><span style="font-size:0.75rem;color:#9ca3af;">${formatDateShort(row.date)}</span></td>
      <td class="${rateClass}">${rateDisplay}</td>
      <td>${formatYen(row.benefit)}</td>
      <td style="color:#db2777;">${formatYen(row.exempt)}</td>
      <td class="total-col">${formatYen(row.totalTakehome)}</td>
    `;
    tbody.appendChild(tr);
  });
}

/* ---------- グラフ描画 ---------- */
function renderChart(data) {
  const ctx = document.getElementById('benefit-chart').getContext('2d');
  const labels  = data.map(d => `${d.month}M`);
  const benefits = data.map(d => d.benefit);
  const exempts  = data.map(d => d.exempt);
  const totals   = data.map(d => d.totalTakehome);

  if (benefitChart) {
    benefitChart.destroy();
  }

  benefitChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: '合計（実質手取り）',
          data: totals,
          borderColor: '#9d174d',
          backgroundColor: 'rgba(157, 23, 77, 0.06)',
          borderWidth: 2.5,
          pointRadius: data.length <= 12 ? 4 : 2,
          pointHoverRadius: 6,
          fill: true,
          tension: 0.3,
          order: 1,
        },
        {
          label: '給付金',
          data: benefits,
          borderColor: '#be185d',
          backgroundColor: 'transparent',
          borderWidth: 2,
          pointRadius: data.length <= 12 ? 3 : 1,
          pointHoverRadius: 5,
          fill: false,
          tension: 0.3,
          borderDash: [],
          order: 2,
        },
        {
          label: '社会保険料免除額',
          data: exempts,
          borderColor: '#f9a8d4',
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          pointRadius: 0,
          pointHoverRadius: 4,
          fill: false,
          tension: 0,
          borderDash: [4, 3],
          order: 3,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          backgroundColor: 'rgba(255,255,255,0.96)',
          titleColor: '#1a1a2e',
          bodyColor: '#374151',
          borderColor: '#fbcfe8',
          borderWidth: 1,
          padding: 12,
          callbacks: {
            label(ctx) {
              return `${ctx.dataset.label}: ${formatYen(ctx.parsed.y)}`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { color: 'rgba(0,0,0,0.04)' },
          ticks: {
            font: { size: 11 },
            color: '#9ca3af',
            maxTicksLimit: 12,
          },
        },
        y: {
          grid: { color: 'rgba(0,0,0,0.04)' },
          ticks: {
            font: { size: 11 },
            color: '#9ca3af',
            callback(val) {
              if (val >= 10000) return (val / 10000).toFixed(0) + '万';
              return val.toLocaleString();
            },
          },
          beginAtZero: true,
        },
      },
    },
  });
}

/* ---------- Utilities ---------- */
function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function formatDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDateShort(d) {
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  return `${y}年${m}月`;
}

function formatYen(val) {
  return '¥' + Math.round(val).toLocaleString('ja-JP');
}

/* ---------- Start ---------- */
document.addEventListener('DOMContentLoaded', init);
