# UX_REPORT — オンラインメトロノーム

レビュー日: 2026-05-30
対象: `apps/metronome/`

---

## 必須チェック項目

| # | 項目 | 結果 | 備考 |
|---|------|------|------|
| 1 | GA4スクリプト（`<meta charset>` 直後） | OK | `G-DK2WQM49L6` が正しい位置に配置済み |
| 2 | viewport `maximum-scale=1.0` | OK | iOSズーム防止対応済み |
| 3 | OGP / Twitter Card | OK | `og:image`・`twitter:card="summary_large_image"`・`twitter:image` 全て存在 |
| 4 | favicon `/favicon.svg` | OK | `<link rel="icon" type="image/svg+xml" href="/favicon.svg">` あり |
| 5 | TAPボタン 80px以上 / 他ボタン 44px以上 | OK | `.btn-tap { min-height: 80px }` / 各ボタン `min-height: 44px` |
| 6 | `.ad-unit` CSS が `margin: 1.25rem 0;` のみ | OK | min-height・background-color なし |
| 7 | フッターにプライバシーポリシーリンク | OK | `/privacy-policy.html` へのリンクあり |
| 8 | canonical タグ | OK | `https://keisanlab.jp/apps/metronome/` に設定済み |
| 9 | Web Audio API のユーザー操作前作成禁止 | OK | `audioCtx = null` で初期化し、開始ボタンクリック時に初めて生成 |

---

## UXレビュー（8観点）

### 1. ファーストビュー
大きな BPM 数字（4rem）と拍インジケーターのドットが目立ち、何をするツールか一目でわかる。
ヘッダーのグラデーションが落ち着いた音楽系の印象を与えており、信頼感がある。

### 2. 入力UX
BPMはスライダー・数値入力の二重操作が可能で直感的。キーボードの矢印キーにも対応している。
拍子ボタンはアクティブ状態が視覚的に明確。スウィングスライダーにはリアルタイムで数値が表示される。

### 3. 結果表示
拍に合わせてドットが点滅するビジュアルフィードバックがあり、音が聞こえない環境でも拍子を確認できる。
BPM下部に速度記号（Moderato など）が表示され、音楽理論の学習にも役立つ。

### 4. エラー処理
BPM入力は20〜300の範囲でクランプ処理済み。タップテンポは検出範囲外の場合にメッセージ表示。
FAQ に「音が出ない場合」「iOS サイレントモード」への対処が記載されており、サポートコンテンツが充実。

### 5. モバイル対応
TAPボタンが `min-height: 80px` / `width: 100%` で大型タッチターゲットを確保。
`touch-action: manipulation` と `-webkit-user-select: none` でタップのちらつき防止済み。
`maximum-scale=1.0` でピンチズームを抑制。テーブルは `overflow-x: auto` でスクロール対応。

### 6. 信頼性
コンテンツ量が十分（使い方・BPM速度記号一覧・説明文・FAQ）。
localStorage を使った練習メモ機能があり、継続利用のインセンティブがある。
プライバシーポリシーリンクとコピーライト表示あり。

### 7. コンテンツ品質
「オンラインメトロノームとは」セクションに 300 文字以上の説明がある。
FAQ が 4 問あり、よくある疑問に対応。ターゲットキーワード（メトロノーム・BPM・タップテンポ）が適切に散りばめられている。

### 8. 広告配置
ツール上部・ツール内結果下・フッター直上の 3 箇所に `.ad-unit` を配置。
`min-height` なし・`background-color` なし でポリシー準拠。コンテンツとの境界が適切。

---

## 修正実施内容

### TAP ボタンのダブルファイア修正（`script.js`）

**問題**: `click` イベントと `touchstart` イベントを両方登録していたため、モバイルでタップ時に両方が発火し、1 回のタップで 2 回 `handleTap()` が呼ばれる可能性があった。

**修正**: `click` + `touchstart` を廃止し、`pointerdown` / `pointerup` / `pointercancel` の Pointer Events API に統一。フラグ `tapPointerActive` でダブルファイアを防止。マウス・タッチ・スタイラス全デバイスで正常動作する。

---

## 総合判定

**✅ 承認**

全必須チェック項目がパス。TAP ボタンのダブルファイア問題を修正済み。
コンテンツ品質・モバイル対応・広告配置ともに基準を満たしており、デプロイ可能な状態。
