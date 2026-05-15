'use strict';

// ===== 祝日データ（2026〜2027年） =====
const HOLIDAYS = {
  "2026-01-01": "元日",
  "2026-01-12": "成人の日",
  "2026-02-11": "建国記念の日",
  "2026-02-23": "天皇誕生日",
  "2026-03-20": "春分の日",
  "2026-04-29": "昭和の日",
  "2026-05-03": "憲法記念日",
  "2026-05-04": "みどりの日",
  "2026-05-05": "こどもの日",
  "2026-07-20": "海の日",
  "2026-08-11": "山の日",
  "2026-09-21": "敬老の日",
  "2026-09-23": "秋分の日",
  "2026-10-12": "スポーツの日",
  "2026-11-03": "文化の日",
  "2026-11-23": "勤労感謝の日",
  "2027-01-01": "元日",
  "2027-01-11": "成人の日",
  "2027-02-11": "建国記念の日",
  "2027-02-23": "天皇誕生日",
  "2027-03-21": "春分の日",
  "2027-04-29": "昭和の日",
  "2027-05-03": "憲法記念日",
  "2027-05-04": "みどりの日",
  "2027-05-05": "こどもの日",
  "2027-07-19": "海の日",
  "2027-08-11": "山の日",
  "2027-09-20": "敬老の日",
  "2027-09-23": "秋分の日",
  "2027-10-11": "スポーツの日",
  "2027-11-03": "文化の日",
  "2027-11-23": "勤労感謝の日"
};

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];
const MONTHS_JP = ["1月", "2月", "3月", "4月", "5月", "6月",
                   "7月", "8月", "9月", "10月", "11月", "12月"];

// ===== ユーティリティ関数 =====

/**
 * Date オブジェクトを "YYYY-MM-DD" 文字列に変換
 */
function dateToStr(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * "YYYY-MM-DD" 文字列を Date オブジェクトに変換（ローカルタイム）
 */
function strToDate(s) {
  const [yyyy, mm, dd] = s.split('-').map(Number);
  return new Date(yyyy, mm - 1, dd);
}

/**
 * 日付が営業日かどうかを判定
 */
function isBusinessDay(d) {
  const day = d.getDay(); // 0=日, 6=土
  if (day === 0 || day === 6) return false;
  const key = dateToStr(d);
  if (HOLIDAYS[key]) return false;
  return true;
}

/**
 * 日付を日本語フォーマットで返す（例：2026年5月13日（水））
 */
function formatDateJP(d) {
  const yyyy = d.getFullYear();
  const mm = d.getMonth() + 1;
  const dd = d.getDate();
  const wd = WEEKDAYS[d.getDay()];
  return `${yyyy}年${mm}月${dd}日（${wd}）`;
}

/**
 * 入力値のバリデーション（日付文字列）
 */
function validateDateInput(val, label) {
  if (!val) return `${label}を入力してください。`;
  const d = strToDate(val);
  if (isNaN(d.getTime())) return `${label}が正しくありません。`;
  return null;
}

/**
 * エラーメッセージを結果ボックスに表示
 */
function showError(boxId, msg) {
  const box = document.getElementById(boxId);
  box.className = 'result-box error visible';
  const p = document.createElement('p');
  p.style.color = '#c62828';
  p.style.fontWeight = '600';
  p.textContent = msg;
  box.replaceChildren(p);
}

/**
 * 結果を結果ボックスに表示
 */
function showResult(boxId, mainText, subText) {
  const box = document.getElementById(boxId);
  box.className = 'result-box visible';

  const mainEl = document.createElement('div');
  mainEl.className = 'result-main';
  mainEl.textContent = mainText;

  const subEl = document.createElement('div');
  subEl.className = 'result-sub';
  subEl.textContent = subText;

  box.replaceChildren(mainEl, subEl);
}

// ===== タブ切り替え =====
function switchTab(name) {
  const tabs = ['ndays', 'count', 'closing'];
  tabs.forEach(t => {
    const panel = document.getElementById(`tab-${t}`);
    const btn = document.getElementById(`btn-${t}`);
    if (t === name) {
      panel.removeAttribute('hidden');
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
    } else {
      panel.setAttribute('hidden', '');
      btn.classList.remove('active');
      btn.setAttribute('aria-selected', 'false');
    }
  });
  // カレンダーをリセット
  document.getElementById('calendar-section').setAttribute('hidden', '');
}

// ===== 機能1: N営業日後の計算 =====
function calcNDays() {
  const startVal = document.getElementById('ndays-start').value;
  const nVal = document.getElementById('ndays-n').value;

  const errStart = validateDateInput(startVal, '起算日');
  if (errStart) { showError('result-ndays', errStart); return; }

  const n = parseInt(nVal, 10);
  if (isNaN(n) || n < 1 || n > 365) {
    showError('result-ndays', '営業日数は1〜365の間で入力してください。');
    return;
  }

  const start = strToDate(startVal);
  let current = new Date(start);
  let count = 0;

  // 起算日が営業日でなくても「翌営業日」ではなく「起算日からカウント」
  while (count < n) {
    current.setDate(current.getDate() + 1);
    if (isBusinessDay(current)) {
      count++;
    }
  }

  const resultDate = current;
  const holidayName = HOLIDAYS[dateToStr(resultDate)];
  let sub = `起算日: ${formatDateJP(start)}`;
  if (holidayName) {
    sub += ` ※この日は祝日（${holidayName}）です`;
  }

  showResult('result-ndays', formatDateJP(resultDate), sub);
  renderCalendar(resultDate.getFullYear(), resultDate.getMonth(), [dateToStr(resultDate)]);
}

// ===== 機能2: 期間内営業日数カウント =====
function calcCount() {
  const startVal = document.getElementById('count-start').value;
  const endVal = document.getElementById('count-end').value;

  const errStart = validateDateInput(startVal, '開始日');
  if (errStart) { showError('result-count', errStart); return; }
  const errEnd = validateDateInput(endVal, '終了日');
  if (errEnd) { showError('result-count', errEnd); return; }

  const start = strToDate(startVal);
  const end = strToDate(endVal);

  if (start > end) {
    showError('result-count', '開始日は終了日より前の日付を入力してください。');
    return;
  }

  let count = 0;
  const current = new Date(start);
  while (current <= end) {
    if (isBusinessDay(current)) count++;
    current.setDate(current.getDate() + 1);
  }

  const totalDays = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
  showResult(
    'result-count',
    `${count}営業日`,
    `期間内の全日数: ${totalDays}日 / 土日祝: ${totalDays - count}日`
  );
  renderCalendar(start.getFullYear(), start.getMonth(), [], start, end);
}

// ===== 機能3: 締め日計算 =====
function calcClosing() {
  const baseVal = document.getElementById('closing-base').value;
  const closingDayVal = document.getElementById('closing-day').value;
  const paymentDayVal = document.getElementById('payment-day').value;
  const offsetVal = parseInt(document.getElementById('payment-month-offset').value, 10);

  const errBase = validateDateInput(baseVal, '基準日');
  if (errBase) { showError('result-closing', errBase); return; }

  const base = strToDate(baseVal);
  const baseYear = base.getFullYear();
  const baseMonth = base.getMonth(); // 0-indexed
  const baseDay = base.getDate();

  // 締め日を求める（当月の締め日）
  let closingDateRaw;
  if (closingDayVal === 'end') {
    // 月末
    closingDateRaw = new Date(baseYear, baseMonth + 1, 0);
  } else {
    const cDay = parseInt(closingDayVal, 10);
    const lastDay = new Date(baseYear, baseMonth + 1, 0).getDate();
    closingDateRaw = new Date(baseYear, baseMonth, Math.min(cDay, lastDay));
  }

  // 基準日が締め日より後の場合は翌月締め日を使用
  if (base > closingDateRaw) {
    if (closingDayVal === 'end') {
      closingDateRaw = new Date(baseYear, baseMonth + 2, 0);
    } else {
      const cDay = parseInt(closingDayVal, 10);
      const lastDay = new Date(baseYear, baseMonth + 2, 0).getDate();
      closingDateRaw = new Date(baseYear, baseMonth + 1, Math.min(cDay, lastDay));
    }
  }

  // 支払月 = 締め月 + offset
  const payMonth = closingDateRaw.getMonth() + offsetVal;
  const payYear = closingDateRaw.getFullYear() + Math.floor(payMonth / 12);
  const payMonthNorm = payMonth % 12;

  // 支払日を求める
  let payDateRaw;
  if (paymentDayVal === 'end') {
    payDateRaw = new Date(payYear, payMonthNorm + 1, 0);
  } else {
    const pDay = parseInt(paymentDayVal, 10);
    const lastDay = new Date(payYear, payMonthNorm + 1, 0).getDate();
    payDateRaw = new Date(payYear, payMonthNorm, Math.min(pDay, lastDay));
  }

  // 支払日が土日祝なら翌営業日に繰り越し
  let payDate = new Date(payDateRaw);
  while (!isBusinessDay(payDate)) {
    payDate.setDate(payDate.getDate() + 1);
  }

  const isAdjusted = dateToStr(payDate) !== dateToStr(payDateRaw);
  let sub = `締め日: ${formatDateJP(closingDateRaw)}`;
  if (isAdjusted) {
    sub += ` ／ 本来の支払日 ${formatDateJP(payDateRaw)} が休日のため翌営業日に繰り越し`;
  }

  showResult('result-closing', formatDateJP(payDate), sub);
  renderCalendar(payDate.getFullYear(), payDate.getMonth(), [dateToStr(payDate)]);
}

// ===== カレンダー描画 =====
/**
 * @param {number} year - 表示する年
 * @param {number} month - 表示する月（0-indexed）
 * @param {string[]} targetDates - ハイライトする日付の配列 ("YYYY-MM-DD")
 * @param {Date|null} rangeStart - 範囲カウント時の開始日
 * @param {Date|null} rangeEnd - 範囲カウント時の終了日
 */
function renderCalendar(year, month, targetDates = [], rangeStart = null, rangeEnd = null) {
  const section = document.getElementById('calendar-section');
  const titleEl = document.getElementById('calendar-title');
  const container = document.getElementById('calendar-container');

  titleEl.textContent = `${year}年 ${MONTHS_JP[month]} カレンダー`;
  section.removeAttribute('hidden');

  // テーブル生成（XSS安全: 数値・祝日名のみ動的挿入）
  const table = document.createElement('table');
  table.className = 'cal-table';
  table.setAttribute('role', 'grid');
  table.setAttribute('aria-label', `${year}年${month + 1}月カレンダー`);

  // ヘッダー行
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
  const thClasses = ['sun', '', '', '', '', '', 'sat'];
  dayNames.forEach((name, i) => {
    const th = document.createElement('th');
    th.textContent = name;
    if (thClasses[i]) th.className = thClasses[i];
    th.setAttribute('scope', 'col');
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  // ボディ
  const tbody = document.createElement('tbody');
  const firstDay = new Date(year, month, 1).getDay(); // 0=日
  const lastDate = new Date(year, month + 1, 0).getDate();

  let dayCount = 1;
  let row = document.createElement('tr');

  // 月初の空白セル
  for (let i = 0; i < firstDay; i++) {
    const td = document.createElement('td');
    td.className = 'empty';
    td.setAttribute('aria-hidden', 'true');
    row.appendChild(td);
  }

  while (dayCount <= lastDate) {
    if (row.children.length === 7) {
      tbody.appendChild(row);
      row = document.createElement('tr');
    }

    const td = document.createElement('td');
    const currentDate = new Date(year, month, dayCount);
    const dateStr = dateToStr(currentDate);
    const dow = currentDate.getDay();
    const holidayName = HOLIDAYS[dateStr];

    const isTarget = targetDates.includes(dateStr);
    const inRange = rangeStart && rangeEnd
      ? (currentDate >= rangeStart && currentDate <= rangeEnd && isBusinessDay(currentDate))
      : false;

    // クラス付与（優先: target > holiday > sunday/saturday > workday）
    const classes = [];
    if (isTarget || inRange) {
      classes.push('target');
    } else if (holidayName) {
      classes.push('holiday');
    } else if (dow === 0) {
      classes.push('sunday');
    } else if (dow === 6) {
      classes.push('saturday');
    } else {
      classes.push('workday');
    }
    td.className = classes.join(' ');

    // 日付テキスト（安全: 数値のみ）
    const daySpan = document.createElement('span');
    daySpan.textContent = String(dayCount);
    td.appendChild(daySpan);

    // 祝日名（安全: HOLIDAYS辞書の値のみ）
    if (holidayName) {
      const nameSpan = document.createElement('span');
      nameSpan.className = 'holiday-name';
      nameSpan.textContent = holidayName;
      td.appendChild(nameSpan);
    }

    td.setAttribute('aria-label', `${month + 1}月${dayCount}日`);
    row.appendChild(td);
    dayCount++;
  }

  // 残りの空白セル
  while (row.children.length < 7) {
    const td = document.createElement('td');
    td.className = 'empty';
    td.setAttribute('aria-hidden', 'true');
    row.appendChild(td);
  }
  tbody.appendChild(row);
  table.appendChild(tbody);

  container.replaceChildren(table);

  // スクロール
  section.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ===== 初期化 =====
(function init() {
  const today = dateToStr(new Date());

  // 各タブの日付入力にデフォルト値を設定
  const ndaysStart = document.getElementById('ndays-start');
  if (ndaysStart) ndaysStart.value = today;

  const countStart = document.getElementById('count-start');
  if (countStart) countStart.value = today;

  const countEnd = document.getElementById('count-end');
  if (countEnd) {
    // デフォルト: 今月末
    const now = new Date();
    const monthEnd = dateToStr(new Date(now.getFullYear(), now.getMonth() + 1, 0));
    countEnd.value = monthEnd;
  }

  const closingBase = document.getElementById('closing-base');
  if (closingBase) closingBase.value = today;
})();
