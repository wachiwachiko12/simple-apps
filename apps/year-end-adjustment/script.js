'use strict';

function calcSalaryDeduction(income) {
  const y = income * 10000;
  if (y <= 1625000) return 550000;
  if (y <= 1800000) return Math.floor(y * 0.40 - 100000);
  if (y <= 3600000) return Math.floor(y * 0.30 + 80000);
  if (y <= 6600000) return Math.floor(y * 0.20 + 440000);
  if (y <= 8500000) return Math.floor(y * 0.10 + 1100000);
  return 1950000;
}

function getIncomeTaxRate(taxableIncome) {
  if (taxableIncome <= 1950000)  return { rate: 0.05, deduction: 0 };
  if (taxableIncome <= 3300000)  return { rate: 0.10, deduction: 97500 };
  if (taxableIncome <= 6950000)  return { rate: 0.20, deduction: 427500 };
  if (taxableIncome <= 9000000)  return { rate: 0.23, deduction: 636000 };
  if (taxableIncome <= 18000000) return { rate: 0.33, deduction: 1536000 };
  if (taxableIncome <= 40000000) return { rate: 0.40, deduction: 2796000 };
  return { rate: 0.45, deduction: 4796000 };
}

function calcLifeInsuranceDeduction(premium) {
  if (premium <= 0) return 0;
  const p = premium * 10000;
  if (p <= 20000) return p;
  if (p <= 40000) return Math.floor(p / 2 + 10000);
  if (p <= 80000) return Math.floor(p / 4 + 20000);
  return 40000;
}

let deductionChart = null;

function toggleSocialMode(isAuto) {
  document.getElementById('social-manual-input').style.display = isAuto ? 'none' : 'block';
  document.getElementById('social-hint').style.display = isAuto ? '' : 'none';
  document.getElementById('social-auto-btn').classList.toggle('active', isAuto);
  document.getElementById('social-manual-btn').classList.toggle('active', !isAuto);
}

function calculate() {
  const income = parseFloat(document.getElementById('income').value) || 0;
  const withheld = parseFloat(document.getElementById('withheld-tax').value) || 0;
  const spouseVal = document.getElementById('spouse').value;
  const depGeneral = parseInt(document.getElementById('dep-general').value) || 0;
  const depSpecific = parseInt(document.getElementById('dep-specific').value) || 0;

  const isAutoSocial = document.getElementById('social-auto-btn').classList.contains('active');
  let socialIns;
  if (isAutoSocial) {
    socialIns = Math.round(income * 10000 * 0.148);
  } else {
    socialIns = (parseFloat(document.getElementById('social-insurance').value) || 0) * 10000;
  }

  const lifePremium = parseFloat(document.getElementById('life-insurance').value) || 0;
  const earthquakePremium = parseFloat(document.getElementById('earthquake-insurance').value) || 0;
  const ideco = (parseFloat(document.getElementById('ideco').value) || 0) * 12;
  const housingLoan = parseFloat(document.getElementById('housing-loan').value) || 0;

  const grossIncome = income * 10000;
  const salaryDeduction = calcSalaryDeduction(income);
  const netIncome = grossIncome - salaryDeduction;

  const basicDeduction = netIncome <= 24000000 ? 480000 : 0;
  const spouseDeduction = spouseVal === 'yes' ? 380000 : spouseVal === 'yes_working' ? 260000 : 0;
  const depDeduction = depGeneral * 380000 + depSpecific * 630000;
  const lifeInsDeduction = calcLifeInsuranceDeduction(lifePremium);
  const earthquakeDeduction = Math.min(earthquakePremium * 10000, 50000);
  const idecoDeduction = ideco;

  const totalDeductions = basicDeduction + spouseDeduction + depDeduction + socialIns + lifeInsDeduction + earthquakeDeduction + idecoDeduction;

  const taxableIncome = Math.max(0, netIncome - totalDeductions);
  const { rate, deduction } = getIncomeTaxRate(taxableIncome);
  let incomeTax = Math.max(0, taxableIncome * rate - deduction);
  incomeTax = Math.floor(incomeTax * 1.021);

  const housingCredit = Math.min(housingLoan * 10000 * 0.007, 210000);
  const finalTax = Math.max(0, incomeTax - housingCredit);

  const withheldYen = withheld * 10000;
  const diff = withheldYen - finalTax;

  const residentTax = Math.round(taxableIncome * 0.10);

  document.getElementById('d-income').textContent = '¥' + grossIncome.toLocaleString();
  document.getElementById('d-deductions').textContent = '¥' + totalDeductions.toLocaleString();
  document.getElementById('d-taxable').textContent = '¥' + taxableIncome.toLocaleString();
  document.getElementById('d-income-tax').textContent = '¥' + incomeTax.toLocaleString();
  document.getElementById('d-housing-credit').textContent = housingCredit > 0 ? '-¥' + housingCredit.toLocaleString() : '—';
  document.getElementById('d-final-tax').textContent = '¥' + finalTax.toLocaleString();
  document.getElementById('d-withheld').textContent = '¥' + withheldYen.toLocaleString();
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

  const ctx = document.getElementById('deduction-chart').getContext('2d');
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
});
