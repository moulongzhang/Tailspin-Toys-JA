// ⚠️ 検証用モジュール — Copilot code review (CCR) の動作確認のためだけに追加しています。
// 意図的に ESLint 違反と CodeQL が検出する脆弱パターンを含んでいます。
// アプリケーションのどこからも import されておらず、本番の挙動には影響しません。
// 検証が終わったら削除してください。

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

// 検証用: どこからも参照されていない変数（@typescript-eslint/no-unused-vars）
const MAX_EXPORT_ROWS = 5000;

const EXPORT_DIR = path.join(process.cwd(), 'exports');

// 検証用: any の乱用（@typescript-eslint/no-explicit-any）＋ 戻り値の型が any
// このリポジトリの規約では、データレイヤーは明示的な型を持つ必要があります。
export function formatExportRow(row: any): any {
    // 検証用: == による緩い比較
    if (row.title == null) {
        return null;
    }
    return { title: row.title, rating: row.starRating };
}

// 検証用: パストラバーサル（js/path-injection, CWE-22 / CWE-23 / CWE-36）
// CLI 引数（ローカル入力）を検証せずに path.join へ渡しているため、
// `../` を含む入力で EXPORT_DIR の外のファイルを読み出せます。
export function readExportFromArgs(): string {
    const fileName = process.argv[2];
    const target = path.join(EXPORT_DIR, fileName);
    return fs.readFileSync(target, 'utf8');
}

// 検証用: コマンドインジェクション（js/command-line-injection, CWE-78 / CWE-88）
// 環境変数を文字列連結でシェルコマンドに埋め込んでいます。
export function archiveExports(): void {
    const name = process.env.EXPORT_NAME ?? 'export';
    execSync('tar -czf ' + name + '.tar.gz ' + EXPORT_DIR);
}

// 検証用: 正規表現インジェクション（js/regex-injection, CWE-730 / CWE-400）
// ユーザー由来の文字列をエスケープせずに RegExp に渡しています。
export function matchesTitleFilter(title: string): boolean {
    const userPattern = process.argv[3];
    return new RegExp(userPattern).test(title);
}

// 検証用: ReDoS（js/redos, CWE-1333）
// ネストした量指定子により、バックトラッキングが指数関数的に増加します。
const TAG_LIST_PATTERN = /^(\s*\w+\s*,)+\s*\w+$/;

export function isTagList(value: string): boolean {
    return TAG_LIST_PATTERN.test(value);
}

// 検証用: 不完全なサニタイズ（js/incomplete-sanitization, CWE-20 / CWE-116）
// String#replace に文字列リテラルを渡しているため最初の 1 件しか置換されません。
export function escapeQuotes(value: string): string {
    return value.replace("'", "\\'");
}

// 検証用: 不完全なホスト名の正規表現（js/incomplete-hostname-regexp, CWE-20）
// `.` がエスケープされておらず、`tailspin-toysXcom` のようなホストにも一致します。
export function isTrustedHost(url: string): boolean {
    return /^https?:\/\/(www\.)?tailspin-toys.com\//.test(url);
}

// 検証用: 空の catch ブロック（no-empty）
export function safeReadExport(fileName: string): string | null {
    try {
        return fs.readFileSync(path.join(EXPORT_DIR, fileName), 'utf8');
    } catch (error) {
    }
    return null;
}
