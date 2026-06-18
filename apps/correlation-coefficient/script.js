'use strict';

// ============================================================
// 相関係数計算ツール — script.js
// ピアソン積率相関係数・決定係数・有意性検定・回帰直線・散布図
// ============================================================

// ---- DOM References ----
const xLabelInput  = document.getElementById('x-label');
const yLabelInput  = document.getElementById('y-label');
const xDataTA      = document.getElementById('x-data');
const yDataTA      = document.getElementById('y-data');
const btnSample    = document.getElementById('btn-sample');
const btnCalc      = document.getElementById('btn-calc');
const btnClear     = document.getElementById('btn-clear');
const errorMsg     = document.getElementById('error-msg');
const resultsDiv   = document.getElementById('results');

const elRValue    = document.getElementById('r-value');
const elRStrength = document.getElementById('r-strength');
const elR2Value   = document.getElementById('r2-value');
const elTValue    = document.getElementById('t-value');
const elPValue    = document.getElementById('p-value');
const elNValue    = document.getElementById('n-value');
const sigBadge    = document.getElementById('sig-badge');
const eqText      = document.getElementById('eq-text');

let chartInstance = null;

// ---- Sample Data ----
const SAMPLE_X_LABEL = '身長 (cm)';
const SAMPLE_Y_LABEL = '体重 (kg)';
const SAMPLE_X = [158, 162, 165, 167, 170, 172, 174, 175, 178, 180, 183, 155, 160, 168, 171, 176, 163, 169, 173, 181];
const SAMPLE_Y = [52, 57, 60, 63, 65, 68, 70, 73, 74, 78, 82, 48, 54, 64, 66, 75, 58, 62, 71, 80];

// ---- Event Listeners ----
btnSample.addEventListener('click', loadSampleData);
btnCalc.addEventListener('click', calculate);
btnClear.addEventListener('click', clearAll);

// ---- Load Sample Data ----
function loadSampleData() {
  xLabelInput.value = SAMPLE_X_LABEL;
  yLabelInput.value = SAMPLE_Y_LABEL;
  xDataTA.value = SAMPLE_X.join('\n');
  yDataTA.value = SAMPLE_Y.join('\n');
  hideError();
}

// ---- Clear All ----
function clearAll() {
  xLabelInput.value = 'X変数';
  yLabelInput.value = 'Y変数';
  xDataTA.value = '';
  yDataTA.value = '';
  resultsDiv.hidden = true;
  hideError();
  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }
}

// ---- Parse Data ----
function parseData(raw) {
  return raw
    .split(/[\n\r\t,，]+/)
    .map(s => s.trim())
    .filter(s => s !== '')
    .map(s => {
      // 全角数字・マイナスを半角に変換
      const normalized = s
        .replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
        .replace(/－/g, '-')
        .replace(/．/g, '.');
      const n = parseFloat(normalized);
      return isNaN(n) ? null : n;
    });
}

// ---- Show / Hide Error ----
function showError(msg) {
  errorMsg.innerHTML = `<i class="bi bi-exclamation-triangle-fill"></i> ${msg}`;
  errorMsg.hidden = false;
  resultsDiv.hidden = true;
}

function hideError() {
  errorMsg.hidden = true;
}

// ---- Pearson Correlation ----
function pearson(xs, ys) {
  const n = xs.length;
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;

  let sumXY = 0, sumX2 = 0, sumY2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    sumXY += dx * dy;
    sumX2 += dx * dx;
    sumY2 += dy * dy;
  }

  if (sumX2 === 0 || sumY2 === 0) return null; // 定数列
  return sumXY / Math.sqrt(sumX2 * sumY2);
}

// ---- Linear Regression (OLS) ----
function linearRegression(xs, ys) {
  const n = xs.length;
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;

  let sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumXY += (xs[i] - meanX) * (ys[i] - meanY);
    sumX2 += (xs[i] - meanX) ** 2;
  }

  const b = sumX2 !== 0 ? sumXY / sumX2 : 0;
  const a = meanY - b * meanX;
  return { a, b };
}

// ---- p-value from t-distribution (two-tailed) ----
// Uses regularized incomplete beta function approximation
function pValueFromT(t, df) {
  const x = df / (df + t * t);
  const p = regularizedIncompleteBeta(df / 2, 0.5, x);
  return p; // two-tailed
}

// Regularized incomplete beta function I_x(a, b)
// via continued fraction (Lentz method) — sufficient for df >= 2
function regularizedIncompleteBeta(a, b, x) {
  if (x < 0 || x > 1) return NaN;
  if (x === 0) return 0;
  if (x === 1) return 1;

  const lbeta = lgamma(a) + lgamma(b) - lgamma(a + b);
  const front = Math.exp(Math.log(x) * a + Math.log(1 - x) * b - lbeta) / a;

  // Continued fraction (modified Lentz)
  const MAX_ITER = 200;
  const EPS = 1e-10;
  let f = 1;
  let c = 1;
  let d = 1 - (a + b) * x / (a + 1);
  if (Math.abs(d) < 1e-30) d = 1e-30;
  d = 1 / d;
  f = d;

  for (let m = 1; m <= MAX_ITER; m++) {
    // Even step
    let numerator = m * (b - m) * x / ((a + 2 * m - 1) * (a + 2 * m));
    d = 1 + numerator * d;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    c = 1 + numerator / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d;
    f *= d * c;

    // Odd step
    numerator = -(a + m) * (a + b + m) * x / ((a + 2 * m) * (a + 2 * m + 1));
    d = 1 + numerator * d;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    c = 1 + numerator / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d;
    const delta = d * c;
    f *= delta;
    if (Math.abs(delta - 1) < EPS) break;
  }

  return front * f;
}

// Log-gamma (Lanczos approximation)
function lgamma(z) {
  const g = 7;
  const c = [
    0.99999999999980993,
    676.5203681218851,
    -1259.1392167224028,
    771.32342877765313,
    -176.61502916214059,
    12.507343278686905,
    -0.13857109526572012,
    9.9843695780195716e-6,
    1.5056327351493116e-7,
  ];
  if (z < 0.5) {
    return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * z)) - lgamma(1 - z);
  }
  z -= 1;
  let x = c[0];
  for (let i = 1; i < g + 2; i++) x += c[i] / (z + i);
  const t = z + g + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

// ---- Strength Label ----
function strengthLabel(r) {
  const abs = Math.abs(r);
  const dir = r >= 0 ? '正' : '負';
  if (abs >= 0.9)  return `非常に強い${dir}の相関`;
  if (abs >= 0.7)  return `強い${dir}の相関`;
  if (abs >= 0.4)  return `中程度の${dir}の相関`;
  if (abs >= 0.2)  return `弱い${dir}の相関`;
  return 'ほぼ相関なし';
}

// ---- Format p-value ----
function formatP(p) {
  if (p < 0.001) return '< 0.001';
  if (p < 0.01)  return p.toFixed(3);
  return p.toFixed(3);
}

// ---- Draw Scatter Chart ----
function drawChart(xs, ys, xLabel, yLabel, reg) {
  const ctx = document.getElementById('scatter-chart').getContext('2d');

  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }

  // Scatter data
  const scatterData = xs.map((x, i) => ({ x, y: ys[i] }));

  // Regression line: 2 points (min → max of X)
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const margin = (xMax - xMin) * 0.05;
  const regLineData = [
    { x: xMin - margin, y: reg.a + reg.b * (xMin - margin) },
    { x: xMax + margin, y: reg.a + reg.b * (xMax + margin) },
  ];

  chartInstance = new Chart(ctx, {
    type: 'scatter',
    data: {
      datasets: [
        {
          label: `データ点 (${xLabel} vs ${yLabel})`,
          data: scatterData,
          backgroundColor: 'rgba(124, 58, 237, 0.55)',
          borderColor: 'rgba(124, 58, 237, 0.85)',
          borderWidth: 1.5,
          pointRadius: 6,
          pointHoverRadius: 8,
          pointHoverBackgroundColor: 'rgba(124, 58, 237, 0.85)',
        },
        {
          label: '回帰直線',
          data: regLineData,
          type: 'line',
          borderColor: '#d97706',
          borderWidth: 2,
          borderDash: [5, 4],
          pointRadius: 0,
          fill: false,
          tension: 0,
          showLine: true,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: 1.6,
      plugins: {
        legend: {
          position: 'top',
          labels: {
            font: { family: "'Outfit', 'BIZ UDPGothic', sans-serif", size: 12 },
            color: '#374151',
          },
        },
        tooltip: {
          callbacks: {
            label(ctx) {
              if (ctx.datasetIndex === 0) {
                return ` ${xLabel}: ${ctx.parsed.x},  ${yLabel}: ${ctx.parsed.y}`;
              }
              return null;
            },
          },
          filter(item) {
            return item.datasetIndex === 0;
          },
          backgroundColor: 'rgba(26, 26, 46, 0.88)',
          titleFont: { family: "'Outfit', sans-serif" },
          bodyFont:  { family: "'Outfit', 'BIZ UDPGothic', sans-serif", size: 13 },
          padding: 10,
        },
      },
      scales: {
        x: {
          title: {
            display: true,
            text: xLabel,
            font: { family: "'Outfit', 'BIZ UDPGothic', sans-serif", size: 12, weight: '600' },
            color: '#374151',
          },
          grid: { color: 'rgba(0,0,0,0.05)' },
          ticks: { font: { family: "'Outfit', sans-serif", size: 11 }, color: '#6b7280' },
        },
        y: {
          title: {
            display: true,
            text: yLabel,
            font: { family: "'Outfit', 'BIZ UDPGothic', sans-serif", size: 12, weight: '600' },
            color: '#374151',
          },
          grid: { color: 'rgba(0,0,0,0.05)' },
          ticks: { font: { family: "'Outfit', sans-serif", size: 11 }, color: '#6b7280' },
        },
      },
    },
  });
}

// ---- Main Calculate ----
function calculate() {
  hideError();

  const xLabel = xLabelInput.value.trim() || 'X変数';
  const yLabel = yLabelInput.value.trim() || 'Y変数';

  const xRaw = parseData(xDataTA.value);
  const yRaw = parseData(yDataTA.value);

  // Validate: null values
  if (xRaw.some(v => v === null)) {
    showError('X変数に数値以外のデータが含まれています。数値のみを入力してください。');
    return;
  }
  if (yRaw.some(v => v === null)) {
    showError('Y変数に数値以外のデータが含まれています。数値のみを入力してください。');
    return;
  }

  // Validate: empty
  if (xRaw.length === 0 || yRaw.length === 0) {
    showError('X変数とY変数の両方にデータを入力してください。');
    return;
  }

  // Validate: length match
  if (xRaw.length !== yRaw.length) {
    showError(`X変数（${xRaw.length}件）とY変数（${yRaw.length}件）のデータ件数が一致しません。同じ件数を入力してください。`);
    return;
  }

  // Validate: minimum n
  if (xRaw.length < 3) {
    showError('計算には3件以上のデータが必要です。');
    return;
  }

  // Validate: max limit
  if (xRaw.length > 200) {
    showError('データ件数が上限（200件）を超えています。');
    return;
  }

  const n = xRaw.length;

  // Pearson r
  const r = pearson(xRaw, yRaw);
  if (r === null) {
    showError('X変数またはY変数がすべて同じ値（定数）です。分散のあるデータを入力してください。');
    return;
  }

  // R²
  const r2 = r * r;

  // t statistic
  const tStat = r * Math.sqrt(n - 2) / Math.sqrt(1 - r * r);

  // p-value (two-tailed, t distribution with df = n-2)
  const df = n - 2;
  const pVal = pValueFromT(Math.abs(tStat), df);

  // Regression coefficients
  const reg = linearRegression(xRaw, yRaw);

  // ---- Update DOM ----
  elRValue.textContent    = r.toFixed(4);
  elRStrength.textContent = strengthLabel(r);
  elR2Value.textContent   = r2.toFixed(4);
  elTValue.textContent    = tStat.toFixed(3);
  elPValue.textContent    = formatP(pVal);
  elNValue.textContent    = n;

  // Color r value
  const absR = Math.abs(r);
  if (absR >= 0.7) {
    elRValue.style.color = r >= 0 ? '#059669' : '#dc2626';
  } else if (absR >= 0.4) {
    elRValue.style.color = '#d97706';
  } else {
    elRValue.style.color = 'var(--primary)';
  }

  // Significance badge
  if (pVal < 0.05) {
    sigBadge.textContent  = '有意な相関あり ✓（p < 0.05）';
    sigBadge.className    = 'sig-badge sig-yes';
  } else {
    sigBadge.textContent  = `有意差なし（p = ${formatP(pVal)}）`;
    sigBadge.className    = 'sig-badge sig-no';
  }

  // Regression equation
  const aStr = reg.a >= 0
    ? `+ ${reg.a.toFixed(3)}`
    : `- ${Math.abs(reg.a).toFixed(3)}`;
  eqText.textContent = `${yLabel} = ${reg.b.toFixed(4)} × ${xLabel} ${aStr}`;

  // Show results
  resultsDiv.hidden = false;
  resultsDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  // Draw chart
  drawChart(xRaw, yRaw, xLabel, yLabel, reg);
}
