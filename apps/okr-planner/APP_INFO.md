# 個人向けOKR・目標管理ビジュアルシート

- 英語名: OKR Planner
- フォルダ: apps/okr-planner/
- キーワード: OKR 個人 テンプレート 無料, OKR 管理 ツール, 目標管理 フリーランス
- 推定月間検索数: 3,000〜8,000
- 広告配置計画: ツール上部（#ad-top）、ボード下（#ad-result）の2ユニット
- ステータス: live

## 機能概要
- Objective最大4つ、各ObjectiveにKey Result最大5つ
- Key Resultごとに現在値・目標値・単位を入力、達成率を自動計算
- 進捗バー（赤0〜40%・黄41〜70%・緑71〜100%）
- SVG円グラフによるObjective達成率ビジュアル
- 2026 Q1〜Q4のタブ切り替え、四半期別localStorage保存
- サマリーダッシュボードで全Objectiveの達成率を一覧表示
- Objectiveごとに4色テーマ（青・紫・緑・橙）

## 技術仕様
- HTML / CSS / Vanilla JS のみ（外部ライブラリなし）
- SVG conic-gradientではなくstroke-dashoffset方式でドーナツグラフ実装
- XSSエスケープ実装（escapeHtml / escapeAttr）
- イベント委譲でDOM操作を最小化
