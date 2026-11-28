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
    // 国税庁 No.1410 の令和8年分・令和9年分の表（220万円までは最低保障74万円）
    assert.strictEqual(app.calcEmploymentDeduction(1_500_000), 740_000);   // 最低保障
    assert.strictEqual(app.calcEmploymentDeduction(2_200_000), 740_000);   // 最低保障の上端
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

  // -- 令和8年分（国税庁 No.1199・No.1410、令和8年12月1日施行・令和8年分から適用） --

  test('給与所得控除は year-end-adjustment と一致する', () => {
    // 同じ制度を別々に実装しているため、片方だけ改正に追随し損ねるのを防ぐ。
    const yea = loadApp('year-end-adjustment').calcSalaryDeduction; // 万円で受ける
    for (let man = 0; man <= 1000; man += 5) {
      assert.strictEqual(app.calcEmploymentDeduction(man * 10000), yea(man),
        man + '万円で2ツールの給与所得控除が食い違った');
    }
  });

  test('基礎控除は合計所得489万円以下104万/655万円以下67万/2,350万円以下62万', () => {
    assert.strictEqual(app.calcBasicDeduction(0), 1_040_000);
    assert.strictEqual(app.calcBasicDeduction(4_890_000), 1_040_000);
    assert.strictEqual(app.calcBasicDeduction(4_890_001), 670_000);
    assert.strictEqual(app.calcBasicDeduction(6_550_000), 670_000);
    assert.strictEqual(app.calcBasicDeduction(6_550_001), 620_000);
    assert.strictEqual(app.calcBasicDeduction(23_500_000), 620_000);
    assert.strictEqual(app.calcBasicDeduction(23_500_001), 480_000);
    assert.strictEqual(app.calcBasicDeduction(25_000_001), 0);
  });

  test('基礎控除は year-end-adjustment と一致し、所得に対して単調非増加', () => {
    const yea = loadApp('year-end-adjustment').calcBasicDeduction;
    for (let y = 0; y <= 26_000_000; y += 100_000) {
      assert.strictEqual(app.calcBasicDeduction(y), yea(y), y + '円で2ツールの基礎控除が食い違った');
      assert.ok(app.calcBasicDeduction(y + 100_000) <= app.calcBasicDeduction(y), y + '円の前後で基礎控除が増えた');
    }
  });

  test('画面: 所得税の基礎控除は改正後の額、住民税は43万円で別に表示される', () => {
    // 専業・免税事業者・売上300万円・青色65万円 → 事業所得235万円（489万円以下）
    const a = loadApp('freelance-tax-simulator', {
      'salary-income': 0, revenue: 3_000_000, expenses: 0, 'blue-deduction': '650000',
      'social-insurance': 0, 'other-deduction': 0, dependents: '0',
      'invoice-type': 'exempt', 'actual-purchases': 0,
    });
    a.calculate();
    const yen = (id) => Number(a.__getElement(id).textContent.replace(/[^0-9]/g, ''));
    assert.strictEqual(yen('r-basic'), 1_040_000);
    assert.strictEqual(yen('r-taxable'), 2_350_000 - 1_040_000);
    assert.strictEqual(yen('r-resident-basic'), 430_000);
    assert.strictEqual(yen('r-resident-taxable'), 2_350_000 - 430_000);
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

// ---------------------------------------------------------------------------
// 出産手当金は、産休中の家計の見込みと勤務先への申請に使われる。
// 一次資料: 全国健康保険協会「出産手当金」
//   https://www.kyoukaikenpo.or.jp/benefit/childbirth/001
// 同ページは計算式そのものを画像で掲載しているため、期待値はページ本文に
// 文字で書かれている公式の計算例（平均17万円 → 日額3,780円）と、
// 支給対象期間の定義文から取っている。
describe('maternity-leave-calc: 出産手当金の日額と支給対象日数', () => {
  const app = loadApp('maternity-leave-calc');

  test('協会けんぽの公式計算例を再現する（平均17万円 → 5,670円 → 3,780円）', () => {
    assert.strictEqual(app.calcStandardDailyWage(170000), 5670);
    assert.strictEqual(app.calcDailyBenefit(170000, false), 3780);
  });

  test('30で割った額は10円未満四捨五入', () => {
    assert.strictEqual(app.calcStandardDailyWage(300000), 10000); // 端数なし
    assert.strictEqual(app.calcStandardDailyWage(170000), 5670);  // 5,666.67 → 5,670
    assert.strictEqual(app.calcStandardDailyWage(160000), 5330);  // 5,333.33 → 5,330
    assert.strictEqual(app.calcStandardDailyWage(260000), 8670);  // 8,666.67 → 8,670
  });

  test('3分の2にした額は1円未満四捨五入', () => {
    assert.strictEqual(app.calcDailyBenefit(300000, false), 6667); // 10,000 × 2/3 = 6,666.67
    assert.strictEqual(app.calcDailyBenefit(240000, false), 5333); //  8,000 × 2/3 = 5,333.33
  });

  test('未入力・0・不正な値は0円（金額を表示しない状態）', () => {
    assert.strictEqual(app.calcDailyBenefit('', false), 0);
    assert.strictEqual(app.calcDailyBenefit(0, false), 0);
    assert.strictEqual(app.calcDailyBenefit(-100000, false), 0);
    assert.strictEqual(app.calcDailyBenefit(NaN, false), 0);
    assert.strictEqual(app.calcStandardDailyWage(''), 0);
  });

  test('日額は標準報酬月額に対して単調非減少', () => {
    let prev = -1;
    for (let m = 0; m <= 1500000; m += 1000) {
      const d = app.calcDailyBenefit(m, false);
      assert.ok(d >= prev, m + '円で日額が減った');
      prev = d;
    }
  });

  test('加入12か月未満は32万円が上限。それ以下の額はそのまま使う', () => {
    assert.strictEqual(app.SHORT_ENROLLMENT_CAP, 320000);
    assert.strictEqual(app.calcDailyBenefit(500000, true), app.calcDailyBenefit(320000, false));
    assert.strictEqual(app.calcDailyBenefit(320000, true), app.calcDailyBenefit(320000, false));
    assert.strictEqual(app.calcDailyBenefit(200000, true), app.calcDailyBenefit(200000, false));
  });

  test('加入12か月未満の指定は、上限以下の人の額を下げない', () => {
    for (let m = 1000; m <= 320000; m += 1000) {
      assert.strictEqual(
        app.calcDailyBenefit(m, true), app.calcDailyBenefit(m, false),
        m + '円で12か月未満の扱いが不利になっている'
      );
    }
  });

  test('予定日どおりの出産は単胎98日・多胎154日', () => {
    assert.strictEqual(app.calcBenefitDays(42, 0).total, 98);
    assert.strictEqual(app.calcBenefitDays(98, 0).total, 154);
  });

  test('出産が遅れた日数はそのまま産前側に加算される', () => {
    const r = app.calcBenefitDays(42, 10);
    assert.strictEqual(r.prenatal, 52);
    assert.strictEqual(r.total, 108);
  });

  test('出産が早まった日数は産前側から減るが、産後56日は減らない', () => {
    const r = app.calcBenefitDays(42, -14);
    assert.strictEqual(r.prenatal, 28);
    assert.strictEqual(r.postnatal, 56);
    assert.strictEqual(r.total, 84);
  });

  test('産前の支給日数は負にならない（極端な早産でも産後56日は残る）', () => {
    const r = app.calcBenefitDays(42, -60);
    assert.strictEqual(r.prenatal, 0);
    assert.strictEqual(r.total, 56);
  });

  test('産後の支給日数は常に56日', () => {
    for (const p of [42, 98]) {
      for (let d = -120; d <= 60; d++) {
        assert.strictEqual(app.calcBenefitDays(p, d).postnatal, 56, p + '日/' + d + 'のずれで産後が56日でない');
      }
    }
  });

  test('支給対象日数は出産日のずれに対して単調非減少', () => {
    let prev = -1;
    for (let d = -60; d <= 60; d++) {
      const t = app.calcBenefitDays(42, d).total;
      assert.ok(t >= prev, d + '日のずれで支給日数が減った');
      prev = t;
    }
  });

  test('多胎は産前が98日になり、支給日数は単胎より56日多い', () => {
    assert.strictEqual(app.calcBenefitDays(98, 0).prenatal, 98);
    assert.strictEqual(app.calcBenefitDays(98, 0).total - app.calcBenefitDays(42, 0).total, 56);
  });
});

// ---------------------------------------------------------------------------
// 日程の計算は本文のケーススタディ（予定日 2026-10-01）と同じ値を返さなければ
// 解説と結果が食い違う。本文を直したときに実装がついてこない事故を防ぐ。
describe('maternity-leave-calc: 休業日程', () => {
  const app = loadApp('maternity-leave-calc');

  test('産前休業の開始日は予定日の42日前、多胎は98日前', () => {
    assert.strictEqual(app.formatDatePlain(app.calculate('2026-10-01', false).prenatalStart), '2026年8月20日');
    assert.strictEqual(app.formatDatePlain(app.calculate('2026-10-01', true).prenatalStart), '2026年6月25日');
  });

  test('産後休業の終了日は出産日の56日後、育休開始可能日はその翌日', () => {
    const c = app.calculate('2026-10-01', false);
    assert.strictEqual(app.formatDatePlain(c.postnatalEnd), '2026年11月26日');
    assert.strictEqual(app.formatDatePlain(c.ikujiStart), '2026年11月27日');
  });

  test('産後休業の56日は多胎でも延びない', () => {
    const single = app.calculate('2026-10-01', false);
    const twins  = app.calculate('2026-10-01', true);
    assert.strictEqual(app.formatDatePlain(single.postnatalEnd), app.formatDatePlain(twins.postnatalEnd));
  });

  test('実際の出産日が早まると産前は短縮され、産後56日は確保される', () => {
    const d = app.calcDiff('2026-10-01', '2026-09-17', false);
    assert.strictEqual(d.diffDays, -14);
    assert.strictEqual(d.prenatalDuration, 28);
    assert.strictEqual(app.formatDatePlain(d.postnatalEnd), '2026年11月12日');
  });

  test('育児休業の期間は産後休業の終了翌日から、子の1歳の誕生日の前日まで', () => {
    // 2026-10-01 出産 → 産後休業終了 11-26（既存テスト）→ 育休 11-27 開始
    // 子が1歳に達する日 ＝ 誕生日の前日 ＝ 2027-09-30
    const r = app.calcIkujiLeaveDays('2026-10-01', 12);
    assert.strictEqual(app.formatDatePlain(r.start), '2026年11月27日');
    assert.strictEqual(app.formatDatePlain(r.end), '2027年9月30日');
    assert.strictEqual(r.days, 308); // 本文の計算例と同じ値
  });

  test('育休の開始日は、出産日の57日後（産後休業56日の翌日）で日程カードと一致する', () => {
    for (const d of ['2026-01-15', '2026-02-28', '2026-06-30', '2026-12-31']) {
      const c = app.calculate(d, false);
      const r = app.calcIkujiLeaveDays(d, 12);
      assert.strictEqual(app.formatDatePlain(r.start), app.formatDatePlain(c.ikujiStart), d);
    }
  });

  test('1歳6か月・2歳までの延長は、1歳までより日数が多い', () => {
    const a = app.calcIkujiLeaveDays('2026-10-01', 12).days;
    const b = app.calcIkujiLeaveDays('2026-10-01', 18).days;
    const c = app.calcIkujiLeaveDays('2026-10-01', 24).days;
    assert.ok(b > a, '1歳6か月が1歳より短い');
    assert.ok(c > b, '2歳が1歳6か月より短い');
  });

  test('月末の出産でも終了日が翌月へずれ込まない', () => {
    // 2027-08-31 ＋ 18か月 ＝ 2029-02-31 は存在しない。末日（2/28）に丸めてから
    // 前日を取るので 2029-02-27。Date の自動補正に任せると3月へずれ込むため、
    // ここが崩れると「育休の終了日が1か月近く延びる」誤表示になる。
    assert.strictEqual(app.formatDatePlain(app.calcIkujiLeaveDays('2027-08-31', 18).end), '2029年2月27日');
    // うるう日生まれ。満年齢の到達日の扱いは法令上の論点があるため、
    // ここでは「2月のうちに収まり、3月へずれ込まない」ことだけを確認する。
    assert.strictEqual(app.calcIkujiLeaveDays('2028-02-29', 12).end.getMonth(), 1);
  });

  test('育休の日数は、取得期間を延ばしても出産日を動かしても負にならない', () => {
    for (const m of [12, 18, 24]) {
      for (const d of ['2026-01-01', '2026-05-31', '2026-10-01', '2027-02-28']) {
        assert.ok(app.calcIkujiLeaveDays(d, m).days > 0, d + '/' + m);
      }
    }
    assert.strictEqual(app.calcIkujiLeaveDays('2026-10-01', 0).days, 0);
  });

  test('休業日数99日と出産手当金の支給対象日数98日は1日ずれる', () => {
    // 休業日程は産前休業の開始日を「予定日の42日前の日」として表示するが、
    // 出産手当金の産前42日は出産日そのものを1日として数える。この1日の差は
    // 本文で説明している。どちらかを直すときは両方そろえること。
    const c = app.calculate('2026-10-01', false);
    assert.strictEqual(c.prenatalDays + 1 + 56, 99);
    assert.strictEqual(app.calcBenefitDays(c.prenatalDays, 0).total, 98);
  });
});

// ---------------------------------------------------------------------------
// 育児休業給付金は産休のあとの家計そのもので、額を誤ると実害が大きい。
// 一次資料: 厚生労働省・都道府県労働局・ハローワーク
//   「令和８年８月１日から支給限度額が変更になります」（LL080731保02）
//   https://www.mhlw.go.jp/content/001728499.pdf
// 同紙は賃金「月額」の上限・下限と、支給上限額（30日・28日）を公表している。
// 実装は賃金日額（月額÷30）に上限・下限をかけて 日額×日数×率 で計算するので、
// 公表されている支給上限額が端数まで再現できることが正しさの検証になる。
// **これらの額は毎年8月1日に改定される。** 8月の更新時はこのテストの期待値も
// 新しい一次資料に差し替えること（期待値を実装に合わせて動かすのは誤り）。
describe('maternity-leave-calc: 育児休業給付金', () => {
  const app = loadApp('maternity-leave-calc');

  test('公表されている上限額・下限額の定数が一次資料と一致する', () => {
    assert.strictEqual(app.IKUJI_WAGE_MONTHLY_CAP, 496200);
    assert.strictEqual(app.IKUJI_WAGE_MONTHLY_FLOOR, 96090);
    assert.strictEqual(app.IKUJI_DAILY_WAGE_CAP, 16540);   // 496,200 ÷ 30
    assert.strictEqual(app.IKUJI_DAILY_WAGE_FLOOR, 3203);  // 96,090 ÷ 30
  });

  test('賃金日額の上限・下限は、公表された賃金月額を30で割った額', () => {
    assert.strictEqual(app.calcIkujiDailyWage(app.IKUJI_WAGE_MONTHLY_CAP), app.IKUJI_DAILY_WAGE_CAP);
    assert.strictEqual(app.calcIkujiDailyWage(app.IKUJI_WAGE_MONTHLY_FLOOR), app.IKUJI_DAILY_WAGE_FLOOR);
  });

  test('公表されている支給上限額（30日）を端数まで再現する', () => {
    const d = app.calcIkujiDailyWage(1000000); // 上限額に張り付く
    const b = app.calcIkujiBenefit(d, 30);
    assert.strictEqual(b.monthlyHigh, 332454); // 支給率67％の支給上限額
    assert.strictEqual(b.monthlyLow, 248100);  // 支給率50％の支給上限額
    assert.strictEqual(b.total, 332454);       // 30日なので全部が67％
  });

  test('公表されている支給下限額（30日）を端数まで再現する', () => {
    const d = app.calcIkujiDailyWage(50000); // 下限額まで引き上げられる
    const b = app.calcIkujiBenefit(d, 30);
    assert.strictEqual(b.monthlyHigh, 64380);
    assert.strictEqual(b.monthlyLow, 48045);
  });

  test('出生時育児休業給付金・出生後休業支援給付金の公表上限額も同じ式で出る', () => {
    // 試算には含めていないが、同じ日額上限から導けることを確かめておく。
    // ここがずれるなら日額上限か端数処理の解釈が誤っている。
    const d = app.IKUJI_DAILY_WAGE_CAP;
    assert.strictEqual(Math.floor(d * 28 * 0.67), 310290); // 出生時育児休業給付金
    assert.strictEqual(Math.floor(d * 28 * 0.13), 60205);  // 出生後休業支援給付金
  });

  test('賃金月額が上限・下限の範囲内なら実額を30で割る', () => {
    assert.strictEqual(app.calcIkujiDailyWage(300000), 10000);
    assert.strictEqual(app.calcIkujiDailyWage(250000), 8333); // 8,333.33 → 切り捨て
  });

  test('未入力・0・不正な値は0円（金額を表示しない状態）', () => {
    for (const v of ['', 0, -300000, NaN]) {
      assert.strictEqual(app.calcIkujiDailyWage(v), 0, String(v));
      assert.strictEqual(app.calcIkujiBenefit(app.calcIkujiDailyWage(v), 308).total, 0, String(v));
    }
  });

  test('180日の境界: 180日までは全額67%、181日目から50%に切り替わる', () => {
    const d = 10000;
    assert.strictEqual(app.calcIkujiBenefit(d, 180).lowDays, 0);
    assert.strictEqual(app.calcIkujiBenefit(d, 180).total, Math.floor(d * 180 * 0.67));
    const b = app.calcIkujiBenefit(d, 181);
    assert.strictEqual(b.highDays, 180);
    assert.strictEqual(b.lowDays, 1);
    assert.strictEqual(b.total, Math.floor(d * 180 * 0.67) + Math.floor(d * 1 * 0.5));
  });

  test('181日目以降の1日あたりは67%期間より少ない（給付率が下がる）', () => {
    const d = 10000;
    const a = app.calcIkujiBenefit(d, 180);
    const b = app.calcIkujiBenefit(d, 210);
    const perDayAfter = (b.total - a.total) / 30;
    assert.ok(perDayAfter < d * 0.67, '181日目以降が67%より高い');
    assert.strictEqual(perDayAfter, d * 0.5);
  });

  test('支給額は日数に対して単調非減少で、日数0なら0円', () => {
    const d = app.calcIkujiDailyWage(280000);
    let prev = -1;
    for (let n = 0; n <= 740; n++) {
      const t = app.calcIkujiBenefit(d, n).total;
      assert.ok(t >= prev, n + '日で支給総額が減った');
      prev = t;
    }
    assert.strictEqual(app.calcIkujiBenefit(d, 0).total, 0);
  });

  test('支給額は賃金月額に対して単調非減少で、上限を超えると増えない', () => {
    let prev = -1;
    for (let w = 100000; w <= 900000; w += 1000) {
      const t = app.calcIkujiBenefit(app.calcIkujiDailyWage(w), 308).total;
      assert.ok(t >= prev, w + '円で支給総額が減った');
      prev = t;
    }
    const atCap = app.calcIkujiBenefit(app.calcIkujiDailyWage(app.IKUJI_WAGE_MONTHLY_CAP), 308).total;
    assert.strictEqual(app.calcIkujiBenefit(app.calcIkujiDailyWage(2000000), 308).total, atCap);
  });

  test('本文の計算例（月収30万円・1歳まで308日）と一致する', () => {
    const leave = app.calcIkujiLeaveDays('2026-10-01', 12);
    const b = app.calcIkujiBenefit(app.calcIkujiDailyWage(300000), leave.days);
    assert.strictEqual(b.highDays, 180);
    assert.strictEqual(b.lowDays, 128);
    assert.strictEqual(b.high, 1206000);
    assert.strictEqual(b.low, 640000);
    assert.strictEqual(b.total, 1846000); // 本文の「約184万円」
  });

  test('出産手当金と育児休業給付金は計算の基礎が別（同じ月額でも日額が一致しない）', () => {
    // 出産手当金は標準報酬月額÷30を10円未満四捨五入、育休は実賃金÷30を切り捨て。
    // 入力欄を1つにまとめてしまう改変への歯止め。
    assert.strictEqual(app.calcStandardDailyWage(170000), 5670);
    assert.strictEqual(app.calcIkujiDailyWage(170000), 5666);
  });
});

describe('maternity-leave-calc: 産休・育休中の社会保険料の免除', () => {
  const app = loadApp('maternity-leave-calc');
  const d = (s) => new Date(s + 'T00:00:00');

  // ---- 料率・等級の定数が一次資料と一致しているか ----

  test('厚生年金・介護の料率と厚生年金の等級上下限が一次資料と一致する', () => {
    // 日本年金機構「厚生年金保険の保険料」: 18.3%で固定、1等級8万8千円〜32等級65万円
    assert.strictEqual(app.PENSION_RATE, 0.183);
    assert.strictEqual(app.PENSION_STD_FLOOR, 88000);
    assert.strictEqual(app.PENSION_STD_CAP, 650000);
    // 協会けんぽ「介護保険料率」: 令和8年3月分から1.62%（全国一律）
    assert.strictEqual(app.CARE_RATE, 0.0162);
  });

  test('健康保険料率は47都道府県そろっていて、令和8年度の最高・最低と一致する', () => {
    const names = Object.keys(app.HEALTH_RATES);
    assert.strictEqual(names.length, 47);
    // 協会けんぽ 令和8年度 都道府県単位保険料率
    assert.strictEqual(app.HEALTH_RATES['東京都'], 9.85);
    assert.strictEqual(app.HEALTH_RATES['大阪府'], 10.13);
    assert.strictEqual(app.HEALTH_RATES['愛知県'], 9.93);
    assert.strictEqual(app.HEALTH_RATES['佐賀県'], 10.55); // 最高
    assert.strictEqual(app.HEALTH_RATES['新潟県'], 9.21);  // 最低
    const values = names.map((n) => app.HEALTH_RATES[n]);
    assert.strictEqual(Math.max(...values), 10.55);
    assert.strictEqual(Math.min(...values), 9.21);
  });

  test('index.html の都道府県セレクトの選択肢と料率テーブルが一致する', () => {
    // 片方だけ更新して、画面の表示と計算がずれるのを防ぐ。
    const fs = require('fs');
    const path = require('path');
    const html = fs.readFileSync(
      path.resolve(__dirname, '..', '..', '..', 'apps', 'maternity-leave-calc', 'index.html'), 'utf8');
    const select = html.slice(html.indexOf('<select id="pref"'));
    const options = [...select.slice(0, select.indexOf('</select>'))
      .matchAll(/<option value="([^"]+)"[^>]*>([^（]+)（([\d.]+)%）<\/option>/g)];
    assert.strictEqual(options.length, 47, 'セレクトの選択肢が47件でない');
    for (const [, value, label, pct] of options) {
      assert.strictEqual(value, label.trim(), 'value と表示名が違う: ' + value);
      assert.ok(value in app.HEALTH_RATES, '料率テーブルに無い都道府県: ' + value);
      // 画面に書いた率と、計算に使う率が一致していること
      assert.strictEqual(Number(pct), app.HEALTH_RATES[value],
        value + ' の表示率と計算用の率が違う');
    }
  });

  // ---- 免除される月の範囲（「終了日の翌日が属する月の前月まで」） ----

  test('免除は「開始月から、終了日の翌日が属する月の前月まで」', () => {
    // 2026-08-20 開始、2026-11-26 終了 → 翌日 11-27 は11月 → その前月＝10月まで
    // つまり 8月・9月・10月 の3か月
    const r = app.calcExemptMonthRange(d('2026-08-20'), d('2026-11-26'));
    assert.strictEqual(r.months, 3);
  });

  test('終了日が月末だと、一般ルールの結果がそのまま「終了月まで」になる', () => {
    // 一次資料の括弧書き（終了日が月の末日の場合は終了月）が、
    // 一般ルールの帰結であることを固定する。
    const endOfMonth = app.calcExemptMonthRange(d('2026-08-20'), d('2026-11-30'));
    assert.strictEqual(endOfMonth.months, 4); // 8/9/10/11月
    const dayBefore = app.calcExemptMonthRange(d('2026-08-20'), d('2026-11-29'));
    assert.strictEqual(dayBefore.months, 3); // 11月は対象外
  });

  test('月末の1日違いが1か月の差になる（境界）', () => {
    // 2月（28日）・4月（30日）・12月（31日）で末日の判定がずれないこと
    for (const [last, prev] of [['2027-02-28', '2027-02-27'],
                                ['2026-04-30', '2026-04-29'],
                                ['2026-12-31', '2026-12-30']]) {
      const start = d(last.slice(0, 7) + '-01');
      assert.strictEqual(app.calcExemptMonthRange(start, d(last)).months, 1, last);
      assert.strictEqual(app.calcExemptMonthRange(start, d(prev)).months, 0, prev);
    }
  });

  test('同一月内で終わる休業は、原則では0か月になる', () => {
    assert.strictEqual(app.calcExemptMonthRange(d('2026-05-10'), d('2026-05-20')).months, 0);
  });

  test('免除月数は負にならない', () => {
    // 終了日が開始日より前という不正な入力でもマイナスを返さない
    assert.strictEqual(app.calcExemptMonthRange(d('2026-05-10'), d('2026-01-20')).months, 0);
  });

  // ---- 育児休業の14日ルール（令和4年10月1日以降） ----

  test('同一月内で終わる育休は、開始月に14日以上なら1か月分が免除される', () => {
    // 5/10 開始 5/23 終了 ＝ 両端含めて14日 → 免除
    assert.strictEqual(app.calcIkujiExemptMonths(d('2026-05-10'), d('2026-05-23')), 1);
    // 1日短い13日 → 免除なし
    assert.strictEqual(app.calcIkujiExemptMonths(d('2026-05-10'), d('2026-05-22')), 0);
  });

  test('14日ルールは、原則で免除が出る場合の月数を増やさない', () => {
    // 月末まで取った育休は原則で1か月。14日ルールで二重に数えてはいけない。
    assert.strictEqual(app.calcIkujiExemptMonths(d('2026-05-01'), d('2026-05-31')), 1);
    assert.strictEqual(app.calcIkujiExemptMonths(d('2026-05-20'), d('2026-07-31')), 3);
  });

  test('育休を延ばすと免除月数は単調非減少', () => {
    const start = d('2026-11-27');
    let prev = -1;
    for (let i = 0; i < 800; i++) {
      const end = new Date(2026, 10, 27 + i);
      const m = app.calcIkujiExemptMonths(start, end);
      assert.ok(m >= prev, i + '日目で免除月数が減った');
      prev = m;
    }
  });

  test('育休の選択肢（1歳／1歳6か月／2歳）を伸ばすと免除月数も増える', () => {
    const birth = d('2026-10-01');
    const months = [12, 18, 24].map((until) => {
      const leave = app.calcIkujiLeaveDays(birth, until);
      return app.calcIkujiExemptMonths(leave.start, leave.end);
    });
    assert.deepStrictEqual(months, [11, 17, 23]);
  });

  // ---- 1か月あたりの本人負担 ----

  test('本人負担は労使合計の料率の半分', () => {
    // 協会けんぽ「保険料は、事業主と被保険者が折半で負担します。」
    const p = app.calcMonthlyPremium(300000, 9.85, false);
    assert.strictEqual(p.health, Math.round(300000 * 0.0985 / 2));
    assert.strictEqual(p.pension, Math.round(300000 * 0.183 / 2));
    assert.strictEqual(p.health, 14775);
    assert.strictEqual(p.pension, 27450);
    assert.strictEqual(p.care, 0);
    assert.strictEqual(p.total, 42225);
  });

  test('40歳以上は介護保険料率1.62%の半分が上乗せされる', () => {
    const p = app.calcMonthlyPremium(300000, 9.85, true);
    assert.strictEqual(p.care, Math.round(300000 * 0.0162 / 2));
    assert.strictEqual(p.care, 2430);
    assert.strictEqual(p.total, 14775 + 2430 + 27450);
  });

  test('内訳の合計が total と必ず一致する（表示がずれない）', () => {
    for (const m of [88000, 170000, 260000, 300001, 499999, 650000, 980000]) {
      for (const care of [false, true]) {
        const p = app.calcMonthlyPremium(m, 9.85, care);
        assert.strictEqual(p.health + p.care + p.pension, p.total, m + '/' + care);
      }
    }
  });

  test('厚生年金は1等級88,000円・32等級650,000円で打ち切られる', () => {
    // 650,000円を超えても厚生年金保険料は増えない
    const cap = app.calcMonthlyPremium(650000, 9.85, false).pension;
    assert.strictEqual(cap, Math.round(650000 * 0.183 / 2));
    assert.strictEqual(app.calcMonthlyPremium(900000, 9.85, false).pension, cap);
    // 88,000円を下回っても下限で計算される
    const floor = app.calcMonthlyPremium(88000, 9.85, false).pension;
    assert.strictEqual(app.calcMonthlyPremium(50000, 9.85, false).pension, floor);
  });

  test('健康保険料には厚生年金の等級上限を適用しない（制度が別）', () => {
    // 厚生年金の上限65万円を健康保険にも適用してしまう改変への歯止め。
    const p = app.calcMonthlyPremium(900000, 9.85, false);
    assert.strictEqual(p.health, Math.round(900000 * 0.0985 / 2));
    assert.ok(p.health > app.calcMonthlyPremium(650000, 9.85, false).health);
  });

  test('未入力・0・負・NaN は0円（金額を表示しない状態）', () => {
    for (const v of ['', 0, -300000, NaN]) {
      assert.strictEqual(app.calcMonthlyPremium(v, 9.85, true).total, 0, String(v));
    }
  });

  test('料率が未定義でも落ちず、厚生年金分だけは出る', () => {
    const p = app.calcMonthlyPremium(300000, undefined, false);
    assert.strictEqual(p.health, 0);
    assert.strictEqual(p.pension, 27450);
  });

  test('都道府県で免除額が変わる（新潟 < 東京 < 佐賀）', () => {
    const at = (pref) => app.calcMonthlyPremium(300000, app.HEALTH_RATES[pref], false).total;
    assert.ok(at('新潟県') < at('東京都'), '新潟が東京以上になった');
    assert.ok(at('東京都') < at('佐賀県'), '東京が佐賀以上になった');
  });

  // ---- 産休と育休を通した合計 ----

  test('産休の免除月と育休の免除月は重複しない（育休開始＝産後休業終了の翌日）', () => {
    // 一次資料には「重複する場合は産前産後休業が優先」とあるが、
    // 本ツールの日程の取り方では構造上重複しない。ここが崩れたら二重計上になる。
    for (const birth of ['2026-01-15', '2026-02-28', '2026-03-31', '2026-10-01', '2026-12-05']) {
      const b = d(birth);
      const prenatalStart = new Date(b.getFullYear(), b.getMonth(), b.getDate() - 42);
      const sankyuEnd = new Date(b.getFullYear(), b.getMonth(), b.getDate() + 56);
      const leave = app.calcIkujiLeaveDays(b, 12);
      const s = app.calcExemptMonthRange(prenatalStart, sankyuEnd);
      const i = app.calcExemptMonthRange(leave.start, leave.end);
      assert.strictEqual(i.from, s.to + 1, birth + ': 産休と育休の免除月が連続していない');
    }
  });

  test('本文の計算例（予定日2026-10-01・標準報酬月額30万円・東京都・1歳まで）と一致する', () => {
    const birth = d('2026-10-01');
    const leave = app.calcIkujiLeaveDays(birth, 12);
    const ex = app.calcExemption({
      stdMonthly: 300000,
      healthRatePct: app.HEALTH_RATES['東京都'],
      withCare: false,
      sankyuStart: d('2026-08-20'),              // 予定日の42日前
      sankyuEnd: d('2026-11-26'),                // 出産日の56日後
      ikujiStart: leave.start,
      ikujiEnd: leave.end
    });
    assert.strictEqual(ex.sankyuMonths, 3);      // 2026年8・9・10月
    assert.strictEqual(ex.ikujiMonths, 11);      // 2026年11月〜2027年9月
    assert.strictEqual(ex.totalMonths, 14);
    assert.strictEqual(ex.monthly.total, 42225);
    assert.strictEqual(ex.total, 591150);        // 本文の「約59万円」
  });

  test('本文の計算例（標準報酬月額50万円・東京都・1歳まで）と一致する', () => {
    const birth = d('2026-10-01');
    const leave = app.calcIkujiLeaveDays(birth, 12);
    const ex = app.calcExemption({
      stdMonthly: 500000,
      healthRatePct: app.HEALTH_RATES['東京都'],
      withCare: false,
      sankyuStart: d('2026-08-20'),
      sankyuEnd: d('2026-11-26'),
      ikujiStart: leave.start,
      ikujiEnd: leave.end
    });
    assert.strictEqual(ex.monthly.health, 24625);
    assert.strictEqual(ex.monthly.pension, 45750);
    assert.strictEqual(ex.monthly.total, 70375);
    assert.strictEqual(ex.total, 985250);        // 本文の「約99万円」
  });

  test('免除総額は標準報酬月額に対して単調非減少', () => {
    const birth = d('2026-10-01');
    const leave = app.calcIkujiLeaveDays(birth, 12);
    const base = {
      healthRatePct: 9.85, withCare: true,
      sankyuStart: d('2026-08-20'), sankyuEnd: d('2026-11-26'),
      ikujiStart: leave.start, ikujiEnd: leave.end
    };
    let prev = -1;
    for (let m = 0; m <= 1000000; m += 1000) {
      const t = app.calcExemption(Object.assign({ stdMonthly: m }, base)).total;
      assert.ok(t >= prev, m + '円で免除総額が減った');
      prev = t;
    }
  });

  test('育児休業を取らない場合は産休分だけが免除される', () => {
    // 2026-11-28 の UX レビュー指摘: 育休分を既定で足すと、産休のみの人に
    // 3か月（約12.7万円）のところを14か月（約59万円）＝4.6倍の金額を見せてしまう。
    const birth = d('2026-10-01');
    const leave = app.calcIkujiLeaveDays(birth, 12);
    const base = {
      stdMonthly: 300000, healthRatePct: app.HEALTH_RATES['東京都'], withCare: false,
      sankyuStart: d('2026-08-20'), sankyuEnd: d('2026-11-26'),
      ikujiStart: leave.start, ikujiEnd: leave.end
    };
    const without = app.calcExemption(Object.assign({ takesIkuji: false }, base));
    assert.strictEqual(without.ikujiMonths, 0);
    assert.strictEqual(without.totalMonths, 3);
    assert.strictEqual(without.total, 42225 * 3); // 126,675円
    // 未指定・true のときは従来どおり育休分を含む（既定の挙動を変えていない）
    assert.strictEqual(app.calcExemption(base).totalMonths, 14);
    assert.strictEqual(app.calcExemption(Object.assign({ takesIkuji: true }, base)).totalMonths, 14);
  });

  test('「育児休業は取らない」の選択肢が index.html に存在する', () => {
    // value="0" を消すと、産休のみの人がまた4.6倍の金額を見ることになる。
    const fs = require('fs');
    const path = require('path');
    const html = fs.readFileSync(
      path.resolve(__dirname, '..', '..', '..', 'apps', 'maternity-leave-calc', 'index.html'), 'utf8');
    const select = html.slice(html.indexOf('<select id="ikuji-until"'));
    const body = select.slice(0, select.indexOf('</select>'));
    assert.ok(/<option value="0"/.test(body), '「育児休業は取らない」の選択肢が無い');
    for (const v of ['12', '18', '24']) {
      assert.ok(body.includes('value="' + v + '"'), v + 'か月の選択肢が無い');
    }
  });

  test('標準報酬月額が未入力なら月数は出るが金額は0', () => {
    const birth = d('2026-10-01');
    const leave = app.calcIkujiLeaveDays(birth, 12);
    const ex = app.calcExemption({
      stdMonthly: '', healthRatePct: 9.85, withCare: false,
      sankyuStart: d('2026-08-20'), sankyuEnd: d('2026-11-26'),
      ikujiStart: leave.start, ikujiEnd: leave.end
    });
    assert.strictEqual(ex.totalMonths, 14);
    assert.strictEqual(ex.total, 0);
  });
});

// ---------------------------------------------------------------------------
// medical-deduction: 令和8年分（2026年分）の医療費控除
//
// 国税庁 No.1120（令和8年4月1日現在法令等）
//   控除額 =（支払った医療費 − 保険金などで補てんされる金額）− 基準額
//   基準額 = 10万円。ただし総所得金額等が200万円未満の人は総所得金額等の5%
//   控除額は最高200万円
// 「年収（収入）の1%」と書いている解説が多いが、法令上の基準は収入ではなく
// 所得なので、入力の年収に1%を掛けると控除額が過大になる。
// この取り違えを二度と入れないよう、ここで固定する。
describe('medical-deduction: 令和8年分の医療費控除の基準額と控除額', () => {
  const app = () => loadApp('medical-deduction');

  // -- 基準額（国税庁 No.1120 の「10万円 or 総所得金額等の5%」） --

  test('総所得金額等が200万円以上なら基準額は10万円', () => {
    const f = app().calcMedicalThreshold;
    assert.strictEqual(f(2_000_000), 100_000);
    assert.strictEqual(f(3_560_000), 100_000);
    assert.strictEqual(f(50_000_000), 100_000);
  });

  test('総所得金額等が200万円未満なら基準額は所得の5%', () => {
    const f = app().calcMedicalThreshold;
    assert.strictEqual(f(760_000), 38_000);     // 年収150万円の給与所得
    assert.strictEqual(f(1_260_000), 63_000);   // 年収200万円の給与所得
    assert.strictEqual(f(1_670_000), 83_500);   // 年収250万円の給与所得
  });

  test('基準額は10万円を超えず、所得に対して単調非減少', () => {
    const f = app().calcMedicalThreshold;
    assert.strictEqual(f(2_000_001), 100_000);
    for (let inc = 0; inc <= 5_000_000; inc += 10_000) {
      assert.ok(f(inc) <= 100_000, inc + '円で基準額が10万円を超えた');
      assert.ok(f(inc + 10_000) >= f(inc), inc + '円の前後で基準額が下がった');
    }
  });

  test('基準額は年収ではなく所得から求める（年収200万円で2万円にならない）', () => {
    // 旧実装は min(年収×1%, 10万円) だったため年収200万円で20,000円になり、
    // 控除額を43,000円ぶん過大に出していた。
    const a = app();
    const totalIncome = a.calcSalaryIncome(2_000_000);
    assert.strictEqual(totalIncome, 1_260_000);
    assert.strictEqual(a.calcMedicalThreshold(totalIncome), 63_000);
    assert.notStrictEqual(a.calcMedicalThreshold(totalIncome), 20_000);
  });

  // -- 控除額（上限200万円・0が下限） --

  test('控除額は「医療費 − 補填額 − 基準額」になる', () => {
    const f = app().calcMedicalDeduction;
    // 年収500万円（給与所得356万円）→ 基準額10万円
    assert.strictEqual(f(300_000, 0, 3_560_000), 200_000);
    assert.strictEqual(f(300_000, 50_000, 3_560_000), 150_000);
    // 年収200万円（給与所得126万円）→ 基準額63,000円
    assert.strictEqual(f(150_000, 0, 1_260_000), 87_000);
  });

  test('控除額の上限は200万円', () => {
    const f = app().calcMedicalDeduction;
    assert.strictEqual(f(5_000_000, 0, 3_560_000), 2_000_000);
    assert.strictEqual(f(2_100_000, 0, 3_560_000), 2_000_000);
  });

  test('控除額は基準額に届かなければ0（マイナスにしない）', () => {
    const f = app().calcMedicalDeduction;
    assert.strictEqual(f(90_000, 0, 3_560_000), 0);
    assert.strictEqual(f(0, 0, 3_560_000), 0);
    assert.strictEqual(f(200_000, 500_000, 3_560_000), 0); // 補填が医療費を超える
  });

  test('控除額は医療費に対して単調非減少', () => {
    const f = app().calcMedicalDeduction;
    for (let m = 0; m <= 3_000_000; m += 10_000) {
      assert.ok(f(m + 10_000, 0, 3_560_000) >= f(m, 0, 3_560_000),
        m + '円の前後で控除額が減った');
    }
  });

  // -- セルフメディケーション税制（12,000円超・88,000円限度） --

  test('セルフメディケーション税制は12,000円を超えた部分が対象', () => {
    const f = app().calcSelfMedDeduction;
    assert.strictEqual(f(12_000), 0);
    assert.strictEqual(f(12_001), 1);
    assert.strictEqual(f(50_000), 38_000);
  });

  test('セルフメディケーション税制の上限は88,000円', () => {
    const f = app().calcSelfMedDeduction;
    assert.strictEqual(f(100_000), 88_000);   // 10万 − 1.2万 = 8.8万（ちょうど上限）
    assert.strictEqual(f(500_000), 88_000);
    assert.strictEqual(f(0), 0);
  });

  // -- 課税所得の概算（他の税ツールと同じ控除額を使っているか） --

  test('給与所得控除は year-end-adjustment と一致する', () => {
    // 同じ制度を4つのツールが別々に実装しているため、片方だけ改正に
    // 追随し損ねるのを防ぐ。year-end-adjustment 側は万円で受ける。
    const med = app().calcSalaryDeduction;
    const yea = loadApp('year-end-adjustment').calcSalaryDeduction;
    for (let man = 0; man <= 1000; man += 5) {
      assert.strictEqual(med(man * 10000), yea(man),
        man + '万円で medical-deduction と year-end-adjustment の給与所得控除が食い違った');
    }
  });

  test('給与所得控除は freelance-tax-simulator と一致する', () => {
    const med = app().calcSalaryDeduction;
    const fre = loadApp('freelance-tax-simulator').calcEmploymentDeduction;
    for (let y = 0; y <= 12_000_000; y += 50_000) {
      assert.strictEqual(med(y), fre(y), y + '円で2ツールの給与所得控除が食い違った');
    }
  });

  test('給与所得控除の最低保障額は74万円で、給与収入220万円まで一律', () => {
    // 国税庁 No.1410 令和8年分・令和9年分の速算表
    const f = app().calcSalaryDeduction;
    assert.strictEqual(f(1_000_000), 740_000);
    assert.strictEqual(f(2_200_000), 740_000);
    assert.strictEqual(f(2_200_001), 740_000);  // 収入×30%＋8万円＝740,000.3 → 切り捨て
    assert.strictEqual(f(3_600_000), 1_160_000);
    assert.strictEqual(f(6_600_000), 1_760_000);
    assert.strictEqual(f(8_500_000), 1_950_000);
    assert.strictEqual(f(20_000_000), 1_950_000); // 上限195万円
  });

  test('給与所得控除は給与収入そのものを超えない', () => {
    const f = app().calcSalaryDeduction;
    assert.strictEqual(f(0), 0);
    assert.strictEqual(f(500_000), 500_000);
    assert.strictEqual(app().calcSalaryIncome(500_000), 0);
  });

  test('基礎控除は year-end-adjustment と一致する', () => {
    const med = app().calcBasicDeduction;
    const yea = loadApp('year-end-adjustment').calcBasicDeduction;
    for (let y = 0; y <= 26_000_000; y += 100_000) {
      assert.strictEqual(med(y), yea(y), y + '円で2ツールの基礎控除が食い違った');
    }
  });

  test('基礎控除は令和8年分の段階表どおり（104万/67万/62万/48万/32万/16万/0）', () => {
    // 国税庁 No.1199 の「令和8年分・令和9年分」の列
    const f = app().calcBasicDeduction;
    assert.strictEqual(f(4_890_000), 1_040_000);
    assert.strictEqual(f(4_890_001), 670_000);
    assert.strictEqual(f(6_550_000), 670_000);
    assert.strictEqual(f(6_550_001), 620_000);
    assert.strictEqual(f(23_500_000), 620_000);
    assert.strictEqual(f(23_500_001), 480_000);
    assert.strictEqual(f(24_000_001), 320_000);
    assert.strictEqual(f(24_500_001), 160_000);
    assert.strictEqual(f(25_000_001), 0);
    assert.notStrictEqual(f(0), 480_000); // 旧実装の一律48万円に戻っていないこと
  });

  test('課税所得は給与所得から基礎控除を引いた額で、低年収では0になる', () => {
    const f = app().calcTaxableIncome;
    // 年収150万円: 給与所得76万円 − 基礎控除104万円 → 0
    assert.strictEqual(f(1_500_000), 0);
    // 年収500万円: 給与所得356万円 − 基礎控除104万円 = 252万円
    assert.strictEqual(f(5_000_000), 2_520_000);
    assert.strictEqual(f(0), 0);
  });

  test('年収150万円では還付が発生しない（課税所得0のため）', () => {
    // 旧実装は基礎控除48万円・最低保障55万円だったため課税所得47万円となり、
    // 税額0の人に還付額を表示していた。
    const a = app();
    assert.strictEqual(a.calcIncomeTax(a.calcTaxableIncome(1_500_000)), 0);
  });

  test('早見表の基準額が計算と一致する（index.html の二重管理を防ぐ）', () => {
    const fs = require('fs');
    const path = require('path');
    const html = fs.readFileSync(
      path.resolve(__dirname, '..', '..', '..', 'apps', 'medical-deduction', 'index.html'), 'utf8');
    const a = app();
    // 本文の早見表に載せている年収と基準額
    const rows = [[1_500_000, 38_000], [2_000_000, 63_000], [2_500_000, 83_500]];
    for (const row of rows) {
      const income = row[0];
      const threshold = row[1];
      assert.strictEqual(a.calcMedicalThreshold(a.calcSalaryIncome(income)), threshold,
        income + '円の基準額が計算と合わない');
      assert.ok(html.indexOf(threshold.toLocaleString('en-US') + '円') >= 0,
        income + '円の行の基準額が index.html に無い');
    }
    // 旧版は「min(年収×1%, 10万円)」「（または年収の1%）」「（10万円 or 年収1%）」の
    // 3か所で基準を収入ベースで説明していた。これらが復活していないことを見る。
    // 「よく『年収の1%』と説明されますが…ではなく所得です」という訂正の文は
    // 残してよいので、誤りの形（かっこ内の併記と式）だけを禁止する。
    for (const wrong of ['年収×1%', 'または年収の1%', 'or 年収1%', '年収の1%超']) {
      assert.ok(html.indexOf(wrong) < 0,
        'index.html に誤った基準の表記「' + wrong + '」が残っている');
    }
    assert.ok(html.indexOf('総所得金額等の5%') >= 0,
      'index.html に正しい基準（総所得金額等の5%）の説明が無い');
  });
});
