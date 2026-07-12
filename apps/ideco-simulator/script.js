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

function getIncomeTaxRate(taxableIncome) {
  if (taxableIncome <= 1950000)  return { rate: 0.05, deduction: 0 };
  if (taxableIncome <= 3300000)  return { rate: 0.10, deduction: 97500 };
  if (taxableIncome <= 6950000)  return { rate: 0.20, deduction: 427500 };
  if (taxableIncome <= 9000000)  return { rate: 0.23, deduction: 636000 };
  if (taxableIncome <= 18000000) return { rate: 0.33, deduction: 1536000 };
  if (taxableIncome <= 40000000) return { rate: 0.40, deduction: 2796000 };
  return { rate: 0.45, deduction: 4796000 };
}

function calcSalaryDeduction(income) {
  const y = income * 10000;
  if (y <= 1625000) return 550000;
  if (y <= 1800000) return y * 0.40 - 100000;
  if (y <= 3600000) return y * 0.30 + 80000;
  if (y <= 6600000) return y * 0.20 + 440000;
  if (y <= 8500000) return y * 0.10 + 1100000;
  return 1950000;
}

function calcEffectiveRate(annualIncome) {
  const salaryDeduction = calcSalaryDeduction(annualIncome);
  const socialIns = annualIncome * 10000 * 0.148;
  const basicDeduction = 480000;
  const taxableIncome = Math.max(0, annualIncome * 10000 - salaryDeduction - socialIns - basicDeduction);
  const { rate } = getIncomeTaxRate(taxableIncome);
  return rate + 0.10;
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

  const annualContrib = monthly * 12;
  const effectiveRate = calcEffectiveRate(income);
  const annualTaxSaving = Math.floor(annualContrib * effectiveRate);
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
  document.getElementById('annual-tax-rate').textContent = `実効税率: ${(effectiveRate * 100).toFixed(1)}%`;
  document.getElementById('total-tax-saving').textContent = '¥' + totalTaxSaving.toLocaleString();
  document.getElementById('period-years').textContent = `積立期間: ${period}年`;
  document.getElementById('total-assets').textContent = '¥' + totalAssets.toLocaleString();
  document.getElementById('investment-gain').textContent = `うち運用益: ¥${gain.toLocaleString()}`;
  document.getElementById('legend-principal').textContent = '¥' + principal.toLocaleString();
  document.getElementById('legend-gain').textContent = '¥' + gain.toLocaleString();

  const barTotal = principal + gain;
  document.getElementById('bar-principal').style.width = (principal / barTotal * 100) + '%';
  document.getElementById('bar-gain').style.width = (gain / barTotal * 100) + '%';

  const lumsumDeduction = Math.min(period * 40 * 10000, 2000 * 10000);
  document.getElementById('lumpsum-deduction').textContent = '¥' + lumsumDeduction.toLocaleString();
  document.getElementById('annuity-deduction').textContent = '公的年金等控除が適用';

  renderChart(period, monthly, monthlyRate);

  document.getElementById('result-section').style.display = '';
  document.getElementById('result-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
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
