'use strict';

/* ---------------------------------------------------------------------------
 * 令和8年分（2026年分）の年末調整に対応。
 *
 * 根拠: 財務省「令和８年度税制改正の大綱」一 個人所得課税 １
 *   https://www.mof.go.jp/tax_policy/tax_reform/outline/fy2026/08taikou_01.htm
 *   - 基礎控除の本則を62万円に引き上げ（合計所得金額2,350万円以下）
 *   - 給与所得控除の最低保障額を65万円から69万円に引き上げ
 *   - 令和8年分・令和9年分は基礎控除に加算（合計所得金額489万円以下は42万円、
 *     489万円超655万円以下は5万円）
 *   - 令和8年・令和9年は給与所得控除の最低保障額をさらに5万円引き上げる特例を創設し、
 *     年末調整において適用できることとする（＝最低保障額74万円）
 *   - 同一生計配偶者および扶養親族の合計所得金額要件を62万円以下に引き上げ
 *   いずれも令和8年分以後の所得税について適用される。
 *
 * なお毎月の源泉徴収税額表の改正は令和9年1月1日以後に支払う給与からのため、
 * 令和8年中の天引きは改正前の税額表で行われている。改正後の控除額で精算するのは
 * 令和8年12月の年末調整が最初になる。
 *
 * 入力欄の単位について: index.html 側の単位表示に合わせ、
 * 年収のみ「万円」、それ以外（源泉徴収税額・社会保険料・各保険料・
 * iDeCo掛金・住宅ローン年末残高）はすべて「円」で受け取る。
 * ------------------------------------------------------------------------ */

/** 給与所得控除の最低保障額（本則69万円＋令和8年・9年の特例5万円） */
const SALARY_DEDUCTION_MIN = 740000;

/**
 * 給与所得控除額を求める。
 * @param {number} incomeManyen 給与収入（万円）
 * @returns {number} 給与所得控除額（円）
 */
function calcSalaryDeduction(incomeManyen) {
  const y = Math.max(0, incomeManyen) * 10000;
  let d;
  if (y <= 1800000) d = Math.floor(y * 0.40 - 100000);
  else if (y <= 3600000) d = Math.floor(y * 0.30 + 80000);
  else if (y <= 6600000) d = Math.floor(y * 0.20 + 440000);
  else if (y <= 8500000) d = Math.floor(y * 0.10 + 1100000);
  else d = 1950000;
  // 最低保障額を下回らない。ただし収入そのものは超えない（給与所得は0が下限）。
  return Math.min(Math.max(d, SALARY_DEDUCTION_MIN), y);
}

/**
 * 令和8年分の基礎控除額を求める（本則＋令和8年・9年分の加算）。
 * @param {number} netIncome 合計所得金額（円）。本ツールは給与所得のみを前提とする。
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
 * 生命保険料控除（新制度）を1区分ぶん求める。
 * @param {number} premiumYen 年間支払保険料（円）
 * @returns {number} 控除額（円。1区分あたり上限4万円）
 */
function calcLifeInsuranceDeduction(premiumYen) {
  const p = Math.max(0, premiumYen);
  if (p <= 20000) return Math.floor(p);
  if (p <= 40000) return Math.floor(p / 2 + 10000);
  if (p <= 80000) return Math.floor(p / 4 + 20000);
  return 40000;
}

/**
 * 一般・介護医療・個人年金の3区分を合算した生命保険料控除額。合計の上限は12万円。
 */
function calcLifeInsuranceTotal(generalYen, nursingYen, pensionYen) {
  const sum = calcLifeInsuranceDeduction(generalYen)
    + calcLifeInsuranceDeduction(nursingYen)
    + calcLifeInsuranceDeduction(pensionYen);
  return Math.min(sum, 120000);
}

/**
 * 所得税の速算表（課税所得に対する税率と控除額）。
 */
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
 * 住民税（所得割）の目安。住民税は所得税と人的控除の額が異なるため、
 * 所得税の課税所得をそのまま使うと実額から大きく外れる。
 * 基礎控除43万円・配偶者控除33万円・一般扶養33万円・特定扶養45万円、
 * 生命保険料控除は合計7万円、地震保険料控除は2.5万円を上限として概算する。
 */
function calcResidentTaxEstimate(params) {
  const lifeForResident = Math.min(params.lifeInsDeduction, 70000);
  const quakeForResident = Math.min(params.earthquakeDeduction, 25000);
  const personal = 430000
    + (params.spouseDeduction > 0 ? 330000 : 0)
    + params.depGeneral * 330000
    + params.depSpecific * 450000;
  const taxable = Math.max(
    0,
    params.netIncome - (personal + params.socialIns + lifeForResident + quakeForResident + params.idecoDeduction)
  );
  return Math.round(taxable * 0.10);
}

let deductionChart = null;

function toggleSocialMode(isAuto) {
  document.getElementById('social-manual-input').style.display = isAuto ? 'none' : 'block';
  document.getElementById('social-hint').style.display = isAuto ? '' : 'none';
  document.getElementById('social-auto-btn').classList.toggle('active', isAuto);
  document.getElementById('social-manual-btn').classList.toggle('active', !isAuto);
}

function numberFrom(id) {
  const el = document.getElementById(id);
  const v = parseFloat(el && el.value);
  return Number.isFinite(v) && v > 0 ? v : 0;
}

function calculate() {
  const income = numberFrom('income');                 // 万円
  const withheld = numberFrom('withheld-tax');         // 円
  const spouseVal = document.getElementById('spouse').value;
  const depGeneral = Math.floor(numberFrom('dep-general'));
  const depSpecific = Math.floor(numberFrom('dep-specific'));

  const grossIncome = income * 10000;
  const salaryDeduction = calcSalaryDeduction(income);
  const netIncome = grossIncome - salaryDeduction;

  const isAutoSocial = document.getElementById('social-auto-btn').classList.contains('active');
  const socialIns = isAutoSocial
    ? Math.round(grossIncome * 0.148)
    : numberFrom('social-insurance');                  // 円

  const lifeInsDeduction = calcLifeInsuranceTotal(
    numberFrom('life-general'),
    numberFrom('life-nursing'),
    numberFrom('life-pension')
  );
  const earthquakeDeduction = Math.min(numberFrom('earthquake-insurance'), 50000); // 円
  const idecoDeduction = numberFrom('ideco') * 12;     // 円/月 → 円/年
  const housingLoan = numberFrom('housing-loan');      // 円

  const basicDeduction = calcBasicDeduction(netIncome);
  const spouseDeduction = spouseVal === 'yes' ? 380000 : 0;
  const depDeduction = depGeneral * 380000 + depSpecific * 630000;

  const totalDeductions = basicDeduction + spouseDeduction + depDeduction
    + socialIns + lifeInsDeduction + earthquakeDeduction + idecoDeduction;

  const taxableIncome = Math.floor(Math.max(0, netIncome - totalDeductions) / 1000) * 1000;
  const { rate, deduction } = getIncomeTaxRate(taxableIncome);
  let incomeTax = Math.max(0, taxableIncome * rate - deduction);
  incomeTax = Math.floor(incomeTax * 1.021); // 復興特別所得税

  // 住宅ローン控除は年末残高×0.7%。借入限度額は住宅の区分により異なるため、
  // 本ツールは3,000万円（控除額21万円）を上限とした概算として扱う。
  const housingCredit = Math.floor(Math.min(housingLoan * 0.007, 210000));
  const finalTax = Math.max(0, incomeTax - housingCredit);

  const diff = withheld - finalTax;

  const residentTax = calcResidentTaxEstimate({
    netIncome, socialIns, lifeInsDeduction, earthquakeDeduction,
    idecoDeduction, spouseDeduction, depGeneral, depSpecific,
  });

  document.getElementById('d-income').textContent = '¥' + grossIncome.toLocaleString();
  document.getElementById('d-deductions').textContent = '¥' + totalDeductions.toLocaleString();
  document.getElementById('d-taxable').textContent = '¥' + taxableIncome.toLocaleString();
  document.getElementById('d-income-tax').textContent = '¥' + incomeTax.toLocaleString();
  document.getElementById('d-housing-credit').textContent = housingCredit > 0 ? '-¥' + housingCredit.toLocaleString() : '—';
  document.getElementById('d-final-tax').textContent = '¥' + finalTax.toLocaleString();
  document.getElementById('d-withheld').textContent = '¥' + withheld.toLocaleString();
  document.getElementById('d-resident-tax').textContent = '¥' + residentTax.toLocaleString() + '（目安）';

  const resultMain = document.getElementById('result-main');
  const resultLabel = document.getElementById('result-label');
  const resultValue = document.getElementById('result-value');
  const resultSub = document.getElementById('result-sub');

  if (diff >= 0) {
    resultMain.className = 'result-main refund';
    resultLabel.textContent = '還付予定額（概算）';
    resultValue.textContent = '¥' + diff.toLocaleString();
    resultSub.textContent = '源泉徴収額が多かったため、この金額が戻ってきます';
  } else {
    resultMain.className = 'result-main additional';
    resultLabel.textContent = '追徴予定額（概算）';
    resultValue.textContent = '¥' + Math.abs(diff).toLocaleString();
    resultSub.textContent = '源泉徴収額が不足しているため、この金額を追加で納付します';
  }

  renderChart({ basicDeduction, spouseDeduction, depDeduction, socialIns, lifeInsDeduction, earthquakeDeduction, idecoDeduction, housingCredit });

  document.getElementById('result-section').style.display = '';
  document.getElementById('result-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderChart(d) {
  const labels = [];
  const data = [];
  const colors = [];
  const items = [
    { label: '基礎控除', val: d.basicDeduction, color: '#3b82f6' },
    { label: '配偶者控除', val: d.spouseDeduction, color: '#8b5cf6' },
    { label: '扶養控除', val: d.depDeduction, color: '#06b6d4' },
    { label: '社会保険料控除', val: d.socialIns, color: '#10b981' },
    { label: '生命保険料控除', val: d.lifeInsDeduction, color: '#f59e0b' },
    { label: '地震保険料控除', val: d.earthquakeDeduction, color: '#ef4444' },
    { label: 'iDeCo控除', val: d.idecoDeduction, color: '#ec4899' },
    { label: '住宅ローン控除', val: d.housingCredit, color: '#14b8a6' },
  ];
  items.forEach(i => {
    if (i.val > 0) { labels.push(i.label); data.push(Math.round(i.val / 10000)); colors.push(i.color); }
  });

  const canvas = document.getElementById('deduction-chart');
  const ctx = canvas && canvas.getContext ? canvas.getContext('2d') : null;
  if (!ctx) return;
  if (deductionChart) deductionChart.destroy();
  deductionChart = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets: [{ data, backgroundColor: colors }] },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => c.parsed.x + '万円' } } },
      scales: { x: { ticks: { callback: v => v + '万' } } },
    },
  });
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('social-auto-btn').addEventListener('click', () => toggleSocialMode(true));
  document.getElementById('social-manual-btn').addEventListener('click', () => toggleSocialMode(false));
  document.getElementById('calc-btn').addEventListener('click', calculate);
});
