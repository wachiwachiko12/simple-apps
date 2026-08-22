'use strict';

const CONSUMPTION_TAX_RATE = 0.10;
const INCOME_TAX_BRACKETS = [
  { limit: 1_950_000,   rate: 0.05, deduction: 0 },
  { limit: 3_300_000,   rate: 0.10, deduction: 97_500 },
  { limit: 6_950_000,   rate: 0.20, deduction: 427_500 },
  { limit: 9_000_000,   rate: 0.23, deduction: 636_000 },
  { limit: 18_000_000,  rate: 0.33, deduction: 1_536_000 },
  { limit: 40_000_000,  rate: 0.40, deduction: 2_796_000 },
  { limit: Infinity,    rate: 0.45, deduction: 4_796_000 },
];

function calcIncomeTax(taxableIncome) {
  if (taxableIncome <= 0) return { tax: 0, rate: 0 };
  const bracket = INCOME_TAX_BRACKETS.find(b => taxableIncome <= b.limit);
  const tax = Math.floor(taxableIncome * bracket.rate) - bracket.deduction;
  return { tax: Math.max(0, tax), rate: bracket.rate };
}

function fmt(n) {
  if (n === null || n === undefined) return '—';
  const sign = n < 0 ? '−' : '';
  return sign + '¥' + Math.abs(Math.round(n)).toLocaleString('ja-JP');
}

function fmtMinus(n) {
  if (n <= 0) return '¥0';
  return '−¥' + Math.round(n).toLocaleString('ja-JP');
}

function val(id) {
  const v = parseFloat(document.getElementById(id).value.replace(/,/g, ''));
  return isNaN(v) || v < 0 ? 0 : v;
}

document.getElementById('invoice-type').addEventListener('change', function () {
  document.getElementById('actual-purchase-field').style.display =
    this.value === 'registered-actual' ? 'block' : 'none';
});

document.getElementById('calc-btn').addEventListener('click', calculate);
document.addEventListener('keydown', function (e) {
  if (e.key === 'Enter') calculate();
});

/**
 * 給与所得控除を計算する（円）
 * 副業の場合、本業の給与にはこの控除が適用されたうえで事業所得と合算される。
 * 参照: 国税庁 No.1410
 */
function calcEmploymentDeduction(income) {
  if (income <= 0) return 0;
  const man = income / 10000;
  if (man <= 162.5) return Math.min(550000, income);
  if (man <= 180) return Math.floor(income * 0.4 - 100000);
  if (man <= 360) return Math.floor(income * 0.3 + 80000);
  if (man <= 660) return Math.floor(income * 0.2 + 440000);
  if (man <= 850) return Math.floor(income * 0.1 + 1100000);
  return 1950000; // 850万円超は上限
}

/** 給与収入から給与所得を求める（円） */
function calcSalaryIncome(income) {
  return Math.max(0, income - calcEmploymentDeduction(income));
}

/**
 * 副業の確定申告が必要かを判定する。
 * 給与所得者は、給与以外の所得が20万円以下なら所得税の確定申告を省略できる。
 * ただし住民税の申告は別途必要なので、省略できる場合もそれを添える。
 * 参照: 国税庁 No.1900
 */
function judgeFilingRequirement(salaryIncomeRaw, businessIncome) {
  if (salaryIncomeRaw <= 0) {
    return { required: true, reason: '事業所得のみのため、確定申告が必要です。' };
  }
  if (businessIncome > 200000) {
    return {
      required: true,
      reason: '給与以外の所得が20万円を超えるため、確定申告が必要です。',
    };
  }
  return {
    required: false,
    reason:
      '給与以外の所得が20万円以下のため、所得税の確定申告は省略できます。' +
      'ただし住民税には20万円の基準がないため、お住まいの市区町村への住民税申告は別途必要です。',
  };
}

function calculate() {
  const salaryRaw     = val('salary-income');
  const revenueTaxInc = val('revenue');
  const expenses      = val('expenses');
  const blueDeduction = parseInt(document.getElementById('blue-deduction').value, 10);
  const socialIns     = val('social-insurance');
  const otherDeduct   = val('other-deduction');
  const dependents    = parseInt(document.getElementById('dependents').value, 10);
  const invoiceType   = document.getElementById('invoice-type').value;
  const actualPurch   = val('actual-purchases');

  // 売上税抜き（免税事業者の場合は税込み = 事業収入として扱う）
  const revenueExcl = invoiceType === 'exempt'
    ? revenueTaxInc
    : Math.round(revenueTaxInc / (1 + CONSUMPTION_TAX_RATE));

  // 事業所得
  const businessIncome = Math.max(0, revenueExcl - expenses);

  // 給与所得（副業の場合のみ。専業なら0）
  const salaryIncome = calcSalaryIncome(salaryRaw);

  // 所得税は給与所得と事業所得を合算した総所得に対してかかる。
  // 青色申告特別控除は事業所得からしか引けないので、先に事業側で相殺する。
  const businessAfterBlue = Math.max(0, businessIncome - blueDeduction);
  const totalIncome = salaryIncome + businessAfterBlue;

  // 各種控除（所得税）
  const basicDeduction     = totalIncome > 24_000_000 ? 0 : 480_000;
  const dependentDeduction = dependents * 380_000;

  // 所得税 課税所得
  const taxableIncome = Math.max(0,
    totalIncome
    - basicDeduction
    - socialIns
    - dependentDeduction
    - otherDeduct
  );

  // 副業の確定申告が必要かどうか
  const filing = judgeFilingRequirement(salaryRaw, businessAfterBlue);

  const { tax: incomeTax, rate } = calcIncomeTax(taxableIncome);
  const fukkouTax = Math.floor(incomeTax * 0.021);
  const incomeTaxTotal = incomeTax + fukkouTax;

  // 住民税（基礎控除は43万円）。所得税と同じく給与所得も合算する。
  const residentBasic    = 430_000;
  const residentTaxable  = Math.max(0,
    totalIncome
    - residentBasic
    - socialIns
    - dependentDeduction
    - otherDeduct
  );
  const residentTaxRate  = Math.floor(residentTaxable * 0.10);
  const residentFlat     = 5_000;
  const residentTotal    = residentTaxRate + residentFlat;

  // 消費税
  let consumptionTax = 0;
  let taxTypeLabel = '';
  if (invoiceType === 'exempt') {
    taxTypeLabel = '免税事業者（消費税納付不要）';
    consumptionTax = 0;
  } else if (invoiceType === 'registered-simple') {
    const taxCollected  = Math.round(revenueExcl * CONSUMPTION_TAX_RATE);
    const deemedPurchase = Math.floor(taxCollected * 0.50);
    consumptionTax = Math.max(0, taxCollected - deemedPurchase);
    taxTypeLabel = '課税事業者・簡易課税（サービス業 50%）';
  } else {
    const taxCollected  = Math.round(revenueExcl * CONSUMPTION_TAX_RATE);
    const taxPaid       = Math.round(actualPurch * CONSUMPTION_TAX_RATE);
    consumptionTax = Math.max(0, taxCollected - taxPaid);
    taxTypeLabel = '課税事業者・本則課税';
  }

  const totalTax = incomeTaxTotal + residentTotal + consumptionTax;
  // 手取りは給与収入も含めた全体から、経費・社会保険料・税を引いた額
  const takeaway = salaryRaw + revenueTaxInc - expenses - socialIns - totalTax;

  // DOM更新
  setText('r-revenue-excl', fmt(revenueExcl));
  setText('r-expenses',      fmt(-expenses));
  setText('r-business-income', fmt(businessIncome));

  setText('r-bi2',        fmt(businessIncome));
  setText('r-blue',       fmtMinus(blueDeduction));
  setText('r-basic',      fmtMinus(basicDeduction));
  setText('r-social',     fmtMinus(socialIns));
  setText('r-dependent',  fmtMinus(dependentDeduction));
  setText('r-other',      fmtMinus(otherDeduct));
  setText('r-taxable',    fmt(taxableIncome));
  setText('r-rate',       (rate * 100).toFixed(0) + '%');
  setText('r-income-tax', fmt(incomeTax));
  setText('r-income-tax-total', fmt(incomeTaxTotal));

  setText('r-resident-taxable', fmt(residentTaxable));
  setText('r-resident-tax',     fmt(residentTaxRate));
  setText('r-resident-flat',    fmt(residentFlat));
  setText('r-resident-total',   fmt(residentTotal));

  setText('r-tax-type',        taxTypeLabel);
  setText('r-consumption-tax', fmt(consumptionTax));

  setText('r-total',    fmt(totalTax));
  setText('r-takeaway', fmt(takeaway));

  // 副業の方向けの表示。給与収入が入っているときだけ意味を持つ
  const isSideJob = salaryRaw > 0;
  setText('r-takeaway-label', isSideJob
    ? '手取り概算（給与 ＋ 売上 − 経費 − 社保 − 税金）'
    : '手取り概算（売上 − 経費 − 社保 − 税金）');

  const filingBox = document.getElementById('r-filing-box');
  if (filingBox) {
    filingBox.hidden = !isSideJob;
    if (isSideJob) {
      const badge = document.getElementById('r-filing-badge');
      badge.textContent = filing.required ? '確定申告が必要です' : '所得税の確定申告は省略できます';
      badge.className = 'filing-badge ' + (filing.required ? 'filing-required' : 'filing-optional');
      setText('r-filing-reason', filing.reason);
    }
  }

  document.getElementById('result-section').style.display = 'block';
  document.getElementById('result-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}
