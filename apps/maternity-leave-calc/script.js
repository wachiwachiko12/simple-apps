/* =============================================
   産前産後休暇 計算ツール — script.js
   ============================================= */

'use strict';

// ===== Constants =====
const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

// ===== DOM References =====
const dueDateInput = document.getElementById('due-date');
const multipleToggle = document.getElementById('multiple-toggle');
const calcBtn = document.getElementById('calc-btn');
const resultsArea = document.getElementById('results');
const copyBtn = document.getElementById('copy-btn');
const copyMsg = document.getElementById('copy-msg');

// ===== Date Utilities =====

/**
 * Format a Date as "YYYY年MM月DD日（曜）"
 * @param {Date} d
 * @returns {string}
 */
function formatDate(d) {
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${WEEKDAYS[d.getDay()]}）`;
}

/**
 * Format a Date as "M/D" for timeline labels
 * @param {Date} d
 * @returns {string}
 */
function formatDateShort(d) {
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/**
 * Format a Date without weekday (for copy text)
 * @param {Date} d
 * @returns {string}
 */
function formatDatePlain(d) {
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

/**
 * Convert total days to "X週Y日（Z日間）" string
 * @param {number} days
 * @returns {string}
 */
function formatDuration(days) {
  const weeks = Math.floor(days / 7);
  const rem = days % 7;
  if (weeks === 0) return `${days}日間`;
  if (rem === 0) return `${weeks}週間（${days}日間）`;
  return `${weeks}週${rem}日（${days}日間）`;
}

// ===== Core Calculation =====

/**
 * Calculate all maternity/paternity leave dates.
 * @param {string} dueDateStr - ISO date string (YYYY-MM-DD)
 * @param {boolean} isMultiple - true if multiple birth
 * @returns {object} Calculated dates
 */
function calculate(dueDateStr, isMultiple) {
  const dueDate = new Date(dueDateStr + 'T00:00:00');
  const prenatalDays = isMultiple ? 98 : 42;

  // 産前休暇開始日 = 出産予定日の prenatalDays 日前
  const prenatalStart = new Date(dueDate);
  prenatalStart.setDate(dueDate.getDate() - prenatalDays);

  // 産後休暇開始日 = 出産翌日
  const postnatalStart = new Date(dueDate);
  postnatalStart.setDate(dueDate.getDate() + 1);

  // 産後休暇終了日 = 出産翌日から56日目（= 出産日 + 56日）
  const postnatalEnd = new Date(dueDate);
  postnatalEnd.setDate(dueDate.getDate() + 56);

  // 育児休業開始可能日 = 産後休暇終了翌日
  const ikujiStart = new Date(postnatalEnd);
  ikujiStart.setDate(postnatalEnd.getDate() + 1);

  // 産後6週（42日後）= 申出＋医師許可で就業可能な日
  const postnatalEarlyReturn = new Date(dueDate);
  postnatalEarlyReturn.setDate(dueDate.getDate() + 42);

  return {
    prenatalStart,
    dueDate,
    postnatalStart,
    postnatalEnd,
    postnatalEarlyReturn,
    ikujiStart,
    prenatalDays
  };
}

// ===== Render Results =====

/**
 * Render all result cards and timeline.
 * @param {object} calc - Result of calculate()
 * @param {boolean} isMultiple
 */
function renderResults(calc, isMultiple) {
  const {
    prenatalStart, dueDate, postnatalStart, postnatalEnd, ikujiStart, prenatalDays
  } = calc;

  // --- Card 1: 産前休暇 ---
  const prenatalBadge = document.getElementById('prenatal-badge');
  prenatalBadge.textContent = isMultiple ? '多胎: 14週間前（98日）' : '単胎: 6週間前（42日）';

  document.getElementById('prenatal-start-date').textContent = formatDate(prenatalStart);
  document.getElementById('prenatal-end-date').textContent = formatDate(dueDate) + '（出産予定日）';
  document.getElementById('prenatal-duration').textContent = formatDuration(prenatalDays);

  // --- Card 2: 産後休暇 ---
  document.getElementById('postnatal-start-date').textContent = formatDate(postnatalStart) + '（出産翌日）';
  document.getElementById('postnatal-end-date').textContent = formatDate(postnatalEnd);
  document.getElementById('postnatal-duration').textContent = '8週間（56日間）';

  // --- Card 3: 合計 ---
  const totalDays = prenatalDays + 1 + 56; // 産前 + 出産日 + 産後
  document.getElementById('total-duration').textContent = `${totalDays}日間`;
  document.getElementById('ikuji-start-date').textContent = formatDate(ikujiStart);

  // --- Timeline ---
  renderTimeline(calc);

  // Show results
  resultsArea.removeAttribute('hidden');
}

// ===== Timeline =====

/**
 * Render the visual timeline.
 * @param {object} calc
 */
function renderTimeline(calc) {
  const { prenatalStart, dueDate, postnatalEnd, prenatalDays } = calc;

  // Set flex values for proportional display
  const tlPrenatal = document.getElementById('tl-prenatal');
  const tlPostnatal = document.getElementById('tl-postnatal');
  tlPrenatal.style.flex = String(prenatalDays);
  tlPostnatal.style.flex = '56';

  // Date labels
  document.getElementById('tl-date-start').textContent = `産前開始 ${formatDateShort(prenatalStart)}`;
  document.getElementById('tl-date-due').textContent = `出産予定日 ${formatDateShort(dueDate)}`;
  document.getElementById('tl-date-end').textContent = `産後終了 ${formatDateShort(postnatalEnd)}`;

  // Today marker
  renderTodayMarker(calc);
}

/**
 * Render the "今日" marker on the timeline if today is within the leave period.
 * @param {object} calc
 */
function renderTodayMarker(calc) {
  const { prenatalStart, postnatalEnd, prenatalDays } = calc;
  const todayMarker = document.getElementById('tl-today-marker');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startDay = new Date(prenatalStart);
  startDay.setHours(0, 0, 0, 0);
  const endDay = new Date(postnatalEnd);
  endDay.setHours(0, 0, 0, 0);

  if (today < startDay || today > endDay) {
    todayMarker.hidden = true;
    return;
  }

  todayMarker.hidden = false;

  // Calculate today's offset as a percentage of the total leave period
  const totalMs = endDay.getTime() - startDay.getTime();
  const todayMs = today.getTime() - startDay.getTime();
  const pct = Math.max(0, Math.min(100, (todayMs / totalMs) * 100));
  todayMarker.style.left = `${pct}%`;
}

// ===== Copy to Clipboard =====

/**
 * Build the copy text string.
 * @param {object} calc
 * @param {boolean} isMultiple
 * @returns {string}
 */
function buildCopyText(calc, isMultiple) {
  const { prenatalStart, dueDate, postnatalStart, postnatalEnd, ikujiStart, prenatalDays } = calc;
  const totalDays = prenatalDays + 1 + 56;
  const label = isMultiple ? '多胎（双子・三つ子等）' : '単胎';
  return [
    '【産前産後休暇 計算結果】',
    `出産予定日: ${formatDatePlain(dueDate)}（${label}）`,
    '---',
    `産前休暇: ${formatDatePlain(prenatalStart)} 〜 ${formatDatePlain(dueDate)}（${prenatalDays}日間）`,
    `産後休暇: ${formatDatePlain(postnatalStart)} 〜 ${formatDatePlain(postnatalEnd)}（56日間）`,
    `合計休暇: ${totalDays}日間`,
    `育児休業開始可能日: ${formatDatePlain(ikujiStart)}`,
    '---',
    '計算ツール: https://keisanlab.jp/apps/maternity-leave-calc/'
  ].join('\n');
}

let copyMsgTimer = null;

/**
 * Show the copy success message temporarily.
 */
function showCopyMsg() {
  copyMsg.removeAttribute('hidden');
  if (copyMsgTimer) clearTimeout(copyMsgTimer);
  copyMsgTimer = setTimeout(() => {
    copyMsg.setAttribute('hidden', '');
  }, 2500);
}

// ===== State =====
let lastCalc = null;
let lastIsMultiple = false;

// ===== Event Handlers =====

calcBtn.addEventListener('click', () => {
  const dueDateStr = dueDateInput.value;
  if (!dueDateStr) {
    dueDateInput.focus();
    dueDateInput.style.borderColor = '#ef4444';
    dueDateInput.style.boxShadow = '0 0 0 3px rgba(239,68,68,0.18)';
    setTimeout(() => {
      dueDateInput.style.borderColor = '';
      dueDateInput.style.boxShadow = '';
    }, 1800);
    return;
  }

  const isMultiple = multipleToggle.checked;
  lastCalc = calculate(dueDateStr, isMultiple);
  lastIsMultiple = isMultiple;
  renderResults(lastCalc, isMultiple);

  // Smooth scroll to results on mobile
  setTimeout(() => {
    resultsArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 80);
});

// Re-calculate when toggle changes and a date is already set
multipleToggle.addEventListener('change', () => {
  if (dueDateInput.value && lastCalc) {
    const isMultiple = multipleToggle.checked;
    lastCalc = calculate(dueDateInput.value, isMultiple);
    lastIsMultiple = isMultiple;
    renderResults(lastCalc, isMultiple);
  }
});

// Also recalc on date change if results are already visible
dueDateInput.addEventListener('change', () => {
  if (!resultsArea.hasAttribute('hidden') && dueDateInput.value) {
    const isMultiple = multipleToggle.checked;
    lastCalc = calculate(dueDateInput.value, isMultiple);
    lastIsMultiple = isMultiple;
    renderResults(lastCalc, isMultiple);
  }
});

copyBtn.addEventListener('click', () => {
  if (!lastCalc) return;
  const text = buildCopyText(lastCalc, lastIsMultiple);
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(showCopyMsg).catch(() => {
      fallbackCopy(text);
    });
  } else {
    fallbackCopy(text);
  }
});

/**
 * Fallback clipboard copy using textarea.
 * @param {string} text
 */
function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  try {
    document.execCommand('copy');
    showCopyMsg();
  } catch (e) {
    // Silent fail
  }
  document.body.removeChild(ta);
}

// ===== Set default date to roughly 6 weeks from today =====
(function setDefaultDate() {
  const today = new Date();
  const suggestion = new Date(today);
  suggestion.setDate(today.getDate() + 7 * 14); // ~14 weeks from today as a neutral default
  const yyyy = suggestion.getFullYear();
  const mm = String(suggestion.getMonth() + 1).padStart(2, '0');
  const dd = String(suggestion.getDate()).padStart(2, '0');
  dueDateInput.value = `${yyyy}-${mm}-${dd}`;
})();

// ===== Initialize AdSense =====
(function initAds() {
  try {
    (window.adsbygoogle = window.adsbygoogle || []).push({});
    (window.adsbygoogle = window.adsbygoogle || []).push({});
  } catch (e) {
    // Silent
  }
})();
