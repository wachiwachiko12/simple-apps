# UX_REPORT — Markdownスライド作成ツール

**レビュー日**: 2026-05-30
**対象**: `apps/markdown-slides/`
**レビュアー**: ux-reviewer (app-builder経由)

---

## 総合判定

**✅ 承認**

ブロッカーなし。2件の問題（広告ユニットCSS・XSSリスク）を修正済み。

---

## 必須チェック項目 結果

| # | 項目 | 結果 | 備考 |
|---|------|------|------|
| 1 | GA4 G-DK2WQM49L6 (`<meta charset>` 直後) | ✅ 合格 | 正しい位置に配置済み |
| 2 | viewport `maximum-scale=1.0` | ✅ 合格 | iOSズーム防止済み |
| 3 | OGP og:image / twitter:card / twitter:image | ✅ 合格 | summary_large_image 設定済み |
| 4 | favicon `/favicon.svg` | ✅ 合格 | link rel="icon" あり |
| 5 | タッチターゲット 44px以上 | ✅ 合格 | .btn・.slide-nav-btn・.present-btn すべて height:44px |
| 6 | `.ad-unit` CSS: `margin: 1.25rem 0;` のみ | ✅ 修正済み | min-height・background-color・display:flex を削除 |
| 7 | プライバシーポリシー `/privacy-policy.html` | ✅ 合格 | フッターに正しくリンクあり |
| 8 | canonical `<link rel="canonical">` | ✅ 合格 | 正しいURLで設定済み |
| 9 | marked.js CDN + XSS対策 | ✅ 修正済み | バージョン固定(@9) + DOMPurify追加 |

---

## 修正内容の詳細

### 修正1: `.ad-unit` CSSの整理 (style.css)

**修正前**: `min-height: 90px`・`background: #e9ecef`・`display: flex` 等の見た目スタイルが含まれていた。AdSenseポリシーでは広告ユニットに `min-height` や背景色を設定することが非推奨（空枠として認識されAdSenseスコアに悪影響）。

**修正後**: `margin: 1.25rem 0;` のみ。

### 修正2: marked.js XSS対策 (index.html + script.js)

**修正前**: `marked@latest`（バージョン未固定）を使用。`marked.parse()` の出力をそのまま `innerHTML` に代入しており、悪意あるMarkdown入力（`<script>`タグ等）がXSS攻撃に利用される可能性があった。旧来の `marked.setOptions({ sanitize: true })` はmarked v5以降で削除済みのため無効。

**修正後**:
- CDN URLを `marked@9` に固定しバージョンを安定化
- DOMPurify v3をCDN経由で追加
- `parseSlides()` 内で `DOMPurify.sanitize(raw)` を適用し、XSSベクターを無害化

---

## 8観点UXレビュー

### 1. ファーストビュー
ヘッダーにツール名とサブタイトルが明確。h1にキーワード「Markdownスライド作成ツール — ブラウザでプレゼン資料を作成」が含まれている。スライド枚数・保存状態が常時表示されており、状態把握が容易。

### 2. 入力UX
エディタとプレビューの2ペイン構成でリアルタイム確認できる。プレースホルダーにサンプルMarkdownが入っており初見ユーザーが迷わない。`spellcheck="false"` でコード入力を妨げない。

### 3. 結果表示
16:9のアスペクト比でスライドを正確にプレビュー表示。サムネイル一覧で全スライドを俯瞰できる。テーマ変更がリアルタイムで反映される。

### 4. エラー
スライドが0枚になったときのフォールバックメッセージあり。リセット確認ダイアログあり（誤操作防止）。marked.jsが未読込の場合のフォールバック処理あり。

### 5. モバイル
モバイルでは縦並び（エディタ上・プレビュー下）に自動切替。ボタン類はすべて44px以上。maximum-scale=1.0でiOSズーム防止済み。

### 6. 信頼性
プライバシーポリシーリンクあり。自動保存インジケーターが緑色で常時表示。「登録不要・完全無料」をサブタイトルに明記。

### 7. コンテンツ
「使い方」「MarkdownスライドメーカーとはL」「対応するMarkdown記法」の3セクションで十分な説明量あり。SEOに有効なキーワードが本文中に自然に含まれている。

### 8. 広告
`.ad-unit` が3箇所（ツール上・ツール下・フッター上）に配置。修正によりAdSenseポリシー準拠のCSSになっている。`aria-hidden="true"` で広告要素をスクリーンリーダーから除外済み。

---

## 残留懸念事項（ブロッカーではない）

- `ogp-markdown-slides.png` の実ファイルが存在しない場合、SNSシェア時に画像が表示されない。OGP画像の生成・設置を推奨。
- marked@9 固定のためメジャーバージョンアップ時にURLを更新する必要がある。
- PDF出力は現状ブラウザの印刷ダイアログ経由のため、スライド1枚ずつのPDF出力には対応していない旨をUIに明記することを推奨。
