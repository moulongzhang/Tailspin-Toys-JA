# Tailspin Toys

> このリポジトリは [github-samples/tailspin-toys](https://github.com/github-samples/tailspin-toys)（MIT License）を日本語ワークショップ向けに翻訳したものです。アプリケーションのソースコードは原典のままで、ドキュメント・指示ファイル・スキル・Issue のみを日本語化しています。

> [!NOTE]
> **コミット履歴の著者表記について**
>
> 最初の 2 件のコミット（`027f2f8`、`213fc70`）は、著者が `William Zhang <williamzhang@users.noreply.github.com>` と記録されています。これは AI エージェントによる作業中に、この環境の git 設定（`zhang.william <moulongzhang@github.com>`）を確認せず、作業ディレクトリのパスから推測した値が使われたためです。
>
> このメールアドレスは GitHub 上の無関係なアカウント `WilliamZhang` の noreply アドレス形式と一致するため、コミット一覧ではそのアカウントにリンクされて表示されます。**当該アカウントの所有者はこのリポジトリに一切関与していません。**
>
> Git のコミット著者は自己申告のテキストフィールドであり、署名がない限り検証されません。この経緯を記録として残すため、履歴の書き換えは行っていません。実際の作業者およびリポジトリのオーナーは [@moulongzhang](https://github.com/moulongzhang) です。

Tailspin Toys は、開発者向けのテーマを持つゲームのクラウドファンディングプラットフォームです。このプロジェクトは架空のゲームクラウドファンディング企業向けの Web サイトで、単一の [Astro](https://astro.build/) サイト（完全にプリレンダリングされた静的出力）として構築され、[Tailwind CSS](https://tailwindcss.com/) でスタイリングされています。データはローカルの SQLite データベースに格納され、[Drizzle ORM](https://orm.drizzle.team/) と Node.js 組み込みの SQLite ドライバー経由でアクセスします。ページはビルド時にフロントマターでデータベースを直接クエリするため、独立したバックエンドサービスはありません。

## アーキテクチャ

- **Astro 7** — ページ、レイアウト、コンポーネント、ルーティング。`output: 'static'` のため、サイト全体がビルド時に HTML へプリレンダリングされます。
- **Drizzle ORM + Node SQLite** — データレイヤーです。スキーマは `db/schema.ts` にあり、データは `db/games.csv` からシードされます。マイグレーションは `drizzle-kit` で管理します。
- **Tailwind CSS v4** — ユーティリティクラスによるスタイリング（ダークテーマ）。
- **Vitest** — データレイヤーと純粋な変換処理のユニットテスト。
- **Playwright** — ビルド済みの静的サイトに対して実行するエンドツーエンドテスト。

データベースは `dev`/`build` の前に（`predev`/`prebuild` の npm スクリプトによって）自動的にマイグレーションとシードが行われ、gitignore された `tailspin.db` ファイルに書き込まれます。

## このテンプレートの使い方

このリポジトリは GitHub template です。これをもとに新しいリポジトリを作成すると、一度だけ実行される **Bootstrap template issues** ワークフロー（`.github/workflows/bootstrap-issues.yml`）が `main` への最初のプッシュ時に自動的に実行され、最初に取り組むとよい機能を説明する一連のスターター Issue を作成します。各 Issue は `.github/bootstrap-issues/` 内の Markdown ファイルで定義されており、最初の見出しが Issue のタイトルに、残りの内容が本文になります。そのため、そこにあるファイルを編集・追加・削除することで、どの Issue を作成するかを制御できます。

このワークフローはテンプレートから作成されたリポジトリでのみ実行されます（`if: ${{ !github.event.repository.is_template }}` のガードによってテンプレート自体はスキップされます）。また、Issue を作成した後は、クリーンアップコミットでワークフロー自身と `.github/bootstrap-issues/` フォルダーを削除するため、二度と実行されることはありません。

## はじめに

Node.js 22.13 以降を使用して、依存関係を一度だけインストールします:

```bash
npm ci
npx playwright install chromium   # E2E テストを実行する場合のみ必要
```

## サイトの起動

```bash
npm run dev
```

`predev` が最初にローカルデータベースのマイグレーションとシードを行います。その後、[website](http://localhost:4321) にアクセスしてサイトを確認しましょう！

代わりにプロダクションビルドをプレビューするには:

```bash
npm run build      # prebuild がマイグレーションとシードを行い、その後静的サイトをビルドします
npm run preview
```

## データベース

SQLite データベースは `db/games.csv` から構築されます。マイグレーションが必要なライブデータはありません。

```bash
npm run db:generate   # db/schema.ts を編集した後にマイグレーションを生成
npm run db:migrate    # マイグレーションを適用
npm run db:seed       # games.csv からシード（冪等）
npm run db:setup      # マイグレーション + シード（predev/prebuild によって自動実行）
```

> [!NOTE]
> シードは冪等です。変更された行を照合して更新するのではなく、（タイトルで照合して）すでに存在するゲームをスキップします。CI は常にクリーンなデータベースから開始するため、`games.csv` を正確に反映します。ローカルで `games.csv` の行を編集または削除した場合は、`tailspin.db` を削除してから `npm run db:setup` を再実行し、完全に再生成してください。

## テストの実行

```bash
npm run test:unit   # Vitest ユニットテスト（変換処理 + データアクセスヘルパー）
npm run test:e2e    # Playwright E2E テスト（先に静的サイトのビルドとプレビューを行います）
```

## Lint

フロントエンドは ESLint を使用して、TypeScript と Astro ファイル全体のコード品質を担保します。次のように実行します:

```bash
npm run lint
```

ESLint は `main` への pull request に対して CI でも自動的に実行されます。

## 型チェック

このプロジェクトは型チェックに **TypeScript 7**（ネイティブの Go コンパイラー、`tsgo`）を使用しており、[`@typescript/native-preview`](https://www.npmjs.com/package/@typescript/native-preview) パッケージを通じて並行して採用しています。従来の `typescript` パッケージは意図的に v6 に据え置かれており、ESLint + `typescript-eslint` と `astro check` が変更なしで動作し続けるようにしています。TypeScript 7 のプログラム API はまだこれらのツールに対応していないためです。

```bash
npm run typecheck        # tsgo（TS 7）が純粋な TypeScript を型チェックします（db/、src/lib/、src/types/、設定ファイル、テスト）
npm run typecheck:astro  # astro sync + astro check が .astro ファイルを型チェックします（従来の TypeScript パッケージ上）
npm run typecheck:all    # 上記の両方
```

`tsgo` は [`tsconfig.tsgo.json`](tsconfig.tsgo.json) に対して実行されます。これは `.astro` ファイル（ネイティブコンパイラーが理解できないもの）を除外したスコープ付きの設定です。型チェックは `main` への pull request に対して CI でも自動的に実行されます。

> [!NOTE]
> ネイティブコンパイラーは型チェック（`--noEmit`）にのみ使用されます。サイトは引き続き `astro build`（Vite/esbuild）でビルドされます。従来の `typescript` パッケージは、`typescript-eslint` と `@astrojs/check` がネイティブ API に対応する（およそ TS 7.1）まで v6 のままです。`.github/dependabot.yml` の Dependabot `ignore` によって、それまで従来の `typescript@7` へのバンプが保留されます。

## Copilot のエージェントとスキル

このプロジェクトは、品質保証を支援する Copilot のカスタマイズを同梱しています:

### Database Explorer キャンバス

共有の **Database Explorer** canvas（`.github/extensions/database-explorer/`）は、プロジェクトの SQLite テーブルを閲覧し、一度に 1 つの読み取り専用 `SELECT` または `WITH` クエリを実行するための小さな UI とエージェントアクションを提供します。`.data/tailspin.db`（または `DATABASE_URL` が設定されている場合はそれ）のデータベースを使用するため、新しいチェックアウトで開く前に `npm run db:setup` を実行してください。

### PR Readiness エージェント

**PR Readiness** エージェント（`.github/agents/pr-readiness.md`）は、PR 前の品質ゲートです。pull request を開く前に実行して、次のことを行います:

- すべての受け入れ基準が実装されていることを検証する
- テストカバレッジを監査し、不足箇所を補う
- フル検証スイート（ユニットテスト、lint、E2E テスト）を実行する
- Playwright MCP を介してブラウザーで機能を手動検証する（毎回必須）
- go/no-go レポートを作成する

### quality-checks スキル

**quality-checks** スキル（`.github/skills/quality-checks/SKILL.md`）は、プロジェクトの npm テストと lint コマンドを、詳細なデバッグとトラブルシューティングの手順書とともにラップします。次の場合に `/quality-checks` から使用します:

- セットアップ後に初めてテストや lint を実行するとき
- テストの失敗（ポートの競合、古いサーバー、不安定なテスト、CI との差異）を診断するとき
- コミット、プッシュ、マージの前に準備状況を検証するとき

### code-review スキルと Copilot code review 環境

**code-review** スキル（`.github/skills/code-review/SKILL.md`）は、**GitHub Copilot code review (CCR)** が pull request をレビューするときの手順書です。レビューコメントは日本語で書かれ、指摘は PR の差分行に限定されます。

レビュー環境は `.github/workflows/copilot-code-review.yml`（ジョブ名は CCR の仕様上 `copilot-setup-steps` 固定）が準備します。このジョブは依存関係のインストールに加えて、レビュー開始前に次のレポートを `/home/runner/.copilot-code-review/` へ事前生成します:

| 種別 | パス |
| --- | --- |
| ESLint（JSON / テキスト） | `reports/eslint-report.json` / `reports/eslint-report.txt` |
| 型チェックログ | `reports/typecheck.log` |
| CodeQL SARIF（Code scanning へはアップロードしない） | `reports/codeql/javascript-typescript.sarif` |
| CodeQL データベース / CLI | `codeql-db/javascript-typescript` / `codeql/codeql` |

レビュー実行中はファイアウォールでネットワークが制限されるため、CodeQL バンドルの取得などネットワークが必要な処理はすべてこのセットアップステップで完了させています。

> [!NOTE]
> 環境設定ファイル（`copilot-code-review.yml`）は **default branch (`main`) に存在して初めて有効**になります。一方、カスタム指示（`.github/copilot-instructions.md`、`.github/instructions/**`）と skill（`.github/skills/**`）は **PR の head ブランチ**から読まれます。

### GitHub Copilot app の Run メニュー

[GitHub Copilot app](https://github.com/github/github-app) は
`.github/github-app.yml` を読み取り、**Run** メニューにプロジェクトのコマンドを提供します。
新しいセッションでは自動的に依存関係がインストールされます。**Run development site** を使って
Astro を起動します。Astro がローカル URL を報告すると、アプリはそれをブラウザー
canvas で自動的に開きます。このメニューは、オンデマンドで検証するための静的ビルドと型チェックの
コマンドも提供します。

## ライセンス

このプロジェクトは MIT オープンソースライセンスの条項の下でライセンスされています。完全な条項については [LICENSE](./LICENSE) を参照してください。

## メンテナー

メンテナーの一覧は [CODEOWNERS](./.github/CODEOWNERS) にあります。

## サポート

このプロジェクトは現状のまま提供され、時間の経過とともに更新される場合があります。質問がある場合は、Issue を開いてください。

## 免責事項

このアプリはプロダクション環境での使用を意図しておらず、またプロダクションアプリがどうあるべきかの例として構築されたものでもありません。
