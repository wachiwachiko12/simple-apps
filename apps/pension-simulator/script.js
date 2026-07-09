/**
 * 老後の年金受取額シミュレーター
 * 計算ロジック: 国民年金（基礎年金）+ 厚生年金
 */

'use strict';

/* =============================================
   定数
   ============================================= */
const KOKUMIN_FULL_ANNUAL = 816000;      // 国民年金満額（2024年度） 年額
const KOKUMIN_FULL_MONTHS = 480;         // 満額加入月数（40年 × 12）
const KOSEI_RATE = 5.481 / 1000;         // 厚生年金乗率
const KOSEI_MAX_MONTHLY_SALARY = 650000; // 標準報酬月額の上限（円）

/** 受給開始年齢と調整率のマップ */
const AGE_RATE_MAP = {
  60: -0.24,
  61: -0.20,
  62: -0.16,
  63: -0.12,
  64: -0.08,
  65:  0.00,
  66:  0.084,
  67:  0.168,
  68:  0.252,
  69:  0.336,
  70:  0.42,
  71:  0.504,
  72:  0.588,
  73:  0.672,
  74:  0.756,
  75:  0.84,
};

/* =============================================
   DOM参照
   ============================================= */
const btnCompany    = document.getElementById('btn-company');
const btnSelf       = document.getElementById('btn-self');
const fieldKosei    = document.getElementById('field-kosei');
const incomeInput   = document.getElementById('income');
const koseiInput    = document.getElementById('kosei-years');
const kokuminInput  = document.getElementById('kokumin-years');
const expensesInput = document.getElementById('expenses');
const startAgeInput = document.getElementById('start-age');
const ageDisplay    = document.getElementById('age-display');
const ageBadge      = document.getElementById('age-badge');
const calcBtn       = document.getElementById('calc-btn');
const resultSection = document.getElementById('result-section');
const koseiResultCard = document.getElementById('kosei-result-card');

let employeeType = 'company'; // 'company' | 'self'
let pensionChart  = null;

/* =============================================
   職業種別トグル
   ============================================= */
function setEmployeeType(type) {
  employeeType = type;
  if (type === 'company') {
    btnCompany.classList.add('active');
    btnSelf.classList.remove('active');
    fieldKosei.classList.remove('hidden');
    koseiResultCard.classList.remove('hidden');
  } else {
    btnSelf.classList.add('active');
    btnCompany.classList.remove('active');
    fieldKosei.classList.add('hidden');
    koseiResultCard.classList.add('hidden');
  }
}

btnCompany.addEventListener('click', () => setEmployeeType('company'));
btnSelf.addEventListener('click', () => setEmployeeType('self'));

/* =============================================
   スライダー更新
   ============================================= */
function updateSlider(age) {
  ageDisplay.textContent = age;

  // バッジ・スタイル
  if (age < 65) {
    ageBadge.textContent = `繰上げ（${Math.abs(AGE_RATE_MAP[age] * 100).toFixed(0)}%減）`;
    ageBadge.className = 'age-badge earlyup';
  } else if (age === 65) {
    ageBadge.textContent = '標準';
    ageBadge.className = 'age-badge';
  } else {
    ageBadge.textContent = `繰下げ（+${(AGE_RATE_MAP[age] * 100).toFixed(1)}%増）`;
    ageBadge.className = 'age-badge lateup';
  }

  // グラデーション位置（60〜75 → 0〜100%）
  const pct = ((age - 60) / 15) * 100;
  startAgeInput.style.background =
    `linear-gradient(to right, var(--primary) 0%, var(--primary) ${pct}%, var(--border) ${pct}%, var(--border) 100%)`;
}

startAgeInput.addEventListener('input', () => updateSlider(Number(startAgeInput.value)));
updateSlider(65); // 初期値

/* =============================================
   計算ロジック
   ============================================= */
function calcPension(income, koseiYears, kokuminYears, startAge) {
  const rate = AGE_RATE_MAP[startAge] ?? 0;

  // 国民年金（基礎年金）
  const kokuminMonths = Math.min(kokuminYears * 12, KOKUMIN_FULL_MONTHS);
  const kokuminBase   = KOKUMIN_FULL_ANNUAL * (kokuminMonths / KOKUMIN_FULL_MONTHS);
  const kokuminAdjusted = kokuminBase * (1 + rate);

  // 厚生年金
  let koseiAdjusted = 0;
  if (employeeType === 'company') {
    const monthlyIncome  = Math.min((income * 10000) / 12, KOSEI_MAX_MONTHLY_SALARY);
    const koseiMonths    = koseiYears * 12;
    const koseiBase      = monthlyIncome * KOSEI_RATE * koseiMonths;
    koseiAdjusted        = koseiBase * (1 + rate);
  }

  const totalAnnual  = kokuminAdjusted + koseiAdjusted;
  const totalMonthly = totalAnnual / 12;

  return {
    kokuminMonthly: Math.round(kokuminAdjusted / 12),
    koseiMonthly:   Math.round(koseiAdjusted  / 12),
    totalMonthly:   Math.round(totalMonthly),
    totalAnnual:    Math.round(totalAnnual),
    rate,
  };
}

/* =============================================
   表示ヘルパー
   ============================================= */
function fmtYen(n) {
  return n.toLocaleString('ja-JP');
}

function fmtMan(n) {
  return (n / 10000).toFixed(1);
}

/* =============================================
   グラフ描画
   ============================================= */
function renderChart(monthlyIncome, monthlyExpense) {
  const labels = [];
  const incomeData  = [];
  const expenseData = [];

  for (let y = 1; y <= 30; y += 5) {
    labels.push(`${y}年目`);
    incomeData.push(Math.round(monthlyIncome * 12 * y / 10000));   // 万円
    expenseData.push(Math.round(monthlyExpense * 12 * y / 10000)); // 万円
  }

  if (pensionChart) {
    pensionChart.destroy();
    pensionChart = null;
  }

  const ctx = document.getElementById('pension-chart').getContext('2d');
  pensionChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: '年金累計収入（万円）',
          data: incomeData,
          backgroundColor: 'rgba(91, 33, 182, 0.75)',
          borderColor: 'rgba(91, 33, 182, 0.9)',
          borderWidth: 1.5,
          borderRadius: 6,
        },
        {
          label: '生活費累計（万円）',
          data: expenseData,
          backgroundColor: 'rgba(234, 88, 12, 0.65)',
          borderColor: 'rgba(234, 88, 12, 0.85)',
          borderWidth: 1.5,
          borderRadius: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: {
            font: { size: 12, family: "'BIZ UDPGothic', sans-serif" },
            padding: 16,
            usePointStyle: true,
            pointStyle: 'rectRounded',
          },
        },
        tooltip: {
          callbacks: {
            label(context) {
              return ` ${context.dataset.label}: ${context.parsed.y.toLocaleString()} 万円`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { font: { size: 11 } },
        },
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(0,0,0,0.05)' },
          ticks: {
            font: { size: 11 },
            callback(v) { return `${v}万`; },
          },
        },
      },
    },
  });
}

/* =============================================
   収支情報の表示
   ============================================= */
function renderCashflow(monthlyIncome, monthlyExpense) {
  const diff = monthlyIncome - monthlyExpense;

  document.getElementById('cf-income').textContent  = `${fmtYen(monthlyIncome)}円`;
  document.getElementById('cf-expense').textContent = `${fmtYen(monthlyExpense)}円`;
  document.getElementById('cf-diff').textContent    = `${diff >= 0 ? '+' : ''}${fmtYen(diff)}円`;

  const resultItem = document.getElementById('cashflow-result-item');
  const shortageEl = document.getElementById('shortage-info');

  if (diff >= 0) {
    resultItem.classList.add('surplus');
    resultItem.classList.remove('deficit');
    shortageEl.className = 'shortage-info surplus-info show';
    shortageEl.innerHTML = `<i class="bi bi-check-circle"></i> 月間収支はプラスです。年金だけで生活費を賄える見込みです（月 +${fmtYen(diff)}円）。`;
  } else {
    resultItem.classList.add('deficit');
    resultItem.classList.remove('surplus');
    const shortage30y = Math.abs(diff) * 12 * 30;
    shortageEl.className = 'shortage-info deficit-info show';
    shortageEl.innerHTML =
      `<i class="bi bi-exclamation-triangle"></i> ` +
      `月${fmtYen(Math.abs(diff))}円の不足が生じます。` +
      `老後30年間では <strong>約${Math.round(shortage30y / 10000).toLocaleString()}万円</strong> の貯蓄取り崩しが必要な計算です。`;
  }
}

/* =============================================
   計算ボタン
   ============================================= */
calcBtn.addEventListener('click', () => {
  const income       = Math.max(100, Math.min(3000, Number(incomeInput.value)   || 500));
  const koseiYears   = Math.max(1,   Math.min(45,   Number(koseiInput.value)    || 35));
  const kokuminYears = Math.max(1,   Math.min(40,   Number(kokuminInput.value)  || 40));
  const startAge     = Math.max(60,  Math.min(75,   Number(startAgeInput.value) || 65));
  const expenses     = Math.max(5,   Math.min(100,  Number(expensesInput.value) || 25));

  const result = calcPension(income, koseiYears, kokuminYears, startAge);

  // メイン結果
  document.getElementById('result-monthly').textContent = fmtYen(result.totalMonthly);
  document.getElementById('result-kokumin').textContent = fmtYen(result.kokuminMonthly);
  document.getElementById('result-kosei').textContent   = fmtYen(result.koseiMonthly);
  document.getElementById('result-annual').textContent  = fmtMan(result.totalAnnual);

  const ratePct = result.rate * 100;
  const rateSign = ratePct >= 0 ? '+' : '';
  document.getElementById('result-rate').textContent = `${rateSign}${ratePct.toFixed(1)}`;

  // 収支
  const monthlyExpense = expenses * 10000;
  renderCashflow(result.totalMonthly, monthlyExpense);

  // グラフ
  renderChart(result.totalMonthly, monthlyExpense);

  // 結果セクション表示
  resultSection.classList.remove('hidden');

  // スクロール
  setTimeout(() => {
    resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 80);

  // GA4 イベント
  if (typeof gtag === 'function') {
    gtag('event', 'calculate_pension', {
      employee_type: employeeType,
      income_man: income,
      start_age: startAge,
      monthly_result: result.totalMonthly,
    });
  }

  // AdSense 初期化（結果表示後）
  try {
    (adsbygoogle = window.adsbygoogle || []).push({});
  } catch (e) { /* noop */ }
});

/* =============================================
   アコーディオン
   ============================================= */
document.querySelectorAll('.accordion-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const expanded = btn.getAttribute('aria-expanded') === 'true';
    const contentId = btn.getAttribute('aria-controls');
    const content   = document.getElementById(contentId);

    btn.setAttribute('aria-expanded', String(!expanded));
    content.classList.toggle('hidden', expanded);
  });
});

/* =============================================
   AdSense 初期化（ページロード時・上部広告）
   ============================================= */
window.addEventListener('load', () => {
  try {
    (adsbygoogle = window.adsbygoogle || []).push({});
  } catch (e) { /* noop */ }
});
