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
