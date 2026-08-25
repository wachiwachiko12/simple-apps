#!/usr/bin/env node
/**
 * デプロイ後のスモークテスト。
 *
 * 「デプロイ成功 = 正常」ではないことを何度も経験したため、
 * 本番URLに実際にアクセスして期待どおりかを確認する。
 *   - デプロイが半日以上失敗し続けたのに気づかなかった
 *   - 内部ドキュメント155件が公開されていた
 *   - 記事の canonical が第三者ドメインを指していた
 *
 * 使い方:
 *   node .github/scripts/smoke-test.js
 *   node .github/scripts/smoke-test.js --base https://keisanlab.jp
 *
 * 終了コード: 0 = 合格 / 1 = 不合格
 */
'use strict';

const https = require('https');

const argBase = process.argv.indexOf('--base');
const BASE = (argBase !== -1 ? process.argv[argBase + 1] : 'https://keisanlab.jp').replace(/\/$/, '');

// [パス, 期待ステータス, 説明]
const CASES = [
  // 主要ページが生きていること
  ['/', 200, 'トップページ'],
  ['/articles/', 200, '記事一覧'],
  ['/about.html', 200, 'このサイトについて'],
  ['/contact.html', 200, 'お問い合わせ'],
  ['/privacy-policy.html', 200, 'プライバシーポリシー'],
  ['/terms.html', 200, '利用規約'],
  ['/sitemap.xml', 200, 'サイトマップ'],
  ['/robots.txt', 200, 'robots.txt'],
  ['/apps/wareki-converter/', 200, '代表的なアプリ'],
  ['/apps/household-budget/', 200, '流入1位のアプリ'],

  // 内部資料が公開されていないこと
  ['/apps/wareki-converter/APP_INFO.md', 404, '内部資料(APP_INFO)'],
  ['/apps/wareki-converter/SEO_REPORT.md', 404, '内部資料(SEO_REPORT)'],
  ['/apps/wareki-converter/UX_REPORT.md', 404, '内部資料(UX_REPORT)'],
  ['/reports/adsense-content-tasklist.md', 404, '内部資料(AdSense対策リスト)'],
  ['/apps/_template/', 404, '未完成のテンプレート'],
  // 公開基準を満たしていないアプリ（.github/unpublished-apps.txt）。
  // ビルドから外しているので、本番に出ていたら除外が効いていない。
  ['/apps/pomodoro/', 404, '未公開アプリ'],
  ['/apps/okr-planner/', 404, '未公開アプリ'],
  ['/apps/speech-timer/', 404, '未公開アプリ（presentation-timer へ統合）'],
];

// 本文の内容まで確認するケース
const CONTENT_CASES = [
  ['/articles/', /rel=["']canonical["'][^>]*keisanlab\.jp/i, '記事一覧の canonical が keisanlab.jp を指すこと'],
  ['/', /Keisanlab/i, 'トップページにサイト名が出ること'],
  // 非公開にしたURLで、GitHubの素の英語404ではなく自前の案内が出ること。
  // 404.html を置き忘れると読者は「Page not found · GitHub Pages」を見ることになる。
  ['/apps/okr-planner/', /お探しのページが見つかりません/, '存在しないツールで日本語の404ページが出ること'],
  // 移動先の案内は JS が描画するため、ここで確認できるのは対応表が同梱されていることまで。
  ['/apps/speech-timer/', /presentation-timer/, '404ページに統合先の対応表が含まれること'],
];

function fetch(url) {
  return new Promise((resolve) => {
    const req = https.get(url, { timeout: 15000 }, (res) => {
      // リダイレクトは追う
      if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location) {
        res.resume();
        const next = res.headers.location.startsWith('http') ? res.headers.location : BASE + res.headers.location;
        return resolve(fetch(next));
      }
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (c) => { if (body.length < 200000) body += c; });
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('timeout', () => { req.destroy(); resolve({ status: 0, body: '', error: 'timeout' }); });
    req.on('error', (e) => resolve({ status: 0, body: '', error: e.message }));
  });
}

(async () => {
  console.log(`\n=== デプロイ後スモークテスト: ${BASE} ===\n`);
  const failures = [];

  for (const [p, expect, desc] of CASES) {
    const r = await fetch(BASE + p);
    const ok = r.status === expect;
    console.log(`  ${ok ? 'OK  ' : 'NG  '}${String(r.status).padEnd(4)}(期待 ${expect})  ${p}`);
    if (!ok) failures.push({ p, desc, expect, got: r.status, error: r.error });
  }

  console.log('');
  for (const [p, re, desc] of CONTENT_CASES) {
    const r = await fetch(BASE + p);
    const ok = r.status === 200 && re.test(r.body);
    console.log(`  ${ok ? 'OK  ' : 'NG  '}${desc}`);
    if (!ok) failures.push({ p, desc, expect: 'content match', got: r.status });
  }

  console.log('');
  if (failures.length === 0) {
    console.log('✅ 合格：本番は期待どおりの状態です。\n');
    process.exit(0);
  }

  console.log(`❌ 不合格：${failures.length} 件。本番が期待と異なります。\n`);
  console.log('--- 開発側への差し戻し内容 ---');
  for (const f of failures) {
    console.log(`  ✗ ${f.p}`);
    console.log(`      ${f.desc}: 期待 ${f.expect} / 実際 ${f.got}${f.error ? ' (' + f.error + ')' : ''}`);
  }
  console.log('');
  console.log('  404 であるべきものが 200 → 内部資料の流出。deploy.yml の除外処理を確認。');
  console.log('  200 であるべきものが 404 → デプロイ未反映かパス誤り。');
  console.log('  ステータス 0     → 到達不能。Pages の障害かDNSを確認。\n');
  process.exit(1);
})();
