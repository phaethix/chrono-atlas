#!/usr/bin/env node
/**
 * 时空图集 · 仓库自检
 *
 * 零依赖，只做几类真正会出错、且出错后不容易凭肉眼发现的事：
 *   1. 演示数据完整性（区域键、势力键、年份区间、经纬度范围）
 *   2. 演示元信息与目录名一致
 *   3. 站内相对链接可解析（HTML 与 Markdown 都查）
 *   4. 每个演示都齐备必要文件，且在画廊首页登记
 *
 * 用法：node scripts/check.mjs
 * 退出码非 0 表示检查未通过，CI 会因此失败。
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEMOS_DIR = path.join(ROOT, 'demos');

const REQUIRED_DEMO_FILES = ['index.html', 'data.js', 'app.js', 'style.css', 'README.md'];

const errors = [];
const warnings = [];
let checks = 0;

const fail = (where, msg) => errors.push(`${where}: ${msg}`);
const warn = (where, msg) => warnings.push(`${where}: ${msg}`);
const ok = () => {
  checks++;
};

/* ---------- 1. 载入演示数据 ---------- */

/**
 * data.js 是给浏览器用的经典脚本（顶层 const），
 * 这里用 vm 在隔离上下文里求值，再把需要的绑定取出来。
 */
function loadDemoData(dataFile) {
  const code = fs.readFileSync(dataFile, 'utf8');
  const probe = '({ META, S, REGIONS, RIVERS, INIT, EVENTS, BATTLES, ERAS, NOTES })';
  const context = vm.createContext({});
  return vm.runInContext(`${code}\n;${probe}`, context, {
    filename: dataFile,
    timeout: 5000,
  });
}

/* ---------- 2. 数据完整性 ---------- */

function validateDemo(demoName, dir) {
  const where = `demos/${demoName}`;

  for (const f of REQUIRED_DEMO_FILES) {
    if (!fs.existsSync(path.join(dir, f))) fail(where, `缺少必要文件 ${f}`);
  }

  const dataFile = path.join(dir, 'data.js');
  if (!fs.existsSync(dataFile)) return {};

  let data;
  try {
    data = loadDemoData(dataFile);
  } catch (e) {
    fail(where, `data.js 求值失败：${e.message}`);
    return {};
  }

  const { META, S, REGIONS, RIVERS, INIT, EVENTS, BATTLES, ERAS, NOTES } = data;

  if (!META || typeof META !== 'object') {
    fail(where, 'data.js 未导出 META');
    return {};
  }

  if (META.id !== demoName) {
    fail(where, `META.id (${META.id}) 与目录名不一致`);
  }
  for (const key of ['title', 'summary', 'from', 'to']) {
    if (META[key] === undefined || META[key] === '') fail(where, `META.${key} 缺失`);
  }
  if (typeof META.from !== 'number' || typeof META.to !== 'number') {
    fail(where, 'META.from / META.to 必须是数字（公元前用负数）');
    return {};
  }
  if (META.from >= META.to) {
    fail(where, `META.from (${META.from}) 应小于 META.to (${META.to})`);
  }
  ok();

  /* ------- 区域 ------- */
  const regionKeys = new Set();
  for (const r of REGIONS || []) {
    if (!r.k) {
      fail(where, '存在没有 k 的区域');
      continue;
    }
    if (regionKeys.has(r.k)) fail(where, `区域键重复：${r.k}`);
    regionKeys.add(r.k);
    if (!r.n) fail(where, `区域 ${r.k} 缺少名称 n`);

    if (!Array.isArray(r.p) || r.p.length < 3) {
      fail(where, `区域 ${r.k} 的顶点少于 3 个`);
      continue;
    }
    for (const [i, pt] of r.p.entries()) {
      if (!Array.isArray(pt) || pt.length !== 2) {
        fail(where, `区域 ${r.k} 第 ${i} 个顶点格式应为 [lon, lat]`);
        continue;
      }
      const [lon, lat] = pt;
      if (!Number.isFinite(lon) || !Number.isFinite(lat)) {
        fail(where, `区域 ${r.k} 第 ${i} 个顶点不是有限数字`);
      }
    }
    const first = r.p[0];
    const last = r.p[r.p.length - 1];
    if (first[0] === last[0] && first[1] === last[1]) {
      warn(where, `区域 ${r.k} 首尾顶点重复，多边形会自动闭合，无需手动重复`);
    }
  }
  if (!regionKeys.size) fail(where, 'REGIONS 为空');
  ok();

  /* ------- 势力 ------- */
  const powerKeys = new Set();
  for (const [k, v] of Object.entries(S || {})) {
    powerKeys.add(k);
    if (!v.n) fail(where, `势力 ${k} 缺少名称 n`);
    if (!/^#[0-9a-fA-F]{3,8}$/.test(v.c || '')) fail(where, `势力 ${k} 的配色不是合法色值：${v.c}`);
  }
  if (!powerKeys.size) fail(where, 'S 为空');
  ok();

  /* 势力的都城必须指向已存在的区域 */
  for (const [k, v] of Object.entries(S || {})) {
    if (v.cap && !regionKeys.has(v.cap)) {
      fail(where, `势力 ${k} 的 cap 指向不存在的区域：${v.cap}`);
    }
  }
  ok();

  /* ------- 初始归属 ------- */
  for (const [region, owner] of Object.entries(INIT || {})) {
    if (!regionKeys.has(region)) fail(where, `INIT 含不存在的区域：${region}`);
    if (!powerKeys.has(owner)) fail(where, `INIT 中 ${region} 的归属 ${owner} 不在势力表里`);
  }
  for (const region of regionKeys) {
    if (!(region in (INIT || {}))) fail(where, `区域 ${region} 没有初始归属`);
  }
  ok();

  /* ------- 年表 ------- */
  let prevYear = -Infinity;
  for (const [i, e] of (EVENTS || []).entries()) {
    const at = `EVENTS[${i}]`;
    if (typeof e.y !== 'number') {
      fail(where, `${at} 的 y 必须是数字`);
      continue;
    }
    if (e.y < META.from || e.y > META.to) {
      fail(where, `${at} 年份 ${e.y} 超出演示区间 ${META.from}..${META.to}`);
    }
    if (e.y < prevYear) fail(where, `${at} 年份 ${e.y} 小于前一条 ${prevYear}，年表须递增`);
    prevYear = e.y;
    if (!e.s) fail(where, `${at} 缺少描述 s`);

    for (const [region, owner] of Object.entries(e.ch || {})) {
      if (!regionKeys.has(region)) fail(where, `${at} (${e.y}) 变更了不存在的区域：${region}`);
      if (!powerKeys.has(owner)) {
        fail(where, `${at} (${e.y}) 把 ${region} 划给了不存在的势力：${owner}`);
      }
    }
  }
  if (!(EVENTS || []).length) fail(where, 'EVENTS 为空');
  ok();

  /* ------- 战役 ------- */
  for (const [i, b] of (BATTLES || []).entries()) {
    const at = `BATTLES[${i}]`;
    if (typeof b.y !== 'number') fail(where, `${at} 的 y 必须是数字`);
    if (b.y < META.from || b.y > META.to) {
      fail(where, `${at} 年份 ${b.y} 超出演示区间`);
    }
    if (!Number.isFinite(b.lon) || !Number.isFinite(b.lat)) {
      fail(where, `${at} 经纬度不合法`);
    }
    if (!b.n) fail(where, `${at} 缺少名称 n`);
  }
  ok();

  /* ------- 河流与阶段 ------- */
  for (const [i, r] of (RIVERS || []).entries()) {
    if (!Array.isArray(r) || r.length < 2) fail(where, `RIVERS[${i}] 至少要两个点`);
  }
  if (!(ERAS || []).length) fail(where, 'ERAS 为空');
  for (const [i, era] of (ERAS || []).entries()) {
    if (typeof era.from !== 'number' || typeof era.to !== 'number' || !era.name) {
      fail(where, `ERAS[${i}] 需要 from / to / name`);
    }
  }
  ok();

  /* ------- NOTES 的键应为年份且落在区间内 ------- */
  for (const key of Object.keys(NOTES || {})) {
    const year = Number(key);
    if (!Number.isFinite(year)) fail(where, `NOTES 的键 "${key}" 不是年份`);
    else if (year < META.from || year > META.to) {
      fail(where, `NOTES 的年份 ${year} 超出演示区间`);
    }
  }
  ok();

  /* ------- app.js 不应硬编码起止年份 ------- */
  const appFile = path.join(dir, 'app.js');
  if (fs.existsSync(appFile)) {
    const app = fs.readFileSync(appFile, 'utf8');
    if (!app.includes('META.from')) {
      fail(where, 'app.js 应从 META 读取起止年份，而不是硬编码');
    }
  }
  ok();

  return {
    regionCount: regionKeys.size,
    powerCount: powerKeys.size,
    eventCount: (EVENTS || []).length,
  };
}

/* ---------- 3. 站内链接 ---------- */

function collectFiles(dir, exts, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collectFiles(full, exts, acc);
    else if (exts.some((e) => entry.name.endsWith(e))) acc.push(full);
  }
  return acc;
}

/** 相对链接是否指向仓库内存在的文件。外部链接、锚点、邮件等一律跳过。 */
function isBrokenLink(raw, dir) {
  if (!raw) return false;
  if (/^(https?:)?\/\//i.test(raw)) return false;
  if (/^(mailto:|tel:|data:|javascript:|#)/i.test(raw)) return false;

  const cleaned = raw.split('#')[0].split('?')[0];
  if (!cleaned) return false;

  const target = cleaned.startsWith('/') ? path.join(ROOT, cleaned) : path.resolve(dir, cleaned);

  return !fs.existsSync(target);
}

function checkLinks() {
  const htmlFiles = collectFiles(ROOT, ['.html']);
  const mdFiles = collectFiles(ROOT, ['.md']);
  let linkCount = 0;

  for (const file of htmlFiles) {
    const rel = path.relative(ROOT, file);
    const html = fs.readFileSync(file, 'utf8');
    const dir = path.dirname(file);

    const re = /(?:href|src)\s*=\s*["']([^"']+)["']/gi;
    let m;
    while ((m = re.exec(html)) !== null) {
      const raw = m[1].trim();
      if (!raw) continue;
      linkCount++;
      if (isBrokenLink(raw, dir)) fail(rel, `引用了不存在的文件：${raw}`);
    }
  }

  // 文档里的相对链接同样要能点开，否则贡献者会照着失效路径找文件
  for (const file of mdFiles) {
    const rel = path.relative(ROOT, file);
    const md = fs.readFileSync(file, 'utf8');
    const dir = path.dirname(file);

    // 去掉代码块与行内代码，避免把示例当链接检查
    const withoutCode = md.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '');
    const re = /!?\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
    let m;
    while ((m = re.exec(withoutCode)) !== null) {
      const raw = m[1].trim();
      if (!raw) continue;
      linkCount++;
      if (isBrokenLink(raw, dir)) fail(rel, `引用了不存在的文件：${raw}`);
    }
  }

  ok();
  return { htmlFiles: htmlFiles.length, mdFiles: mdFiles.length, linkCount };
}

/* ---------- 4. README 语言约定 ---------- */

/**
 * 根 README 用英文，中文版放 docs。
 * 检查三件事：英文版不含中文、中文版存在、两份互相链接。
 */
function checkReadmes() {
  const enFile = path.join(ROOT, 'README.md');
  const zhFile = path.join(ROOT, 'docs', 'README.zh-CN.md');

  if (!fs.existsSync(enFile)) {
    fail('README.md', '缺少根 README');
    return;
  }

  const en = fs.readFileSync(enFile, 'utf8');

  const cjkLines = en
    .split('\n')
    .map((line, i) => ({ line, no: i + 1 }))
    .filter(({ line }) => /[\u4e00-\u9fff]/.test(line));

  if (cjkLines.length) {
    const first = cjkLines[0];
    fail('README.md', `根 README 应为英文，第 ${first.no} 行含中文：${first.line.trim().slice(0, 40)}`);
  }

  if (!/^# .+/m.test(en)) {
    fail('README.md', '缺少一级标题');
  }

  if (!fs.existsSync(zhFile)) {
    fail('docs/README.zh-CN.md', '缺少中文版 README');
    return;
  }

  const zh = fs.readFileSync(zhFile, 'utf8');

  if (!/[\u4e00-\u9fff]/.test(zh)) {
    fail('docs/README.zh-CN.md', '中文版 README 未检测到中文内容');
  }

  if (!/^# .+/m.test(zh)) {
    fail('docs/README.zh-CN.md', '缺少一级标题');
  }

  // 两份文档各自都应该有通往对方的链接，读者不必猜路径。
  // 注意不能用 includes('README.md') 判断：目录树里本来就有演示级的 README.md，
  // 那样写会永远通过。必须校验 Markdown 链接本身。
  const zhLinksToEn = /\]\(\.{0,2}\/?README\.md\)/.test(zh);
  if (!zhLinksToEn) {
    fail('docs/README.zh-CN.md', '未以链接形式指向根 README');
  }

  const enLinksToZh = /\]\((\.\/)?docs\/README\.zh-CN\.md\)/.test(en);
  if (!enLinksToZh) {
    fail('README.md', '未以链接形式指向 docs/README.zh-CN.md');
  }

  ok();
  return { cjkLines: cjkLines.length };
}

/* ---------- 5. 演示索引一致性 ---------- */

function checkGallery(demoDirs) {
  const indexFile = path.join(ROOT, 'index.html');
  if (!fs.existsSync(indexFile)) {
    fail('index.html', '缺少画廊首页');
    return;
  }
  const index = fs.readFileSync(indexFile, 'utf8');

  for (const name of demoDirs) {
    if (!index.includes(`demos/${name}/index.html`)) {
      fail('index.html', `演示 ${name} 未在画廊首页登记`);
    }
  }
  ok();
}

/* ---------- 主流程 ---------- */

function main() {
  const summaries = [];

  if (!fs.existsSync(DEMOS_DIR)) {
    fail('demos', '缺少 demos 目录');
  }

  const demoDirs = fs.existsSync(DEMOS_DIR)
    ? fs
        .readdirSync(DEMOS_DIR, { withFileTypes: true })
        .filter((e) => e.isDirectory())
        .map((e) => e.name)
        .sort()
    : [];

  for (const name of demoDirs) {
    summaries.push({ name, ...validateDemo(name, path.join(DEMOS_DIR, name)) });
  }

  checkGallery(demoDirs);
  const readmes = checkReadmes();
  const links = checkLinks();

  console.log('时空图集 · 仓库自检\n');

  for (const s of summaries) {
    const detail = s.regionCount
      ? `  区域 ${s.regionCount} · 势力 ${s.powerCount} · 事件 ${s.eventCount}`
      : '  （数据未通过校验）';
    console.log(`  演示 ${s.name}${detail}`);
  }

  const readmeNote = readmes && readmes.cjkLines === 0 ? 'README 英文 / 中文版在 docs' : 'README 语言未通过';

  console.log(
    `  页面 ${links.htmlFiles} · 文档 ${links.mdFiles} · 站内链接 ${links.linkCount} · 校验项 ${checks}`,
  );
  console.log(`  ${readmeNote}\n`);
  if (warnings.length) {
    console.log(`提示（${warnings.length}）：`);
    for (const w of warnings) console.log(`  ! ${w}`);
    console.log('');
  }

  if (errors.length) {
    console.log(`未通过（${errors.length}）：`);
    for (const e of errors) console.log(`  x ${e}`);
    console.log('');
    process.exit(1);
  }

  console.log('全部通过。');
}

main();
