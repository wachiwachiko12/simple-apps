'use strict';

// ============================================================
// 住宅ローン 借入可能額・返済額計算ツール
// ============================================================

// Chart instances
let chartEligibility = null;
let chartPayment = null;

// ---- Tab Switch ----
function switchTab(mode) {
  const panels = document.querySelectorAll('.tab-panel');
  const btns = document.querySelectorAll('.tab-btn');

  panels.forEach(p => p.classList.remove('active'));
  btns.forEach(b => {
    b.classList.remove('active');
    b.setAttribute('aria-selected', 'false');
  });

  document.getElementById('panel-' + mode).classList.add('active');
  const activeBtn = document.getElementById('tab-' + mode);
  activeBtn.classList.add('active');
  activeBtn.setAttribute('aria-selected', 'true');
}

// ---- Slider Sync ----
function syncSlider(sliderId, numId) {
  const slider = document.getElementById(sliderId);
  const num = document.getElementById(numId);
  num.value = slider.value;
}

function syncNum(numId, sliderId) {
  const num = document.getElementById(numId);
  const slider = document.getElementById(sliderId);
  const val = Math.min(Math.max(Number(num.value), Number(slider.min)), Number(slider.max));
  slider.value = val;
  num.value = val;
}

// ---- Rate Type Toggle ----
function setRateType(btn, id) {
  const group = btn.parentElement;
  group.querySelectorAll('.rate-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

// ============================================================
// Core Calculation
// ============================================================

/**
 * 月利から元利均等返済の月返済額を計算
 * @param {number} principal - 元金（円）
 * @param {number} annualRate - 年利（%）
 * @param {number} months - 返済月数
 */
function calcMonthlyPayment(principal, annualRate, months) {
  if (annualRate === 0) {
    return principal / months;
  }
  const r = annualRate / 100 / 12;
  const pow = Math.pow(1 + r, months);
  return principal * r * pow / (pow - 1);
}

/**
 * 月返済額から借入可能額（現在価値係数）を逆算
 * @param {number} monthlyPayment - 月返済可能額（円）
 * @param {number} annualRate - 年利（%）
 * @param {number} months - 返済月数
 */
function calcMaxLoan(monthlyPayment, annualRate, months) {
  if (annualRate === 0) {
    return monthlyPayment * months;
  }
  const r = annualRate / 100 / 12;
  const pow = Math.pow(1 + r, months);
  return monthlyPayment * (pow - 1) / (r * pow);
}

/**
 * 残高推移を年次で計算
 * @returns {Array<{year, balance, principalPaid, interestPaid}>}
 */
function calcSchedule(principal, annualRate, months) {
  const schedule = [];
  const monthly = calcMonthlyPayment(principal, annualRate, months);
  let balance = principal;
  const r = annualRate / 100 / 12;

  schedule.push({ year: 0, balance: principal, principalCumulative: 0, interestCumulative: 0 });

  let principalCumulative = 0;
  let interestCumulative = 0;

  for (let m = 1; m <= months; m++) {
    const interest = balance * r;
    const principalPart = monthly - interest;
    balance = Math.max(0, balance - principalPart);
    principalCumulative += principalPart;
    interestCumulative += interest;

    if (m % 12 === 0 || m === months) {
      schedule.push({
        year: Math.ceil(m / 12),
        balance: Math.max(0, balance),
        principalCumulative,
        interestCumulative,
      });
    }
  }
  return schedule;
}

// ---- Format helpers ----
function fmtMan(yen) {
  return Math.round(yen / 10000).toLocaleString('ja-JP');
}

function fmtYen(yen) {
  return Math.round(yen).toLocaleString('ja-JP');
}

// ---- Ratio badge ----
function getRatioBadge(ratio) {
  if (ratio <= 25) {
    return { cls: 'safe', label: '✓ 余裕あり（〜25%）' };
  } else if (ratio <= 35) {
    return { cls: 'caution', label: '! 要注意（25〜35%）' };
  } else {
    return { cls: 'danger', label: '× 超過（35%超）' };
  }
}

// ============================================================
// Chart Rendering
// ============================================================
function renderChart(canvasId, schedule, chartRef) {
  const ctx = document.getElementById(canvasId).getContext('2d');

  if (chartRef) {
    chartRef.destroy();
  }

  const labels = schedule.map(s => s.year === 0 ? '開始' : s.year + '年目');
  const balanceData = schedule.map(s => Math.round(s.balance / 10000));
  const principalData = schedule.map(s => Math.round(s.principalCumulative / 10000));
  const interestData = schedule.map(s => Math.round(s.interestCumulative / 10000));

  const newChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'ローン残高（万円）',
          data: balanceData,
          borderColor: '#1a6b3a',
          backgroundColor: 'rgba(26,107,58,0.10)',
          borderWidth: 2.5,
          fill: true,
          tension: 0.3,
          pointRadius: 3,
          pointHoverRadius: 6,
        },
        {
          label: '累計元金返済（万円）',
          data: principalData,
          borderColor: '#2d9e60',
          backgroundColor: 'rgba(45,158,96,0.05)',
          borderWidth: 2,
          fill: false,
          tension: 0.3,
          pointRadius: 2,
          pointHoverRadius: 5,
          borderDash: [5, 3],
        },
        {
          label: '累計利息（万円）',
          data: interestData,
          borderColor: '#f59e0b',
          backgroundColor: 'rgba(245,158,11,0.05)',
          borderWidth: 2,
          fill: false,
          tension: 0.3,
          pointRadius: 2,
          pointHoverRadius: 5,
          borderDash: [3, 3],
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
          position: 'bottom',
          labels: {
            font: { size: 12, family: "'BIZ UDPGothic', sans-serif" },
            boxWidth: 14,
            padding: 12,
          },
        },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y.toLocaleString('ja-JP')} 万円`,
          },
        },
      },
      scales: {
        x: {
          grid: { color: 'rgba(0,0,0,0.05)' },
          ticks: { font: { size: 11 }, maxTicksLimit: 10 },
        },
        y: {
          grid: { color: 'rgba(0,0,0,0.05)' },
          ticks: {
            font: { size: 11 },
            callback: v => v.toLocaleString('ja-JP') + '万',
          },
        },
      },
    },
  });

  return newChart;
}

// ============================================================
// Tab 1: 借入可能額を計算
// ============================================================
function calcEligibility() {
  const income = parseFloat(document.getElementById('annual-income').value);
  const ratio = parseFloat(document.getElementById('repayment-ratio-e').value);
  const rate = parseFloat(document.getElementById('interest-rate-e').value);
  const period = parseInt(document.getElementById('loan-period-e').value, 10);

  // Validation
  if (!income || !ratio || !rate || !period || income <= 0 || period <= 0) {
    alert('全ての項目を正しく入力してください。');
    return;
  }

  // 月々の返済可能額
  const annualRepayable = income * 10000 * (ratio / 100);
  const monthlyPossible = annualRepayable / 12;

  // 借入可能額
  const months = period * 12;
  const maxLoanYen = calcMaxLoan(monthlyPossible, rate, months);

  // 総返済額・総利息
  const monthlyActual = calcMonthlyPayment(maxLoanYen, rate, months);
  const totalRepayment = monthlyActual * months;
  const totalInterest = totalRepayment - maxLoanYen;

  // 残高推移
  const schedule = calcSchedule(maxLoanYen, rate, months);

  // DOM 更新
  document.getElementById('max-loan-amount').textContent = fmtMan(maxLoanYen);
  document.getElementById('monthly-possible').textContent = fmtYen(monthlyPossible);
  document.getElementById('total-repayment-e').textContent = fmtMan(totalRepayment);
  document.getElementById('total-interest-e').textContent = fmtMan(totalInterest);

  // バッジ
  const badge = getRatioBadge(ratio);
  const badgeEl = document.getElementById('ratio-badge');
  badgeEl.textContent = badge.label;
  badgeEl.className = 'ratio-badge ' + badge.cls;

  // 表示
  const resultEl = document.getElementById('result-eligibility');
  resultEl.style.display = 'block';

  // グラフ
  chartEligibility = renderChart('chart-eligibility', schedule, chartEligibility);

  // スクロール
  resultEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ============================================================
// Tab 2: 返済額を計算
// ============================================================
function calcPayment() {
  const loanAmountMan = parseFloat(document.getElementById('loan-amount').value);
  const rate = parseFloat(document.getElementById('interest-rate-p').value);
  const period = parseInt(document.getElementById('loan-period-p').value, 10);
  const incomeMan = parseFloat(document.getElementById('annual-income-p').value);

  // Validation
  if (!loanAmountMan || !rate || !period || loanAmountMan <= 0 || period <= 0) {
    alert('全ての項目を正しく入力してください。');
    return;
  }

  const principal = loanAmountMan * 10000;
  const months = period * 12;

  // 月返済額
  const monthly = calcMonthlyPayment(principal, rate, months);
  const totalRepayment = monthly * months;
  const totalInterest = totalRepayment - principal;

  // 実質返済比率（年収が入力されている場合）
  let actualRatio = null;
  if (incomeMan > 0) {
    actualRatio = (monthly * 12) / (incomeMan * 10000) * 100;
  }

  // 残高推移
  const schedule = calcSchedule(principal, rate, months);

  // DOM 更新
  document.getElementById('monthly-payment').textContent = fmtYen(monthly);
  document.getElementById('total-repayment-p').textContent = fmtMan(totalRepayment);
  document.getElementById('total-interest-p').textContent = fmtMan(totalInterest);

  if (actualRatio !== null) {
    document.getElementById('actual-ratio').textContent = actualRatio.toFixed(1);
  } else {
    document.getElementById('actual-ratio').textContent = '—';
  }

  // バッジ
  const badgeEl = document.getElementById('ratio-badge-p');
  if (actualRatio !== null) {
    const badge = getRatioBadge(actualRatio);
    badgeEl.textContent = badge.label;
    badgeEl.className = 'ratio-badge ' + badge.cls;
  } else {
    badgeEl.textContent = '';
    badgeEl.className = 'ratio-badge';
  }

  // 表示
  const resultEl = document.getElementById('result-payment');
  resultEl.style.display = 'block';

  // グラフ
  chartPayment = renderChart('chart-payment', schedule, chartPayment);

  // スクロール
  resultEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ---- AdSense Init ----
document.addEventListener('DOMContentLoaded', () => {
  try {
    (adsbygoogle = window.adsbygoogle || []).push({});
    (adsbygoogle = window.adsbygoogle || []).push({});
  } catch (e) {
    // AdSense not loaded (local dev)
  }
});
