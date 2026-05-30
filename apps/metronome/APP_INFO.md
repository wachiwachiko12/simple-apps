# メトロノーム＋BPMタップテンポ検出ツール

## 基本情報

- **アプリ名（日本語）**: オンラインメトロノーム — BPMタップテンポ検出ツール
- **アプリ名（英語）**: Metronome & BPM Tap Tempo
- **URL**: https://keisanlab.jp/apps/metronome/
- **フォルダ**: `apps/metronome/`
- **ステータス**: live

## ターゲット情報

- **ターゲットユーザー**: 音楽学習者・バンドマン・作曲者・DTMer
- **ターゲットキーワード**: メトロノーム オンライン, BPM タップ, タップテンポ, 無料 メトロノーム, BPM 検出
- **推定月間検索数**: 約 5,000〜15,000（メトロノーム オンライン）

## 機能一覧

1. メトロノーム — Web Audio APIによる高精度クリック音（BPM: 20〜300）
2. 視覚フィードバック — ビートドットが拍に合わせて点滅
3. 拍子設定 — 2/4, 3/4, 4/4, 5/4, 6/8 に対応
4. 強拍区別 — 1拍目は高音、弱拍は低音
5. タップテンポ — 直近8回の平均でBPM自動検出
6. BPM速度記号表示 — Largo / Adagio / Andante / Moderato / Allegro / Vivace / Presto
7. スウィング設定 — スウィング率 0〜50% のスライダー
8. 練習メモ — 曲名＋目標BPMをlocalStorageに保存・適用・削除
9. キーボードショートカット — Space（開始/停止）、T（タップ）

## 広告配置計画

- `#ad-top`: ツール上部（ファーストビュー内）
- `#ad-result`: タップテンポセクション直上（高エンゲージメント位置）
- `#ad-bottom`: フッター直上

## 技術メモ

- Web Audio API: `AudioContext` + `OscillatorNode` + `GainNode`
- スケジューラー: Look-ahead スケジューリング（25ms ポーリング、0.1秒先読み）
- スウィング補正: 偶奇拍を伸縮させ合計拍長を保持
- localStorage キー: `metronome_memos`
- iOS対応: `touchstart` preventDefault でタップ遅延防止

## 作成日

2026-05-30
