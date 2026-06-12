'use strict';

/* ============================================================
   退職金・iDeCo 受取税金最適化シミュレーター
   script.js — 2024年税制改正（5年ルール廃止）対応
   ============================================================ */

/* ----------------------------------------------------------
   1. 所得税速算表
   ---------------------------------------------------------- */
const TAX_TABLE = [
  { limit: 1_950_000,  rate: 0.05, deduction: 0 },
  { limit: 3_300_000,  rate: 0.10, deduction: 97_500 },
  { limit: 6_950_000,  rate: 0.20, deduction: 427_500 },
  { limit: 9_000_000,  rate: 0.23, deduction: 636_000 },
  { limit: 18_000_000, rate: 0.33, deduction: 1_536_000 },
  { limit: 40_000_000, rate: 0.40, deduction: 2_796_000 },
  { limit: Infinity,   rate: 0.45, deduction: 4_796_000 },
];

/* 復興特別所得税率（2037年まで） */
const FUKKO_RATE = 1.021;

/* ----------------------------------------------------------
   2. 計算ユーティリティ
   ---------------------------------------------------------- */

/**
 * 退職所得控除額を計算（万円）
 * @param {number} years 勤続年数 or iDeCo加入期間（年）
 * @returns {number} 控除額（万円）
 */
function calcRetirementDeduction(years) {
  const y = Math.floor(years);
  if (y <= 0) return 80;
  if (y <= 20) {
    return Math.max(40 * y, 80);
  } else {
    return 800 + 70 * (y - 20);
  }
}

/**
 * 課税退職所得を計算（万円）
 * @param {number} amount 受取額（万円）
 * @param {number} deduction 控除額（万円）
 * @returns {number} 課税退職所得（万円、最低0）
 */
function calcTaxableIncome(amount, deduction) {
  return Math.max(0, (amount - deduction) * 0.5);
}

/**
 * 所得税額を計算（円）
 * @param {number} taxableMan 課税退職所得（万円）
 * @returns {number} 所得税額（円、復興特別所得税込）
 */
function calcIncomeTax(taxableMan) {
  if (taxableMan <= 0) return 0;
  const taxable = taxableMan * 10_000; // 円
  const bracket = TAX_TABLE.find(b => taxable <= b.limit);
  const baseTax = taxable * bracket.rate - bracket.deduction;
  return Math.floor(Math.max(0, baseTax) * FUKKO_RATE);
}

/**
 * 住民税額を計算（円）
 * @param {number} taxableMan 課税退職所得（万円）
 * @returns {number} 住民税額（円）
 */
function calcResidentTax(taxableMan) {
  if (taxableMan <= 0) return 0;
  return Math.floor(taxableMan * 10_000 * 0.10);
}

/**
 * 万円単位でカンマ区切り表示
 * @param {number} man 万円
 * @returns {string}
 */
function fmtMan(man) {
  return Math.round(man).toLocaleString('ja-JP') + ' 万円';
}

/**
 * 万円を「X,XXX 万円」にフォーマット（小数なし）
 */
function fmtManShort(man) {
  return Math.round(man).toLocaleString('ja-JP');
}

/* ----------------------------------------------------------
   3. iDeCo 年金受取の概算税額
      公的年金等控除（65歳未満 60万円、65歳以上 110万円）を簡易適用。
      本ツールでは「65歳未満」として年受取額の概算計算とする。
   ---------------------------------------------------------- */
const ANNUITY_YEARS = 20; // 年金受取期間（概算）
const PENSION_DEDUCTION_MAN = 60; // 公的年金等控除（万円）

/**
 * iDeCo年金受取の税負担（概算）を計算（万円）
 * @param {number} balanceMan iDeCo残高（万円）
 * @returns {number} 税負担合計（万円）
 */
function calcIdecoPensionTax(balanceMan) {
  const annualReceive = balanceMan / ANNUITY_YEARS; // 年間受取額
  const taxableAnnual = Math.max(0, annualReceive - PENSION_DEDUCTION_MAN);
  const incomeTax = calcIncomeTax(taxableAnnual);
  const residentTax = calcResidentTax(taxableAnnual);
  const totalTaxPerYear = (incomeTax + residentTax) / 10_000; // 万円
  return totalTaxPerYear * ANNUITY_YEARS;
}

/* ----------------------------------------------------------
   4. 1パターン分の税計算
      2024年改正後は同年受取でも両方の控除をフルに適用可能。
   ---------------------------------------------------------- */

/**
 * 退職金とiDeCoを別々に計算（2024年改正後の方式）
 * @param {object} p パラメータ
 * @returns {object} 計算結果
 */
function calcPattern(p) {
  const {
    retirementAmount, // 退職金額（万円）
    yearsOfService,   // 勤続年数
    idecoBalance,     // iDeCo残高（万円）
    idecoYears,       // iDeCo加入期間
    idecoType,        // 'lump' | 'annuity' | 'mixed'
  } = p;

  /* 退職金の計算 */
  const retDeduction = calcRetirementDeduction(yearsOfService);
  const retTaxableIncome = calcTaxableIncome(retirementAmount, retDeduction);
  const retIncomeTax = calcIncomeTax(retTaxableIncome) / 10_000;  // 万円
  const retResidentTax = calcResidentTax(retTaxableIncome) / 10_000;
  const retTaxTotal = retIncomeTax + retResidentTax;
  const retTakeHome = retirementAmount - retTaxTotal;

  /* iDeCo の計算 */
  let idecoTaxTotal = 0;
  let idecoTakeHome = 0;

  if (idecoType === 'lump') {
    /* 一時金：2024年改正でiDeCoの控除も独立して適用 */
    const idecoDeduction = calcRetirementDeduction(idecoYears);
    const idecoTaxable = calcTaxableIncome(idecoBalance, idecoDeduction);
    const idecoIncomeTax = calcIncomeTax(idecoTaxable) / 10_000;
    const idecoResidentTax = calcResidentTax(idecoTaxable) / 10_000;
    idecoTaxTotal = idecoIncomeTax + idecoResidentTax;
    idecoTakeHome = idecoBalance - idecoTaxTotal;

  } else if (idecoType === 'annuity') {
    /* 年金：公的年金等控除を適用（概算） */
    idecoTaxTotal = calcIdecoPensionTax(idecoBalance);
    idecoTakeHome = idecoBalance - idecoTaxTotal;

  } else {
    /* 一時金＋年金（半々） */
    const lumpAmount = idecoBalance / 2;
    const annuityAmount = idecoBalance / 2;

    const idecoDeduction = calcRetirementDeduction(idecoYears);
    // 一時金の控除は半額に対して適用
    const lumpTaxable = calcTaxableIncome(lumpAmount, idecoDeduction);
    const lumpIncomeTax = calcIncomeTax(lumpTaxable) / 10_000;
    const lumpResidentTax = calcResidentTax(lumpTaxable) / 10_000;
    const lumpTax = lumpIncomeTax + lumpResidentTax;

    // 年金部分の概算
    const annuityTax = calcIdecoPensionTax(annuityAmount);

    idecoTaxTotal = lumpTax + annuityTax;
    idecoTakeHome = idecoBalance - idecoTaxTotal;
  }

  const totalTaxBurden = retTaxTotal + idecoTaxTotal;
  const totalTakeHome = retTakeHome + idecoTakeHome;

  return {
    retDeduction,
    retTaxableIncome,
    retTaxTotal,
    retTakeHome,
    idecoTaxTotal,
    idecoTakeHome,
    totalTaxBurden,
    totalTakeHome,
  };
}

/* ----------------------------------------------------------
   5. 4パターンの計算
      同時受取 / 1年後 / 2年後 / 5年後
      2024年改正後は時差に関係なく両方の控除をフルに適用可能
      ただし、時差受取でもiDeCoの控除は加入期間ベースで変わらない
   ---------------------------------------------------------- */

const PATTERNS = [
  { label: '同時受取',   delay: 0 },
  { label: '1年後受取',  delay: 1 },
  { label: '2年後受取',  delay: 2 },
  { label: '5年後受取',  delay: 5 },
];

/**
 * 全4パターンを計算
 * 遅延受取の場合、iDeCoは遅延期間中も年利3%で運用継続すると仮定。
 * @param {object} inputs ユーザー入力値
 * @returns {Array} 4パターンの結果配列
 */
function calcAllPatterns(inputs) {
  const IDECO_GROWTH_RATE = 0.03; // 遅延期間中のiDeCo想定年利
  return PATTERNS.map(pattern => {
    const { delay } = pattern;
    // 遅延期間分の複利運用でiDeCo残高が増加
    const growthFactor = Math.pow(1 + IDECO_GROWTH_RATE, delay);
    const adjustedIdecoBalance = Math.round(inputs.idecoBalance * growthFactor * 10) / 10;
    const adjustedIdecoYears   = inputs.idecoYears + delay;

    const result = calcPattern({
      retirementAmount: inputs.retirementAmount,
      yearsOfService:   inputs.yearsOfService,
      idecoBalance:     adjustedIdecoBalance,
      idecoYears:       adjustedIdecoYears,
      idecoType:        inputs.idecoType,
    });
    return {
      ...result,
      label:                 pattern.label,
      delay:                 pattern.delay,
      idecoBalanceAtReceive: adjustedIdecoBalance,
    };
  });
}

/* ----------------------------------------------------------
   6. Chart.js グラフ
   ---------------------------------------------------------- */
let chartInstance = null;

function renderChart(results, optimalIndex) {
  const ctx = document.getElementById('comparisonChart').getContext('2d');

  if (chartInstance) {
    chartInstance.destroy();
  }

  const colors = results.map((_, i) =>
    i === optimalIndex
      ? 'rgba(109, 40, 217, 0.92)'
      : 'rgba(196, 181, 253, 0.7)'
  );
  const borderColors = results.map((_, i) =>
    i === optimalIndex ? '#4c1d95' : '#a78bfa'
  );

  chartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: results.map(r => r.label),
      datasets: [
        {
          label: '手取り合計（万円）',
          data: results.map(r => Math.round(r.totalTakeHome)),
          backgroundColor: colors,
          borderColor: borderColors,
          borderWidth: 2,
          borderRadius: 6,
          borderSkipped: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => `手取り合計: ${ctx.parsed.y.toLocaleString('ja-JP')} 万円`,
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            font: { size: 12, family: "'BIZ UDPGothic', sans-serif" },
            color: '#374151',
          },
        },
        y: {
          beginAtZero: false,
          grid: { color: '#f0ede8' },
          ticks: {
            callback: val => val.toLocaleString('ja-JP'),
            font: { size: 11 },
            color: '#6b7280',
          },
        },
      },
    },
  });
}

/* ----------------------------------------------------------
   7. テーブル描画
   ---------------------------------------------------------- */

function renderTable(results, optimalIndex) {
  const tbody = document.getElementById('tableBody');

  // 列ヘッダーに最適マーク
  PATTERNS.forEach((_, i) => {
    const th = document.getElementById(`th-${i}`);
    if (!th) return;
    th.className = 'col-pattern' + (i === optimalIndex ? ' optimal' : '');
    th.innerHTML = PATTERNS[i].label +
      (i === optimalIndex ? '<br><span class="optimal-mark">最もお得</span>' : '');
  });

  const rows = [
    {
      label: 'iDeCo残高（受取時）',
      key: 'idecoBalanceAtReceive',
      format: v => fmtMan(v),
      className: 'row-info',
    },
    {
      label: '退職金の控除額',
      key: 'retDeduction',
      format: v => fmtMan(v),
    },
    {
      label: '退職金の課税所得',
      key: 'retTaxableIncome',
      format: v => fmtMan(v),
    },
    {
      label: '退職金の税負担',
      key: 'retTaxTotal',
      format: v => fmtMan(v),
    },
    {
      label: '退職金の手取り',
      key: 'retTakeHome',
      format: v => fmtMan(v),
    },
    {
      label: 'iDeCoの税負担',
      key: 'idecoTaxTotal',
      format: v => fmtMan(v),
    },
    {
      label: 'iDeCoの手取り',
      key: 'idecoTakeHome',
      format: v => fmtMan(v),
    },
    {
      label: '税負担合計',
      key: 'totalTaxBurden',
      format: v => fmtMan(v),
      className: 'row-subtotal',
    },
    {
      label: '合計手取り',
      key: 'totalTakeHome',
      format: v => fmtMan(v),
      className: 'row-total',
    },
  ];

  tbody.innerHTML = rows.map(row => {
    const tds = results.map((r, i) => {
      const val = row.format(r[row.key]);
      const isOptimal = i === optimalIndex;
      const cls = isOptimal ? ' class="optimal"' : '';
      return `<td${cls}>${val}</td>`;
    }).join('');

    return `<tr class="${row.className || ''}">
      <td>${row.label}</td>
      ${tds}
    </tr>`;
  }).join('');
}

/* ----------------------------------------------------------
   8. 最適バナー更新
   ---------------------------------------------------------- */

function renderOptimalBanner(results, optimalIndex) {
  const banner = document.getElementById('optimalBanner');
  const patternName = document.getElementById('optimalPatternName');
  const savingEl = document.getElementById('optimalSaving');

  const optimal = results[optimalIndex];
  const worst = [...results].sort((a, b) => a.totalTakeHome - b.totalTakeHome)[0];
  const diff = optimal.totalTakeHome - worst.totalTakeHome;

  patternName.textContent = optimal.label;

  if (diff > 0) {
    savingEl.innerHTML = `最悪パターンより<br><strong>${fmtMan(diff)}</strong><br>手取りアップ`;
  } else {
    savingEl.textContent = '';
  }
}

/* ----------------------------------------------------------
   9. 入力プレビュー（控除額ヒント）
   ---------------------------------------------------------- */

function updatePreviews() {
  const years = parseFloat(document.getElementById('yearsOfService').value) || 0;
  const idecoYears = parseFloat(document.getElementById('idecoYears').value) || 0;

  const retDed = calcRetirementDeduction(years);
  const ideDed = calcRetirementDeduction(idecoYears);

  document.getElementById('retirementDeductionPreview').textContent =
    `退職所得控除: ${fmtMan(retDed)}`;
  document.getElementById('idecoDeductionPreview').textContent =
    `iDeCo控除: ${fmtMan(ideDed)}`;
}

/* ----------------------------------------------------------
   10. メイン計算処理
   ---------------------------------------------------------- */

function runCalculation() {
  const retirementAmount = parseFloat(document.getElementById('retirementAmount').value) || 0;
  const yearsOfService = parseFloat(document.getElementById('yearsOfService').value) || 1;
  const idecoBalance = parseFloat(document.getElementById('idecoBalance').value) || 0;
  const idecoYears = parseFloat(document.getElementById('idecoYears').value) || 1;
  const idecoType = document.getElementById('idecoReceiveType').value;

  updatePreviews();

  const inputs = {
    retirementAmount,
    yearsOfService,
    idecoBalance,
    idecoYears,
    idecoType,
  };

  const results = calcAllPatterns(inputs);

  // 最適インデックス（手取り合計が最大）
  const optimalIndex = results.reduce(
    (maxIdx, r, i, arr) => r.totalTakeHome > arr[maxIdx].totalTakeHome ? i : maxIdx,
    0
  );

  renderChart(results, optimalIndex);
  renderTable(results, optimalIndex);
  renderOptimalBanner(results, optimalIndex);
}

/* ----------------------------------------------------------
   11. イベントリスナー（リアルタイム計算）
   ---------------------------------------------------------- */

const inputs = [
  'retirementAmount',
  'yearsOfService',
  'idecoBalance',
  'idecoYears',
  'idecoReceiveType',
];

inputs.forEach(id => {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener('input', runCalculation);
    el.addEventListener('change', runCalculation);
  }
});

/* ----------------------------------------------------------
   12. 初期実行
   ---------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  updatePreviews();
  runCalculation();
});
