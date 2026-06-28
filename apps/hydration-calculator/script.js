'use strict';

// ===========================
// 定数
// ===========================
const BASE_ML_PER_KG = 35; // 成人 ml/kg

const AGE_FACTOR = {
  child:  1.1,  // 7〜12歳: 代謝活発
  teen:   1.0,  // 十代: 成人と同等
  adult:  1.0,  // 成人
  senior: 0.9,  // 高齢者: 体内水分量減少
};

const EXERCISE_BONUS = {
  none:     0,
  light:    300,
  moderate: 600,
  hard:     1000,
};

const TEMP_BONUS = {
  comfortable: 0,
  hot:         300,
  'very-hot':  600,
};

const PREGNANT_BONUS     = 350;
const BREASTFEED_BONUS   = 700;

// 飲み物定義
const DRINKS = [
  { name: '水', unit: 200, icon: '💧' },
  { name: 'お茶・麦茶', unit: 200, icon: '🍵' },
  { name: 'スポーツドリンク', unit: 500, icon: '🥤' },
];

// 補給スケジュールテンプレート（ml）
const SCHEDULE_BASE = [
  { timing: '起床時（朝一番）',  ml: 200, note: '就寝中に失った水分を補給。代謝アップにも効果的' },
  { timing: '朝食時',           ml: 200, note: '食事と一緒に摂ることで消化を助ける' },
  { timing: '午前中（2回）',    ml: 400, note: '200ml×2回に分けてこまめに飲む' },
  { timing: '昼食時',           ml: 200, note: '食事と一緒に摂る' },
  { timing: '午後（2回）',      ml: 400, note: '200ml×2回に分けて。眠くなる14時前後が特に重要' },
  { timing: '夕食時',           ml: 200, note: '食事と一緒に摂る' },
  { timing: '就寝前',           ml: 200, note: '就寝中の脱水予防。飲みすぎに注意' },
];

// ===========================
// DOM要素の取得
// ===========================
const weightInput    = document.getElementById('weight');
const weightSlider   = document.getElementById('weight-slider');
const form           = document.getElementById('tool-form');
const resultSection  = document.getElementById('result-section');
const resultMlEl     = document.getElementById('result-ml');
const resultLEl      = document.getElementById('result-l');
const breakdownEl    = document.getElementById('result-breakdown');
const drinkGridEl    = document.getElementById('drink-grid');
const scheduleBodyEl = document.getElementById('schedule-body');

// ===========================
// スライダー ↔ 数値入力の同期
// ===========================
function syncSlider() {
  const val = Number(weightSlider.value);
  weightInput.value = val;
  const pct = ((val - 20) / (150 - 20)) * 100;
  weightSlider.style.setProperty('--val', pct + '%');
}

function syncNumberInput() {
  const raw = Number(weightInput.value);
  const clamped = Math.min(150, Math.max(20, raw));
  weightInput.value = clamped;
  weightSlider.value = clamped;
  const pct = ((clamped - 20) / (150 - 20)) * 100;
  weightSlider.style.setProperty('--val', pct + '%');
}

weightSlider.addEventListener('input', syncSlider);
weightInput.addEventListener('input', syncNumberInput);
weightInput.addEventListener('blur', syncNumberInput);

// 初期表示
syncSlider();

// ===========================
// ラジオ / チェック取得ユーティリティ
// ===========================
function getRadioValue(name) {
  const checked = document.querySelector(`input[name="${name}"]:checked`);
  return checked ? checked.value : null;
}

// ===========================
// 計算ロジック
// ===========================
function calculate() {
  const weight      = Math.min(150, Math.max(20, Number(weightInput.value) || 60));
  const ageGroup    = getRadioValue('age-group') || 'adult';
  const exercise    = getRadioValue('exercise')   || 'none';
  const temperature = getRadioValue('temperature') || 'comfortable';
  const pregnant    = document.getElementById('pregnant').checked;
  const breastfeed  = document.getElementById('breastfeeding').checked;

  const base        = weight * BASE_ML_PER_KG * AGE_FACTOR[ageGroup];
  const exBonus     = EXERCISE_BONUS[exercise];
  const tempBonus   = TEMP_BONUS[temperature];
  const pregBonus   = pregnant   ? PREGNANT_BONUS   : 0;
  const bfBonus     = breastfeed ? BREASTFEED_BONUS : 0;
  const total       = Math.round(base + exBonus + tempBonus + pregBonus + bfBonus);

  return { total, base: Math.round(base), exBonus, tempBonus, pregBonus, bfBonus, ageGroup };
}

// ===========================
// 飲み物換算表の生成
// ===========================
function renderDrinkGrid(totalMl) {
  drinkGridEl.innerHTML = '';
  DRINKS.forEach(d => {
    const cups = Math.ceil(totalMl / d.unit);
    const item = document.createElement('div');
    item.className = 'drink-item';
    item.innerHTML =
      '<div class="drink-icon">' + d.icon + '</div>' +
      '<div class="drink-name">' + d.name + '</div>' +
      '<div class="drink-count">' + cups + '</div>' +
      '<div class="drink-unit">' + d.unit + 'mL × ' + cups + '杯</div>';
    drinkGridEl.appendChild(item);
  });
}

// ===========================
// 時間別スケジュール生成
// ===========================
function renderSchedule(totalMl) {
  const baseTotal = SCHEDULE_BASE.reduce((acc, s) => acc + s.ml, 0); // 1800ml
  const remainder = Math.max(0, totalMl - baseTotal);
  scheduleBodyEl.innerHTML = '';

  SCHEDULE_BASE.forEach(s => {
    const tr = document.createElement('tr');
    tr.innerHTML =
      '<td class="schedule-timing">' + s.timing + '</td>' +
      '<td class="schedule-ml">' + s.ml.toLocaleString() + ' mL</td>' +
      '<td class="schedule-note">' + s.note + '</td>';
    scheduleBodyEl.appendChild(tr);
  });

  // 残量行
  if (remainder > 0) {
    const tr = document.createElement('tr');
    tr.innerHTML =
      '<td class="schedule-timing">その他（随時）</td>' +
      '<td class="schedule-ml">+' + remainder.toLocaleString() + ' mL</td>' +
      '<td class="schedule-note">運動前後・入浴後・外出時など、喉が渇く前にこまめに補給</td>';
    scheduleBodyEl.appendChild(tr);
  }
}

// ===========================
// 内訳タグの生成
// ===========================
function renderBreakdown({ base, ageGroup, exBonus, tempBonus, pregBonus, bfBonus }) {
  breakdownEl.innerHTML = '';

  const AGE_LABEL = {
    child:  '子ども補正 ×1.1',
    teen:   '十代',
    adult:  '成人',
    senior: '高齢者補正 ×0.9',
  };

  const tags = [
    { label: '基本量（体重×35mL）', val: base },
    { label: AGE_LABEL[ageGroup], val: null },
  ];

  if (exBonus > 0)   tags.push({ label: '運動補正', val: '+' + exBonus });
  if (tempBonus > 0) tags.push({ label: '気温補正', val: '+' + tempBonus });
  if (pregBonus > 0) tags.push({ label: '妊娠中', val: '+' + pregBonus });
  if (bfBonus > 0)   tags.push({ label: '授乳中', val: '+' + bfBonus });

  tags.forEach(t => {
    const span = document.createElement('span');
    span.className = 'breakdown-tag';
    span.textContent = t.val !== null ? t.label + '：' + t.val + ' mL' : t.label;
    breakdownEl.appendChild(span);
  });
}

// ===========================
// 結果の表示
// ===========================
function showResult(data) {
  const { total } = data;
  const liter = (total / 1000).toFixed(1);

  resultMlEl.textContent = total.toLocaleString() + ' mL';
  resultLEl.textContent  = liter + ' L';

  renderBreakdown(data);
  renderDrinkGrid(total);
  renderSchedule(total);

  resultSection.hidden = false;
  resultSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  // AdSense再読み込み（存在する場合）
  try {
    (window.adsbygoogle = window.adsbygoogle || []).push({});
  } catch (_) {}
}

// ===========================
// フォーム送信
// ===========================
form.addEventListener('submit', e => {
  e.preventDefault();
  const rawWeight = Number(weightInput.value);
  if (!rawWeight || rawWeight < 20 || rawWeight > 150) {
    weightInput.style.borderColor = '#ef4444';
    weightInput.focus();
    weightInput.setAttribute('aria-invalid', 'true');
    setTimeout(() => {
      weightInput.style.borderColor = '';
      weightInput.removeAttribute('aria-invalid');
    }, 2000);
    return;
  }
  const data = calculate();
  showResult(data);
});
