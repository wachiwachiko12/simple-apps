# APP_INFO — t検定 計算ツール

## アプリ情報

| 項目 | 内容 |
|------|------|
| アプリ名（日本語） | t検定 計算ツール |
| アプリ名（英語） | t-Test Calculator |
| フォルダ | apps/t-test/ |
| URL | https://keisanlab.jp/apps/t-test/ |
| ステータス | live |
| 作成日 | 2026-06-17 |

## ターゲットキーワード

- t検定（メインKW）
- t検定 計算
- t検定 p値
- 対応あり t検定
- 対応なし t検定
- Welch t検定
- paired t検定
- 有意差 計算
- Cohen's d
- 効果量 計算

## 推定月間検索数

- 「t検定」: 約 9,000〜12,000
- 「t検定 計算」: 約 2,000〜4,000
- 「p値 計算」: 約 1,000〜2,500

## 検定タイプ

1. **対応なし（Welch t検定）** — 独立2標本、分散不等仮定なし
2. **対応あり（paired t検定）** — 同一被験者の前後比較
3. **1標本t検定** — 1群を既知の母平均μ₀と比較

## 計算機能

- t統計量・自由度・p値（両側）
- 有意差判定（α = 0.05）
- 効果量 Cohen's d + 視覚的バー
- 95%信頼区間
- 要約統計（n・平均・SD・SE）
- 平均±SE の誤差棒グラフ（Chart.js）

## 広告配置計画

| 配置 | 種別 | 備考 |
|------|------|------|
| `#ad-top`（ツール上部） | レスポンシブ横長バナー | ファーストビュー内 |
| `#ad-result`（結果下） | 記事内広告 | 計算後に閲覧される高クリック率ゾーン |

## 技術スタック

- HTML5 / CSS3 / Vanilla JavaScript
- Chart.js 4.4.4（CDN）
- Bootstrap Icons 1.11.3（CDN）
- Outfit + BIZ UDPGothic（Google Fonts）
- p値計算: 不完全ベータ関数の数値近似（Lanczos法 + Continued Fraction展開）
