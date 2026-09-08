#!/usr/bin/env node
'use strict';

/**
 * sitemap.xml を実態から組み立てる。
 *
 * 手で書いていたため、公開ページを入れ替えても lastmod が古いまま残り、
 * 52件中51件が実際の更新日とずれていた（最大117日）。
 * lastmod は検索エンジンが再クロールの要否を判断する手がかりなので、
 * 大幅に改稿しても古い日付のままだと更新に気づかれにくい。
 *
 * 対象は「公開されるHTML」のみ。非公開アプリ・内部資料・404は除く。
 * lastmod は git のコミット日（mtimeはcheckoutで変わるため使えない）。
 * ただし未コミットの変更があるファイルは今日として扱う。理由は dirty の項を参照。
 *
 *   node .github/scripts/build-sitemap.js          # 書き出す
 *   node .github/scripts/build-sitemap.js --check  # 差分があれば異常終了
 *   node .github/scripts/build-sitemap.js --check-urls  # URL集合のみ照合（CI用）
 *
 * 変更したページと sitemap.xml は同じコミットに含めること。
 * 別々のコミットにすると --check が落ちる。
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const BASE = 'https://keisanlab.jp';
const OUT = path.join(ROOT, 'sitemap.xml');
const CHECK = process.argv.includes('--check');
const CHECK_URLS = process.argv.includes('--check-urls');

// 公開物から外れるもの
const EXCLUDE_FILES = new Set(['404.html', 'create-ogp-image.html']);
const EXCLUDE_DIRS = ['.git', '.github', '.claude', 'node_modules', '_site', 'reports'];

const unpublished = new Set(
  fs.readFileSync(path.join(ROOT, '.github/unpublished-apps.txt'), 'utf8')
    .split('\n').map((l) => l.replace(/#.*$/, '').trim()).filter(Boolean)
);

/** 更新頻度と優先度は、ページの役割から決める */
function meta(urlPath) {
  if (urlPath === '/') return { changefreq: 'weekly', priority: '1.0' };
  if (urlPath.startsWith('/apps/')) return { changefreq: 'monthly', priority: '0.8' };
  if (urlPath === '/articles/') return { changefreq: 'weekly', priority: '0.8' };
  if (urlPath.startsWith('/articles/')) return { changefreq: 'monthly', priority: '0.7' };
  return { changefreq: 'yearly', priority: '0.3' }; // about / privacy / terms / contact
}

const files = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (EXCLUDE_DIRS.includes(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      const rel = path.relative(ROOT, full).split(path.sep).join('/');
      if (rel.startsWith('apps/')) {
        const parts = rel.split('/');
        const app = parts[1];
        // 非公開アプリと未完成テンプレート
        if (app === '_template' || unpublished.has(app)) continue;
        // 開発中の残骸（deploy.yml でも apps/mind-map/01.* を除いている）
        if (parts.length > 2 && /^\d\d\./.test(parts[2])) continue;
      }
      walk(full);
      continue;
    }
    if (!e.name.endsWith('.html') || EXCLUDE_FILES.has(e.name)) continue;
    files.push(full);
  }
})(ROOT);

const TODAY = new Date().toISOString().slice(0, 10);

/**
 * 未コミットの変更があるファイルの一覧。
 *
 * これを見ないと、生成→コミットの順で必ず1周ずれる。
 * 生成時点では git log がまだ前回のコミット日を返すのに、
 * コミットした瞬間その日付が今日に変わり、sitemap が古くなるため。
 * 変更中のファイルは「今日更新された」とみなすことで、
 * 変更と sitemap を同じコミットに入れれば CI の照合と一致する。
 */
const dirty = new Set(
  execSync('git status --porcelain', { cwd: ROOT })
    .toString()
    .split('\n')
    .map((l) => l.slice(3).trim())
    .filter(Boolean)
    // リネームは "old -> new" の形で出る
    .map((p) => (p.includes(' -> ') ? p.split(' -> ')[1] : p))
    .map((p) => p.replace(/^"|"$/g, ''))
);

/** 最終更新日。未コミットの変更があれば今日、なければ最後のコミット日 */
function lastModified(file) {
  const rel = path.relative(ROOT, file).split(path.sep).join('/');
  if (dirty.has(rel)) return TODAY;
  try {
    const d = execSync(`git log -1 --format=%ad --date=short -- "${rel}"`, {
      cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'],
    }).toString().trim();
    if (d) return d;
  } catch { /* 履歴が無い新規ファイル */ }
  return TODAY;
}

const urls = files.map((f) => {
  const rel = path.relative(ROOT, f).split(path.sep).join('/');
  // index.html はディレクトリURLで表す
  const urlPath = rel === 'index.html' ? '/'
    : rel.endsWith('/index.html') ? '/' + rel.slice(0, -'index.html'.length)
    : '/' + rel;
  return { loc: BASE + urlPath, lastmod: lastModified(f), ...meta(urlPath) };
});

// トップ → アプリ → 記事 → その他 の順に、URLで安定ソート
const rank = (u) => (u.loc === BASE + '/' ? 0 : u.loc.includes('/apps/') ? 1 : u.loc.includes('/articles/') ? 2 : 3);
urls.sort((a, b) => rank(a) - rank(b) || a.loc.localeCompare(b.loc));

const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...urls.flatMap((u) => [
    '  <url>',
    `    <loc>${u.loc}</loc>`,
    `    <lastmod>${u.lastmod}</lastmod>`,
    `    <changefreq>${u.changefreq}</changefreq>`,
    `    <priority>${u.priority}</priority>`,
    '  </url>',
  ]),
  '</urlset>',
  '',
].join('\n');

if (CHECK || CHECK_URLS) {
  const current = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';

  if (CHECK_URLS) {
    // URL の集合だけを比べる。
    // 日付は見ない。CI のチェックアウトは --depth 1 で履歴を持たず、
    // git log が全ファイルについて最新コミット日を返してしまうため、
    // 手元で生成した正しい日付とは必ず食い違う。
    const listed = new Set([...current.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]));
    const expected = new Set(urls.map((u) => u.loc));
    const missing = [...expected].filter((u) => !listed.has(u));
    const extra = [...listed].filter((u) => !expected.has(u));

    if (missing.length || extra.length) {
      console.error('sitemap.xml の URL が公開物と一致していません。');
      missing.forEach((u) => console.error(`  ✗ 未掲載: ${u}`));
      extra.forEach((u) => console.error(`  ✗ 余分  : ${u}`));
      console.error('  修正方針: node .github/scripts/build-sitemap.js を実行して commit してください。');
      process.exit(1);
    }
    console.log(`sitemap.xml の URL は公開物と一致しています（${urls.length} 件）`);
    process.exit(0);
  }

  // --check は日付まで含めて完全一致を見る（履歴のある手元でのみ意味がある）
  if (current !== xml) {
    console.error('sitemap.xml が実態と一致していません。');
    console.error('  node .github/scripts/build-sitemap.js を実行して commit してください。');
    process.exit(1);
  }
  console.log(`sitemap.xml は最新です（${urls.length} URL）`);
  process.exit(0);
}

fs.writeFileSync(OUT, xml);
console.log(`sitemap.xml を生成しました（${urls.length} URL）`);
