# APP_INFO — Markdownスライドメーカー

## 基本情報

| 項目 | 内容 |
|------|------|
| アプリ名（日本語） | Markdownスライド作成ツール |
| アプリ名（英語） | Markdown Slide Maker |
| URL | https://keisanlab.jp/apps/markdown-slides/ |
| ステータス | live |
| 作成日 | 2026-05-30 |

## ターゲット情報

| 項目 | 内容 |
|------|------|
| ターゲットユーザー | エンジニア・研究者・技術発表者 |
| ターゲットキーワード | Markdownスライド, プレゼン資料 Markdown, LT資料 作成, iA Presenter 無料代替 |
| 推定月間検索数 | 約 800〜2,000（複合KW合計） |

## 機能一覧

- Markdownエディタ（左ペイン）
- リアルタイムスライドプレビュー（右ペイン）
- `---` によるスライド分割
- スライドサムネイル一覧（クリック選択）
- テーマ選択 4種類（ダーク / ライト / ブルー / グリーン）
- フルスクリーンプレゼンモード（← → キー / クリックでページ送り）
- marked.js による Markdown記法フルサポート（コードブロック・テーブル対応）
- localStorage 自動保存（800ms debounce）
- window.print() による PDF出力
- サンプルコンテンツ内蔵

## 広告配置計画

| ID | 位置 | 想定フォーマット |
|----|------|----------------|
| ad-top | ツール上部（ファーストビュー内） | レスポンシブ横長バナー |
| ad-result | サムネイル下・使い方上 | 記事内広告 |
| ad-footer | フッター直上 | レスポンシブ横長バナー |

## SEO設定

- title: `Markdownスライド作成ツール【無料・ブラウザ完結】プレゼン資料をMDで作成 | Keisanlab`
- meta description: `Markdownでプレゼンスライドを作成。---でスライド分割・4テーマ選択・フルスクリーン発表・PDF出力対応。インストール不要・登録不要・無料。エンジニアのLT発表に。`
- h1: `Markdownスライド作成ツール — ブラウザでプレゼン資料を作成`
- canonical: `https://keisanlab.jp/apps/markdown-slides/`
- OGP / Twitter Card: 設定済み

## AdSense対応チェックリスト

- [x] 広告ユニット `.ad-unit` × 3 配置済み
- [x] プライバシーポリシーリンク（フッター）
- [x] 使い方セクション 200文字以上
- [x] モバイルファースト・レスポンシブ
- [x] viewport maximum-scale=1.0（iOSズーム防止）
- [x] GA4 トラッキング（G-DK2WQM49L6）
- [x] HTTPS配信前提（Netlify/Cloudflare Pages）

## 差別化ポイント

- iA Presenter・Marp などの代替として登録・インストール不要
- ブラウザ完結 / フロントエンドのみ（サーバー不要）
- 4テーマ切替でデザインの柔軟性を確保
- コードブロック・テーブル対応でエンジニアのLT用途に最適
