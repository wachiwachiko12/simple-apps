/* =============================================
   損益分岐点計算ツール — script.js
   ============================================= */

'use strict';

/* ===== State ===== */
let currentMode = 'rate'; // 'rate' | 'unit'
let bepChart = null;

/* ===== DOM references ===== */
const btnModeRate  = document.getElementById('btn-mode-rate');
const btnModeUnit  = document.getElementById('btn-mode-unit');
const fieldRate    = document.getElementById('field-rate');
const fieldPriceRate = document.getElementById('field-price-rate');
const fieldUnit    = document.getElementById('field-unit');
const fieldPriceUnit = document.getElementById('field-price-unit');

const inputFixed       = document.getElementById('fixed-cost');
const inputVarRate     = document.getElementById('variable-rate');
const inputPriceRate   = document.getElementById('unit-price-rate');
const inputVarUnit     = document.getElementById('variable-unit');
const inputPriceUnit   = document.getElementById('unit-price-unit');
const inputCurrentSales = document.getElementById('current-sales');
const inputTargetProfit = document.getElementById('target-profit');
const btnCalc          = document.getElementById('calc-btn');
const resultsEl        = document.getElementById('results');

/* KPI */
const elBepRevenue   = document.getElementById('bep-revenue');
const elBepUnits     = document.getElementById('bep-units');
const elContMargin   = document.getElementById('contribution-margin');

/* Safety */
const safetySection  = document.getElementById('safety-section');
const elSafetyRatio  = document.getElementById('safety-ratio');
const elSafetyBar    = document.getElementById('safety-bar');
const elSafetyNote   = document.getElementById('safety-note');

/* Target */
const targetSection  = document.getElementById('target-section');
const elTargetRevenue = document.getElementById('target-revenue');
const elTargetUnits   = document.getElementById('target-units');
const elTargetDiff    = document.getElementById('target-diff');

/* Breakdown */
const breakdownBody  = document.getElementById('breakdown-table-body');

/* ===== Mode toggle ===== */
function switchMode(mode) {
  currentMode = mode;

  btnModeRate.classList.toggle('active', mode === 'rate');
  btnModeUnit.classList.toggle('active', mode === 'unit');

  fieldRate.style.display      = mode === 'rate' ? '' : 'none';
  fieldPriceRate.style.display = mode === 'rate' ? '' : 'none';
  fieldUnit.style.display      = mode === 'unit' ? '' : 'none';
  fieldPriceUnit.style.display = mode === 'unit' ? '' : 'none';
}

btnModeRate.addEventListener('click', () => switchMode('rate'));
btnModeUnit.addEventListener('click', () => switchMode('unit'));

/* ===== Utilities ===== */
function fmtNum(n, decimals = 0) {
  if (!isFinite(n)) return '―';
  return n.toLocaleString('ja-JP', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

function getNum(el) {
  const v = parseFloat(el.value);
  return isNaN(v) ? null : v;
}

/* ===== Calculation ===== */
function calculate() {
  const fixedCost = getNum(inputFixed);
  const currentSales = getNum(inputCurrentSales);
  const targetProfit = getNum(inputTargetProfit);

  let unitPrice, variableCostPerUnit, contributionMarginRate;

  if (currentMode === 'rate') {
    const varRate  = getNum(inputVarRate);
    const price    = getNum(inputPriceRate);

    if (fixedCost === null || varRate === null || price === null) {
      alert('固定費・変動費率・販売単価を入力してください。');
      return;
    }
    if (varRate <= 0 || varRate >= 100) {
      alert('変動費率は1〜99%の範囲で入力してください。');
      return;
    }
    if (price <= 0) {
      alert('販売単価は1以上を入力してください。');
      return;
    }

    contributionMarginRate = (100 - varRate) / 100;
    variableCostPerUnit    = price * (varRate / 100);
    unitPrice              = price;

  } else {
    const varUnit = getNum(inputVarUnit);
    const price   = getNum(inputPriceUnit);

    if (fixedCost === null || varUnit === null || price === null) {
      alert('固定費・単位変動費・販売単価を入力してください。');
      return;
    }
    if (varUnit >= price) {
      alert('単位変動費は販売単価より小さい値を入力してください。');
      return;
    }
    if (price <= 0) {
      alert('販売単価は1以上を入力してください。');
      return;
    }

    variableCostPerUnit    = varUnit;
    unitPrice              = price;
    contributionMarginRate = (unitPrice - variableCostPerUnit) / unitPrice;
  }

  if (fixedCost < 0) {
    alert('固定費は0以上を入力してください。');
    return;
  }

  /* Core BEP */
  const bepRevenue = fixedCost / contributionMarginRate;
  const bepUnits   = bepRevenue / unitPrice;

  /* Target */
  let targetRevenue = null, targetUnits = null, targetDiff = null;
  if (targetProfit !== null && targetProfit >= 0) {
    targetRevenue = (fixedCost + targetProfit) / contributionMarginRate;
    targetUnits   = targetRevenue / unitPrice;
    targetDiff    = targetRevenue - bepRevenue;
  }

  /* Safety margin */
  let safetyRatio = null;
  if (currentSales !== null && currentSales > 0) {
    safetyRatio = ((currentSales - bepRevenue) / currentSales) * 100;
  }

  /* ===== Render KPI ===== */
  elBepRevenue.textContent  = fmtNum(Math.ceil(bepRevenue));
  elBepUnits.textContent    = fmtNum(Math.ceil(bepUnits));
  elContMargin.textContent  = fmtNum(contributionMarginRate * 100, 1);

  /* ===== Render safety ===== */
  if (safetyRatio !== null) {
    safetySection.hidden = false;
    elSafetyRatio.textContent = fmtNum(safetyRatio, 1) + '%';
    const barPct = Math.min(Math.max(safetyRatio, 0), 40);
    elSafetyBar.style.width = (barPct / 40 * 100) + '%';

    if (safetyRatio < 0) {
      elSafetyNote.textContent = '現在の売上は損益分岐点を下回っています。赤字の状態です。固定費の削減または売上の増加が急務です。';
      elSafetyRatio.style.color = '#dc2626';
    } else if (safetyRatio < 10) {
      elSafetyNote.textContent = '安全余裕率が10%未満です。損益分岐点に近く、売上が少し落ちると赤字になる危険があります。';
      elSafetyRatio.style.color = '#f59e0b';
    } else if (safetyRatio < 20) {
      elSafetyNote.textContent = '安全余裕率は10〜20%の注意圏内です。固定費削減や変動費率改善を検討してください。';
      elSafetyRatio.style.color = '#d97706';
    } else if (safetyRatio < 30) {
      elSafetyNote.textContent = '安全余裕率20%以上で健全な水準です。更なる改善でより安定した経営基盤を築けます。';
      elSafetyRatio.style.color = '#16a34a';
    } else {
      elSafetyNote.textContent = '安全余裕率30%以上の優良な状態です。現在の費用構造・売上水準を維持・強化してください。';
      elSafetyRatio.style.color = '#16a34a';
    }
  } else {
    safetySection.hidden = true;
  }

  /* ===== Render target ===== */
  if (targetRevenue !== null) {
    targetSection.hidden = false;
    elTargetRevenue.textContent = fmtNum(Math.ceil(targetRevenue));
    elTargetUnits.textContent   = fmtNum(Math.ceil(targetUnits));
    elTargetDiff.textContent    = fmtNum(Math.ceil(targetDiff));
  } else {
    targetSection.hidden = true;
  }

  /* ===== Render breakdown ===== */
  const varRatePct = (1 - contributionMarginRate) * 100;
  const rows = [
    ['固定費（月額）',      fmtNum(fixedCost) + ' 円',            false],
    ['変動費率',            fmtNum(varRatePct, 1) + ' %',         false],
    ['販売単価',            fmtNum(unitPrice) + ' 円 / 個',       false],
    ['単位あたり変動費',    fmtNum(variableCostPerUnit, 0) + ' 円 / 個', false],
    ['単位あたり限界利益',  fmtNum(unitPrice - variableCostPerUnit, 0) + ' 円 / 個', false],
    ['限界利益率',          fmtNum(contributionMarginRate * 100, 2) + ' %', false],
    ['損益分岐点売上高',    fmtNum(Math.ceil(bepRevenue)) + ' 円',  true],
    ['損益分岐点販売数',    fmtNum(Math.ceil(bepUnits)) + ' 個',    true],
  ];

  if (targetRevenue !== null) {
    rows.push(['目標売上高（利益 ' + fmtNum(targetProfit) + '円）', fmtNum(Math.ceil(targetRevenue)) + ' 円', true]);
    rows.push(['目標販売数', fmtNum(Math.ceil(targetUnits)) + ' 個', true]);
  }
  if (safetyRatio !== null) {
    rows.push(['安全余裕率', fmtNum(safetyRatio, 1) + ' %', true]);
  }

  breakdownBody.innerHTML = rows.map(([label, value, highlight]) => `
    <tr>
      <td class="row-label">${label}</td>
      <td class="row-value${highlight ? ' row-highlight' : ''}">${value}</td>
    </tr>
  `).join('');

  /* ===== Chart ===== */
  renderChart(fixedCost, unitPrice, variableCostPerUnit, bepRevenue, bepUnits, currentSales, targetRevenue);

  /* ===== Show results ===== */
  resultsEl.hidden = false;
  resultsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });

  /* ===== AdSense ===== */
  try {
    (window.adsbygoogle = window.adsbygoogle || []).push({});
  } catch (e) { /* ignore */ }
}

/* ===== Chart rendering ===== */
function renderChart(fixedCost, unitPrice, varCostPerUnit, bepRevenue, bepUnits, currentSales, targetRevenue) {
  const ctx = document.getElementById('bep-chart').getContext('2d');

  /* X-axis range: 0 to 2× BEP units */
  const maxUnits = Math.ceil(bepUnits * 2);
  const step = Math.max(1, Math.ceil(maxUnits / 20));
  const labels = [];
  for (let i = 0; i <= maxUnits; i += step) labels.push(i);
  if (labels[labels.length - 1] !== maxUnits) labels.push(maxUnits);

  const revenueData = labels.map(u => u * unitPrice);
  const totalCostData = labels.map(u => fixedCost + u * varCostPerUnit);
  const fixedData = labels.map(() => fixedCost);

  /* BEP annotation point */
  const bepX = bepUnits;
  const bepY = bepRevenue;

  if (bepChart) {
    bepChart.destroy();
    bepChart = null;
  }

  bepChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: '総売上高',
          data: revenueData,
          borderColor: '#16a34a',
          backgroundColor: 'rgba(22,163,74,0.08)',
          borderWidth: 2.5,
          pointRadius: 0,
          pointHoverRadius: 4,
          fill: false,
          tension: 0,
          order: 2
        },
        {
          label: '総費用（固定費+変動費）',
          data: totalCostData,
          borderColor: '#dc2626',
          backgroundColor: 'rgba(220,38,38,0.06)',
          borderWidth: 2.5,
          pointRadius: 0,
          pointHoverRadius: 4,
          fill: false,
          tension: 0,
          order: 3
        },
        {
          label: '固定費',
          data: fixedData,
          borderColor: '#6b7280',
          backgroundColor: 'rgba(107,114,128,0.05)',
          borderWidth: 1.5,
          borderDash: [6, 4],
          pointRadius: 0,
          pointHoverRadius: 0,
          fill: false,
          tension: 0,
          order: 4
        },
        {
          label: '損益分岐点',
          data: [{ x: bepX, y: bepY }],
          type: 'scatter',
          backgroundColor: '#d97706',
          borderColor: '#ffffff',
          borderWidth: 2,
          pointRadius: 9,
          pointHoverRadius: 11,
          order: 1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(26,26,46,0.9)',
          titleColor: '#ffffff',
          bodyColor: 'rgba(255,255,255,0.85)',
          padding: 10,
          callbacks: {
            title: (items) => {
              if (items[0] && items[0].dataset.label === '損益分岐点') {
                return '損益分岐点';
              }
              const u = items[0]?.label;
              return u !== undefined ? `販売数: ${Number(u).toLocaleString('ja-JP')} 個` : '';
            },
            label: (item) => {
              if (item.dataset.label === '損益分岐点') {
                return [
                  `売上高: ${Math.ceil(bepY).toLocaleString('ja-JP')} 円`,
                  `販売数: ${Math.ceil(bepX).toLocaleString('ja-JP')} 個`
                ];
              }
              const v = item.raw;
              if (typeof v === 'number') {
                return `${item.dataset.label}: ${Math.round(v).toLocaleString('ja-JP')} 円`;
              }
              return '';
            }
          }
        }
      },
      scales: {
        x: {
          type: 'linear',
          title: {
            display: true,
            text: '販売数量（個）',
            color: '#6b7280',
            font: { size: 11 }
          },
          ticks: {
            color: '#9ca3af',
            font: { size: 10 },
            maxTicksLimit: 8,
            callback: (v) => v.toLocaleString('ja-JP')
          },
          grid: {
            color: 'rgba(0,0,0,0.05)'
          }
        },
        y: {
          title: {
            display: true,
            text: '金額（円）',
            color: '#6b7280',
            font: { size: 11 }
          },
          ticks: {
            color: '#9ca3af',
            font: { size: 10 },
            maxTicksLimit: 7,
            callback: (v) => {
              if (v >= 1000000) return (v / 1000000).toFixed(1) + 'M';
              if (v >= 1000)    return (v / 1000).toFixed(0) + 'K';
              return v;
            }
          },
          grid: {
            color: 'rgba(0,0,0,0.05)'
          }
        }
      }
    },
    plugins: [
      {
        /* Paint loss zone (left of BEP) and profit zone (right of BEP) */
        id: 'bepZones',
        beforeDraw(chart) {
          const { ctx: c, chartArea, scales } = chart;
          if (!chartArea) return;

          const xBep = scales.x.getPixelForValue(bepX);
          const { left, right, top, bottom } = chartArea;

          /* Loss zone */
          c.save();
          c.fillStyle = 'rgba(220,38,38,0.055)';
          c.fillRect(left, top, Math.min(xBep, right) - left, bottom - top);
          c.restore();

          /* Profit zone */
          if (xBep < right) {
            c.save();
            c.fillStyle = 'rgba(22,163,74,0.055)';
            c.fillRect(xBep, top, right - xBep, bottom - top);
            c.restore();
          }

          /* BEP vertical dashed line */
          c.save();
          c.strokeStyle = 'rgba(217,119,6,0.5)';
          c.lineWidth = 1.5;
          c.setLineDash([5, 4]);
          c.beginPath();
          c.moveTo(xBep, top);
          c.lineTo(xBep, bottom);
          c.stroke();
          c.restore();

          /* Zone labels */
          c.save();
          c.font = '600 11px Outfit, sans-serif';
          c.fillStyle = 'rgba(220,38,38,0.5)';
          c.fillText('損失', left + 8, top + 18);
          if (right - xBep > 40) {
            c.fillStyle = 'rgba(22,163,74,0.5)';
            c.fillText('利益', xBep + 8, top + 18);
          }
          c.restore();
        }
      }
    ]
  });
}

/* ===== Event: calculate button ===== */
btnCalc.addEventListener('click', calculate);

/* ===== Allow Enter key in inputs ===== */
document.querySelectorAll('.form-input').forEach(input => {
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') calculate();
  });
});
