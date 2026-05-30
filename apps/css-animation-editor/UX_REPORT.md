# UX Report — CSSアニメーションジェネレーター

**レビュー日**: 2026-05-30
**対象**: apps/css-animation-editor/
**ペルソナ**: フロントエンドエンジニア・Webデザイナー（CSSアニメーションを手早く試したい）

---

## 総合判定

**承認**

必須チェック9項目すべてパス。修正不要でデプロイ可能。

---

## 必須チェック項目

| # | 項目 | 結果 | 備考 |
|---|------|------|------|
| 1 | GA4 (G-DK2WQM49L6) | OK | `<meta charset>`直後に配置済み |
| 2 | viewport `maximum-scale=1.0` | OK | iOS入力ズーム防止済み |
| 3 | OGP (og:image / twitter:card / twitter:image) | OK | 3項目すべて存在 |
| 4 | favicon `/favicon.svg` | OK | `<link rel="icon">`あり |
| 5 | タッチターゲット44px以上 | OK | 全ボタン・select・input に`min-height: 44px`設定済み |
| 6 | `.ad-unit` CSS (`margin: 1.25rem 0;`のみ) | OK | min-height・background-color なし |
| 7 | プライバシーポリシーリンク | OK | フッターに`/privacy-policy.html`へのリンクあり |
| 8 | canonical タグ | OK | `<link rel="canonical">`あり |
| 9 | cubic-bezierキャンバス タッチドラッグ | OK | `touchstart/touchmove/touchend`実装済み、`passive: false`でpreventDefault有効、scaleX/scaleY補正あり |

---

## 観点別レビュー

### 1. ファーストビュー
- ヘッダーにツール名・サブタイトルが明示されており、何ができるツールか一目で分かる
- プリセットボタンが最初に表示され、初見ユーザーでも迷わず操作を開始できる

### 2. 入力UX
- duration/delayはスライダー＋数値表示の組み合わせで直感的
- キーフレーム追加ボタンはダッシュボーダーで視覚的に分かりやすい
- カラーピッカーと16進数テキスト入力が同期しており、柔軟性が高い
- cubic-bezierキャンバスは制御点を直接ドラッグできる（PCもスマホも対応）

### 3. 結果表示
- 生成CSSは`@keyframes`ブロックと`animation`ショートハンドを分離して出力しており、そのままプロジェクトに貼り付けられる
- コードエリアに最大高さとスクロールを設定しており、長いコードでもレイアウトが崩れない

### 4. エラー対応
- キーフレームが2つ未満になる削除操作をガード済み（最小2フレームを維持）
- クリップボードAPIが使えない環境ではdocument.execCommand('copy')にフォールバックしており、旧環境にも対応
- コピー完了メッセージは`aria-live="polite"`でスクリーンリーダー対応

### 5. モバイル対応
- モバイルファーストのflexレイアウト（640px・900pxブレークポイント）
- スマホでは設定パネルが上、プレビューが下に縦積み表示
- タッチターゲットはボタン・select・input全要素で44px以上を確保
- `touch-action: none`をcanvasに設定しており、ドラッグ中のページスクロール防止済み

### 6. 信頼性・コンテンツ品質
- canonical・OGP・Twitterカードが完備しており、SNSシェア・検索対応ともに問題なし
- 「使い方」セクションに6ステップの操作説明と「CSSアニメーションとは」「cubic-bezierとは」の解説を収録しており、初心者でも理解しやすい
- aria-label・role・aria-pressedなどアクセシビリティ属性が主要インタラクション要素に付与されている

### 7. 広告配置
- ツール上部・プレビュー下・使い方セクション上の3箇所に`.ad-unit`を配置
- `.ad-unit`はmarginのみでmin-height・background-colorなし（AdSenseポリシー準拠）

---

## 改善提案（ブロッカーなし・任意対応）

- cubic-bezierキャンバスの操作説明文（「ドラッグで制御点を移動」など）をcanvas付近に1行追加すると初見ユーザーへの案内が向上する
- キーフレームの%入力が重複した場合の警告トーストがあるとさらに親切
- プリセット選択時に自動再生が走るが、`prefers-reduced-motion`メディアクエリで動き抑制オプションの検討も可

---

以上、ブロッカーなし。デプロイ可能。
