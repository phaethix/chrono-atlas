/*!
 * 五帝世系 · 渲染层
 *
 * 人物与关系全部来自 corpus/，这里只有布局与画法：
 *   1. 代数 = 从根出发沿父系的最长路径
 *   2. 每一支按子树宽度占位，父辈落在子辈的中点
 *   3. 血缘画实线，继位画虚线箭头，敌对画红线
 *
 * 两条线对不上的地方（尧与舜差四代、禹又跳回第三代），就是这一页要说的。
 */
'use strict';

const NS = 'http://www.w3.org/2000/svg';
const $ = (id) => document.getElementById(id);

const W = 1000;
const H = 720;
const TOP = 84;
const ROW = 62;
const SLOT = 108;
const BOX_W = 88;
const BOX_H = 40;

const PEOPLE = CORPUS.people;

/* ---------- 关系索引 ---------- */
const fatherOf = {};
const childrenOf = {};
const spousesOf = {};
const heirOf = {};
const prevOf = {};
const warEdges = [];

for (const e of CORPUS.relations) {
  if (e.kind === 'parent' && e.role === 'father') {
    fatherOf[e.to] = e.from;
    (childrenOf[e.from] = childrenOf[e.from] || []).push(e.to);
  } else if (e.kind === 'spouse') {
    (spousesOf[e.from] = spousesOf[e.from] || []).push(e.to);
    (spousesOf[e.to] = spousesOf[e.to] || []).push(e.from);
  } else if (e.kind === 'succession') {
    heirOf[e.from] = e.to;
    prevOf[e.to] = e.from;
  } else if (e.kind === 'rival' || e.kind === 'killed') {
    warEdges.push(e);
  }
}

/* ---------- 代数 ---------- */
const gen = {};
function depthOf(id) {
  if (gen[id] !== undefined) return gen[id];
  const f = fatherOf[id];
  gen[id] = f ? depthOf(f) + 1 : 0;
  return gen[id];
}
for (const id in PEOPLE) depthOf(id);
const maxGen = Math.max(...Object.values(gen));

/* ---------- 布局：按子树宽度占位 ---------- */
const unitW = {};
function widthOf(id) {
  if (unitW[id]) return unitW[id];
  const kids = childrenOf[id] || [];
  const kidsW = kids.reduce((s, k) => s + widthOf(k), 0);
  unitW[id] = Math.max(1, kidsW);
  return unitW[id];
}

/* 只有配偶与母系边、自己既无父也无父系子女的人，写在伴侣框内，不单独占节点 */
const isSpouseOnly = (id) =>
  (spousesOf[id] || []).length > 0 && !fatherOf[id] && !(childrenOf[id] || []).length;

const roots = Object.keys(PEOPLE).filter((id) => !fatherOf[id] && !isSpouseOnly(id));
// 炎帝、蚩尤在左，黄帝一系在右：他的支系最宽，放右边不压别人的线
const ROOT_ORDER = ['person-yandi', 'person-chiyou', 'person-huangdi'];
roots.sort((a, b) => {
  const ia = ROOT_ORDER.indexOf(a);
  const ib = ROOT_ORDER.indexOf(b);
  return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
});

const totalUnits = roots.reduce((s, r) => s + widthOf(r), 0);
const X0 = (W - totalUnits * SLOT) / 2;

const pos = {};
function place(id, unitX) {
  const y = TOP + gen[id] * ROW;
  const kids = childrenOf[id] || [];
  if (kids.length) {
    let cx = unitX;
    for (const k of kids) {
      place(k, cx);
      cx += widthOf(k);
    }
    const a = pos[kids[0]].x;
    const b = pos[kids[kids.length - 1]].x;
    pos[id] = { x: (a + b) / 2, y };
  } else {
    pos[id] = { x: X0 + (unitX + widthOf(id) / 2) * SLOT, y };
  }
}

let cursor = 0;
for (const r of roots) {
  place(r, cursor);
  cursor += widthOf(r);
}

/* ---------- 画布 ---------- */
const svg = $('map');
const gRows = $('rows');
const gEdges = $('edges');
const gSucc = $('succ');
const gWars = $('wars');
const gNodes = $('nodes');

function el(name, attrs) {
  const node = document.createElementNS(NS, name);
  for (const k in attrs) node.setAttribute(k, attrs[k]);
  return node;
}

/* 代际标尺 */
for (let g = 0; g <= maxGen; g++) {
  const y = TOP + g * ROW;
  gRows.appendChild(el('line', { x1: 44, y1: y, x2: W - 24, y2: y, class: 'genline' }));
  const label = el('text', { x: 26, y: y + 4, class: 'genlabel' });
  label.textContent = g;
  gRows.appendChild(label);
}

/* 亲子：父辈底边中点 → 子辈顶边中点，S 形 */
for (const id in fatherOf) {
  const a = pos[fatherOf[id]];
  const b = pos[id];
  if (!a || !b) continue;
  const y1 = a.y + BOX_H / 2;
  const y2 = b.y - BOX_H / 2;
  const d = `M${a.x},${y1} C${a.x},${y1 + 26} ${b.x},${y2 - 26} ${b.x},${y2}`;
  gEdges.appendChild(
    el('path', { d, class: 'edge kin', 'data-from': fatherOf[id], 'data-to': id }),
  );
}

/* 继位：虚线箭头。同辈之间横着走，跨辈的向下鼓出，避开亲子线 */
for (const from in heirOf) {
  const a = pos[from];
  const b = pos[heirOf[from]];
  if (!a || !b) continue;
  let d;
  if (Math.abs(b.y - a.y) < 1) {
    // 兄终弟及：从右侧绕到对方左侧，不要从头顶扎进去
    const sign = b.x >= a.x ? 1 : -1;
    const x1 = a.x + sign * (BOX_W / 2);
    const x2 = b.x - sign * (BOX_W / 2);
    const y = a.y - BOX_H / 2 - 18;
    d = `M${x1},${a.y} C${x1},${y} ${x2},${y} ${x2},${b.y}`;
  } else {
    const dir = b.y > a.y ? 1 : -1;
    const y1 = a.y + dir * (BOX_H / 2);
    const y2 = b.y - dir * (BOX_H / 2);
    const bow = 54;
    d = `M${a.x},${y1} C${a.x + bow},${y1 + dir * 40} ${b.x + bow},${y2 - dir * 40} ${b.x},${y2}`;
  }
  gSucc.appendChild(
    el('path', {
      d,
      class: 'edge succ',
      'marker-end': 'url(#arrow)',
      'data-from': from,
      'data-to': heirOf[from],
    }),
  );
}

/* 敌对：从上方绕过去，不压住人物 */
for (const e of warEdges) {
  const a = pos[e.from];
  const b = pos[e.to];
  if (!a || !b) continue;
  // 同一对人既有敌对又有杀时，两条线错开高度，否则叠成一条
  const lift = e.kind === 'killed' ? 12 : 0;
  const y = Math.min(a.y, b.y) - BOX_H / 2 - 18 - lift;
  const d = `M${a.x},${a.y - BOX_H / 2} C${a.x},${y} ${b.x},${y} ${b.x},${b.y - BOX_H / 2}`;
  gWars.appendChild(
    el('path', {
      d,
      class: 'edge war' + (e.kind === 'killed' ? ' kill' : ''),
      'data-from': e.from,
      'data-to': e.to,
      'data-kind': e.kind,
    }),
  );
}

/* 人物 */
const nodeEls = {};
for (const id in PEOPLE) {
  if (isSpouseOnly(id)) continue;
  const p = PEOPLE[id];
  const at = pos[id];
  if (!at) continue;
  const g = el('g', { class: 'node', 'data-id': id, tabindex: '0' });
  const box = el('rect', {
    x: at.x - BOX_W / 2,
    y: at.y - BOX_H / 2,
    width: BOX_W,
    height: BOX_H,
    rx: 9,
    class: 'box',
  });
  g.appendChild(box);

  const name = el('text', { x: at.x, y: at.y + (spousesOf[id] ? 1 : 5), class: 'name' });
  name.textContent = p.n;
  g.appendChild(name);

  if (spousesOf[id]) {
    const sp = spousesOf[id]
      .map((s) => (PEOPLE[s] ? PEOPLE[s].n : s.replace('person-', '')))
      .join('、');
    const spouseText = el('text', { x: at.x, y: at.y + 15, class: 'spouse' });
    spouseText.textContent = '配 ' + sp;
    g.appendChild(spouseText);
  }

  gNodes.appendChild(g);
  nodeEls[id] = g;
}

/* ---------- 交互 ---------- */
const edgeEls = [...document.querySelectorAll('.edge')];
let stepIndex = -1;
let hoverId = null;
let pinnedId = null;

function lineage(id) {
  const set = new Set([id]);
  let f = fatherOf[id];
  while (f) {
    set.add(f);
    f = fatherOf[f];
  }
  const stack = [id];
  while (stack.length) {
    const k = stack.pop();
    for (const c of childrenOf[k] || []) {
      if (set.has(c)) continue;
      set.add(c);
      stack.push(c);
    }
  }
  for (const s of spousesOf[id] || []) set.add(s);
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
  const set = id ? lineage(id) : null;
  const stepFocus = stepIndex >= 0 && STEPS[stepIndex] ? STEPS[stepIndex].focus : null;

  for (const key in nodeEls) {
    const on = !set || set.has(key);
    nodeEls[key].classList.toggle('dim', !on);
    nodeEls[key].classList.toggle('on', key === (stepFocus || pinnedId));
    nodeEls[key].classList.toggle('hover', key === hoverId && key !== stepFocus);
  }

  for (const edge of edgeEls) {
    const a = edge.dataset.from;
    const b = edge.dataset.to;
    let on = true;
    if (set) on = set.has(a) && set.has(b);
    // 继位边在走到某一步时单独点亮
    if (edge.classList.contains('succ') && stepFocus) {
      on = a === stepFocus || b === stepFocus;
    }
    edge.classList.toggle('dim', !on);
    edge.classList.toggle('on', !!stepFocus && (a === stepFocus || b === stepFocus));
  }
}

function renderPanel(id) {
  const p = PEOPLE[id];
  if (!p) return;
  $('personName').textContent = p.n;
  $('personAlias').textContent = (p.alias || []).join(' · ');
  $('personRole').textContent = p.role || '';
  $('personNote').textContent = p.note || '';

  const kids = (childrenOf[id] || []).map((k) => PEOPLE[k].n).join('、');
  const spouses = (spousesOf[id] || []).map((s) => PEOPLE[s].n).join('、');
  const prev = prevOf[id] ? PEOPLE[prevOf[id]].n : '';
  const next = heirOf[id] ? PEOPLE[heirOf[id]].n : '';

  const facts = [
    ['世代', `第 ${gen[id]} 代`],
    ['配偶', spouses || '—'],
    ['子女', kids || '—'],
    ['继位', [prev && `← ${prev}`, next && `→ ${next}`].filter(Boolean).join('　') || '—'],
  ];
  $('personFacts').innerHTML = facts
    .map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`)
    .join('');
}

function renderSteps() {
  $('stepList').innerHTML = STEPS.map((s, i) => {
    const p = PEOPLE[s.focus];
    return `<li data-i="${i}" class="${i === stepIndex ? 'on' : ''}">
      <span class="no">${i + 1}</span>
      <span class="who">${p.n}</span>
      <span class="gen">第 ${gen[s.focus]} 代</span>
    </li>`;
  }).join('');
  $('stepText').textContent = stepIndex >= 0 ? STEPS[stepIndex].text : '按「播放」，看七次交接怎么走。';
}

function goStep(i) {
  stepIndex = Math.max(0, Math.min(STEPS.length - 1, i));
  hoverId = null;
  pinnedId = null;
  renderPanel(STEPS[stepIndex].focus);
  renderSteps();
  applyFocus();
}

function reset() {
  stop();
  stepIndex = -1;
  hoverId = null;
  pinnedId = null;
  renderSteps();
  applyFocus();
  const first = PEOPLE[STEPS[0].focus];
  $('personName').textContent = first.n;
  $('personAlias').textContent = (first.alias || []).join(' · ');
  $('personRole').textContent = first.role || '';
  $('personNote').textContent = first.note || '';
  $('personFacts').innerHTML = '';
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
  }, 2200);
});
$('btnPrev').addEventListener('click', () => {
  stop();
  goStep(stepIndex - 1);
});
$('btnNext').addEventListener('click', () => {
  stop();
  goStep(stepIndex + 1);
});
$('btnReset').addEventListener('click', reset);

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
  const id = g.dataset.id;
  pinnedId = pinnedId === id ? null : id;
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

/* 初始化：先摆好默认人物，再看链接里有没有指定第几步 */
renderSteps();
renderPanel(STEPS[0].focus);
applyFocus();
const hashStep = Number((location.hash || '').replace('#', ''));
if (hashStep >= 1 && hashStep <= STEPS.length) goStep(hashStep - 1);
