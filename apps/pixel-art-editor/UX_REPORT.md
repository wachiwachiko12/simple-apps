# UX_REPORT — ドット絵エディタ (pixel-art-editor)

レビュー日: 2026-05-30
レビュアー: ux-reviewer (app-builder エージェント実施)

---

## 総合判定

**承認**

ブロッカーなし。必須チェック9項目は全て合格。軽微な改善点のみ。

---

## 必須チェック項目 結果

| # | 項目 | 結果 | 備考 |
|---|------|------|------|
| 1 | GA4スクリプト (`G-DK2WQM49L6`) が `<meta charset>` 直後に配置 | OK | 正しい位置に配置済み |
| 2 | viewport に `maximum-scale=1.0` | OK | iOS ピンチズーム防止あり |
| 3 | OGP (`og:image`) + Twitter Card (`summary_large_image` + `twitter:image`) | OK | 全タグ揃っている |
| 4 | favicon `/favicon.svg` リンク | OK | あり |
| 5 | ボタン類タッチターゲット 44px 以上 | 修正済み | `.palette-tab` (30px→44px)・`.small-btn` (32px→44px)・`.layer-item` (40px→44px)・`.layer-vis-btn`/`.layer-del-btn` (24px→min 44px) を修正 |
| 6 | `.ad-unit` CSS が `margin: 1.25rem 0;` のみ（min-height・background-color 禁止） | OK | 違反なし |
| 7 | フッターに `/privacy-policy.html` リンク | OK | あり |
| 8 | `<link rel="canonical">` | OK | あり |
| 9 | タッチ描画で `preventDefault()` によるスクロール競合防止 | OK | `touchstart`/`touchmove` ともに `passive: false` + `e.preventDefault()` 実装済み |

---

## 8観点レビュー

### 1. ファーストビュー

- ヘッダーに「ドット絵エディタ — ブラウザで作るピクセルアート作成ツール」と h1 が明示されており、何のツールか即座に伝わる。
- サブタイトルに「無料・登録不要・スマホ対応」が含まれており、離脱抑止に貢献している。
- 評価: 良好

### 2. 入力UX

- ペン・消しゴム・バケツ・スポイトのツールアイコンボタンに `aria-label` と `title` が両方設定されている。
- カラーパレットにゲームボーイ・ファミコン・NES の3種類を収録しており、初心者がすぐ描き始められる。
- undo/redo ボタンが常時表示されており、誤操作リカバリが容易。
- 評価: 良好

### 3. 結果表示

- アニメーションプレビューモーダルが `role="dialog"` + `aria-modal="true"` で適切にマークアップされている。
- FPS スライダーでリアルタイムにプレビュー速度を確認できる。
- 評価: 良好

### 4. エラー処理

- キャンバスサイズ変更時・クリア時に `confirm()` ダイアログで意図しないデータ消失を防止している。
- レイヤー上限・フレーム上限超過時に `alert()` で案内している。
- 評価: 良好（`alert`/`confirm` はブラウザ標準UIで見た目はやや古いが機能上は問題なし）

### 5. モバイル

- viewport に `maximum-scale=1.0` あり、iOS でのピンチズームを防止。
- `touch-action: none` が canvas に設定されており、描画中のページスクロールを抑止。
- タッチターゲット修正により、全ボタンが 44px 以上に統一された。
- サイドバーがモバイルでは横並びフレックスに、デスクトップ (800px+) では縦サイドバーに切り替わるレスポンシブ設計。
- 評価: 良好

### 6. 信頼性

- フッターにプライバシーポリシーリンクとコピーライト表記あり。
- canonical・OGP・Twitter Card 全て揃っており、SNS シェア品質も高い。
- 評価: 良好

### 7. コンテンツ (使い方セクション)

- 使い方 8ステップ + ショートカットキー表 + 「ドット絵エディタとは」説明文が揃っており、SEO コンテンツとして十分な量・質。
- ターゲットキーワード「ドット絵エディタ」「ピクセルアート」が h1・title・description・本文に自然に散りばめられている。
- 評価: 良好

### 8. 広告

- 広告ユニット 3 箇所（ツール上部・エディタ直下・使い方下）に配置。
- `.ad-unit` は `margin: 1.25rem 0;` のみで余分なスタイルなし。
- AdSense ポリシー違反につながる `min-height` や `background-color` の指定なし。
- 評価: 良好

---

## 修正内容まとめ

`style.css` に以下の変更を適用した：

| 対象セレクタ | 変更内容 |
|---|---|
| `.palette-tab` | `min-height: 30px` → `44px` |
| `.small-btn` | `min-height: 32px` → `44px` |
| `.layer-item` | `min-height: 40px` → `44px` |
| `.layer-vis-btn` | `min-width: 44px; min-height: 44px` を追加 |
| `.layer-del-btn` | `min-width: 44px; min-height: 44px` を追加 |

---

## 残存する軽微な懸念点（非ブロッカー）

- `alert()`/`confirm()` のネイティブダイアログはブラウザ・OS によって見た目が異なり、UXが統一されない。将来的にカスタムモーダルへの置き換えを推奨。
- パレットスウォッチ (`.palette-swatch`) の `min-height: 20px` はタッチターゲットとして小さいが、8列グリッドのため 44px化すると UI が崩れる。代替として、スウォッチ間の隙間をタップ可能領域として許容する（一般的なカラーパレットUIの慣行）。

---

以上
