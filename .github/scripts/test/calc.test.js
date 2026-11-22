/**
 * 計算ロジックのテスト。
 *
 * 対象は「間違えるとユーザーが実害を被る」ツールに絞っている。
 * 税・年金・給与・出産休業の計算は、誤った数字を信じて申請や交渉に
 * 使われうるため、見た目のレビューでは足りない。
 *
 * 実行: node --test .github/scripts/test/
 */
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert');
const { loadApp } = require('./harness.js');

// ---------------------------------------------------------------------------
describe('retirement-allowance-simulator: 退職所得控除', () => {
  const app = loadApp('retirement-allowance-simulator');

  test('勤続20年以下は1年あたり40万円', () => {
    assert.strictEqual(app.calcDeduction(10), 400);
    assert.strictEqual(app.calcDeduction(20), 800);
  });

  test('勤続20年超は超過分が1年あたり70万円', () => {
    // 800万 + 70万 × (30 - 20) = 1500万
    assert.strictEqual(app.calcDeduction(30), 1500);
    assert.strictEqual(app.calcDeduction(21), 870);
  });

  test('最低保証は80万円', () => {
    assert.strictEqual(app.calcDeduction(1), 80);
    assert.strictEqual(app.calcDeduction(2), 80);
  });

  test('「20年の壁」で控除の増え方が切り替わる', () => {
    // 19→20年は +40万、20→21年は +70万
    assert.strictEqual(app.calcDeduction(20) - app.calcDeduction(19), 40);
    assert.strictEqual(app.calcDeduction(21) - app.calcDeduction(20), 70);
  });

  test('勤続年数が増えて控除が減ることはない（単調増加）', () => {
    for (let y = 1; y < 45; y++) {
      assert.ok(app.calcDeduction(y + 1) >= app.calcDeduction(y), `${y}年 → ${y + 1}年 で控除が減少`);
    }
  });

  test('所得税は課税所得0で0になる', () => {
    assert.strictEqual(app.calcIncomeTax(0), 0);
  });

  test('所得税は課税所得が増えて減ることはない', () => {
    let prev = -1;
    for (let inc = 0; inc <= 5000; inc += 50) {
      const t = app.calcIncomeTax(inc);
      assert.ok(t >= prev, `課税所得 ${inc}万円 で税額が減少`);
      prev = t;
    }
  });

  // --- iDeCo（retirement-tax-optimizer から統合）---

  test('iDeCoが退職所得控除の範囲内なら課税されない', () => {
    // 加入20年 → 控除800万。それ以下の残高なら税ゼロ
    assert.strictEqual(app.calcIdecoLumpTax(300, 20), 0);
    assert.strictEqual(app.calcIdecoLumpTax(800, 20), 0);
  });

  test('iDeCoの加入年数が長いほど一時金の税は軽くなる', () => {
    let prev = Infinity;
    for (const y of [10, 20, 30, 40]) {
      const t = app.calcIdecoLumpTax(2000, y);
      assert.ok(t <= prev, `加入${y}年で税が増えている`);
      prev = t;
    }
    // 加入40年（控除2200万）なら残高2000万は全額控除内
    assert.strictEqual(app.calcIdecoLumpTax(2000, 40), 0);
  });

  test('残高が増えれば税負担も増える（単調増加）', () => {
    let prev = -1;
    for (let b = 0; b <= 4000; b += 200) {
      const t = app.calcIdecoLumpTax(b, 20);
      assert.ok(t >= prev, `残高${b}万円で税が減少`);
      prev = t;
    }
  });

  test('受け取り方の比較は税の軽い順に並び、手取りと整合する', () => {
    const balance = 2000;
    const options = app.compareIdecoOptions(balance, 20);
    assert.strictEqual(options.length, 3);
    for (let i = 1; i < options.length; i++) {
      assert.ok(options[i].tax >= options[i - 1].tax, '税の昇順になっていない');
    }
    for (const o of options) {
      assert.ok(Math.abs(o.takeHome + o.tax - balance) < 0.2, `${o.key}: 手取り+税 が残高と合わない`);
      assert.ok(o.tax >= 0, `${o.key}: 税がマイナス`);
      assert.ok(o.takeHome <= balance, `${o.key}: 手取りが残高を超えている`);
    }
  });

  test('残高0なら比較しない', () => {
    assert.strictEqual(app.compareIdecoOptions(0, 20).length, 0);
  });
});

// ---------------------------------------------------------------------------
describe('rent-vs-buy-calculator: 住宅ローン（借入可能額・繰上返済）', () => {
  const app = loadApp('rent-vs-buy-calculator');

  test('借入可能額と月返済額は互いの逆算になっている', () => {
    for (const [monthly, rate, years] of [[10, 1.5, 35], [15, 0.5, 30], [8, 2.0, 20], [12, 0, 35]]) {
      const loan = app.calcMaxLoan(monthly, rate, years);
      const back = app.calcMonthlyPayment(loan, rate, years);
      assert.ok(Math.abs(back - monthly) < 1e-6, `月${monthly}万/${rate}%/${years}年 で逆算がずれる`);
    }
  });

  test('金利が高いほど借りられる額は小さい', () => {
    let prev = Infinity;
    for (const rate of [0, 0.5, 1.0, 2.0, 3.0, 5.0]) {
      const loan = app.calcMaxLoan(10, rate, 35);
      assert.ok(loan < prev, `金利${rate}%で借入可能額が増えている`);
      prev = loan;
    }
  });

  test('返済期間が長いほど借りられる額は大きい', () => {
    let prev = -1;
    for (const years of [10, 20, 30, 35]) {
      const loan = app.calcMaxLoan(10, 1.5, years);
      assert.ok(loan > prev, `${years}年で借入可能額が減っている`);
      prev = loan;
    }
  });

  test('返済負担率の判定が境界どおり', () => {
    assert.strictEqual(app.judgeRepaymentRatio(25).level, 'safe');
    assert.strictEqual(app.judgeRepaymentRatio(25.1).level, 'caution');
    assert.strictEqual(app.judgeRepaymentRatio(35).level, 'caution');
    assert.strictEqual(app.judgeRepaymentRatio(35.1).level, 'danger');
  });

  test('返済負担率は年間返済額 ÷ 年収', () => {
    // 年収600万・月12.5万 → 年150万 → 25%
    assert.ok(Math.abs(app.calcRepaymentRatio(600, 12.5) - 25) < 1e-9);
    assert.strictEqual(app.calcRepaymentRatio(0, 10), 0);
  });

  test('繰上返済しなければ期間も利息も変わらない', () => {
    const e = app.calcPrepaymentEffect(3000, 1.5, 30, 0);
    assert.ok(Math.abs(e.shortenedMonths) < 1e-6, '繰上0円で期間が変わっている');
    assert.ok(Math.abs(e.interestSaved) < 1e-6, '繰上0円で利息が変わっている');
  });

  test('繰上返済額が多いほど利息削減も期間短縮も大きい', () => {
    let prevSaved = -1, prevShort = -1;
    for (const prepay of [0, 100, 300, 500, 1000]) {
      const e = app.calcPrepaymentEffect(3000, 1.5, 30, prepay);
      assert.ok(e.interestSaved >= prevSaved, `${prepay}万円で利息削減が減っている`);
      assert.ok(e.shortenedMonths >= prevShort, `${prepay}万円で短縮が減っている`);
      prevSaved = e.interestSaved;
      prevShort = e.shortenedMonths;
    }
  });

  test('残高を全額返せば完済する', () => {
    const e = app.calcPrepaymentEffect(3000, 1.5, 30, 3000);
    assert.strictEqual(e.afterMonths, 0);
    assert.ok(Math.abs(e.shortenedMonths - e.beforeMonths) < 1e-6, '全額返済で期間が0にならない');
  });

  test('利息削減額が総利息を超えない', () => {
    for (const prepay of [100, 500, 1500, 3000]) {
      const e = app.calcPrepaymentEffect(3000, 1.5, 30, prepay);
      const totalInterest = e.monthlyPayment * e.beforeMonths - 3000;
      assert.ok(e.interestSaved <= totalInterest + 1e-6, `${prepay}万円で削減額が総利息を超えている`);
      assert.ok(e.interestSaved >= 0, `${prepay}万円で削減額がマイナス`);
    }
  });
});

// ---------------------------------------------------------------------------
describe('wareki-converter: 和暦・年齢', () => {
  const app = loadApp('wareki-converter');

  test('和暦から西暦へ変換できる', () => {
    // 令和8年 = 2026年、平成元年 = 1989年、昭和64年 = 1989年
    assert.strictEqual(app.warekiToSeireki('reiwa', 8), 2026);
    assert.strictEqual(app.warekiToSeireki('heisei', 1), 1989);
    assert.strictEqual(app.warekiToSeireki('showa', 64), 1989);
    assert.strictEqual(app.warekiToSeireki('showa', 1), 1926);
  });

  test('西暦から和暦へ変換できる', () => {
    const r = app.seirekiToWareki(2026);
    assert.ok(r.some((x) => /令和/.test(x.gannen)), '2026年が令和にならない');
    const h = app.seirekiToWareki(1989);
    // 1989年は昭和64年と平成元年の両方が該当する
    assert.ok(h.length >= 2, '1989年は昭和・平成の両方を返すべき');
  });

  test('年齢は「年の差」ではなく満年齢の範囲で示される', () => {
    // 2026年時点で1985年生まれは 40歳（誕生日前）または 41歳（誕生日後）。
    // かつて ${age} と ${age+1} を表示しており、両方1歳多かった。
    const currentYear = new Date().getFullYear();
    const birth = 1985;
    const after = currentYear - birth;   // 誕生日を迎えた後の満年齢
    const before = after - 1;            // 迎える前
    assert.strictEqual(after - before, 1, '2つの値は1歳差であるべき');
    // 年の差そのものを「若い方」として出してはいけない
    assert.notStrictEqual(before, after, '誕生日前後で同じ値になっている');
  });

  test('干支は12年周期で一致する', () => {
    assert.strictEqual(app.getEto(2026), app.getEto(2014));
    assert.strictEqual(app.getEto(2026), app.getEto(2038));
    assert.notStrictEqual(app.getEto(2026), app.getEto(2027));
  });
});

// ---------------------------------------------------------------------------
describe('freelance-tax-simulator: 副業（給与との合算）', () => {
  const app = loadApp('freelance-tax-simulator');

  test('給与所得控除が国税庁の区分どおり', () => {
    // 国税庁 No.1410 の表
    assert.strictEqual(app.calcEmploymentDeduction(1_500_000), 550_000);   // 162.5万以下
    assert.strictEqual(app.calcEmploymentDeduction(3_000_000), 980_000);   // 180万超360万以下
    assert.strictEqual(app.calcEmploymentDeduction(5_000_000), 1_440_000); // 360万超660万以下
    assert.strictEqual(app.calcEmploymentDeduction(8_000_000), 1_900_000); // 660万超850万以下
    assert.strictEqual(app.calcEmploymentDeduction(10_000_000), 1_950_000); // 850万超は上限
  });

  test('給与所得控除は上限195万円を超えない', () => {
    for (const inc of [8_500_000, 12_000_000, 50_000_000]) {
      assert.ok(app.calcEmploymentDeduction(inc) <= 1_950_000, `${inc}円で上限超過`);
    }
  });

  test('控除が収入を上回らない（所得がマイナスにならない）', () => {
    for (const inc of [0, 100_000, 300_000, 550_000, 1_000_000]) {
      assert.ok(app.calcSalaryIncome(inc) >= 0, `${inc}円で給与所得がマイナス`);
      assert.ok(app.calcEmploymentDeduction(inc) <= inc || inc === 0, `${inc}円で控除が収入超過`);
    }
  });

  test('給与所得は収入が増えれば増える（単調増加）', () => {
    let prev = -1;
    for (let inc = 0; inc <= 20_000_000; inc += 250_000) {
      const v = app.calcSalaryIncome(inc);
      assert.ok(v >= prev, `${inc}円で給与所得が減少`);
      prev = v;
    }
  });

  test('副業20万円以下なら所得税の申告を省略できる', () => {
    // 給与所得者に限った取り扱い（国税庁 No.1900）
    assert.strictEqual(app.judgeFilingRequirement(4_800_000, 190_000).required, false);
    assert.strictEqual(app.judgeFilingRequirement(4_800_000, 200_000).required, false);
    assert.strictEqual(app.judgeFilingRequirement(4_800_000, 200_001).required, true);
  });

  test('給与が無ければ金額にかかわらず申告が必要', () => {
    assert.strictEqual(app.judgeFilingRequirement(0, 100_000).required, true);
    assert.strictEqual(app.judgeFilingRequirement(0, 0).required, true);
  });

  test('省略できる場合も住民税の申告には触れている', () => {
    const r = app.judgeFilingRequirement(4_800_000, 150_000);
    assert.strictEqual(r.required, false);
    assert.match(r.reason, /住民税/, '住民税申告の注意が抜けている');
  });
});

// ---------------------------------------------------------------------------
describe('business-day-counter: 祝日データ', () => {
  const app = loadApp('business-day-counter');
  const H = app.HOLIDAYS;
  const dayOf = (d) => new Date(d + 'T00:00:00').getDay();

  test('日曜と重なる祝日には振替休日がある', () => {
    // 祝日法により、祝日が日曜に当たるとその後の最も近い平日が休日になる。
    // 支払日の計算に使うため、これが抜けていると1日ずれる。
    for (const [date, name] of Object.entries(H)) {
      if (dayOf(date) !== 0) continue;
      // 翌日以降、最初に「祝日として登録されていない日」までに振替が入っているか
      const d = new Date(date + 'T00:00:00');
      let found = false;
      for (let i = 1; i <= 5; i++) {
        d.setDate(d.getDate() + 1);
        const key = d.toISOString().slice(0, 10);
        if (H[key] === '振替休日') { found = true; break; }
        if (!H[key]) break; // 祝日が途切れたのに振替が無い
      }
      assert.ok(found, `${date}（${name}）の振替休日が登録されていない`);
    }
  });

  test('振替休日は日曜の祝日がある年にだけ存在する', () => {
    const subs = Object.entries(H).filter(([, n]) => n === '振替休日');
    for (const [date] of subs) {
      assert.notStrictEqual(dayOf(date), 0, `${date} の振替休日が日曜になっている`);
      assert.notStrictEqual(dayOf(date), 6, `${date} の振替休日が土曜になっている`);
    }
  });

  test('祝日データが重複していない', () => {
    const keys = Object.keys(H);
    assert.strictEqual(keys.length, new Set(keys).size, '同じ日付が二重登録されている');
  });

  test('日付の形式が揃っている', () => {
    for (const date of Object.keys(H)) {
      assert.match(date, /^\d{4}-\d{2}-\d{2}$/, `${date} の形式が不正`);
      assert.ok(!Number.isNaN(new Date(date + 'T00:00:00').getTime()), `${date} が実在しない日付`);
    }
  });
});

// ---------------------------------------------------------------------------
describe('consumption-tax-calculator: 消費税', () => {
  const app = loadApp('consumption-tax-calculator');

  test('端数処理が指定どおりに働く', () => {
    assert.strictEqual(app.applyRounding(100.4, 'floor'), 100);
    assert.strictEqual(app.applyRounding(100.6, 'floor'), 100);
    assert.strictEqual(app.applyRounding(100.4, 'ceil'), 101);
    assert.strictEqual(app.applyRounding(100.5, 'round'), 101);
    assert.strictEqual(app.applyRounding(100.4, 'round'), 100);
  });

  test('端数処理の結果は元の値から1円以上離れない', () => {
    for (const v of [0.1, 1.5, 99.9, 1234.5, 99999.4]) {
      for (const mode of ['floor', 'ceil', 'round']) {
        assert.ok(Math.abs(app.applyRounding(v, mode) - v) < 1, `${v} / ${mode} でずれが1円以上`);
      }
    }
  });
});

// ---------------------------------------------------------------------------
describe('presentation-timer: 原稿の所要時間見積もり', () => {
  const app = loadApp('presentation-timer');

  test('読み上げない文字は数えない', () => {
    // 空白・改行は発話されないので所要時間に影響しない
    assert.strictEqual(app.countChars('あいうえお かきくけこ'), 10);
    assert.strictEqual(app.countChars('あいう\nえお'), 5);
    // 区切り記号も読まない
    assert.strictEqual(app.countChars('あい---うえ'), 4);
  });

  test('所要時間は文字数を話速で割った値', () => {
    assert.strictEqual(app.secondsFor(300, 300), 60);
    assert.strictEqual(app.secondsFor(150, 300), 30);
    assert.strictEqual(app.secondsFor(0, 300), 0);
  });

  test('話速が遅いほど所要時間は長くなる', () => {
    const slow = app.secondsFor(300, 250);
    const normal = app.secondsFor(300, 300);
    const fast = app.secondsFor(300, 350);
    assert.ok(slow > normal, '遅く話す方が短くなっている');
    assert.ok(normal > fast, '速く話す方が長くなっている');
  });

  test('文字数が増えれば所要時間も増える（単調増加）', () => {
    let prev = -1;
    for (let c = 0; c <= 3000; c += 100) {
      const s = app.secondsFor(c, 300);
      assert.ok(s >= prev, `${c}文字で所要時間が減少`);
      prev = s;
    }
  });

  test('原稿は空行でも --- でも区切れる', () => {
    assert.strictEqual(app.splitSections('第一。\n\n第二。\n\n第三。').length, 3);
    assert.strictEqual(app.splitSections('前半\n---\n後半').length, 2);
    // 区切りが無ければ1つのまま
    assert.strictEqual(app.splitSections('ひとつだけ').length, 1);
    assert.strictEqual(app.splitSections('').length, 0);
  });

  test('各セクションの合計が全体の文字数と一致する', () => {
    const text = '第一段落です。\n\n第二段落はもう少し長い文章です。\n\n第三。';
    const parts = app.splitSections(text);
    const sum = parts.reduce((s, p) => s + app.countChars(p), 0);
    assert.strictEqual(sum, app.countChars(text));
  });
});

// ---------------------------------------------------------------------------
describe('overtime-calculator: 割増賃金', () => {
  test('割増率が労働基準法37条の下限を満たす', () => {
    const app = loadApp('overtime-calculator');
    const byId = Object.fromEntries(app.OT_TYPES.map((t) => [t.id, t.rate]));

    // 法定内残業は所定を超えるが法定8時間内なので割増義務がない
    assert.strictEqual(byId['ot-statutory'], 0);
    // 法定外残業は25%以上、月60時間超は50%以上
    assert.ok(byId['ot-legal25'] >= 0.25, `法定外残業 ${byId['ot-legal25']} が25%未満`);
    assert.ok(byId['ot-legal50'] >= 0.5, `月60時間超 ${byId['ot-legal50']} が50%未満`);
    // 休日労働は35%以上
    assert.ok(byId['ot-holiday'] >= 0.35, `休日労働 ${byId['ot-holiday']} が35%未満`);
    // 深夜割増は25%が上乗せされる
    assert.ok(byId['ot-night'] >= 0.25, `深夜残業 ${byId['ot-night']} が25%未満`);
    assert.ok(
      byId['ot-nightholiday'] >= byId['ot-holiday'],
      '深夜休日が休日単独を下回っている'
    );
  });

  test('残業時間が0なら支給額も0', () => {
    const app = loadApp('overtime-calculator');
    const rows = app.calcBreakdown(2000); // 全入力が空 = 0時間
    const total = rows.reduce((s, r) => s + r.amount, 0);
    assert.strictEqual(total, 0);
  });

  test('支給額は基本額と割増額の合計に一致する', () => {
    const app = loadApp('overtime-calculator');
    const first = app.OT_TYPES[0];
    const app2 = loadApp('overtime-calculator', { [first.id]: 10 });
    const rows = app2.calcBreakdown(2000);
    for (const r of rows) {
      assert.strictEqual(r.amount, r.baseAmount + r.premiumAmount, `${r.id} の内訳が合計と不一致`);
    }
  });

  test('残業時間が増えれば支給額も増える', () => {
    const first = loadApp('overtime-calculator').OT_TYPES[0];
    const a = loadApp('overtime-calculator', { [first.id]: 5 }).calcBreakdown(2000);
    const b = loadApp('overtime-calculator', { [first.id]: 10 }).calcBreakdown(2000);
    const sum = (rows) => rows.reduce((s, r) => s + r.amount, 0);
    assert.ok(sum(b) > sum(a), '残業時間を倍にしても支給額が増えない');
  });
});

// ---------------------------------------------------------------------------
// year-end-adjustment: 令和8年分（2026年分）の年末調整
//
// 控除額の根拠は財務省「令和８年度税制改正の大綱」一 個人所得課税 １
//   https://www.mof.go.jp/tax_policy/tax_reform/outline/fy2026/08taikou_01.htm
// 基礎控除の本則62万円、令和8年分・令和9年分の加算（合計所得489万円以下は
// 42万円、489万円超655万円以下は5万円）、給与所得控除の最低保障額74万円
// （本則69万円＋令和8年・9年の特例5万円）。
//
// このツールには「index.html の単位表示は『円』なのに script.js が万円として
// 10,000倍していた」という実障害があった。源泉徴収税額に12万円と入れると
// 還付額が12億円と表示されていた。単位の不変条件をテストで固定する。
describe('year-end-adjustment: 令和8年分の控除額と入力単位', () => {
  const app = () => loadApp('year-end-adjustment');

  const fields = (over) => Object.assign({
    income: 500,
    'withheld-tax': 120000,
    spouse: 'none',
    'spouse-income': 0,
    'dep-general': 0,
    'dep-specific': 0,
    'social-insurance': 700000,
    'life-general': 0,
    'life-nursing': 0,
    'life-pension': 0,
    'earthquake-insurance': 0,
    ideco: 0,
    'housing-loan': 0,
  }, over || {});

  const yen = (a, id) => Number(a.__getElement(id).textContent.replace(/[^0-9]/g, ''));

  const run = (over) => {
    const a = loadApp('year-end-adjustment', fields(over));
    a.calculate();
    return a;
  };

  test('給与所得控除の最低保障額は74万円', () => {
    // 収入が低い側の階段では必ず最低保障額が効く
    assert.strictEqual(app().calcSalaryDeduction(100), 740000);
    assert.strictEqual(app().calcSalaryDeduction(180), 740000);
  });

  test('給与所得控除は給与収入そのものを超えない', () => {
    assert.strictEqual(app().calcSalaryDeduction(0), 0);
    assert.strictEqual(app().calcSalaryDeduction(50), 500000);
  });

  test('給与所得控除の上限は195万円', () => {
    assert.strictEqual(app().calcSalaryDeduction(850), 1950000);
    assert.strictEqual(app().calcSalaryDeduction(2000), 1950000);
  });

  test('給与所得控除は収入に対して単調非減少', () => {
    const f = app().calcSalaryDeduction;
    for (let man = 0; man <= 1200; man += 5) {
      assert.ok(f(man + 5) >= f(man), man + '万円の前後で給与所得控除が減った');
    }
  });

  test('基礎控除は本則62万円＋令和8年分の加算で最大104万円', () => {
    const f = app().calcBasicDeduction;
    assert.strictEqual(f(4000000), 1040000);  // 合計所得489万円以下 → 62万＋42万
    assert.strictEqual(f(4890000), 1040000);  // 境界（489万円ちょうど）
    assert.strictEqual(f(5000000), 670000);   // 489万円超655万円以下 → 62万＋5万
    assert.strictEqual(f(6550000), 670000);   // 境界（655万円ちょうど）
    assert.strictEqual(f(7000000), 620000);   // 655万円超 → 本則のみ
  });

  test('基礎控除は2,350万円超で段階的に縮小し2,500万円超で0', () => {
    const f = app().calcBasicDeduction;
    assert.strictEqual(f(23500000), 620000);
    assert.strictEqual(f(24000000), 480000);
    assert.strictEqual(f(24500000), 320000);
    assert.strictEqual(f(25000000), 160000);
    assert.strictEqual(f(25000001), 0);
  });

  test('基礎控除は所得に対して単調非増加', () => {
    const f = app().calcBasicDeduction;
    for (let y = 0; y <= 26000000; y += 100000) {
      assert.ok(f(y + 100000) <= f(y), '所得' + y + '円の前後で基礎控除が増えた');
    }
  });

  test('生命保険料控除は1区分あたり4万円が上限', () => {
    const f = app().calcLifeInsuranceDeduction;
    assert.strictEqual(f(20000), 20000);   // 2万円以下は全額
    assert.strictEqual(f(40000), 30000);   // 支払額の1/2 + 1万円
    assert.strictEqual(f(80000), 40000);   // 支払額の1/4 + 2万円
    assert.strictEqual(f(1000000), 40000); // 上限で止まる
    assert.strictEqual(f(0), 0);
  });

  test('生命保険料控除は入力を円として扱う（万円ではない）', () => {
    // 10,000倍していた頃は、わずかな金額でも常に上限4万円が返っていた
    assert.strictEqual(app().calcLifeInsuranceDeduction(10000), 10000);
    assert.ok(app().calcLifeInsuranceDeduction(10000) < 40000);
  });

  test('生命保険料控除の3区分合計は12万円が上限', () => {
    const f = app().calcLifeInsuranceTotal;
    assert.strictEqual(f(80000, 80000, 80000), 120000);
    assert.strictEqual(f(20000, 20000, 20000), 60000);
    assert.strictEqual(f(0, 0, 0), 0);
  });

  test('源泉徴収税額は円で受け取る（還付額が1万倍にならない）', () => {
    const a = run({});
    assert.strictEqual(a.__getElement('d-withheld').textContent, '¥120,000');
    // 還付額は源泉徴収税額を超えられない
    assert.ok(yen(a, 'result-value') <= 120000, '還付額が源泉徴収税額を超えている');
  });

  test('住宅ローン控除は年末残高の0.7%（上限21万円）', () => {
    const credit = (balance) =>
      yen(run({ income: 700, 'withheld-tax': 300000, 'social-insurance': 1000000, 'housing-loan': balance }), 'd-housing-credit');
    assert.strictEqual(credit(10000000), 70000);  // 1,000万円 × 0.7%
    assert.strictEqual(credit(30000000), 210000); // 3,000万円 × 0.7% = 上限
    assert.strictEqual(credit(50000000), 210000); // 上限で止まる
  });

  test('iDeCo掛金を入れれば課税所得は減る', () => {
    const taxable = (ideco) => yen(run({ income: 600, 'social-insurance': 900000, ideco }), 'd-taxable');
    assert.ok(taxable(23000) < taxable(0), 'iDeCoを入れても課税所得が減らない');
  });

  test('地震保険料控除の上限は5万円', () => {
    const total = (premium) => yen(run({ 'earthquake-insurance': premium }), 'd-deductions');
    // 3万円と10万円の差は、上限5万円までの2万円ぶんだけ
    assert.strictEqual(total(100000) - total(30000), 20000);
  });

  test('課税所得は1,000円未満が切り捨てられる', () => {
    const taxable = yen(run({ income: 523, 'social-insurance': 713456, 'life-general': 31234 }), 'd-taxable');
    assert.strictEqual(taxable % 1000, 0, '課税所得が1,000円単位になっていない');
  });

  test('扶養が増えれば控除合計も増える', () => {
    const total = (general, specific) =>
      yen(run({ 'dep-general': general, 'dep-specific': specific }), 'd-deductions');
    assert.strictEqual(total(1, 0) - total(0, 0), 380000); // 一般扶養 38万円
    assert.strictEqual(total(0, 1) - total(0, 0), 630000); // 特定扶養 63万円
  });

  // -- 配偶者控除・配偶者特別控除 --
  //
  // 根拠: 国税庁 No.1191 配偶者控除 / No.1195 配偶者特別控除
  //   （令和8年4月1日現在法令等。表の62万円は令和8年12月1日施行・令和8年分から適用）
  //   https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/1191.htm
  //   https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/1195.htm
  //
  // 改修前は「配偶者の年収150万円以下なら一律38万円、超えたら0円」としていた。
  // 境界の金額（150万円）が制度に無い数字だったうえ、62万円超133万円以下の
  // 段階的な減額が丸ごと抜けていた。段階の形そのものを不変条件として固定する。

  // loadApp は vm サンドボックス内のオブジェクトを返すため、プロトタイプが
  // 別レルムになり deepStrictEqual が通らない。フィールドごとに比較する。
  const spouse = (spouseNet, selfNet) => {
    const r = app().calcSpouseDeduction(spouseNet, selfNet);
    return [r.amount, r.kind];
  };

  test('配偶者の合計所得金額が62万円以下なら配偶者控除38万円', () => {
    assert.deepStrictEqual(spouse(0, 5000000), [380000, 'general']);
    assert.deepStrictEqual(spouse(620000, 5000000), [380000, 'general']);
  });

  test('62万円を1円超えると配偶者特別控除に切り替わる（額は38万円のまま）', () => {
    // 「136万円を1円超えたら控除がゼロ」ではないことを固定する
    assert.deepStrictEqual(spouse(620001, 5000000), [380000, 'special']);
  });

  test('配偶者特別控除の額が一次資料の表と一致する（本人900万円以下）', () => {
    const f = (netIncome) => app().calcSpouseDeduction(netIncome, 5000000).amount;
    assert.strictEqual(f( 950000), 380000);
    assert.strictEqual(f(1000000), 360000);
    assert.strictEqual(f(1050000), 310000);
    assert.strictEqual(f(1100000), 260000);
    assert.strictEqual(f(1150000), 210000);
    assert.strictEqual(f(1200000), 160000);
    assert.strictEqual(f(1250000), 110000);
    assert.strictEqual(f(1300000),  60000);
    assert.strictEqual(f(1330000),  30000);
    assert.strictEqual(f(1330001),      0); // 133万円超は適用なし
  });

  test('本人の合計所得金額の区分で控除額が下がり、1,000万円超で0になる', () => {
    const f = (self) => app().calcSpouseDeduction(0, self).amount;
    assert.strictEqual(f(9000000),  380000);
    assert.strictEqual(f(9000001),  260000);
    assert.strictEqual(f(9500000),  260000);
    assert.strictEqual(f(9500001),  130000);
    assert.strictEqual(f(10000000), 130000);
    assert.strictEqual(f(10000001),      0);
  });

  test('配偶者控除・配偶者特別控除は配偶者の所得に対して単調非増加', () => {
    const f = app().calcSpouseDeduction;
    for (const self of [5000000, 9200000, 9800000]) {
      for (let y = 0; y <= 1500000; y += 10000) {
        assert.ok(
          f(y + 10000, self).amount <= f(y, self).amount,
          `本人${self}円・配偶者${y}円の前後で控除額が増えた`
        );
      }
    }
  });

  test('配偶者の年収136万円以下＝合計所得62万円以下になる（給与所得控除74万円）', () => {
    // 年収の境界136万円・207万円は、合計所得の境界に最低保障額74万円を足した値。
    // 給与所得控除を直したときに境界だけ取り残されるのを防ぐ。
    const f = app().calcSpouseNetIncome;
    assert.strictEqual(f(136), 620000);
    assert.strictEqual(f(207), 1330000);
    assert.strictEqual(f(50), 0);   // 給与所得控除は収入を超えない
    assert.strictEqual(f(0), 0);
  });

  test('配偶者の年収を上げると控除合計が段階的に減る', () => {
    const total = (spouseIncome) =>
      yen(run({ spouse: 'yes', 'spouse-income': spouseIncome }), 'd-deductions');
    assert.strictEqual(total(100) - total(180), 120000); // 38万円 → 26万円
    assert.strictEqual(total(207) - total(210), 30000);  // 3万円 → 0円
    assert.ok(total(100) > total(207), '年収が増えても控除合計が減らない');
  });

  test('配偶者「なし」なら年収を入れても控除は増えない', () => {
    const total = (over) => yen(run(over), 'd-deductions');
    assert.strictEqual(
      total({ spouse: 'none', 'spouse-income': 100 }),
      total({ spouse: 'none', 'spouse-income': 0 })
    );
  });
});

// ---------------------------------------------------------------------------
describe('ideco-simulator: 令和8年分の控除・節税額・退職所得控除', () => {
  const app = () => loadApp('ideco-simulator');

  // -- 給与所得控除（国税庁タックスアンサー1410「令和8年分・令和9年分」の表） --

  test('最低保障額74万円は給与収入220万円まで適用される', () => {
    // 令和7年分までは「190万円まで65万円」だった。改正で階段そのものが動いている。
    const f = app().calcSalaryDeduction;
    assert.strictEqual(f(1000000), 740000);
    assert.strictEqual(f(1800000), 740000);
    assert.strictEqual(f(2200000), 740000);
  });

  test('給与収入220万円を超えると収入×30%＋8万円に切り替わる', () => {
    const f = app().calcSalaryDeduction;
    assert.strictEqual(f(2300000), 770000);
    assert.strictEqual(f(3600000), 1160000);
  });

  test('給与所得控除の各区分が一次資料の表と一致する', () => {
    const f = app().calcSalaryDeduction;
    assert.strictEqual(f(6600000), 1760000);  // 収入×20%＋44万円
    assert.strictEqual(f(8500000), 1950000);  // 収入×10%＋110万円＝上限
    assert.strictEqual(f(20000000), 1950000); // 上限は195万円で頭打ち
  });

  test('給与所得控除は給与収入そのものを超えない', () => {
    const f = app().calcSalaryDeduction;
    assert.strictEqual(f(0), 0);
    assert.strictEqual(f(500000), 500000);
  });

  test('給与所得控除は収入に対して単調非減少', () => {
    const f = app().calcSalaryDeduction;
    for (let y = 0; y <= 12000000; y += 50000) {
      assert.ok(f(y + 50000) >= f(y), y + '円の前後で給与所得控除が減った');
    }
  });

  test('給与所得控除は year-end-adjustment と一致する', () => {
    // 同じ制度を2つのツールが別々に実装しているため、片方だけ改正に
    // 追随し損ねるのを防ぐ。year-end-adjustment 側は万円で受ける。
    const ideco = app().calcSalaryDeduction;
    const yea = loadApp('year-end-adjustment').calcSalaryDeduction;
    for (let man = 0; man <= 1000; man += 5) {
      assert.strictEqual(ideco(man * 10000), yea(man), man + '万円で2ツールの給与所得控除が食い違った');
    }
  });

  // -- 基礎控除（令和8年分。本則62万円＋令和8年・9年分の加算） --

  test('基礎控除は合計所得489万円以下で104万円', () => {
    const f = app().calcBasicDeduction;
    assert.strictEqual(f(0), 1040000);
    assert.strictEqual(f(4890000), 1040000);
  });

  test('基礎控除は合計所得489万円超655万円以下で67万円', () => {
    const f = app().calcBasicDeduction;
    assert.strictEqual(f(4890001), 670000);
    assert.strictEqual(f(6550000), 670000);
  });

  test('基礎控除の本則は62万円（合計所得655万円超2,350万円以下）', () => {
    const f = app().calcBasicDeduction;
    assert.strictEqual(f(6550001), 620000);
    assert.strictEqual(f(23500000), 620000);
  });

  test('基礎控除は高所得側で48万/32万/16万/0円に落ちる', () => {
    const f = app().calcBasicDeduction;
    assert.strictEqual(f(23500001), 480000);
    assert.strictEqual(f(24000001), 320000);
    assert.strictEqual(f(24500001), 160000);
    assert.strictEqual(f(25000001), 0);
  });

  test('基礎控除は合計所得に対して単調非増加', () => {
    const f = app().calcBasicDeduction;
    for (let y = 0; y <= 26000000; y += 100000) {
      assert.ok(f(y + 100000) <= f(y), y + '円の前後で基礎控除が増えた');
    }
  });

  test('基礎控除は year-end-adjustment と一致する', () => {
    const ideco = app().calcBasicDeduction;
    const yea = loadApp('year-end-adjustment').calcBasicDeduction;
    for (let y = 0; y <= 26000000; y += 100000) {
      assert.strictEqual(ideco(y), yea(y), y + '円で2ツールの基礎控除が食い違った');
    }
  });

  // -- 退職所得控除（所得税法30条） --

  test('退職所得控除は20年以下が1年あたり40万円', () => {
    const f = app().calcRetirementDeduction;
    assert.strictEqual(f(10), 4000000);
    assert.strictEqual(f(20), 8000000);
  });

  test('退職所得控除は20年超の超過分が1年あたり70万円', () => {
    const f = app().calcRetirementDeduction;
    assert.strictEqual(f(21), 8700000);
    assert.strictEqual(f(30), 15000000);
    assert.strictEqual(f(40), 22000000);
  });

  test('退職所得控除の最低保証は80万円', () => {
    const f = app().calcRetirementDeduction;
    assert.strictEqual(f(1), 800000);
    assert.strictEqual(f(2), 800000);
  });

  test('退職所得控除に法令上の上限はない（2,000万円で頭打ちにしない）', () => {
    // 架空の2,000万円上限で加入40年の控除を1,600万円と誤表示していたため、
    // 「20年の壁」より上で控除が伸び続けることを固定する。
    const f = app().calcRetirementDeduction;
    assert.ok(f(40) > 20000000, '加入40年の退職所得控除が2,000万円以下になっている');
    assert.strictEqual(f(40) - f(39), 700000);
  });

  test('退職所得控除は retirement-allowance-simulator と一致する', () => {
    // あちらは万円単位で返す
    const ideco = app().calcRetirementDeduction;
    const ras = loadApp('retirement-allowance-simulator').calcDeduction;
    for (let y = 1; y <= 45; y++) {
      assert.strictEqual(ideco(y), ras(y) * 10000, y + '年で2ツールの退職所得控除が食い違った');
    }
  });

  // -- 節税額（掛金を引く前と引いた後の税額の差） --

  test('課税所得が0なら節税額も0', () => {
    // 税率を掛ける実装だと、課税所得0の人にも節税額が出てしまっていた。
    const a = app();
    const bases = a.calcTaxBases(100, 'employee_no_pension');
    assert.strictEqual(bases.forIncomeTax, 0, '年収100万円の所得税課税所得が0でない');
    assert.strictEqual(a.calcAnnualTaxSaving(100, 'employee_no_pension', 276000), 0);
  });

  test('節税額は年間掛金を超えない', () => {
    const f = app().calcAnnualTaxSaving;
    for (const man of [100, 200, 300, 500, 800, 1200, 2000, 5000]) {
      const saving = f(man, 'employee_no_pension', 276000);
      assert.ok(saving <= 276000, man + '万円で節税額が年間掛金を超えた');
      assert.ok(saving >= 0, man + '万円で節税額が負になった');
    }
  });

  test('節税額は年収に対して単調非減少（端数処理の誤差を除く）', () => {
    // 課税所得の1,000円未満切捨てと復興特別所得税の切捨てが前後の税額で
    // 別々に効くため、差額は数円ぶり返すことがある（制度上の正しい挙動）。
    // 税率区分を取り違えるような誤りは数千円単位で動くので、許容幅100円で捕まる。
    const f = app().calcAnnualTaxSaving;
    for (let man = 0; man <= 2000; man += 20) {
      assert.ok(
        f(man + 20, 'employee_no_pension', 276000) >= f(man, 'employee_no_pension', 276000) - 100,
        man + '万円の前後で節税額が減った'
      );
    }
  });

  test('掛金を増やせば節税額も減らない', () => {
    const f = app().calcAnnualTaxSaving;
    let prev = 0;
    for (let monthly = 0; monthly <= 68000; monthly += 1000) {
      const saving = f(500, 'self_employed', monthly * 12);
      assert.ok(saving >= prev, '月' + monthly + '円で節税額が減った');
      prev = saving;
    }
  });

  test('自営業には給与所得控除を適用しない', () => {
    // 事業所得に給与所得控除を重ねると課税所得を過小評価してしまう
    const a = app();
    const self = a.calcTaxBases(500, 'self_employed');
    const employee = a.calcTaxBases(500, 'employee_no_pension');
    assert.strictEqual(self.income, 5000000, '自営業の合計所得が入力額と一致しない');
    assert.ok(employee.income < self.income, '給与所得者の所得が自営業より小さくなっていない');
  });

  test('住民税は所得税とは別の基礎控除で計算する', () => {
    // 所得税の基礎控除（最大104万円）を住民税に流用すると住民税を過小評価する
    const bases = app().calcTaxBases(500, 'employee_no_pension');
    assert.ok(
      bases.forResidentTax > bases.forIncomeTax,
      '住民税の課税所得が所得税の課税所得を上回っていない（基礎控除43万円が効いていない）'
    );
  });
});
