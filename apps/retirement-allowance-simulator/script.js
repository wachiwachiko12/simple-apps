'use strict';

/* ============================================================
   退職金相場シミュレーター — ロジック
   データ出典: 厚生労働省「令和4年 就労条件総合調査」
   ============================================================ */

// -----------------------------------------------------------------------
// 退職金相場データ（厚生労働省 令和4年 就労条件総合調査 準拠）
// -----------------------------------------------------------------------
const RETIREMENT_DATA = {
  // 大学卒・管理事務技術職（勤続年数別の平均 万円）
  university: [
    { minYears: 1,  maxYears: 4,  amount: 58 },
    { minYears: 5,  maxYears: 9,  amount: 149 },
    { minYears: 10, maxYears: 14, amount: 336 },
    { minYears: 15, maxYears: 19, amount: 596 },
    { minYears: 20, maxYears: 24, amount: 1054 },
    { minYears: 25, maxYears: 29, amount: 1449 },
    { minYears: 30, maxYears: 34, amount: 1787 },
    { minYears: 35, maxYears: 45, amount: 2173 },
  ],
  // 高校卒・現業職（勤続年数別の平均 万円）
  highschool: [
    { minYears: 1,  maxYears: 4,  amount: 51 },
    { minYears: 5,  maxYears: 9,  amount: 116 },
    { minYears: 10, maxYears: 14, amount: 267 },
    { minYears: 15, maxYears: 19, amount: 481 },
    { minYears: 20, maxYears: 24, amount: 804 },
    { minYears: 25, maxYears: 29, amount: 1157 },
    { minYears: 30, maxYears: 34, amount: 1440 },
    { minYears: 35, maxYears: 45, amount: 1819 },
  ],
};

// 業種別補正係数
const INDUSTRY_FACTOR = {
  manufacturing: 1.00,   // 製造業（基準）
  construction:  0.95,   // 建設業 -5%
  it:            1.15,   // 情報通信業 +15%
  finance:       1.20,   // 金融業・保険業 +20%
  retail:        0.85,   // 卸売・小売業 -15%
  medical:       0.90,   // 医療・福祉 -10%
  service:       0.80,   // その他・サービス業 -20%
};

const INDUSTRY_LABEL = {
  manufacturing: '製造業',
  construction:  '建設業',
  it:            '情報通信業',
  finance:       '金融業・保険業',
  retail:        '卸売・小売業',
  medical:       '医療・福祉',
  service:       'その他・サービス業',
};

// 会社規模別補正係数
const SIZE_FACTOR = {
  'large':        1.15,  // 1000人以上 +15%
  'medium-large': 1.05,  // 300〜999人 +5%
  'medium':       1.00,  // 100〜299人（基準）
  'small':        0.85,  // 30〜99人 -15%
};

const SIZE_LABEL = {
  'large':        '1,000人以上',
  'medium-large': '300〜999人',
  'medium':       '100〜299人',
  'small':        '30〜99人',
};

// 所得税速算表（退職所得課税）
const TAX_BRACKETS = [
  { max: 195,   rate: 0.05,   deduction: 0 },
  { max: 330,   rate: 0.10,   deduction: 9.75 },
  { max: 695,   rate: 0.20,   deduction: 42.75 },
  { max: 900,   rate: 0.23,   deduction: 63.6 },
  { max: 1800,  rate: 0.33,   deduction: 153.6 },
  { max: 4000,  rate: 0.40,   deduction: 279.6 },
  { max: Infinity, rate: 0.45, deduction: 479.6 },
];

// -----------------------------------------------------------------------
// 補間関数: 勤続年数から退職金基準額を線形補間で算出
// -----------------------------------------------------------------------
function getBaseAmount(years, educationType) {
  const data = RETIREMENT_DATA[educationType];
  const year = Math.max(1, Math.min(45, years));

  // 当てはまるレンジを探す
  for (let i = 0; i < data.length; i++) {
    const band = data[i];
    if (year >= band.minYears && year <= band.maxYears) {
      if (i === data.length - 1) return band.amount;
      const nextBand = data[i + 1];
      // 区間内での線形補間
      const t = (year - band.minYears) / (band.maxYears - band.minYears + 1);
      return Math.round(band.amount + t * (nextBand.amount - band.amount));
    }
  }
  return data[data.length - 1].amount;
}

// -----------------------------------------------------------------------
// 退職所得控除を計算（万円単位）
// -----------------------------------------------------------------------
function calcDeduction(years) {
  const y = Math.max(1, Math.floor(years));
  let deduction;
  if (y <= 20) {
    deduction = Math.max(80, 40 * y);
  } else {
    deduction = 800 + 70 * (y - 20);
  }
  return deduction; // 万円
}

// -----------------------------------------------------------------------
// 所得税を計算（万円単位）
// -----------------------------------------------------------------------
function calcIncomeTax(taxableIncome) {
  if (taxableIncome <= 0) return 0;
  for (const bracket of TAX_BRACKETS) {
    if (taxableIncome <= bracket.max) {
      const tax = taxableIncome * bracket.rate - bracket.deduction;
      // 復興特別所得税 2.1%
      return Math.max(0, tax * 1.021);
    }
  }
  return 0;
}

// -----------------------------------------------------------------------
// メイン計算
// -----------------------------------------------------------------------
function calculate(years, education, industry, companySize) {
  const base = getBaseAmount(years, education);
  const industryFactor = INDUSTRY_FACTOR[industry];
  const sizeFactor = SIZE_FACTOR[companySize];

  // 退職金相場
  const retirement = Math.round(base * industryFactor * sizeFactor);

  // 退職所得控除
  const deduction = calcDeduction(years);

  // 課税退職所得 = (退職金 - 控除) / 2  ※マイナスは0
  const taxableIncome = Math.max(0, (retirement - deduction) / 2);

  // 所得税（復興税含む）
  const incomeTax = Math.round(calcIncomeTax(taxableIncome) * 10) / 10;

  // 住民税 = 課税退職所得 × 10%
  const residenceTax = Math.round(taxableIncome * 0.1 * 10) / 10;

  // 手取り
  const takeHome = Math.round((retirement - incomeTax - residenceTax) * 10) / 10;

  return {
    retirement,
    deduction,
    taxableIncome: Math.round(taxableIncome * 10) / 10,
    incomeTax,
    residenceTax,
    takeHome: Math.max(0, takeHome),
  };
}

// -----------------------------------------------------------------------
// iDeCo の受け取り方による税負担
//
// 2024年の改正で、退職金とiDeCoはそれぞれの加入期間にもとづく退職所得控除を
// 使えるようになった。そのため一時金で受け取っても、iDeCo側で改めて控除が効く。
// 年金で受け取ると雑所得になり、公的年金等控除の対象になる。
// どちらが軽いかは金額と加入期間で入れ替わるので、3通り出して比べられるようにする。
// -----------------------------------------------------------------------
const ANNUITY_YEARS = 20;          // 年金受取の想定期間
const PENSION_DEDUCTION = 60;      // 公的年金等控除（65歳未満・万円）

// 一時金で受け取った場合の税額（万円）
function calcIdecoLumpTax(balance, idecoYears) {
  const deduction = calcDeduction(idecoYears);
  const taxable = Math.max(0, (balance - deduction) / 2);
  const incomeTax = calcIncomeTax(taxable);
  const residenceTax = taxable * 0.1;
  return incomeTax + residenceTax;
}

// 年金で受け取った場合の税額（万円・概算）
function calcIdecoAnnuityTax(balance) {
  const annual = balance / ANNUITY_YEARS;
  const taxable = Math.max(0, annual - PENSION_DEDUCTION);
  const perYear = calcIncomeTax(taxable) + taxable * 0.1;
  return perYear * ANNUITY_YEARS;
}

// 半分ずつ受け取った場合の税額（万円）
function calcIdecoMixedTax(balance, idecoYears) {
  return calcIdecoLumpTax(balance / 2, idecoYears) + calcIdecoAnnuityTax(balance / 2);
}

// 3通りを計算し、税負担の軽い順に返す
function compareIdecoOptions(balance, idecoYears) {
  if (!(balance > 0)) return [];
  const options = [
    { key: 'lump',    label: '全額を一時金で受け取る', tax: calcIdecoLumpTax(balance, idecoYears) },
    { key: 'annuity', label: '全額を年金で受け取る',   tax: calcIdecoAnnuityTax(balance) },
    { key: 'mixed',   label: '半分ずつ受け取る',       tax: calcIdecoMixedTax(balance, idecoYears) },
  ];
  return options
    .map((o) => ({
      ...o,
      tax: Math.round(o.tax * 10) / 10,
      takeHome: Math.round((balance - o.tax) * 10) / 10,
    }))
    .sort((a, b) => a.tax - b.tax);
}

// -----------------------------------------------------------------------
// 数値フォーマット（万円・カンマ区切り）
// -----------------------------------------------------------------------
function fmt(value) {
  return Number(value).toLocaleString('ja-JP', { maximumFractionDigits: 1 });
}

// -----------------------------------------------------------------------
// Chart.js インスタンス管理
// -----------------------------------------------------------------------
let breakdownChart = null;
let trendChart = null;

function renderBreakdownChart(data) {
  const ctx = document.getElementById('breakdown-chart').getContext('2d');

  if (breakdownChart) {
    breakdownChart.destroy();
  }

  const totalTax = data.incomeTax + data.residenceTax;
  const deductionPortion = Math.min(data.deduction, data.retirement);

  breakdownChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['退職金の内訳'],
      datasets: [
        {
          label: '手取り',
          data: [data.takeHome],
          backgroundColor: 'rgba(124,58,237,0.85)',
          borderRadius: 6,
          borderSkipped: false,
        },
        {
          label: '所得税・住民税',
          data: [Math.round(totalTax * 10) / 10],
          backgroundColor: 'rgba(220,38,38,0.7)',
          borderRadius: 0,
          borderSkipped: false,
        },
        {
          label: '退職所得控除（節税効果）',
          data: [deductionPortion],
          backgroundColor: 'rgba(5,150,105,0.55)',
          borderRadius: 0,
          borderSkipped: false,
        },
      ],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            font: { size: 12, family: "'BIZ UDPGothic', sans-serif" },
            padding: 12,
          },
        },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${ctx.dataset.label}: ${fmt(ctx.raw)}万円`,
          },
        },
      },
      scales: {
        x: {
          stacked: true,
          ticks: {
            callback: (v) => `${fmt(v)}万`,
            font: { size: 11 },
          },
          grid: { color: 'rgba(0,0,0,0.06)' },
        },
        y: {
          stacked: true,
          display: false,
        },
      },
    },
  });

  // キャンバス高さ調整
  document.getElementById('breakdown-chart').parentElement.style.maxHeight = '200px';
  document.getElementById('breakdown-chart').parentElement.style.height = '180px';
}

function renderTrendChart(education, industry, companySize) {
  const ctx = document.getElementById('trend-chart').getContext('2d');

  if (trendChart) {
    trendChart.destroy();
  }

  const yearsPoints = [3, 7, 12, 17, 22, 27, 32, 38];
  const labels = yearsPoints.map(y => `${y}年`);

  const uniData = yearsPoints.map(y => {
    const base = getBaseAmount(y, 'university');
    return Math.round(base * INDUSTRY_FACTOR[industry] * SIZE_FACTOR[companySize]);
  });

  const hsData = yearsPoints.map(y => {
    const base = getBaseAmount(y, 'highschool');
    return Math.round(base * INDUSTRY_FACTOR[industry] * SIZE_FACTOR[companySize]);
  });

  const activeData = education === 'university' ? uniData : hsData;

  trendChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: education === 'university' ? '大学卒（選択中）' : '大学卒',
          data: uniData,
          backgroundColor: education === 'university'
            ? 'rgba(124,58,237,0.85)'
            : 'rgba(196,181,253,0.5)',
          borderRadius: 4,
        },
        {
          label: education === 'highschool' ? '高校卒（選択中）' : '高校卒',
          data: hsData,
          backgroundColor: education === 'highschool'
            ? 'rgba(124,58,237,0.85)'
            : 'rgba(196,181,253,0.5)',
          borderRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            font: { size: 12, family: "'BIZ UDPGothic', sans-serif" },
            padding: 12,
          },
        },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${ctx.dataset.label}: ${fmt(ctx.raw)}万円`,
          },
        },
      },
      scales: {
        x: {
          ticks: { font: { size: 11 } },
          grid: { display: false },
        },
        y: {
          ticks: {
            callback: (v) => `${fmt(v)}万`,
            font: { size: 11 },
          },
          grid: { color: 'rgba(0,0,0,0.06)' },
        },
      },
    },
  });

  document.getElementById('trend-chart').parentElement.style.maxHeight = '280px';
  document.getElementById('trend-chart').parentElement.style.height = '260px';
}

// -----------------------------------------------------------------------
// UI 更新
// -----------------------------------------------------------------------
// iDeCo残高が入力されているときだけ、受け取り方の比較を出す
function renderIdecoComparison() {
  const card = document.getElementById('ideco-result');
  const box = document.getElementById('ideco-compare');
  if (!card || !box) return;

  const balance = parseFloat(document.getElementById('ideco-balance').value) || 0;
  const idecoYears = parseInt(document.getElementById('ideco-years').value, 10) || 0;
  const options = compareIdecoOptions(balance, idecoYears);

  if (options.length === 0) {
    card.hidden = true;
    return;
  }
  card.hidden = false;

  const best = options[0];
  const worst = options[options.length - 1];
  const gap = Math.round((worst.tax - best.tax) * 10) / 10;

  let note;
  if (gap <= 0) {
    note = `残高${fmt(balance)}万円・加入${idecoYears}年なら、どの受け取り方でも税負担は変わりません（控除の範囲に収まっています）。`;
  } else {
    note = `残高${fmt(balance)}万円・加入${idecoYears}年の場合、「${best.label}」が最も軽く、最も重い受け取り方との差は約${fmt(gap)}万円です。`;
    // 年金を含む案が勝つのは公的年金等控除が空いているからで、
    // 公的年金を受け取っていればこの前提は崩れる。黙って出すと誤解を招く。
    if (best.key !== 'lump') {
      note += ' ただしこれは公的年金を受け取っていない前提です。公的年金があると控除枠が先に埋まり、年金で受け取る分にも税がかかるため、この差は縮むか逆転します。';
    }
  }
  document.getElementById('ideco-result-note').textContent = note;

  box.textContent = '';
  options.forEach((o, i) => {
    const row = document.createElement('div');
    row.className = 'ideco-option' + (i === 0 ? ' ideco-best' : '');

    const label = document.createElement('span');
    label.className = 'ideco-option-label';
    label.textContent = i === 0 ? `${o.label}（最も軽い）` : o.label;

    const nums = document.createElement('span');
    nums.className = 'ideco-option-nums';
    nums.textContent = `税 ${fmt(o.tax)}万円 ／ 手取り ${fmt(o.takeHome)}万円`;

    row.append(label, nums);
    box.appendChild(row);
  });
}

function updateResults() {
  const years = parseInt(document.getElementById('years').value, 10) || 20;
  const education = document.getElementById('education').value;
  const industry = document.getElementById('industry').value;
  const companySize = document.getElementById('company-size').value;

  const result = calculate(years, education, industry, companySize);

  // メイン結果
  document.getElementById('result-amount').textContent = fmt(result.retirement);

  const eduLabel = education === 'university' ? '大学・大学院卒' : '高校・専門卒';
  document.getElementById('result-condition-label').textContent =
    `${eduLabel} ／ ${INDUSTRY_LABEL[industry]} ／ ${SIZE_LABEL[companySize]} ／ 勤続${years}年`;

  document.getElementById('result-range-note').textContent =
    `退職所得控除適用後の手取り目安: ${fmt(result.takeHome)}万円`;

  // 内訳
  document.getElementById('deduction-amount').textContent = `${fmt(result.deduction)}万円`;
  document.getElementById('taxable-income').textContent = `${fmt(result.taxableIncome)}万円`;
  document.getElementById('income-tax').textContent = `${fmt(result.incomeTax)}万円`;
  document.getElementById('residence-tax').textContent = `${fmt(result.residenceTax)}万円`;

  renderIdecoComparison();
  document.getElementById('take-home-amount').textContent = `${fmt(result.takeHome)}万円`;

  // グラフ
  renderBreakdownChart(result);
  renderTrendChart(education, industry, companySize);

  // 結果表示
  const resultsEl = document.getElementById('results');
  resultsEl.hidden = false;

  // スムーズスクロール
  resultsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// -----------------------------------------------------------------------
// スライダーと数値入力の同期
// -----------------------------------------------------------------------
function syncSlider() {
  const slider = document.getElementById('years-slider');
  const input  = document.getElementById('years');

  const update = (val) => {
    const clamp = Math.max(1, Math.min(45, parseInt(val, 10) || 1));
    slider.value = clamp;
    input.value  = clamp;
    // スライダーの塗り色を更新
    const pct = ((clamp - 1) / 44) * 100;
    slider.style.setProperty('--slider-percent', `${pct}%`);
    slider.style.background =
      `linear-gradient(to right, var(--primary) 0%, var(--primary) ${pct}%, #e2e8f0 ${pct}%, #e2e8f0 100%)`;
  };

  slider.addEventListener('input', () => update(slider.value));
  input.addEventListener('input', () => update(input.value));
  input.addEventListener('change', () => update(input.value));

  // 初期化
  update(slider.value);
}

// -----------------------------------------------------------------------
// 初期化
// -----------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  syncSlider();

  document.getElementById('calc-btn').addEventListener('click', updateResults);

  // Enter キー対応
  document.querySelectorAll('select, input').forEach((el) => {
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') updateResults();
    });
  });
});
