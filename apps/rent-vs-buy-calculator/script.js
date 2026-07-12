'use strict';

/* ============================================================
   定数
   ============================================================ */
const YEARS = 35;
const MOVING_COST_MAN = 20;           // 引越し1回あたり（万円）
const RENT_INSURANCE_PER_2Y = 1;      // 賃貸火災保険2年ごと（万円）
const BUY_INSURANCE_PER_5Y = 5;       // 持ち家火災・地震保険5年ごと（万円）
const PROPERTY_TAX_RATE = 0.014;      // 固定資産税率
const ASSESSED_RATIO = 0.70;          // 評価額 / 購入価格
const HOUSE_REPAIR_COST = 150;        // 一戸建て大規模修繕（万円）、15年・30年目

/* ============================================================
   状態
   ============================================================ */
let propertyType = 'mansion'; // 'mansion' | 'house'
let costChart = null;

/* ============================================================
   DOM参照
   ============================================================ */
const calcBtn        = document.getElementById('calc-btn');
const resultsArea    = document.getElementById('results');
const verdictBanner  = document.getElementById('verdict-banner');
const verdictIcon    = document.getElementById('verdict-icon');
const verdictTitle   = document.getElementById('verdict-title');
const verdictDesc    = document.getElementById('verdict-desc');
const kpiRentTotal   = document.getElementById('kpi-rent-total');
const kpiBuyTotal    = document.getElementById('kpi-buy-total');
const kpiDiff        = document.getElementById('kpi-diff');
const breakevenYear  = document.getElementById('breakeven-year');
const breakevenNote  = document.getElementById('breakeven-note');
const rentBreakdown  = document.getElementById('rent-breakdown');
const buyBreakdown   = document.getElementById('buy-breakdown');
const fieldMansionFee = document.getElementById('field-mansion-fee');
const btnMansion     = document.getElementById('btn-mansion');
const btnHouse       = document.getElementById('btn-house');

/* ============================================================
   物件種別トグル
   ============================================================ */
function setPropertyType(type) {
  propertyType = type;
  if (type === 'mansion') {
    btnMansion.classList.add('active');
    btnHouse.classList.remove('active');
    fieldMansionFee.style.display = '';
  } else {
    btnHouse.classList.add('active');
    btnMansion.classList.remove('active');
    fieldMansionFee.style.display = 'none';
  }
}

btnMansion.addEventListener('click', () => setPropertyType('mansion'));
btnHouse.addEventListener('click',   () => setPropertyType('house'));

/* ============================================================
   入力値取得
   ============================================================ */
function getNum(id, fallback = 0) {
  const v = parseFloat(document.getElementById(id).value);
  return isNaN(v) ? fallback : v;
}

/* ============================================================
   元利均等返済 月額計算
   - loanMan: ローン元金（万円）
   - annualRate: 年利（%）
   - termYears: 返済年数
   ============================================================ */
function calcMonthlyPayment(loanMan, annualRate, termYears) {
  if (loanMan <= 0 || termYears <= 0) return 0;
  const r = annualRate / 100 / 12;
  const n = termYears * 12;
  if (r === 0) return loanMan / termYears / 12;  // 金利0%
  const payment = loanMan * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
  return payment; // 万円/月
}

/* ============================================================
   賃貸 年別累積コスト配列を生成（万円）
   ============================================================ */
function calcRentCumulative(params) {
  const {
    monthlyRent,   // 万円/月
    renewalMonths, // ヶ月分
    movingCount,   // 回
    inflationRate  // % / 年
  } = params;

  const data = [];
  let cumulative = 0;

  // 初期費用（敷金・礼金・最初の引越し）: 引越し代は全体の回数に含む
  // 更新料の初回は2年目に発生

  for (let y = 1; y <= YEARS; y++) {
    // その年の家賃（インフレ適用）: y年目の家賃 = 初年度家賃 × (1+rate)^(y-1)
    const yearlyRent = monthlyRent * 12 * Math.pow(1 + inflationRate / 100, y - 1);
    cumulative += yearlyRent;

    // 更新料（2年ごと: 2, 4, 6, ... 年目）
    if (y % 2 === 0 && y <= YEARS) {
      const currentRent = monthlyRent * Math.pow(1 + inflationRate / 100, y - 1);
      cumulative += renewalMonths * currentRent;
    }

    // 火災保険（2年ごと）
    if (y % 2 === 0) {
      cumulative += RENT_INSURANCE_PER_2Y;
    }

    data.push(Math.round(cumulative));
  }

  // 引越し費用を均等に分散（実際はランダムだが、ここでは年別加算を後処理）
  // → 累積配列の各ポイントに引越し費用を加算（最終値に追加してからプロポーション計算）
  const movingTotal = movingCount * MOVING_COST_MAN;
  // 引越しを均等年間隔で分散（1回目=0年目は入居時として計算に含む）
  // → 最終累積に乗せることで計算を簡略化
  const adjustedData = data.map(v => v + movingTotal * (data.indexOf(v) + 1) / YEARS);

  // より正確に: movingTotalを最終年の値に加算し、途中は線形補間
  return data.map((v, i) => Math.round(v + movingTotal * (i + 1) / YEARS));
}

/* ============================================================
   賃貸 35年コスト内訳（万円）
   ============================================================ */
function calcRentBreakdown(params) {
  const { monthlyRent, renewalMonths, movingCount, inflationRate } = params;

  // 家賃合計（インフレ込み）
  let rentTotal = 0;
  for (let y = 0; y < YEARS; y++) {
    rentTotal += monthlyRent * 12 * Math.pow(1 + inflationRate / 100, y);
  }

  // 更新料合計（2年ごと: 1〜17回）
  let renewalTotal = 0;
  for (let y = 2; y <= YEARS; y += 2) {
    const rent = monthlyRent * Math.pow(1 + inflationRate / 100, y - 1);
    renewalTotal += renewalMonths * rent;
  }

  const movingTotal     = movingCount * MOVING_COST_MAN;
  const insuranceTotal  = Math.floor(YEARS / 2) * RENT_INSURANCE_PER_2Y;

  return {
    rentTotal:     Math.round(rentTotal),
    renewalTotal:  Math.round(renewalTotal),
    movingTotal,
    insuranceTotal,
    grandTotal: Math.round(rentTotal + renewalTotal + movingTotal + insuranceTotal)
  };
}

/* ============================================================
   購入 年別累積コスト配列を生成（万円）
   ============================================================ */
function calcBuyCumulative(params) {
  const {
    price,        // 購入価格（万円）
    downpayment,  // 頭金（万円）
    annualRate,   // 金利（%/年）
    termYears,    // 返済期間（年）
    mansionFee,   // 月額管理費・積立金（万円）
    residual      // 35年後残価（万円）
  } = params;

  const loanAmount   = price - downpayment;
  const monthlyPayment = calcMonthlyPayment(loanAmount, annualRate, termYears);
  const yearlyPropertyTax = price * ASSESSED_RATIO * PROPERTY_TAX_RATE;

  // 初期費用（頭金 + 仲介手数料・諸費用 + 引越し）
  const initialCost = downpayment
    + (price * 0.03 + 6) // 仲介手数料: 3%+6万円
    + MOVING_COST_MAN;

  const data = [];
  let cumulative = initialCost;

  for (let y = 1; y <= YEARS; y++) {
    // ローン返済（返済期間内のみ）
    if (y <= termYears) {
      cumulative += monthlyPayment * 12;
    }

    // 固定資産税
    cumulative += yearlyPropertyTax;

    // 管理費・修繕積立金（マンション）
    if (propertyType === 'mansion') {
      cumulative += mansionFee * 12;
    }

    // 一戸建て大規模修繕（15年・30年目）
    if (propertyType === 'house' && (y === 15 || y === 30)) {
      cumulative += HOUSE_REPAIR_COST;
    }

    // 火災・地震保険（5年ごと）
    if (y % 5 === 0) {
      cumulative += BUY_INSURANCE_PER_5Y;
    }

    data.push(Math.round(cumulative));
  }

  // 35年後の売却益（残価）を最終年から差し引く
  if (residual > 0) {
    data[YEARS - 1] = Math.round(data[YEARS - 1] - residual);
  }

  return data;
}

/* ============================================================
   購入 35年コスト内訳（万円）
   ============================================================ */
function calcBuyBreakdown(params) {
  const { price, downpayment, annualRate, termYears, mansionFee, residual } = params;

  const loanAmount     = price - downpayment;
  const monthlyPayment = calcMonthlyPayment(loanAmount, annualRate, termYears);
  const loanTotal      = monthlyPayment * 12 * termYears;
  const propertyTaxTotal = price * ASSESSED_RATIO * PROPERTY_TAX_RATE * YEARS;
  const mansionFeeTotal  = propertyType === 'mansion' ? mansionFee * 12 * YEARS : 0;
  const houseRepairTotal = propertyType === 'house' ? HOUSE_REPAIR_COST * 2 : 0;
  const insuranceTotal   = Math.floor(YEARS / 5) * BUY_INSURANCE_PER_5Y;
  const initialFees      = price * 0.03 + 6; // 仲介手数料
  const movingCost       = MOVING_COST_MAN;

  const grossTotal = downpayment + loanTotal + propertyTaxTotal + mansionFeeTotal
                   + houseRepairTotal + insuranceTotal + initialFees + movingCost;
  const netTotal = grossTotal - residual;

  return {
    downpayment,
    loanTotal:       Math.round(loanTotal),
    propertyTaxTotal: Math.round(propertyTaxTotal),
    mansionFeeTotal: Math.round(mansionFeeTotal),
    houseRepairTotal,
    insuranceTotal,
    initialFees:     Math.round(initialFees),
    movingCost,
    residual,
    grossTotal:      Math.round(grossTotal),
    netTotal:        Math.round(netTotal)
  };
}

/* ============================================================
   損益分岐点を求める（賃貸 < 購入 になる最後の年）
   ============================================================ */
function findBreakEven(rentData, buyData) {
  for (let i = 0; i < YEARS; i++) {
    if (buyData[i] < rentData[i]) {
      return i + 1; // 1-indexed year
    }
  }
  return null; // 35年間は賃貸が有利
}

/* ============================================================
   数値フォーマット
   ============================================================ */
function fmt(n) {
  return Math.abs(n).toLocaleString('ja-JP');
}

/* ============================================================
   テーブル行生成ヘルパー
   ============================================================ */
function tr(label, valueMan, highlight = false) {
  const row = document.createElement('tr');
  if (highlight) row.classList.add('total-row');
  row.innerHTML = `<td>${label}</td><td>${fmt(valueMan)} 万円</td>`;
  return row;
}

/* ============================================================
   グラフ描画 / 更新
   ============================================================ */
function renderChart(rentData, buyData) {
  const labels = Array.from({ length: YEARS }, (_, i) => `${i + 1}年`);

  const ctx = document.getElementById('cost-chart').getContext('2d');

  if (costChart) {
    costChart.destroy();
    costChart = null;
  }

  costChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: '賃貸',
          data: rentData,
          borderColor: '#f97316',
          backgroundColor: 'rgba(249,115,22,0.08)',
          borderWidth: 2.5,
          pointRadius: 0,
          pointHoverRadius: 5,
          tension: 0.3,
          fill: false
        },
        {
          label: '購入',
          data: buyData,
          borderColor: '#2563eb',
          backgroundColor: 'rgba(37,99,235,0.08)',
          borderWidth: 2.5,
          pointRadius: 0,
          pointHoverRadius: 5,
          tension: 0.3,
          fill: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y.toLocaleString('ja-JP')} 万円`
          }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(0,0,0,0.04)' },
          ticks: {
            maxTicksLimit: 8,
            font: { size: 11 }
          }
        },
        y: {
          grid: { color: 'rgba(0,0,0,0.04)' },
          ticks: {
            font: { size: 11 },
            callback: v => `${v.toLocaleString('ja-JP')}万`
          }
        }
      }
    }
  });
}

/* ============================================================
   バリデーション
   ============================================================ */
function validate() {
  const errors = [];
  if (getNum('rent-monthly') <= 0) errors.push('月額家賃を入力してください。');
  if (getNum('buy-price') <= 0)    errors.push('購入価格を入力してください。');
  const dp   = getNum('buy-downpayment');
  const pr   = getNum('buy-price');
  if (dp >= pr) errors.push('頭金は購入価格未満にしてください。');
  return errors;
}

/* ============================================================
   メイン計算・表示
   ============================================================ */
function calculate() {
  const errors = validate();
  if (errors.length > 0) {
    alert(errors.join('\n'));
    return;
  }

  // 入力値取得
  const rentParams = {
    monthlyRent:   getNum('rent-monthly') / 10000,          // → 万円
    renewalMonths: getNum('rent-renewal-months', 1),
    movingCount:   getNum('rent-moving-count', 3),
    inflationRate: getNum('rent-inflation', 0)
  };

  const buyParams = {
    price:        getNum('buy-price'),
    downpayment:  getNum('buy-downpayment', 0),
    annualRate:   getNum('buy-rate', 0.5),
    termYears:    getNum('buy-term', 35),
    mansionFee:   getNum('buy-mansion-fee', 25000) / 10000,  // → 万円
    residual:     getNum('buy-residual', 0)
  };

  // 累積コスト計算
  const rentData = calcRentCumulative(rentParams);
  const buyData  = calcBuyCumulative(buyParams);

  const rentTotal = rentData[YEARS - 1];
  const buyTotal  = buyData[YEARS - 1];
  const diff      = rentTotal - buyTotal; // 正=賃貸が高い, 負=購入が高い

  // KPIセット
  kpiRentTotal.textContent = fmt(rentTotal);
  kpiBuyTotal.textContent  = fmt(buyTotal);
  kpiDiff.textContent      = fmt(Math.abs(diff));

  // 判定バナー
  verdictBanner.className = 'verdict-banner';
  if (Math.abs(diff) < 50) {
    verdictBanner.classList.add('draw');
    verdictIcon.textContent  = '≈';
    verdictTitle.textContent = '35年間のトータルコストはほぼ同じです';
    verdictDesc.textContent  = '差額が50万円未満のため、コスト面では大差ありません。ライフスタイルや柔軟性で判断しましょう。';
  } else if (diff > 0) {
    verdictBanner.classList.add('buy-wins');
    verdictIcon.textContent  = '🏠';
    verdictTitle.textContent = `購入の方が ${fmt(diff)} 万円お得です`;
    verdictDesc.textContent  = '35年間の累積コストは購入の方が低い結果となりました。';
  } else {
    verdictBanner.classList.add('rent-wins');
    verdictIcon.textContent  = '🔑';
    verdictTitle.textContent = `賃貸の方が ${fmt(Math.abs(diff))} 万円お得です`;
    verdictDesc.textContent  = '35年間の累積コストは賃貸の方が低い結果となりました。';
  }

  // 損益分岐点
  const beYear = findBreakEven(rentData, buyData);
  if (beYear) {
    breakevenYear.textContent = `${beYear} 年目`;
    breakevenNote.textContent = `${beYear}年目以降は購入の累積コストが賃貸を下回ります。`;
  } else {
    breakevenYear.textContent = '35年以内なし';
    breakevenNote.textContent = '今回の条件では35年間、賃貸のコストが購入を上回ることはありませんでした。';
  }

  // 内訳テーブル: 賃貸
  const rd = calcRentBreakdown(rentParams);
  rentBreakdown.innerHTML = '';
  rentBreakdown.appendChild(tr('家賃合計', rd.rentTotal));
  rentBreakdown.appendChild(tr('更新料合計', rd.renewalTotal));
  rentBreakdown.appendChild(tr('引越し費用', rd.movingTotal));
  rentBreakdown.appendChild(tr('火災保険料', rd.insuranceTotal));
  rentBreakdown.appendChild(tr('35年間合計', rd.grandTotal, true));

  // 内訳テーブル: 購入
  const bd = calcBuyBreakdown(buyParams);
  buyBreakdown.innerHTML = '';
  buyBreakdown.appendChild(tr('頭金', bd.downpayment));
  buyBreakdown.appendChild(tr('ローン総返済額', bd.loanTotal));
  buyBreakdown.appendChild(tr('固定資産税', bd.propertyTaxTotal));
  if (propertyType === 'mansion') {
    buyBreakdown.appendChild(tr('管理費・修繕積立金', bd.mansionFeeTotal));
  } else {
    buyBreakdown.appendChild(tr('大規模修繕費', bd.houseRepairTotal));
  }
  buyBreakdown.appendChild(tr('火災・地震保険', bd.insuranceTotal));
  buyBreakdown.appendChild(tr('仲介手数料・諸費用', bd.initialFees));
  buyBreakdown.appendChild(tr('引越し費用', bd.movingCost));
  if (bd.residual > 0) {
    buyBreakdown.appendChild(tr('売却益（35年後）', -bd.residual));
  }
  buyBreakdown.appendChild(tr('35年間合計', bd.netTotal, true));

  // グラフ描画
  renderChart(rentData, buyData);

  // 結果表示
  resultsArea.hidden = false;
  resultsArea.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // AdSense 広告レンダリング
  try {
    (window.adsbygoogle = window.adsbygoogle || []).push({});
  } catch (e) { /* ignore */ }
}

/* ============================================================
   イベント
   ============================================================ */
calcBtn.addEventListener('click', calculate);

// Enterキーでも計算
document.querySelectorAll('.form-input').forEach(input => {
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') calculate();
  });
});
