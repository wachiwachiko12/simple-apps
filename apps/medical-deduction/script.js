'use strict';

/* ---------------------------------------------------------------------------
 * 令和8年分（2026年分）の確定申告に対応。
 *
 * 根拠（医療費控除）: 国税庁 タックスアンサー No.1120 医療費を支払ったとき
 *   https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/1120.htm
 *   （令和8年4月1日現在法令等）
 *   - 控除額＝（実際に支払った医療費の合計額 − 保険金などで補てんされる金額）
 *     − 10万円。ただし**その年の総所得金額等が200万円未満の人は
 *     総所得金額等の5%**。控除額は最高200万円。
 *   - 基準額は「年収（収入）の1%」ではない。給与所得者の総所得金額等は
 *     給与収入から給与所得控除を引いた**給与所得**なので、収入ではなく
 *     所得に5%を掛ける。
 *   - セルフメディケーション税制は12,000円を超える部分（88,000円を限度）。
 *
 * 根拠（課税所得の概算）:
 *   国税庁 No.1410 給与所得控除 / No.1199 基礎控除（いずれも令和8年4月1日現在法令等）
 *   https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/1410.htm
 *   https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/1199.htm
 *   - 給与所得控除の最低保障額は74万円（給与収入220万円まで一律）。上限は195万円。
 *   - 基礎控除は合計所得金額489万円以下で104万円、489万円超655万円以下で67万円、
 *     655万円超2,350万円以下で62万円（令和8年分・令和9年分）。
 *   - いずれも令和8年12月1日施行・令和8年分から適用。
 *
 * 計算結果は year-end-adjustment / freelance-tax-simulator / ideco-simulator と
 * 一致する（.github/scripts/test/calc.test.js で突き合わせている）。
 *
 * 本ツールの課税所得は「給与所得控除＋基礎控除のみ」の概算で、社会保険料控除や
 * 扶養控除は含めない。実際にそれらがある人は税率区分が下がり、還付額は
 * 本ツールの表示より小さくなることがある（index.html に注記あり）。
 * ------------------------------------------------------------------------ */

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

/** 給与所得控除の最低保障額（本則69万円＋令和8年・9年分の特例5万円） */
const SALARY_DEDUCTION_MIN = 740_000;

/** 医療費控除の基準額の上限（国税庁 No.1120 の「10万円」） */
const MEDICAL_THRESHOLD_CAP = 100_000;

/** 医療費控除額の上限（同 最高200万円） */
const MEDICAL_DEDUCTION_CAP = 2_000_000;

/**
 * 給与所得控除額を求める（円・令和8年分）。
 * 参照: 国税庁 No.1410（令和8年分・令和9年分の速算表）
 * 220万円までは一律74万円のため、40%区分は最低保障額に吸収される。
 * @param {number} income 給与収入（円）
 * @returns {number} 給与所得控除額（円）
 */
function calcSalaryDeduction(income) {
  const y = Math.max(0, income);
  let d;
  if (y <= 1_800_000) d = Math.floor(y * 0.40 - 100_000);
  else if (y <= 3_600_000) d = Math.floor(y * 0.30 + 80_000);
  else if (y <= 6_600_000) d = Math.floor(y * 0.20 + 440_000);
  else if (y <= 8_500_000) d = Math.floor(y * 0.10 + 1_100_000);
  else d = 1_950_000; // 850万円超は上限195万円
  // 最低保障額を下回らない。ただし控除が収入を超えない（給与所得は0が下限）。
  return Math.min(Math.max(d, SALARY_DEDUCTION_MIN), y);
}

/**
 * 令和8年分の基礎控除額を求める（本則62万円＋令和8年・9年分の加算）。
 * 参照: 国税庁 No.1199
 * @param {number} netIncome 合計所得金額（円）
 * @returns {number} 基礎控除額（円）
 */
function calcBasicDeduction(netIncome) {
  if (netIncome > 25_000_000) return 0;
  if (netIncome > 24_500_000) return 160_000;
  if (netIncome > 24_000_000) return 320_000;
  if (netIncome > 23_500_000) return 480_000;

  let d = 620_000; // 本則（合計所得金額2,350万円以下）
  if (netIncome <= 4_890_000) d += 420_000;      // 令和8年・9年分の加算（→104万円）
  else if (netIncome <= 6_550_000) d += 50_000;  // 同上（→67万円）
  return d;
}

// 所得税を計算
function calcIncomeTax(taxableIncome) {
  if (taxableIncome <= 0) return 0;
  const b = INCOME_TAX_BRACKETS.find(b => taxableIncome <= b.limit);
  return Math.max(0, Math.floor(taxableIncome * b.rate) - b.deduction);
}

/**
 * 給与収入から給与所得（＝給与所得者の総所得金額等）を求める。
 * @param {number} annualIncomeYen 給与収入（円）
 * @returns {number} 給与所得（円）
 */
function calcSalaryIncome(annualIncomeYen) {
  const y = Math.max(0, annualIncomeYen);
  return Math.max(0, y - calcSalaryDeduction(y));
}

// 課税所得を計算（給与所得控除 + 基礎控除のみの概算）
function calcTaxableIncome(annualIncomeYen) {
  const salaryIncome = calcSalaryIncome(annualIncomeYen);
  return Math.max(0, salaryIncome - calcBasicDeduction(salaryIncome));
}

/**
 * 医療費控除の基準額（医療費から差し引く額）を求める。
 * 国税庁 No.1120: 10万円。ただし総所得金額等が200万円未満の人は
 * 総所得金額等の5%。10万円との min で両方の場合を同時に満たせる
 * （総所得金額等200万円のとき5%＝ちょうど10万円になるため）。
 * @param {number} totalIncome 総所得金額等（円）。給与所得者は給与所得
 * @returns {number} 基準額（円）
 */
function calcMedicalThreshold(totalIncome) {
  return Math.min(Math.max(0, totalIncome) * 0.05, MEDICAL_THRESHOLD_CAP);
}

/**
 * 医療費控除額を求める（国税庁 No.1120）。
 * @param {number} medicalTotal 支払った医療費の合計（円）
 * @param {number} fillAmount   保険金などで補てんされる金額（円）
 * @param {number} totalIncome  総所得金額等（円）
 * @returns {number} 医療費控除額（円。0〜200万円）
 */
function calcMedicalDeduction(medicalTotal, fillAmount, totalIncome) {
  const base = medicalTotal - fillAmount - calcMedicalThreshold(totalIncome);
  return Math.max(0, Math.min(Math.floor(base), MEDICAL_DEDUCTION_CAP));
}

/**
 * セルフメディケーション税制の控除額を求める（国税庁 No.1120 / No.1129）。
 * 12,000円を超える部分で、88,000円を限度とする。
 * @param {number} otcAmount 特定一般用医薬品等購入費（円）
 * @returns {number} 控除額（円。0〜88,000円）
 */
function calcSelfMedDeduction(otcAmount) {
  return Math.max(0, Math.min(Math.floor(otcAmount - 12_000), 88_000));
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

  // 控除の基準額（総所得金額等×5% と 10万円の小さいほう）。
  // 給与所得者の総所得金額等は、年収ではなく給与所得（年収−給与所得控除）。
  const totalIncome = calcSalaryIncome(annualIncomeYen);
  const threshold = calcMedicalThreshold(totalIncome);

  // 医療費控除額
  const deductionAmount = calcMedicalDeduction(medicalTotal, fillAmount, totalIncome);

  // 課税所得（医療費控除前・後）
  const taxableIncomeBefore = calcTaxableIncome(annualIncomeYen);
  const taxableIncomeAfter  = Math.max(0, taxableIncomeBefore - deductionAmount);

  // 所得税（医療費控除前・後）
  const taxBefore = calcIncomeTax(taxableIncomeBefore);
  const taxAfter  = calcIncomeTax(taxableIncomeAfter);

  const refund = Math.max(0, taxBefore - taxAfter);

  updateResultUI(refund, deductionAmount, taxBefore, taxAfter, threshold);
  updateChart(medicalTotal, fillAmount, threshold, deductionAmount);
}

function calculateSelfMed(annualIncomeYen) {
  const otcAmount = getVal('otc-amount') * 10_000;

  // 控除額 = OTC購入額 - 12,000円（上限88,000円）
  const deductionAmount = calcSelfMedDeduction(otcAmount);

  // 課税所得（控除前・後）
  const taxableIncomeBefore = calcTaxableIncome(annualIncomeYen);
  const taxableIncomeAfter  = Math.max(0, taxableIncomeBefore - deductionAmount);

  const taxBefore = calcIncomeTax(taxableIncomeBefore);
  const taxAfter  = calcIncomeTax(taxableIncomeAfter);

  const refund = Math.max(0, taxBefore - taxAfter);

  updateResultUI(refund, deductionAmount, taxBefore, taxAfter, 12_000);

  // セルフメディケーション用グラフ
  updateChartSelfMed(otcAmount, deductionAmount);
}

function updateResultUI(refund, deductionAmount, taxBefore, taxAfter, threshold) {
  setText('result-amount', fmt(refund));
  setText('r-threshold',  fmt(threshold));
  setText('r-deduction',  fmt(deductionAmount));
  setText('r-tax-before', fmt(taxBefore));
  setText('r-tax-after',  fmt(taxAfter));
  setText('r-refund',     fmt(refund));

  // 基準額の見出しは税制によって意味が変わる
  setText('r-threshold-label', currentMode === 'normal'
    ? '控除の基準額（10万円 or 所得の5%）'
    : '控除の基準額（一律1.2万円）');

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
    verdictText.textContent = currentMode === 'normal'
      ? '医療費が基準額（10万円、総所得金額等200万円未満の方は所得の5%）を超えていません'
      : '対象医薬品の購入額が1.2万円を超えていません';
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
