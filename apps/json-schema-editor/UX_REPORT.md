# UX_REPORT — JSONエディタ・スキーマジェネレーター

レビュー日: 2026-05-30
対象: apps/json-schema-editor/
ステータス: live

---

## 総合判定: 承認

全9項目のチェックをクリア。修正箇所なし。

---

## 必須チェック項目 結果

| # | チェック項目 | 結果 | 詳細 |
|---|-------------|------|------|
| 1 | GA4スクリプト（G-DK2WQM49L6） | OK | `<meta charset="UTF-8">`直後に配置済み |
| 2 | viewport `maximum-scale=1.0` | OK | `width=device-width, initial-scale=1.0, maximum-scale=1.0` |
| 3 | OGP/Twitter Card | OK | og:image・twitter:card="summary_large_image"・twitter:image すべて存在 |
| 4 | favicon `/favicon.svg` | OK | `<link rel="icon" type="image/svg+xml" href="/favicon.svg">` |
| 5 | タッチターゲット 44px以上 | OK | `.btn-sm { height: 44px }`・`.tab-btn { min-height: 44px }` |
| 6 | `.ad-unit` CSS | OK | `margin: 1.25rem 0;` のみ。min-height・background-color なし |
| 7 | プライバシーポリシーリンク | OK | フッターに `/privacy-policy.html` へのリンクあり |
| 8 | canonical タグ | OK | `<link rel="canonical" href="https://keisanlab.jp/apps/json-schema-editor/">` |
| 9 | XSS対策（innerHTML） | OK | 詳細は下記参照 |

---

## XSS対策 詳細

`script.js` 内の `innerHTML` 使用箇所を全件確認した。

| 行 | 箇所 | 評価 |
|----|------|------|
| 217 | `treeView.innerHTML = ''` | リセット操作のみ。安全 |
| 233 | `keySpan` 構築 | `escapeHtml(String(key))` でキーをエスケープ済み |
| 237 | null値ノード | `keySpan`（エスケープ済み）＋固定文字列。安全 |
| 243 | string値ノード | `escapeHtml(value)` で文字列値をエスケープ済み |
| 249 | number値ノード | `number` 型はJSONパース済みの数値のみ。XSSリスクなし |
| 255 | boolean値ノード | `true`/`false` の固定文字列のみ。XSSリスクなし |
| 274-277 | toggleBtn内部 | `keySpan`（エスケープ済み）＋固定クラス名・固定文字列。安全 |
| 444 | バリデーション通過メッセージ | 固定の日本語文字列のみ。安全 |
| 452 | バリデーション失敗メッセージ | `innerHTML = ''` リセット後に `createTextNode` でエラー追加。安全 |

`escapeHtml()` 関数は `&`, `<`, `>`, `"` の4文字を適切にHTMLエンティティ変換している。ユーザー入力がDOMに反映されるすべての箇所でエスケープが適用されており、XSS脆弱性はない。

---

## UXレビュー（8観点）

対象ペルソナ: バックエンドエンジニア・API設計者（ターゲットユーザー）

### 1. ファーストビュー
ヘッダーに機能名と説明文が簡潔に記載されており、初見ユーザーが何のツールか即理解できる。サンプルJSONが初期表示されるため、操作イメージがつかみやすい。

### 2. 入力UX
ドラッグ&ドロップ・ファイル読み込み・直接入力の3方法に対応。入力と同時にリアルタイムバリデーションが動作し、エラー箇所がステータスバーに即時表示される。

### 3. 結果表示
整形・圧縮結果はテキストエリアに直接反映。スキーマ生成・変換結果は専用の読み取り専用テキストエリアに出力され、コピーボタンでクリップボードに取得可能。トースト通知でコピー完了を確認できる。

### 4. エラー処理
JSON構文エラーは発生箇所のメッセージを含めてステータスバーに表示。変換・バリデーションのエラーも専用の赤色エリアに表示される。エラーメッセージは日本語で分かりやすい。

### 5. モバイル対応
`maximum-scale=1.0` でiOSズーム防止済み。タブナビゲーションは横スクロール対応（`overflow-x: auto`）。ボタン類はすべて44px以上。モバイルファースト設計でレスポンシブCSS適用済み。

### 6. 信頼性
「データはすべてブラウザ内で処理」という旨の説明が使い方セクションに記載されており、FAQにも同様の記述あり。プライバシーポリシーリンクあり。

### 7. コンテンツ
使い方（手順6項目）・ツール説明（200文字以上）・FAQ（3項目）を完備。SEOキーワードがh1・meta description・本文に自然に組み込まれている。

### 8. 広告配置
広告ユニット3箇所（ツール上部・ツール下部・使い方下部）にプレースホルダーを配置。AdSenseポリシー準拠のCSS（`margin: 1.25rem 0;` のみ）。

---

## 修正対応

修正項目なし。全チェックOK。
