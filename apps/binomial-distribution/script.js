'use strict';

// ===== 数学ユーティリティ =====

/**
 * log ガンマ関数（スターリング近似）
 * @param {number} n
 * @returns {number} log(n!)
 */
function logFactorial(n) {
  if (n <= 1) return 0;
  let result = 0;
  for (let i = 2; i <= n; i++) {
    result += Math.log(i);
  }
  return result;
}

// 事前計算キャッシュ
const _logFactCache = [0, 0]; // logFact(0)=0, logFact(1)=0

function logFact(n) {
  if (n < 0) return -Infinity;
  if (_logFactCache[n] !== undefined) return _logFactCache[n];
  // 順方向に埋める
  let start = _logFactCache.length;
  for (let i = start; i <= n; i++) {
    _logFactCache[i] = _logFactCache[i - 1] + Math.log(i);
  }
  return _logFactCache[n];
}

/**
 * log C(n,k) = logFact(n) - logFact(k) - logFact(n-k)
 */
function logCombination(n, k) {
  if (k < 0 || k > n) return -Infinity;
  return logFact(n) - logFact(k) - logFact(n - k);
}

/**
 * P(X = k) 二項確率（対数計算でオーバーフロー防止）
 * @param {number} n 試行回数
 * @param {number} k 成功回数
 * @param {number} p 成功確率 (0〜1)
 * @returns {number}
 */
function binomPMF(n, k, p) {
  if (k < 0 || k > n) return 0;
  if (p === 0) return k === 0 ? 1 : 0;
  if (p === 1) return k === n ? 1 : 0;

  const logP = logCombination(n, k)
    + k * Math.log(p)
    + (n - k) * Math.log(1 - p);
  return Math.exp(logP);
}

/**
 * P(X ≤ k) 累積分布関数
 */
function binomCDF(n, k, p) {
  let sum = 0;
  for (let i = 0; i <= k; i++) {
    sum += binomPMF(n, i, p);
  }
  return Math.min(sum, 1);
}

/**
 * P(X ≥ k) 補累積分布関数
 */
function binomSF(n, k, p) {
  if (k <= 0) return 1;
  return 1 - binomCDF(n, k - 1, p);
}

/**
 * 確率を %表記（6桁精度）に変換
 */
function toPercent(p, digits = 4) {
  const pct = p * 100;
  if (pct === 0) return '0';
  if (pct >= 99.9999) return '≈ 100';
  if (pct < 0.0001) return '< 0.0001';
  return pct.toPrecision(Math.max(4, digits));
}

/**
 * 数値を小数点以下4桁でフォーマット
 */
function fmt(v, d = 4) {
  if (v === null || v === undefined || isNaN(v)) return '—';
  return Number(v.toFixed(d)).toString();
}

// ===== グローバル状態 =====

let pmfChart = null;

// ===== DOM 参照 =====

const tabBtns  = document.querySelectorAll('.tab-btn');
const panels   = document.querySelectorAll('.tab-panel');

const formBasic  = document.getElementById('form-basic');
const formGacha  = document.getElementById('form-gacha');
const formAbtest = document.getElementById('form-abtest');

const resultArea   = document.getElementById('result-area');
const resultBasic  = document.getElementById('result-basic');
const resultGacha  = document.getElementById('result-gacha');
const resultAbtest = document.getElementById('result-abtest');
const chartWrap    = document.getElementById('chart-wrap');

// ===== タブ切替 =====

tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const mode = btn.dataset.mode;

    tabBtns.forEach(b => {
      b.classList.toggle('active', b === btn);
      b.setAttribute('aria-selected', b === btn ? 'true' : 'false');
    });

    panels.forEach(p => {
      const isTarget = p.id === `panel-${mode}`;
      p.classList.toggle('active', isTarget);
      p.hidden = !isTarget;
    });

    // 結果エリアを隠す（モード変更時）
    hideAllResults();
  });
});

function hideAllResults() {
  resultArea.hidden = true;
  resultBasic.hidden = true;
  resultGacha.hidden = true;
  resultAbtest.hidden = true;
  chartWrap.hidden = true;
}

// ===== 基本計算モード =====

formBasic.addEventListener('submit', e => {
  e.preventDefault();

  const n       = parseInt(document.getElementById('n-basic').value, 10);
  const pPct    = parseFloat(document.getElementById('p-basic').value);
  const k       = parseInt(document.getElementById('k-basic').value, 10);
  const calcType = document.getElementById('calc-type').value;

  if (!validateBasic(n, pPct, k)) return;

  const p = pPct / 100;

  let prob;
  let label;
  if (calcType === 'exact') {
    prob  = binomPMF(n, k, p);
    label = `P(X = ${k}) — ちょうど${k}回成功する確率`;
  } else if (calcType === 'lte') {
    prob  = binomCDF(n, k, p);
    label = `P(X ≤ ${k}) — ${k}回以下で成功する累積確率`;
  } else {
    prob  = binomSF(n, k, p);
    label = `P(X ≥ ${k}) — ${k}回以上成功する累積確率`;
  }

  const mean = n * p;
  const variance = n * p * (1 - p);
  const sd = Math.sqrt(variance);

  // 表示
  document.getElementById('prob-value').textContent = toPercent(prob);
  document.getElementById('prob-label').textContent = label;
  document.getElementById('stat-mean').textContent  = fmt(mean, 3);
  document.getElementById('stat-var').textContent   = fmt(variance, 3);
  document.getElementById('stat-sd').textContent    = fmt(sd, 3);

  resultBasic.hidden = false;
  resultGacha.hidden = true;
  resultAbtest.hidden = true;
  resultArea.hidden = false;

  // グラフ描画
  drawPMFChart(n, p, k, calcType);
});

function validateBasic(n, pPct, k) {
  if (!Number.isInteger(n) || n < 1 || n > 1000) {
    alert('試行回数 n は 1〜1000 の整数で入力してください。');
    return false;
  }
  if (isNaN(pPct) || pPct <= 0 || pPct >= 100) {
    alert('成功確率 p は 0.001〜99.999 の範囲で入力してください。');
    return false;
  }
  if (!Number.isInteger(k) || k < 0 || k > n) {
    alert(`成功回数 k は 0〜${n} の整数で入力してください。`);
    return false;
  }
  return true;
}

// ===== グラフ描画 =====

function drawPMFChart(n, p, k, calcType) {
  const MAX_BARS = 51; // 表示する棒の最大数

  // n が大きい場合は期待値±3σ の範囲のみ描画
  const mean = n * p;
  const sd   = Math.sqrt(n * p * (1 - p));
  let kMin, kMax;
  let trimmed = false;

  if (n > 50) {
    kMin = Math.max(0, Math.floor(mean - 4 * sd));
    kMax = Math.min(n, Math.ceil(mean + 4 * sd));
    if (kMax - kMin + 1 > MAX_BARS) {
      const center = Math.round(mean);
      kMin = Math.max(0, center - Math.floor(MAX_BARS / 2));
      kMax = Math.min(n, kMin + MAX_BARS - 1);
    }
    trimmed = true;
  } else {
    kMin = 0;
    kMax = n;
  }

  const labels = [];
  const dataAll = [];
  const dataHighlight = [];

  for (let i = kMin; i <= kMax; i++) {
    labels.push(i);
    const pmf = binomPMF(n, i, p);
    dataAll.push(pmf * 100);

    // 強調対象かどうか
    let isHighlighted = false;
    if (calcType === 'exact') {
      isHighlighted = i === k;
    } else if (calcType === 'lte') {
      isHighlighted = i <= k;
    } else {
      isHighlighted = i >= k;
    }
    dataHighlight.push(isHighlighted ? pmf * 100 : null);
  }

  const baseColor     = 'rgba(220,38,38,0.18)';
  const highlightColor = 'rgba(220,38,38,0.85)';

  const barColors = labels.map((i, idx) => dataHighlight[idx] !== null ? highlightColor : baseColor);

  if (pmfChart) pmfChart.destroy();

  pmfChart = new Chart(document.getElementById('pmf-chart'), {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'P(X = k) (%)',
        data: dataAll,
        backgroundColor: barColors,
        borderColor: barColors.map(c => c === highlightColor ? '#b91c1c' : 'rgba(220,38,38,0.35)'),
        borderWidth: 1,
        borderRadius: 2,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      animation: { duration: 300 },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (items) => `k = ${items[0].label}`,
            label: (item) => `P(X=${item.label}) = ${Number(item.raw).toPrecision(4)}%`
          }
        }
      },
      scales: {
        x: {
          title: { display: true, text: '成功回数 k', font: { size: 12 } },
          grid: { display: false }
        },
        y: {
          title: { display: true, text: '確率 (%)', font: { size: 12 } },
          beginAtZero: true,
          ticks: {
            callback: v => v.toPrecision(3) + '%'
          }
        }
      }
    }
  });

  const noteEl = document.getElementById('chart-note');
  if (trimmed) {
    noteEl.textContent = `※ n=${n} のため期待値±4σ の範囲（k=${kMin}〜${kMax}）を表示しています。`;
  } else {
    noteEl.textContent = '';
  }

  chartWrap.hidden = false;
}

// ===== ガチャモード =====

formGacha.addEventListener('submit', e => {
  e.preventDefault();

  const ratePct  = parseFloat(document.getElementById('gacha-rate').value);
  const ceiling  = parseInt(document.getElementById('gacha-ceiling').value, 10);

  if (isNaN(ratePct) || ratePct <= 0 || ratePct >= 100) {
    alert('レアリティ確率は 0.001〜99.999 の範囲で入力してください。');
    return;
  }
  if (!Number.isInteger(ceiling) || ceiling < 1 || ceiling > 1000) {
    alert('天井回数は 1〜1000 の整数で入力してください。');
    return;
  }

  const p = ratePct / 100;

  // 少なくとも1回出る確率: P(X≥1) = 1-(1-p)^n
  function atLeastOnce(n) {
    return 1 - Math.pow(1 - p, n);
  }

  // マイルストーン: 50%, 90%, 99% を超える最小連数
  function findMilestone(threshold) {
    for (let n = 1; n <= 10000; n++) {
      if (atLeastOnce(n) >= threshold) return n;
    }
    return null;
  }

  const m50 = findMilestone(0.5);
  const m90 = findMilestone(0.9);
  const m99 = findMilestone(0.99);

  document.getElementById('gacha-50').textContent = m50 !== null ? `${m50}連` : '10000連超';
  document.getElementById('gacha-90').textContent = m90 !== null ? `${m90}連` : '10000連超';
  document.getElementById('gacha-99').textContent = m99 !== null ? `${m99}連` : '10000連超';

  // 天井コメント
  const ceilingProb = atLeastOnce(ceiling) * 100;
  const expectedPulls = Math.round(1 / p);
  const comment = document.getElementById('gacha-comment');
  comment.innerHTML = `
    <strong>天井（${ceiling}連）までの到達確率: ${ceilingProb.toPrecision(4)}%</strong><br>
    期待値（平均当たり連数）: 約${expectedPulls}連<br>
    ${ceilingProb >= 90
      ? `天井到達率が高め（${ceilingProb.toFixed(1)}%）です。計画的な課金で天井を視野に入れられます。`
      : `天井（${ceiling}連）でも${ceilingProb.toFixed(1)}%しか到達できないため、期待値で考えると期待回数の${expectedPulls}連を参考にしてください。`
    }
  `;

  // テーブル生成（10連単位）
  const tbody = document.getElementById('gacha-table-body');
  tbody.innerHTML = '';

  const step = ceiling <= 50 ? 5 : 10;
  for (let n = step; n <= ceiling; n += step) {
    const prob = atLeastOnce(n) * 100;
    const probStr = prob.toFixed(2) + '%';
    let evalClass, evalText;
    if (prob >= 90) {
      evalClass = 'pct-high'; evalText = '高確率';
    } else if (prob >= 50) {
      evalClass = 'pct-mid'; evalText = '半々';
    } else {
      evalClass = 'pct-low'; evalText = '低確率';
    }
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${n}連</td>
      <td class="${evalClass}">${probStr}</td>
      <td>${evalText}</td>
    `;
    tbody.appendChild(tr);
  }

  resultGacha.hidden = false;
  resultBasic.hidden = true;
  resultAbtest.hidden = true;
  chartWrap.hidden = true;
  resultArea.hidden = false;
});

// ===== ABテストモード =====

formAbtest.addEventListener('submit', e => {
  e.preventDefault();

  const nA = parseInt(document.getElementById('a-visitors').value, 10);
  const cA = parseInt(document.getElementById('a-conversions').value, 10);
  const nB = parseInt(document.getElementById('b-visitors').value, 10);
  const cB = parseInt(document.getElementById('b-conversions').value, 10);

  if (isNaN(nA) || nA < 1 || isNaN(nB) || nB < 1) {
    alert('訪問者数は1以上の整数を入力してください。');
    return;
  }
  if (isNaN(cA) || cA < 0 || cA > nA) {
    alert(`A群のコンバージョン数は 0〜${nA} で入力してください。`);
    return;
  }
  if (isNaN(cB) || cB < 0 || cB > nB) {
    alert(`B群のコンバージョン数は 0〜${nB} で入力してください。`);
    return;
  }

  const cvrA = cA / nA;
  const cvrB = cB / nB;
  const lift = cvrA > 0 ? ((cvrB - cvrA) / cvrA) * 100 : null;

  // カイ二乗検定（イェーツの補正なし、大サンプル向け）
  const total = nA + nB;
  const totalConv = cA + cB;
  const totalNonConv = (nA - cA) + (nB - cB);

  // 期待値
  const eA1 = (nA * totalConv) / total;
  const eA0 = (nA * totalNonConv) / total;
  const eB1 = (nB * totalConv) / total;
  const eB0 = (nB * totalNonConv) / total;

  // 全ての期待値が5以上か確認
  const allExpected5 = [eA1, eA0, eB1, eB0].every(v => v >= 5);

  let chi2, pValue;

  if (allExpected5) {
    // ピアソンのカイ二乗検定
    chi2 = Math.pow(cA - eA1, 2) / eA1
         + Math.pow((nA - cA) - eA0, 2) / eA0
         + Math.pow(cB - eB1, 2) / eB1
         + Math.pow((nB - cB) - eB0, 2) / eB0;
    pValue = chi2pvalue(chi2, 1);
  } else {
    // 小サンプル時はフィッシャー正確検定の近似
    chi2 = null;
    pValue = fisherExactPValue(cA, nA - cA, cB, nB - cB);
  }

  const isSignificant = pValue < 0.05;

  // 表示
  document.getElementById('ab-a-cvr').textContent = (cvrA * 100).toFixed(2) + '%';
  document.getElementById('ab-b-cvr').textContent = (cvrB * 100).toFixed(2) + '%';
  document.getElementById('ab-pval').textContent  = pValue < 0.0001 ? '< 0.0001' : pValue.toFixed(4);
  document.getElementById('ab-chi2').textContent  = chi2 !== null ? chi2.toFixed(3) : '—（Fisher検定）';
  document.getElementById('ab-lift').textContent  = lift !== null
    ? (lift >= 0 ? '+' : '') + lift.toFixed(1) + '%'
    : '—';

  const verdict = document.getElementById('ab-verdict');
  if (isSignificant) {
    verdict.textContent = '✅ 統計的に有意な差があります（p < 0.05）';
    verdict.className = 'ab-result-verdict verdict-significant';
  } else {
    verdict.textContent = '⚠️ 有意差なし（p ≥ 0.05）— データ不足の可能性があります';
    verdict.className = 'ab-result-verdict verdict-not-significant';
  }

  const winner = cvrB > cvrA ? 'B群' : (cvrA > cvrB ? 'A群' : '同率');
  const interp = document.getElementById('ab-interpretation');
  if (isSignificant) {
    interp.textContent = `${winner}（CVR: ${(Math.max(cvrA, cvrB) * 100).toFixed(2)}%）が統計的に有意に優れています。`
      + (lift !== null ? ` 相対改善率は${lift.toFixed(1)}%です。` : '')
      + ` p値 ${pValue.toFixed(4)} は有意水準0.05を下回っており、この差が偶然である確率は低いと判断できます。`;
  } else {
    interp.textContent = `現時点では有意差が確認できません（p値: ${pValue.toFixed(4)}）。`
      + ` 各群のサンプル数を増やすか、より大きな効果量を持つ施策を検討してください。`
      + ` 一般的に各群1,000件以上のデータが推奨されます。`;
  }

  resultAbtest.hidden = false;
  resultBasic.hidden = true;
  resultGacha.hidden = true;
  chartWrap.hidden = true;
  resultArea.hidden = false;
});

/**
 * χ²分布の累積分布関数（自由度1の正規近似）
 * @param {number} chi2
 * @param {number} df 自由度（1のみ対応）
 * @returns {number} p値（両側）
 */
function chi2pvalue(chi2, df) {
  if (df !== 1) return NaN;
  // z = sqrt(chi2), 両側p値 = 2 * (1 - Φ(z))
  const z = Math.sqrt(chi2);
  return 2 * (1 - normalCDF(z));
}

/**
 * 標準正規分布 CDF（近似）
 */
function normalCDF(z) {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const poly = t * (0.319381530
             + t * (-0.356563782
             + t * (1.781477937
             + t * (-1.821255978
             + t * 1.330274429))));
  const pdf = Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);
  const cdf = 1 - pdf * poly;
  return z >= 0 ? cdf : 1 - cdf;
}

/**
 * フィッシャー正確検定 p値（超幾何分布に基づく近似）
 * 2×2分割表 [[a,b],[c,d]]
 * @param {number} a A群コンバージョン
 * @param {number} b A群非コンバージョン
 * @param {number} c B群コンバージョン
 * @param {number} d B群非コンバージョン
 */
function fisherExactPValue(a, b, c, d) {
  const n1 = a + b;
  const n2 = c + d;
  const K  = a + c;
  const N  = n1 + n2;

  // 超幾何分布での確率
  function hypergeomPMF(k) {
    const logP = logCombination(K, k)
               + logCombination(N - K, n1 - k)
               - logCombination(N, n1);
    return Math.exp(logP);
  }

  const pObs = hypergeomPMF(a);
  let pVal = 0;

  const kMin = Math.max(0, n1 - (N - K));
  const kMax = Math.min(n1, K);

  for (let k = kMin; k <= kMax; k++) {
    const p = hypergeomPMF(k);
    if (p <= pObs + 1e-10) {
      pVal += p;
    }
  }

  return Math.min(pVal, 1);
}

// ===== 初期化 =====

document.addEventListener('DOMContentLoaded', () => {
  hideAllResults();
});
