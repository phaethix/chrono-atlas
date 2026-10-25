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

/**
 * 枚举值集中在这里。写错一个 t，动画会静默不触发；写错 src，
 * 传说就会被当成考古读。这类错误肉眼极难发现，只能靠脚本拦。
 */
const EVENT_TYPES = ['normal', 'shift', 'merge', 'era'];
const SOURCE_TYPES = ['arch', 'legend', 'text'];
const SITE_KINDS = ['battle', 'site'];

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

  /* rate：播放速率。跨度大的题材必须单独给，否则一趟播放要半小时 */
  if (META.rate !== undefined) {
    if (typeof META.rate !== 'number' || !Number.isFinite(META.rate) || META.rate <= 0) {
      fail(where, `META.rate 应为正数，当前为 ${META.rate}`);
    } else {
      const seconds = (META.to - META.from) / META.rate;
      if (seconds > 600) {
        warn(where, `按 META.rate 播完全程需 ${Math.round(seconds)} 秒，考虑调大速率`);
      }
    }
  }

  /* ticks：时间轴刻度。必须落在区间内、递增、有显示文本 */
  if (META.ticks !== undefined) {
    if (!Array.isArray(META.ticks) || !META.ticks.length) {
      fail(where, 'META.ticks 应为非空数组');
    } else {
      let prevTick = -Infinity;
      for (const [i, tick] of META.ticks.entries()) {
        if (typeof tick.y !== 'number') {
          fail(where, `META.ticks[${i}] 的 y 必须是数字`);
          continue;
        }
        if (tick.y < META.from || tick.y > META.to) {
          fail(where, `META.ticks[${i}] 年份 ${tick.y} 超出演示区间`);
        }
        if (tick.y < prevTick) fail(where, `META.ticks[${i}] 未按年份递增`);
        prevTick = tick.y;
        if (!tick.t) fail(where, `META.ticks[${i}] 缺少显示文本 t`);
      }
    }
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

    if (e.t !== undefined && !EVENT_TYPES.includes(e.t)) {
      fail(where, `${at} 的事件类型 t='${e.t}' 不在 ${EVENT_TYPES.join(' / ')} 之内`);
    }
    if (e.src !== undefined && !SOURCE_TYPES.includes(e.src)) {
      fail(where, `${at} 的证据性质 src='${e.src}' 不在 ${SOURCE_TYPES.join(' / ')} 之内`);
    }
    if (e.ch && (!e.t || e.t === 'normal')) {
      // 带归属变更却写成 normal：地图照样变色，但时间轴不记刻度、播放也不停顿
      warn(where, `${at} (${e.y}) 带 ch 却标为 normal，时间轴不会标出这次变更`);
    }

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
    if (b.kind !== undefined && !SITE_KINDS.includes(b.kind)) {
      fail(where, `${at} 的 kind='${b.kind}' 不在 ${SITE_KINDS.join(' / ')} 之内`);
    }
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

  /* 阶段必须首尾对齐、中间不留缝也不重叠，否则侧栏的时期标签会找不到归属 */
  if ((ERAS || []).length) {
    const eras = [...ERAS].sort((a, b) => a.from - b.from);
    if (eras[0].from !== META.from) {
      fail(where, `ERAS 首段从 ${eras[0].from} 开始，应为 META.from (${META.from})`);
    }
    if (eras[eras.length - 1].to !== META.to) {
      fail(where, `ERAS 末段到 ${eras[eras.length - 1].to} 为止，应为 META.to (${META.to})`);
    }
    for (let i = 1; i < eras.length; i++) {
      if (eras[i].from !== eras[i - 1].to) {
        fail(
          where,
          `ERAS 第 ${i} 段从 ${eras[i].from} 开始，与前一段的结尾 ${eras[i - 1].to} 不衔接`,
        );
      }
    }
    for (const [i, era] of eras.entries()) {
      if (era.from >= era.to) fail(where, `ERAS[${i}] 的 from 应小于 to`);
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

  /** srcset 里是一串带尺寸描述符的候选地址，需要拆开逐个检查 */
  const expandSrcset = (value) =>
    value
      .split(',')
      .map((part) => part.trim().split(/\s+/)[0])
      .filter(Boolean);

  /**
   * 检查一段文本里所有会触发资源加载的属性。
   * README 用内联 HTML 放 picture/source，这类引用不走 Markdown 图片语法，
   * 只查 ![]() 会漏掉，最终断链也无人发现。
   */
  const checkMarkup = (text, rel, dir) => {
    const attrRe = /\b(?:href|src)\s*=\s*["']([^"']+)["']/gi;
    let m;
    while ((m = attrRe.exec(text)) !== null) {
      const raw = m[1].trim();
      if (!raw) continue;
      linkCount++;
      if (isBrokenLink(raw, dir)) fail(rel, `引用了不存在的文件：${raw}`);
    }

    const srcsetRe = /\bsrcset\s*=\s*["']([^"']+)["']/gi;
    while ((m = srcsetRe.exec(text)) !== null) {
      for (const raw of expandSrcset(m[1])) {
        linkCount++;
        if (isBrokenLink(raw, dir)) fail(rel, `引用了不存在的文件：${raw}`);
      }
    }
  };

  for (const file of htmlFiles) {
    const rel = path.relative(ROOT, file);
    const html = fs.readFileSync(file, 'utf8');
    checkMarkup(html, rel, path.dirname(file));
  }

  // 文档里的相对链接同样要能点开，否则贡献者会照着失效路径找文件
  for (const file of mdFiles) {
    const rel = path.relative(ROOT, file);
    const md = fs.readFileSync(file, 'utf8');
    const dir = path.dirname(file);

    // 去掉代码块与行内代码，避免把示例当链接检查
    const withoutCode = md.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '');

    // Markdown 链接与图片
    const re = /!?\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
    let m;
    while ((m = re.exec(withoutCode)) !== null) {
      const raw = m[1].trim();
      if (!raw) continue;
      linkCount++;
      if (isBrokenLink(raw, dir)) fail(rel, `引用了不存在的文件：${raw}`);
    }

    // README 中的内联 HTML，例如 <picture><source srcset="...">
    checkMarkup(withoutCode, rel, dir);
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
    fail(
      'README.md',
      `根 README 应为英文，第 ${first.no} 行含中文：${first.line.trim().slice(0, 40)}`,
    );
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

/* ---------- 6. 语料层 ---------- */

const CORPUS_DIR = path.join(ROOT, 'corpus');
const CATALOG_FILE = path.join(ROOT, 'catalog', 'manifest.js');

/**
 * 语料是普通脚本，靠往 globalThis.CORPUS 上注册来工作。
 * 这里按 core → schema → 分片的顺序在同一个 vm 上下文里跑一遍，
 * 拿到完整的实体表与关系表。
 */
function loadCorpus() {
  const ctx = vm.createContext({});
  const run = (file) => {
    vm.runInContext(fs.readFileSync(file, 'utf8'), ctx, { filename: file, timeout: 5000 });
  };

  run(path.join(CORPUS_DIR, 'core.js'));
  const schemaFile = path.join(CORPUS_DIR, 'schema.js');
  vm.runInContext(`${fs.readFileSync(schemaFile, 'utf8')}\n;globalThis.SCHEMA = SCHEMA;`, ctx, {
    filename: schemaFile,
  });

  const shards = collectFiles(CORPUS_DIR, ['.js'])
    .filter((f) => !f.endsWith(`${path.sep}core.js`) && !f.endsWith(`${path.sep}schema.js`))
    .sort();
  for (const file of shards) run(file);

  return { corpus: ctx.CORPUS, schema: ctx.SCHEMA, shards: shards.length };
}

/** 亲子关系不允许成环。族谱里出现环，说明父子录反了。 */
function findKinshipCycle(edges) {
  const out = new Map();
  for (const e of edges) {
    if (!out.has(e.from)) out.set(e.from, []);
    out.get(e.from).push(e.to);
  }
  const state = new Map(); // 1 访问中，2 已完成
  const walk = (node, trail) => {
    if (state.get(node) === 1) return [...trail, node];
    if (state.get(node) === 2) return null;
    state.set(node, 1);
    for (const next of out.get(node) || []) {
      const hit = walk(next, [...trail, node]);
      if (hit) return hit;
    }
    state.set(node, 2);
    return null;
  };
  for (const node of out.keys()) {
    const hit = walk(node, []);
    if (hit) return hit;
  }
  return null;
}

function checkCorpus() {
  if (!fs.existsSync(CORPUS_DIR)) {
    fail('corpus', '缺少语料目录');
    return {};
  }

  let loaded;
  try {
    loaded = loadCorpus();
  } catch (e) {
    fail('corpus', `分片求值失败：${e.message}`);
    return {};
  }

  const { corpus, schema, shards } = loaded;
  if (!corpus || !schema) {
    fail('corpus', '未拿到 CORPUS 或 SCHEMA');
    return {};
  }

  const byKind = {
    person: corpus.people,
    polity: corpus.polities,
    place: corpus.places,
    text: corpus.texts,
  };
  const kindOf = new Map();

  for (const [kind, table] of Object.entries(byKind)) {
    for (const [id, entity] of Object.entries(table || {})) {
      const at = `corpus/${kind}/${id}`;
      if (!new RegExp(`^${kind}-[a-z0-9-]+$`).test(id)) {
        fail('corpus', `${at}: id 应形如 ${kind}-<小写拉丁 slug>`);
      }
      if (kindOf.has(id)) {
        fail('corpus', `${at}: id 与 ${kindOf.get(id)} 里的实体重复`);
      }
      kindOf.set(id, kind);

      const spec = schema.entities[kind];
      for (const field of spec.required) {
        if (!entity[field]) fail(at, `缺少必填字段 ${field}`);
      }
      if (entity.alias !== undefined && !Array.isArray(entity.alias)) {
        fail(at, 'alias 应为数组');
      }
      for (const field of ['from', 'to']) {
        if (entity[field] !== undefined && entity[field] !== null) {
          if (typeof entity[field] !== 'number' || !Number.isFinite(entity[field])) {
            fail(at, `${field} 应为年份数字（公元前用负数），未知就写 null`);
          }
        }
      }
      if (
        typeof entity.from === 'number' &&
        typeof entity.to === 'number' &&
        entity.from > entity.to
      ) {
        fail(at, `生年 ${entity.from} 晚于卒年 ${entity.to}`);
      }
      if (entity.src !== undefined && !schema.src.includes(entity.src)) {
        fail(at, `src='${entity.src}' 不在 ${schema.src.join(' / ')} 之内`);
      }
    }
  }

  const relations = Array.isArray(corpus.relations) ? corpus.relations : [];
  const seenEdge = new Set();
  for (const [i, e] of relations.entries()) {
    const at = `corpus/relations[${i}]`;
    const spec = schema.relations[e.kind];
    if (!spec) {
      fail(at, `未知关系类型 kind='${e.kind}'`);
      continue;
    }
    for (const end of ['from', 'to']) {
      if (!e[end]) {
        fail(at, `缺少 ${end}`);
        continue;
      }
      const kind = kindOf.get(e[end]);
      if (!kind) {
        fail(at, `${end} 指向不存在的实体：${e[end]}`);
      } else if (!spec[end].includes(kind)) {
        fail(at, `${e.kind} 的 ${end} 应为 ${spec[end].join(' / ')}，实际是 ${kind}`);
      }
    }
    if (e.role !== undefined && spec.roles && spec.roles.length && !spec.roles.includes(e.role)) {
      fail(at, `${e.kind} 的 role='${e.role}' 不在 ${spec.roles.join(' / ')} 之内`);
    }
    if (e.src !== undefined && !schema.src.includes(e.src)) {
      fail(at, `src='${e.src}' 不在 ${schema.src.join(' / ')} 之内`);
    }
    const key = `${e.from}|${e.to}|${e.kind}|${e.role || ''}`;
    if (seenEdge.has(key)) fail(at, `重复的关系边 ${key}`);
    seenEdge.add(key);
  }

  const cycle = findKinshipCycle(relations.filter((e) => e.kind === 'parent'));
  if (cycle) fail('corpus', `亲子关系成环：${cycle.join(' → ')}`);

  ok();
  return {
    people: Object.keys(corpus.people || {}).length,
    relations: relations.length,
    shards,
  };
}

/* ---------- 7. 全书卷目 ---------- */

function checkCatalog(demoDirs) {
  if (!fs.existsSync(CATALOG_FILE)) {
    fail('catalog', '缺少 catalog/manifest.js');
    return {};
  }

  let volumes;
  try {
    const ctx = vm.createContext({});
    vm.runInContext(`${fs.readFileSync(CATALOG_FILE, 'utf8')}\n;globalThis.__V = VOLUMES;`, ctx, {
      filename: CATALOG_FILE,
    });
    volumes = ctx.__V;
  } catch (e) {
    fail('catalog', `manifest 求值失败：${e.message}`);
    return {};
  }

  if (!Array.isArray(volumes) || !volumes.length) {
    fail('catalog', 'VOLUMES 为空');
    return {};
  }
  if (volumes.length !== 24) {
    fail('catalog', `应为 24 卷，当前 ${volumes.length} 卷`);
  }

  const STATUS = ['planned', 'partial', 'done'];
  const usedViews = new Set();

  for (const [i, v] of volumes.entries()) {
    const at = `catalog/卷 ${v.no}`;
    if (v.no !== i + 1) fail(at, `卷次应为 ${i + 1}，实际 ${v.no}`);
    if (!v.title) fail(at, '缺少书名');
    if (!v.period) fail(at, '缺少分期');
    if (!STATUS.includes(v.status))
      fail(at, `status='${v.status}' 不在 ${STATUS.join(' / ')} 之内`);
    if (v.id && !demoDirs.includes(v.id)) fail(at, `id='${v.id}' 不是 demos/ 下的目录`);
    if (!Array.isArray(v.views)) {
      fail(at, 'views 应为数组');
    } else {
      for (const view of v.views) {
        if (!demoDirs.includes(view)) fail(at, `views 指向不存在的演示：${view}`);
        usedViews.add(view);
      }
    }
    if (!Array.isArray(v.chapters) || !v.chapters.length) {
      fail(at, 'chapters 应为非空数组');
    }
  }

  for (const demo of demoDirs) {
    if (!usedViews.has(demo)) fail('catalog', `演示 ${demo} 没有登记到任何一卷`);
  }

  ok();
  return {
    total: volumes.length,
    done: volumes.filter((v) => v.status === 'done').length,
    partial: volumes.filter((v) => v.status === 'partial').length,
    chapters: volumes.reduce((n, v) => n + (v.chapters || []).length, 0),
  };
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
  const catalog = checkCatalog(demoDirs);
  const corpus = checkCorpus();
  const readmes = checkReadmes();
  const links = checkLinks();

  console.log('时空图集 · 仓库自检\n');

  for (const s of summaries) {
    const detail = s.regionCount
      ? `  区域 ${s.regionCount} · 势力 ${s.powerCount} · 事件 ${s.eventCount}`
      : '  （数据未通过校验）';
    console.log(`  演示 ${s.name}${detail}`);
  }

  if (catalog.total) {
    console.log(
      `  卷目 ${catalog.total} · 已成视图 ${catalog.done} · 部分录入 ${catalog.partial} · 章目 ${catalog.chapters}`,
    );
  }
  if (corpus.people !== undefined) {
    console.log(`  语料 人物 ${corpus.people} · 关系 ${corpus.relations} · 分片 ${corpus.shards}`);
  }

  const readmeNote =
    readmes && readmes.cjkLines === 0 ? 'README 英文 / 中文版在 docs' : 'README 语言未通过';

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
