#!/usr/bin/env node
/**
 * 时空图集 · 提交信息检查
 *
 * 两种用法：
 *   1. node scripts/check-commits.mjs <file>     检查单个提交信息文件（供 commit-msg 钩子调用）
 *   2. node scripts/check-commits.mjs <range>    检查一段提交区间，例如 origin/main..HEAD
 *
 * 检查项：
 *   - 提交信息必须是英文（不允许出现中日韩字符）
 *   - 遵循 Conventional Commits，且类型在允许列表内
 *   - 标题不超过 72 字符、不以句号结尾
 *   - 正文与标题之间空一行，正文每行不超过 100 字符（超长链接除外）
 *
 * 合并提交跳过检查。
 * 退出码非 0 表示检查未通过。
 */
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const TYPES = [
  'feat',
  'fix',
  'docs',
  'style',
  'refactor',
  'perf',
  'test',
  'build',
  'ci',
  'chore',
  'revert',
];

const HEADER = new RegExp(`^(${TYPES.join('|')})(\\([a-z0-9-]+\\))?!?: .+$`);
const CJK = /[\u2E80-\u9FFF\uAC00-\uD7AF\u3040-\u30FF\uFF00-\uFFEF]/;

const MAX_HEADER = 72;
const MAX_BODY_LINE = 100;

const problems = [];

function checkMessage(label, raw) {
  const text = raw.replace(/\r\n/g, '\n').trim();
  if (!text) {
    problems.push(`${label}: 提交信息为空`);
    return;
  }

  if (/^(Merge |Revert "Merge )/.test(text)) return;

  const lines = text.split('\n');
  const header = lines[0];

  if (CJK.test(text)) {
    problems.push(`${label}: 提交信息必须是英文，发现中日韩字符`);
  }

  if (!HEADER.test(header)) {
    problems.push(`${label}: 标题不符合 Conventional Commits，应形如 "feat(scope): 说明"`);
  }

  if (header.length > MAX_HEADER) {
    problems.push(`${label}: 标题 ${header.length} 字符，超过 ${MAX_HEADER}，细节请放进正文`);
  }

  if (/\.$/.test(header)) {
    problems.push(`${label}: 标题不要以句号结尾`);
  }

  if (lines.length > 1) {
    if (lines[1].trim() !== '') {
      problems.push(`${label}: 标题与正文之间需要空一行`);
    }

    lines.slice(2).forEach((line, i) => {
      const withoutUrl = line.replace(/https?:\/\/\S+/g, '');
      if (withoutUrl.length > MAX_BODY_LINE) {
        problems.push(
          `${label}: 正文第 ${i + 1} 行 ${withoutUrl.length} 字符，超过 ${MAX_BODY_LINE}`,
        );
      }
    });
  }
}

function readRange(range) {
  let out;
  try {
    out = execFileSync('git', ['log', range, '--no-merges', '--format=%H%x1f%B%x1e'], {
      cwd: ROOT,
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024,
    });
  } catch {
    // 区间不可用（例如首次推送时 before 为全零）时改为检查最近一次提交
    out = execFileSync('git', ['log', '-1', '--format=%H%x1f%B%x1e'], {
      cwd: ROOT,
      encoding: 'utf8',
    });
  }

  const records = out
    .split('\x1e')
    .map((s) => s.trim())
    .filter(Boolean);

  for (const record of records) {
    const at = record.indexOf('\x1f');
    if (at === -1) continue;
    checkMessage(record.slice(0, at).slice(0, 7), record.slice(at + 1));
  }
  return records.length;
}

function main() {
  const arg = process.argv[2];

  if (!arg) {
    console.log('用法：node scripts/check-commits.mjs <commit-msg 文件 | 提交区间>');
    process.exit(2);
  }

  const asFile = path.resolve(arg);
  let count;

  if (fs.existsSync(asFile) && fs.statSync(asFile).isFile()) {
    checkMessage(path.basename(asFile), fs.readFileSync(asFile, 'utf8'));
    count = 1;
  } else {
    count = readRange(arg);
  }

  if (problems.length) {
    console.log(`提交信息未通过（${problems.length}）：`);
    for (const p of problems) console.log(`  x ${p}`);
    console.log('');
    console.log('规范见 CONTRIBUTING.md 的「提交信息」一节。');
    process.exit(1);
  }

  console.log(`提交信息检查通过（${count} 个）。`);
}

main();
