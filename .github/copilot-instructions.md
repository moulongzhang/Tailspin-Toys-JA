# Tailspin Toys クラウドファンディング開発ガイドライン

これは開発者向けテーマのゲームのためのクラウドファンディングプラットフォームです。このアプリケーションは、**Tailwind CSS v4** でスタイリングされた単一の **Astro 7** サイト（完全にプリレンダリングされた静的出力）です。データはローカルの SQLite データベースに保存され、ビルド時に **Drizzle ORM + Node.js 組み込みの SQLite ドライバー**を通じてアクセスされます。ページは frontmatter でデータベースに直接クエリを実行します — 別個のバックエンド API やクライアントサイドの UI フレームワークはありません。コントリビュートする際は、以下のガイドラインに従ってください。

## エージェント向けメモ

- コード生成を開始する前にプロジェクトを調査してください
- 長時間の操作では todo リストを作成してください
  - todo リストの各ステップの前に、常に正しい指示に従えるよう指示を読み直してください
- 利用可能な場合は常に instructions ファイルを使用し、コード生成の前に確認してください
- タスク完了時にサマリーの markdown ファイルを生成しないでください
- スクリプトや BASH コマンドを実行する際は常に絶対パスを使用してください
- **明示的に指示されない限り、main に自動でコミットまたはプッシュしないでください**

## コード標準

### 各コミットの前に必須

#### テストのガイドライン

- **テストとリントは常に `quality-checks` skill を通じて実行し、`npm run test:unit`、`npm run test:e2e`、`npm run lint` を直接呼び出さないでください。** この skill は環境のセットアップ、実行順序、トラブルシューティングをラップしています。（手動検証のためにアプリを起動することは品質チェックではありません — その場合は `npm run dev` を直接実行してください。）
- Vitest のユニットテストを実行してデータレイヤーと変換処理を検証し、Playwright のテストを実行して e2e とフロントエンドの機能を検証してください
- コミット前に ESLint を実行してフロントエンドのコード品質をチェックしてください
- 既存のテストを確認し、作業の重複がないようにしてください
- テストコードはプロジェクトの他の部分と同等の品質であるべきで、DRY の原則に従ってください
- フロントエンドの変更では、ビルド（`npm run build`）を直接検証し、`quality-checks` skill を通じてエンドツーエンドテストを実行して、すべてが正しく動作することを確認してください
- データレイヤー（スキーマ、ヘルパー、変換処理）を変更する場合は、対応するユニットテストを更新して実行してください

#### プロジェクトのガイドライン

- データベーススキーマを更新する場合は、drizzle-kit のマイグレーションを生成してコミットしてください（`npm run db:generate`）
- 新しい機能を追加する場合は、README を必ず更新してください
- プロジェクト構造やスクリプト、プログラミングガイダンスを含め、関連する変更がすべて Copilot Instructions ファイルのガイダンスに反映されていることを確認してください

### コードフォーマットの要件

- TypeScript を使用し、特にデータレイヤー（`db/`、`src/lib/`）では関数のパラメーターと戻り値に明示的な型を指定してください
- フロントエンドコード（TypeScript、Astro）は ESLint のチェックに合格する必要があります（`npm run lint`）

### データレイヤーのパターン（Drizzle + Node SQLite）

- テーブルは `db/schema.ts` に定義し、スキーマの変更は drizzle-kit のマイグレーションで管理してください - `drizzle.instructions.md` を参照してください
- データアクセスヘルパーは `src/lib/` に置き、テスト可能にするために **注入可能な `db`** 引数を持たせてください
- CSV/シード処理は `db/transforms.ts` の純粋関数として保持してください
- シード由来の値は決定的（`Math.random` を使わない）でなければならず、静的ビルドが再現可能であるようにしてください

### Astro のパターン

- **Astro Pages/Components**: ルーティング、レイアウト、コンテンツ、コンポーネントはすべて `.astro` です - `astro.instructions.md` を参照してください
- `src/lib/` のヘルパーを介してページ frontmatter でデータを直接クエリしてください（ビルド時、静的出力）
- 動的ルートは `getStaticPaths()` + `export const prerender = true` を使用します
- ブランド化された `404.astro` を用意してください（静的出力では未知のルートは実際の 404 になります）
- 本物のクライアントインタラクティビティが必要な場合にのみ、スコープ付きの Astro `<script>` を追加してください

### スタイリング

- Tailwind CSS のユーティリティクラスのみを使用してください - `style.instructions.md` を参照してください
- ダークテーマの色: slate パレット（`bg-slate-800`、`text-slate-100` など）
- 角丸とモダンな UI パターン
- クリーンでアクセシブルなインターフェースを備えたモダンな UI/UX の原則に従ってください

### GitHub Actions ワークフロー

- 適切なセキュリティプラクティスに従ってください
- ワークフローの権限を明示的に設定してください
- どのようなタスクを実行しているかを記述するコメントを追加してください

## Copilot code review（コードレビュー）

このリポジトリの pull request は **GitHub Copilot code review (CCR)** によってレビューされます。

- **レビュー時は必ず `code-review` skill に従ってください**（[`.github/skills/code-review/SKILL.md`](skills/code-review/SKILL.md)）。手順・レポートの絶対パス・コメントの書き方・ノイズ抑制ポリシーはすべてこの skill が唯一の情報源です。
- **レビューコメントはすべて日本語で書いてください。**
- レビュー環境は [`.github/workflows/copilot-code-review.yml`](workflows/copilot-code-review.yml) の `copilot-setup-steps` ジョブが準備します。レビュー開始時点で以下の**事前生成レポート**がディスク上にあるので、指摘の前に必ず参照してください:
  - ESLint（JSON / テキスト）: `/home/runner/.copilot-code-review/reports/eslint-report.json`
  - CodeQL SARIF: `/home/runner/.copilot-code-review/reports/codeql/results.sarif`
  - 型チェックログ: `/home/runner/.copilot-code-review/reports/typecheck.log`
  - CodeQL CLI / データベース: `/home/runner/.copilot-code-review/codeql/codeql`、`/home/runner/.copilot-code-review/codeql-db/database`
- 指摘は **PR の差分行に該当するものだけ**に限定し、既存の無関係な警告で PR を汚さないでください。
- CodeQL 由来の指摘にはルール ID と CWE を、ESLint 由来の指摘にはルール ID を併記し、可能なら suggestion 形式で修正案を示してください。
- レビュー中はファイアウォール下でネットワークが制限されます。追加のツールをダウンロードせず、セットアップ済みの成果物を使ってください。

> [!NOTE]
> `copilot-code-review.yml` は **default branch (main) に存在して初めて有効**になります。一方、カスタム指示（このファイル、`.github/instructions/**`）と `.github/skills/**` は **PR の head ブランチ**から読まれます。

## スクリプト

- このプロジェクトはすべての開発タスクに **npm scripts** を使用します — `scripts/` ディレクトリはありません。
- **Skill が優先されます。** コマンドを直接実行する前に、そのタスクをカバーする skill があるかどうかを確認してください（例: `quality-checks` skill はテストとリントをラップします）。該当するものがあれば、それに従ってください。
- 主要な npm scripts:
  - `npm run dev` — Astro の開発サーバーを起動します（`predev` がローカルの SQLite データベースをマイグレーション + シードします）
  - `npm run build` — 静的サイトをビルドします（`prebuild` がローカルの SQLite データベースをマイグレーション + シードします）
  - `npm run preview` — ビルドされた `dist/` 出力を配信します
  - `npm run lint` — ESLint
  - `npm run test:unit` — Vitest のユニットテスト
  - `npm run test:e2e` — Playwright の E2E テスト（先にビルド + プレビューします）
  - `npm run typecheck` — `tsconfig.tsgo.json` を使用して `tsgo`（TypeScript 7 ネイティブコンパイラ、`@typescript/native-preview` 経由）で純粋な TypeScript を型チェックします
  - `npm run typecheck:astro` — `astro check`（クラシックな TypeScript パッケージ）で `.astro` ファイルを型チェックします
  - `npm run typecheck:all` — 両方の型チェックスクリプトを実行します（CI の `type-check` ジョブで使用）
  - `npm run db:generate` / `db:migrate` / `db:seed` / `db:setup` — Drizzle のスキーマ/マイグレーション/シードのタスク

> [!NOTE]
> TypeScript 7（`tsgo`）は型チェックのみのために**並行して**採用されており、リントには影響しません。ESLint + `typescript-eslint` と `astro check` は、ネイティブコンパイラの API がまだ対応していないため、引き続きクラシックな `typescript` パッケージ（v6 に固定）を解決します。`typescript-eslint` + `@astrojs/check` がネイティブ API をサポートするまで、クラシックな `typescript` パッケージを 7 に**上げないでください**（Dependabot の `ignore` が固定しています）。`tsgo` は `--noEmit` のみで、サイトは引き続き `astro build` によってビルドされます。

## リポジトリ構造

アプリケーションはリポジトリのルートに存在します:

- `db/`: Drizzle のスキーマ、マイグレーション、変換処理、シード、`games.csv`
- `src/lib/`: Node SQLite クライアント（`db.ts`）とデータアクセスヘルパー（`games.ts`）
- `src/components/`: 再利用可能な `.astro` コンポーネント
- `src/layouts/`: Astro のレイアウトテンプレート
- `src/pages/`: Astro のページルート（`index.astro` の一覧、`game/[id].astro`、`404.astro`、`about.astro`）
- `src/styles/`: CSS と Tailwind の設定
- `src/types/`: TypeScript のインターフェース（Game、Publisher、Category）
- `e2e-tests/`: Playwright の E2E テスト（ホーム、ゲーム、アクセシビリティ）
- `drizzle.config.ts`、`vitest.config.ts`、`astro.config.mjs`、`playwright.config.ts`: ツールの設定
- `README.md`: プロジェクトのドキュメント
