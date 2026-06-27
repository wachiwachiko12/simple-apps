'use strict';

// =============================================
// 妊娠週数・出産予定日計算ツール
// =============================================

const MILESTONES = [
  {
    week: 8,
    label: '心拍確認・母子手帳交付時期',
    icon: 'bi-heart-pulse',
    note: '初めての超音波で心拍が確認できる時期です。'
  },
  {
    week: 11,
    label: '初期スクリーニング検査（11〜14週）',
    icon: 'bi-clipboard2-pulse',
    note: 'NT（頸部透明帯）計測など初期スクリーニングの時期です。'
  },
  {
    week: 16,
    label: '安定期入り（妊娠5ヶ月）',
    icon: 'bi-shield-check',
    note: '胎盤が完成し流産リスクが低下します。'
  },
  {
    week: 20,
    label: '中期スキャン（胎児詳細超音波）',
    icon: 'bi-search-heart',
    note: '胎児の臓器・発育を確認する重要な超音波検査です。'
  },
  {
    week: 28,
    label: '後期入り（妊娠8ヶ月）',
    icon: 'bi-calendar2-week',
    note: '赤ちゃんの成長が加速し、胎動も活発になります。'
  },
  {
    week: 37,
    label: '正期産（妊娠10ヶ月）',
    icon: 'bi-star',
    note: '37週〜41週6日が正期産の範囲です。'
  },
  {
    week: 40,
    label: '出産予定日（妊娠40週）',
    icon: 'bi-emoji-smile',
    note: 'ネーゲレ法による出産予定日です。'
  }
];

const DAY_NAMES = ['日', '月', '火', '水', '木', '金', '土'];

function parseLocalDate(dateString) {
  const [y, m, d] = dateString.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function diffDays(a, b) {
  // a - b in days (integer)
  const msPerDay = 24 * 60 * 60 * 1000;
  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.floor((utcA - utcB) / msPerDay);
}

function formatDate(date) {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return `${y}年${m}月${d}日`;
}

function formatDateShort(date) {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return `${m}月${d}日`;
}

function weeksToMonths(totalWeeks) {
  // 妊娠月数: 4週ごとに1ヶ月
  if (totalWeeks < 4) return '妊娠1ヶ月';
  const month = Math.floor(totalWeeks / 4) + 1;
  return `妊娠${month}ヶ月`;
}

function calculate() {
  const lmpInput = document.getElementById('lmp-date').value;
  const cycle = parseInt(document.getElementById('cycle').value, 10);
  const errorEl = document.getElementById('error-msg');

  // バリデーション
  if (!lmpInput) {
    showError('最終月経開始日を入力してください。');
    return;
  }

  const lmpDate = parseLocalDate(lmpInput);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (lmpDate > today) {
    showError('最終月経開始日は今日以前の日付を入力してください。');
    return;
  }

  const daysFromLmp = diffDays(today, lmpDate);
  if (daysFromLmp > 400) {
    showError('最終月経日が1年以上前の日付になっています。正しい日付を入力してください。');
    return;
  }

  hideError();

  // ---- 計算ロジック ----
  // 出産予定日: 最終月経日 + (280 + (cycle - 28))日 = 最終月経日 + cycle + 266
  const dueDayOffset = 266 + (cycle - 14); // = 280 + (cycle - 28) を展開: 266 + cycle - 14
  // より直感的に: dueDate = lmpDate + 280 + (cycle - 28)
  const dueDate = addDays(lmpDate, 280 + (cycle - 28));

  // 排卵日: 最終月経日 + (cycle - 14)
  const ovulationDate = addDays(lmpDate, cycle - 14);

  // 現在の妊娠週数・日数
  const totalDaysPregnant = daysFromLmp;
  const currentWeeks = Math.floor(totalDaysPregnant / 7);
  const currentDays = totalDaysPregnant % 7;

  // 出産まで残り日数
  const remainingDays = diffDays(dueDate, today);

  // 妊娠ヶ月
  const monthLabel = weeksToMonths(currentWeeks);

  // ---- 表示 ----
  const dueDateEl = document.getElementById('due-date-display');
  const dueDayOfWeekEl = document.getElementById('due-day-of-week');
  const weeksEl = document.getElementById('weeks-display');
  const monthsEl = document.getElementById('months-display');
  const remainingEl = document.getElementById('remaining-display');
  const ovulationEl = document.getElementById('ovulation-display');

  dueDateEl.textContent = formatDate(dueDate);
  dueDayOfWeekEl.textContent = `（${DAY_NAMES[dueDate.getDay()]}曜日）`;

  weeksEl.textContent = `${currentWeeks}週${currentDays}日`;
  monthsEl.textContent = monthLabel;

  if (remainingDays > 0) {
    remainingEl.textContent = `${remainingDays}日`;
    ovulationEl.textContent = `推定排卵日: ${formatDateShort(ovulationDate)}`;
  } else if (remainingDays === 0) {
    remainingEl.textContent = '本日が予定日';
    ovulationEl.textContent = `推定排卵日: ${formatDateShort(ovulationDate)}`;
  } else {
    remainingEl.textContent = `予定日を${Math.abs(remainingDays)}日経過`;
    ovulationEl.textContent = `推定排卵日: ${formatDateShort(ovulationDate)}`;
  }

  // ---- 妊娠カレンダー生成 ----
  renderMilestones(lmpDate, currentWeeks, dueDate, cycle);

  // 結果表示
  const resultArea = document.getElementById('result-area');
  resultArea.removeAttribute('hidden');
  resultArea.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  // AdSense push (after reveal)
  try {
    (adsbygoogle = window.adsbygoogle || []).push({});
  } catch (e) { /* noop */ }
}

function renderMilestones(lmpDate, currentWeeks, dueDate, cycle) {
  const list = document.getElementById('milestone-list');
  list.innerHTML = '';

  MILESTONES.forEach(function(milestone) {
    // マイルストーン到達日: 最終月経日 + milestone.week * 7 + (cycle - 28)
    // ただし最終週（40週 = 出産予定日）はdueDateを使う
    let milestoneDate;
    if (milestone.week === 40) {
      milestoneDate = dueDate;
    } else {
      milestoneDate = addDays(lmpDate, milestone.week * 7 + (cycle - 28));
    }

    const weekDiff = milestone.week - currentWeeks;
    let status = 'future';
    if (weekDiff < 0) status = 'past';
    else if (weekDiff === 0) status = 'current';

    const li = document.createElement('li');
    li.className = `milestone-item milestone-item--${status}`;
    li.setAttribute('role', 'listitem');

    const isCurrent = status === 'current';

    li.innerHTML = `
      <span class="milestone-icon"><i class="bi ${milestone.icon}"></i></span>
      <div class="milestone-body">
        <div class="milestone-week">妊娠${milestone.week}週${milestone.week === 11 ? '〜14週' : ''}</div>
        <div class="milestone-label">${milestone.label}</div>
        <div class="milestone-date">${formatDate(milestoneDate)}（${DAY_NAMES[milestoneDate.getDay()]}）</div>
      </div>
      ${isCurrent ? '<span class="milestone-badge">現在</span>' : ''}
    `;

    list.appendChild(li);
  });
}

function showError(msg) {
  const el = document.getElementById('error-msg');
  el.textContent = msg;
  el.classList.add('visible');
  el.style.display = 'block';
}

function hideError() {
  const el = document.getElementById('error-msg');
  el.textContent = '';
  el.classList.remove('visible');
  el.style.display = 'none';
}

function setTodayAndCalculate() {
  // 「今日の日付で計算」ボタン: 今日から逆算して入力欄を設定し、即計算
  // 現在の日付を入力欄にセット（最終月経日は変えず、今日を基準に計算は常に今日）
  const lmpInput = document.getElementById('lmp-date');
  if (!lmpInput.value) {
    // 入力が空なら今日を最終月経日のデフォルトとして、自動計算は促すのみ
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    lmpInput.value = `${y}-${m}-${d}`;
  }
  calculate();
}

// =============================================
// 初期化
// =============================================
document.addEventListener('DOMContentLoaded', function() {
  const form = document.getElementById('tool-form');
  const todayBtn = document.getElementById('today-btn');

  // 日付入力欄のデフォルト最大値を今日にセット
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const lmpInput = document.getElementById('lmp-date');
  lmpInput.setAttribute('max', todayStr);

  form.addEventListener('submit', function(e) {
    e.preventDefault();
    calculate();
  });

  todayBtn.addEventListener('click', function() {
    setTodayAndCalculate();
  });
});
