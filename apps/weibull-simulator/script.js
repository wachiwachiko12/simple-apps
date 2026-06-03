/* ===== Weibull Plot Simulator ===== */

'use strict';

// ---- DOM refs ----
const betaSlider  = document.getElementById('beta-slider');
const etaSlider   = document.getElementById('eta-slider');
const nSlider     = document.getElementById('n-slider');
const betaVal     = document.getElementById('beta-val');
const etaVal      = document.getElementById('eta-val');
const nVal        = document.getElementById('n-val');
const resampleBtn = document.getElementById('resample-btn');
const histTitle   = document.getElementById('hist-title');

const statMean   = document.getElementById('stat-mean');
const statMedian = document.getElementById('stat-median');
const statStd    = document.getElementById('stat-std');
const statB10    = document.getElementById('stat-b10');

// ---- Gamma function (Lanczos approximation) ----
function gamma(z) {
  // Lanczos approximation (g=7, n=9 coefficients)
  const p = [
    0.99999999999980993,
    676.5203681218851,
    -1259.1392167224028,
    771.32342877765313,
    -176.61502916214059,
    12.507343278686905,
    -0.13857109526572012,
    9.9843695780195716e-6,
    1.5056327351493116e-7
  ];

  if (z < 0.5) {
    return Math.PI / (Math.sin(Math.PI * z) * gamma(1 - z));
  }

  z -= 1;
  let x = p[0];
  for (let i = 1; i < p.length; i++) {
    x += p[i] / (z + i);
  }

  const t = z + p.length - 1.5;
  return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x;
}

// ---- Weibull random sample: t = η * (-ln(U))^(1/β) ----
function weibullSample(beta, eta) {
  const u = Math.random();
  return eta * Math.pow(-Math.log(u), 1 / beta);
}

function generateSamples(beta, eta, n) {
  const samples = [];
  for (let i = 0; i < n; i++) {
    samples.push(weibullSample(beta, eta));
  }
  samples.sort((a, b) => a - b);
  return samples;
}

// ---- Median rank: F_i = (i - 0.3) / (N + 0.4) ----
function medianRanks(n) {
  const ranks = [];
  for (let i = 1; i <= n; i++) {
    ranks.push((i - 0.3) / (n + 0.4));
  }
  return ranks;
}

// ---- Compute characteristic values ----
function computeStats(beta, eta) {
  const g1  = gamma(1 + 1 / beta);
  const g2  = gamma(1 + 2 / beta);
  const mean    = eta * g1;
  const median  = eta * Math.pow(Math.LN2, 1 / beta);
  const variance = eta * eta * (g2 - g1 * g1);
  const std     = Math.sqrt(Math.max(0, variance));
  const b10     = eta * Math.pow(-Math.log(0.9), 1 / beta);
  return { mean, median, std, b10 };
}

// ---- Weibull PDF: f(t) = (β/η) * (t/η)^(β-1) * exp(-(t/η)^β) ----
function weibullPDF(t, beta, eta) {
  if (t <= 0) return 0;
  const ratio = t / eta;
  return (beta / eta) * Math.pow(ratio, beta - 1) * Math.exp(-Math.pow(ratio, beta));
}

// ---- Format number for display ----
function fmt(v, digits = 1) {
  if (!isFinite(v) || isNaN(v)) return '—';
  return v.toFixed(digits);
}

// ---- Chart instances ----
let weibullChart = null;
let histChart    = null;

function initCharts() {
  const ctxW = document.getElementById('weibull-plot').getContext('2d');
  const ctxH = document.getElementById('histogram').getContext('2d');

  // Chart 1: Weibull probability plot
  weibullChart = new Chart(ctxW, {
    data: {
      datasets: [
        {
          type: 'scatter',
          label: 'サンプル点',
          data: [],
          backgroundColor: 'rgba(15, 118, 110, 0.6)',
          pointRadius: 4,
          pointHoverRadius: 6,
          order: 2
        },
        {
          type: 'line',
          label: '理論直線',
          data: [],
          borderColor: '#ef4444',
          borderWidth: 2,
          borderDash: [6, 4],
          pointRadius: 0,
          fill: false,
          order: 1,
          tension: 0
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: 1.4,
      animation: { duration: 200 },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            font: { family: 'Outfit, sans-serif', size: 12 },
            boxWidth: 16,
            padding: 12
          }
        },
        tooltip: {
          callbacks: {
            label: function(ctx) {
              if (ctx.datasetIndex === 0) {
                return `ln(t)=${ctx.parsed.x.toFixed(3)}, ln(-ln(1-F))=${ctx.parsed.y.toFixed(3)}`;
              }
              return null;
            }
          }
        }
      },
      scales: {
        x: {
          type: 'linear',
          title: {
            display: true,
            text: 'ln(t)',
            font: { family: 'Outfit, sans-serif', size: 12, weight: '600' }
          },
          grid: { color: 'rgba(0,0,0,0.06)' },
          ticks: { font: { family: 'Outfit, sans-serif', size: 11 } }
        },
        y: {
          type: 'linear',
          title: {
            display: true,
            text: 'ln(−ln(1−F))',
            font: { family: 'Outfit, sans-serif', size: 12, weight: '600' }
          },
          grid: { color: 'rgba(0,0,0,0.06)' },
          ticks: {
            font: { family: 'Outfit, sans-serif', size: 11 },
            callback: function(value) {
              // Show F% labels for specific y values
              const fMap = {
                '-2.250': '10%',
                '-0.367': '50%',
                '0.000': '63.2%',
                '0.834': '80%',
                '1.527': '90%',
                '2.970': '95%'
              };
              const key = value.toFixed(3);
              return fMap[key] ? `${fMap[key]} (${value.toFixed(2)})` : value.toFixed(2);
            }
          }
        }
      }
    }
  });

  // Chart 2: Histogram + PDF
  histChart = new Chart(ctxH, {
    data: {
      datasets: [
        {
          type: 'bar',
          label: 'ヒストグラム',
          data: [],
          backgroundColor: 'rgba(15, 118, 110, 0.35)',
          borderColor: 'rgba(15, 118, 110, 0.7)',
          borderWidth: 1,
          order: 2
        },
        {
          type: 'line',
          label: '理論PDF',
          data: [],
          borderColor: '#f59e0b',
          borderWidth: 2.5,
          pointRadius: 0,
          fill: false,
          order: 1,
          tension: 0.3,
          yAxisID: 'yPDF'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: 1.4,
      animation: { duration: 200 },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            font: { family: 'Outfit, sans-serif', size: 12 },
            boxWidth: 16,
            padding: 12
          }
        },
        tooltip: {
          mode: 'index',
          intersect: false
        }
      },
      scales: {
        x: {
          type: 'linear',
          title: {
            display: true,
            text: '時間 t',
            font: { family: 'Outfit, sans-serif', size: 12, weight: '600' }
          },
          grid: { color: 'rgba(0,0,0,0.06)' },
          ticks: { font: { family: 'Outfit, sans-serif', size: 11 } }
        },
        y: {
          type: 'linear',
          position: 'left',
          title: {
            display: true,
            text: '頻度',
            font: { family: 'Outfit, sans-serif', size: 12, weight: '600' }
          },
          grid: { color: 'rgba(0,0,0,0.06)' },
          ticks: { font: { family: 'Outfit, sans-serif', size: 11 } }
        },
        yPDF: {
          type: 'linear',
          position: 'right',
          title: {
            display: true,
            text: '確率密度',
            font: { family: 'Outfit, sans-serif', size: 12, weight: '600' }
          },
          grid: { drawOnChartArea: false },
          ticks: {
            font: { family: 'Outfit, sans-serif', size: 11 },
            callback: v => v.toFixed(4)
          }
        }
      }
    }
  });
}

// ---- Main update function ----
let currentSamples = null;

function update(resample = false) {
  const beta = parseFloat(betaSlider.value);
  const eta  = parseFloat(etaSlider.value);
  const n    = parseInt(nSlider.value, 10);

  // Update display values
  betaVal.textContent = beta.toFixed(2);
  etaVal.textContent  = eta;
  nVal.textContent    = n;

  // Compute and display characteristic values
  const stats = computeStats(beta, eta);
  statMean.textContent   = fmt(stats.mean);
  statMedian.textContent = fmt(stats.median);
  statStd.textContent    = fmt(stats.std);
  statB10.textContent    = fmt(stats.b10);

  // Update histogram title with beta annotation
  let betaAnnotation;
  if (beta < 0.95) {
    betaAnnotation = '初期故障型（右肩下がり）';
  } else if (beta < 1.05) {
    betaAnnotation = '偶発故障型（指数分布）';
  } else {
    betaAnnotation = '摩耗故障型（右肩上がり→ピークあり）';
  }
  histTitle.textContent = `ヒストグラム（β=${beta.toFixed(2)}: ${betaAnnotation}）`;

  // Generate or reuse samples
  if (resample || currentSamples === null || currentSamples.length !== n) {
    currentSamples = generateSamples(beta, eta, n);
  } else if (resample) {
    currentSamples = generateSamples(beta, eta, n);
  }

  const samples = currentSamples;
  const ranks   = medianRanks(n);

  // ---- Chart 1: Weibull probability plot ----
  // Scatter points: skip F <= 0 or >= 1
  const scatterPoints = [];
  for (let i = 0; i < n; i++) {
    const fi = ranks[i];
    if (fi <= 0 || fi >= 1 || samples[i] <= 0) continue;
    const x = Math.log(samples[i]);
    const y = Math.log(-Math.log(1 - fi));
    scatterPoints.push({ x, y });
  }

  // Theoretical line: y = β * ln(t/η) = β*ln(t) - β*ln(η)
  // Solve for t range: find min/max of scatter x values with margin
  const xValues = scatterPoints.map(p => p.x);
  const xMin = Math.min(...xValues) - 0.3;
  const xMax = Math.max(...xValues) + 0.3;
  const lineSteps = 50;
  const dx = (xMax - xMin) / lineSteps;
  const theoryLine = [];
  for (let i = 0; i <= lineSteps; i++) {
    const x = xMin + i * dx;
    const y = beta * (x - Math.log(eta));
    theoryLine.push({ x, y });
  }

  weibullChart.data.datasets[0].data = scatterPoints;
  weibullChart.data.datasets[1].data = theoryLine;
  weibullChart.update('active');

  // ---- Chart 2: Histogram ----
  const numBins = 20;
  const histMax = 3 * eta;
  const binWidth = histMax / numBins;
  const binCounts = new Array(numBins).fill(0);

  for (const s of samples) {
    const binIdx = Math.floor(s / binWidth);
    if (binIdx >= 0 && binIdx < numBins) {
      binCounts[binIdx]++;
    }
  }

  // Build histogram bar data (Chart.js bar with x as bin center)
  const histBars = binCounts.map((count, i) => ({
    x: (i + 0.5) * binWidth,
    y: count
  }));

  // Theoretical PDF curve (scaled to match histogram y-axis: multiply by N * binWidth)
  const pdfSteps = 100;
  const tMin = 0.001;
  const tMax = histMax;
  const dt = (tMax - tMin) / pdfSteps;
  const pdfLine = [];
  for (let i = 0; i <= pdfSteps; i++) {
    const t = tMin + i * dt;
    const pdf = weibullPDF(t, beta, eta);
    pdfLine.push({ x: t, y: pdf });
  }

  // Update histogram chart
  histChart.data.datasets[0].data = histBars;
  histChart.data.datasets[1].data = pdfLine;

  // Update x scale max
  histChart.options.scales.x.max = histMax;
  histChart.update('active');
}

// ---- Event listeners ----
betaSlider.addEventListener('input', () => update(false));
etaSlider.addEventListener('input', () => update(false));
nSlider.addEventListener('input', () => update(true));

resampleBtn.addEventListener('click', () => {
  currentSamples = null; // force resample
  update(true);
});

// ---- Init ----
document.addEventListener('DOMContentLoaded', () => {
  initCharts();
  update(true);
});
