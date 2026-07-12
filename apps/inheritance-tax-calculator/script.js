'use strict';

// ========================================
// 相続税 簡易計算ツール — 計算ロジック
// 国税庁規定準拠（2024年現在）
// ========================================

// 速算表 [上限額（万円）, 税率, 控除額（万円）]
const TAX_BRACKETS = [
  [1000,   0.10,    0],
  [3000,   0.15,   50],
  [5000,   0.20,  200],
  [10000,  0.30,  700],
  [20000,  0.40, 1700],
  [30000,  0.45, 2700],
  [60000,  0.50, 4200],
  [Infinity, 0.55, 7200],
];

// 配偶者控除の上限（万円）
const SPOUSE_EXEMPTION_LIMIT = 16000;

let heirChart = null;

// ========================================
// 速算表で相続税額を計算する
// @param {number} amount 課税額（万円）
// @returns {number} 税額（万円）
// ========================================
function calcTaxByBracket(amount) {
  if (amount <= 0) return 0;
  for (const [limit, rate, deduction] of TAX_BRACKETS) {
    if (amount <= limit) {
      return Math.floor(amount * rate - deduction);
    }
  }
  return 0;
}

// ========================================
// 法定相続人リストを構築する
// @returns {Array} [{name, ratio, isSpouse}]
// ========================================
function buildHeirs(hasSpouse, childrenCount, parentsCount) {
  const heirs = [];

  if (childrenCount > 0) {
    // 子あり: 配偶者1/2, 子ども1/2を均等分配
    if (hasSpouse) {
      heirs.push({ name: '配偶者', ratio: 1 / 2, isSpouse: true });
    }
    const childRatio = (hasSpouse ? 1 / 2 : 1) / childrenCount;
    const childLabel = childrenCount === 1 ? '子ども' : '子ども';
    for (let i = 1; i <= childrenCount; i++) {
      heirs.push({ name: `${childLabel}${childrenCount > 1 ? i : ''}`, ratio: childRatio, isSpouse: false });
    }
  } else if (parentsCount > 0) {
    // 子なし・親あり: 配偶者2/3, 親1/3を均等分配
    if (hasSpouse) {
      heirs.push({ name: '配偶者', ratio: 2 / 3, isSpouse: true });
      const parentRatio = (1 / 3) / parentsCount;
      for (let i = 1; i <= parentsCount; i++) {
        heirs.push({ name: `親${parentsCount > 1 ? i : ''}`, ratio: parentRatio, isSpouse: false });
      }
    } else {
      const parentRatio = 1 / parentsCount;
      for (let i = 1; i <= parentsCount; i++) {
        heirs.push({ name: `親${parentsCount > 1 ? i : ''}`, ratio: parentRatio, isSpouse: false });
      }
    }
  } else {
    // 子なし・親なし・兄弟: 配偶者3/4, 兄弟1/4（簡易のため兄弟は省略し配偶者が全額）
    if (hasSpouse) {
      heirs.push({ name: '配偶者', ratio: 1, isSpouse: true });
    }
  }

  return heirs;
}

// ========================================
// 法定相続人数を取得（基礎控除計算用）
// ========================================
function getLegalHeirCount(hasSpouse, childrenCount, parentsCount) {
  let count = hasSpouse ? 1 : 0;
  if (childrenCount > 0) {
    count += childrenCount;
  } else {
    count += parentsCount;
  }
  return Math.max(count, 1);
}

// ========================================
// 法定相続分の表示文字列を生成する
// ========================================
function formatRatio(ratio) {
  const fractions = [
    [1,     '全額'],
    [1/2,   '1/2'],
    [1/3,   '1/3'],
    [2/3,   '2/3'],
    [3/4,   '3/4'],
    [1/4,   '1/4'],
    [1/4,   '1/4'],
  ];
  // 分母4まで試す
  for (let d = 1; d <= 12; d++) {
    for (let n = 1; n <= d; n++) {
      if (Math.abs(ratio - n / d) < 0.0001) {
        if (n === d) return '全額';
        return `${n}/${d}`;
      }
    }
  }
  return `${(ratio * 100).toFixed(1)}%`;
}

// ========================================
// 数値を3桁区切りにフォーマット
// ========================================
function fmt(num) {
  return Math.max(0, Math.floor(num)).toLocaleString('ja-JP');
}

// ========================================
// 遺産種別の注記文字列を生成する
// ========================================
function getAssetNote(assetType) {
  switch (assetType) {
    case 'real-estate':
      return '不動産が主な遺産の場合、路線価（時価の約7〜8割）で評価されます。小規模宅地等の特例（最大80%減額）が適用できる場合、実際の税額は大幅に下がる可能性があります。';
    case 'financial':
      return '金融資産（預貯金・有価証券等）は時価で評価されます。死亡保険金は「500万円 × 法定相続人数」の非課税枠があります。';
    case 'mixed':
      return '不動産を含む場合は路線価評価が適用されます。また小規模宅地等の特例など各種減額制度が利用できる場合があります。実際の申告では税理士にご相談ください。';
    default:
      return '遺産の種類によって評価方法や適用できる特例が異なります。詳細は税理士にご相談ください。';
  }
}

// ========================================
// Chart.js グラフを描画する
// ========================================
function renderChart(heirs, grossAmounts, netTaxAmounts) {
  const ctx = document.getElementById('heirChart').getContext('2d');

  if (heirChart) {
    heirChart.destroy();
    heirChart = null;
  }

  const labels = heirs.map(h => h.name);
  const handsOnAmounts = heirs.map((h, i) => Math.max(0, Math.floor(grossAmounts[i] - netTaxAmounts[i])));

  heirChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: '手取り額（万円）',
          data: handsOnAmounts,
          backgroundColor: 'rgba(217, 119, 6, 0.75)',
          borderColor: '#b45309',
          borderWidth: 1.5,
          borderRadius: 4,
        },
        {
          label: '相続税額（万円）',
          data: netTaxAmounts.map(v => Math.max(0, Math.floor(v))),
          backgroundColor: 'rgba(120, 53, 15, 0.65)',
          borderColor: '#78350f',
          borderWidth: 1.5,
          borderRadius: 4,
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
            font: { size: 12 },
            color: '#374151',
          },
        },
        tooltip: {
          callbacks: {
            label: function(ctx) {
              return ` ${ctx.dataset.label}: ${ctx.raw.toLocaleString('ja-JP')} 万円`;
            },
          },
        },
      },
      scales: {
        x: {
          stacked: true,
          grid: { display: false },
          ticks: { color: '#374151', font: { size: 12 } },
        },
        y: {
          stacked: true,
          beginAtZero: true,
          ticks: {
            color: '#6b7280',
            font: { size: 11 },
            callback: v => `${v.toLocaleString()}万`,
          },
          grid: { color: 'rgba(0,0,0,0.05)' },
        },
      },
    },
  });
}

// ========================================
// メイン計算関数
// ========================================
function calculate() {
  // 入力値の取得
  const estateValue = parseFloat(document.getElementById('estate-value').value);
  const hasSpouse = document.getElementById('has-spouse').value === 'yes';
  const childrenCount = parseInt(document.getElementById('children-count').value, 10);
  const parentsCount = parseInt(document.getElementById('parents-count').value, 10);
  const assetType = document.getElementById('asset-type').value;

  // バリデーション
  if (!estateValue || isNaN(estateValue) || estateValue <= 0) {
    alert('遺産総額を入力してください。');
    document.getElementById('estate-value').focus();
    return;
  }

  if (!hasSpouse && childrenCount === 0 && parentsCount === 0) {
    alert('相続人（配偶者・子ども・親）のいずれかを選択してください。');
    return;
  }

  // 法定相続人数の計算
  const legalHeirCount = getLegalHeirCount(hasSpouse, childrenCount, parentsCount);

  // 基礎控除の計算
  const basicDeduction = 3000 + 600 * legalHeirCount;

  // 課税遺産総額
  const taxableEstate = estateValue - basicDeduction;

  // 課税遺産総額が0以下 → 非課税
  if (taxableEstate <= 0) {
    document.getElementById('result-section').style.display = 'none';
    const noTaxSection = document.getElementById('no-tax-section');
    noTaxSection.style.display = 'block';
    document.getElementById('no-tax-detail').textContent =
      `遺産総額 ${fmt(estateValue)}万円 に対し、基礎控除額は ${fmt(basicDeduction)}万円（3,000万円 + 600万円 × ${legalHeirCount}人）です。基礎控除額以下のため相続税はかかりません。`;
    noTaxSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    return;
  }

  document.getElementById('no-tax-section').style.display = 'none';

  // 相続人リストを構築
  const heirs = buildHeirs(hasSpouse, childrenCount, parentsCount);

  // 各相続人の法定相続分取得額に対する仮税額（按分計算に使用）
  const provisionalTaxes = heirs.map(h => {
    const share = taxableEstate * h.ratio;
    return calcTaxByBracket(share);
  });

  // 相続税の総額（按分前）
  const totalTaxBeforeCredit = provisionalTaxes.reduce((a, b) => a + b, 0);

  // 各相続人の取得額（実際の相続額 = 遺産総額 × 相続分）
  const grossAmounts = heirs.map(h => estateValue * h.ratio);

  // 各相続人の実際の相続税額（按分）
  // 配偶者は配偶者控除を適用
  const netTaxAmounts = heirs.map((h, i) => {
    const taxShare = provisionalTaxes[i];
    if (h.isSpouse) {
      // 配偶者控除: 取得額が16,000万円以下 または 法定相続分以下の場合は非課税
      const spouseAcquisition = grossAmounts[i];
      if (spouseAcquisition <= SPOUSE_EXEMPTION_LIMIT) {
        return 0;
      }
      // 16,000万円を超える部分のみ課税（簡易計算）
      const taxableSpouseShare = Math.max(0, spouseAcquisition - SPOUSE_EXEMPTION_LIMIT);
      return calcTaxByBracket(taxableSpouseShare * (taxableEstate / estateValue));
    }
    return taxShare;
  });

  // 合計相続税額
  const totalTax = netTaxAmounts.reduce((a, b) => a + b, 0);

  // 実効税率
  const effectiveRate = estateValue > 0 ? (totalTax / estateValue) * 100 : 0;

  // ========== 結果の表示 ==========

  document.getElementById('basic-deduction').textContent = fmt(basicDeduction);
  document.getElementById('taxable-estate').textContent = fmt(taxableEstate);
  document.getElementById('total-tax').textContent = fmt(totalTax);
  document.getElementById('effective-rate').textContent = effectiveRate.toFixed(2);

  // テーブルの行を生成
  const tbody = document.getElementById('heir-tbody');
  tbody.innerHTML = '';

  heirs.forEach((h, i) => {
    const tr = document.createElement('tr');
    const taxVal = Math.max(0, Math.floor(netTaxAmounts[i]));
    const isZeroTax = taxVal === 0;
    tr.innerHTML = `
      <td>${h.name}${h.isSpouse ? ' <small style="color:#059669;font-size:0.75rem;">（控除適用）</small>' : ''}</td>
      <td>${formatRatio(h.ratio)}</td>
      <td>${fmt(grossAmounts[i])}</td>
      <td class="${isZeroTax ? 'td-zero' : ''}">${isZeroTax ? '0（非課税）' : fmt(taxVal)}</td>
    `;
    tbody.appendChild(tr);
  });

  // 遺産種別の注記
  document.getElementById('asset-note').textContent = getAssetNote(assetType);

  // グラフを描画
  renderChart(heirs, grossAmounts, netTaxAmounts);

  // 結果を表示してスクロール
  const resultSection = document.getElementById('result-section');
  resultSection.style.display = 'block';
  resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ========================================
// アコーディオン制御
// ========================================
function toggleAccordion(btn) {
  const isExpanded = btn.getAttribute('aria-expanded') === 'true';
  const body = btn.nextElementSibling;

  btn.setAttribute('aria-expanded', !isExpanded);

  if (!isExpanded) {
    body.classList.add('open');
  } else {
    body.classList.remove('open');
  }
}

// ========================================
// 親フィールドの表示切替
// ========================================
document.getElementById('children-count').addEventListener('change', function() {
  const parentsField = document.getElementById('parents-field');
  if (this.value === '0') {
    parentsField.style.display = 'flex';
  } else {
    parentsField.style.display = 'none';
    document.getElementById('parents-count').value = '0';
  }
});

// 初期状態: 子ども2人が選択されているため親フィールドは非表示
document.getElementById('parents-field').style.display = 'none';

// ========================================
// Enterキーでも計算を実行
// ========================================
document.getElementById('estate-value').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') calculate();
});
