'use strict';

/* ============================================================
   生命保険 必要保障額計算ツール — script.js
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  // --- DOM 参照 ---
  const form          = document.getElementById('insurance-form');
  const spouseSelect  = document.getElementById('spouse');
  const spouseField   = document.getElementById('spouse-income-field');
  const childrenSelect      = document.getElementById('children');
  const youngestAgeField    = document.getElementById('youngest-age-field');
  const housingTypeSelect   = document.getElementById('housingType');
  const loanField     = document.getElementById('loan-field');
  const rentField     = document.getElementById('rent-field');
  const resultSection = document.getElementById('result-section');

  // 結果表示
  const resultTotal       = document.getElementById('result-total');
  const bdLivingVal       = document.getElementById('bd-living-val');
  const bdHousingVal      = document.getElementById('bd-housing-val');
  const bdEducationVal    = document.getElementById('bd-education-val');
  const bdEmergencyVal    = document.getElementById('bd-emergency-val');
  const bdDeductionVal    = document.getElementById('bd-deduction-val');

  // Chart.js インスタンス
  let chartInstance = null;

  // ============================================================
  // 動的表示切替
  // ============================================================

  spouseSelect.addEventListener('change', () => {
    spouseField.style.display = spouseSelect.value === 'yes' ? '' : 'none';
  });

  childrenSelect.addEventListener('change', () => {
    const hasChildren = parseInt(childrenSelect.value, 10) > 0;
    youngestAgeField.style.display = hasChildren ? '' : 'none';
  });

  housingTypeSelect.addEventListener('change', () => {
    const type = housingTypeSelect.value;
    loanField.style.display = type === 'loan' ? '' : 'none';
    rentField.style.display = type === 'rent' ? '' : 'none';
  });

  // ============================================================
  // ユーティリティ
  // ============================================================

  /**
   * 数値を「1,234万円」形式に整形
   * @param {number} val — 万円単位
   * @returns {string}
   */
  function formatMan(val) {
    const rounded = Math.round(val);
    return rounded.toLocaleString('ja-JP') + ' 万円';
  }

  /**
   * 入力フィールドから数値を取得（空欄・NaN は 0 扱い）
   * @param {string} id
   * @returns {number}
   */
  function getNum(id) {
    const v = parseFloat(document.getElementById(id).value);
    return isNaN(v) || v < 0 ? 0 : v;
  }

  // ============================================================
  // 公的遺族年金の概算
  // ============================================================

  /**
   * 遺族年金の年間総額（万円）を概算で返す
   *  - 子あり配偶者: 遺族基礎年金 + 遺族厚生年金
   *  - 子なし配偶者: 遺族厚生年金のみ（中高齢寡婦加算込み）
   *  - 独身: 0
   *
   * 遺族厚生年金 ≈ 平均標準報酬月額 × 5.481/1000 × 加入月数 × 3/4
   * 簡易近似: 年収 × 約 0.14 (厚生年金加入25年相当)
   *
   * @param {number} income       — 年収（万円）
   * @param {boolean} hasSpouse
   * @param {number} childrenNum  — 子の人数
   * @param {number} yearsLeft    — 末子独立までの年数（生活費カバー期間と同じ）
   * @returns {number}            — 総受給額見込み（万円）
   */
  function estimateSurvivorPension(income, hasSpouse, childrenNum, yearsLeft) {
    if (!hasSpouse && childrenNum === 0) return 0;

    // 遺族厚生年金（年額概算）
    // 年収の約14%を遺族厚生年金として概算（300万以上で適用）
    const kouseiAnnual = Math.max(0, income * 0.14);

    // 遺族基礎年金（子あり配偶者のみ）
    // 2024年度: 基本816,000円 + 子の加算 234,800円/人
    let kissoAnnual = 0;
    if (hasSpouse && childrenNum > 0) {
      kissoAnnual = 81.6 + Math.min(childrenNum, 2) * 23.48 + Math.max(0, childrenNum - 2) * 7.82;
    }

    const annualTotal = kouseiAnnual + kissoAnnual;

    // 子ありの場合は末子独立（18歳）まで基礎年金、その後は厚生年金のみ
    // ここでは末子独立までの期間を yearsLeft で統一
    return annualTotal * yearsLeft;
  }

  // ============================================================
  // メイン計算ロジック
  // ============================================================

  function calculate() {
    // 入力値取得
    const income        = getNum('income');       // 万円/年
    const age           = getNum('age');           // 歳
    const hasSpouse     = spouseSelect.value === 'yes';
    const spouseIncome  = hasSpouse ? getNum('spouseIncome') : 0;
    const childrenNum   = parseInt(childrenSelect.value, 10) || 0;
    const youngestAge   = childrenNum > 0 ? getNum('youngestAge') : 0;
    const monthlyExp    = getNum('monthlyExpense'); // 万円/月
    const housingType   = housingTypeSelect.value;
    const loanBalance   = housingType === 'loan' ? getNum('loanBalance') : 0;
    const monthlyRent   = housingType === 'rent'  ? getNum('monthlyRent') : 0;
    const savings       = getNum('savings');       // 万円

    // -------- 1. 遺族の生活費 --------
    // 末子が22歳（独立）になるまでの年数。子なしは65歳-現在年齢（配偶者の余命想定）
    let yearsLeft;
    if (childrenNum > 0) {
      yearsLeft = Math.max(0, 22 - youngestAge);
    } else if (hasSpouse) {
      // 配偶者のみ: 平均余命75歳まで想定（シンプル近似）
      yearsLeft = Math.max(0, 75 - age);
    } else {
      yearsLeft = 0;
    }

    // 配偶者がいる場合は生活費から配偶者年収分を軽減
    const spouseMonthlyIncome = spouseIncome / 12;
    const netMonthlyExp = Math.max(0, monthlyExp - spouseMonthlyIncome * 0.7); // 70%カバー想定

    const livingCost = netMonthlyExp * 12 * yearsLeft;

    // -------- 2. 住居費 --------
    let housingCost = 0;
    if (housingType === 'loan') {
      housingCost = loanBalance;
    } else if (housingType === 'rent') {
      housingCost = monthlyRent * 12 * yearsLeft;
    } else {
      // 持ち家(ローンなし): 修繕・管理費を軽微に想定
      housingCost = 0;
    }

    // -------- 3. 教育費 --------
    const EDUCATION_PER_CHILD = 700; // 万円
    const educationCost = childrenNum * EDUCATION_PER_CHILD;

    // -------- 4. 緊急予備費 --------
    const emergencyCost = (income / 12) * 6;

    // -------- 5. 控除: 貯蓄 + 公的遺族年金 --------
    const survivorPension = estimateSurvivorPension(income, hasSpouse, childrenNum, yearsLeft);
    const totalDeduction  = savings + survivorPension;

    // -------- 合計 --------
    const grossTotal = livingCost + housingCost + educationCost + emergencyCost;
    const netTotal   = Math.max(0, grossTotal - totalDeduction);

    return {
      total:       netTotal,
      living:      livingCost,
      housing:     housingCost,
      education:   educationCost,
      emergency:   emergencyCost,
      deduction:   totalDeduction,
      savings,
      survivorPension
    };
  }

  // ============================================================
  // 円グラフ描画
  // ============================================================

  function drawChart(data) {
    const ctx = document.getElementById('breakdown-chart').getContext('2d');

    const labels = ['遺族の生活費', '住居費', '教育費', '緊急予備費'];
    const values = [data.living, data.housing, data.education, data.emergency];
    const colors = ['#2563eb', '#7c3aed', '#059669', '#d97706'];

    // 0以下の項目を除外
    const filteredLabels = [];
    const filteredValues = [];
    const filteredColors = [];
    labels.forEach((l, i) => {
      if (values[i] > 0) {
        filteredLabels.push(l);
        filteredValues.push(values[i]);
        filteredColors.push(colors[i]);
      }
    });

    if (chartInstance) {
      chartInstance.destroy();
    }

    chartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: filteredLabels,
        datasets: [{
          data: filteredValues,
          backgroundColor: filteredColors,
          borderColor: '#ffffff',
          borderWidth: 2,
          hoverOffset: 8
        }]
      },
      options: {
        responsive: true,
        cutout: '58%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 16,
              font: { size: 13 },
              color: '#374151'
            }
          },
          tooltip: {
            callbacks: {
              label(ctx) {
                const val = ctx.parsed;
                const sum = ctx.dataset.data.reduce((a, b) => a + b, 0);
                const pct = sum > 0 ? Math.round(val / sum * 100) : 0;
                return `${ctx.label}: ${Math.round(val).toLocaleString('ja-JP')}万円 (${pct}%)`;
              }
            }
          }
        }
      }
    });
  }

  // ============================================================
  // バリデーション
  // ============================================================

  function validate() {
    const income = getNum('income');
    const monthlyExp = getNum('monthlyExpense');

    if (income <= 0) {
      alert('年収を入力してください（0より大きい値）。');
      return false;
    }
    if (monthlyExp <= 0) {
      alert('月々の生活費を入力してください（0より大きい値）。');
      return false;
    }

    const childrenNum = parseInt(childrenSelect.value, 10) || 0;
    if (childrenNum > 0) {
      const youngestAge = getNum('youngestAge');
      if (youngestAge < 0 || youngestAge > 22) {
        alert('末子の年齢は0〜22歳の範囲で入力してください。');
        return false;
      }
    }

    return true;
  }

  // ============================================================
  // フォーム送信
  // ============================================================

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    if (!validate()) return;

    const result = calculate();

    // --- 結果表示 ---
    resultTotal.textContent = Math.round(result.total).toLocaleString('ja-JP');

    bdLivingVal.textContent    = formatMan(result.living);
    bdHousingVal.textContent   = formatMan(result.housing);
    bdEducationVal.textContent = formatMan(result.education);
    bdEmergencyVal.textContent = formatMan(result.emergency);
    bdDeductionVal.textContent = '▲ ' + formatMan(result.deduction);

    resultSection.style.display = 'block';

    // チャート描画
    drawChart(result);

    // スムーズスクロール
    resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

});
