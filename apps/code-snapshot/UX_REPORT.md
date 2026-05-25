# UX レポート — コードスニペット画像化ツール

**総合判定: ✅ 承認**

レビュー日: 2026-05-26
ペルソナ: コードをSNS（X/Qiita/Zenn/note）に投稿したい日本人エンジニア（20〜35歳）。Carbon は知っているが日本語コメントが化けた経験あり。スマホでも確認したい。

---

## 1. ファーストビュー

**評価: ◎ 問題なし**

- h1「コードスニペット画像化ツール」とサブタイトル「コードをPNG画像に変換 — Zenn・Qiita・SNS投稿に最適」が3秒以内に目に入る。
- デフォルトコードがプレビューに表示済みなので、ツールの動作を説明なしに即理解できる。
- meta description に「Carbon代替・日本語フォント対応」を明記しており検索流入にも対応。

---

## 2. 入力UX

**評価: ○ 概ね良好（修正済み）**

### 修正前の問題
- 空入力状態でダウンロードボタンを押すと空白の画像が生成されてしまい、ユーザーが「壊れた？」と感じるリスクがあった。

### 修正内容（script.js）
- `handleDownload()` の先頭に空入力バリデーションを追加。空のとき `codeInput` にフォーカスを移し、赤いシェイクアニメーション（`input-error` クラス）を0.3秒表示。
- CSS に `#code-input.input-error` と `@keyframes shake` を追加（style.css）。

### 継続して良好な点
- デフォルトコードでリアルタイムプレビューが即起動する。
- Tab キーで2スペースインデント挿入対応。
- `spellcheck="false" autocorrect="off" autocapitalize="off"` によりスマホ補正干渉なし。

---

## 3. 結果表示

**評価: ○ 概ね良好（修正済み）**

### 修正前の問題
- モバイルではレイアウトが縦積み（設定パネル → プレビュー → コード入力エリア）になっており、プレビューを確認した後にスクロールしないとダウンロードボタンに到達できなかった。

### 修正内容（index.html / style.css）
- プレビューエリア（`.preview-area`）の直下にダウンロードボタン（`#download-btn-preview`）を追加。
- デスクトップ（768px以上）では `display: none` で非表示、モバイルのみ表示。
- script.js でサイドパネルのボタンと同じハンドラ・disabled 状態を同期。

### 継続して良好な点
- プレビューのコードカードはmacOS風ウィンドウバー付きで視覚的に分かりやすい。
- 2x スケールでの高解像度キャプチャ対応済み。

---

## 4. エラー処理

**評価: ○ 修正済み + 継続良好**

| シナリオ | 対応 |
|---|---|
| 空入力でダウンロード | 赤枠シェイク + フォーカス移動（今回追加） |
| html2canvas 失敗 | `alert()` でリロード案内 |
| ハイライト失敗 | try/catch でそのまま表示（フォールバック） |
| テーマCSS読み込み失敗 | CDN依存のため軽微なリスクあり（許容範囲） |

---

## 5. モバイル

**評価: ◎ 問題なし**

- `<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">` — iOSズーム防止 ✅
- `.preset-btn` : `min-width: 44px; min-height: 44px` ✅
- `.download-btn` : `min-height: 44px` ✅
- `.back-link` : `min-height: 44px; line-height: 44px` ✅
- `input[type="color"]` : `width: 44px; height: 44px` ✅
- `#code-input` : `-webkit-text-size-adjust: 100%` でスマホフォントサイズ自動変更防止 ✅
- モバイル用ダウンロードボタン追加済み（今回修正）✅

---

## 6. 信頼性

**評価: ◎ 問題なし**

- フッターにプライバシーポリシーリンク（`/privacy-policy.html`） ✅
- `© 2026 Keisanlab` のコピーライト表記 ✅
- OGP・Twitter Card 設定済み ✅
- canonical URL 設定済み ✅
- GA4（G-DK2WQM49L6）トラッキング設定済み ✅

---

## 7. コンテンツ

**評価: ◎ 問題なし**

- 「使い方」セクション（5ステップのわかりやすいol） ✅
- 「コードスニペット画像化ツールとは」説明文（SEOテキストとして機能） ✅
- 「対応テーマ一覧」ul ✅
- デフォルトコード（日本語コメント入り）でサンプル機能を兼任 ✅
- h1 → h2 の見出し階層が適切 ✅

---

## 8. 広告

**評価: ◎ 問題なし**

```css
/* style.css 抜粋 */
.ad-unit {
  margin: 1.25rem 0;
  /* min-height: なし ✅ */
  /* background: なし ✅ */
}
```

- ツール上部（`#ad-top`）・ツール下部（`#ad-result`）の2カ所に配置済み ✅
- AdSenseポリシー違反となる `min-height` や `background` の設定なし ✅

---

## 修正サマリー

| ファイル | 変更内容 |
|---|---|
| `script.js` | 空入力バリデーション追加、プレビュー下ダウンロードボタンのDOM参照・イベント・disabled同期 |
| `index.html` | プレビューエリア直下にモバイル用ダウンロードボタン追加 |
| `style.css` | `input-error` スタイル、`shake` アニメーション、`.download-btn-preview` のモバイル/デスクトップ表示切り替え追加 |

---

## 残存リスク（許容範囲）

- Highlight.js / html2canvas が CDN 経由のため、CDN 障害時はハイライト・画像生成が動作しない。オフライン利用は想定外のため許容。
- html2canvas は一部CSSプロパティ（gradient等）の描画精度に制限があるが、現在の実装では `box-shadow` を除去してキャプチャするなど対策済み。
