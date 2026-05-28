// ============================================================
//  プログラミング学習ロードマップ — script.js
// ============================================================

// ---- ロードマップデータ ----
// level: 'required' | 'recommended' | 'optional'

const ROADMAPS = {
  frontend: {
    title: 'フロントエンド開発 ロードマップ',
    phases: [
      {
        phase: '基礎',
        steps: [
          {
            id: 'fe-internet', name: 'インターネットの仕組み', level: 'required',
            summary: 'HTTP/HTTPS・DNS・ドメイン・ブラウザの動作原理',
            desc: 'Webアプリ開発の土台となるインターネットの仕組みを理解します。HTTP/HTTPSリクエストとレスポンス、DNSによるドメイン解決、ブラウザがWebページを表示するまでの流れ（レンダリングパイプライン）などを学びましょう。',
            resources: ['MDN Web Docs（HTTP概説）', 'CS50 — Webセキュリティ', 'Cloudflare Learning Center（日本語あり）']
          },
          {
            id: 'fe-html', name: 'HTML', level: 'required',
            summary: 'セマンティクス・フォーム・アクセシビリティ',
            desc: 'HTMLはWebページの骨格を作るマークアップ言語です。見出し・段落・リスト・テーブルなどの基本タグに加え、セマンティックHTML（<article>/<section>/<nav>）、フォーム・バリデーション、WAI-ARIAによるアクセシビリティ対応まで習得しましょう。',
            resources: ['MDN Web Docs — HTML', 'HTML.com（英語）', 'WEB DEVELOPER ROADMAP（日本語訳版）']
          },
          {
            id: 'fe-css', name: 'CSS', level: 'required',
            summary: 'ボックスモデル・Flexbox・Grid・レスポンシブ',
            desc: 'CSSでWebページのスタイルを定義します。ボックスモデル、セレクターの優先度、Flexbox・CSS Grid によるレイアウト、メディアクエリによるレスポンシブデザインをしっかり身につけましょう。CSS変数・アニメーションも実務では必須です。',
            resources: ['CSS Tricks', 'Flexbox Froggy（ゲームで学ぶ）', 'Grid Garden（CSS Grid練習）']
          },
          {
            id: 'fe-js', name: 'JavaScript', level: 'required',
            summary: 'DOM操作・非同期(Promise/async-await)・ES6+',
            desc: 'Webページを動的にするプログラミング言語です。変数・関数・配列・オブジェクト・クラスの基本から、DOM操作、イベントリスナー、非同期処理（Promise・async/await・fetch API）、ES6+の構文（アロー関数・分割代入・スプレッド演算子）まで習得しましょう。',
            resources: ['JavaScript.info（日本語版あり）', 'Eloquent JavaScript（無料電子書籍）', 'MDN JavaScript ガイド']
          }
        ]
      },
      {
        phase: 'バージョン管理',
        steps: [
          {
            id: 'fe-git', name: 'Git / GitHub', level: 'required',
            summary: 'commit・branch・pull request の基本操作',
            desc: 'ソースコードを管理するバージョン管理ツールです。git init/add/commit/push/pull の基本操作、ブランチの切り方・マージ、GitHubでのプルリクエストを使ったコードレビュー文化を理解してください。',
            resources: ['Git公式ドキュメント', 'GitHub Skills（無料コース）', 'Pro Git（無料書籍、日本語版あり）']
          }
        ]
      },
      {
        phase: 'フレームワーク・ツール',
        steps: [
          {
            id: 'fe-react', name: 'React', level: 'recommended',
            summary: 'コンポーネント・状態管理・Hooks',
            desc: 'Metaが開発したUIライブラリで、国内外の求人で最も需要が高いフロントエンドフレームワークです。コンポーネント設計、useState/useEffect などの Hooks、props の受け渡し、条件レンダリングを習得してください。',
            resources: ['React公式ドキュメント（日本語）', 'React Tutorial', 'Vite + React スターターガイド']
          },
          {
            id: 'fe-vue', name: 'Vue.js', level: 'recommended',
            summary: 'リアクティブシステム・Composition API',
            desc: '日本国内での採用実績が多いプログレッシブJSフレームワークです。Composition APIによるロジックの再利用、テンプレート構文、Pinia（状態管理）を学びましょう。Reactと比べて学習コストが低いのが特徴です。',
            resources: ['Vue.js公式ドキュメント（日本語）', 'Vue Mastery（英語）', 'Nuxt.jsドキュメント']
          },
          {
            id: 'fe-typescript', name: 'TypeScript', level: 'recommended',
            summary: '型定義・インターフェース・型安全なコーディング',
            desc: 'JavaScriptに静的型付けを加えた言語です。型定義によりバグを早期発見でき、IDEの補完が強力になります。型注釈・インターフェース・ジェネリクス・型ガードをマスターしましょう。現代のプロジェクトではほぼ必須スキルになっています。',
            resources: ['TypeScript公式Handbook（日本語訳あり）', 'TypeScript Deep Dive（無料書籍）', 'Total TypeScript']
          },
          {
            id: 'fe-nextjs', name: 'Next.js', level: 'recommended',
            summary: 'SSR・SSG・App Router・デプロイ',
            desc: 'Reactベースのフルスタックフレームワークで、SEOに強いSSR/SSGを手軽に実現できます。App Router・Server Componentsなど最新機能の理解、Vercelへのデプロイ、APIルート（Route Handlers）の実装を学びましょう。',
            resources: ['Next.js公式ドキュメント', 'Next.js App Router入門（Zenn）', 'Vercel公式チュートリアル']
          },
          {
            id: 'fe-bundler', name: 'ビルドツール (Vite / Webpack)', level: 'recommended',
            summary: 'モジュールバンドル・HMR・最適化',
            desc: '現代のフロントエンド開発に欠かせないビルドツールです。Viteは高速な開発サーバーとHMR（ホットリロード）が特徴で、現在最もポピュラーな選択肢です。Webpackも既存プロジェクトで多用されるため基礎は押さえましょう。',
            resources: ['Vite公式ドキュメント（日本語）', 'Webpack公式ドキュメント', 'フロントエンドビルドツール比較（Zenn）']
          },
          {
            id: 'fe-testing', name: 'テスト (Vitest / Testing Library)', level: 'recommended',
            summary: 'ユニットテスト・コンポーネントテスト',
            desc: 'コードの品質を保証するためのテストスキルです。Vitestによるユニットテスト、React Testing Library によるコンポーネントテスト、Playwright/Cypress による E2E テストの基本を習得しましょう。',
            resources: ['Vitest公式ドキュメント', 'Testing Library公式ドキュメント', 'JavaScript Testing Best Practices（GitHub）']
          },
          {
            id: 'fe-css-framework', name: 'CSSフレームワーク (Tailwind CSS)', level: 'optional',
            summary: 'ユーティリティファーストCSS・Shadcn/ui',
            desc: 'Tailwind CSSはユーティリティファーストのCSSフレームワークで、クラス名をHTMLに直接書くアプローチです。カスタムCSS量を大幅に削減でき、チーム開発でのスタイル統一に役立ちます。',
            resources: ['Tailwind CSS公式ドキュメント', 'Tailwind CSS チートシート', 'Shadcn/ui公式']
          },
          {
            id: 'fe-storybook', name: 'Storybook', level: 'optional',
            summary: 'UIコンポーネント開発・カタログ化',
            desc: 'UIコンポーネントを独立した環境で開発・確認するツールです。デザインシステムの構築やコンポーネントの可視化に使われます。中〜大規模チームで特に重宝されます。',
            resources: ['Storybook公式ドキュメント', 'Component Story Format（CSF）ガイド']
          }
        ]
      },
      {
        phase: '発展',
        steps: [
          {
            id: 'fe-perf', name: 'Webパフォーマンス最適化', level: 'recommended',
            summary: 'Core Web Vitals・コード分割・画像最適化',
            desc: 'LCP・CLS・INP などのCore Web Vitals改善、コード分割・遅延ロード・画像最適化によるページ速度向上、Lighthouse を使ったパフォーマンス計測を学びましょう。SEO・UX 両面に影響します。',
            resources: ['web.dev（Google公式）', 'Chrome DevTools パフォーマンスタブ', 'PageSpeed Insights']
          },
          {
            id: 'fe-a11y', name: 'アクセシビリティ (a11y)', level: 'recommended',
            summary: 'WCAG・スクリーンリーダー対応・ARIA',
            desc: 'すべてのユーザーが使えるWebを作るためのスキルです。WCAG 2.1のガイドライン、適切なARIAロール・属性の使用、キーボード操作への対応、スクリーンリーダーでのテストを習得しましょう。',
            resources: ['MDN — アクセシビリティ', 'a11y project', 'axe DevTools（Chrome拡張）']
          },
          {
            id: 'fe-pwa', name: 'PWA / Service Worker', level: 'optional',
            summary: 'オフライン対応・プッシュ通知・インストール',
            desc: 'WebアプリにネイティブアプリのようなUXを付加するPWA技術です。Service WorkerによるキャッシュとオフラインサポートをWorkboxを使って実装できるようになりましょう。',
            resources: ['web.dev — PWA', 'Workbox公式ドキュメント', 'MDN — Service Worker API']
          }
        ]
      }
    ]
  },

  backend: {
    title: 'バックエンド開発 ロードマップ',
    phases: [
      {
        phase: '基礎',
        steps: [
          {
            id: 'be-internet', name: 'インターネット・HTTP', level: 'required',
            summary: 'HTTP/HTTPS・REST・ステータスコード・ヘッダー',
            desc: 'バックエンド開発者にとってHTTPの深い理解は必須です。リクエストメソッド（GET/POST/PUT/DELETE）、HTTPステータスコード、ヘッダー（Authorization/Content-Type等）、Cookie/セッション、CORS について学びましょう。',
            resources: ['MDN HTTP概説', 'HTTP: The Definitive Guide（書籍）', 'Postman Learning Center']
          },
          {
            id: 'be-lang', name: 'サーバーサイド言語 (Python / Node.js / Java 等)', level: 'required',
            summary: '1言語をしっかりマスターすることが最優先',
            desc: '最初は1言語に集中しましょう。Python（Django/FastAPI）はデータ系との親和性が高く、Node.js（Express/Fastify）はフロントエンドとの共通化が容易です。JavaやKotlin、Go、Rustなども現場での需要が高まっています。',
            resources: ['Python公式チュートリアル', 'Node.js公式ドキュメント', 'Go Tour（日本語）']
          },
          {
            id: 'be-git', name: 'Git / GitHub', level: 'required',
            summary: 'バージョン管理・ブランチ戦略・PRベース開発',
            desc: 'コードの変更履歴管理と、チームでのコラボレーション基盤として不可欠です。Git Flow / GitHub Flow などのブランチ戦略も習得しましょう。',
            resources: ['Pro Git（無料書籍）', 'GitHub Flow ガイド', 'Atlassian Git チュートリアル']
          }
        ]
      },
      {
        phase: 'データベース',
        steps: [
          {
            id: 'be-rdb', name: 'リレーショナルDB (PostgreSQL / MySQL)', level: 'required',
            summary: 'SQL・テーブル設計・インデックス・トランザクション',
            desc: 'バックエンド開発の中核スキルです。DDL（CREATE TABLE）とDML（SELECT/INSERT/UPDATE/DELETE）の習得から、JOIN・サブクエリ・インデックス最適化・トランザクション（ACID）まで、実務レベルのSQLを使いこなしましょう。',
            resources: ['PostgreSQL公式ドキュメント', 'SQLZoo（インタラクティブSQL練習）', 'Use The Index, Luke（インデックス最適化）']
          },
          {
            id: 'be-nosql', name: 'NoSQL (MongoDB / Redis)', level: 'recommended',
            summary: 'ドキュメントDB・キャッシュ・キュー',
            desc: 'Redisはキャッシュ・セッション管理・メッセージキューとして、MongoDBはスキーマが柔軟なドキュメントDBとして広く使われます。RDBと使い分けの判断力を養いましょう。',
            resources: ['Redis公式ドキュメント', 'MongoDB University（無料コース）', 'NoSQL Distilled（書籍）']
          },
          {
            id: 'be-orm', name: 'ORM (Prisma / SQLAlchemy 等)', level: 'recommended',
            summary: 'データベース操作の抽象化・マイグレーション',
            desc: 'ORMを使うと、SQLを直接書かずにプログラミング言語のオブジェクト操作でDBを扱えます。Prisma（Node.js）、SQLAlchemy（Python）などの基本的な使い方とマイグレーション管理を習得しましょう。',
            resources: ['Prisma公式ドキュメント', 'SQLAlchemy公式ドキュメント', 'TypeORM公式ドキュメント']
          }
        ]
      },
      {
        phase: 'API設計・認証',
        steps: [
          {
            id: 'be-rest', name: 'REST API設計', level: 'required',
            summary: 'リソース設計・ステータスコード・バージョニング',
            desc: 'REST原則に従ったAPIを設計・実装するスキルです。エンドポイントの命名規則、適切なHTTPメソッドとステータスコードの使用、リクエスト/レスポンスのJSONスキーマ設計、APIバージョニング方法を習得しましょう。',
            resources: ['REST API Design Best Practices', 'HTTPie（APIテストツール）', 'OpenAPI/Swagger入門']
          },
          {
            id: 'be-auth', name: '認証・認可 (JWT / OAuth2)', level: 'required',
            summary: 'JWT・セッション・OAuth2・パスワードハッシュ',
            desc: 'セキュアな認証システムの実装は必須スキルです。JWTの仕組みと適切な実装、OAuth2.0・OpenID Connect によるソーシャルログイン、bcryptによるパスワードハッシュ、CSRF対策などを学びましょう。',
            resources: ['Auth0 Blog（認証解説記事多数）', 'JWT.io（JWTデバッガー）', 'OWASP Authentication Cheatsheet']
          },
          {
            id: 'be-graphql', name: 'GraphQL', level: 'optional',
            summary: 'スキーマ定義・クエリ・ミューテーション',
            desc: 'Facebookが開発したAPI規格で、クライアントが必要なデータを柔軟に取得できます。RESTと比べてオーバーフェッチ/アンダーフェッチが解消される反面、キャッシュやN+1問題への対応が必要です。',
            resources: ['GraphQL公式ドキュメント', 'Apollo Server', 'Strawberry（Python GraphQL）']
          }
        ]
      },
      {
        phase: 'インフラ・運用',
        steps: [
          {
            id: 'be-linux', name: 'Linux基礎', level: 'required',
            summary: 'ファイル操作・プロセス管理・シェルスクリプト',
            desc: 'サーバー環境はほぼLinuxのため、コマンドラインの基本操作（ls/cd/grep/ps/chmod等）、プロセス管理、シェルスクリプトの作成、cron の設定などは必須です。',
            resources: ['Linux Survival（入門）', 'The Linux Command Line（無料書籍）', 'Bash Scripting Tutorial']
          },
          {
            id: 'be-docker', name: 'Docker', level: 'recommended',
            summary: 'コンテナ化・Dockerfile・Docker Compose',
            desc: '開発環境の統一やアプリのデプロイに欠かせないコンテナ技術です。Dockerfile の記述、イメージのビルド・プッシュ、Docker Compose による複数コンテナ管理を習得しましょう。',
            resources: ['Docker公式ドキュメント', 'Play with Docker（無料ブラウザ環境）', 'Docker Deep Dive（書籍）']
          },
          {
            id: 'be-cloud', name: 'クラウド (AWS / GCP / Azure)', level: 'recommended',
            summary: 'EC2・S3・Lambda・IAM の基礎',
            desc: '現代のバックエンド開発にクラウドの知識は必須です。EC2（仮想サーバー）、S3（オブジェクトストレージ）、RDS（マネージドDB）、Lambda（サーバーレス）、IAM（権限管理）などAWSの主要サービスから始めましょう。',
            resources: ['AWS Skill Builder（無料コース多数）', 'AWS Well-Architected Framework', 'Qiita — AWS入門記事']
          },
          {
            id: 'be-testing', name: 'テスト (単体・統合・E2E)', level: 'recommended',
            summary: 'pytest / Jest / supertest でAPIテスト',
            desc: 'バックエンドの品質保証に欠かせないテストスキルです。ユニットテスト（個別の関数テスト）、統合テスト（DBを含むAPIテスト）、モックの使い方を習得しましょう。',
            resources: ['pytest公式ドキュメント', 'Supertest（Node.js HTTPテスト）', 'Testing Node.js Applications（書籍）']
          }
        ]
      }
    ]
  },

  fullstack: {
    title: 'フルスタック開発 ロードマップ',
    phases: [
      {
        phase: 'フロントエンド基礎',
        steps: [
          {
            id: 'fs-html-css', name: 'HTML / CSS', level: 'required',
            summary: 'セマンティクス・Flexbox・Grid・レスポンシブ',
            desc: 'WebのUIを作る基盤スキルです。セマンティックHTML、CSS Flexbox/Grid、レスポンシブデザイン（メディアクエリ）をしっかり習得してください。',
            resources: ['MDN Web Docs', 'CSS Tricks', 'Flexbox Froggy']
          },
          {
            id: 'fs-js', name: 'JavaScript (ES6+)', level: 'required',
            summary: 'DOM・非同期・fetch API・モジュール',
            desc: 'フロントエンドとバックエンド両方で使えるJavaScriptをまずマスターしましょう。ES6+構文、非同期処理、fetch APIによるHTTP通信を習得することで、フルスタック開発の土台が整います。',
            resources: ['JavaScript.info（日本語版あり）', 'MDN JavaScript ガイド']
          },
          {
            id: 'fs-react', name: 'React', level: 'required',
            summary: 'コンポーネント設計・Hooks・状態管理',
            desc: 'フルスタックフレームワークのフロントエンド側で最も採用率が高いReactを習得しましょう。コンポーネント分割・useState/useEffect・Contextの使い方を中心に学んでください。',
            resources: ['React公式ドキュメント（日本語）', 'Vite + React チュートリアル']
          },
          {
            id: 'fs-typescript', name: 'TypeScript', level: 'recommended',
            summary: '型定義・インターフェース・型安全開発',
            desc: 'フロントエンド・バックエンド両方で型安全なコーディングができるようになります。フルスタックプロジェクトでは特に、APIのリクエスト/レスポンス型の共有が強力な恩恵をもたらします。',
            resources: ['TypeScript公式Handbook', 'TypeScript Deep Dive（無料書籍）']
          }
        ]
      },
      {
        phase: 'バックエンド基礎',
        steps: [
          {
            id: 'fs-node', name: 'Node.js / Express', level: 'required',
            summary: 'HTTPサーバー・ルーティング・ミドルウェア',
            desc: 'JavaScriptでサーバーサイドを書けるNode.jsはフルスタック開発の鉄板選択肢です。Expressによるルーティング、ミドルウェア、JSON API の作成を習得しましょう。',
            resources: ['Node.js公式ドキュメント', 'Express.js公式ドキュメント', 'The Odin Project（バックエンドコース）']
          },
          {
            id: 'fs-db', name: 'データベース (PostgreSQL)', level: 'required',
            summary: 'SQL・スキーマ設計・Prisma',
            desc: 'フルスタックアプリにはデータ永続化が必要です。PostgreSQLとPrisma（ORM）を組み合わせた開発フローを習得し、マイグレーション管理とCRUD操作ができるようになりましょう。',
            resources: ['PostgreSQL公式ドキュメント', 'Prisma公式ドキュメント']
          },
          {
            id: 'fs-auth', name: '認証実装 (JWT / NextAuth)', level: 'required',
            summary: 'セッション・JWT・OAuth2・パスワード管理',
            desc: 'フルスタックアプリには認証機能が必須です。JWTベースの認証、NextAuth.jsを使ったソーシャルログイン、bcryptによるパスワードハッシュ化を実装できるようになりましょう。',
            resources: ['NextAuth.js公式ドキュメント', 'Auth0 Blog', 'JWT.io']
          }
        ]
      },
      {
        phase: 'フルスタックフレームワーク',
        steps: [
          {
            id: 'fs-nextjs', name: 'Next.js (App Router)', level: 'required',
            summary: 'SSR・SSG・Server Components・Route Handlers',
            desc: 'Reactベースのフルスタックフレームワークで、現在最も求人数が多い技術スタックの一つです。Server Components・App Router・Route Handlers による APIエンドポイント・Vercel へのデプロイを習得しましょう。',
            resources: ['Next.js公式ドキュメント', 'Next.js Learn（公式チュートリアル）', 'Vercel公式']
          },
          {
            id: 'fs-nuxt', name: 'Nuxt.js', level: 'optional',
            summary: 'Vue.js ベースのフルスタックフレームワーク',
            desc: 'Vue.jsを使ったフルスタック開発に Nuxt.js を使います。日本国内での採用が多く、Nitroサーバーエンジンによる高速なSSRが特徴です。',
            resources: ['Nuxt.js公式ドキュメント（日本語）', 'Vue.js公式ドキュメント']
          }
        ]
      },
      {
        phase: 'デプロイ・運用',
        steps: [
          {
            id: 'fs-git', name: 'Git / GitHub Actions', level: 'required',
            summary: 'ブランチ管理・CI/CD自動化',
            desc: 'フルスタック開発ではフロント・バックを同一リポジトリで管理することが多いです。GitHub Actions を使ったCIパイプライン（テスト・ビルド・デプロイの自動化）も習得しましょう。',
            resources: ['GitHub Actions公式ドキュメント', 'CI/CD入門（Zenn）']
          },
          {
            id: 'fs-docker', name: 'Docker', level: 'recommended',
            summary: 'コンテナ化・ローカル開発環境統一',
            desc: 'フロントエンド・バックエンド・DBを Docker Compose でまとめて起動できる環境を構築できると、チーム開発が格段に楽になります。',
            resources: ['Docker公式ドキュメント', 'Docker Compose入門']
          },
          {
            id: 'fs-cloud', name: 'クラウドデプロイ (Vercel / Render / AWS)', level: 'recommended',
            summary: 'PaaS・マネージドDB・環境変数管理',
            desc: 'Next.jsならVercel、バックエンドAPIならRender/Flyio、DBならPlanetScale/Supabaseなどマネージドサービスを使ったデプロイ経験を積みましょう。',
            resources: ['Vercel公式ドキュメント', 'Supabase公式ドキュメント', 'Render公式ドキュメント']
          }
        ]
      }
    ]
  },

  datascience: {
    title: 'データサイエンス ロードマップ',
    phases: [
      {
        phase: '数学・統計基礎',
        steps: [
          {
            id: 'ds-math', name: '数学基礎（線形代数・微積分・確率）', level: 'required',
            summary: 'ベクトル・行列・偏微分・条件付き確率',
            desc: '機械学習モデルの理解に必要な数学の基礎です。線形代数（ベクトル・行列演算）、微積分（偏微分・勾配降下法）、確率・統計（期待値・正規分布・ベイズ定理）を学びましょう。',
            resources: ['3Blue1Brown — 線形代数の本質（YouTube）', 'Khan Academy（統計・確率）', '統計学入門（東大出版）']
          },
          {
            id: 'ds-stats', name: '統計学（記述統計・推測統計）', level: 'required',
            summary: '仮説検定・p値・信頼区間・回帰分析',
            desc: 'データを正しく読み解き、意思決定に活かすための統計スキルです。記述統計（平均・分散・相関）、推測統計（仮説検定・p値・信頼区間）、回帰分析の理論と実践を習得しましょう。',
            resources: ['統計学の時間（Web）', 'OpenIntro Statistics（無料書籍）', 'StatQuest with Josh Starmer（YouTube）']
          }
        ]
      },
      {
        phase: 'プログラミング',
        steps: [
          {
            id: 'ds-python', name: 'Python', level: 'required',
            summary: 'データ処理・ライブラリ活用・Jupyter Notebook',
            desc: 'データサイエンス分野の事実上の標準言語です。Python基本文法に加え、numpy・pandas・matplotlib・seaborn などのライブラリの使い方と、Jupyter Notebookでの分析フローを習得しましょう。',
            resources: ['Python公式チュートリアル', 'Python for Data Analysis（書籍）', 'Kaggle Learn（無料コース）']
          },
          {
            id: 'ds-sql', name: 'SQL', level: 'required',
            summary: 'データ抽出・集計・ウィンドウ関数',
            desc: 'データ分析業務ではSQLによるデータ抽出が日常業務の中心です。SELECT・JOIN・GROUP BY・ウィンドウ関数（ROW_NUMBER/RANK/SUM OVER等）・サブクエリを使いこなしましょう。',
            resources: ['SQLZoo', 'Mode Analytics SQL Tutorial', 'Serious SQL（書籍）']
          },
          {
            id: 'ds-git', name: 'Git / DVC', level: 'recommended',
            summary: 'コード・データ・モデルのバージョン管理',
            desc: 'Gitでコード管理、DVC（Data Version Control）でデータやモデルのバージョンを管理する方法を習得しましょう。再現可能な分析・実験管理に不可欠です。',
            resources: ['DVC公式ドキュメント', 'Git for Data Science（DataCamp）']
          }
        ]
      },
      {
        phase: '機械学習',
        steps: [
          {
            id: 'ds-ml', name: '機械学習（scikit-learn）', level: 'required',
            summary: '教師あり・なし学習・モデル評価・特徴量エンジニアリング',
            desc: '機械学習の主要アルゴリズム（線形回帰・ロジスティック回帰・決定木・ランダムフォレスト・SVM）と、特徴量エンジニアリング・クロスバリデーション・評価指標（AUC/F1スコア）を scikit-learn で実装しましょう。',
            resources: ['scikit-learn公式ドキュメント', 'Hands-On Machine Learning（書籍）', 'Kaggle Courses — ML']
          },
          {
            id: 'ds-dl', name: 'ディープラーニング（PyTorch / TensorFlow）', level: 'recommended',
            summary: 'ニューラルネットワーク・CNN・RNN・Transformer',
            desc: '画像認識（CNN）、自然言語処理（Transformer/BERT）、時系列予測（RNN/LSTM）などの深層学習モデルをPyTorchで実装する力を養いましょう。',
            resources: ['fast.ai（実践的DLコース）', 'Deep Learning with PyTorch（書籍）', 'PyTorch公式チュートリアル']
          },
          {
            id: 'ds-llm', name: '大規模言語モデル (LLM) 活用', level: 'recommended',
            summary: 'プロンプトエンジニアリング・RAG・Fine-tuning',
            desc: 'ChatGPTを始めとするLLMをAPIで活用するスキルです。プロンプトエンジニアリング、LangChain/LlamaIndexによるRAGアプリ構築、LoRA等によるFine-tuningの基礎を習得しましょう。',
            resources: ['OpenAI API ドキュメント', 'LangChain公式ドキュメント', 'Hugging Face Courses']
          }
        ]
      },
      {
        phase: 'データ分析実務',
        steps: [
          {
            id: 'ds-viz', name: 'データ可視化', level: 'required',
            summary: 'matplotlib・seaborn・Plotly・Tableau',
            desc: '分析結果を視覚化してステークホルダーに伝えるスキルです。Pythonのmatplotlib・seaborn・Plotlyによるインタラクティブグラフと、BIツール（TableauまたはLooker Studio）の基礎を習得しましょう。',
            resources: ['Matplotlib公式ドキュメント', 'Seaborn公式ドキュメント', 'Tableau Public（無料版）']
          },
          {
            id: 'ds-mlops', name: 'MLOps基礎', level: 'optional',
            summary: 'モデルデプロイ・実験管理・モニタリング',
            desc: '機械学習モデルを本番環境で運用するMLOpsの基礎です。MLflow による実験管理、FastAPIを使ったモデルAPIサーバー化、モデルのドリフト監視などを学びましょう。',
            resources: ['MLflow公式ドキュメント', 'Made With ML', 'Full Stack Deep Learning']
          }
        ]
      }
    ]
  },

  devops: {
    title: 'DevOps ロードマップ',
    phases: [
      {
        phase: '基礎',
        steps: [
          {
            id: 'do-linux', name: 'Linux / コマンドライン', level: 'required',
            summary: 'ファイル操作・プロセス管理・ネットワーク・シェルスクリプト',
            desc: 'DevOpsエンジニアの作業環境はLinuxが中心です。ファイルシステム操作、プロセス管理（ps/kill/systemctl）、ネットワークコマンド（curl/netstat/ss）、bashスクリプト作成を確実に習得しましょう。',
            resources: ['The Linux Command Line（無料書籍）', 'Linux Survival', 'Bash Scripting Tutorial']
          },
          {
            id: 'do-net', name: 'ネットワーク基礎', level: 'required',
            summary: 'TCP/IP・DNS・HTTP・SSL/TLS・ファイアウォール',
            desc: 'インフラを扱うにはネットワークの理解が必須です。OSIモデル・TCP/IP・DNS解決・HTTPSのTLSハンドシェイク・サブネット・VPCなどを体系的に学びましょう。',
            resources: ['ネットワーク入門（プロメトリック）', 'Computer Networks（Tanenbaum書籍）', 'AWS VPCドキュメント']
          },
          {
            id: 'do-git', name: 'Git / GitHub', level: 'required',
            summary: 'ブランチ戦略・タグ・GitOps',
            desc: 'DevOpsではコードだけでなくインフラ定義もGitで管理します（GitOps）。タグによるリリース管理、ブランチ戦略（trunk-based development）を習得しましょう。',
            resources: ['Pro Git（無料書籍）', 'GitOps入門', 'Atlassian DevOpsガイド']
          }
        ]
      },
      {
        phase: 'コンテナ・オーケストレーション',
        steps: [
          {
            id: 'do-docker', name: 'Docker', level: 'required',
            summary: 'Dockerfile・マルチステージビルド・Docker Compose',
            desc: 'アプリをコンテナ化する基礎技術です。Dockerfile のベストプラクティス（マルチステージビルド・最小イメージ）、Docker Compose による開発環境構築、コンテナセキュリティの基礎を習得しましょう。',
            resources: ['Docker公式ドキュメント', 'Docker Deep Dive（書籍）', 'Play with Docker']
          },
          {
            id: 'do-k8s', name: 'Kubernetes (K8s)', level: 'recommended',
            summary: 'Pod・Service・Deployment・Ingress・Helm',
            desc: 'コンテナオーケストレーションの業界標準です。Pod・ReplicaSet・Deployment・Service・Ingress・ConfigMap/Secretの仕組みと、Helmによるパッケージ管理を習得しましょう。',
            resources: ['Kubernetes公式ドキュメント', 'Kubernetes in Action（書籍）', 'Minikube（ローカル学習環境）']
          },
          {
            id: 'do-helm', name: 'Helm / Kustomize', level: 'optional',
            summary: 'K8sマニフェスト管理・テンプレート化',
            desc: 'KubernetesのYAMLマニフェストを再利用可能にするパッケージングツールです。Helmチャートの作成・配布・バージョン管理を習得しましょう。',
            resources: ['Helm公式ドキュメント', 'Kustomize公式ドキュメント']
          }
        ]
      },
      {
        phase: 'CI/CD',
        steps: [
          {
            id: 'do-cicd', name: 'CI/CD (GitHub Actions / GitLab CI)', level: 'required',
            summary: 'パイプライン設計・テスト自動化・デプロイ自動化',
            desc: 'コードの変更を安全・迅速に本番環境に届けるCI/CDパイプラインの構築はDevOpsの中核業務です。GitHub Actionsによる自動テスト・ビルド・デプロイの設定を実践しましょう。',
            resources: ['GitHub Actions公式ドキュメント', 'GitLab CI/CD入門', 'CI/CD設計パターン']
          },
          {
            id: 'do-argocd', name: 'ArgoCD / Flux (GitOps)', level: 'optional',
            summary: 'K8sへのGitOpsデプロイメント管理',
            desc: 'GitOpsツールを使って、Gitリポジトリの状態をそのままKubernetesクラスターに反映させる継続的デプロイを実現します。',
            resources: ['ArgoCD公式ドキュメント', 'GitOps with Argo CD（書籍）']
          }
        ]
      },
      {
        phase: 'クラウド・IaC',
        steps: [
          {
            id: 'do-cloud', name: 'クラウド (AWS / GCP / Azure)', level: 'required',
            summary: 'EC2・VPC・IAM・S3・EKS・RDS',
            desc: 'AWS（またはGCP/Azure）の主要サービスを実務レベルで扱えるようになりましょう。ネットワーク（VPC/サブネット/セキュリティグループ）、コンピューティング（EC2/Lambda/ECS/EKS）、ストレージ（S3/EBS）、IAMによる権限管理が中心です。',
            resources: ['AWS Skill Builder', 'AWS認定ソリューションアーキテクト', 'A Cloud Guru']
          },
          {
            id: 'do-terraform', name: 'Terraform (IaC)', level: 'recommended',
            summary: 'インフラのコード化・プラン・モジュール',
            desc: 'Infrastructure as Code のデファクトスタンダードです。HCL（Terraform 構成言語）によるリソース定義、terraform plan/apply によるインフラ変更管理、モジュール化、リモートステート管理を習得しましょう。',
            resources: ['Terraform公式ドキュメント', 'HashiCorp Learn（無料ハンズオン）', 'Terraform: Up and Running（書籍）']
          }
        ]
      },
      {
        phase: '監視・可観測性',
        steps: [
          {
            id: 'do-monitor', name: '監視 (Prometheus / Grafana)', level: 'recommended',
            summary: 'メトリクス収集・アラート・ダッシュボード',
            desc: 'システムの健全性を可視化するモニタリングスタックです。Prometheusによるメトリクス収集・アラートルールの設定と、Grafanaによるダッシュボード作成を習得しましょう。',
            resources: ['Prometheus公式ドキュメント', 'Grafana公式ドキュメント', 'Practical Monitoring（書籍）']
          },
          {
            id: 'do-logging', name: 'ログ管理 (ELK / Loki)', level: 'recommended',
            summary: 'ログ集約・検索・アラート',
            desc: 'Elasticsearch+Kibana（ELK Stack）またはGrafana Lokiによるログ集約・検索・可視化を習得しましょう。障害時の原因特定スピードに直結するスキルです。',
            resources: ['Elastic公式ドキュメント', 'Grafana Loki公式ドキュメント']
          }
        ]
      }
    ]
  },

  mobile: {
    title: 'モバイル開発 ロードマップ',
    phases: [
      {
        phase: '基礎知識',
        steps: [
          {
            id: 'mo-git', name: 'Git / GitHub', level: 'required',
            summary: 'バージョン管理・ブランチ・PR',
            desc: 'モバイル開発でもコード管理はGitが基本です。ブランチ戦略・プルリクエスト・コンフリクト解消を習得しましょう。',
            resources: ['Pro Git（無料書籍）', 'GitHub Skills']
          },
          {
            id: 'mo-design', name: 'UIデザイン基礎', level: 'recommended',
            summary: 'Figma・Human Interface Guidelines・Material Design',
            desc: 'モバイルアプリのUIはプラットフォームのガイドラインに従う必要があります。AppleのHuman Interface GuidelinesとGoogleのMaterial Designを理解し、Figmaでプロトタイプを作る基礎も身につけましょう。',
            resources: ['Apple Human Interface Guidelines', 'Material Design Guidelines', 'Figma公式チュートリアル']
          }
        ]
      },
      {
        phase: 'クロスプラットフォーム',
        steps: [
          {
            id: 'mo-flutter', name: 'Flutter (Dart)', level: 'required',
            summary: 'ウィジェット・状態管理・ネイティブ機能連携',
            desc: 'GoogleのクロスプラットフォームUIフレームワークで、iOS・Android・Webを1つのコードベースで開発できます。Dart言語の基礎、Widgetツリー、Provider/Riverpodによる状態管理を習得しましょう。',
            resources: ['Flutter公式ドキュメント（日本語）', 'Flutter公式コースlab', 'Riverpod公式ドキュメント']
          },
          {
            id: 'mo-rn', name: 'React Native', level: 'recommended',
            summary: 'Expo・JavaScriptでネイティブアプリ',
            desc: 'Reactの知識を活かしてモバイルアプリを開発できます。Expo（開発ツールチェーン）を使ったプロジェクト構築、ネイティブモジュール連携、React Navigationによる画面遷移を習得しましょう。',
            resources: ['React Native公式ドキュメント', 'Expo公式ドキュメント', 'React Navigation公式']
          }
        ]
      },
      {
        phase: 'iOS ネイティブ',
        steps: [
          {
            id: 'mo-swift', name: 'Swift / SwiftUI', level: 'recommended',
            summary: 'Swift言語・SwiftUI・Combine・CoreData',
            desc: 'Appleのネイティブ開発言語です。Swift の型システム・クロージャ・プロトコル、SwiftUIによる宣言的UI、Combineによるリアクティブプログラミング、CoreDataによるローカルデータ管理を習得しましょう。',
            resources: ['Swift公式ドキュメント', 'Hacking with Swift（無料）', 'SwiftUI公式チュートリアル']
          },
          {
            id: 'mo-appstore', name: 'App Store デプロイ', level: 'recommended',
            summary: 'TestFlight・証明書・審査プロセス',
            desc: 'App Storeへのリリースには証明書・プロビジョニングプロファイルの管理、TestFlightによるベータテスト、App Store Connect でのメタデータ入力など独自のプロセスがあります。',
            resources: ['Apple Developer公式ドキュメント', 'App Store Review Guidelines', 'Fastlane（CI/CD自動化）']
          }
        ]
      },
      {
        phase: 'Android ネイティブ',
        steps: [
          {
            id: 'mo-kotlin', name: 'Kotlin / Jetpack Compose', level: 'recommended',
            summary: 'Kotlin言語・Compose UI・Room・ViewModel',
            desc: 'AndroidのネイティブアプリはKotlinとJetpack Composeで開発します。Kotlin のコルーチン・データクラス・拡張関数、Jetpack Composeによる宣言的UI、ViewModel+LiveData/StateFlowによる状態管理を習得しましょう。',
            resources: ['Android公式ドキュメント（日本語）', 'Kotlin公式ドキュメント', 'Jetpack Compose codelabs']
          },
          {
            id: 'mo-playstore', name: 'Google Play デプロイ', level: 'recommended',
            summary: 'AAB形式・内部テスト・審査プロセス',
            desc: 'Google Play Consoleを使ったアプリ公開プロセスを理解しましょう。AAB（Android App Bundle）形式のビルド、内部テスト→クローズドテスト→本番の段階的ロールアウト管理が主な作業です。',
            resources: ['Google Play Console ヘルプ', 'Bundletool ドキュメント', 'Google Play ポリシー']
          }
        ]
      },
      {
        phase: '共通スキル',
        steps: [
          {
            id: 'mo-firebase', name: 'Firebase', level: 'recommended',
            summary: '認証・Firestore・FCM・Crashlytics',
            desc: 'モバイルアプリのバックエンドとして広く採用されるFirebaseです。Authentication（認証）、Firestore（リアルタイムDB）、FCM（プッシュ通知）、Crashlytics（クラッシュレポート）を活用しましょう。',
            resources: ['Firebase公式ドキュメント', 'Firebase Codelab（Google）']
          },
          {
            id: 'mo-testing', name: 'テスト（ユニット・UIテスト）', level: 'recommended',
            summary: 'XCTest / JUnit / Widget Test（Flutter）',
            desc: 'モバイルアプリの品質保証のためのテストです。ユニットテスト（ビジネスロジックの検証）、UIテスト（画面の自動操作）、ゴールデンテスト（スナップショット比較）などを習得しましょう。',
            resources: ['Flutter Widget Testing', 'XCTest公式ドキュメント', 'Android JUnit4テスト']
          },
          {
            id: 'mo-perf', name: 'パフォーマンス最適化', level: 'optional',
            summary: 'メモリ管理・Jank回避・バッテリー最適化',
            desc: 'スムーズな60fps/120fps描画、メモリリークの防止、ネットワークリクエストの最適化（キャッシュ戦略）によるバッテリー消費削減は、ストア評価向上に直結します。',
            resources: ['Flutter Performance docs', 'Android Performance Patterns（YouTube）', 'iOS Memory Management']
          }
        ]
      }
    ]
  }
};

// ---- 状態管理 ----
let currentCourse = null;

function getStorageKey(course) {
  return 'roadmap_progress_' + course;
}

function loadProgress(course) {
  try {
    const raw = localStorage.getItem(getStorageKey(course));
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function saveProgress(course, checked) {
  try {
    localStorage.setItem(getStorageKey(course), JSON.stringify(checked));
  } catch (e) {}
}

// ---- UI構築 ----
function buildRoadmap(courseKey) {
  const data = ROADMAPS[courseKey];
  if (!data) return;

  currentCourse = courseKey;
  const progress = loadProgress(courseKey);

  // タイトル
  document.getElementById('roadmap-title').textContent = data.title;

  // ツリー構築
  const tree = document.getElementById('roadmap-tree');
  tree.innerHTML = '';

  data.phases.forEach(phaseObj => {
    // フェーズ区切り
    const phaseEl = document.createElement('div');
    phaseEl.className = 'roadmap-phase';
    phaseEl.textContent = phaseObj.phase;
    tree.appendChild(phaseEl);

    phaseObj.steps.forEach(step => {
      const isDone = !!progress[step.id];
      const itemEl = buildStepElement(step, isDone, courseKey);
      tree.appendChild(itemEl);
    });
  });

  updateProgressBar(courseKey);

  // 表示
  document.getElementById('roadmap-area').classList.remove('hidden');
  document.getElementById('roadmap-area').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function buildStepElement(step, isDone, courseKey) {
  const wrapper = document.createElement('div');
  wrapper.className = 'roadmap-step level-' + step.level + (isDone ? ' done' : '');
  wrapper.setAttribute('role', 'listitem');
  wrapper.dataset.stepId = step.id;

  const levelLabel = { required: '必須', recommended: '推奨', optional: 'オプション' }[step.level];
  const badgeClass = 'badge-' + step.level;

  wrapper.innerHTML = `
    <div class="step-accent" aria-hidden="true"></div>
    <label class="step-check-wrap" aria-label="${step.name}の完了チェック">
      <input type="checkbox" ${isDone ? 'checked' : ''} aria-checked="${isDone}" aria-label="${step.name}を完了としてマーク">
    </label>
    <div class="step-content" role="button" tabindex="0" aria-label="${step.name}の詳細を表示">
      <div class="step-top-row">
        <span class="step-name">${escapeHtml(step.name)}</span>
        <span class="step-level-badge ${badgeClass}">${levelLabel}</span>
      </div>
      <div class="step-summary">${escapeHtml(step.summary)}</div>
    </div>
    <button class="step-info-btn" aria-label="${step.name}の詳細を表示" title="詳細を表示">ℹ</button>
  `;

  // チェックボックス イベント
  const checkbox = wrapper.querySelector('input[type="checkbox"]');
  checkbox.addEventListener('change', () => {
    const checked = checkbox.checked;
    const progress = loadProgress(courseKey);
    if (checked) {
      progress[step.id] = true;
    } else {
      delete progress[step.id];
    }
    saveProgress(courseKey, progress);
    wrapper.classList.toggle('done', checked);
    wrapper.querySelector('.step-name').style.textDecoration = checked ? 'line-through' : '';
    updateProgressBar(courseKey);
  });

  // コンテンツクリック → ポップアップ
  const content = wrapper.querySelector('.step-content');
  const infoBtn = wrapper.querySelector('.step-info-btn');
  const openPopup = () => showPopup(step);
  content.addEventListener('click', openPopup);
  content.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPopup(); }
  });
  infoBtn.addEventListener('click', openPopup);

  return wrapper;
}

function updateProgressBar(courseKey) {
  const data = ROADMAPS[courseKey];
  const progress = loadProgress(courseKey);
  let total = 0;
  let done = 0;

  data.phases.forEach(ph => {
    ph.steps.forEach(step => {
      total++;
      if (progress[step.id]) done++;
    });
  });

  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  const bar = document.getElementById('progress-bar');
  const text = document.getElementById('progress-text');
  bar.style.width = pct + '%';
  bar.setAttribute('aria-valuenow', pct);
  text.textContent = `${pct}% 完了（${done}/${total}）`;
}

// ---- ポップアップ ----
function showPopup(step) {
  const overlay = document.getElementById('popup-overlay');
  const levelLabel = { required: '必須', recommended: '推奨', optional: 'オプション' }[step.level];
  const badgeClass = { required: 'badge-required', recommended: 'badge-recommended', optional: 'badge-optional' }[step.level];

  document.getElementById('popup-title').textContent = step.name;
  const levelBadge = document.getElementById('popup-level');
  levelBadge.textContent = levelLabel;
  levelBadge.className = 'popup-level-badge ' + badgeClass;
  document.getElementById('popup-desc').textContent = step.desc;

  const resEl = document.getElementById('popup-resources');
  if (step.resources && step.resources.length > 0) {
    resEl.innerHTML = '<strong>学習リソース例</strong><ul>' +
      step.resources.map(r => `<li>${escapeHtml(r)}</li>`).join('') +
      '</ul>';
    resEl.style.display = '';
  } else {
    resEl.style.display = 'none';
  }

  overlay.classList.remove('hidden');
  document.getElementById('popup-close').focus();
  document.body.style.overflow = 'hidden';
}

function hidePopup() {
  document.getElementById('popup-overlay').classList.add('hidden');
  document.body.style.overflow = '';
}

// ---- ユーティリティ ----
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ---- 初期化 ----
document.addEventListener('DOMContentLoaded', () => {
  // コース選択ボタン
  const courseButtons = document.querySelectorAll('.course-btn');
  courseButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      courseButtons.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-pressed', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');
      buildRoadmap(btn.dataset.course);
    });
  });

  // 進捗リセット
  document.getElementById('btn-reset').addEventListener('click', () => {
    if (!currentCourse) return;
    if (!confirm('このコースの進捗をリセットしますか？')) return;
    localStorage.removeItem(getStorageKey(currentCourse));
    buildRoadmap(currentCourse);
  });

  // ポップアップ閉じる
  document.getElementById('popup-close').addEventListener('click', hidePopup);
  document.getElementById('popup-overlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('popup-overlay')) hidePopup();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hidePopup();
  });

  // 最後に選択したコースを復元
  const lastCourse = localStorage.getItem('roadmap_last_course');
  if (lastCourse && ROADMAPS[lastCourse]) {
    const btn = document.querySelector(`.course-btn[data-course="${lastCourse}"]`);
    if (btn) btn.click();
  }

  // コース変更時に保存
  courseButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      localStorage.setItem('roadmap_last_course', btn.dataset.course);
    });
  });
});
