#!/usr/bin/env node
/**
 * リリース前の静的検査ゲート。
 *
 * 検査項目は「実際に本番へ流出した不具合」から起こしている:
 *   - readability-scorer が構文エラーで全く動作していなかった  → JS構文
 *   - 記事6本の canonical が第三者ドメインの404を指していた    → canonical
 *   - /apps/ が404で4ページの唯一の導線が死んでいた            → 内部リンク
 *   - 空の広告枠と無効な data-ad-slot が全ページに出ていた      → 広告枠
 *   - 内部ドキュメント155件が公開されていた                    → 内部ファイル流出
 *   - 35アプリが本文の61%をアコーディオンで隠していた          → details
 *
 * 使い方:
 *   node .github/scripts/validate-site.js            # リポジトリを検査
 *   node .github/scripts/validate-site.js --dir _site # 公開物を検査
 *
 * 終了コード: 0 = 合格 / 1 = 不合格（CIではデプロイを止める）
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SITE_HOST = 'keisanlab.jp';

const argDir = process.argv.indexOf('--dir');
const ROOT = argDir !== -1 ? process.argv[argDir + 1] : '.';
const IS_BUILD_OUTPUT = argDir !== -1;

const errors = [];
const warnings = [];

const err = (check, file, msg, fix) => errors.push({ check, file, msg, fix });
const warn = (check, file, msg, fix) => warnings.push({ check, file, msg, fix });

const rel = (p) => path.relative(ROOT, p).replace(/\\/g, '/') || '.';

function walk(dir, filter, out = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (e.name === '.git' || e.name === '.claude' || e.name === 'node_modules' || e.name === '_site') continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, filter, out);
    else if (filter(e.name)) out.push(full);
  }
  return out;
}

const htmlFiles = walk(ROOT, (n) => n.endsWith('.html'));
const jsFiles = walk(ROOT, (n) => n.endsWith('.js')).filter((f) => !f.includes('.github'));

// ---------------------------------------------------------------- 1. JS構文
// readability-scorer は const と function の名前衝突でファイル全体が
// パースできず、ツールが本番で一切動作していなかった。
for (const f of jsFiles) {
  const src = fs.readFileSync(f, 'utf8');
  // ライブラリのvendorコピーは対象外（巨大かつ自前保守ではない）
  if (/\.min\.js$/.test(f)) continue;
  try {
    new vm.Script(src, { filename: f });
  } catch (e) {
    err('js-syntax', rel(f), `JS構文エラー: ${e.message}`, 'このファイルは読み込み時に全体が失敗し、ツールが動作しません。該当箇所を修正してください。');
  }
}

// ------------------------------------------------------------- 2. HTMLタグ整合
for (const f of htmlFiles) {
  const h = fs.readFileSync(f, 'utf8');
  for (const tag of ['div', 'main', 'section', 'details', 'table']) {
    const open = (h.match(new RegExp(`<${tag}\\b`, 'gi')) || []).length;
    const close = (h.match(new RegExp(`</${tag}>`, 'gi')) || []).length;
    if (open !== close) {
      err('html-balance', rel(f), `<${tag}> の開閉数が不一致（開 ${open} / 閉 ${close}）`, 'タグの閉じ忘れ・重複を修正してください。レイアウト崩れの原因になります。');
    }
  }
}

// --------------------------------------------------------- 3. canonical / og:url
// 記事6本が keisanlab.com（第三者サイト・404）を指しており、
// サイト唯一の読み物がGoogleから実質不可視になっていた。
for (const f of htmlFiles) {
  const h = fs.readFileSync(f, 'utf8');
  const checks = [
    ['canonical', /<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']+)["']/i],
    ['og:url', /<meta[^>]+property=["']og:url["'][^>]*content=["']([^"']+)["']/i],
  ];
  for (const [name, re] of checks) {
    const m = h.match(re);
    if (!m) continue;
    const url = m[1];
    if (!/^https?:\/\//i.test(url)) continue;
    const host = url.replace(/^https?:\/\//i, '').split('/')[0];
    if (host !== SITE_HOST) {
      err('canonical', rel(f), `${name} が別ドメインを指しています: ${url}`, `${SITE_HOST} に修正してください。別ドメインを指すとGoogleがこのページを正規版とみなさず、インデックスから外れます。`);
    }
  }
}

// ------------------------------------------------------------- 4. 内部リンク
// /apps/ が404のまま4ページから参照され、そのページの唯一の
// 「ツール一覧へ戻る」導線が死んでいた。
function resolvesOnDisk(target) {
  let p = target.split('#')[0].split('?')[0];
  if (!p.startsWith('/')) return true; // 相対リンクは対象外
  p = p.replace(/^\//, '');
  if (p === '') p = 'index.html';
  if (p.endsWith('/')) p += 'index.html';
  const full = path.join(ROOT, p);
  if (fs.existsSync(full)) return true;
  if (!path.extname(p) && fs.existsSync(path.join(ROOT, p, 'index.html'))) return true;
  return false;
}

const brokenTargets = new Map();
for (const f of htmlFiles) {
  const h = fs.readFileSync(f, 'utf8');
  for (const m of h.matchAll(/href=["'](\/[^"']*)["']/g)) {
    if (!resolvesOnDisk(m[1])) {
      if (!brokenTargets.has(m[1])) brokenTargets.set(m[1], []);
      brokenTargets.get(m[1]).push(rel(f));
    }
  }
}
for (const [target, srcs] of brokenTargets) {
  err('broken-link', srcs[0] + (srcs.length > 1 ? ` 他${srcs.length - 1}件` : ''), `リンク先が存在しません: ${target}`, 'リンク先を実在するパスに直すか、該当ページを作成してください。');
}

// --------------------------------------------------------------- 5. 広告枠
// data-ad-slot が "" や "auto" では何も表示されず、空の枠だけが
// コンテンツの前に残る。AdSense未承認中は枠自体を置かない方針。
for (const f of htmlFiles) {
  const h = fs.readFileSync(f, 'utf8');
  const emptyDivs = (h.match(/<div[^>]*class=["'][^"']*\bad-unit\b[^"']*["'][^>]*>\s*<\/div>/gi) || []).length;
  if (emptyDivs > 0) {
    err('ad-empty', rel(f), `空の広告枠が ${emptyDivs} 個あります`, '中身のない広告枠は空白やプレースホルダとして表示されます。削除してください。');
  }
  for (const m of h.matchAll(/<ins[^>]*class=["']adsbygoogle["'][^>]*>/gi)) {
    const slot = m[0].match(/data-ad-slot=["']([^"']*)["']/);
    if (slot && !/^\d+$/.test(slot[1])) {
      err('ad-slot', rel(f), `data-ad-slot が数値IDではありません: "${slot[1]}"`, 'AdSense管理画面で発行された数値のスロットIDを設定してください。空や "auto" では広告が描画されません。');
    }
  }
}

// ------------------------------------------------------- 6. 内部ファイルの流出
// 公開物の検査時のみ。155件の運営ドキュメントが配信されていた。
if (IS_BUILD_OUTPUT) {
  const leaked = walk(ROOT, (n) => n.endsWith('.md'));
  for (const f of leaked) {
    err('internal-leak', rel(f), '内部ドキュメントが公開物に含まれています', 'deploy.yml の除外処理を確認してください。運営資料の公開は情報漏洩です。');
  }
  for (const d of ['reports', 'apps/_template']) {
    if (fs.existsSync(path.join(ROOT, d))) {
      err('internal-leak', d, '公開対象外のディレクトリが含まれています', 'deploy.yml の除外処理を確認してください。');
    }
  }
}

// ------------------------------------------------------- 7. ズームの禁止（a11y）
// maximum-scale や user-scalable=no は端末上での拡大を封じる。
// 弱視の利用者が文字を大きくできなくなり、WCAG 1.4.4 に反する。
// 10ページで指定されていた（税務・法務など読むことが前提のページを含む）。
for (const f of htmlFiles) {
  const h = fs.readFileSync(f, 'utf8');
  const vp = h.match(/<meta[^>]+name=["']viewport["'][^>]*>/i);
  if (!vp) continue;
  if (/maximum-scale\s*=\s*[12](\.0)?\b/i.test(vp[0]) || /user-scalable\s*=\s*(no|0)/i.test(vp[0])) {
    err('a11y-zoom', rel(f), 'viewport が拡大を禁止しています', 'maximum-scale / user-scalable=no を外してください。弱視の利用者が文字を拡大できなくなります（WCAG 1.4.4）。');
  }
}

// ------------------------------------------------- 8. フォーム部品のラベル（a11y）
// label / aria-label が無いと、スクリーンリーダーでは何の入力欄か分からない。
// placeholder はラベルの代わりにならない（入力すると消えるため）。
// 入れ子ラベル <label>…<input>…</label> は関連付け済みなので除外する。
for (const f of htmlFiles) {
  const h = fs.readFileSync(f, 'utf8')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');
  const labelFor = new Set([...h.matchAll(/<label[^>]*\sfor=["']([^"']+)["']/gi)].map((m) => m[1]));
  const labelRanges = [...h.matchAll(/<label\b[^>]*>[\s\S]*?<\/label>/gi)].map((m) => [m.index, m.index + m[0].length]);

  let unlabeled = 0;
  for (const m of h.matchAll(/<(input|select|textarea)\b[^>]*>/gi)) {
    const tag = m[0];
    if (/type=["'](hidden|submit|button|reset|image)["']/i.test(tag)) continue;
    if (/\bhidden\b/i.test(tag)) continue; // JSから開くファイル選択など、利用者に見えない部品
    if (/aria-label|aria-labelledby|title\s*=/i.test(tag)) continue;
    const id = tag.match(/\sid=["']([^"']+)["']/);
    if (id && labelFor.has(id[1])) continue;
    if (labelRanges.some(([s, e]) => m.index >= s && m.index < e)) continue;
    unlabeled++;
  }
  if (unlabeled > 0) {
    warn('a11y-label', rel(f), `ラベルのない入力欄が ${unlabeled} 個あります`, 'label for / aria-label を付けてください。placeholder は入力すると消えるためラベルの代わりになりません。');
  }
}

// --------------------------------------------------------- 9. ページ重量（性能）
// 現状は最大54KBで健全。将来の肥大化を捕まえるための予防線として置く。
const WEIGHT_WARN = 150 * 1024;
for (const f of htmlFiles) {
  const size = fs.statSync(f).size;
  if (size > WEIGHT_WARN) {
    warn('perf-weight', rel(f), `HTMLが ${(size / 1024).toFixed(0)}KB あります`, `${WEIGHT_WARN / 1024}KB を超えています。インラインCSS/JSの外出しや内容の分割を検討してください。`);
  }
}

// ---------------------------------------------------------- 10. details の展開
// 35アプリが本文の平均61%を初期非表示にしており、審査員には
// ほぼ空のページに見えていた。
for (const f of htmlFiles) {
  const h = fs.readFileSync(f, 'utf8');
  const closed = (h.match(/<details(?![^>]*\bopen\b)[^>]*>/gi) || []).length;
  if (closed > 0) {
    warn('details-closed', rel(f), `初期状態で閉じている <details> が ${closed} 個あります`, '本文が初期表示されず、内容が薄いページに見えます。open 属性の付与を検討してください。');
  }
}

// ------------------------------------------------------------------- 出力
const label = IS_BUILD_OUTPUT ? '公開物 (_site)' : 'リポジトリ';
console.log(`\n=== サイト検査: ${label} ===`);
console.log(`  HTML ${htmlFiles.length} 件 / JS ${jsFiles.length} 件を検査\n`);

const group = (items) => {
  const by = {};
  for (const i of items) (by[i.check] = by[i.check] || []).push(i);
  return by;
};

if (warnings.length) {
  console.log(`--- 警告 ${warnings.length} 件（デプロイは継続します）---`);
  for (const [check, items] of Object.entries(group(warnings))) {
    console.log(`  [${check}] ${items.length} 件`);
    for (const i of items.slice(0, 5)) console.log(`    ${i.file}: ${i.msg}`);
    if (items.length > 5) console.log(`    ... 他 ${items.length - 5} 件`);
    console.log(`    → ${items[0].fix}`);
  }
  console.log('');
}

if (errors.length === 0) {
  console.log('✅ 合格：デプロイを継続します。\n');
  process.exit(0);
}

console.log(`❌ 不合格：${errors.length} 件の問題を検出しました。デプロイを中止します。\n`);
console.log('--- 開発側への差し戻し内容 ---');
for (const [check, items] of Object.entries(group(errors))) {
  console.log(`\n[${check}] ${items.length} 件`);
  for (const i of items.slice(0, 10)) console.log(`  ✗ ${i.file}\n      ${i.msg}`);
  if (items.length > 10) console.log(`  ... 他 ${items.length - 10} 件`);
  console.log(`  修正方針: ${items[0].fix}`);
}
console.log('\n上記を修正し、再度この検査を通してから push してください。');
console.log('  ローカル実行: node .github/scripts/validate-site.js\n');
process.exit(1);
