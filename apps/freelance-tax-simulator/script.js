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

function calculate() {
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

  // 各種控除（所得税）
  const basicDeduction     = businessIncome > 24_000_000 ? 0 : 480_000;
  const dependentDeduction = dependents * 380_000;

  // 所得税 課税所得
  const taxableIncome = Math.max(0,
    businessIncome
    - blueDeduction
    - basicDeduction
    - socialIns
    - dependentDeduction
    - otherDeduct
  );

  const { tax: incomeTax, rate } = calcIncomeTax(taxableIncome);
  const fukkouTax = Math.floor(incomeTax * 0.021);
  const incomeTaxTotal = incomeTax + fukkouTax;

  // 住民税（基礎控除は43万円）
  const residentBasic    = 430_000;
  const residentTaxable  = Math.max(0,
    businessIncome
    - blueDeduction
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
  const takeaway = revenueTaxInc - expenses - socialIns - totalTax;

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

  document.getElementById('result-section').style.display = 'block';
  document.getElementById('result-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}
