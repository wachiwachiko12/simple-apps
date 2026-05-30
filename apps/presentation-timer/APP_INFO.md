# APP_INFO — プレゼンタイマー（Presentation Stage Timer）

## 基本情報

| 項目 | 内容 |
|------|------|
| アプリ名（日本語） | プレゼンタイマー |
| アプリ名（英語） | Presentation Stage Timer |
| フォルダ | apps/presentation-timer/ |
| URL | https://keisanlab.jp/apps/presentation-timer/ |
| ステータス | live |
| 実装日 | 2026-05-30 |

## ターゲット

| 項目 | 内容 |
|------|------|
| ターゲットユーザー | 登壇者・進行MC・学会発表者・セミナー講師 |
| メインキーワード | プレゼンタイマー フルスクリーン 無料 |
| サブキーワード | ステージタイマー, 発表タイマー, LTタイマー, 学会タイマー |
| 推定月間検索数 | 2,000〜5,000（類似KW合算） |

## 主要機能

1. 大型タイマー表示（残り時間を画面いっぱいに表示）
2. フルスクリーンモード（Fullscreen API + オーバーレイ）
3. 色変化アラート（通常:黒 → 残り2分:黄 → 残り1分:赤 点滅）
4. メッセージ表示（演題名などをタイマー下に表示）
5. 複数セッション管理（発表→Q&A などを順番に進行）
6. プリセット（5/10/15/20/30分）
7. スペースキー: フルスクリーン中の一時停止/再開
8. ESCキー: フルスクリーン終了

## 広告配置計画

| ID | 位置 | 期待CTR |
|----|------|---------|
| ad-top | ツール上部 | 0.8% |
| ad-result | タイマー表示直下 | 1.2% |
| ad-bottom | フッター上 | 0.5% |

## 差別化ポイント

- StageTimer.io（有料SaaS）の無料代替として訴求
- インストール不要・登録不要・ブラウザのみ
- フルスクリーン中もスペースキーで操作可能
- セッション管理でLT/学会の複数発表を一括管理

## 技術メモ

- Fullscreen API: `document.documentElement.requestFullscreen()` + フォールバックとして CSS fixed overlay
- カウントダウン: `setInterval(tick, 1000)` — 1秒ごとに `remainSec--`
- 色変化: `state.remainSec <= 120` で warning、`<= 60` で danger class
- セッション: UI から `buildSessionsFromUI()` で配列生成、`nextSession()` で切り替え
