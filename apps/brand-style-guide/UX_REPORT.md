# UXレビューレポート — ブランドスタイルガイド作成ツール

**レビュー日**: 2026-05-29
**総合判定**: 承認

## 修正済み項目

- HEX入力欄に不正な値（例: "gg1234"）が入力されたとき、ボーダーを赤く変えて `aria-invalid="true"` を付与するバリデーションフィードバックを追加（script.js）

## 必須チェック項目（全項目OK）

| 項目 | 状態 |
|---|---|
| GA4トラッキングコード (G-DK2WQM49L6) | OK — `<meta charset>` 直後に配置済み |
| viewport maximum-scale=1.0 | OK |
| OGP og:image | OK — `https://keisanlab.jp/images/ogp-brand-style-guide.png` |
| Twitter Card summary_large_image + twitter:image | OK |
| favicon `/favicon.svg` | OK |
| タッチターゲット 44px 以上 | OK — ボタン min-height: 56px、カラーピッカー 44px |
| .ad-unit CSS (margin: 1.25rem 0; のみ) | OK — min-height/background-color なし |
| プライバシーポリシーリンク (/privacy-policy.html) | OK — フッターにリンクあり |
| canonical URL | OK — `https://keisanlab.jp/apps/brand-style-guide/` |

## 評価

| 軸 | 評価 | コメント |
|---|---|---|
| ファーストビュー | 5/5 | ヘッダーの「カラー・フォント・ロゴを即まとめる」とリアルタイムプレビューで3秒以内に目的が把握できる。入力パネルとプレビューが並列で視覚的に明快。 |
| 入力UX | 4/5 | 全入力欄にlabel・placeholder・aria-describedbyが揃っている。カラーはピッカーとHEX両対応で直感的。HEX不正入力時のエラー表示を今回追加。フォント名入力はGoogleフォント名を知らないと迷う可能性がある（ヒント文あり）。 |
| 結果表示 | 5/5 | 入力と同時にプレビューが更新される。カラーチップにHEX/RGB/HSL三形式表示、フォントスケール表、ロゴ3色バリエーションと情報量が充実している。 |
| エラー処理 | 4/5 | HEX不正入力に対しボーダー赤変＋aria-invalid（今回追加）。空欄状態ではフォールバック文字列（「ロゴの使用ルールを入力してください」等）でプレビューが破綻しない設計。フォント名が無効でも表示は維持されるが、フォントが変わらない旨のメッセージはない（許容範囲）。 |
| モバイル | 5/5 | モバイルファーストの1カラム構成。viewport maximum-scale=1.0設定済みでiOSズーム防止。ボタン高さ56px。カラーピッカー44px。デスクトップ900px+で2カラムに切り替わる自然なレスポンシブ。 |
| 信頼性 | 5/5 | プライバシーポリシーリンクあり。localStorage自動保存の説明あり。外部APIゼロ、サーバー送信なし。howtoセクションに競合ツール（Corebook/Frontify）との比較説明もあり安心感がある。 |
| コンテンツ | 5/5 | h1に「ブランドスタイルガイド作成ツール」「カラー・フォント・ロゴを即まとめる」、meta descriptionにKWを多数含む。howto5ステップと「ブランドスタイルガイドとは」の説明文があり200文字超。 |
| 広告配置 | 5/5 | .ad-unitが3箇所（入力パネル上部・ボタン下・howto上）に配置。min-height・background-colorなし。aria-hidden=true。printスタイルで広告を非表示処理済み。AdSenseポリシー準拠。 |

## 残課題

- フォント名入力欄は自由入力のためGoogleフォント名を正確に知らないと反映されない。将来的にはよく使われるフォントのセレクトボックスを追加するか、Google Fonts リンクへの誘導を加えると親切。ただし現時点でリリースをブロックする問題ではない。
