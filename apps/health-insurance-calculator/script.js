'use strict';

// 2024年度 地域別料率: [所得割(%), 均等割(円/人)]
const RATES = {
  avg:      { med: [7.50, 28000], sup: [2.50,  9000], care: [2.50, 14000] },
  tokyo:    { med: [7.41, 48000], sup: [2.75, 16600], care: [2.24, 16600] },
  osaka:    { med: [9.84, 45000], sup: [3.50, 12800], care: [2.70, 14800] },
  yokohama: { med: [9.62, 41412], sup: [3.15, 14448], care: [2.27, 18984] },
  nagoya:   { med: [7.26, 19680], sup: [2.55,  6888], care: [2.70, 10800] },
  sapporo:  { med: [7.97, 25090], sup: [2.80,  9035], care: [2.33, 11055] },
  fukuoka:  { med: [8.43, 25000], sup: [3.12,  9360], care: [2.55, 13200] },
};

const CAP = { med: 890000, sup: 320000, care: 170000 };

let breakdownChart = null;
let lastAnnualTotal = 0;

function fmt(v) { return '¥' + Math.round(v).toLocaleString(); }

function getReducePct(incomeMan, members) {
  const income = incomeMan * 10000;
  if (income <= 430000)                         return 7;
  if (income <= 430000 + 290000 * members)      return 5;
  if (income <= 430000 + 535000 * members)      return 2;
  return 0;
}

function calcKokuho(incomeMan, members, careMembers, region) {
  const income = incomeMan * 10000;
  const r = RATES[region] || RATES.avg;
  const base = Math.max(0, income - 430000);
  const reducePct = getReducePct(incomeMan, members);

  function calcPart(rateArr, count, cap) {
    const incomeAmt = Math.round(base * rateArr[0] / 100);
    const equalRaw  = rateArr[1] * count;
    const equalAmt  = reducePct > 0 ? Math.round(equalRaw * (1 - reducePct / 10)) : equalRaw;
    return Math.min(incomeAmt + equalAmt, cap);
  }

  const med  = calcPart(r.med,  members,     CAP.med);
  const sup  = calcPart(r.sup,  members,     CAP.sup);
  const care = careMembers > 0 ? calcPart(r.care, careMembers, CAP.care) : 0;
  return { med, sup, care, total: med + sup + care, reducePct };
}

function calculate() {
  const income      = parseFloat(document.getElementById('income').value) || 0;
  const members     = parseInt(document.getElementById('members').value) || 1;
  const careMembers = parseInt(document.getElementById('care-members').value) || 0;
  const region      = document.getElementById('region').value;

  const { med, sup, care, total, reducePct } = calcKokuho(income, members, careMembers, region);
  lastAnnualTotal = total;
  const monthly = Math.round(total / 10);

  document.getElementById('annual-total').textContent  = fmt(total);
  document.getElementById('monthly-total').textContent = fmt(monthly);
  document.getElementById('amt-medical').textContent   = fmt(med);
  document.getElementById('amt-support').textContent   = fmt(sup);
  document.getElementById('amt-care').textContent      = care > 0 ? fmt(care) : '—';
  document.getElementById('amt-total').textContent     = fmt(total);
  document.getElementById('row-care').style.display    = care > 0 ? '' : 'none';

  const badgeEl = document.getElementById('reduction-badge');
  if (reducePct > 0) {
    document.getElementById('reduction-text').textContent = `均等割 ${reducePct}割軽減が適用されます（所得基準以下）`;
    badgeEl.style.display = '';
  } else {
    badgeEl.style.display = 'none';
  }

  renderChart(med, sup, care);

  document.getElementById('result-section').style.display = '';
  document.getElementById('result-section').scrollIntoView({ behavior: 'smooth', block: 'start' });

  updateComparison();
}

function renderChart(med, sup, care) {
  const ctx = document.getElementById('breakdown-chart').getContext('2d');
  if (breakdownChart) breakdownChart.destroy();
  const labels = ['医療分', '支援分'];
  const data   = [med, sup];
  const colors = ['#3b82f6', '#f59e0b'];
  if (care > 0) { labels.push('介護分'); data.push(care); colors.push('#10b981'); }
  breakdownChart = new Chart(ctx, {
    type: 'doughnut',
    data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 2, borderColor: '#fff' }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 12 } },
        tooltip: { callbacks: { label: c => `${c.label}: ¥${c.parsed.toLocaleString()}` } },
      },
    },
  });
}

function updateComparison() {
  const kenpoIncome = parseFloat(document.getElementById('kenpo-income').value) || 0;
  const tableEl = document.getElementById('comparison-table');
  if (!kenpoIncome || lastAnnualTotal === 0) {
    tableEl.style.display = 'none';
    return;
  }

  // 協会けんぽ任意継続: 標準報酬月額×保険料率10.0%（全額本人負担）、上限139万円
  const hyojun     = Math.min(kenpoIncome * 10000, 1390000);
  const kenpoAnnual  = Math.round(hyojun * 0.100 * 12);
  const kenpoMonthly = Math.round(hyojun * 0.100);

  document.getElementById('comp-kokuho-annual').textContent  = fmt(lastAnnualTotal);
  document.getElementById('comp-kokuho-monthly').textContent = fmt(Math.round(lastAnnualTotal / 10));
  document.getElementById('comp-kenpo-annual').textContent   = fmt(kenpoAnnual);
  document.getElementById('comp-kenpo-monthly').textContent  = fmt(kenpoMonthly);

  const winnerEl = document.getElementById('comp-winner');
  if (lastAnnualTotal < kenpoAnnual) {
    winnerEl.textContent  = '✅ 国民健康保険の方が安い可能性があります';
    winnerEl.style.color  = '#3b82f6';
  } else if (kenpoAnnual < lastAnnualTotal) {
    winnerEl.textContent  = '✅ 協会けんぽ任意継続の方が安い可能性があります';
    winnerEl.style.color  = '#f59e0b';
  } else {
    winnerEl.textContent  = '両者の保険料はほぼ同等です';
    winnerEl.style.color  = '#6b7280';
  }

  tableEl.style.display = '';
}

function toggleAccordion(btn) {
  const expanded = btn.getAttribute('aria-expanded') === 'true';
  btn.setAttribute('aria-expanded', String(!expanded));
  const body = btn.nextElementSibling;
  if (body) body.style.display = expanded ? 'none' : 'block';
}
