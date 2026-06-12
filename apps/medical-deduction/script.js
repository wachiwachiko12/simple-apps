'use strict';

// ===== 定数 =====
const INCOME_TAX_BRACKETS = [
  { limit:   1_950_000, rate: 0.05, deduction:         0 },
  { limit:   3_300_000, rate: 0.10, deduction:    97_500 },
  { limit:   6_950_000, rate: 0.20, deduction:   427_500 },
  { limit:   9_000_000, rate: 0.23, deduction:   636_000 },
  { limit:  18_000_000, rate: 0.33, deduction: 1_536_000 },
  { limit:  40_000_000, rate: 0.40, deduction: 2_796_000 },
  { limit:  Infinity,   rate: 0.45, deduction: 4_796_000 },
];

// 給与所得控除 速算表（令和2年分以降）
function calcSalaryDeduction(income) {
  if (income <= 550_000)    return income;             // 全額控除（実質0）
  if (income <= 1_800_000)  return Math.floor(income * 0.40) - 100_000;
  if (income <= 3_600_000)  return Math.floor(income * 0.30) + 80_000;
  if (income <= 6_600_000)  return Math.floor(income * 0.20) + 440_000;
  if (income <= 8_500_000)  return Math.floor(income * 0.10) + 1_100_000;
  return 1_950_000; // 上限
}

// 所得税を計算
function calcIncomeTax(taxableIncome) {
  if (taxableIncome <= 0) return 0;
  const b = INCOME_TAX_BRACKETS.find(b => taxableIncome <= b.limit);
  return Math.max(0, Math.floor(taxableIncome * b.rate) - b.deduction);
}

// 課税所得を計算（給与所得控除 + 基礎控除のみ）
function calcTaxableIncome(annualIncomeYen) {
  const salaryDeduction = calcSalaryDeduction(annualIncomeYen);
  const salaryIncome = Math.max(0, annualIncomeYen - salaryDeduction);
  const basicDeduction = salaryIncome <= 24_000_000 ? 480_000 : 0;
  return Math.max(0, salaryIncome - basicDeduction);
}

// 数値フォーマット
function fmt(n) {
  return '¥' + Math.round(Math.abs(n)).toLocaleString('ja-JP');
}

function getVal(id) {
  const el = document.getElementById(id);
  if (!el) return 0;
  const v = parseFloat(el.value);
  return isNaN(v) || v < 0 ? 0 : v;
}

// ===== 状態管理 =====
let currentMode = 'normal';   // 'normal' | 'self-med'
let currentTab  = 'simple';   // 'simple' | 'detail'
let breakdownChart = null;

// ===== 初期化 =====
document.addEventListener('DOMContentLoaded', () => {
  bindEvents();
  calculate();
});

function bindEvents() {
  // 税制トグル
  document.getElementById('btn-normal').addEventListener('click', () => setMode('normal'));
  document.getElementById('btn-self-med').addEventListener('click', () => setMode('self-med'));

  // 入力タブ
  document.getElementById('tab-simple').addEventListener('click', () => setTab('simple'));
  document.getElementById('tab-detail').addEventListener('click', () => setTab('detail'));

  // リアルタイム計算
  const inputIds = [
    'annual-income',
    'total-medical',
    'd-clinic', 'd-medicine', 'd-dental', 'd-birth', 'd-transport',
    'insurance-fill', 'life-ins-fill',
    'otc-amount',
  ];
  inputIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', () => {
        updateDetailTotal();
        calculate();
      });
    }
  });
}

function setMode(mode) {
  currentMode = mode;

  const btnNormal  = document.getElementById('btn-normal');
  const btnSelfMed = document.getElementById('btn-self-med');
  const medSection     = document.getElementById('medical-section');
  const selfMedSection = document.getElementById('self-med-section');

  if (mode === 'normal') {
    btnNormal.classList.add('active');
    btnSelfMed.classList.remove('active');
    medSection.style.display = 'block';
    selfMedSection.style.display = 'none';
  } else {
    btnNormal.classList.remove('active');
    btnSelfMed.classList.add('active');
    medSection.style.display = 'none';
    selfMedSection.style.display = 'block';
  }

  calculate();
}

function setTab(tab) {
  currentTab = tab;

  const tabSimple = document.getElementById('tab-simple');
  const tabDetail = document.getElementById('tab-detail');
  const panelSimple = document.getElementById('panel-simple');
  const panelDetail = document.getElementById('panel-detail');

  if (tab === 'simple') {
    tabSimple.classList.add('active');
    tabDetail.classList.remove('active');
    tabSimple.setAttribute('aria-selected', 'true');
    tabDetail.setAttribute('aria-selected', 'false');
    panelSimple.style.display = 'block';
    panelDetail.style.display = 'none';
  } else {
    tabSimple.classList.remove('active');
    tabDetail.classList.add('active');
    tabSimple.setAttribute('aria-selected', 'false');
    tabDetail.setAttribute('aria-selected', 'true');
    panelSimple.style.display = 'none';
    panelDetail.style.display = 'block';
    updateDetailTotal();
  }

  calculate();
}

function updateDetailTotal() {
  const total = getVal('d-clinic') + getVal('d-medicine') + getVal('d-dental')
              + getVal('d-birth') + getVal('d-transport');
  const el = document.getElementById('detail-total-display');
  if (el) el.textContent = total.toFixed(1) + ' 万円';
}

// ===== 計算メイン =====
function calculate() {
  const annualIncomeYen = getVal('annual-income') * 10_000;

  if (currentMode === 'normal') {
    calculateNormal(annualIncomeYen);
  } else {
    calculateSelfMed(annualIncomeYen);
  }
}

function calculateNormal(annualIncomeYen) {
  // 医療費合計（万円 → 円）
  let medicalTotal;
  if (currentTab === 'simple') {
    medicalTotal = getVal('total-medical') * 10_000;
  } else {
    medicalTotal = (getVal('d-clinic') + getVal('d-medicine') + getVal('d-dental')
                  + getVal('d-birth') + getVal('d-transport')) * 10_000;
  }

  const fillAmount = (getVal('insurance-fill') + getVal('life-ins-fill')) * 10_000;

  // 控除の基準額（年収×1% と 10万円の小さいほう）
  const threshold = Math.min(annualIncomeYen * 0.01, 100_000);

  // 医療費控除額
  const deductionBase = medicalTotal - fillAmount - threshold;
  const deductionAmount = Math.max(0, Math.min(deductionBase, 2_000_000));

  // 課税所得（医療費控除前・後）
  const taxableIncomeBefore = calcTaxableIncome(annualIncomeYen);
  const taxableIncomeAfter  = Math.max(0, taxableIncomeBefore - deductionAmount);

  // 所得税（医療費控除前・後）
  const taxBefore = calcIncomeTax(taxableIncomeBefore);
  const taxAfter  = calcIncomeTax(taxableIncomeAfter);

  const refund = Math.max(0, taxBefore - taxAfter);

  updateResultUI(refund, deductionAmount, taxBefore, taxAfter);
  updateChart(medicalTotal, fillAmount, threshold, deductionAmount);
}

function calculateSelfMed(annualIncomeYen) {
  const otcAmount = getVal('otc-amount') * 10_000;

  // 控除額 = OTC購入額 - 12,000円（上限88,000円）
  const deductionAmount = Math.max(0, Math.min(otcAmount - 12_000, 88_000));

  // 課税所得（控除前・後）
  const taxableIncomeBefore = calcTaxableIncome(annualIncomeYen);
  const taxableIncomeAfter  = Math.max(0, taxableIncomeBefore - deductionAmount);

  const taxBefore = calcIncomeTax(taxableIncomeBefore);
  const taxAfter  = calcIncomeTax(taxableIncomeAfter);

  const refund = Math.max(0, taxBefore - taxAfter);

  updateResultUI(refund, deductionAmount, taxBefore, taxAfter);

  // セルフメディケーション用グラフ
  updateChartSelfMed(otcAmount, deductionAmount);
}

function updateResultUI(refund, deductionAmount, taxBefore, taxAfter) {
  setText('result-amount', fmt(refund));
  setText('r-deduction',  fmt(deductionAmount));
  setText('r-tax-before', fmt(taxBefore));
  setText('r-tax-after',  fmt(taxAfter));
  setText('r-refund',     fmt(refund));

  // 申告価値判定バナー
  const banner = document.getElementById('verdict-banner');
  const verdictText = document.getElementById('verdict-text');
  const verdictIcon = document.getElementById('verdict-icon');

  if (refund > 0) {
    banner.className = 'verdict-banner positive';
    verdictIcon.textContent = '✅';
    verdictText.textContent = '確定申告の価値があります！';
  } else if (deductionAmount === 0) {
    banner.className = 'verdict-banner negative';
    verdictIcon.textContent = '📋';
    verdictText.textContent = '控除額が基準（10万円 or 年収1%）に達していません';
  } else {
    banner.className = 'verdict-banner negative';
    verdictIcon.textContent = '📋';
    verdictText.textContent = '課税所得がゼロのため還付金は発生しません';
  }
}

// ===== Chart.js =====
function updateChart(medicalTotal, fillAmount, threshold, deductionAmount) {
  const notDeductible = Math.max(0, medicalTotal - fillAmount - deductionAmount);
  const fill = Math.min(fillAmount, medicalTotal);

  const labels = ['医療費合計', '補填額', '対象外（基準額）', '控除対象額'];
  const data   = [
    Math.round(medicalTotal / 10_000 * 10) / 10,
    Math.round(fill / 10_000 * 10) / 10,
    Math.round(Math.min(threshold, medicalTotal - fill) / 10_000 * 10) / 10,
    Math.round(deductionAmount / 10_000 * 10) / 10,
  ];

  renderChart(labels, data, [
    'rgba(3,105,161,0.75)',
    'rgba(107,114,128,0.6)',
    'rgba(234,179,8,0.65)',
    'rgba(34,197,94,0.75)',
  ]);
}

function updateChartSelfMed(otcAmount, deductionAmount) {
  const notDeductible = Math.max(0, 12_000);
  const labels = ['OTC薬品合計', '対象外（1.2万円）', '控除対象額'];
  const data = [
    Math.round(otcAmount / 10_000 * 10) / 10,
    Math.round(Math.min(12_000, otcAmount) / 10_000 * 10) / 10,
    Math.round(deductionAmount / 10_000 * 10) / 10,
  ];

  renderChart(labels, data, [
    'rgba(3,105,161,0.75)',
    'rgba(234,179,8,0.65)',
    'rgba(34,197,94,0.75)',
  ]);
}

function renderChart(labels, data, colors) {
  const canvas = document.getElementById('breakdown-chart');
  if (!canvas) return;

  if (breakdownChart) {
    breakdownChart.destroy();
    breakdownChart = null;
  }

  breakdownChart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: colors,
        borderColor: colors.map(c => c.replace('0.75)', '1)').replace('0.65)', '1)').replace('0.6)', '1)')),
        borderWidth: 1.5,
        borderRadius: 4,
      }],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ' ' + ctx.parsed.x.toFixed(1) + ' 万円',
          },
        },
      },
      scales: {
        x: {
          beginAtZero: true,
          ticks: {
            callback: v => v + '万',
            font: { size: 11 },
          },
          grid: { color: 'rgba(0,0,0,0.06)' },
        },
        y: {
          ticks: { font: { size: 11 } },
          grid: { display: false },
        },
      },
    },
  });

  // canvasの高さをラベル数に応じて調整
  canvas.style.height = (labels.length * 44 + 20) + 'px';
}

// ===== ユーティリティ =====
function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}
