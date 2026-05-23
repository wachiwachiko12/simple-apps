# 正規表現ビジュアルフローチャート化ツール

- 英語名: Regex Visualizer / Railroad Diagram Tool
- フォルダ: apps/regex-visualizer/
- ターゲットキーワード: 正規表現 可視化, regex ビジュアル, 正規表現 図解, 鉄道図 正規表現
- 推定月間検索数: 3,000〜8,000
- 広告配置: ヘッダー下（#ad-top）・結果エリア下（#ad-result）
- アフィリエイト: なし（開発者ツール）
- ステータス: live

## 実装メモ

- Vanilla JS のみ（外部ライブラリ不使用）
- 独自トークナイザ: LITERAL / CHAR_CLASS / QUANTIFIER / GROUP_OPEN / GROUP_CLOSE / ANCHOR / SPECIAL / ALT / NAMED_GROUP / NON_CAPTURE / LOOKAHEAD / LOOKBEHIND
- SVGをDOMで動的生成。横スクロール対応コンテナ内に描画
- 交替 `|` は垂直分岐レイアウト
- 量詞はノード上部にオレンジラベルで表示
- テスト文字列は `matchAll` でハイライト描画
- コンポーネント説明テーブルは重複排除済みトークン一覧
- サンプルパターン5種（メール・電話・郵便・日付・URL）
- GA4: G-DK2WQM49L6 実装済み
- OGPタグ・canonical 実装済み
- iOSズーム防止（maximum-scale=1.0）実装済み
- タッチターゲット最小44px 実装済み
