/*!
 * 人物与阶段 · 渲染层
 *
 * 六个阶段排成六列，人物按本书的编排入列，关系横着连。
 * 没有族谱：本书说五帝之间没有血缘，图上就不该出现一棵树。
 * 被否定的旧说（女娲伏羲为夫妻、炎黄为兄弟）画成红色点线，标一个叉。
 */
'use strict';

const NS = 'http://www.w3.org/2000/svg';
const $ = (id) => document.getElementById(id);

const COL_W = 150;
const X0 = 55;
const BOX_W = 104;
const BOX_H = 40;
const GAP = 58;

const PEOPLE = CORPUS.people;
const RELS = CORPUS.relations;

/* 列内顺序：先继位链，再旁支 */
const ORDER = [
  'person-xiawa',
  'person-nuwa',
  'person-fuxi',
  'person-yandi',
  'person-huangdi',
  'person-chiyou',
  'person-zhuanxu',
  'person-diku',
  'person-yao',
  'person-shun',
  'person-yu',
  'person-gun',
  'person-xie',
  'person-ji',
  'person-qi',
];

const stageIndex = {};
STAGES.forEach((s, i) => (stageIndex[s.key] = i));

const columns = STAGES.map(() => []);
for (const id of ORDER) {
  const key = PLACEMENT[id];
  if (key && PEOPLE[id]) columns[stageIndex[key]].push(id);
}

const pos = {};
columns.forEach((ids, ci) => {
  const n = ids.length;
  const startY = 380 - ((n - 1) * GAP) / 2;
  ids.forEach((id, i) => {
    pos[id] = { x: X0 + COL_W * ci + COL_W / 2, y: startY + i * GAP };
  });
});

/* ---------- 画布 ---------- */
const gCols = $('cols');
const gEdges = $('edges');
const gNodes = $('nodes');

function el(name, attrs) {
  const node = document.createElementNS(NS, name);
  for (const k in attrs) node.setAttribute(k, attrs[k]);
  return node;
}

/* 阶段列 */
STAGES.forEach((stage, i) => {
  const x = X0 + COL_W * i;
  gCols.appendChild(
    el('rect', { x: x + 6, y: 66, width: COL_W - 12, height: 578, rx: 12, class: 'col' }),
  );
  const shape = el('text', { x: x + COL_W / 2, y: 98, class: 'shape' });
  shape.textContent = stage.shape;
  gCols.appendChild(shape);
  const name = el('text', { x: x + COL_W / 2, y: 120, class: 'cname' });
  name.textContent = stage.name;
  gCols.appendChild(name);
});

/* 关系 */
const edgeEls = [];

for (const e of RELS) {
  const a = pos[e.from];
  const b = pos[e.to];
  if (!a || !b) continue;

  const cls = ['edge'];
  if (e.kind === 'succession') cls.push('succ');
  else if (e.kind === 'parent') cls.push('kin');
  else if (e.kind === 'ruler') cls.push('ruler');
  else cls.push('war');
  if (e.claim === 'rejected') cls.push('reject');

  let d;
  if (Math.abs(a.x - b.x) < 1) {
    // 同列：绕到右边再回来
    const side = a.x + BOX_W / 2 + 34;
    const dir = b.y > a.y ? 1 : -1;
    d = `M${a.x},${a.y + (dir * BOX_H) / 2} C${side},${a.y + (dir * BOX_H) / 2} ${side},${
      b.y - (dir * BOX_H) / 2
    } ${b.x},${b.y - (dir * BOX_H) / 2}`;
  } else {
    const sign = b.x > a.x ? 1 : -1;
    const x1 = a.x + (sign * BOX_W) / 2;
    const x2 = b.x - (sign * BOX_W) / 2;
    const mid = (x1 + x2) / 2;
    d = `M${x1},${a.y} C${mid},${a.y} ${mid},${b.y} ${x2},${b.y}`;
  }

  const path = el('path', { d, class: cls.join(' '), 'data-from': e.from, 'data-to': e.to });
  if (e.kind === 'succession' && e.claim === 'book') path.setAttribute('marker-end', 'url(#arrow)');
  gEdges.appendChild(path);

  if (e.claim === 'rejected') {
    const len = path.getTotalLength();
    const mid = path.getPointAtLength(len / 2);
    const tag = el('text', { x: mid.x, y: mid.y - 6, class: 'reject-tag' });
    tag.textContent = '不取';
    gEdges.appendChild(tag);
  }

  edgeEls.push(path);
}

/* 人物 */
const nodeEls = {};
for (const id of ORDER) {
  const p = PEOPLE[id];
  const at = pos[id];
  if (!p || !at) continue;
  const g = el('g', { class: 'node', 'data-id': id, 'data-stage': PLACEMENT[id] });
  g.appendChild(
    el('rect', {
      x: at.x - BOX_W / 2,
      y: at.y - BOX_H / 2,
      width: BOX_W,
      height: BOX_H,
      rx: 9,
      class: 'box',
    }),
  );
  const name = el('text', { x: at.x, y: at.y + 5, class: 'name' });
  name.textContent = p.n;
  g.appendChild(name);
  // 被本书明确否定的旧说，在人物框右上角留一个小叉
  if (RELS.some((e) => e.claim === 'rejected' && (e.from === id || e.to === id))) {
    const flag = el('text', { x: at.x + BOX_W / 2 - 8, y: at.y - BOX_H / 2 + 13, class: 'flag' });
    flag.textContent = '×';
    g.appendChild(flag);
  }
  gNodes.appendChild(g);
  nodeEls[id] = g;
}

/* ---------- 交互 ---------- */
let stepIndex = -1;
let hoverId = null;
let pinnedId = null;

function neighbors(id) {
  const set = new Set([id]);
  for (const e of RELS) {
    if (e.from === id) set.add(e.to);
    if (e.to === id) set.add(e.from);
  }
  return set;
}

function currentId() {
  if (hoverId) return hoverId;
  if (pinnedId) return pinnedId;
  if (stepIndex >= 0 && STEPS[stepIndex]) return STEPS[stepIndex].focus;
  return null;
}

function applyFocus() {
  const id = currentId();
  const set = id ? neighbors(id) : null;
  const stepFocus = stepIndex >= 0 && STEPS[stepIndex] ? STEPS[stepIndex].focus : null;
  const stage = stepFocus ? PLACEMENT[stepFocus] : null;

  for (const key in nodeEls) {
    const g = nodeEls[key];
    const on = !set || set.has(key);
    g.classList.toggle('dim', !on);
    g.classList.toggle('on', key === stepFocus);
    g.classList.toggle('hover', key === hoverId && key !== stepFocus);
  }

  for (const edge of edgeEls) {
    const a = edge.dataset.from;
    const b = edge.dataset.to;
    const on = set ? set.has(a) || set.has(b) : true;
    edge.classList.toggle('dim', !on);
    edge.classList.toggle('on', !!set && (a === id || b === id));
  }

  const rects = gCols.querySelectorAll('.col');
  for (const rect of rects) rect.classList.remove('lit');
  if (stage && rects[stageIndex[stage]]) rects[stageIndex[stage]].classList.add('lit');
}

function renderPanel(id) {
  const p = PEOPLE[id];
  if (!p) return;
  $('personName').textContent = p.n;
  $('personAlias').textContent = (p.alias || []).join(' · ');
  $('personRole').textContent = p.role || '';
  $('personNote').textContent = p.note || '';

  const stage = STAGES[stageIndex[PLACEMENT[id]]];
  const links = RELS.filter((e) => e.from === id || e.to === id).map((e) => {
    const other = e.from === id ? e.to : e.from;
    const name = PEOPLE[other] ? PEOPLE[other].n : other;
    const mark = e.claim === 'rejected' ? '（书不取）' : '';
    const verb = {
      succession: e.role === 'stage' ? '接续' : '继位',
      parent: '血缘',
      ruler: '君臣',
      spouse: '婚姻',
      sibling: '兄弟',
      killed: '杀',
      rival: '敌对',
    }[e.kind] || e.kind;
    return [verb, `${e.from === id ? '→ ' : '← '}${name}${mark}`];
  });

  const facts = [['阶段', stage ? `${stage.name}（${stage.shape}）` : '—'], ...links];
  $('personFacts').innerHTML = facts
    .map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`)
    .join('');
}

function renderSteps() {
  $('stepList').innerHTML = STEPS.map((s, i) => {
    const p = PEOPLE[s.focus];
    const stage = STAGES[stageIndex[PLACEMENT[s.focus]]];
    return `<li data-i="${i}" class="${i === stepIndex ? 'on' : ''}">
      <span class="no">${i + 1}</span>
      <span class="who">${p.n}</span>
      <span class="gen">${stage ? stage.shape : ''}</span>
    </li>`;
  }).join('');
  $('stepText').textContent = stepIndex >= 0 ? STEPS[stepIndex].text : '按「播放」，从点到国走一遍。';
}

function goStep(i) {
  stepIndex = Math.max(0, Math.min(STEPS.length - 1, i));
  hoverId = null;
  pinnedId = null;
  renderPanel(STEPS[stepIndex].focus);
  renderSteps();
  applyFocus();
}

/* 播放 */
let timer = null;
function stop() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  $('btnPlay').textContent = '播放';
}

$('btnPlay').addEventListener('click', () => {
  if (timer) {
    stop();
    return;
  }
  $('btnPlay').textContent = '暂停';
  if (stepIndex >= STEPS.length - 1) stepIndex = -1;
  goStep(stepIndex + 1);
  timer = setInterval(() => {
    if (stepIndex >= STEPS.length - 1) {
      stop();
      return;
    }
    goStep(stepIndex + 1);
  }, 2400);
});
$('btnPrev').addEventListener('click', () => {
  stop();
  goStep(stepIndex - 1);
});
$('btnNext').addEventListener('click', () => {
  stop();
  goStep(stepIndex + 1);
});
$('btnReset').addEventListener('click', () => {
  stop();
  stepIndex = -1;
  hoverId = null;
  pinnedId = null;
  renderSteps();
  renderPanel(STEPS[0].focus);
  applyFocus();
});

$('stepList').addEventListener('click', (e) => {
  const li = e.target.closest('li[data-i]');
  if (!li) return;
  stop();
  goStep(Number(li.dataset.i));
});

gNodes.addEventListener('mouseover', (e) => {
  const g = e.target.closest('.node');
  if (!g) return;
  hoverId = g.dataset.id;
  applyFocus();
});
gNodes.addEventListener('mouseout', (e) => {
  if (!e.target.closest('.node')) return;
  hoverId = null;
  applyFocus();
});
gNodes.addEventListener('click', (e) => {
  const g = e.target.closest('.node');
  if (!g) return;
  pinnedId = pinnedId === g.dataset.id ? null : g.dataset.id;
  hoverId = null;
  if (pinnedId) renderPanel(pinnedId);
  applyFocus();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight') {
    e.preventDefault();
    stop();
    goStep(stepIndex + 1);
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault();
    stop();
    goStep(stepIndex - 1);
  } else if (e.code === 'Space') {
    e.preventDefault();
    $('btnPlay').click();
  }
});

/* 初始化 */
renderSteps();
renderPanel(STEPS[0].focus);
applyFocus();
const hashStep = Number((location.hash || '').replace('#', ''));
if (hashStep >= 1 && hashStep <= STEPS.length) goStep(hashStep - 1);
