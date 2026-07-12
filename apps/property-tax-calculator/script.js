'use strict';

let taxChart = null;

function fmt(val) {
  return '¥' + Math.round(val).toLocaleString();
}

function calculate() {
  const landValue = parseFloat(document.getElementById('landValue').value) || 0;
  const landArea  = parseFloat(document.getElementById('landArea').value)  || 0;
  const landUse   = document.getElementById('landUse').value;
  const buildingValue = parseFloat(document.getElementById('buildingValue').value) || 0;
  const buildingType  = document.getElementById('buildingType').value;
  const buildingAge   = parseInt(document.getElementById('buildingAge').value) || 0;
  const isLongLife    = document.getElementById('isLongLife').checked;
  const applyUrban    = document.getElementById('applyUrbanTax').checked;

  const errEl = document.getElementById('error-msg');
  errEl.style.display = 'none';
  if (landValue <= 0 && buildingValue <= 0) {
    errEl.textContent = '土地または建物の評価額を入力してください。';
    errEl.style.display = '';
    return;
  }

  const FIXED_RATE = 0.014;
  const URBAN_RATE = 0.003;

  let landTaxBase = landValue * 10000;
  let landUrbanBase = landValue * 10000;

  if (landUse === 'residential') {
    if (landArea <= 200) {
      landTaxBase   = landValue * 10000 / 6;
      landUrbanBase = landValue * 10000 / 3;
    } else {
      landTaxBase   = landValue * 10000 / 3;
      landUrbanBase = landValue * 10000 * 2 / 3;
    }
  } else if (landUse === 'farm') {
    landTaxBase   = landValue * 10000 * 0.55;
    landUrbanBase = landValue * 10000 * 0.55;
  }

  const landFixed = Math.round(landTaxBase * FIXED_RATE);
  const landUrban = applyUrban ? Math.round(landUrbanBase * URBAN_RATE) : 0;

  let buildingTaxBase = buildingValue * 10000;
  let buildingFixed = Math.round(buildingTaxBase * FIXED_RATE);
  let buildingUrban = applyUrban ? Math.round(buildingTaxBase * URBAN_RATE) : 0;

  // 新築軽減
  let reductionNote = '';
  if (buildingAge === 0 || buildingAge <= (isLongLife ? 5 : 3)) {
    const exemptYears = isLongLife ? 5 : 3;
    if (buildingType === 'mansion') {
      const exemptYearsM = isLongLife ? 7 : 5;
      if (buildingAge <= exemptYearsM) {
        const base120 = Math.min(buildingTaxBase, 1200 * 10000);
        buildingFixed -= Math.round(base120 * FIXED_RATE / 2);
        reductionNote = `新築マンション${isLongLife ? '長期優良' : ''}軽減（${exemptYearsM}年間）が適用されています。`;
      }
    } else {
      if (buildingAge <= exemptYears) {
        const base120 = Math.min(buildingTaxBase, 1200 * 10000);
        buildingFixed -= Math.round(base120 * FIXED_RATE / 2);
        reductionNote = `新築一戸建て${isLongLife ? '長期優良' : ''}軽減（${exemptYears}年間）が適用されています。`;
      }
    }
  }
  buildingFixed = Math.max(0, buildingFixed);

  const totalFixed = landFixed + buildingFixed;
  const totalUrban = landUrban + buildingUrban;
  const totalAnnual = totalFixed + totalUrban;
  const monthly = Math.round(totalAnnual / 12);
  const quarterly = Math.round(totalAnnual / 4);

  document.getElementById('totalAnnual').textContent  = fmt(totalAnnual);
  document.getElementById('monthly').textContent       = fmt(monthly);
  document.getElementById('quarterly').textContent     = fmt(quarterly);
  document.getElementById('landTaxBase').textContent   = fmt(landTaxBase);
  document.getElementById('landFixedTax').textContent  = fmt(landFixed);
  document.getElementById('landUrbanTax').textContent  = applyUrban ? fmt(landUrban) : '—';
  document.getElementById('buildingTaxBase').textContent  = fmt(buildingTaxBase);
  document.getElementById('buildingFixedTax').textContent = fmt(buildingFixed);
  document.getElementById('buildingUrbanTax').textContent = applyUrban ? fmt(buildingUrban) : '—';
  document.getElementById('totalFixed').textContent = fmt(totalFixed);
  document.getElementById('totalUrban').textContent = applyUrban ? fmt(totalUrban) : '—';

  const reductionBanner = document.getElementById('reductionBanner');
  if (reductionNote) {
    document.getElementById('reductionText').textContent = reductionNote;
    reductionBanner.style.display = '';
  } else {
    reductionBanner.style.display = 'none';
  }

  renderChart(landFixed, landUrban, buildingFixed, buildingUrban);

  document.getElementById('result').style.display = '';
  document.getElementById('result').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderChart(lf, lu, bf, bu) {
  const ctx = document.getElementById('taxChart').getContext('2d');
  if (taxChart) taxChart.destroy();
  const labels = ['土地 固定資産税', '建物 固定資産税'];
  const data   = [lf, bf];
  const colors = ['#d97706', '#92400e'];
  if (lu > 0) { labels.push('土地 都市計画税'); data.push(lu); colors.push('#f59e0b'); }
  if (bu > 0) { labels.push('建物 都市計画税'); data.push(bu); colors.push('#b45309'); }
  taxChart = new Chart(ctx, {
    type: 'pie',
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

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('calcBtn').addEventListener('click', calculate);
  document.querySelectorAll('input, select').forEach(el => {
    el.addEventListener('keydown', e => { if (e.key === 'Enter') calculate(); });
  });
});
