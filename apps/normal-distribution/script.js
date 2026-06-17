/**
 * 正規分布 確率計算ツール — script.js
 *
 * 計算ロジック:
 *   erf近似: Abramowitz & Stegun 7.1.26 (最大誤差 ≤ 1.5e-7)
 *   CDF: P(X≤x) = 0.5 * (1 + erf((x-μ)/(σ*√2)))
 */

'use strict';

// ===========================
// 数学ユーティリティ
// ===========================

/**
 * 誤差関数 erf(x) — Abramowitz & Stegun 7.1.26 近似
 * 最大誤差 ≤ 1.5×10⁻⁷
 */
function erf(x) {
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x);
  const t = 1.0 / (1.0 + 0.3275911 * x);
  const poly = t * (0.254829592
    + t * (-0.284496736
    + t * (1.421413741
    + t * (-1.453152027
    + t * 1.061405429))));
  const result = 1.0 - poly * Math.exp(-x * x);
  return sign * result;
}

/**
 * 正規分布の累積分布関数 (CDF)
 * P(X ≤ x) for N(μ, σ²)
 */
function normalCDF(x, mu, sigma) {
  const z = (x - mu) / (sigma * Math.SQRT2);
  return 0.5 * (1.0 + erf(z));
}

/**
 * z値 → CDF（標準正規分布）
 */
function stdNormalCDF(z) {
  return normalCDF(z, 0, 1);
}

/**
 * 正規分布の PDF
 */
function normalPDF(x, mu, sigma) {
  const z = (x - mu) / sigma;
  return Math.exp(-0.5 * z * z) / (sigma * Math.sqrt(2 * Math.PI));
}

/**
 * 安全な小数フォーマット (0〜1 → "0.xxxxxx")
 */
function fmtDec(val) {
  if (val <= 0) return '0.000000';
  if (val >= 1) return '1.000000';
  return val.toFixed(6);
}

/**
 * 確率 → パーセント文字列
 */
function fmtPct(val) {
  if (val <= 0) return '0.0000%';
  if (val >= 1) return '100.0000%';
  const pct = val * 100;
  if (pct >= 10) return pct.toFixed(4) + '%';
  return pct.toFixed(4) + '%';
}

/**
 * z値表示用フォーマット
 */
function fmtZ(z) {
  const sign = z >= 0 ? '+' : '';
  return sign + z.toFixed(4);
}

// ===========================
// DOM 参照
// ===========================
const tabProb      = document.getElementById('tab-prob');
const tabZ         = document.getElementById('tab-z');
const panelProb    = document.getElementById('panel-prob');
const panelZ       = document.getElementById('panel-z');

const meanInput    = document.getElementById('mean');
const sdInput      = document.getElementById('sd');
const calcTypeRadios = document.querySelectorAll('input[name="calc-type"]');
const xaInput      = document.getElementById('x-a');
const xbInput      = document.getElementById('x-b');
const fieldSep     = document.getElementById('field-separator');
const fieldB       = document.getElementById('field-b');
const zInput       = document.getElementById('z-input');

const calcBtn      = document.getElementById('calc-btn');

const emptyState   = document.getElementById('empty-state');
const resultBody   = document.getElementById('result-body');
const errorMsg     = document.getElementById('error-msg');
const errorText    = document.getElementById('error-text');

const resultLabelTop     = document.getElementById('result-label-top');
const resultProbPct      = document.getElementById('result-prob-pct');
const resultProbDec      = document.getElementById('result-prob-dec');
const resultZEl          = document.getElementById('result-z');
const resultZHint        = document.getElementById('result-z-hint');
const resultComplement   = document.getElementById('result-complement');
const resultComplementHint = document.getElementById('result-complement-hint');
const interpretationText = document.getElementById('interpretation-text');

// ===========================
// モード切替
// ===========================
let currentMode = 'prob'; // 'prob' | 'z'

tabProb.addEventListener('click', () => switchMode('prob'));
tabZ.addEventListener('click',   () => switchMode('z'));

function switchMode(mode) {
  currentMode = mode;
  if (mode === 'prob') {
    tabProb.classList.add('active');
    tabProb.setAttribute('aria-selected', 'true');
    tabZ.classList.remove('active');
    tabZ.setAttribute('aria-selected', 'false');
    panelProb.hidden = false;
    panelZ.hidden = true;
  } else {
    tabZ.classList.add('active');
    tabZ.setAttribute('aria-selected', 'true');
    tabProb.classList.remove('active');
    tabProb.setAttribute('aria-selected', 'false');
    panelZ.hidden = false;
    panelProb.hidden = true;
  }
}

// ===========================
// 計算タイプ切替（区間確率の場合はb入力を表示）
// ===========================
calcTypeRadios.forEach(radio => {
  radio.addEventListener('change', updateBoundFields);
});

function updateBoundFields() {
  const type = getCalcType();
  const isInterval = type === 'interval';
  fieldSep.hidden = !isInterval;
  fieldB.hidden   = !isInterval;
}

function getCalcType() {
  const checked = document.querySelector('input[name="calc-type"]:checked');
  return checked ? checked.value : 'lower';
}

// ===========================
// プリセットz値
// ===========================
document.querySelectorAll('.preset-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    zInput.value = btn.dataset.z;
  });
});

// ===========================
// 計算実行
// ===========================
calcBtn.addEventListener('click', runCalculation);

// キーボード Enter でも実行
[meanInput, sdInput, xaInput, xbInput, zInput].forEach(el => {
  el.addEventListener('keydown', e => {
    if (e.key === 'Enter') runCalculation();
  });
});

function runCalculation() {
  hideError();

  if (currentMode === 'prob') {
    calcProb();
  } else {
    calcFromZ();
  }
}

// --- 確率を求めるモード ---
function calcProb() {
  const mu    = parseFloat(meanInput.value);
  const sigma = parseFloat(sdInput.value);
  const type  = getCalcType();
  let a = parseFloat(xaInput.value);
  let b = parseFloat(xbInput.value);

  // バリデーション
  if (isNaN(mu) || isNaN(sigma)) {
    showError('平均μと標準偏差σに有効な数値を入力してください。');
    return;
  }
  if (sigma <= 0) {
    showError('標準偏差σは正の値（0より大きい値）を入力してください。');
    return;
  }
  if (isNaN(a)) {
    showError('境界値aに有効な数値を入力してください。');
    return;
  }
  if (type === 'interval' && isNaN(b)) {
    showError('区間確率では境界値bにも有効な数値を入力してください。');
    return;
  }

  // 区間確率: a > b の場合は入れ替え
  if (type === 'interval' && a > b) {
    [a, b] = [b, a];
    xaInput.value = a;
    xbInput.value = b;
  }

  let prob, zVal, labelTop, complementHint;

  if (type === 'lower') {
    prob   = normalCDF(a, mu, sigma);
    zVal   = (a - mu) / sigma;
    labelTop = `下側確率 P(X ≤ ${a})`;
    complementHint = `上側 P(X > ${a})`;
  } else if (type === 'upper') {
    prob   = 1 - normalCDF(a, mu, sigma);
    zVal   = (a - mu) / sigma;
    labelTop = `上側確率 P(X ≥ ${a})`;
    complementHint = `下側 P(X < ${a})`;
  } else {
    // interval
    const cdfa = normalCDF(a, mu, sigma);
    const cdfb = normalCDF(b, mu, sigma);
    prob   = cdfb - cdfa;
    zVal   = (a - mu) / sigma; // 下限側のz値を表示
    labelTop = `区間確率 P(${a} ≤ X ≤ ${b})`;
    complementHint = `区間外の確率`;
  }

  const complement = 1 - prob;
  displayResult(prob, complement, zVal, labelTop, complementHint, mu, sigma, type, a, b);
  updateChart(mu, sigma, type, a, b);
}

// --- z値から確率モード ---
function calcFromZ() {
  const z = parseFloat(zInput.value);
  if (isNaN(z)) {
    showError('z値に有効な数値を入力してください。');
    return;
  }

  const lower = stdNormalCDF(z);
  const upper = 1 - lower;

  const labelTop = `下側確率 P(Z ≤ ${z}) | 上側: ${fmtPct(upper)}`;

  // z値モードは下側確率をメインで表示
  const prob = lower;
  const complement = upper;
  const complementHint = `上側確率 P(Z > ${z})`;

  displayResultZ(prob, complement, z, complementHint);
  // グラフ: 標準正規分布で x=z に下側確率表示
  updateChart(0, 1, 'lower', z, null);
}

// ===========================
// 結果表示
// ===========================
function displayResult(prob, complement, zVal, labelTop, complementHint, mu, sigma, type, a, b) {
  emptyState.hidden = true;
  errorMsg.hidden   = true;
  resultBody.hidden = false;

  resultLabelTop.textContent  = labelTop;
  resultProbPct.textContent   = fmtPct(prob);
  resultProbDec.textContent   = fmtDec(prob);
  resultZEl.textContent       = fmtZ(zVal);
  resultComplement.textContent = fmtPct(complement);
  resultComplementHint.textContent = complementHint;
  resultZHint.textContent     = zHintText(zVal);

  interpretationText.textContent = buildInterpretation(prob, complement, type, mu, sigma, a, b);
}

function displayResultZ(prob, complement, z, complementHint) {
  emptyState.hidden = true;
  errorMsg.hidden   = true;
  resultBody.hidden = false;

  resultLabelTop.textContent  = `下側確率 P(Z ≤ ${z})`;
  resultProbPct.textContent   = fmtPct(prob);
  resultProbDec.textContent   = fmtDec(prob);
  resultZEl.textContent       = fmtZ(z);
  resultComplement.textContent = fmtPct(complement);
  resultComplementHint.textContent = complementHint;
  resultZHint.textContent     = zHintText(z);

  const pct = (prob * 100).toFixed(2);
  const upperPct = (complement * 100).toFixed(2);
  interpretationText.textContent
    = `z値 ${z} は標準正規分布において下側 ${pct}%（上位 ${upperPct}%）に相当します。`
    + ` 統計検定では z=${z >= 0 ? z : -z} 以上の絶対値を持つ値が発生する確率は両側で ${(Math.min(prob, complement) * 200).toFixed(2)}% です。`;
}

function zHintText(z) {
  const absZ = Math.abs(z);
  if (absZ < 0.5) return '平均付近';
  if (absZ < 1.0) return '平均から約0.5σ〜1σ';
  if (absZ < 1.65) return 'σ境界付近';
  if (absZ < 2.0) return '有意水準5%の境界付近';
  if (absZ < 2.58) return '上位/下位5%以内';
  if (absZ < 3.0) return '上位/下位1%以内';
  return '上位/下位0.1%以内の稀な値';
}

function buildInterpretation(prob, complement, type, mu, sigma, a, b) {
  const probPct = (prob * 100).toFixed(2);
  const compPct = (complement * 100).toFixed(2);

  if (type === 'lower') {
    return `μ=${mu}、σ=${sigma} の正規分布において、${a} 以下となる確率は約 ${probPct}% です。`
      + ` 逆に言えば、この値より大きい値が観測される確率は上位 ${compPct}% となります。`;
  } else if (type === 'upper') {
    return `μ=${mu}、σ=${sigma} の正規分布において、${a} 以上となる確率は約 ${probPct}% です。`
      + ` これは「上位 ${probPct}%」に相当し、下側 ${compPct}% が残ります。`;
  } else {
    return `μ=${mu}、σ=${sigma} の正規分布において、${a} 〜 ${b} の区間に収まる確率は約 ${probPct}% です。`
      + ` この区間外（左右合計）に収まる確率は ${compPct}% です。`;
  }
}

// ===========================
// エラー表示
// ===========================
function showError(msg) {
  emptyState.hidden = true;
  resultBody.hidden = true;
  errorMsg.hidden   = false;
  errorText.textContent = msg;
}

function hideError() {
  errorMsg.hidden = true;
}

// ===========================
// Chart.js グラフ
// ===========================
let chartInstance = null;
const CHART_POINTS = 200;

function buildChartData(mu, sigma) {
  const range = 4 * sigma;
  const xMin  = mu - range;
  const xMax  = mu + range;
  const step  = (xMax - xMin) / CHART_POINTS;
  const labels = [];
  const data   = [];
  for (let i = 0; i <= CHART_POINTS; i++) {
    const x = xMin + step * i;
    labels.push(x);
    data.push(normalPDF(x, mu, sigma));
  }
  return { labels, data, xMin, xMax };
}

/**
 * 塗りつぶし用データセットを生成する
 * Chart.js 4.x の fill オプションを使い、x軸との間を塗る
 */
function buildFillDataset(mu, sigma, type, a, b, xMin, xMax, allX) {
  const fillData = allX.map(x => {
    let inRange = false;
    if (type === 'lower')    inRange = x <= a;
    else if (type === 'upper')  inRange = x >= a;
    else if (type === 'interval') inRange = x >= Math.min(a, b) && x <= Math.max(a, b);
    return inRange ? normalPDF(x, mu, sigma) : null;
  });

  const fillColor = type === 'lower'
    ? 'rgba(8,145,178,0.28)'
    : type === 'upper'
      ? 'rgba(124,58,237,0.25)'
      : 'rgba(5,150,105,0.25)';

  return {
    data: fillData,
    fill: { target: 'origin' },
    backgroundColor: fillColor,
    borderColor: 'transparent',
    pointRadius: 0,
    tension: 0.4,
    spanGaps: false,
  };
}

/**
 * σ垂直線をプラグインで描画するカスタム実装
 */
function sigmaLinesPlugin(mu, sigma) {
  return {
    id: 'sigmaLines',
    afterDraw(chart) {
      const { ctx, chartArea, scales } = chart;
      if (!chartArea) return;

      const lines = [
        { x: mu - sigma,  color: 'rgba(8,145,178,0.55)',  dash: [6,3] },
        { x: mu + sigma,  color: 'rgba(8,145,178,0.55)',  dash: [6,3] },
        { x: mu - 2*sigma, color: 'rgba(8,145,178,0.38)', dash: [4,4] },
        { x: mu + 2*sigma, color: 'rgba(8,145,178,0.38)', dash: [4,4] },
        { x: mu - 3*sigma, color: 'rgba(8,145,178,0.22)', dash: [3,5] },
        { x: mu + 3*sigma, color: 'rgba(8,145,178,0.22)', dash: [3,5] },
        { x: mu,           color: 'rgba(30,30,60,0.45)',  dash: [] },
      ];

      ctx.save();
      lines.forEach(({ x, color, dash }) => {
        const px = scales.x.getPixelForValue(x);
        if (px < chartArea.left || px > chartArea.right) return;
        ctx.beginPath();
        ctx.setLineDash(dash);
        ctx.strokeStyle = color;
        ctx.lineWidth = dash.length === 0 ? 1.5 : 1;
        ctx.moveTo(px, chartArea.top);
        ctx.lineTo(px, chartArea.bottom);
        ctx.stroke();
      });
      ctx.restore();
    }
  };
}

function updateChart(mu, sigma, type, a, b) {
  const { labels, data, xMin, xMax } = buildChartData(mu, sigma);

  const fillDs = buildFillDataset(mu, sigma, type, a, b, xMin, xMax, labels);

  const datasets = [
    // 塗りつぶしデータセット
    fillDs,
    // 曲線
    {
      data,
      borderColor: '#0891b2',
      borderWidth: 2.5,
      fill: false,
      pointRadius: 0,
      tension: 0.4,
    }
  ];

  const plugin = sigmaLinesPlugin(mu, sigma);

  if (chartInstance) {
    chartInstance.destroy();
  }

  const canvas = document.getElementById('dist-chart');
  const ctx = canvas.getContext('2d');

  chartInstance = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 300 },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title(items) {
              const x = Number(items[0].label);
              return `x = ${x.toFixed(4)}`;
            },
            label(item) {
              if (item.datasetIndex === 1) {
                return `f(x) = ${item.raw.toFixed(6)}`;
              }
              return null;
            }
          }
        }
      },
      scales: {
        x: {
          type: 'linear',
          min: xMin,
          max: xMax,
          ticks: {
            maxTicksLimit: 9,
            callback(val) { return Number(val).toFixed(2); },
            color: '#6b7280',
            font: { size: 11 }
          },
          grid: { color: 'rgba(0,0,0,0.06)' }
        },
        y: {
          ticks: {
            maxTicksLimit: 5,
            callback(val) { return val.toFixed(3); },
            color: '#6b7280',
            font: { size: 11 }
          },
          grid: { color: 'rgba(0,0,0,0.06)' }
        }
      }
    },
    plugins: [plugin]
  });
}

// ===========================
// 初期化: ページ読み込み時にデフォルト値でグラフ描画
// ===========================
window.addEventListener('DOMContentLoaded', () => {
  // AdSense 初期化
  try {
    (adsbygoogle = window.adsbygoogle || []).push({});
    (adsbygoogle = window.adsbygoogle || []).push({});
  } catch(e) { /* ignore */ }

  // 初期グラフ（標準正規分布）
  updateChart(0, 1, 'lower', 0, null);

  // 区間フィールドの初期状態
  updateBoundFields();
});
