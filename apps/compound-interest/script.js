/**
 * 複利計算シミュレーター — script.js
 * 計算式: 月次複利
 *   FV = PV×(1+r)^n + PMT×((1+r)^n - 1)/r
 *   r = 年利/12, n = 運用年数×12
 */

'use strict';

// ============================================================
// 定数
// ============================================================
const SCENARIO_COLORS = {
  3: { principal: 'rgba(16, 185, 129, 0.7)',  gain: 'rgba(16, 185, 129, 0.3)' },
  5: { principal: 'rgba(5, 150, 105, 0.85)',  gain: 'rgba(5, 150, 105, 0.4)' },
  7: { principal: 'rgba(2, 132, 199, 0.8)',   gain: 'rgba(2, 132, 199, 0.35)' },
};

// ============================================================
// 複利計算コア
// ============================================================
/**
 * 月次複利で最終資産額を計算
 * @param {number} pv  初期投資額（円）
 * @param {number} pmt 毎月積立額（円）
 * @param {number} annualRate 年利（小数: 0.05 = 5%）
 * @param {number} years 運用年数
 * @returns {number} 最終資産額（円）
 */
function calcFV(pv, pmt, annualRate, years) {
  const r = annualRate / 12;
  const n = years * 12;

  if (r === 0) {
    return pv + pmt * n;
  }

  const growth = Math.pow(1 + r, n);
  return pv * growth + pmt * ((growth - 1) / r);
}

/**
 * 元本合計（円）
 */
function calcPrincipal(pv, pmt, years) {
  return pv + pmt * 12 * years;
}

/**
 * 年次データ配列を生成 [{year, fv, principal}]
 */
function buildYearlyData(pv, pmt, annualRate, maxYears) {
  const data = [];
  for (let y = 1; y <= maxYears; y++) {
    const fv = calcFV(pv, pmt, annualRate, y);
    const principal = calcPrincipal(pv, pmt, y);
    data.push({ year: y, fv, principal, gain: fv - principal });
  }
  return data;
}

// ============================================================
// フォーマットユーティリティ
// ============================================================
function toMan(yen) {
  return yen / 10000;
}

function formatMan(yen, decimals = 0) {
  return toMan(yen).toLocaleString('ja-JP', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatYen(yen, decimals = 0) {
  return yen.toLocaleString('ja-JP', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

// ============================================================
// チャート管理
// ============================================================
let chartInstance = null;

function renderChart(datasets, labels) {
  const ctx = document.getElementById('assetChart').getContext('2d');

  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }

  chartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets,
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            font: { family: 'Outfit, BIZ UDPGothic, sans-serif', size: 12 },
            padding: 16,
          },
        },
        tooltip: {
          callbacks: {
            label(ctx) {
              const val = ctx.parsed.y;
              return ` ${ctx.dataset.label}: ${val.toLocaleString('ja-JP')}万円`;
            },
          },
        },
      },
      scales: {
        x: {
          stacked: true,
          grid: { display: false },
          ticks: {
            font: { size: 11 },
            callback(value, index) {
              const label = this.getLabelForValue(index);
              return label + '年';
            },
          },
        },
        y: {
          stacked: true,
          beginAtZero: true,
          grid: { color: 'rgba(0,0,0,0.06)' },
          ticks: {
            font: { size: 11 },
            callback(value) {
              return value.toLocaleString('ja-JP') + '万';
            },
          },
        },
      },
    },
  });
}

// ============================================================
// 比較テーブル
// ============================================================
const FIXED_YEARS = [5, 10, 20, 30];

function buildTableData(pv, pmt, scenarios, maxYears) {
  // 表示する年数リスト（重複除去・ソート）
  const yearSet = new Set(FIXED_YEARS);
  if (maxYears > 0) yearSet.add(maxYears);
  const targetYears = [...yearSet].filter(y => y <= maxYears).sort((a, b) => a - b);

  return { targetYears, scenarios };
}

function renderTable(pv, pmt, scenarios, maxYears) {
  const thead = document.getElementById('tableHead');
  const tbody = document.getElementById('tableBody');
  const yearSet = new Set(FIXED_YEARS);
  if (maxYears > 0) yearSet.add(maxYears);
  const targetYears = [...yearSet].filter(y => y <= maxYears).sort((a, b) => a - b);

  // ヘッダー行
  let headHTML = '<th>年数</th>';
  scenarios.forEach(rate => {
    headHTML += `<th>年利 ${rate}%</th>`;
  });
  if (scenarios.length > 1) {
    headHTML += '<th>元本合計</th>';
  }
  thead.innerHTML = headHTML;

  // データ行
  let bodyHTML = '';
  targetYears.forEach(y => {
    const principal = calcPrincipal(pv, pmt, y);
    const isLast = y === maxYears;
    const rowClass = isLast ? ' class="highlight-row"' : '';
    bodyHTML += `<tr${rowClass}>`;
    bodyHTML += `<td>${y}年</td>`;
    scenarios.forEach(rate => {
      const fv = calcFV(pv, pmt, rate / 100, y);
      bodyHTML += `<td>${formatMan(fv)}万円</td>`;
    });
    if (scenarios.length > 1) {
      bodyHTML += `<td>${formatMan(principal)}万円</td>`;
    }
    bodyHTML += '</tr>';
  });
  tbody.innerHTML = bodyHTML;
}

// ============================================================
// メイン計算処理
// ============================================================
function runSimulation() {
  // 入力値取得
  const pv   = parseFloat(document.getElementById('initial').value) * 10000 || 0;
  const pmt  = parseFloat(document.getElementById('monthly').value) || 0;
  const rate = parseFloat(document.getElementById('rate').value);
  const years = parseInt(document.getElementById('years').value, 10);

  // バリデーション
  if (isNaN(rate) || rate < 0.1 || rate > 15) {
    alert('年利は0.1〜15%の範囲で入力してください。');
    return;
  }
  if (isNaN(years) || years < 1 || years > 50) {
    alert('運用年数は1〜50年の範囲で入力してください。');
    return;
  }
  if (pv < 0 || pmt < 0) {
    alert('金額は0以上の値を入力してください。');
    return;
  }

  // 比較シナリオ
  const scenarios = [];
  [3, 5, 7].forEach(r => {
    const cb = document.getElementById(`sc${r}`);
    if (cb && cb.checked) scenarios.push(r);
  });
  if (scenarios.length === 0) {
    alert('比較利回りシナリオを1つ以上選択してください。');
    return;
  }

  // メインシナリオで計算（入力年利 or チェック済み最初のシナリオ）
  const mainRate = rate / 100;
  const fvMain   = calcFV(pv, pmt, mainRate, years);
  const principal = calcPrincipal(pv, pmt, years);
  const gain      = fvMain - principal;
  const multiplier = principal > 0 ? fvMain / principal : 0;

  // ヒーロー表示
  document.getElementById('heroYears').textContent = years;
  document.getElementById('heroValue').textContent = formatMan(fvMain);
  document.getElementById('heroSub').textContent =
    `元本 ${formatMan(principal)}万円 + 運用益 ${formatMan(gain)}万円`;

  // サマリーカード
  document.getElementById('totalPrincipal').textContent = formatMan(principal);
  document.getElementById('totalGain').textContent = formatMan(gain);
  document.getElementById('multiplier').textContent = multiplier.toFixed(2);

  // グラフ用データセット（シナリオごとに積み上げ棒グラフ）
  // 年次ラベル（5年刻み、最大30本まで）
  const step = years <= 10 ? 1 : years <= 20 ? 2 : 5;
  const chartLabels = [];
  for (let y = step; y <= years; y += step) {
    chartLabels.push(y);
  }
  if (chartLabels[chartLabels.length - 1] !== years) {
    chartLabels.push(years);
  }

  // シナリオが1つのとき: 元本（青緑）+ 運用益（薄緑）の2系列
  // 複数シナリオのとき: シナリオごとの最終資産額を並べた比較
  let chartDatasets;
  if (scenarios.length === 1) {
    const sRate = scenarios[0] / 100;
    const principalData = chartLabels.map(y => Math.round(toMan(calcPrincipal(pv, pmt, y))));
    const gainData = chartLabels.map(y => {
      const fv = calcFV(pv, pmt, sRate, y);
      const p  = calcPrincipal(pv, pmt, y);
      return Math.round(toMan(Math.max(fv - p, 0)));
    });

    chartDatasets = [
      {
        label: '元本合計',
        data: principalData,
        backgroundColor: 'rgba(52, 211, 153, 0.75)',
        borderColor: 'rgba(5, 150, 105, 0.9)',
        borderWidth: 1,
        stack: 'main',
      },
      {
        label: `運用益（年利${scenarios[0]}%）`,
        data: gainData,
        backgroundColor: 'rgba(5, 150, 105, 0.45)',
        borderColor: 'rgba(5, 150, 105, 0.7)',
        borderWidth: 1,
        stack: 'main',
      },
    ];
  } else {
    // 複数シナリオ: 各シナリオの積み上げ（元本+運用益）をグループ化
    const principalData = chartLabels.map(y => Math.round(toMan(calcPrincipal(pv, pmt, y))));

    chartDatasets = [
      {
        label: '元本合計',
        data: principalData,
        backgroundColor: 'rgba(156, 163, 175, 0.6)',
        borderColor: 'rgba(107, 114, 128, 0.8)',
        borderWidth: 1,
        stack: 'principal',
      },
    ];

    const stackColors = {
      3: 'rgba(110, 231, 183, 0.65)',
      5: 'rgba(5, 150, 105, 0.65)',
      7: 'rgba(2, 132, 199, 0.65)',
    };

    scenarios.forEach(r => {
      const sRate = r / 100;
      const gainData = chartLabels.map(y => {
        const fv = calcFV(pv, pmt, sRate, y);
        const p  = calcPrincipal(pv, pmt, y);
        return Math.round(toMan(Math.max(fv - p, 0)));
      });
      chartDatasets.push({
        label: `運用益（年利${r}%）`,
        data: gainData,
        backgroundColor: stackColors[r] || 'rgba(5, 150, 105, 0.5)',
        borderColor: 'rgba(0,0,0,0.1)',
        borderWidth: 1,
        stack: `sc${r}`,
      });

      // 同スタックに元本を再セット
      chartDatasets.push({
        label: `元本（${r}%用）`,
        data: principalData,
        backgroundColor: 'rgba(156, 163, 175, 0.45)',
        borderColor: 'rgba(107, 114, 128, 0.5)',
        borderWidth: 1,
        stack: `sc${r}`,
        hidden: false,
      });
    });

    // 最初の元本系列は非表示（各スタックに含めているため）
    chartDatasets[0].hidden = true;
  }

  renderChart(chartDatasets, chartLabels);

  // テーブル
  renderTable(pv, pmt, scenarios, years);

  // 結果表示
  const resultEl = document.getElementById('result');
  resultEl.removeAttribute('hidden');
  resultEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ============================================================
// イベント登録
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  const calcBtn = document.getElementById('calcBtn');
  if (calcBtn) {
    calcBtn.addEventListener('click', runSimulation);
  }

  // Enterキーでも実行
  document.querySelectorAll('#tool input[type="number"]').forEach(el => {
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter') runSimulation();
    });
  });

  // シナリオ変更時: 少なくとも1つチェックを維持
  [3, 5, 7].forEach(r => {
    const cb = document.getElementById(`sc${r}`);
    if (!cb) return;
    cb.addEventListener('change', () => {
      const anyChecked = [3, 5, 7].some(v => {
        const c = document.getElementById(`sc${v}`);
        return c && c.checked;
      });
      if (!anyChecked) {
        cb.checked = true;
      }
    });
  });
});
