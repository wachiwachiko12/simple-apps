# カラーコード変換ツール

- アプリ名（日本語）: カラーコード変換ツール
- アプリ名（英語）: Color Code Converter
- ターゲットキーワード: カラーコード変換, HEX RGB 変換, カラーコード 調べる, HSL 変換
- 推定月間検索数: 27,000〜52,000
- 広告配置計画: コントラストセクションの上・FAQ下
- ステータス: live
- 実装日: 2026-06-27
- canonical: https://keisanlab.jp/apps/color-code-converter/

## 機能概要

1. **HEX / RGB / HSL 相互変換** — カラーピッカー + テキスト入力でリアルタイム変換
2. **WCAG コントラスト比チェック** — AA / AAA 基準の合否判定 + ライブプレビュー
3. **補色・類似色パレット** — 色相ハーモニー6色（補色・類似色±30°・トライアド±120°）
4. **CSS変数出力** — :root { --color-primary, --color-primary-rgb, --color-primary-hsl } をワンクリックコピー

## 技術メモ

- 全変換ロジックはVanilla JS で完結（外部ライブラリなし）
- WCAG 2.1 相対輝度計算式を実装
- sRGB → 線形化 → 輝度 → コントラスト比の順で計算
- 入力イベントはすべて `input` でリアルタイム更新
- クリップボード API: navigator.clipboard.writeText() + execCommand フォールバック
