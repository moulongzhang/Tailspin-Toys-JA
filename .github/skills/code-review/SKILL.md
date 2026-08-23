---
name: code-review
description: GitHub Copilot code review (CCR) が pull request をレビューするときの手順を定義します — セットアップステップで事前生成された ESLint JSON / CodeQL SARIF / 型チェックログの読み取り、差分行に絞った指摘、変更ファイルへの追加解析の実行、レビューコメントの書き方とノイズ抑制ポリシーを扱います。この Astro + Drizzle/Node SQLite リポジトリの pull request をレビューする際は、必ずこのスキルに従ってください。
allowed-tools:
  - shell
---

# コードレビュー（code-review）

このスキルは **GitHub Copilot code review (CCR)** 専用です。レビュー環境は
[`.github/workflows/copilot-code-review.yml`](../../workflows/copilot-code-review.yml) の
`copilot-setup-steps` ジョブによって準備され、レビューが始まる時点で
**ESLint / CodeQL / 型チェックの結果がすでにディスク上にあります**。

> [!IMPORTANT]
> レビュー中はファイアウォール下でネットワークが制限されます。新しいツールの
> ダウンロードやパッケージのインストールは試みず、**下記の事前生成済み成果物を使ってください**。

**レビューコメントはすべて日本語で書いてください。**

---

## 1. まず事前生成レポートを読む

すべて `$HOME/.copilot-code-review/`（GitHub ホストランナーでは `/home/runner/.copilot-code-review/`）配下にあります。

| 種別 | 絶対パス |
| --- | --- |
| 生成物の一覧（マニフェスト） | `/home/runner/.copilot-code-review/reports/MANIFEST.md` |
| ESLint（JSON、機械可読） | `/home/runner/.copilot-code-review/reports/eslint-report.json` |
| ESLint（stylish、人間可読） | `/home/runner/.copilot-code-review/reports/eslint-report.txt` |
| 型チェックログ（tsgo + astro check） | `/home/runner/.copilot-code-review/reports/typecheck.log` |
| CodeQL SARIF | `/home/runner/.copilot-code-review/reports/codeql/javascript-typescript.sarif` |
| CodeQL データベース | `/home/runner/.copilot-code-review/codeql-db/javascript-typescript` |
| CodeQL CLI 実行ファイル | `/home/runner/.copilot-code-review/codeql/codeql` |

まず存在確認を行います:

```bash
ls -la /home/runner/.copilot-code-review/reports
cat /home/runner/.copilot-code-review/reports/MANIFEST.md
```

レポートが存在しない場合は、セットアップステップが失敗した可能性があります。
その場合は**レポートに依存しないコード読解ベースのレビューにフォールバック**し、
静的解析結果が取得できなかった旨をレビュー本文に一言添えてください。

---

## 2. PR の差分行を特定する

指摘は **この PR で追加・変更された行に限定します**。既存の無関係な警告で PR を汚さないでください。

```bash
# 変更されたファイル一覧
git diff --name-only origin/main...HEAD

# 各ファイルの追加/変更行番号（新ファイル側）
git diff -U0 origin/main...HEAD -- <ファイル> | grep -E '^@@'
```

`@@ -a,b +c,d @@` の `+c,d` が新ファイル側の変更範囲です。この範囲に**含まれる行の検出結果だけ**を採用します。

---

## 3. ESLint レポートの読み方

`eslint-report.json` は `[{ filePath, messages: [{ ruleId, severity, message, line, column, fix }] }]` の配列です。

```bash
# severity 2 (error) だけをファイル・行・ルールIDで一覧化
jq -r '
  .[] | .filePath as $f | .messages[]
  | select(.severity == 2)
  | "\($f):\(.line):\(.column)\t\(.ruleId // "parse-error")\t\(.message)"
' /home/runner/.copilot-code-review/reports/eslint-report.json
```

```bash
# 特定のファイルの指摘だけを見る
jq -r --arg f "src/lib/games.ts" '
  .[] | select(.filePath | endswith($f)) | .messages[]
  | "\(.line):\(.column) [\(.severity)] \(.ruleId // "-") \(.message)"
' /home/runner/.copilot-code-review/reports/eslint-report.json
```

```bash
# 自動修正可能 (fixable) な件数を数える
jq '[.[].messages[] | select(.fix != null)] | length' \
  /home/runner/.copilot-code-review/reports/eslint-report.json
```

---

## 4. CodeQL SARIF の読み方

SARIF は `runs[0].results[]` に検出結果、`runs[0].tool.driver.rules[]` にルール定義（説明・重大度・CWE タグ）が入ります。

```bash
SARIF=/home/runner/.copilot-code-review/reports/codeql/javascript-typescript.sarif

# 件数
jq '[.runs[].results[]] | length' "$SARIF"
```

```bash
# ルールID・重大度・ファイル・行・メッセージの一覧
jq -r '
  .runs[] as $run
  | ($run.tool.driver.rules // []) as $rules
  | $run.results[]
  | . as $r
  | ($rules[$r.ruleIndex // -1] // {}) as $rule
  | [
      $r.ruleId,
      ($rule.properties["security-severity"] // $rule.defaultConfiguration.level // "note"),
      $r.locations[0].physicalLocation.artifactLocation.uri,
      ($r.locations[0].physicalLocation.region.startLine | tostring),
      $r.message.text
    ] | @tsv
' "$SARIF"
```

```bash
# 特定ファイルの検出だけに絞る（差分レビュー向け）
jq -r --arg f "src/lib/report-export.ts" '
  .runs[].results[]
  | select(.locations[0].physicalLocation.artifactLocation.uri == $f)
  | "\(.locations[0].physicalLocation.region.startLine): \(.ruleId) — \(.message.text)"
' "$SARIF"
```

```bash
# ルールの CWE タグと詳細説明（コメントの根拠として引用する）
jq -r --arg rule "js/path-injection" '
  .runs[].tool.driver.rules[]
  | select(.id == $rule)
  | "\(.id)\n重大度: \(.properties["security-severity"] // "-")\nタグ: \(.properties.tags | join(", "))\n\(.fullDescription.text)"
' "$SARIF"
```

```bash
# データフローの経路（codeFlows）を確認して、ソースとシンクを説明できるようにする
jq -r '
  .runs[].results[]
  | select(.codeFlows != null)
  | "[\(.ruleId)]",
    (.codeFlows[0].threadFlows[0].locations[]
      | "  \(.location.physicalLocation.artifactLocation.uri):\(.location.physicalLocation.region.startLine) \(.location.message.text // "")")
' "$SARIF"
```

---

## 5. 型チェックログ

```bash
cat /home/runner/.copilot-code-review/reports/typecheck.log
```

- 前半が `tsgo --noEmit`（TypeScript 7 ネイティブ、`db/` `src/lib/` `src/types/` など純粋な TS）、
  後半が `astro check`（`.astro` ファイル）の出力です。
- 型エラーが**変更行に起因する**場合のみ指摘してください。

---

## 6. 変更ファイルに対する追加解析（必要な場合のみ）

事前レポートは PR の head コミットに対して生成されていますが、確認したいことが
残っている場合のみ、**変更ファイルに限定して**追加実行してください。

```bash
# 変更された TS/Astro ファイルだけを ESLint で再チェック
cd "$GITHUB_WORKSPACE"
git diff --name-only --diff-filter=ACMR origin/main...HEAD -- '*.ts' '*.astro' \
  | xargs -r npx eslint -f stylish
```

```bash
# 事前生成された CodeQL データベースに対して追加クエリを実行する
CODEQL=/home/runner/.copilot-code-review/codeql/codeql
DB=/home/runner/.copilot-code-review/codeql-db/javascript-typescript

"$CODEQL" database analyze "$DB" \
  codeql/javascript-queries:codeql-suites/javascript-security-extended.qls \
  --format=sarifv2.1.0 \
  --output=/home/runner/.copilot-code-review/reports/codeql/extended.sarif \
  --download=false \
  --threads=0
```

```bash
# CodeQL CLI が使えることの確認 / 解決されるクエリの一覧
/home/runner/.copilot-code-review/codeql/codeql version --format=terse
/home/runner/.copilot-code-review/codeql/codeql resolve queries \
  codeql/javascript-queries:codeql-suites/javascript-security-extended.qls
```

> [!NOTE]
> レビュー中はネットワークが制限されるため `--download=false` を付け、
> セットアップ時に取得済みのクエリパックのみを使用してください。
> 追加解析は数分かかることがあります。事前レポートで判断できる場合は実行しないでください。

---

## 7. レビューコメントの書き方

### 並び順

**重大度の高い順**にコメントします。

1. セキュリティ（CodeQL の `security-severity` が高いもの、CWE 付き）
2. 明確なバグ・データ破壊・クラッシュ
3. ESLint の `error`（severity 2）と型エラー
4. 設計・保守性の問題（このリポジトリの規約違反を含む）

### 1 件のコメントに含めるもの

- **何が問題か**を 1〜2 文で。日本語で簡潔に。
- **根拠**: CodeQL ならルール ID と CWE、ESLint ならルール ID を必ず併記する。
- **修正案**: 可能な限り GitHub の suggestion 形式で提示する。

コメント例:

~~~markdown
**セキュリティ: パストラバーサル** (`js/path-injection`, CWE-22 / CWE-23)

`fileName` が検証されずに `path.join` に渡されているため、`../` を含む入力で
`exports/` の外のファイルを読み書きできます。

```suggestion
  const safeName = path.basename(fileName);
  const target = path.join(EXPORT_DIR, safeName);
```
~~~

~~~markdown
**Lint: 未使用の変数** (`@typescript-eslint/no-unused-vars`)

`unusedTotal` はどこからも参照されていません。意図的に残す場合は、このリポジトリの
規約どおり `_` を接頭辞に付けてください（`eslint.config.js` の `varsIgnorePattern`）。
~~~

### このリポジトリ固有の観点

レビュー時は [`.github/copilot-instructions.md`](../../copilot-instructions.md) と
[`.github/instructions/`](../../instructions/) の各ファイルも根拠として使います。

- **データレイヤー**（`db/`、`src/lib/`）: 関数の引数と戻り値に明示的な型があるか。
  `db` が注入可能な引数になっているか。seed 由来の値が決定的か（`Math.random` の使用は指摘対象）。
- **Astro**（`*.astro`）: 動的ルートに `getStaticPaths()` + `export const prerender = true` があるか。
- **スタイル**: Tailwind ユーティリティのみか（インラインの `style` や独自 CSS は指摘）。
- **アクセシビリティ**: セマンティック HTML、可視のフォーカスリング、`data-testid` の有無。
- **スキーマ変更**: `db/schema.ts` を変更したのに `db/migrations/` の drizzle-kit マイグレーションが
  ない場合は必ず指摘する。

---

## 8. ノイズ抑制ポリシー

- **差分外の指摘はしない。** 事前レポートには PR と無関係な既存の警告も含まれます。
  §2 で求めた変更行に該当しないものは**すべて捨てます**。
- **スタイルの好みだけの指摘はしない。** 命名の好み、import の並び順、コメントの言い回し、
  フォーマッタが扱う範囲（インデント、引用符、行長）はコメントしません。
- **自動修正可能な lint は 1 件にまとめる。** `fix` を持つ ESLint の指摘が複数ある場合は、
  個別にコメントせず「`npm run lint -- --fix` で解消できる指摘が N 件あります」と 1 コメントに集約します。
- **同じ根本原因は 1 件にまとめる。** 同一ルールが同じファイルで繰り返し出る場合は、
  代表 1 箇所にコメントし、他の行番号を箇条書きで併記します。
- **重複しない。** 既存のレビューコメントや CI が既に報告している内容は繰り返しません。
- **推測で断定しない。** 確信が持てない場合はコメントを出さないか、質問として書きます。
- **`db/migrations/`、`dist/`、`node_modules/`、`.astro/` は対象外**（`eslint.config.js` の
  ignores と同じ扱い）。

---

## 9. レビューの進め方（チェックリスト）

1. `MANIFEST.md` を読み、事前レポートが揃っていることを確認する
2. `git diff --name-only origin/main...HEAD` で変更ファイルと変更行を把握する
3. CodeQL SARIF を変更ファイルで絞り込み、該当があれば最優先でコメントする
4. ESLint JSON を変更ファイル・変更行で絞り込む（自動修正可能なものは集約）
5. 型チェックログに変更由来のエラーがないか確認する
6. 静的解析では出ないロジックバグ・規約違反をコード読解で確認する
7. 重大度順に並べ、根拠（ルール ID / CWE）と suggestion を添えて**日本語で**コメントする
