'use strict';

/* =========================================
   新NISA取崩しシミュレーター — ロジック
   ========================================= */

// =========================================
// 状態
// =========================================
let currentTab = 'reverse'; // 'reverse' | 'duration'
let assetChart = null;

// =========================================
// DOM 参照
// =========================================
const tabBtns = document.querySelectorAll('.tab-btn');
const panels = {
  reverse: document.getElementById('panel-reverse'),
  duration: document.getElementById('panel-duration'),
};

// 逆算モード入力
const rAsset  = document.getElementById('r-asset');
const rRate   = document.getElementById('r-rate');
const rYears  = document.getElementById('r-years');

// 期間モード入力
const dAsset   = document.getElementById('d-asset');
const dRate    = document.getElementById('d-rate');
const dMonthly = document.getElementById('d-monthly');

// 結果表示
const resultIconI     = document.getElementById('result-icon-i');
const resultPrefix    = document.getElementById('result-prefix');
const resultLabel     = document.getElementById('result-label');
const resultMainValue = document.getElementById('result-main-value');
const resultMainUnit  = document.getElementById('result-main-unit');
const resultSublabel  = document.getElementById('result-sublabel');
const fourPctText     = document.getElementById('four-pct-text');
const sTotal          = document.getElementById('s-total');
const sGain           = document.getElementById('s-gain');
const sPace           = document.getElementById('s-pace');
const sRemain         = document.getElementById('s-remain');

// テーブル
const scenarioColHeader = document.getElementById('scenario-col-header');
const scenarioTbody     = document.getElementById('scenario-tbody');

// =========================================
// 計算ロジック
// =========================================

/**
 * 毎月引出し可能額を計算（逆算モード）
 * PMT = PV * r / (1 - (1+r)^(-n))
 * @param {number} pv  - 現在資産（万円）
 * @param {number} annualRate - 年利（%）
 * @param {number} years - 取崩し期間（年）
 * @returns {number} 毎月引出し可能額（万円）
 */
function calcMonthlyWithdrawal(pv, annualRate, years) {
  const r = annualRate / 100 / 12;
  const n = years * 12;
  if (r === 0) {
    return pv / n;
  }
  return pv * r / (1 - Math.pow(1 + r, -n));
}

/**
 * 資産が持続する期間を計算（期間モード）
 * n = -log(1 - PV*r/m) / log(1+r)
 * @param {number} pv  - 現在資産（万円）
 * @param {number} annualRate - 年利（%）
 * @param {number} monthly - 毎月引出し額（万円）
 * @returns {number} 持続月数（Infinity = 無限大）
 */
function calcDurationMonths(pv, annualRate, monthly) {
  const r = annualRate / 100 / 12;
  const m = monthly;
  if (m <= 0) return Infinity;
  if (r === 0) {
    return pv / m; // 月数
  }
  const ratio = pv * r / m;
  if (ratio >= 1) {
    // 利回りが引出し額を上回る → 資産が増え続ける
    return Infinity;
  }
  return -Math.log(1 - ratio) / Math.log(1 + r);
}

/**
 * 資産推移データを生成
 * @param {number} pv - 初期資産（万円）
 * @param {number} annualRate - 年利（%）
 * @param {number} monthly - 毎月引出し額（万円）
 * @param {number} maxMonths - 最大計算月数
 * @returns {number[]} 月ごとの残資産（万円）
 */
function calcAssetSeries(pv, annualRate, monthly, maxMonths) {
  const r = annualRate / 100 / 12;
  const series = [pv];
  let balance = pv;
  for (let i = 1; i <= maxMonths; i++) {
    balance = balance * (1 + r) - monthly;
    series.push(Math.max(0, balance));
    if (balance <= 0) break;
  }
  return series;
}

/**
 * 資産推移データ（運用なし・利回り0%）
 */
function calcAssetSeriesNoReturn(pv, monthly, maxMonths) {
  const series = [pv];
  let balance = pv;
  for (let i = 1; i <= maxMonths; i++) {
    balance = balance - monthly;
    series.push(Math.max(0, balance));
    if (balance <= 0) break;
  }
  return series;
}

// =========================================
// 数値フォーマット
// =========================================
function fmt(val, decimals = 1) {
  return val.toFixed(decimals);
}

function fmtMan(val) {
  if (val >= 10000) {
    return (val / 10000).toFixed(1) + '億';
  }
  return val.toFixed(0);
}

// =========================================
// メイン計算・表示
// =========================================
function calculate() {
  if (currentTab === 'reverse') {
    calcReverse();
  } else {
    calcDuration();
  }
  renderScenarioTable();
}

function calcReverse() {
  const pv    = parseFloat(rAsset.value)  || 1800;
  const rate  = parseFloat(rRate.value)   ?? 4.0;
  const years = parseFloat(rYears.value)  || 30;

  const monthly = calcMonthlyWithdrawal(pv, rate, years);
  const totalWithdraw = monthly * years * 12;
  const gain = totalWithdraw - pv;
  const pacePerYear = pv / years; // 元本消化ペース（単純計算）

  // メイン結果
  resultPrefix.textContent = '毎月';
  resultMainValue.textContent = fmt(monthly);
  resultMainUnit.textContent = '万円';
  resultSublabel.textContent = '引き出せます';
  resultLabel.textContent = '毎月引き出せる金額';
  resultIconI.className = 'bi bi-coin';

  // 4%ルール比較
  const fourPctMonthly = calcMonthlyWithdrawal(pv, 4.0, years);
  fourPctText.textContent = `4%ルール適用時の月額: ${fmt(fourPctMonthly)}万円（年利4%固定）`;

  // サマリー
  sTotal.textContent  = fmtMan(Math.round(totalWithdraw)) + '万円';
  sGain.textContent   = (gain >= 0 ? '+' : '') + fmtMan(Math.round(gain)) + '万円';
  sGain.className     = 'summary-value ' + (gain >= 0 ? 'positive' : 'negative');
  sPace.textContent   = fmtMan(Math.round(pacePerYear)) + '万円/年';
  sRemain.textContent = '0 万円';

  // グラフ
  const totalMonths = years * 12;
  const withReturnSeries  = calcAssetSeries(pv, rate, monthly, totalMonths);
  const noReturnSeries    = calcAssetSeriesNoReturn(pv, monthly, totalMonths);
  renderChart(withReturnSeries, noReturnSeries, years, null);
}

function calcDuration() {
  const pv      = parseFloat(dAsset.value)   || 1800;
  const rate    = parseFloat(dRate.value)    ?? 4.0;
  const monthly = parseFloat(dMonthly.value) || 6;

  const durationMonths = calcDurationMonths(pv, rate, monthly);
  const isInfinite = !isFinite(durationMonths);

  // メイン結果
  resultIconI.className = 'bi bi-calendar3';
  resultLabel.textContent = '資産が持続する期間';
  resultPrefix.textContent = '';

  if (isInfinite) {
    resultMainValue.textContent = '∞';
    resultMainUnit.textContent  = '';
    resultSublabel.textContent  = '運用益が引出し額を上回るため資産は減りません';
  } else {
    const totalYears  = Math.floor(durationMonths / 12);
    const remainMonths = Math.round(durationMonths % 12);
    resultMainValue.textContent = `${totalYears}年${remainMonths}ヶ月`;
    resultMainUnit.textContent  = '';
    resultSublabel.textContent  = '持続します';
  }

  // 4%ルール比較（4%ルール適用時の毎月引出し可能額を30年として表示）
  const fourPctMonthly = calcMonthlyWithdrawal(pv, 4.0, 30);
  fourPctText.textContent = `4%ルール適用時の月額（30年）: ${fmt(fourPctMonthly)}万円`;

  // サマリー
  if (isInfinite) {
    sTotal.textContent  = '無限';
    sGain.textContent   = '運用益 > 引出額';
    sGain.className     = 'summary-value positive';
    sPace.textContent   = '--';
    sRemain.textContent = '増加';
  } else {
    const totalWithdraw = monthly * durationMonths;
    const gain = totalWithdraw - pv;
    const pacePerYear = pv / (durationMonths / 12);
    sTotal.textContent  = fmtMan(Math.round(totalWithdraw)) + '万円';
    sGain.textContent   = (gain >= 0 ? '+' : '') + fmtMan(Math.round(gain)) + '万円';
    sGain.className     = 'summary-value ' + (gain >= 0 ? 'positive' : '');
    sPace.textContent   = fmtMan(Math.round(pacePerYear)) + '万円/年';
    sRemain.textContent = '0 万円';
  }

  // グラフ
  const maxYears = isInfinite ? 50 : Math.ceil(durationMonths / 12) + 5;
  const maxMonths = maxYears * 12;
  const withReturnSeries = calcAssetSeries(pv, rate, monthly, maxMonths);
  const noReturnSeries   = calcAssetSeriesNoReturn(pv, monthly, maxMonths);
  const zeroYear = isInfinite ? null : durationMonths / 12;
  renderChart(withReturnSeries, noReturnSeries, maxYears, zeroYear);
}

// =========================================
// グラフ描画
// =========================================
function renderChart(withReturnSeries, noReturnSeries, totalYears, zeroYearLine) {
  const maxLen = Math.max(withReturnSeries.length, noReturnSeries.length);
  const stepMonths = Math.max(1, Math.ceil(maxLen / 120)); // 最大120点
  const labels = [];
  const withData = [];
  const noData   = [];

  for (let i = 0; i < maxLen; i += stepMonths) {
    labels.push(`${Math.round(i / 12)}年`);
    withData.push(withReturnSeries[Math.min(i, withReturnSeries.length - 1)]);
    noData.push(noReturnSeries[Math.min(i, noReturnSeries.length - 1)]);
  }

  const datasets = [
    {
      label: '利回りあり',
      data: withData,
      borderColor: '#0f766e',
      backgroundColor: 'rgba(15, 118, 110, 0.08)',
      borderWidth: 2.5,
      fill: true,
      tension: 0.3,
      pointRadius: 0,
      pointHoverRadius: 5,
    },
    {
      label: '引出しのみ（利回り0%）',
      data: noData,
      borderColor: '#94a3b8',
      backgroundColor: 'rgba(148, 163, 184, 0.04)',
      borderWidth: 1.5,
      borderDash: [5, 4],
      fill: false,
      tension: 0.3,
      pointRadius: 0,
      pointHoverRadius: 4,
    },
  ];

  const config = {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          position: 'top',
          labels: {
            font: { family: "'Outfit', 'BIZ UDPGothic', sans-serif", size: 12 },
            color: '#374151',
            boxWidth: 24,
            padding: 12,
          },
        },
        tooltip: {
          backgroundColor: '#1a1a2e',
          titleFont: { family: "'Outfit', sans-serif", size: 12 },
          bodyFont:  { family: "'Outfit', sans-serif", size: 13, weight: '600' },
          padding: 10,
          callbacks: {
            label(ctx) {
              const v = ctx.parsed.y;
              return `${ctx.dataset.label}: ${v.toFixed(0)}万円`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { color: 'rgba(0,0,0,0.05)' },
          ticks: {
            font: { family: "'Outfit', sans-serif", size: 11 },
            color: '#6b7280',
            maxTicksLimit: 10,
          },
        },
        y: {
          grid: { color: 'rgba(0,0,0,0.05)' },
          ticks: {
            font: { family: "'Outfit', sans-serif", size: 11 },
            color: '#6b7280',
            callback(val) { return val.toFixed(0) + '万'; },
          },
          beginAtZero: true,
        },
      },
    },
  };

  if (assetChart) {
    assetChart.destroy();
    assetChart = null;
  }
  const ctx = document.getElementById('assetChart').getContext('2d');
  assetChart = new Chart(ctx, config);
}

// =========================================
// シナリオ比較テーブル
// =========================================
function renderScenarioTable() {
  const rates = [2, 3, 4, 5, 6];

  if (currentTab === 'reverse') {
    const pv    = parseFloat(rAsset.value)  || 1800;
    const inputRate = parseFloat(rRate.value) ?? 4.0;
    const years = parseFloat(rYears.value)  || 30;
    scenarioColHeader.textContent = '毎月引出し可能額';

    scenarioTbody.innerHTML = rates.map(rate => {
      const monthly = calcMonthlyWithdrawal(pv, rate, years);
      const isHighlighted = Math.abs(rate - inputRate) < 0.01;
      const label = isHighlighted ? `${rate}% <span class="current-mark">← 現在の設定</span>` : `${rate}%`;
      return `<tr${isHighlighted ? ' class="highlighted"' : ''}>
        <td>${label}</td>
        <td>${fmt(monthly)} 万円 / 月</td>
      </tr>`;
    }).join('');

    // 入力利回りがプリセット以外なら追加行
    const inputRateNum = parseFloat(rRate.value) ?? 4.0;
    if (!rates.some(r => Math.abs(r - inputRateNum) < 0.01)) {
      scenarioTbody.innerHTML = ''; // リセット
      const allRates = [...rates.map(r => ({ rate: r, isCustom: false })), { rate: inputRateNum, isCustom: true }]
        .sort((a, b) => a.rate - b.rate);
      allRates.forEach(({ rate: r, isCustom }) => {
        const m = calcMonthlyWithdrawal(pv, r, years);
        const label = isCustom ? `${fmt(r, 1)}%（入力値）` : `${r}%`;
        const isHL = isCustom || Math.abs(r - inputRateNum) < 0.01;
        scenarioTbody.insertAdjacentHTML('beforeend',
          `<tr class="${isHL ? 'highlighted' : ''}">
            <td>${label}</td>
            <td>${fmt(m)} 万円 / 月</td>
          </tr>`);
      });
    }

  } else {
    const pv      = parseFloat(dAsset.value)   || 1800;
    const inputRate = parseFloat(dRate.value)  ?? 4.0;
    const monthly = parseFloat(dMonthly.value) || 6;
    scenarioColHeader.textContent = '持続期間';

    const allRates = rates.includes(Math.round(inputRate)) ? rates : [...rates, inputRate].sort((a, b) => a - b);

    scenarioTbody.innerHTML = allRates.map(rate => {
      const months = calcDurationMonths(pv, rate, monthly);
      const isHighlighted = Math.abs(rate - inputRate) < 0.01;
      let display;
      if (!isFinite(months)) {
        display = '無限大（資産は増え続けます）';
      } else {
        const y = Math.floor(months / 12);
        const m = Math.round(months % 12);
        display = `${y}年 ${m}ヶ月`;
      }
      const isCustom = !rates.includes(rate);
      const label = isCustom
        ? `${fmt(rate, 1)}%（入力値）<span class="current-mark">← 現在の設定</span>`
        : isHighlighted ? `${rate}% <span class="current-mark">← 現在の設定</span>` : `${rate}%`;
      return `<tr${isHighlighted ? ' class="highlighted"' : ''}>
        <td>${label}</td>
        <td>${display}</td>
      </tr>`;
    }).join('');
  }
}

// =========================================
// タブ切替
// =========================================
function switchTab(tabName) {
  currentTab = tabName;

  tabBtns.forEach(btn => {
    const isActive = btn.dataset.tab === tabName;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-selected', String(isActive));
  });

  Object.entries(panels).forEach(([name, panel]) => {
    if (name === tabName) {
      panel.classList.add('active');
      panel.removeAttribute('hidden');
    } else {
      panel.classList.remove('active');
      panel.setAttribute('hidden', '');
    }
  });

  calculate();
}

// =========================================
// イベントリスナー
// =========================================
tabBtns.forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

// リアルタイム計算
[rAsset, rRate, rYears, dAsset, dRate, dMonthly].forEach(el => {
  el.addEventListener('input', calculate);
});

// =========================================
// 初期化
// =========================================
calculate();
