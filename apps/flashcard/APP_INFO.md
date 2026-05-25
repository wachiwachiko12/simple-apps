# 間隔反復フラッシュカード

- **英語名**: Spaced Repetition Flashcard
- **フォルダ**: apps/flashcard/
- **キーワード**: フラッシュカード 無料, 間隔反復 ブラウザ, anki 代替 Web
- **推定月間検索数**: 3,000〜8,000
- **広告配置計画**:
  - ad-top: ヘッダー直下（デッキ一覧の上）
  - ad-mid: デッキ一覧とカード管理セクションの間
  - ad-result: 学習コンテンツとhowtoセクションの間（高クリック率）
- **ステータス**: live
- **実装日**: 2026-05-26
- **特記事項**:
  - SM-2アルゴリズムによる間隔反復
  - CSS perspective/transform-style:preserve-3dによるカードフリップアニメーション
  - localStorage完全保存（サーバー不要）
  - CSVインポート（引用符対応パーサー）・エクスポート
  - quality < 3のカードはセッション内でキュー末尾に再追加
  - XSS対策: escapeHtml/textContent使用
