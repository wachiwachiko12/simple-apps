'use strict';

/* =====================================================
   t検定 計算ツール — script.js
   対応なし（Welch）/ 対応あり / 1標本 t検定
   p値: 不完全ベータ関数近似（Abramowitz & Stegun）
===================================================== */

// ---- Chart.js instance ----
let chartInstance = null;

// =====================================================
// タブ切替
// =====================================================
function switchTab(type) {
  document.querySelectorAll('.tab-btn').forEach(b => {
    b.classList.remove('active');
    b.setAttribute('aria-selected', 'false');
  });
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));

  document.getElementById('tab-' + type).classList.add('active');
  document.getElementById('tab-' + type).setAttribute('aria-selected', 'true');
  document.getElementById('panel-' + type).classList.add('active');

  // 結果エリアをリセット
  resetResult();
}

function resetResult() {
  const area = document.getElementById('result-area');
  area.innerHTML = `
    <div class="empty-state" id="empty-state">
      <div class="empty-icon"><i class="bi bi-bar-chart"></i></div>
      <p class="empty-title">データを入力して「計算する」を押してください</p>
      <p class="empty-desc">t統計量・p値・有意差・効果量を自動で算出します</p>
    </div>`;
  if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
}

// =====================================================
// データ入力カウンター
// =====================================================
function setupCounter(textareaId, countId) {
  const ta = document.getElementById(textareaId);
  const ct = document.getElementById(countId);
  if (!ta || !ct) return;
  ta.addEventListener('input', () => {
    const vals = parseData(ta.value);
    ct.textContent = vals.length + ' 件';
  });
}

setupCounter('data-a', 'count-a');
setupCounter('data-b', 'count-b');
setupCounter('data-before', 'count-before');
setupCounter('data-after', 'count-after');
setupCounter('data-one', 'count-one');

// =====================================================
// ユーティリティ
// =====================================================
function parseData(raw) {
  return raw
    .split(/[\n\r,\t]+/)
    .map(s => s.trim().replace(/,/g, '.'))
    .filter(s => s !== '')
    .map(Number)
    .filter(n => !isNaN(n));
}

function mean(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function variance(arr) {
  const m = mean(arr);
  return arr.reduce((s, x) => s + (x - m) ** 2, 0) / (arr.length - 1);
}

function sd(arr) { return Math.sqrt(variance(arr)); }

function se(arr) { return sd(arr) / Math.sqrt(arr.length); }

function median(arr) {
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[m - 1] + s[m]) / 2 : s[m];
}

function quantile(arr, q) {
  const s = [...arr].sort((a, b) => a - b);
  const pos = (s.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return s[lo];
  return s[lo] * (hi - pos) + s[hi] * (pos - lo);
}

function fmt(n, d = 4) {
  if (Math.abs(n) < 1e-10 && n !== 0) return n.toExponential(3);
  return n.toFixed(d);
}

function fmtP(p) {
  if (p < 0.0001) return '< 0.0001';
  return p.toFixed(6);
}

// =====================================================
// p値計算 — t分布の両側p値
// 不完全ベータ関数 I_x(a,b) の数値近似を使用
// 参照: Numerical Recipes in C, 6.4
// =====================================================
function betai(a, b, x) {
  if (x < 0 || x > 1) return NaN;
  if (x === 0) return 0;
  if (x === 1) return 1;

  const bt = Math.exp(
    lnGamma(a + b) - lnGamma(a) - lnGamma(b) +
    a * Math.log(x) + b * Math.log(1 - x)
  );

  if (x < (a + 1) / (a + b + 2)) {
    return bt * betacf(a, b, x) / a;
  } else {
    return 1 - bt * betacf(b, a, 1 - x) / b;
  }
}

function betacf(a, b, x) {
  const MAXIT = 200;
  const EPS = 3e-14;
  const FPMIN = 1e-300;

  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - qab * x / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;

  for (let m = 1; m <= MAXIT; m++) {
    let m2 = 2 * m;
    let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    h *= d * c;

    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

function lnGamma(z) {
  // Lanczos approximation
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
    1.5056327351493116e-7
  ];
  if (z < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * z)) - lnGamma(1 - z);
  }
  z -= 1;
  let x = c[0];
  for (let i = 1; i < g + 2; i++) x += c[i] / (z + i);
  const t = z + g + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

/**
 * t分布のCDF（下側累積確率）P(T <= t) for degrees of freedom df
 */
function tCDF(t, df) {
  const x = df / (df + t * t);
  const p = betai(df / 2, 0.5, x) / 2;
  return t >= 0 ? 1 - p : p;
}

/**
 * 両側p値
 */
function twoSidedP(t, df) {
  const p = 2 * (1 - tCDF(Math.abs(t), df));
  return Math.max(0, Math.min(1, p));
}

// =====================================================
// Welch t検定（対応なし）
// =====================================================
function welch(a, b) {
  const n1 = a.length, n2 = b.length;
  const m1 = mean(a), m2 = mean(b);
  const v1 = variance(a), v2 = variance(b);
  const se1 = v1 / n1, se2 = v2 / n2;
  const seSum = se1 + se2;

  const t = (m1 - m2) / Math.sqrt(seSum);
  const df = (seSum ** 2) / ((se1 ** 2) / (n1 - 1) + (se2 ** 2) / (n2 - 1));

  const p = twoSidedP(t, df);

  // Cohen's d (pooled SD)
  const sp = Math.sqrt(((n1 - 1) * v1 + (n2 - 1) * v2) / (n1 + n2 - 2));
  const cohensD = Math.abs(m1 - m2) / sp;

  // 95% CI of the difference (Welch)
  const tCrit = tQuantile(0.975, df);
  const diffSE = Math.sqrt(seSum);
  const ci = [(m1 - m2) - tCrit * diffSE, (m1 - m2) + tCrit * diffSE];

  return { t, df, p, m1, m2, v1, v2, n1, n2, cohensD, ci };
}

// =====================================================
// 対応ありt検定
// =====================================================
function paired(before, after) {
  const n = before.length;
  const diffs = before.map((x, i) => x - after[i]);
  const dMean = mean(diffs);
  const dSD = sd(diffs);
  const dSE = dSD / Math.sqrt(n);

  const t = dMean / dSE;
  const df = n - 1;
  const p = twoSidedP(t, df);

  // Cohen's d for paired (d = mean(diffs) / sd(diffs))
  const cohensD = Math.abs(dMean) / dSD;

  const tCrit = tQuantile(0.975, df);
  const ci = [dMean - tCrit * dSE, dMean + tCrit * dSE];

  return { t, df, p, dMean, dSD, dSE, n, cohensD, ci, diffs };
}

// =====================================================
// 1標本t検定
// =====================================================
function oneSample(data, mu0) {
  const n = data.length;
  const m = mean(data);
  const s = sd(data);
  const seVal = s / Math.sqrt(n);

  const t = (m - mu0) / seVal;
  const df = n - 1;
  const p = twoSidedP(t, df);

  const cohensD = Math.abs(m - mu0) / s;

  const tCrit = tQuantile(0.975, df);
  const ci = [(m - mu0) - tCrit * seVal, (m - mu0) + tCrit * seVal];

  return { t, df, p, m, s, seVal, n, mu0, cohensD, ci };
}

// =====================================================
// t分布の分位点（逆関数）— 2分探索
// =====================================================
function tQuantile(p, df) {
  // Binary search
  let lo = 0, hi = 1000;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    if (tCDF(mid, df) < p) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

// =====================================================
// サンプルデータ
// =====================================================
function loadSampleIndependent() {
  document.getElementById('data-a').value =
    '23.5\n24.1\n22.8\n25.0\n23.9\n24.8\n23.2\n25.5\n22.6\n24.3';
  document.getElementById('data-b').value =
    '21.2\n20.8\n22.5\n21.0\n20.3\n22.1\n20.6\n21.8\n22.0\n21.5';
  document.getElementById('count-a').textContent = '10 件';
  document.getElementById('count-b').textContent = '10 件';
}

function loadSamplePaired() {
  document.getElementById('data-before').value =
    '72\n68\n75\n80\n65\n78\n70\n73\n69\n77';
  document.getElementById('data-after').value =
    '68\n65\n70\n74\n62\n73\n66\n69\n65\n73';
  document.getElementById('count-before').textContent = '10 件';
  document.getElementById('count-after').textContent = '10 件';
}

function loadSampleOneSample() {
  document.getElementById('data-one').value =
    '5.2\n4.8\n5.5\n5.1\n4.9\n5.3\n5.0\n4.7\n5.4\n5.2';
  document.getElementById('mu0').value = '5.0';
  document.getElementById('count-one').textContent = '10 件';
}

// =====================================================
// 入力バリデーション
// =====================================================
function validateMin(arr, name, minN = 2) {
  if (arr.length < minN) {
    throw new Error(`「${name}」には数値が${minN}件以上必要です（現在: ${arr.length}件）`);
  }
}

// =====================================================
// 結果HTML生成
// =====================================================
function sigBadge(p) {
  if (p < 0.05) {
    return `<span class="sig-badge significant"><i class="bi bi-check-circle-fill"></i> 有意差あり（p &lt; 0.05）</span>`;
  }
  return `<span class="sig-badge not-significant"><i class="bi bi-dash-circle"></i> 有意差なし（p ≥ 0.05）</span>`;
}

function cohensDBadge(d) {
  let label, pct;
  if (d < 0.2) { label = '非常に小さい'; pct = Math.min(d / 0.2 * 12, 12); }
  else if (d < 0.5) { label = '小さい'; pct = 12 + ((d - 0.2) / 0.3) * 23; }
  else if (d < 0.8) { label = '中程度'; pct = 35 + ((d - 0.5) / 0.3) * 25; }
  else { label = '大きい'; pct = Math.min(60 + ((d - 0.8) / 0.8) * 40, 100); }

  return `
    <div class="cohend-bar-wrap">
      <div class="cohend-label-row">
        <span>Cohen's d = <strong>${fmt(d, 3)}</strong>（${label}）</span>
        <span>効果量</span>
      </div>
      <div class="cohend-bar-bg">
        <div class="cohend-bar-fill" style="width:${pct}%"></div>
      </div>
      <div class="cohend-bar-markers">
        <span>0</span><span>0.2 (小)</span><span>0.5 (中)</span><span>0.8 (大)</span>
      </div>
    </div>`;
}

// =====================================================
// 計算実行 — 対応なし
// =====================================================
function runIndependent() {
  const area = document.getElementById('result-area');
  try {
    const a = parseData(document.getElementById('data-a').value);
    const b = parseData(document.getElementById('data-b').value);
    validateMin(a, 'グループ A', 2);
    validateMin(b, 'グループ B', 2);

    const r = welch(a, b);

    const reportText_ind = `t(${fmt(r.df, 1)}) = ${r.t.toFixed(2)}, p = ${r.p < 0.001 ? '< .001' : r.p.toFixed(3)}, Cohen's d = ${r.cohensD.toFixed(2)}`;
    const html = `
      <div class="result-header">
        <h3>Welch t検定（対応なし）の結果</h3>
        ${sigBadge(r.p)}
      </div>
      <div class="result-cards">
        <div class="result-card highlight">
          <div class="rc-value">${fmtP(r.p)}</div>
          <div class="rc-label">p値（両側）</div>
        </div>
        <div class="result-card">
          <div class="rc-value">${fmt(r.t, 4)}</div>
          <div class="rc-label">t 統計量</div>
        </div>
        <div class="result-card">
          <div class="rc-value">${fmt(r.df, 2)}</div>
          <div class="rc-label">自由度（Welch）</div>
        </div>
        <div class="result-card">
          <div class="rc-value">${fmt(r.cohensD, 3)}</div>
          <div class="rc-label">Cohen's d</div>
        </div>
      </div>
      <div class="ci-display">
        <strong>平均差の95%信頼区間</strong>：
        [${fmt(r.ci[0], 4)} , ${fmt(r.ci[1], 4)}]
        　（グループA − B = ${fmt(r.m1 - r.m2, 4)}）
      </div>
      ${cohensDBadge(r.cohensD)}
      <div class="report-example"><div class="report-label">論文記載例</div><code class="report-code">${escHtml(reportText_ind)}</code><button class="copy-btn" onclick="navigator.clipboard.writeText(${JSON.stringify(reportText_ind)})">コピー</button></div>
      <div class="chart-wrapper"><canvas id="result-chart"></canvas></div>
      <table class="summary-table">
        <thead>
          <tr><th>統計量</th><th>グループ A</th><th>グループ B</th></tr>
        </thead>
        <tbody>
          <tr><td>サンプル数 (n)</td><td>${r.n1}</td><td>${r.n2}</td></tr>
          <tr><td>平均</td><td>${fmt(r.m1, 4)}</td><td>${fmt(r.m2, 4)}</td></tr>
          <tr><td>標準偏差 (SD)</td><td>${fmt(Math.sqrt(r.v1), 4)}</td><td>${fmt(Math.sqrt(r.v2), 4)}</td></tr>
          <tr><td>標準誤差 (SE)</td><td>${fmt(Math.sqrt(r.v1 / r.n1), 4)}</td><td>${fmt(Math.sqrt(r.v2 / r.n2), 4)}</td></tr>
        </tbody>
      </table>`;

    area.innerHTML = html;
    drawBarChart('result-chart',
      ['グループ A', 'グループ B'],
      [r.m1, r.m2],
      [Math.sqrt(r.v1 / r.n1), Math.sqrt(r.v2 / r.n2)]);

  } catch (e) {
    area.innerHTML = `<div class="error-msg"><i class="bi bi-exclamation-triangle-fill"></i><span>${escHtml(e.message)}</span></div>`;
  }
}

// =====================================================
// 計算実行 — 対応あり
// =====================================================
function runPaired() {
  const area = document.getElementById('result-area');
  try {
    const before = parseData(document.getElementById('data-before').value);
    const after = parseData(document.getElementById('data-after').value);
    validateMin(before, '介入前', 2);
    validateMin(after, '介入後', 2);
    if (before.length !== after.length) {
      throw new Error(`介入前（${before.length}件）と介入後（${after.length}件）のデータ件数が一致しません。ペアになるよう同じ件数を入力してください。`);
    }

    const r = paired(before, after);
    const mBefore = mean(before), mAfter = mean(after);
    const sdBefore = sd(before), sdAfter = sd(after);

    const reportText_paired = `t(${r.df.toFixed(1)}) = ${r.t.toFixed(2)}, p = ${r.p < 0.001 ? '< .001' : r.p.toFixed(3)}, Cohen's d = ${r.cohensD.toFixed(2)}`;
    const html = `
      <div class="result-header">
        <h3>対応ありt検定（paired）の結果</h3>
        ${sigBadge(r.p)}
      </div>
      <div class="result-cards">
        <div class="result-card highlight">
          <div class="rc-value">${fmtP(r.p)}</div>
          <div class="rc-label">p値（両側）</div>
        </div>
        <div class="result-card">
          <div class="rc-value">${fmt(r.t, 4)}</div>
          <div class="rc-label">t 統計量</div>
        </div>
        <div class="result-card">
          <div class="rc-value">${r.df}</div>
          <div class="rc-label">自由度 (n−1)</div>
        </div>
        <div class="result-card">
          <div class="rc-value">${fmt(r.cohensD, 3)}</div>
          <div class="rc-label">Cohen's d</div>
        </div>
      </div>
      <div class="ci-display">
        <strong>差（Before−After）の平均の95%信頼区間</strong>：
        [${fmt(r.ci[0], 4)} , ${fmt(r.ci[1], 4)}]
        　（平均差 = ${fmt(r.dMean, 4)}）
      </div>
      ${cohensDBadge(r.cohensD)}
      <div class="report-example"><div class="report-label">論文記載例</div><code class="report-code">${escHtml(reportText_paired)}</code><button class="copy-btn" onclick="navigator.clipboard.writeText(${JSON.stringify(reportText_paired)})">コピー</button></div>
      <div class="chart-wrapper"><canvas id="result-chart"></canvas></div>
      <table class="summary-table">
        <thead>
          <tr><th>統計量</th><th>介入前</th><th>介入後</th><th>差 (d)</th></tr>
        </thead>
        <tbody>
          <tr><td>サンプル数 (n)</td><td>${r.n}</td><td>${r.n}</td><td>${r.n}</td></tr>
          <tr><td>平均</td><td>${fmt(mBefore, 4)}</td><td>${fmt(mAfter, 4)}</td><td>${fmt(r.dMean, 4)}</td></tr>
          <tr><td>標準偏差 (SD)</td><td>${fmt(sdBefore, 4)}</td><td>${fmt(sdAfter, 4)}</td><td>${fmt(r.dSD, 4)}</td></tr>
          <tr><td>標準誤差 (SE)</td><td>${fmt(sdBefore / Math.sqrt(r.n), 4)}</td><td>${fmt(sdAfter / Math.sqrt(r.n), 4)}</td><td>${fmt(r.dSE, 4)}</td></tr>
        </tbody>
      </table>`;

    area.innerHTML = html;
    drawBarChart('result-chart',
      ['介入前', '介入後'],
      [mBefore, mAfter],
      [sdBefore / Math.sqrt(r.n), sdAfter / Math.sqrt(r.n)]);

  } catch (e) {
    area.innerHTML = `<div class="error-msg"><i class="bi bi-exclamation-triangle-fill"></i><span>${escHtml(e.message)}</span></div>`;
  }
}

// =====================================================
// 計算実行 — 1標本
// =====================================================
function runOneSample() {
  const area = document.getElementById('result-area');
  try {
    const data = parseData(document.getElementById('data-one').value);
    validateMin(data, 'データ', 2);
    const mu0Val = parseFloat(document.getElementById('mu0').value);
    if (isNaN(mu0Val)) throw new Error('μ₀ に有効な数値を入力してください。');

    const r = oneSample(data, mu0Val);

    const reportText_one = `t(${r.df.toFixed(1)}) = ${r.t.toFixed(2)}, p = ${r.p < 0.001 ? '< .001' : r.p.toFixed(3)}, Cohen's d = ${r.cohensD.toFixed(2)}`;
    const html = `
      <div class="result-header">
        <h3>1標本t検定の結果　(H₀: μ = ${mu0Val})</h3>
        ${sigBadge(r.p)}
      </div>
      <div class="result-cards">
        <div class="result-card highlight">
          <div class="rc-value">${fmtP(r.p)}</div>
          <div class="rc-label">p値（両側）</div>
        </div>
        <div class="result-card">
          <div class="rc-value">${fmt(r.t, 4)}</div>
          <div class="rc-label">t 統計量</div>
        </div>
        <div class="result-card">
          <div class="rc-value">${r.df}</div>
          <div class="rc-label">自由度 (n−1)</div>
        </div>
        <div class="result-card">
          <div class="rc-value">${fmt(r.cohensD, 3)}</div>
          <div class="rc-label">Cohen's d</div>
        </div>
      </div>
      <div class="ci-display">
        <strong>平均差（x̄ − μ₀）の95%信頼区間</strong>：
        [${fmt(r.ci[0], 4)} , ${fmt(r.ci[1], 4)}]
        　（x̄ = ${fmt(r.m, 4)}, μ₀ = ${mu0Val}）
      </div>
      ${cohensDBadge(r.cohensD)}
      <div class="report-example"><div class="report-label">論文記載例</div><code class="report-code">${escHtml(reportText_one)}</code><button class="copy-btn" onclick="navigator.clipboard.writeText(${JSON.stringify(reportText_one)})">コピー</button></div>
      <div class="chart-wrapper"><canvas id="result-chart"></canvas></div>
      <table class="summary-table">
        <thead>
          <tr><th>統計量</th><th>データ</th><th>μ₀（帰無仮説）</th></tr>
        </thead>
        <tbody>
          <tr><td>サンプル数 (n)</td><td>${r.n}</td><td>—</td></tr>
          <tr><td>平均</td><td>${fmt(r.m, 4)}</td><td>${fmt(r.mu0, 4)}</td></tr>
          <tr><td>標準偏差 (SD)</td><td>${fmt(r.s, 4)}</td><td>—</td></tr>
          <tr><td>標準誤差 (SE)</td><td>${fmt(r.seVal, 4)}</td><td>—</td></tr>
        </tbody>
      </table>`;

    area.innerHTML = html;
    drawBarChart('result-chart',
      ['標本平均 x̄', 'μ₀'],
      [r.m, r.mu0],
      [r.seVal, 0]);

  } catch (e) {
    area.innerHTML = `<div class="error-msg"><i class="bi bi-exclamation-triangle-fill"></i><span>${escHtml(e.message)}</span></div>`;
  }
}

// =====================================================
// Chart.js — 平均 ± SE 誤差棒グラフ
// =====================================================
function drawBarChart(canvasId, labels, means, ses) {
  if (chartInstance) { chartInstance.destroy(); chartInstance = null; }

  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const colors = [
    'rgba(13,148,136,0.75)',
    'rgba(20,184,166,0.75)'
  ];
  const borders = [
    'rgba(13,148,136,1)',
    'rgba(20,184,166,1)'
  ];

  chartInstance = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: '平均値',
        data: means,
        backgroundColor: colors,
        borderColor: borders,
        borderWidth: 2,
        borderRadius: 6,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 600 },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => {
              const se = ses[ctx.dataIndex];
              const m = ctx.parsed.y;
              return [`平均: ${fmt(m, 4)}`, `SE: ±${fmt(se, 4)}`];
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: false,
          grid: { color: 'rgba(0,0,0,0.06)' },
          title: { display: true, text: '平均値', font: { size: 11 }, color: '#6b7280' }
        },
        x: {
          grid: { display: false }
        }
      }
    },
    plugins: [{
      id: 'errorBars',
      afterDatasetsDraw(chart) {
        const { ctx, scales } = chart;
        const meta = chart.getDatasetMeta(0);
        meta.data.forEach((bar, i) => {
          const se = ses[i];
          if (se === 0) return;
          const x = bar.x;
          const yTop = scales.y.getPixelForValue(means[i] + se);
          const yBottom = scales.y.getPixelForValue(means[i] - se);
          const capWidth = 8;

          ctx.save();
          ctx.strokeStyle = borders[i] || 'rgba(13,148,136,1)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x, yTop);
          ctx.lineTo(x, yBottom);
          ctx.stroke();
          // top cap
          ctx.beginPath();
          ctx.moveTo(x - capWidth, yTop);
          ctx.lineTo(x + capWidth, yTop);
          ctx.stroke();
          // bottom cap
          ctx.beginPath();
          ctx.moveTo(x - capWidth, yBottom);
          ctx.lineTo(x + capWidth, yBottom);
          ctx.stroke();
          ctx.restore();
        });
      }
    }]
  });
}

// =====================================================
// セキュリティ: HTMLエスケープ
// =====================================================
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
