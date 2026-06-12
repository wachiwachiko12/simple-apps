/**
 * 住宅ローン繰上返済シミュレーター
 * 元利均等返済方式
 */

'use strict';

// ========== DOM要素取得 ==========
const inputs = {
  balance: document.getElementById('balance'),
  years:   document.getElementById('years'),
  rate:    document.getElementById('rate'),
  prepay:  document.getElementById('prepay'),
};

const errorMsg = document.getElementById('error-msg');

// 比較カード
const shortcutSaving = document.getElementById('shortcut-saving');
const shortcutPeriod = document.getElementById('shortcut-period');
const shortcutStars  = document.getElementById('shortcut-stars');
const reduceSaving   = document.getElementById('reduce-saving');
const reduceMonthly  = document.getElementById('reduce-monthly');
const reduceStars    = document.getElementById('reduce-stars');
const recommendBadge = document.getElementById('recommend-badge');

// 詳細テーブル
const tMonthlyBase      = document.getElementById('t-monthly-base');
const tMonthlyShortcut  = document.getElementById('t-monthly-shortcut');
const tMonthlyReduce    = document.getElementById('t-monthly-reduce');
const tTotalBase        = document.getElementById('t-total-base');
const tTotalShortcut    = document.getElementById('t-total-shortcut');
const tTotalReduce      = document.getElementById('t-total-reduce');
const tInterestBase     = document.getElementById('t-interest-base');
const tInterestShortcut = document.getElementById('t-interest-shortcut');
const tInterestReduce   = document.getElementById('t-interest-reduce');
const tFinishBase       = document.getElementById('t-finish-base');
const tFinishShortcut   = document.getElementById('t-finish-shortcut');
const tFinishReduce     = document.getElementById('t-finish-reduce');

// グラフ
let chartInstance = null;

// ========== ユーティリティ ==========

/**
 * 数値を万円表記にフォーマット
 * @param {number} yen - 円単位
 * @returns {string}
 */
function formatMan(yen) {
  const man = yen / 10000;
  if (man >= 10000) {
    return (man / 10000).toFixed(2) + '億円';
  }
  if (man >= 1) {
    return man.toFixed(1) + '万円';
  }
  return Math.round(yen).toLocaleString() + '円';
}

/**
 * 円単位を「XXX万円」表記
 */
function formatManShort(yen) {
  const man = yen / 10000;
  return man.toFixed(1) + '万円';
}

/**
 * 月返済額を「XX,XXX円」表記
 */
function formatMonthly(yen) {
  return Math.round(yen).toLocaleString() + '円';
}

/**
 * 月数を「XX年YYヶ月」に変換
 * @param {number} months
 * @returns {string}
 */
function monthsToStr(months) {
  const m = Math.round(months);
  const y = Math.floor(m / 12);
  const mo = m % 12;
  if (y === 0) return mo + 'ヶ月';
  if (mo === 0) return y + '年';
  return y + '年' + mo + 'ヶ月';
}

/**
 * 現在から monthsLater ヶ月後の年月を返す
 * @param {number} monthsLater
 * @returns {string} "YYYY年MM月"
 */
function finishDate(monthsLater) {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() + Math.round(monthsLater), 1);
  return d.getFullYear() + '年' + (d.getMonth() + 1) + '月';
}

/**
 * 星評価HTML生成（1〜5）
 */
function starsHTML(n) {
  const filled = '★'.repeat(n);
  const empty  = '☆'.repeat(5 - n);
  return '<span style="color:#f59e0b">' + filled + '</span>'
       + '<span style="color:#d1d5db">' + empty + '</span>';
}

// ========== 計算ロジック ==========

/**
 * 月返済額を計算（元利均等）
 * @param {number} principal - 元本（円）
 * @param {number} monthlyRate - 月利（小数）
 * @param {number} months - 返済期間（月）
 * @returns {number} 月返済額（円）
 */
function calcMonthlyPayment(principal, monthlyRate, months) {
  if (monthlyRate === 0) return principal / months;
  const r = monthlyRate;
  const n = months;
  return principal * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
}

/**
 * 期間短縮型の新残期間を逆算
 * 月返済額 = 残高 × r × (1+r)^n / ((1+r)^n - 1)
 * を n について解く:
 * n = -log(1 - r×残高/月返済額) / log(1+r)
 * @param {number} newBalance - 繰上返済後残高（円）
 * @param {number} monthlyRate - 月利
 * @param {number} monthlyPayment - 現在の月返済額
 * @returns {number} 新残期間（月）
 */
function calcNewPeriodMonths(newBalance, monthlyRate, monthlyPayment) {
  if (monthlyRate === 0) return newBalance / monthlyPayment;
  const r = monthlyRate;
  const P = newBalance;
  const M = monthlyPayment;
  // 繰上返済額 >= 残高 の場合
  if (P <= 0) return 0;
  // M <= r×P の場合（月利だけで返済不能）
  const rP = r * P;
  if (M <= rP) return Infinity;
  const n = -Math.log(1 - rP / M) / Math.log(1 + r);
  return n;
}

/**
 * メイン計算
 * @returns {object|null} 計算結果、バリデーションエラー時は null
 */
function calculate() {
  const balance = parseFloat(inputs.balance.value) * 10000; // 円換算
  const years   = parseFloat(inputs.years.value);
  const rate    = parseFloat(inputs.rate.value);
  const prepay  = parseFloat(inputs.prepay.value) * 10000;  // 円換算

  // バリデーション
  const errors = [];
  if (isNaN(balance) || balance <= 0) errors.push('借入残高は正の数を入力してください。');
  if (isNaN(years)   || years < 1 || years > 50) errors.push('返済期間は1〜50年で入力してください。');
  if (isNaN(rate)    || rate <= 0 || rate > 20)  errors.push('年利は0より大きく20以下の値を入力してください。');
  if (isNaN(prepay)  || prepay <= 0) errors.push('繰上返済額は正の数を入力してください。');
  if (!isNaN(prepay) && !isNaN(balance) && prepay >= balance) {
    errors.push('繰上返済額は借入残高未満にしてください。');
  }

  if (errors.length > 0) {
    errorMsg.textContent = errors[0];
    errorMsg.classList.add('visible');
    return null;
  }
  errorMsg.classList.remove('visible');
  errorMsg.textContent = '';

  const monthlyRate = rate / 12 / 100;
  const totalMonths = Math.round(years * 12);

  // ----- 繰上なし -----
  const baseMonthly   = calcMonthlyPayment(balance, monthlyRate, totalMonths);
  const baseTotalPay  = baseMonthly * totalMonths;
  const baseInterest  = baseTotalPay - balance;

  // ----- 期間短縮型 -----
  const newBalanceShortcut = balance - prepay;
  const newMonths = calcNewPeriodMonths(newBalanceShortcut, monthlyRate, baseMonthly);
  const shortcutMonths = Math.ceil(newMonths); // 端月繰り上げ
  const shortcutTotalPay = baseMonthly * shortcutMonths + newBalanceShortcut - newBalanceShortcut;

  // 正確な総支払: 月返済額×新期間（最終月の端数調整は省略した試算値）
  const shortcutTotalPayExact = baseMonthly * shortcutMonths + prepay; // 繰上返済額も加算
  const shortcutInterest = shortcutTotalPayExact - balance;
  const shortcutSavedInterest = baseInterest - shortcutInterest;
  const shortcutReducedMonths = totalMonths - shortcutMonths;

  // ----- 返済額軽減型 -----
  const newBalanceReduce = balance - prepay;
  const reduceMonthlyPayment = calcMonthlyPayment(newBalanceReduce, monthlyRate, totalMonths);
  const reduceTotalPay = reduceMonthlyPayment * totalMonths + prepay; // 繰上返済額も加算
  const reduceInterest = reduceTotalPay - balance;
  const reduceSavedInterest = baseInterest - reduceInterest;
  const reduceMonthlyDiff = baseMonthly - reduceMonthlyPayment;

  return {
    // 繰上なし
    baseMonthly,
    baseTotalPay,
    baseInterest,
    totalMonths,
    // 期間短縮
    shortcutMonths,
    shortcutTotalPay: shortcutTotalPayExact,
    shortcutInterest,
    shortcutSavedInterest,
    shortcutReducedMonths,
    baseMonthlyPayment: baseMonthly, // 変わらず
    // 返済額軽減
    reduceMonthlyPayment,
    reduceTotalPay,
    reduceInterest,
    reduceSavedInterest,
    reduceMonthlyDiff,
  };
}

// ========== UI更新 ==========

function updateUI(r) {
  if (!r) return;

  // おすすめバッジ
  if (r.shortcutSavedInterest > r.reduceSavedInterest) {
    recommendBadge.innerHTML = '<i class="bi bi-trophy-fill"></i> 期間短縮型がおすすめ（利息削減 ' + formatManShort(r.shortcutSavedInterest) + ' お得）';
    recommendBadge.className = 'recommend-badge visible';
  } else {
    recommendBadge.innerHTML = '';
    recommendBadge.className = 'recommend-badge';
  }

  // ---- 比較カード: 期間短縮型 ----
  shortcutSaving.textContent = formatManShort(r.shortcutSavedInterest);
  if (r.shortcutReducedMonths > 0) {
    shortcutPeriod.textContent = monthsToStr(r.shortcutReducedMonths) + '短縮';
  } else {
    shortcutPeriod.textContent = '変化なし';
  }
  shortcutStars.innerHTML = starsHTML(5);

  // ---- 比較カード: 返済額軽減型 ----
  reduceSaving.textContent = formatManShort(r.reduceSavedInterest);
  reduceMonthly.textContent = '毎月 ' + formatMonthly(r.reduceMonthlyDiff) + '減';
  reduceStars.innerHTML = starsHTML(3);

  // ---- 詳細テーブル ----
  tMonthlyBase.textContent     = formatMonthly(r.baseMonthly);
  tMonthlyShortcut.textContent = '変わらず';
  tMonthlyReduce.textContent   = formatMonthly(r.reduceMonthlyPayment);

  tTotalBase.textContent     = formatManShort(r.baseTotalPay);
  tTotalShortcut.textContent = formatManShort(r.shortcutTotalPay);
  tTotalReduce.textContent   = formatManShort(r.reduceTotalPay);

  tInterestBase.textContent     = formatManShort(r.baseInterest);
  tInterestShortcut.textContent = formatManShort(r.shortcutInterest);
  tInterestReduce.textContent   = formatManShort(r.reduceInterest);

  tFinishBase.textContent     = finishDate(r.totalMonths);
  tFinishShortcut.textContent = finishDate(r.shortcutMonths);
  tFinishReduce.textContent   = finishDate(r.totalMonths); // 期間は変わらず

  // ---- グラフ更新 ----
  updateChart(r);
}

// ========== Chart.js ==========

function updateChart(r) {
  const ctx = document.getElementById('interestChart').getContext('2d');

  const baseInterestMan     = Math.round(r.baseInterest / 10000 * 10) / 10;
  const shortcutInterestMan = Math.round(r.shortcutInterest / 10000 * 10) / 10;
  const reduceInterestMan   = Math.round(r.reduceInterest / 10000 * 10) / 10;

  const data = {
    labels: ['繰上返済なし', '期間短縮型', '返済額軽減型'],
    datasets: [{
      label: '総利息（万円）',
      data: [baseInterestMan, shortcutInterestMan, reduceInterestMan],
      backgroundColor: [
        'rgba(239, 68, 68, 0.85)',
        'rgba(37, 99, 235, 0.85)',
        'rgba(5, 150, 105, 0.85)',
      ],
      borderColor: [
        'rgba(239, 68, 68, 1)',
        'rgba(37, 99, 235, 1)',
        'rgba(5, 150, 105, 1)',
      ],
      borderWidth: 1.5,
      borderRadius: 6,
    }]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: function(ctx) {
            return ' ' + ctx.parsed.y.toFixed(1) + ' 万円';
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          font: { size: 12 },
          callback: function(v) { return v + '万'; }
        },
        grid: {
          color: 'rgba(0,0,0,0.06)',
        }
      },
      x: {
        ticks: {
          font: { size: 12 },
        },
        grid: { display: false }
      }
    }
  };

  if (chartInstance) {
    chartInstance.data = data;
    chartInstance.options = options;
    chartInstance.update('none');
  } else {
    chartInstance = new Chart(ctx, { type: 'bar', data, options });
  }
}

// ========== イベントリスナー ==========

function onInputChange() {
  const result = calculate();
  if (result) {
    updateUI(result);
  }
}

Object.values(inputs).forEach(function(input) {
  input.addEventListener('input', onInputChange);
  input.addEventListener('change', onInputChange);
});

// ========== 初期計算 ==========
onInputChange();
