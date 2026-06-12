/**
 * 副業・兼業 手取りシミュレーター — script.js
 * ブラウザ完結・サーバー通信なし
 */

'use strict';

// ============================================================
// 計算ロジック
// ============================================================

/**
 * 給与所得控除を計算する（円単位）
 * 参照: 国税庁 No.1410
 * @param {number} income - 年収（円）
 * @returns {number} 給与所得控除額（円）
 */
function calcEmploymentDeduction(income) {
  const man = income / 10000; // 万円換算
  if (man <= 162.5) {
    return 550000;
  } else if (man <= 180) {
    return Math.floor(income * 0.4 - 100000);
  } else if (man <= 360) {
    return Math.floor(income * 0.3 + 80000);
  } else if (man <= 660) {
    return Math.floor(income * 0.2 + 440000);
  } else if (man <= 850) {
    return Math.floor(income * 0.1 + 1100000);
  } else {
    return 1950000;
  }
}

/**
 * 給与所得を計算する（円単位）
 * @param {number} income - 給与収入（円）
 * @returns {number} 給与所得（円）
 */
function calcSalaryIncome(income) {
  const deduction = calcEmploymentDeduction(income);
  return Math.max(0, income - deduction);
}

/**
 * 副業所得を計算する（円単位）
 * @param {number} sideIncome - 副業収入（円）
 * @param {number} sideExpense - 副業経費（円）
 * @param {string} sideType - 副業種別
 * @param {number} aodoriDeduction - 青色申告控除額（円）
 * @returns {number} 副業所得（円）
 */
function calcSideIncome(sideIncome, sideExpense, sideType, aodoriDeduction) {
  if (sideType === 'freelance') {
    const raw = sideIncome - sideExpense - aodoriDeduction;
    return Math.max(0, raw);
  } else if (sideType === 'parttime') {
    // アルバイト: 別の給与所得として給与所得控除を適用
    return calcSalaryIncome(sideIncome);
  } else {
    // 雑所得: 収入 - 経費（最小0）
    return Math.max(0, sideIncome - sideExpense);
  }
}

/**
 * 所得税を計算する（円単位、復興特別所得税込み）
 * 参照: 国税庁 No.2260
 * @param {number} taxableIncome - 課税所得（円）
 * @returns {number} 所得税額（円）
 */
function calcIncomeTax(taxableIncome) {
  if (taxableIncome <= 0) return 0;

  let tax;
  if (taxableIncome <= 1950000) {
    tax = taxableIncome * 0.05;
  } else if (taxableIncome <= 3300000) {
    tax = taxableIncome * 0.10 - 97500;
  } else if (taxableIncome <= 6950000) {
    tax = taxableIncome * 0.20 - 427500;
  } else if (taxableIncome <= 9000000) {
    tax = taxableIncome * 0.23 - 636000;
  } else if (taxableIncome <= 18000000) {
    tax = taxableIncome * 0.33 - 1536000;
  } else if (taxableIncome <= 40000000) {
    tax = taxableIncome * 0.40 - 2796000;
  } else {
    tax = taxableIncome * 0.45 - 4796000;
  }

  // 復興特別所得税 × 1.021
  return Math.floor(tax * 1.021);
}

/**
 * 住民税を計算する（概算: 課税所得 × 10%）
 * @param {number} taxableIncome - 課税所得（円）
 * @returns {number} 住民税額（円）
 */
function calcResidentTax(taxableIncome) {
  if (taxableIncome <= 0) return 0;
  return Math.floor(taxableIncome * 0.10);
}

/**
 * メイン計算処理
 * @param {Object} params - 入力パラメータ
 * @returns {Object} 計算結果
 */
function calculate(params) {
  const {
    mainIncomeMAN,
    sideIncomeMAN,
    sideExpenseMAN,
    sideType,
    aodoriMAN
  } = params;

  const mainIncome  = mainIncomeMAN  * 10000;
  const sideRevenue = sideIncomeMAN  * 10000;
  const sideExpense = sideExpenseMAN * 10000;
  const aodoriDeduction = aodoriMAN  * 10000;

  // 本業給与所得
  const mainSalaryIncome = calcSalaryIncome(mainIncome);
  const empDeduction = calcEmploymentDeduction(mainIncome);

  // 副業所得
  const sideIncome = calcSideIncome(sideRevenue, sideExpense, sideType, aodoriDeduction);

  // 社会保険料控除（本業年収 × 15% 概算）
  const socialInsurance = Math.floor(mainIncome * 0.15);

  // 基礎控除（2020年以降: 48万円）
  const basicDeduction = 480000;

  // ===== 副業なしのケース =====
  const taxableIncomeBefore = Math.max(0,
    mainSalaryIncome - basicDeduction - socialInsurance
  );
  const incomeTaxBefore   = calcIncomeTax(taxableIncomeBefore);
  const residentTaxBefore = calcResidentTax(taxableIncomeBefore);
  const totalTaxBefore    = incomeTaxBefore + residentTaxBefore;
  const takehomeBefore    = mainIncome - socialInsurance - totalTaxBefore;

  // ===== 副業ありのケース =====
  const taxableIncomeAfter = Math.max(0,
    mainSalaryIncome + sideIncome - basicDeduction - socialInsurance
  );
  const incomeTaxAfter   = calcIncomeTax(taxableIncomeAfter);
  const residentTaxAfter = calcResidentTax(taxableIncomeAfter);
  const totalTaxAfter    = incomeTaxAfter + residentTaxAfter;
  const takehomeAfter    = mainIncome + sideRevenue - socialInsurance - totalTaxAfter;

  // ===== 副業分の税負担増 =====
  const taxIncrease = totalTaxAfter - totalTaxBefore;

  // ===== 副業の手取り =====
  const sideTakehome = Math.max(0, sideRevenue - taxIncrease);

  // ===== 実効税率（副業収入に対する税負担増の割合）=====
  const effectiveRate = sideRevenue > 0
    ? Math.min(100, (taxIncrease / sideRevenue) * 100)
    : 0;

  // ===== 確定申告要否判定 =====
  let filingStatus;
  if (sideType === 'freelance') {
    filingStatus = 'recommended';
  } else if (sideIncome > 200000) {
    filingStatus = 'required';
  } else {
    filingStatus = 'ok';
  }

  return {
    empDeduction,
    mainSalaryIncome,
    sideIncome,
    socialInsurance,
    taxableIncomeBefore,
    taxableIncomeAfter,
    incomeTaxBefore,
    incomeTaxAfter,
    residentTaxBefore,
    residentTaxAfter,
    totalTaxBefore,
    totalTaxAfter,
    takehomeBefore,
    takehomeAfter,
    taxIncrease,
    sideTakehome,
    effectiveRate,
    filingStatus
  };
}

// ============================================================
// UI 更新
// ============================================================

/** 数値を日本語の金額形式に整形 */
function fmtYen(n) {
  if (isNaN(n)) return '—';
  return Math.round(n).toLocaleString('ja-JP') + '円';
}

/** 数値を整数の円文字なしで整形（グラフ用） */
function fmtNum(n) {
  return Math.round(n);
}

let chartInstance = null;

/**
 * Chart.js積み上げ棒グラフを描画/更新
 */
function updateChart(res) {
  const ctx = document.getElementById('incomeChart').getContext('2d');

  const labels = ['副業なし', '副業あり'];
  const takehomeData   = [fmtNum(res.takehomeBefore),   fmtNum(res.takehomeAfter)];
  const incomeTaxData  = [fmtNum(res.incomeTaxBefore),  fmtNum(res.incomeTaxAfter)];
  const residentTaxData = [fmtNum(res.residentTaxBefore), fmtNum(res.residentTaxAfter)];

  if (chartInstance) {
    chartInstance.data.datasets[0].data = takehomeData;
    chartInstance.data.datasets[1].data = incomeTaxData;
    chartInstance.data.datasets[2].data = residentTaxData;
    chartInstance.update();
    return;
  }

  chartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: '手取り',
          data: takehomeData,
          backgroundColor: '#fde68a',
          borderColor: '#f59e0b',
          borderWidth: 1,
          borderRadius: 4,
          borderSkipped: false
        },
        {
          label: '所得税',
          data: incomeTaxData,
          backgroundColor: '#fca5a5',
          borderColor: '#ef4444',
          borderWidth: 1
        },
        {
          label: '住民税',
          data: residentTaxData,
          backgroundColor: '#fdba74',
          borderColor: '#f97316',
          borderWidth: 1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            font: { size: 12 },
            padding: 16,
            usePointStyle: true,
            pointStyleWidth: 10
          }
        },
        tooltip: {
          callbacks: {
            label(ctx) {
              return ctx.dataset.label + ': ' + ctx.raw.toLocaleString('ja-JP') + '円';
            }
          }
        }
      },
      scales: {
        x: {
          stacked: true,
          grid: { display: false }
        },
        y: {
          stacked: true,
          ticks: {
            callback(v) {
              if (v >= 10000000) return (v / 10000000).toFixed(0) + '千万';
              if (v >= 1000000)  return (v / 10000).toFixed(0) + '万';
              return v;
            },
            font: { size: 11 }
          }
        }
      }
    }
  });
}

/**
 * 確定申告バッジを更新
 */
function updateFilingBadge(status) {
  const badge = document.getElementById('filing-badge');
  const icon  = document.getElementById('badge-icon');
  const text  = document.getElementById('badge-text');

  badge.className = 'filing-badge';

  if (status === 'ok') {
    badge.classList.add('badge-ok');
    icon.textContent = '🟢';
    text.textContent = '確定申告は不要（副業所得20万円以下）';
  } else if (status === 'required') {
    badge.classList.add('badge-required');
    icon.textContent = '🔴';
    text.textContent = '確定申告が必要です（副業所得20万円超）';
  } else {
    badge.classList.add('badge-recommended');
    icon.textContent = '🟡';
    text.textContent = '確定申告を推奨（フリーランス・事業所得）';
  }
}

/**
 * 全結果を画面に反映
 */
function renderResults(res) {
  // メインカード
  document.getElementById('res-side-takehome').textContent =
    Math.round(res.sideTakehome).toLocaleString('ja-JP');
  document.getElementById('res-effective-rate').textContent =
    res.effectiveRate.toFixed(1);

  // 確定申告バッジ
  updateFilingBadge(res.filingStatus);

  // 比較テーブル
  document.getElementById('cmp-income-tax-before').textContent  = fmtYen(res.incomeTaxBefore);
  document.getElementById('cmp-income-tax-after').textContent   = fmtYen(res.incomeTaxAfter);
  document.getElementById('cmp-resident-tax-before').textContent = fmtYen(res.residentTaxBefore);
  document.getElementById('cmp-resident-tax-after').textContent  = fmtYen(res.residentTaxAfter);
  document.getElementById('cmp-total-tax-before').textContent   = fmtYen(res.totalTaxBefore);
  document.getElementById('cmp-total-tax-after').textContent    = fmtYen(res.totalTaxAfter);
  document.getElementById('cmp-takehome-before').textContent    = fmtYen(res.takehomeBefore);
  document.getElementById('cmp-takehome-after').textContent     = fmtYen(res.takehomeAfter);
  document.getElementById('cmp-tax-diff').textContent =
    '副業による税負担の変化: +' + fmtYen(res.taxIncrease);

  // 手取り純増額
  const netIncrease = res.takehomeAfter - res.takehomeBefore;
  const netIncreaseEl = document.getElementById('cmp-net-increase');
  if (netIncreaseEl) {
    const sign = netIncrease >= 0 ? '+' : '';
    netIncreaseEl.textContent = '副業による純増額: ' + sign + fmtYen(netIncrease);
  }

  // グラフ
  updateChart(res);
}

// ============================================================
// イベントハンドラー
// ============================================================

/**
 * フォームの値を読み取りバリデーション付きで返す
 */
function getParams() {
  const raw = {
    mainIncomeMAN:  parseFloat(document.getElementById('main-income').value)  || 0,
    sideIncomeMAN:  parseFloat(document.getElementById('side-income').value)  || 0,
    sideExpenseMAN: parseFloat(document.getElementById('side-expense').value) || 0,
    sideType:       document.getElementById('side-type').value,
    aodoriMAN:      parseFloat(document.getElementById('aodori-type').value)  || 0
  };

  // 負値ガード
  raw.mainIncomeMAN  = Math.max(0, raw.mainIncomeMAN);
  raw.sideIncomeMAN  = Math.max(0, raw.sideIncomeMAN);
  raw.sideExpenseMAN = Math.max(0, raw.sideExpenseMAN);

  return raw;
}

/**
 * 副業種別に応じて経費フィールドと青色申告フィールドの表示を切り替え
 */
function updateFieldVisibility() {
  const type = document.getElementById('side-type').value;
  const expenseField = document.getElementById('expense-field');
  const aodoriField  = document.getElementById('aodori-field');

  // アルバイト時の説明要素を取得（なければ生成）
  let parttimeNote = document.getElementById('parttime-note');
  if (!parttimeNote) {
    parttimeNote = document.createElement('p');
    parttimeNote.id = 'parttime-note';
    parttimeNote.className = 'parttime-note';
    parttimeNote.textContent = '給与所得控除が自動で適用されます（収入に応じて自動計算）';
    expenseField.parentNode.insertBefore(parttimeNote, expenseField);
  }

  if (type === 'freelance') {
    expenseField.style.display = '';
    aodoriField.style.display  = '';
    parttimeNote.style.display = 'none';
  } else if (type === 'misc') {
    expenseField.style.display = '';
    aodoriField.style.display  = 'none';
    parttimeNote.style.display = 'none';
    document.getElementById('aodori-type').value = '0';
  } else {
    // parttime
    expenseField.style.display = 'none';
    aodoriField.style.display  = 'none';
    parttimeNote.style.display = '';
    document.getElementById('aodori-type').value = '0';
  }
}

/**
 * 給与所得控除の表示を更新
 */
function updateEmpDeductionDisplay(income) {
  const ded = calcEmploymentDeduction(income * 10000);
  document.getElementById('emp-ded-value').textContent =
    (ded / 10000).toFixed(1) + '万円';
}

/**
 * メイン再計算
 */
function recalculate() {
  const params = getParams();
  updateEmpDeductionDisplay(params.mainIncomeMAN);
  const res = calculate(params);
  renderResults(res);
}

// ============================================================
// 初期化
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  // 全フォーム要素に input/change リスナー
  ['main-income', 'side-income', 'side-expense'].forEach(id => {
    document.getElementById(id).addEventListener('input', recalculate);
  });

  ['side-type', 'aodori-type'].forEach(id => {
    document.getElementById(id).addEventListener('change', () => {
      updateFieldVisibility();
      recalculate();
    });
  });

  // 初期フィールド表示
  updateFieldVisibility();

  // 初回計算
  recalculate();
});
