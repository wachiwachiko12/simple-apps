/* =============================================
   産前産後休暇 計算ツール — script.js
   ============================================= */

'use strict';

// ===== Constants =====
const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

// 出産手当金（健康保険）
// 一次資料: 全国健康保険協会（協会けんぽ）「出産手当金」
//   https://www.kyoukaikenpo.or.jp/benefit/childbirth/001
//   ・支給対象期間は「出産の日（実際の出産が予定日後のときは出産予定日）以前42日
//     （多胎妊娠の場合98日）から出産の翌日以後56日目まで」の範囲内で会社を休んだ期間。
//     「出産日は出産の日以前の期間に含まれます」とされ、出産日は産前42日のうちの1日。
//     「出産が予定日より遅れた場合、その遅れた期間についても」支給される。
//   ・1日あたりの額は、支給開始日以前の継続した12か月間の各月の標準報酬月額を
//     平均した額 ÷ 30日（10円未満四捨五入）× 2/3（1円未満四捨五入）。
//     公式の計算例: 17万円 ÷ 30 ≒ 5,670円 → 5,670円 × 2/3 ＝ 3,780円。
//   ・加入期間が12か月に満たない場合は、自分の平均額と「全被保険者の標準報酬月額の
//     平均額」のいずれか低い額で計算する。後者は支給開始日が令和7年4月1日以降は32万円
//     （令和7年3月31日以前は30万円）。
const POSTNATAL_BENEFIT_DAYS = 56;
const SHORT_ENROLLMENT_CAP = 320000;

// 育児休業給付金（雇用保険）
// 一次資料: 厚生労働省・都道府県労働局・ハローワーク
//   「令和８年８月１日から支給限度額が変更になります」（LL080731保02）
//   https://www.mhlw.go.jp/content/001728499.pdf
//   ・育児休業給付金 休業開始時の賃金月額 … 上限額 496,200円 ／ 下限額 96,090円
//   ・育児休業給付金 支給上限額（支給日数30日）
//       支給率67％ … 332,454円 ／ 支給率50％ … 248,100円
//   ・出生時育児休業給付金 支給上限額（28日）… 310,290円
//   ・出生後休業支援給付金 支給上限額（支給率13％・28日）… 60,205円
//   いずれも令和8年8月1日から令和9年7月31日までの額。
//   **毎年8月1日に改定されるため、8月になったら必ず更新すること。**
//
//   支給額 ＝ 休業開始時賃金日額 × 支給日数 × 67％
//   （育児休業の開始から通算180日まで。181日目以降は50％）
//
//   公表されているのは賃金「月額」の上限・下限なので、賃金日額の上限は
//   496,200 ÷ 30 ＝ 16,540円、下限は 96,090 ÷ 30 ＝ 3,203円。
//   この日額と上の式で、公表済みの支給上限額が端数まで一致する:
//     16,540 × 30 × 0.67 ＝ 332,454 … 公表値と一致
//     16,540 × 30 × 0.50 ＝ 248,100 … 公表値と一致
//     16,540 × 28 × 0.67 ＝ 310,290.4 → 310,290 … 公表値と一致
//     16,540 × 28 × 0.13 ＝  60,205.6 →  60,205 … 公表値と一致
//     3,203 × 30 × 0.67 ＝  64,380.3 →  64,380 … 公表されている支給下限額と一致
//   よって端数処理は「1円未満切り捨て」とみなせる。
const IKUJI_WAGE_MONTHLY_CAP   = 496200;
const IKUJI_WAGE_MONTHLY_FLOOR = 96090;
const IKUJI_DAILY_WAGE_CAP     = 16540;
const IKUJI_DAILY_WAGE_FLOOR   = 3203;
const IKUJI_RATE_HIGH          = 0.67;
const IKUJI_RATE_LOW           = 0.5;
const IKUJI_HIGH_RATE_DAYS     = 180;
const IKUJI_UNIT_DAYS          = 30;

// ===== DOM References =====
const dueDateInput    = document.getElementById('due-date');
const actualDateInput = document.getElementById('actual-date');
const multipleToggle  = document.getElementById('multiple-toggle');
const stdMonthlyInput = document.getElementById('std-monthly');
const shortEnrollToggle = document.getElementById('short-enrolled');
const ikujiWageInput  = document.getElementById('ikuji-wage');
const ikujiUntilSelect = document.getElementById('ikuji-until');
const calcBtn         = document.getElementById('calc-btn');
const resultsArea     = document.getElementById('results');
const copyBtn         = document.getElementById('copy-btn');
const copyMsg         = document.getElementById('copy-msg');
const diffSection     = document.getElementById('diff-section');
const diffSummaryPill = document.getElementById('diff-summary-pill');
const diffTableBody   = document.getElementById('diff-table-body');
const tlActualRow     = document.getElementById('tl-actual-row');
const tlLegendActual  = document.getElementById('tl-legend-actual');

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

// ===== 出産手当金 =====

/**
 * 標準報酬日額（平均標準報酬月額の30分の1。10円未満四捨五入）。
 * @param {number} avgMonthlyYen 支給開始日以前12か月の標準報酬月額の平均（円）
 * @returns {number} 円
 */
function calcStandardDailyWage(avgMonthlyYen) {
  const m = Number(avgMonthlyYen);
  if (!isFinite(m) || m <= 0) return 0;
  return Math.round(m / 30 / 10) * 10;
}

/**
 * 出産手当金の1日あたりの支給額（標準報酬日額の3分の2。1円未満四捨五入）。
 * @param {number} avgMonthlyYen 標準報酬月額の平均（円）
 * @param {boolean} isShortEnrollment 加入期間が12か月未満か
 * @returns {number} 円
 */
function calcDailyBenefit(avgMonthlyYen, isShortEnrollment) {
  const m = Number(avgMonthlyYen);
  if (!isFinite(m) || m <= 0) return 0;
  const base = isShortEnrollment ? Math.min(m, SHORT_ENROLLMENT_CAP) : m;
  return Math.round(calcStandardDailyWage(base) * 2 / 3);
}

/**
 * 出産手当金の支給対象日数。
 *
 * 産前側は「出産日（予定日より遅れたときは予定日）以前42日（多胎98日）」が上限で、
 * 出産が遅れた分はそのまま加算され、早まった分は減る。産後側は常に56日。
 *
 * @param {number} prenatalDays 42（単胎）または 98（多胎）
 * @param {number} diffDays 実際の出産日 − 出産予定日（遅れ＝正、早まり＝負）
 * @returns {{prenatal: number, postnatal: number, total: number}} 日数
 */
function calcBenefitDays(prenatalDays, diffDays) {
  const d = Number(diffDays) || 0;
  const prenatal = Math.max(0, prenatalDays + d);
  return { prenatal, postnatal: POSTNATAL_BENEFIT_DAYS, total: prenatal + POSTNATAL_BENEFIT_DAYS };
}

// ===== 育児休業給付金 =====

/**
 * 休業開始時賃金日額（上限・下限を適用した後の額）。
 *
 * 雇用保険の休業開始時賃金日額は「育児休業開始前6か月間の賃金総額 ÷ 180」で、
 * 平均月収を W とすると 6W ÷ 180 ＝ W ÷ 30 になる。
 * 賃金月額が上限額（496,200円）を超える人・下限額（96,090円）を下回る人は、
 * 実額ではなく上限額・下限額を用いて算定する。
 *
 * @param {number} avgMonthlyWageYen 育休開始前6か月の平均月収（円・額面）
 * @returns {number} 休業開始時賃金日額（円・1円未満切り捨て）。未入力時は0
 */
function calcIkujiDailyWage(avgMonthlyWageYen) {
  const w = Number(avgMonthlyWageYen);
  if (!isFinite(w) || w <= 0) return 0;
  const capped = Math.min(Math.max(w, IKUJI_WAGE_MONTHLY_FLOOR), IKUJI_WAGE_MONTHLY_CAP);
  return Math.floor(capped / 30);
}

/**
 * 育児休業給付金の支給額。通算180日までは67%、181日目以降は50%。
 *
 * @param {number} dailyWage 休業開始時賃金日額（calcIkujiDailyWage の戻り値）
 * @param {number} totalDays 育児休業の日数
 * @returns {{highDays:number, lowDays:number, high:number, low:number, total:number,
 *            monthlyHigh:number, monthlyLow:number}} 円・日数
 */
function calcIkujiBenefit(dailyWage, totalDays) {
  const d = Number(dailyWage);
  const n = Math.max(0, Math.floor(Number(totalDays) || 0));
  if (!isFinite(d) || d <= 0) {
    return { highDays: Math.min(n, IKUJI_HIGH_RATE_DAYS), lowDays: Math.max(0, n - IKUJI_HIGH_RATE_DAYS),
             high: 0, low: 0, total: 0, monthlyHigh: 0, monthlyLow: 0 };
  }
  const highDays = Math.min(n, IKUJI_HIGH_RATE_DAYS);
  const lowDays  = n - highDays;
  const high = Math.floor(d * highDays * IKUJI_RATE_HIGH);
  const low  = Math.floor(d * lowDays  * IKUJI_RATE_LOW);
  return {
    highDays,
    lowDays,
    high,
    low,
    total: high + low,
    monthlyHigh: Math.floor(d * IKUJI_UNIT_DAYS * IKUJI_RATE_HIGH),
    monthlyLow:  Math.floor(d * IKUJI_UNIT_DAYS * IKUJI_RATE_LOW)
  };
}

/**
 * 月数を足した日付を返す。足した先に同じ日が存在しない場合（1月31日＋1か月など）は
 * その月の末日に丸める。
 * @param {Date} date
 * @param {number} months
 * @returns {Date}
 */
function addMonthsClamped(date, months) {
  const day = date.getDate();
  const d = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, lastDay));
  return d;
}

/**
 * 母親の育児休業の日数。
 *
 * 開始日は産後休業の終了翌日（出産日の57日後）、終了日は子が所定の月齢に
 * 達する日＝「誕生日の○か月後の前日」。日数は両端を含めて数える。
 *
 * @param {Date|string} birthDate 出産日（Date または YYYY-MM-DD）
 * @param {number} untilMonths 12（1歳）/ 18（1歳6か月）/ 24（2歳）
 * @returns {{start: Date, end: Date, days: number}}
 */
function calcIkujiLeaveDays(birthDate, untilMonths) {
  const birth = birthDate instanceof Date
    ? new Date(birthDate.getFullYear(), birthDate.getMonth(), birthDate.getDate())
    : new Date(String(birthDate) + 'T00:00:00');
  const start = new Date(birth);
  start.setDate(birth.getDate() + POSTNATAL_BENEFIT_DAYS + 1);
  const end = addMonthsClamped(birth, Math.max(0, Math.floor(Number(untilMonths) || 0)));
  end.setDate(end.getDate() - 1);
  const days = Math.round((end - start) / 86400000) + 1;
  return { start, end, days: Math.max(0, days) };
}

// ===== Diff calculation =====
function calcDiff(dueDateStr, actualDateStr, isMultiple) {
  const dueDate    = new Date(dueDateStr    + 'T00:00:00');
  const actualDate = new Date(actualDateStr + 'T00:00:00');
  const diffDays   = Math.round((actualDate - dueDate) / 86400000); // positive = late

  const prenatalDays = isMultiple ? 98 : 42;

  // Actual-based dates (prenatalStart unchanged)
  const prenatalStartA  = new Date(dueDate);
  prenatalStartA.setDate(dueDate.getDate() - prenatalDays);

  const postnatalStartA = new Date(actualDate);
  postnatalStartA.setDate(actualDate.getDate() + 1);

  const postnatalEndA   = new Date(actualDate);
  postnatalEndA.setDate(actualDate.getDate() + 56);

  const ikujiStartA     = new Date(postnatalEndA);
  ikujiStartA.setDate(postnatalEndA.getDate() + 1);

  const prenatalDurActual = prenatalDays + diffDays;

  return {
    diffDays,
    prenatalStart: prenatalStartA,   // same as due-based
    prenatalEnd: actualDate,
    prenatalDuration: prenatalDurActual,
    postnatalStart: postnatalStartA,
    postnatalEnd: postnatalEndA,
    ikujiStart: ikujiStartA
  };
}

// ===== Render Diff section =====
function renderDiff(calcDue, actualResult, diffDays) {
  // Summary pill
  let pillText, pillClass;
  if (diffDays === 0) {
    pillText = '予定日どおり出産'; pillClass = 'same';
  } else if (diffDays < 0) {
    pillText = `予定より${Math.abs(diffDays)}日早く出産`; pillClass = 'early';
  } else {
    pillText = `予定より${diffDays}日遅く出産`; pillClass = 'late';
  }
  diffSummaryPill.textContent = pillText;
  diffSummaryPill.className   = `diff-summary-pill ${pillClass}`;

  // Table rows
  const rows = [
    {
      label: '産前休暇 終了日',
      due:    formatDate(calcDue.dueDate),
      actual: formatDate(actualResult.prenatalEnd),
      delta:  diffDays
    },
    {
      label: '産前休暇 日数',
      due:    `${calcDue.prenatalDays}日間`,
      actual: `${actualResult.prenatalDuration}日間`,
      delta:  diffDays
    },
    {
      label: '産後休暇 開始日',
      due:    formatDate(calcDue.postnatalStart),
      actual: formatDate(actualResult.postnatalStart),
      delta:  diffDays
    },
    {
      label: '産後休暇 終了日',
      due:    formatDate(calcDue.postnatalEnd),
      actual: formatDate(actualResult.postnatalEnd),
      delta:  diffDays
    },
    {
      label: '育休 開始可能日',
      due:    formatDate(calcDue.ikujiStart),
      actual: formatDate(actualResult.ikujiStart),
      delta:  diffDays
    }
  ];

  diffTableBody.innerHTML = rows.map(r => {
    const d = r.delta;
    const pillClass = d < 0 ? 'neg' : d > 0 ? 'pos' : 'zero';
    const pillLabel = d === 0 ? '変更なし' : (d > 0 ? `+${d}日` : `${d}日`);
    return `<tr>
      <td class="row-label">${r.label}</td>
      <td class="col-due" style="font-size:0.78rem">${r.due}</td>
      <td class="col-actual" style="font-size:0.78rem">${r.actual}</td>
      <td><span class="delta-pill ${pillClass}">${pillLabel}</span></td>
    </tr>`;
  }).join('');

  diffSection.removeAttribute('hidden');
}

// ===== Render Actual Timeline row =====
function renderActualTimeline(prenatalDays, diffDays) {
  const actualPrenatalDays = prenatalDays + diffDays;
  document.getElementById('tl-actual-prenatal').style.flex = String(Math.max(1, actualPrenatalDays));
  document.getElementById('tl-actual-postnatal').style.flex = '56';
  tlActualRow.removeAttribute('hidden');
  tlLegendActual.removeAttribute('hidden');
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

  // Hide diff section until actual date is processed
  diffSection.setAttribute('hidden', '');
  tlActualRow.setAttribute('hidden', '');
  tlLegendActual.setAttribute('hidden', '');

  // Show results
  resultsArea.removeAttribute('hidden');
}

// ===== Render 出産手当金 =====

/**
 * 出産手当金カードを描画する。
 * 標準報酬月額が未入力でも、支給対象日数は日程だけで決まるので表示する。
 * @param {number} prenatalDays 42 または 98
 * @param {number} diffDays 実際の出産日 − 出産予定日
 */
function renderBenefit(prenatalDays, diffDays) {
  const yen = (n) => '¥' + Math.round(n).toLocaleString('ja-JP');
  const days = calcBenefitDays(prenatalDays, diffDays);
  const stdMonthly = Number(stdMonthlyInput.value);
  const isShort = !!shortEnrollToggle.checked;

  document.getElementById('benefit-days').textContent = `${days.total}日`;
  document.getElementById('benefit-days-breakdown').textContent =
    `産前 ${days.prenatal}日 ／ 産後 ${days.postnatal}日`;

  const dailyEl = document.getElementById('benefit-daily');
  const totalEl = document.getElementById('benefit-total');
  const noteEl  = document.getElementById('benefit-note');

  if (!isFinite(stdMonthly) || stdMonthly <= 0) {
    dailyEl.textContent = '—';
    totalEl.textContent = '—';
    noteEl.innerHTML = '<i class="bi bi-info-circle"></i> 入力欄に<strong>標準報酬月額</strong>を入れると、1日あたりの支給額と支給総額の目安も表示します。日数は休業した期間が支給対象の範囲に収まっている場合の上限です';
    return;
  }

  const capped = isShort && stdMonthly > SHORT_ENROLLMENT_CAP;
  const base = capped ? SHORT_ENROLLMENT_CAP : stdMonthly;
  const daily = calcDailyBenefit(stdMonthly, isShort);

  dailyEl.textContent = yen(daily);
  totalEl.textContent = yen(daily * days.total);
  noteEl.innerHTML = '<i class="bi bi-calculator"></i> ' + yen(base) + ' ÷ 30日＝' +
    yen(calcStandardDailyWage(base)) + '（10円未満四捨五入）の3分の2＝' + yen(daily) +
    '（1円未満四捨五入）× ' + days.total + '日' +
    (capped ? '。加入期間が12か月未満のため、上限の32万円で計算しています' : '') +
    '。休業中に給与が支払われる場合は、その分が調整されます';
}

// ===== Render 育児休業給付金 =====

/**
 * 育児休業給付金カードを描画する。
 * 平均月収が未入力でも、育児休業の期間と日数は日程だけで決まるので表示する。
 * @param {Date} birthDate 出産日（実際の出産日が未入力なら出産予定日）
 */
function renderIkuji(birthDate) {
  const yen = (n) => '¥' + Math.round(n).toLocaleString('ja-JP');
  const untilMonths = Number(ikujiUntilSelect.value) || 12;
  const leave = calcIkujiLeaveDays(birthDate, untilMonths);
  const wage  = Number(ikujiWageInput.value);
  const daily = calcIkujiDailyWage(wage);
  const b     = calcIkujiBenefit(daily, leave.days);

  document.getElementById('ikuji-period').textContent =
    formatDate(leave.start) + ' 〜 ' + formatDate(leave.end);
  document.getElementById('ikuji-days').textContent =
    `${leave.days}日間（67%が${b.highDays}日 ／ 50%が${b.lowDays}日）`;

  const dailyEl   = document.getElementById('ikuji-daily-wage');
  const highEl    = document.getElementById('ikuji-monthly-high');
  const lowEl     = document.getElementById('ikuji-monthly-low');
  const totalEl   = document.getElementById('ikuji-total');
  const noteEl    = document.getElementById('ikuji-note');

  if (daily <= 0) {
    dailyEl.textContent = '—';
    highEl.textContent  = '—';
    lowEl.textContent   = '—';
    totalEl.textContent = '—';
    noteEl.innerHTML = '<i class="bi bi-info-circle"></i> 入力欄に<strong>育休前6か月の平均月収</strong>を入れると、1か月あたりの支給額と総額の目安も表示します。日数は育児休業を途中で切り上げず、就業もしなかった場合の上限です';
    return;
  }

  const atCap   = wage > IKUJI_WAGE_MONTHLY_CAP;
  const atFloor = wage < IKUJI_WAGE_MONTHLY_FLOOR;

  dailyEl.textContent = yen(daily);
  highEl.textContent  = yen(b.monthlyHigh);
  lowEl.textContent   = yen(b.monthlyLow);
  totalEl.textContent = yen(b.total);

  let calcNote = '<i class="bi bi-calculator"></i> ';
  if (atCap) {
    calcNote += '賃金月額が上限額の' + yen(IKUJI_WAGE_MONTHLY_CAP) + 'を超えるため、上限額で算定しています。';
  } else if (atFloor) {
    calcNote += '賃金月額が下限額の' + yen(IKUJI_WAGE_MONTHLY_FLOOR) + 'を下回るため、下限額で算定しています。';
  }
  calcNote += yen(atCap ? IKUJI_WAGE_MONTHLY_CAP : atFloor ? IKUJI_WAGE_MONTHLY_FLOOR : wage) +
    ' ÷ 30日＝' + yen(daily) + '（休業開始時賃金日額）× 67%（181日目以降は50%）で計算しています。' +
    '実際は30日ごとの支給単位期間ごとに支給されるため、端数処理で数円の差が出ます。' +
    '休業中に給与が支払われる場合や就業した日がある場合は減額・不支給になります。' +
    '<strong>出生後休業支援給付金（13%の上乗せ）は含んでいません</strong>';
  noteEl.innerHTML = calcNote;
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
  const lines = [
    '【産前産後休暇 計算結果】',
    `出産予定日: ${formatDatePlain(dueDate)}（${label}）`,
    '---',
    `産前休暇: ${formatDatePlain(prenatalStart)} 〜 ${formatDatePlain(dueDate)}（${prenatalDays}日間）`,
    `産後休暇: ${formatDatePlain(postnatalStart)} 〜 ${formatDatePlain(postnatalEnd)}（56日間）`,
    `合計休暇: ${totalDays}日間`,
    `育児休業開始可能日: ${formatDatePlain(ikujiStart)}`
  ];

  const benefitDays = document.getElementById('benefit-days').textContent;
  const benefitTotal = document.getElementById('benefit-total').textContent;
  if (benefitDays && benefitDays !== '-') {
    lines.push('---');
    lines.push(`出産手当金 支給対象日数: ${benefitDays}`);
    if (benefitTotal && benefitTotal !== '—' && benefitTotal !== '-') {
      lines.push(`出産手当金 支給総額の目安: ${benefitTotal}`);
    }
  }

  const ikujiPeriod = document.getElementById('ikuji-period').textContent;
  const ikujiDays   = document.getElementById('ikuji-days').textContent;
  const ikujiTotal  = document.getElementById('ikuji-total').textContent;
  if (ikujiPeriod && ikujiPeriod !== '-') {
    lines.push('---');
    lines.push(`育児休業の期間: ${ikujiPeriod}`);
    lines.push(`育児休業給付金 支給対象日数: ${ikujiDays}`);
    if (ikujiTotal && ikujiTotal !== '—' && ikujiTotal !== '-') {
      lines.push(`育児休業給付金 支給総額の目安: ${ikujiTotal}`);
    }
  }

  lines.push('---');
  lines.push('計算ツール: https://keisanlab.jp/apps/maternity-leave-calc/');
  return lines.join('\n');
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

function runCalculation() {
  const dueDateStr    = dueDateInput.value;
  const actualDateStr = actualDateInput.value;
  const isMultiple    = multipleToggle.checked;

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

  lastCalc = calculate(dueDateStr, isMultiple);
  lastIsMultiple = isMultiple;
  renderResults(lastCalc, isMultiple);

  // Diff section
  let diffDays = 0;
  if (actualDateStr) {
    const actual = calcDiff(dueDateStr, actualDateStr, isMultiple);
    diffDays = actual.diffDays;
    renderDiff(lastCalc, actual, actual.diffDays);
    renderActualTimeline(lastCalc.prenatalDays, actual.diffDays);
  }

  // 出産手当金（支給対象日数は実際の出産日のずれで変わるので差分の後に描画）
  renderBenefit(lastCalc.prenatalDays, diffDays);

  // 育児休業給付金（育休の開始・終了は実際の出産日で決まる）
  const birthDate = actualDateStr ? new Date(actualDateStr + 'T00:00:00') : lastCalc.dueDate;
  renderIkuji(birthDate);
}

calcBtn.addEventListener('click', () => {
  runCalculation();
  setTimeout(() => {
    // 広告は結果のすぐ上にある。そこへスクロールすると
    // 広告→結果の順に画面へ入る。広告が無い場合は結果へ。
    const target = document.getElementById('ad-slot') || resultsArea;
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 80);
});

multipleToggle.addEventListener('change', () => {
  if (dueDateInput.value && lastCalc) runCalculation();
});

dueDateInput.addEventListener('change', () => {
  if (!resultsArea.hasAttribute('hidden') && dueDateInput.value) runCalculation();
});

actualDateInput.addEventListener('change', () => {
  if (!resultsArea.hasAttribute('hidden') && dueDateInput.value) runCalculation();
});

stdMonthlyInput.addEventListener('input', () => {
  if (!resultsArea.hasAttribute('hidden') && dueDateInput.value) runCalculation();
});

shortEnrollToggle.addEventListener('change', () => {
  if (!resultsArea.hasAttribute('hidden') && dueDateInput.value) runCalculation();
});

ikujiWageInput.addEventListener('input', () => {
  if (!resultsArea.hasAttribute('hidden') && dueDateInput.value) runCalculation();
});

ikujiUntilSelect.addEventListener('change', () => {
  if (!resultsArea.hasAttribute('hidden') && dueDateInput.value) runCalculation();
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
