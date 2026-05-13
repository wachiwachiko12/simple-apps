'use strict';

/* ===================================================
   BMI・カロリー収支ダッシュボード — script.js
   XSS対策: ユーザー入力はすべて textContent で挿入
=================================================== */

const STORAGE_KEY = 'bmi_calorie_log_v1';
const GOAL_KEY    = 'bmi_calorie_goal_v1';
let weightChart   = null;
let currentTDEE   = null;  // タブ間の TDEE 共有

/* ===================================================
   ユーティリティ
=================================================== */
function round(value, digits) {
  const factor = Math.pow(10, digits);
  return Math.round(value * factor) / factor;
}

function getLog() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch (_) {
    return [];
  }
}

function saveLog(log) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(log));
}

function getGoal() {
  const v = parseFloat(localStorage.getItem(GOAL_KEY));
  return isNaN(v) ? null : v;
}

function saveGoal(kg) {
  localStorage.setItem(GOAL_KEY, String(kg));
}

/* ===================================================
   タブ切り替え
=================================================== */
function initTabs() {
  const btns   = document.querySelectorAll('.tab-btn');
  const panels = document.querySelectorAll('.tab-panel');

  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;

      btns.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');

      panels.forEach(panel => {
        if (panel.id === 'tab-' + target) {
          panel.hidden = false;
        } else {
          panel.hidden = true;
        }
      });

      // 体重記録タブに切り替えた時にグラフ更新
      if (target === 'log') {
        renderChart(getLog());
      }
      // カロリー収支タブに切り替えた時に TDEE を引き継ぐ
      if (target === 'calorie' && currentTDEE !== null) {
        const el = document.getElementById('tdee-display');
        el.value = round(currentTDEE, 0);
      }
    });
  });
}

/* ===================================================
   タブ1: BMI・基礎代謝計算
=================================================== */
function initBmiForm() {
  const form = document.getElementById('bmi-form');

  // 今日の日付をlog-dateのデフォルトに設定
  const logDate = document.getElementById('log-date');
  if (logDate) {
    logDate.value = new Date().toISOString().slice(0, 10);
  }

  form.addEventListener('submit', e => {
    e.preventDefault();

    const height   = parseFloat(document.getElementById('height').value);
    const weight   = parseFloat(document.getElementById('weight').value);
    const age      = parseInt(document.getElementById('age').value, 10);
    const sex      = document.getElementById('sex').value;
    const activity = parseFloat(document.getElementById('activity').value);

    if (!isValid(height, 100, 250) || !isValid(weight, 20, 300) || !isValid(age, 1, 120)) {
      alert('入力値を確認してください。\n身長: 100〜250cm、体重: 20〜300kg、年齢: 1〜120');
      return;
    }

    const heightM = height / 100;
    const bmi     = round(weight / (heightM * heightM), 1);
    const idealWt = round(22 * heightM * heightM, 1);

    // BMR（ハリス・ベネディクト改訂版）
    let bmr;
    if (sex === 'male') {
      bmr = 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age);
    } else {
      bmr = 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age);
    }
    bmr = round(bmr, 0);

    const tdee = round(bmr * activity, 0);
    currentTDEE = tdee;

    // BMI判定
    let category, colorClass;
    if (bmi < 18.5) {
      category = '低体重（やせ）';
      colorClass = 'bmi-thin';
    } else if (bmi < 25) {
      category = '普通体重';
      colorClass = 'bmi-normal';
    } else if (bmi < 30) {
      category = '肥満（1度）';
      colorClass = 'bmi-obese1';
    } else {
      category = '肥満（2度以上）';
      colorClass = 'bmi-obese2';
    }

    // 表示更新（XSS対策: textContent使用）
    const bmiCard = document.getElementById('bmi-card');
    bmiCard.className = 'result-card ' + colorClass;

    document.getElementById('bmi-value').textContent     = bmi;
    document.getElementById('bmi-category').textContent  = category;
    document.getElementById('ideal-weight').textContent  = idealWt;
    document.getElementById('bmr-value').textContent     = bmr.toLocaleString();
    document.getElementById('tdee-value').textContent    = tdee.toLocaleString();

    const resultPanel = document.getElementById('bmi-result');
    resultPanel.hidden = false;

    // 保存済み目標体重を復元
    const savedGoal = getGoal();
    if (savedGoal !== null) {
      document.getElementById('goal-weight').value = savedGoal;
      showGoalResult(weight, savedGoal, tdee);
    }
  });

  // 目標体重設定ボタン
  document.getElementById('set-goal-btn').addEventListener('click', () => {
    const goalInput = document.getElementById('goal-weight');
    const goalKg    = parseFloat(goalInput.value);
    const currentWt = parseFloat(document.getElementById('weight').value);

    if (isNaN(goalKg) || goalKg < 20 || goalKg > 300) {
      alert('目標体重は 20〜300kg で入力してください。');
      return;
    }

    saveGoal(goalKg);
    showGoalResult(currentWt, goalKg, currentTDEE);
  });
}

function showGoalResult(currentKg, goalKg, tdee) {
  const div = document.getElementById('goal-result');
  if (isNaN(currentKg) || isNaN(goalKg)) {
    div.hidden = true;
    return;
  }

  const diff    = round(goalKg - currentKg, 1);
  const diffAbs = Math.abs(diff);
  // 体脂肪1kg = 約7200kcal
  const daysNeeded = tdee ? round((diffAbs * 7200) / Math.abs(tdee * 0.2), 0) : null;

  const lines = [];
  if (diff < 0) {
    lines.push('目標まで ' + diffAbs + ' kg 減量が必要です。');
  } else if (diff > 0) {
    lines.push('目標まで ' + diffAbs + ' kg 増量が必要です。');
  } else {
    lines.push('現在の体重が目標体重と同じです！');
  }

  if (daysNeeded && diff !== 0) {
    lines.push('1日あたりTDEEの20%を差し引いた場合、約 ' + daysNeeded + ' 日で達成できる計算です。');
  }
  lines.push('※あくまで目安です。無理のない範囲でご活用ください。');

  // textContent で安全に挿入
  div.textContent = '';
  lines.forEach((line, i) => {
    const p = document.createElement('p');
    p.textContent = line;
    if (i === lines.length - 1) {
      p.style.fontSize = '0.8rem';
      p.style.color = '#888';
      p.style.marginTop = '0.4rem';
    }
    div.appendChild(p);
  });

  div.hidden = false;
}

function isValid(val, min, max) {
  return !isNaN(val) && val >= min && val <= max;
}

/* ===================================================
   タブ2: カロリー収支
=================================================== */
function initCalorieForm() {
  const form = document.getElementById('calorie-form');

  form.addEventListener('submit', e => {
    e.preventDefault();

    const tdeeVal  = parseFloat(document.getElementById('tdee-display').value);
    const intake   = parseFloat(document.getElementById('intake').value);

    if (isNaN(tdeeVal) || tdeeVal <= 0) {
      alert('先に「BMI・代謝」タブでTDEEを計算してください。');
      return;
    }
    if (isNaN(intake) || intake < 0) {
      alert('摂取カロリーを正しく入力してください。');
      return;
    }

    const balance = round(intake - tdeeVal, 0);

    document.getElementById('intake-display').textContent = intake.toLocaleString();
    document.getElementById('tdee-display2').textContent  = tdeeVal.toLocaleString();
    document.getElementById('balance-value').textContent  = (balance >= 0 ? '+' : '') + balance.toLocaleString();

    const balanceCard = document.getElementById('balance-card');
    const adviceEl    = document.getElementById('calorie-advice');

    if (balance > 0) {
      balanceCard.className = 'result-card balance-card surplus';
      adviceEl.textContent  = '消費より ' + balance.toLocaleString() + ' kcal 多く摂取しています。このペースが続くと体重が増えやすくなります。';
    } else if (balance < 0) {
      balanceCard.className = 'result-card balance-card deficit';
      adviceEl.textContent  = '消費より ' + Math.abs(balance).toLocaleString() + ' kcal 少なく摂取しています。このペースが続くと体重が減りやすくなります。';
    } else {
      balanceCard.className = 'result-card balance-card';
      adviceEl.textContent  = '摂取カロリーと消費カロリーがほぼ均衡しています。';
    }

    document.getElementById('calorie-result').hidden = false;
  });
}

/* ===================================================
   タブ3: 体重記録ログ
=================================================== */
function initLogForm() {
  const form = document.getElementById('log-form');

  form.addEventListener('submit', e => {
    e.preventDefault();

    const date   = document.getElementById('log-date').value;
    const weight = parseFloat(document.getElementById('log-weight').value);
    const memo   = document.getElementById('log-memo').value.trim().slice(0, 50);

    if (!date) {
      alert('日付を入力してください。');
      return;
    }
    if (!isValid(weight, 20, 300)) {
      alert('体重は 20〜300kg で入力してください。');
      return;
    }

    const log = getLog();
    log.push({ date, weight, memo });
    // 日付順に並び替え
    log.sort((a, b) => a.date.localeCompare(b.date));
    saveLog(log);

    // フォームリセット（日付はそのまま）
    document.getElementById('log-weight').value = '';
    document.getElementById('log-memo').value   = '';

    renderLogList(log);
    renderChart(log);
  });

  // 全削除ボタン
  document.getElementById('clear-log-btn').addEventListener('click', () => {
    if (!confirm('全ての記録を削除しますか？')) return;
    saveLog([]);
    renderLogList([]);
    renderChart([]);
  });

  // 初期表示
  const log = getLog();
  renderLogList(log);
  renderChart(log);
}

function renderLogList(log) {
  const container = document.getElementById('log-list');
  container.textContent = '';  // XSS対策: 既存要素クリア

  if (log.length === 0) {
    const p = document.createElement('p');
    p.className = 'empty-msg';
    p.textContent = '記録がありません。';
    container.appendChild(p);
    return;
  }

  // 新しい順に表示
  const sorted = [...log].reverse();

  sorted.forEach((entry, idx) => {
    const realIdx = log.length - 1 - idx;

    const item = document.createElement('div');
    item.className = 'log-item';

    const dateEl = document.createElement('span');
    dateEl.className = 'log-date';
    dateEl.textContent = entry.date;

    const weightEl = document.createElement('span');
    weightEl.className = 'log-weight-val';
    weightEl.textContent = entry.weight + ' kg';

    const memoEl = document.createElement('span');
    memoEl.className = 'log-memo';
    memoEl.textContent = entry.memo || '';
    memoEl.title = entry.memo || '';

    const delBtn = document.createElement('button');
    delBtn.className = 'log-delete';
    delBtn.type = 'button';
    delBtn.setAttribute('aria-label', entry.date + 'の記録を削除');
    delBtn.textContent = '×';
    delBtn.addEventListener('click', () => {
      const updated = getLog();
      updated.splice(realIdx, 1);
      saveLog(updated);
      renderLogList(updated);
      renderChart(updated);
    });

    item.appendChild(dateEl);
    item.appendChild(weightEl);
    item.appendChild(memoEl);
    item.appendChild(delBtn);
    container.appendChild(item);
  });
}

/* ===================================================
   Chart.js — 体重推移グラフ
=================================================== */
function renderChart(log) {
  const canvas = document.getElementById('weight-chart');
  if (!canvas) return;

  const labels  = log.map(e => e.date);
  const weights = log.map(e => e.weight);

  if (weightChart) {
    weightChart.destroy();
    weightChart = null;
  }

  if (log.length === 0) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    return;
  }

  const ctx = canvas.getContext('2d');
  weightChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: '体重 (kg)',
        data: weights,
        borderColor: '#1a6b4a',
        backgroundColor: 'rgba(26, 107, 74, 0.08)',
        borderWidth: 2.5,
        pointBackgroundColor: '#1a6b4a',
        pointRadius: 4,
        pointHoverRadius: 6,
        tension: 0.35,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ctx.parsed.y + ' kg'
          }
        }
      },
      scales: {
        x: {
          ticks: {
            font: { size: 11 },
            maxTicksLimit: 8,
            maxRotation: 45
          },
          grid: { color: 'rgba(0,0,0,0.05)' }
        },
        y: {
          ticks: {
            font: { size: 11 },
            callback: val => val + ' kg'
          },
          grid: { color: 'rgba(0,0,0,0.05)' }
        }
      }
    }
  });
}

/* ===================================================
   初期化
=================================================== */
document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initBmiForm();
  initCalorieForm();
  initLogForm();
});
