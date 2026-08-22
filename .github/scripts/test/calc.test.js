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
