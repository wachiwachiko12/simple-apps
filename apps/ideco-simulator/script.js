'use strict';

const JOB_LIMITS = {
  employee_no_pension: 23000,
  employee_with_pension: 20000,
  employee_corp_dc: 12000,
  civil_servant: 12000,
  self_employed: 68000,
  homemaker: 23000,
};

const JOB_LABELS = {
  employee_no_pension: '会社員（企業年金なし）',
  employee_with_pension: '会社員（企業年金あり）',
  employee_corp_dc: '会社員（企業型DC加入）',
  civil_servant: '公務員',
  self_employed: '自営業・フリーランス',
  homemaker: '専業主婦・主夫',
};

/** 給与所得控除の最低保障額（本則69万円＋令和8年・9年分の特例5万円） */
const SALARY_DEDUCTION_MIN = 740000;
/** 社会保険料の概算率（年収に対する本人負担分の目安） */
const SOCIAL_INSURANCE_RATE = 0.148;
/** 個人住民税の所得割の税率（市町村6%＋道府県4%） */
const RESIDENT_TAX_RATE = 0.10;
/** 個人住民税の基礎控除（所得税とは別建て） */
const RESIDENT_BASIC_DEDUCTION = 430000;

function getIncomeTaxRate(taxableIncome) {
  if (taxableIncome <= 1950000)  return { rate: 0.05, deduction: 0 };
  if (taxableIncome <= 3300000)  return { rate: 0.10, deduction: 97500 };
  if (taxableIncome <= 6950000)  return { rate: 0.20, deduction: 427500 };
  if (taxableIncome <= 9000000)  return { rate: 0.23, deduction: 636000 };
  if (taxableIncome <= 18000000) return { rate: 0.33, deduction: 1536000 };
  if (taxableIncome <= 40000000) return { rate: 0.40, deduction: 2796000 };
  return { rate: 0.45, deduction: 4796000 };
}

/**
 * 給与所得控除額を求める（令和8年分）。
 * @param {number} incomeYen 給与収入（円）
 * @returns {number} 給与所得控除額（円）
 */
function calcSalaryDeduction(incomeYen) {
  const y = Math.max(0, incomeYen);
  let d;
  // 国税庁タックスアンサー1410「令和8年分・令和9年分」の表のとおり。
  // 令和7年分までにあった「収入×40%−10万円」の区分は無くなり、
  // 最低保障額が給与収入220万円まで伸びている。
  if (y <= 2200000) d = SALARY_DEDUCTION_MIN;
  else if (y <= 3600000) d = Math.floor(y * 0.30 + 80000);
  else if (y <= 6600000) d = Math.floor(y * 0.20 + 440000);
  else if (y <= 8500000) d = Math.floor(y * 0.10 + 1100000);
  else d = 1950000;
  // 控除が収入そのものを超えない（給与所得は0が下限）。
  return Math.min(d, y);
}

/**
 * 令和8年分の基礎控除額を求める（本則＋令和8年・9年分の加算）。
 * @param {number} netIncome 合計所得金額（円）
 * @returns {number} 基礎控除額（円）
 */
function calcBasicDeduction(netIncome) {
  if (netIncome > 25000000) return 0;
  if (netIncome > 24500000) return 160000;
  if (netIncome > 24000000) return 320000;
  if (netIncome > 23500000) return 480000;

  let d = 620000; // 本則（合計所得金額2,350万円以下）
  if (netIncome <= 4890000) d += 420000;      // 令和8年・9年分の加算
  else if (netIncome <= 6550000) d += 50000;  // 同上（合計所得655万円以下まで）
  return d;
}

/**
 * 所得税額を求める（復興特別所得税2.1%を含む）。
 * @param {number} taxableIncome 課税所得（円）
 * @returns {number} 税額（円）
 */
function calcIncomeTax(taxableIncome) {
  const t = Math.floor(Math.max(0, taxableIncome) / 1000) * 1000; // 1,000円未満切捨て
  if (t <= 0) return 0;
  const { rate, deduction } = getIncomeTaxRate(t);
  const base = Math.max(0, t * rate - deduction);
  return Math.floor(base * 1.021); // 復興特別所得税
}

/**
 * 個人住民税の所得割を求める（均等割は含まない概算）。
 * @param {number} taxableIncome 課税所得（円）
 * @returns {number} 税額（円）
 */
function calcResidentTax(taxableIncome) {
  const t = Math.floor(Math.max(0, taxableIncome) / 1000) * 1000;
  return Math.floor(t * RESIDENT_TAX_RATE);
}

/**
 * iDeCo掛金を差し引く前の課税所得を、所得税・住民税それぞれについて求める。
 *
 * 給与所得者は給与所得控除を引く。自営業（第1号被保険者）には給与所得控除が
 * 適用されないため、入力値を事業所得そのものとして扱う。
 *
 * @param {number} incomeManyen 年収または事業所得（万円）
 * @param {string} jobType      JOB_LIMITS のキー
 * @returns {{income: number, forIncomeTax: number, forResidentTax: number}} 円単位
 */
function calcTaxBases(incomeManyen, jobType) {
  const gross = Math.max(0, incomeManyen) * 10000;
  const netIncome = jobType === 'self_employed'
    ? gross                                    // 事業所得。給与所得控除は適用されない
    : gross - calcSalaryDeduction(gross);      // 給与所得
  const socialIns = Math.min(gross * SOCIAL_INSURANCE_RATE, netIncome);
  const afterSocial = Math.max(0, netIncome - socialIns);
  return {
    income: netIncome,
    forIncomeTax: Math.max(0, afterSocial - calcBasicDeduction(netIncome)),
    forResidentTax: Math.max(0, afterSocial - RESIDENT_BASIC_DEDUCTION),
  };
}

/**
 * 掛金の全額所得控除（小規模企業共済等掛金控除）による年間の節税額を求める。
 *
 * 税率を掛けるのではなく「掛金を引く前の税額 − 引いた後の税額」で出す。
 * こうすると課税所得が0の人は節税額も0になり、税率の境界をまたぐ場合も正しくなる。
 *
 * @param {number} incomeManyen 年収または事業所得（万円）
 * @param {string} jobType      JOB_LIMITS のキー
 * @param {number} annualContrib 年間掛金（円）
 * @returns {number} 年間節税額（円）
 */
function calcAnnualTaxSaving(incomeManyen, jobType, annualContrib) {
  const b = calcTaxBases(incomeManyen, jobType);
  const c = Math.max(0, annualContrib);
  const before = calcIncomeTax(b.forIncomeTax) + calcResidentTax(b.forResidentTax);
  const after = calcIncomeTax(b.forIncomeTax - c) + calcResidentTax(b.forResidentTax - c);
  return Math.max(0, before - after);
}

/**
 * 退職所得控除額を求める（所得税法30条）。
 * 20年以下は1年あたり40万円（最低保障80万円）、20年超は800万円＋超過年数×70万円。
 * 法令上の上限はない。
 *
 * @param {number} years 加入者等期間（年）
 * @returns {number} 退職所得控除額（円）
 */
function calcRetirementDeduction(years) {
  const y = Math.max(1, Math.floor(years));
  if (y <= 20) return Math.max(800000, 400000 * y);
  return 8000000 + 700000 * (y - 20);
}

let growthChart = null;

function updateLimits() {
  const jobType = document.getElementById('jobType').value;
  const limit = JOB_LIMITS[jobType];
  document.getElementById('limit-hint').textContent = `掛金上限：月${limit.toLocaleString()}円`;
  document.getElementById('max-badge').textContent = `上限 ${limit.toLocaleString()}円`;
  document.getElementById('monthlySlider').max = limit;
  document.getElementById('monthlyContrib').max = limit;
  document.getElementById('slider-max-label').textContent = limit.toLocaleString() + '円';
  const current = parseInt(document.getElementById('monthlyContrib').value);
  if (current > limit) {
    document.getElementById('monthlyContrib').value = limit;
    document.getElementById('monthlySlider').value = limit;
  }
}

function syncSlider() {
  const slider = document.getElementById('monthlySlider');
  document.getElementById('monthlyContrib').value = slider.value;
}

function syncInput() {
  const input = document.getElementById('monthlyContrib');
  const limit = parseInt(document.getElementById('monthlySlider').max);
  const val = Math.min(parseInt(input.value) || 5000, limit);
  input.value = val;
  document.getElementById('monthlySlider').value = val;
}

function calculate() {
  const income = parseFloat(document.getElementById('income').value) || 0;
  const monthly = parseInt(document.getElementById('monthlyContrib').value) || 0;
  const period = parseInt(document.getElementById('period').value) || 0;
  const rate = parseFloat(document.getElementById('returnRate').value) || 0;

  if (income <= 0 || monthly <= 0 || period <= 0) return;

  const jobType = document.getElementById('jobType').value;
  const annualContrib = monthly * 12;
  const annualTaxSaving = calcAnnualTaxSaving(income, jobType, annualContrib);
  // 掛金に対してどれだけ税が減るかの割合。課税所得が0なら0%になる。
  const reductionRate = annualContrib > 0 ? annualTaxSaving / annualContrib : 0;
  const totalTaxSaving = annualTaxSaving * period;

  const monthlyRate = rate / 100 / 12;
  const months = period * 12;
  let totalAssets;
  if (monthlyRate === 0) {
    totalAssets = monthly * months;
  } else {
    totalAssets = Math.round(monthly * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) * (1 + monthlyRate));
  }
  const principal = monthly * months;
  const gain = totalAssets - principal;

  document.getElementById('annual-tax-saving').textContent = '¥' + annualTaxSaving.toLocaleString();
  document.getElementById('annual-tax-rate').textContent =
    annualTaxSaving > 0
      ? `掛金に対する軽減率: ${(reductionRate * 100).toFixed(1)}%`
      : '課税所得が0のため所得控除による節税は生じません';
  document.getElementById('total-tax-saving').textContent = '¥' + totalTaxSaving.toLocaleString();
  document.getElementById('period-years').textContent = `積立期間: ${period}年`;
  document.getElementById('total-assets').textContent = '¥' + totalAssets.toLocaleString();
  document.getElementById('investment-gain').textContent = `うち運用益: ¥${gain.toLocaleString()}`;
  document.getElementById('legend-principal').textContent = '¥' + principal.toLocaleString();
  document.getElementById('legend-gain').textContent = '¥' + gain.toLocaleString();

  const barTotal = principal + gain;
  document.getElementById('bar-principal').style.width = (principal / barTotal * 100) + '%';
  document.getElementById('bar-gain').style.width = (gain / barTotal * 100) + '%';

  const lumpsumDeduction = calcRetirementDeduction(period);
  document.getElementById('lumpsum-deduction').textContent = '¥' + lumpsumDeduction.toLocaleString();
  document.getElementById('annuity-deduction').textContent = '公的年金等控除が適用';

  renderChart(period, monthly, monthlyRate);

  document.getElementById('result-section').style.display = '';
  // 広告は結果の直前にある。そこへスクロールすると広告→結果の順で画面に入る
  const scrollTo = document.getElementById('ad-slot') || document.getElementById('result-section');
  scrollTo.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderChart(period, monthly, monthlyRate) {
  const labels = [];
  const principals = [];
  const gains = [];
  for (let y = 1; y <= period; y++) {
    const months = y * 12;
    let assets;
    if (monthlyRate === 0) {
      assets = monthly * months;
    } else {
      assets = Math.round(monthly * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) * (1 + monthlyRate));
    }
    const p = monthly * months;
    labels.push(y + '年');
    principals.push(Math.round(p / 10000));
    gains.push(Math.round((assets - p) / 10000));
  }

  const ctx = document.getElementById('growthChart').getContext('2d');
  if (growthChart) growthChart.destroy();
  growthChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: '元本(万円)', data: principals, backgroundColor: '#3b82f6', stack: 'a' },
        { label: '運用益(万円)', data: gains, backgroundColor: '#10b981', stack: 'a' },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => `${c.dataset.label}: ${c.parsed.y}万円` } } },
      scales: {
        x: { stacked: true, ticks: { maxTicksLimit: 10 } },
        y: { stacked: true, ticks: { callback: v => v + '万' } },
      },
    },
  });
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('jobType').addEventListener('change', updateLimits);
  document.getElementById('monthlySlider').addEventListener('input', syncSlider);
  document.getElementById('monthlyContrib').addEventListener('input', syncInput);
  document.getElementById('calc-btn').addEventListener('click', calculate);
  updateLimits();
});
