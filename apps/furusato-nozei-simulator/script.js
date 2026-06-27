'use strict';

/* ======================================
   ふるさと納税 控除上限シミュレーター
   計算ロジック
====================================== */

// --- 子ども追加 UI ---
let childCount = 0;

document.getElementById('add-child-btn').addEventListener('click', function() {
  childCount++;
  const list = document.getElementById('children-list');
  const id = 'child-' + childCount;

  const item = document.createElement('div');
  item.className = 'child-item';
  item.dataset.childId = childCount;

  const select = document.createElement('select');
  select.id = id;
  select.name = id;
  select.setAttribute('aria-label', '子どもの年齢区分 ' + childCount);
  select.innerHTML = `
    <option value="0">16歳未満（控除なし）</option>
    <option value="33">16〜18歳（一般扶養: 33万円）</option>
    <option value="63">19〜22歳（特定扶養: 63万円）</option>
    <option value="38">23歳以上（一般扶養: 38万円）</option>
  `;

  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'btn-remove-child';
  removeBtn.setAttribute('aria-label', '子どもを削除');
  removeBtn.innerHTML = '<i class="bi bi-x-lg" aria-hidden="true"></i>';
  removeBtn.addEventListener('click', function() {
    item.remove();
  });

  item.appendChild(select);
  item.appendChild(removeBtn);
  list.appendChild(item);
});

// --- 給与所得控除の計算 ---
function calcEmploymentDeduction(income) {
  // income: 万円
  if (income <= 162.5) return 55;
  if (income <= 180)   return income * 0.40 - 10;
  if (income <= 360)   return income * 0.30 + 8;
  if (income <= 660)   return income * 0.20 + 44;
  if (income <= 850)   return income * 0.10 + 110;
  return 195;
}

// --- 所得税率の計算 ---
function calcIncomeTaxRate(taxableIncome) {
  // taxableIncome: 万円
  if (taxableIncome <= 195)  return 0.05;
  if (taxableIncome <= 330)  return 0.10;
  if (taxableIncome <= 695)  return 0.20;
  if (taxableIncome <= 900)  return 0.23;
  if (taxableIncome <= 1800) return 0.33;
  return 0.40;
}

// --- 調整控除の計算（住民税用） ---
function calcAdjustmentDeduction(taxableIncome) {
  // taxableIncome: 万円（課税所得）
  // 合計所得金額 2,500万円以下の場合（簡易版）
  if (taxableIncome <= 200) {
    // 人的控除の差 × 5% (簡易版: 2,500円固定とする)
    return 0.25; // 2,500円 = 0.25万円
  }
  return 0.25;
}

// --- 扶養控除合計の計算 ---
function calcDependentDeduction() {
  const items = document.querySelectorAll('#children-list .child-item select');
  let total = 0;
  items.forEach(function(sel) {
    total += parseInt(sel.value, 10) || 0;
  });
  return total;
}

// --- メイン計算 ---
function calculate() {
  const income        = parseFloat(document.getElementById('income').value) || 0;
  const hasSpouse     = document.getElementById('has-spouse').checked;
  const loanDeduction = parseFloat(document.getElementById('loan-deduction').value) || 0;
  const medicalDeduction = parseFloat(document.getElementById('medical-deduction').value) || 0;
  const idecoMonthly  = parseFloat(document.getElementById('ideco').value) || 0;

  // --- 給与所得控除 ---
  const employmentDeduction = calcEmploymentDeduction(income);

  // --- 各種控除 ---
  const basicDeduction   = 48;     // 基礎控除
  const spouseDeduction  = hasSpouse ? 38 : 0;
  const dependentDeduction = calcDependentDeduction();
  const idecoAnnual      = idecoMonthly * 12;

  // --- 課税所得（所得税用） ---
  const taxableIncomeIT = Math.max(0,
    income
    - employmentDeduction
    - basicDeduction
    - spouseDeduction
    - dependentDeduction
    - medicalDeduction
    - idecoAnnual
  );

  // --- 所得税率 ---
  const incomeTaxRate = calcIncomeTaxRate(taxableIncomeIT);

  // --- 住民税用課税所得 ---
  // 住民税の基礎控除は43万円
  const basicDeductionRT = 43;
  const taxableIncomeRT = Math.max(0,
    income
    - employmentDeduction
    - basicDeductionRT
    - spouseDeduction
    - dependentDeduction
    - medicalDeduction
    - idecoAnnual
  );

  // --- 住民税所得割額（調整控除・住宅ローン控除適用前） ---
  const adjustmentDeduction = calcAdjustmentDeduction(taxableIncomeRT);
  let residenceTax = Math.max(0, taxableIncomeRT * 0.10 - adjustmentDeduction);

  // --- 住宅ローン控除を住民税から差し引く ---
  residenceTax = Math.max(0, residenceTax - loanDeduction);

  // --- ふるさと納税 控除上限額 ---
  // 上限額 = (住民税所得割額 × 0.2) ÷ (1 - 所得税率 × 1.021 - 0.1) + 0.2（2,000円 = 0.2万円）
  const denominator = 1 - incomeTaxRate * 1.021 - 0.1;
  let furusatoLimit = 0;
  if (denominator > 0 && residenceTax > 0) {
    furusatoLimit = (residenceTax * 0.2) / denominator + 0.2;
  }

  // 0以下の場合は0
  furusatoLimit = Math.max(0, furusatoLimit);

  return {
    income,
    employmentDeduction,
    taxableIncomeIT,
    taxableIncomeRT,
    incomeTaxRate,
    residenceTax,
    furusatoLimit,
    spouseDeduction,
    dependentDeduction,
    idecoAnnual,
    medicalDeduction,
    loanDeduction,
  };
}

// --- 数値フォーマット ---
function formatYen(manYen) {
  const yen = Math.round(manYen * 10000);
  return yen.toLocaleString('ja-JP') + '円';
}

function formatManYen(manYen) {
  const rounded = Math.round(manYen * 10) / 10;
  return rounded.toLocaleString('ja-JP') + '万円';
}

// --- チャート ---
let chartInstance = null;

function renderChart(data) {
  const ctx = document.getElementById('breakdown-chart').getContext('2d');

  // 推計社会保険料（年収の約14%として簡易計算）
  const socialInsurance = data.income * 0.14;

  // 所得税（簡易）
  let incomeTaxAmount = 0;
  const ti = data.taxableIncomeIT;
  if (ti > 0) {
    // 超過累進課税の概算（速算表）
    const brackets = [
      { limit: 195,  rate: 0.05, deduct: 0 },
      { limit: 330,  rate: 0.10, deduct: 9.75 },
      { limit: 695,  rate: 0.20, deduct: 42.75 },
      { limit: 900,  rate: 0.23, deduct: 63.60 },
      { limit: 1800, rate: 0.33, deduct: 153.60 },
      { limit: Infinity, rate: 0.40, deduct: 279.60 },
    ];
    for (let i = 0; i < brackets.length; i++) {
      if (ti <= brackets[i].limit) {
        incomeTaxAmount = ti * brackets[i].rate - brackets[i].deduct;
        break;
      }
    }
    incomeTaxAmount = Math.max(0, incomeTaxAmount) * 1.021; // 復興特別所得税
  }

  // 住民税
  const residenceTaxAmount = data.residenceTax;

  // 手取り推計
  const netIncome = Math.max(0,
    data.income - socialInsurance - incomeTaxAmount - residenceTaxAmount
  );

  const chartData = {
    labels: ['手取り（推計）', '社会保険料（推計）', '所得税（推計）', '住民税（推計）'],
    datasets: [{
      data: [
        Math.max(0, netIncome),
        Math.max(0, socialInsurance),
        Math.max(0, incomeTaxAmount),
        Math.max(0, residenceTaxAmount),
      ],
      backgroundColor: ['#059669', '#34d399', '#f59e0b', '#fb923c'],
      borderWidth: 2,
      borderColor: '#fff',
    }],
  };

  if (chartInstance) {
    chartInstance.destroy();
  }

  chartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: chartData,
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(context) {
              const val = context.parsed;
              return ' ' + Math.round(val * 10) / 10 + '万円';
            },
          },
        },
      },
      cutout: '60%',
    },
  });

  // カスタム凡例
  const legendEl = document.getElementById('chart-legend');
  const colors = ['#059669', '#34d399', '#f59e0b', '#fb923c'];
  legendEl.innerHTML = chartData.labels.map(function(label, i) {
    const val = chartData.datasets[0].data[i];
    return `<div class="legend-item">
      <span class="legend-dot" style="background:${colors[i]}"></span>
      ${label}: <strong>${Math.round(val * 10) / 10}万円</strong>
    </div>`;
  }).join('');
}

// --- 結果表示 ---
function showResult(data) {
  const section = document.getElementById('result-section');
  const limitValue = document.getElementById('limit-value');
  const limitValueMan = document.getElementById('limit-value-man');
  const giftAmount = document.getElementById('gift-amount');
  const detailsEl = document.getElementById('result-details');

  const limitYen = Math.round(data.furusatoLimit * 10000);
  const limitManYen = Math.round(data.furusatoLimit * 10) / 10;

  limitValue.textContent = limitYen.toLocaleString('ja-JP') + '円';
  limitValueMan.textContent = '（約 ' + limitManYen + ' 万円）';
  giftAmount.textContent = limitYen.toLocaleString('ja-JP') + '円';

  // 内訳詳細
  detailsEl.innerHTML = `
    <div class="detail-item">
      <div class="detail-label">課税所得（所得税用）</div>
      <div class="detail-value">${Math.round(data.taxableIncomeIT)}万円</div>
    </div>
    <div class="detail-item">
      <div class="detail-label">住民税所得割額（推計）</div>
      <div class="detail-value">${Math.round(data.residenceTax * 10) / 10}万円</div>
    </div>
    <div class="detail-item">
      <div class="detail-label">適用所得税率</div>
      <div class="detail-value">${Math.round(data.incomeTaxRate * 100)}%</div>
    </div>
    <div class="detail-item">
      <div class="detail-label">給与所得控除</div>
      <div class="detail-value">${Math.round(data.employmentDeduction)}万円</div>
    </div>
    <div class="detail-item">
      <div class="detail-label">配偶者控除</div>
      <div class="detail-value">${data.spouseDeduction}万円</div>
    </div>
    <div class="detail-item">
      <div class="detail-label">扶養控除合計</div>
      <div class="detail-value">${data.dependentDeduction}万円</div>
    </div>
  `;

  section.style.display = 'block';
  section.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  renderChart(data);
}

// --- バリデーション ---
function validate() {
  const income = parseFloat(document.getElementById('income').value);
  if (!income || income < 100 || income > 10000) {
    alert('年収は100万円〜10,000万円の範囲で入力してください。');
    document.getElementById('income').focus();
    return false;
  }
  return true;
}

// --- フォーム送信 ---
document.getElementById('tool-form').addEventListener('submit', function(e) {
  e.preventDefault();
  if (!validate()) return;

  const data = calculate();
  showResult(data);

  // GA4イベント送信
  if (typeof gtag === 'function') {
    gtag('event', 'calculate', {
      event_category: 'furusato_simulator',
      event_label: 'income_' + Math.round(parseFloat(document.getElementById('income').value) / 100) * 100,
    });
  }
});

// --- AdSense 初期化（広告ユニットが表示されている場合） ---
document.addEventListener('DOMContentLoaded', function() {
  if (window.adsbygoogle) {
    try {
      (adsbygoogle = window.adsbygoogle || []).push({});
      (adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      // AdSense未承認の場合はエラーを無視
    }
  }
});
