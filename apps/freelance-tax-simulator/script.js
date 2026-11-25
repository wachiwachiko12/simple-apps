'use strict';

/* ---------------------------------------------------------------------------
 * 令和8年分（2026年分）の確定申告に対応。
 *
 * 根拠（所得税）: 財務省「令和８年度税制改正の大綱」一 個人所得課税 １
 *   https://www.mof.go.jp/tax_policy/tax_reform/outline/fy2026/08taikou_01.htm
 *   国税庁 タックスアンサー No.1199 基礎控除 / No.1410 給与所得控除
 *   https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/1199.htm
 *   https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/1410.htm
 *   （いずれも令和8年4月1日現在法令等。令和8年12月1日施行・令和8年分から適用）
 *   - 基礎控除は本則62万円。令和8年分・令和9年分は加算があり、合計所得金額
 *     489万円以下は104万円、489万円超655万円以下は67万円になる。
 *   - 給与所得控除の最低保障額は74万円（本則69万円＋令和8年・9年分の特例5万円）。
 *     給与収入220万円までは一律74万円で、162.5万円・180万円の区分は無くなった。
 *
 * 根拠（個人住民税）: 同大綱 一 個人所得課税 １（地方税）
 *   - 給与所得控除の最低保障額は65万円→69万円、令和9年度分・令和10年度分は
 *     さらに5万円引き上げ（＝74万円）。令和9年度分以後の個人住民税に適用。
 *     令和9年度分の住民税は令和8年分の所得が課税標準なので、本ツールでは
 *     所得税と同じ給与所得控除を使う。
 *   - **基礎控除の引上げは（地方税）に項目が無く、43万円のまま据え置き。**
 *     所得税の基礎控除（最大104万円）と住民税の基礎控除（43万円）が
 *     大きく開くのが令和8年分の特徴。
 * ------------------------------------------------------------------------ */

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

/** 給与所得控除の最低保障額（本則69万円＋令和8年・9年分の特例5万円） */
const SALARY_DEDUCTION_MIN = 740000;

/**
 * 給与所得控除を計算する（円・令和8年分）
 * 副業の場合、本業の給与にはこの控除が適用されたうえで事業所得と合算される。
 * 参照: 国税庁 No.1410（令和8年分・令和9年分の表）
 *
 * 計算は year-end-adjustment / ideco-simulator の calcSalaryDeduction と
 * 同じ結果になる（calc.test.js で突き合わせている）。
 */
function calcEmploymentDeduction(income) {
  const y = Math.max(0, income);
  let d;
  if (y <= 1800000) d = Math.floor(y * 0.40 - 100000);
  else if (y <= 3600000) d = Math.floor(y * 0.30 + 80000);
  else if (y <= 6600000) d = Math.floor(y * 0.20 + 440000);
  else if (y <= 8500000) d = Math.floor(y * 0.10 + 1100000);
  else d = 1950000; // 850万円超は上限195万円
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
  if (netIncome > 25000000) return 0;
  if (netIncome > 24500000) return 160000;
  if (netIncome > 24000000) return 320000;
  if (netIncome > 23500000) return 480000;

  let d = 620000; // 本則（合計所得金額2,350万円以下）
  if (netIncome <= 4890000) d += 420000;      // 令和8年・9年分の加算（→104万円）
  else if (netIncome <= 6550000) d += 50000;  // 同上（→67万円）
  return d;
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
  const basicDeduction     = calcBasicDeduction(totalIncome);
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

  // 住民税。所得税と同じく給与所得も合算する。
  // 基礎控除は令和8年度税制改正の（地方税）に引上げの項目が無く、43万円のまま。
  // 所得税側が最大104万円まで上がったため、両者の差が令和8年分で最も開く。
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

  setText('r-resident-basic',   fmtMinus(residentBasic));
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
