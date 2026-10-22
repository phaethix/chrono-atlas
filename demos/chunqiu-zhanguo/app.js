/*!
 * 春秋战国 · 渲染层
 *
 * 负责投影、绘制、时间轴与交互。数据全部来自 data.js，
 * 这里不含任何坐标常量与史料内容。
 */
'use strict';

/* ---------- 坐标系：经度 102–124E，纬度 24–43N ---------- */
const LON0 = 102, LAT0 = 42.9, SX = 44, SY = 34.2, OY = 10;
const px = (lon, lat) => [ (lon - LON0) * SX + 12, (LAT0 - lat) * SY + OY ];
const toPath = pts => smoothPath(pts.map(p => px(p[0], p[1])));

/* Catmull-Rom 转三次贝塞尔，让区域边界呈现自然曲线 */
function smoothPath(P, tension = 0.16){
  const n = P.length;
  if (n < 3) return 'M' + P.map(p => p.map(v => v.toFixed(1)).join(',')).join('L') + 'Z';
  let d = `M${P[0][0].toFixed(1)},${P[0][1].toFixed(1)}`;
  for (let i = 0; i < n; i++){
    const p0 = P[(i - 1 + n) % n], p1 = P[i], p2 = P[(i + 1) % n], p3 = P[(i + 2) % n];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6 * tension * 2;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6 * tension * 2;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6 * tension * 2;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6 * tension * 2;
    d += `C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d + 'Z';
}


const $ = id => document.getElementById(id);
const svg = $('map');
const gRegions = $('regions'), gLabels = $('labels'), gRivers = $('rivers'), gRipples = $('ripples');
const gConquest = $('conquest'), gBattles = $('battles'), gDefs = $('defs');
const NS = 'http://www.w3.org/2000/svg';

/* ---------- 状态推导 ---------- */
const ownerAt = year => {
  const st = Object.assign({}, INIT);
  for (const e of EVENTS) {
    if (e.y > year) break;
    if (e.ch) Object.assign(st, e.ch);
  }
  return st;
};
const appliedEvents = year => EVENTS.filter(e => e.y <= year);

/* ---------- 构建地图 ---------- */
const regionEls = {};
const labelEls = {};

(function buildMap(){
  // 陆地底色：把所有区域叠一层暖灰色，形成连续大陆，避免各区块悬浮
  const gLand = $('landmass');
  gLand.setAttribute('filter', 'url(#landGrow)');
  for (const r of REGIONS) {
    const land = document.createElementNS(NS,'path');
    land.setAttribute('d', toPath(r.p));
    land.setAttribute('fill', '#1b2430');
    land.setAttribute('stroke', '#1b2430');
    land.setAttribute('stroke-width', '4');
    land.setAttribute('stroke-linejoin', 'round');
    gLand.appendChild(land);
  }

  // 河流
  for (const river of RIVERS) {
    const d = river.map((p,i) => (i ? 'L' : 'M') + px(p[0],p[1]).map(v=>v.toFixed(1)).join(',')).join('');
    const path = document.createElementNS(NS,'path');
    path.setAttribute('d', d);
    path.setAttribute('fill','none');
    path.setAttribute('stroke','rgba(94,158,196,.30)');
    path.setAttribute('stroke-width','2.1');
    path.setAttribute('stroke-linecap','round');
    path.setAttribute('stroke-linejoin','round');
    gRivers.appendChild(path);
  }

  // 陆块底色（各区域外的柔和填充，靠区域本身即可）
  // 区域
  for (const r of REGIONS) {
    const d = toPath(r.p);
    const g = document.createElementNS(NS,'g');
    g.setAttribute('class','rgroup');
    const area = document.createElementNS(NS,'path');
    area.setAttribute('d', d);
    area.setAttribute('class','region');
    area.setAttribute('stroke','rgba(10,16,24,.35)');
    area.setAttribute('stroke-width','1.2');
    area.setAttribute('data-k', r.k);
    g.appendChild(area);
    gRegions.appendChild(g);
    regionEls[r.k] = area;
  }

  // 标签
  for (const r of REGIONS) {
    const [cx,cy] = centroid(r.p);
    const t = document.createElementNS(NS,'text');
    t.setAttribute('x', cx.toFixed(1));
    t.setAttribute('y', cy.toFixed(1));
    t.setAttribute('class','slabel');
    t.setAttribute('font-size','13');
    gLabels.appendChild(t);
    labelEls[r.k] = t;
  }
})();

function centroid(pts){
  let a=0,cx=0,cy=0;
  const P = pts.map(p=>px(p[0],p[1]));
  for (let i=0;i<P.length;i++){
    const j=(i+1)%P.length;
    const f = P[i][0]*P[j][1] - P[j][0]*P[i][1];
    a += f; cx += (P[i][0]+P[j][0])*f; cy += (P[i][1]+P[j][1])*f;
  }
  a *= 0.5;
  if (Math.abs(a) < 1e-6){
    const s = P.reduce((acc,p)=>[acc[0]+p[0],acc[1]+p[1]],[0,0]);
    return [s[0]/P.length, s[1]/P.length];
  }
  return [cx/(6*a), cy/(6*a)];
}

/* ---------- 渲染某一年的状态 ---------- */
let curYear = null;
let prevOwner = null;

function render(year, opts){
  year = Math.round(year);
  if (year === curYear && !(opts && opts.force)) return;
  const prevYear = curYear;
  curYear = year;
  const own = ownerAt(year);
  const crossedEvent = prevYear === null ? false
    : EVENTS.some(e => e.y > Math.min(prevYear, year) && e.y <= Math.max(prevYear, year));
  // 箭头预算按时间窗重置：同一波动画（950ms 内）共享有限额度，避免多区叠加成乱线
  const nowTs = performance.now();
  if (nowTs - arrowEpoch > 1000){
    arrowEpoch = nowTs;
    arrowBudget = 6;
  }

  // 当年易手中面积最大的一块，作为唯一带箭头的领衔区
  let arrowLeadKey = null;
  if (crossedEvent && prevOwner){
    let bestA = 0;
    for (const r of REGIONS){
      const was = prevOwner[r.k];
      const now = own[r.k];
      if (was === now || now === 'none') continue;
      const a = Math.abs(polyArea(r.p));
      if (a > bestA){ bestA = a; arrowLeadKey = r.k; }
    }
  }

  // 征服者当前已控制的疆域质心（作为无接壤时的退化起点）
  const capCentroid = {};
  for (const k in S){
    if (k === 'none' || !S[k].cap) continue;
    if (own[S[k].cap] === k){
      const rr = REGIONS.find(x => x.k === S[k].cap);
      if (rr) capCentroid[k] = centroid(rr.p);
    }
  }

  // 按势力归集其当前领土（含像素多边形），用于多点进攻的战线计算
  const ownedPolys = {};
  for (const r of REGIONS){
    const o = own[r.k];
    if (o === 'none') continue;
    const poly = r.p.map(p => px(p[0], p[1]));
    (ownedPolys[o] = ownedPolys[o] || []).push({ k: r.k, poly });
  }

  // 为被吞并区计算战线起点：所有接壤的征服者领土，取其边界上离该区最近的点
  function frontOrigins(region, newOwnerKey){
    const target = region.p.map(p => px(p[0], p[1]));
    const origins = [];
    const cands = ownedPolys[newOwnerKey] || [];
    for (const c of cands){
      if (c.k === region.k) continue;
      if (!polygonsTouch(target, c.poly)) continue;
      // 取征服者边界上离被吞并区最近的一段中点，作为这条战线的突破口
      let best = null, bestD = Infinity;
      for (let i = 0; i < c.poly.length; i++){
        const b1 = c.poly[i], b2 = c.poly[(i+1) % c.poly.length];
        const mid = [(b1[0]+b2[0])/2, (b1[1]+b2[1])/2];
        let near = Infinity;
        for (let j = 0; j < target.length; j++){
          const d = distToSegSq(mid, target[j], target[(j+1) % target.length]);
          if (d < near) near = d;
        }
        if (near < bestD){ bestD = near; best = mid; }
      }
      if (best && bestD < 900) origins.push(best); // 30px 以内视为接触面
    }
    if (!origins.length){
      // 无直接接壤（中间隔着缓冲区）：从征服者最近的一块领土出发，仍能看出进攻方向
      let best = null, bestD = Infinity;
      for (const c of cands){
        if (c.k === region.k) continue;
        for (const cp of c.poly){
          for (const tp of target){
            const d = Math.hypot(cp[0]-tp[0], cp[1]-tp[1]);
            if (d < bestD){ bestD = d; best = cp; }
          }
        }
      }
      if (best) origins.push(best);
      else if (capCentroid[newOwnerKey]) origins.push(capCentroid[newOwnerKey]);
    }
    return origins.slice(0, 5); // 最多五路并进，避免视觉过碎
  }

  for (const r of REGIONS){
    const o = own[r.k];
    const el = regionEls[r.k];
    const color = (S[o] || S.none).c;
    const prev = prevOwner ? prevOwner[r.k] : null;
    const changed = prev !== null && prev !== o && o !== 'none';

    if (changed){
      // 底色直接落到新色（被征服潮覆盖，肉眼看到的是潮水推进）
      el.style.transition = 'none';
      el.setAttribute('fill', color);
      el.setAttribute('fill-opacity', '.95');
      if (crossedEvent){
        const origins = frontOrigins(r, o);
        // 只有面积最大的一块易手区保留箭头，避免小区域箭头互相打架
        const isLead = arrowLeadKey && arrowLeadKey === r.k;
        spawnConquestMulti(r, o, origins, { arrows: isLead ? 3 : 0 });
      }
    } else {
      el.style.transition = 'fill .5s ease, fill-opacity .4s ease';
      el.setAttribute('fill', color);
      el.setAttribute('fill-opacity', o === 'none' ? '.34' : '.95');
    }

    // 描边与填充同色：同势力领土自然连成一片，靠色差区分国界
    el.setAttribute('stroke', color);
    el.setAttribute('stroke-width', '4.5');
    el.setAttribute('stroke-opacity', o === 'none' ? '.25' : '.96');
    el.setAttribute('stroke-linejoin', 'round');
    el.setAttribute('stroke-linecap', 'round');
    el.setAttribute('opacity', selectedOwner ? (o === selectedOwner ? '1' : '.28') : '1');
  }

  // 国名标注：优先都城所在区；若都城尚未在手，退而使用该势力当前最大辖区
  const capOf = {}, bigOf = {}, bigArea = {};
  for (const r of REGIONS){
    const o = own[r.k];
    if (o === 'none') continue;
    const a = Math.abs(polyArea(r.p));
    if (!(o in bigArea) || a > bigArea[o]){ bigArea[o] = a; bigOf[o] = r.k; }
  }
  for (const k in S){
    if (!S[k].cap) continue;
    const capKey = S[k].cap;
    capOf[k] = own[capKey] === k ? capKey : (bigOf[k] || null);
  }

  for (const r of REGIONS){
    const o = own[r.k];
    const t = labelEls[r.k];
    const sp = S[o] || S.none;
    const area = Math.abs(polyArea(r.p));

    if (o === 'none'){
      // 无主之地：仅在大区域显示地理名
      if (area > 9000){
        t.textContent = r.n;
        t.setAttribute('font-size', 9.5);
        t.setAttribute('class', 'slabel small');
        t.style.opacity = 0.42;
      } else {
        t.textContent = '';
        t.style.opacity = 0;
      }
      continue;
    }

    if (capOf[o] === r.k){
      t.textContent = sp.n;
      // 小国字号自适应：面积不足时缩小，避免文字溢出区块
      const fs = area < 800 ? 8 : area < 1600 ? 10.5 : (sp.n.length > 2 ? 9.5 : 14);
      t.setAttribute('font-size', fs);
      t.setAttribute('class', 'slabel' + (fs <= 10.5 ? ' small' : ''));
      t.style.opacity = 1;
    } else if (area > 3000){
      t.textContent = r.n;
      t.setAttribute('font-size', 9.5);
      t.setAttribute('class', 'slabel small');
      t.style.opacity = 0.5;
    } else {
      t.textContent = '';
      t.style.opacity = 0;
    }
  }

  prevOwner = own;
  updatePanel(year, own);
  buildLegend(own);
  updateBattles(year);
  highlightEventMarks(year);
  if (prevYear !== null){
    const shownNow = detectAnnexations(prevYear, year);
    if (!shownNow){ clearAnnexBanner(); clearDossier(); }
  }
}

function polyArea(pts){
  const P = pts.map(p=>px(p[0],p[1]));
  let a=0;
  for (let i=0;i<P.length;i++){
    const j=(i+1)%P.length;
    a += P[i][0]*P[j][1] - P[j][0]*P[i][1];
  }
  return a/2;
}

/* ---------- 兼并可视化：多点征服潮 ---------- */
/* 从所有与该区接壤的征服者领土同时发兵，用多个圆形裁剪的并集向被吞并区内部推进，
   直观呈现"几条战线同时压进来"。若无接壤者，退化为从最近邻/征服者质心单点推进。 */
let conquestSeq = 0;

/* 计算点到线段的距离平方 */
function distToSegSq(p, a, b){
  const dx = b[0]-a[0], dy = b[1]-a[1];
  const len2 = dx*dx + dy*dy;
  if (len2 < 1e-9){
    const ex = p[0]-a[0], ey = p[1]-a[1];
    return ex*ex + ey*ey;
  }
  let t = ((p[0]-a[0])*dx + (p[1]-a[1])*dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const qx = a[0] + t*dx, qy = a[1] + t*dy;
  const ex = p[0]-qx, ey = p[1]-qy;
  return ex*ex + ey*ey;
}

/* 判断两个多边形是否接壤：以任一边的端点到对边的最短距离衡量。
   必须用"点到线段"而非"点到点"，否则顶点稀疏时相邻边界会被误判为不相邻。 */
function polygonsTouch(a, b, thresh){
  const ta = (thresh === undefined ? 11 : thresh);
  const t2 = ta * ta;
  for (let i = 0; i < a.length; i++){
    const a1 = a[i], a2 = a[(i+1) % a.length];
    for (let j = 0; j < b.length; j++){
      const b1 = b[j], b2 = b[(j+1) % b.length];
      // 双向检查：a 的端点到 b 的边、b 的端点到 a 的边
      if (distToSegSq(a1, b1, b2) < t2) return true;
      if (distToSegSq(b1, a1, a2) < t2) return true;
    }
  }
  return false;
}

/* 计算从多个起点覆盖本区所需的最大半径 */
function conquestRadius(region, origins){
  let need = 60;
  for (const pt of region.p){
    const [vx, vy] = px(pt[0], pt[1]);
    let near = Infinity;
    for (const o of origins){
      const d = Math.hypot(vx - o[0], vy - o[1]);
      if (Number.isFinite(d)) near = Math.min(near, d);
    }
    if (Number.isFinite(near)) need = Math.max(need, near + 16);
  }
  const area = Math.abs(polyArea(region.p));
  return Math.max(need, Math.sqrt(area / Math.PI) || 60);
}

/* 多点征服潮：origins 为像素坐标起点数组。
   除用圆形裁剪表现潮水推进外，还为部分战线画朝内的箭头，让"几路并进"可数可读。
   箭头受时间窗预算限制（同一波内总量有限），否则统一之年会变成一团乱线。 */
let arrowBudget = 6;
let arrowEpoch = 0;

function spawnConquestMulti(region, newOwnerKey, origins, opts){
  const pts = (origins || []).filter(o => Number.isFinite(o[0]) && Number.isFinite(o[1]));
  if (!pts.length) return;

  const color = (S[newOwnerKey] || S.none).c;
  const radius = conquestRadius(region, pts);
  const id = 'cq' + (++conquestSeq);
  const clip = document.createElementNS(NS, 'clipPath');
  clip.setAttribute('id', id);
  const circles = pts.map(o => {
    const c = document.createElementNS(NS, 'circle');
    c.setAttribute('cx', o[0].toFixed(1));
    c.setAttribute('cy', o[1].toFixed(1));
    c.setAttribute('r', '0');
    clip.appendChild(c);
    return c;
  });
  gDefs.appendChild(clip);

  const wave = document.createElementNS(NS, 'path');
  wave.setAttribute('d', toPath(region.p));
  wave.setAttribute('fill', color);
  wave.setAttribute('clip-path', `url(#${id})`);
  wave.setAttribute('opacity', '.96');
  wave.style.pointerEvents = 'none';
  gConquest.appendChild(wave);

  // 减少动态效果偏好：直接呈现结果，不做推进动画
  const calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (calm){
    for (const c of circles) c.setAttribute('r', String(radius));
    setTimeout(() => { wave.remove(); clip.remove(); }, 240);
    return;
  }

  // 每条战线的箭头：从起点指向被吞并区质心，数量受时间窗预算约束
  const [rcx, rcy] = centroid(region.p);
  const arrows = [];
  const want = (opts && opts.arrows) || 0;
  const allow = Math.max(0, Math.min(want, pts.length, arrowBudget, 3));
  const arrowPts = pts.slice(0, allow);
  arrowBudget -= arrowPts.length;

  for (const o of arrowPts){
    let dx = rcx - o[0], dy = rcy - o[1];
    const len = Math.hypot(dx, dy) || 1;
    dx /= len; dy /= len;
    const tip = Math.min(len * 0.5, 54);   // 箭头伸入区内的长度
    const x1 = o[0] + dx * 8, y1 = o[1] + dy * 8;
    const x2 = o[0] + dx * tip, y2 = o[1] + dy * tip;
    const ang = Math.atan2(dy, dx) * 180 / Math.PI;
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('opacity', '0');
    g.style.pointerEvents = 'none';

    const line = document.createElementNS(NS, 'line');
    line.setAttribute('x1', x1.toFixed(1)); line.setAttribute('y1', y1.toFixed(1));
    line.setAttribute('x2', x2.toFixed(1)); line.setAttribute('y2', y2.toFixed(1));
    line.setAttribute('stroke', '#fff8e2');
    line.setAttribute('stroke-width', '1.5');
    line.setAttribute('stroke-opacity', '.42');
    line.setAttribute('stroke-linecap', 'round');
    g.appendChild(line);

    const head = document.createElementNS(NS, 'path');
    const sz = 5.6;
    head.setAttribute('d', `M0,0 L${-sz},${sz*0.46} L${-sz},${-sz*0.46} Z`);
    head.setAttribute('transform', `translate(${x2.toFixed(1)},${y2.toFixed(1)}) rotate(${ang.toFixed(1)})`);
    head.setAttribute('fill', '#fff8e2');
    head.setAttribute('fill-opacity', '.62');
    g.appendChild(head);

    gConquest.appendChild(g);
    arrows.push(g);
  }

  const start = performance.now();
  const dur = 950;
  (function step(t){
    const k = Math.min(1, (t - start) / dur);
    const ease = 1 - Math.pow(1 - k, 2.6);
    const rNow = Math.max(0, radius * ease);
    const val = Number.isFinite(rNow) ? rNow.toFixed(1) : '240';
    for (const c of circles) c.setAttribute('r', val);
    // 箭头在前半程淡入，末段再淡出，避免与最终配色打架
    const fade = k < 0.18 ? k / 0.18 : (k > 0.72 ? Math.max(0, (1 - k) / 0.28) : 1);
    for (const g of arrows) g.setAttribute('opacity', (fade * 0.85).toFixed(3));
    if (k < 1) requestAnimationFrame(step);
    else {
      wave.remove(); clip.remove();
      for (const g of arrows) g.remove();
    }
  })(performance.now());
}

/* 兼容旧调用：单点质心退化为一个起点的多点进攻 */
function spawnConquest(region, prevOwnerKey, newOwnerKey, aggressorCentroid){
  if (!aggressorCentroid) return;
  spawnConquestMulti(region, newOwnerKey, [aggressorCentroid]);
}

/* 灭国提示：在画面中央浮出「齐 灭 宋」的定格字幕
   若同一国家被多国瓜分（如三家分晋），则改为「韩赵魏 分 晋」 */
function showAnnexBanner(conquerorKey, victimKey, year, detail){
  const box = $('annex');
  if (!box) return;
  const cs = S[conquerorKey], vs = S[victimKey];
  if (!cs || !vs) return;
  const conqs = Array.isArray(conquerorKey) ? conquerorKey : [conquerorKey];
  const multi = conqs.length > 1;
  box.innerHTML = `
    <div class="anx-year">前 ${-year} 年</div>
    <div class="anx-line">
      ${conqs.map(k => {
        const s = S[k];
        return s ? `<span class="anx-con" style="color:${s.c};border-color:${s.c}">${s.n}</span>` : '';
      }).join('')}
      <span class="anx-verb">${multi ? '分' : '灭'}</span>
      <span class="anx-vic" style="color:${vs.c}">${vs.n}</span>
    </div>
    ${detail ? `<div class="anx-detail">${detail}</div>` : ''}`;
  box.classList.remove('on');
  clearTimeout(box._hide);
  clearTimeout(box._show);
  void box.getBoundingClientRect().width;
  // 下一帧再显示，确保过渡动画从隐藏态重新开始
  box._show = setTimeout(() => box.classList.add('on'), 20);
  box._hide = setTimeout(() => box.classList.remove('on'), 2700);
}

/* 清除残留的灭国字幕 */
function clearAnnexBanner(){
  const box = $('annex');
  if (!box) return;
  clearTimeout(box._hide);
  clearTimeout(box._show);
  box.classList.remove('on');
  box.innerHTML = '';
}

/* ---------- 兼并档案卡片 ---------- */
/* 灭国时在右下角浮出一张小卡片，量化呈现"这一口吃了多少"：
   被灭国原有几块地、一次性归入哪方、征服者此战后领土增长到多少。
   卡片可悬停停留、点击展开查看该年全部易手区域。 */
const DOSSIER_LIFE = 5600;
let lastDossier = null;   // 最近一次档案的入参，供重新打开

function dossierChanges(year){
  const before = ownerAt(year - 1);
  const after = ownerAt(year);
  const list = [];
  for (const r of REGIONS){
    const a = before[r.k];
    const b = after[r.k];
    if (a === b) continue;
    list.push({ k: r.k, n: r.n, from: a, to: b });
  }
  return list;
}

function showDossier(conqKey, victimKey, year, detail, extra){
  const box = $('dossier');
  if (!box) return;
  // 允许传入数组：多家瓜分时按主力（得地最多者）展示量化数据
  const conqs = Array.isArray(conqKey) ? conqKey : [conqKey];
  const vs = S[victimKey];
  if (!vs) return;
  const count0 = (own, k) => Object.values(own).filter(v => v === k).length;
  const _b = ownerAt(year - 1), _a = ownerAt(year);
  const mainKey = conqs.slice().sort((x, y) => count0(_a, y) - count0(_a, x))[0];
  const cs = S[mainKey];
  if (!cs) return;
  const e = extra || {};
  lastDossier = { conqKey, victimKey, year, detail, extra: e };

  const before = _b;
  const after = _a;
  const count = count0;
  const victimBefore = count(before, victimKey);
  const conqBefore = count(before, mainKey);
  const conqAfter = count(after, mainKey);
  const gained = conqAfter - conqBefore;
  const multi = conqs.length > 1;
  const total = REGIONS.length;
  const shareBefore = conqBefore / total * 100;
  const shareAfter = conqAfter / total * 100;

  box.innerHTML = `
    <div class="ds-head">
      <span class="ds-title">兼并档案</span>
      <span class="ds-tools">
        <span class="ds-year">前 ${-year} 年</span>
        <button class="ds-x" id="dsClose" title="关闭（Esc）" aria-label="关闭档案">×</button>
      </span>
    </div>
    <div class="ds-row">
      <span>被灭</span>
      <span style="color:${vs.c}">${vs.n} · 原有 ${victimBefore} 区</span>
    </div>
    <div class="ds-row">
      <span>归入</span>
      <span class="nowrap">${conqs.map(k => {
        const sp = S[k];
        const n = count(after, k) - count(before, k);
        return `<b style="color:${sp.c}">${sp.n}</b>${multi ? `<i class="ds-sub">+${n}区</i>` : ''}`;
      }).join('<i class="ds-sub">·</i>')}</span>
    </div>
    <div class="ds-row">
      <span>疆域变化</span>
      <span>${conqBefore} → <b class="ds-key">${conqAfter}</b> 区（+${gained}）</span>
    </div>
    <div class="ds-row">
      <span>天下占比</span>
      <span>${shareBefore.toFixed(0)}% → <b class="ds-key">${shareAfter.toFixed(0)}%</b></span>
    </div>
    <div class="ds-bar">
      <i style="width:${shareBefore.toFixed(1)}%;background:${cs.c};opacity:.42"></i>
      <i style="width:${Math.max(0, shareAfter - shareBefore).toFixed(1)}%;background:${cs.c}"></i>
    </div>
    ${detail ? `<div class="ds-note">${detail}</div>` : ''}
    <button class="ds-toggle" id="dsToggle" aria-expanded="false">当年全部变更<span class="arw">⌄</span></button>
    <div class="ds-list" id="dsList"></div>`;

  const list = dossierChanges(year);
  const listBox = box.querySelector('#dsList');
  listBox.innerHTML = list.length
    ? `<div class="ds-list-in">${list.map(c => {
        const fs = S[c.from] || S.none, ts = S[c.to] || S.none;
        return `<div class="ds-li">
          <span class="rg">${c.n}</span>
          <span class="mv">
            <i class="dot" style="background:${fs.c}"></i>${fs.n}
            <span class="arw2">→</span>
            <i class="dot" style="background:${ts.c}"></i>${ts.n}
          </span>
        </div>`;
      }).join('')}</div>`
    : '<div class="ds-empty">本年无区域易手</div>';

  box.classList.remove('on', 'exp');
  clearTimeout(box._hide);
  void box.getBoundingClientRect().width;
  requestAnimationFrame(() => box.classList.add('on'));

  // 展开/收起当年变更清单
  box.querySelector('#dsToggle').addEventListener('click', ev => {
    ev.stopPropagation();
    const on = box.classList.toggle('exp');
    box.querySelector('#dsToggle').setAttribute('aria-expanded', on ? 'true' : 'false');
    clearTimeout(box._hide); // 展开后不再自动关闭
  });
  box.querySelector('#dsClose').addEventListener('click', ev => {
    ev.stopPropagation();
    clearDossier();
  });

  // 悬停期间暂停自动关闭，移开后重新计时
  box.onmouseenter = () => clearTimeout(box._hide);
  box.onmouseleave = () => {
    clearTimeout(box._hide);
    box._hide = setTimeout(() => { if (!box.classList.contains('exp')) box.classList.remove('on'); }, 1400);
  };

  box._hide = setTimeout(() => {
    if (!box.classList.contains('exp')) box.classList.remove('on');
  }, DOSSIER_LIFE);
}

function clearDossier(){
  const box = $('dossier');
  if (!box) return;
  clearTimeout(box._hide);
  box.onmouseenter = box.onmouseleave = null;
  box.classList.remove('on', 'exp');
  box.innerHTML = '';
}

/* 展示当前年份之前最近一次兼并的档案（保证与地图所示年份一致） */
function reopenDossier(){
  // 当前年份正好有档案，直接重开
  if (lastDossier && lastDossier.year === curYear){
    showDossier(lastDossier.conqKey, lastDossier.victimKey, lastDossier.year, lastDossier.detail, lastDossier.extra);
    return true;
  }
  // 否则向前回溯，找最近一次造成灭国的兼并
  const merges = EVENTS.filter(e => e.t === 'merge' && e.ch && e.y <= curYear).sort((a, b) => b.y - a.y);
  for (const ev of merges){
    const before = ownerAt(ev.y - 1);
    const after = ownerAt(ev.y);
    const aliveBefore = new Set(Object.values(before).filter(v => v !== 'none'));
    const aliveAfter = new Set(Object.values(after).filter(v => v !== 'none'));
    const victims = [...aliveBefore].filter(k => !aliveAfter.has(k) && S[k] && k !== 'none');
    for (const victim of victims){
      const gainer = {};
      for (const r of REGIONS){
        if (before[r.k] !== after[r.k] && before[r.k] === victim) gainer[victim] = after[r.k];
      }
      const conq = gainer[victim];
      if (!conq || conq === 'none') continue;
      const merged = REGIONS.filter(r => before[r.k] === victim && after[r.k] === conq).length;
      showDossier(conq, victim, ev.y, ev.s, { merged });
      return true;
    }
  }
  return false;
}

/* 逐事件精确判定：某国在该事件中失去最后一块领土，则浮出「X 灭 Y」字幕 */
function detectAnnexations(fromYear, toYear){
  if (fromYear === null || fromYear === undefined) return false;
  // 仅在向前推进时判定，且只看目标年份本身的事件
  if (toYear <= fromYear) return false;

  const crossed = EVENTS.filter(e => e.y === toYear && e.ch);
  if (!crossed.length) return false;

  let shown = 0;
  for (const ev of crossed.slice(-3)){
    const before = ownerAt(ev.y - 1);
    const after = ownerAt(ev.y);
    const aliveBefore = new Set(Object.values(before).filter(v => v !== 'none'));
    const aliveAfter = new Set(Object.values(after).filter(v => v !== 'none'));
    const victims = [...aliveBefore].filter(k => !aliveAfter.has(k) && S[k] && k !== 'none');
    if (!victims.length) continue;

    // 接收者集合：一家独吞为单个键，多家瓜分为数组
    const gainers = {};
    for (const r of REGIONS){
      if (before[r.k] !== after[r.k] && victims.includes(before[r.k])){
        const to = after[r.k];
        if (!to || to === 'none') continue;
        (gainers[before[r.k]] = gainers[before[r.k]] || []).push(to);
      }
    }
    for (const victim of victims){
      const list = [...new Set(gainers[victim] || [])];
      if (!list.length) continue;
      // 按得地多少降序：得地最多者居首，读起来更符合主次
      const gcount = {};
      for (const k of list) gcount[k] = REGIONS.filter(r => before[r.k] === victim && after[r.k] === k).length;
      list.sort((a, b) => (gcount[b] || 0) - (gcount[a] || 0));
      const conq = list.length > 1 ? list : list[0];
      showAnnexBanner(conq, victim, ev.y, ev.s);
      // 并入的区数（用于档案卡片量化展示）
      const merged = REGIONS.filter(r => before[r.k] === victim && list.includes(after[r.k])).length;
      showDossier(conq, victim, ev.y, ev.s, { merged });
      shown++;
      if (shown >= 2) return true;
    }
  }
  return shown > 0;
}

/* ---------- 战役标记 ---------- */
function updateBattles(year){
  // 标记数量很少，每年重建，逻辑更简单可靠
  while (gBattles.firstChild) gBattles.removeChild(gBattles.firstChild);
  for (const b of BATTLES){
    if (b.y > year) continue;
    const [x, y] = px(b.lon, b.lat);
    const g = document.createElementNS(NS,'g');
    g.setAttribute('opacity', '0');
    g.style.transition = 'opacity .5s ease';

    if (b.kind === 'battle'){
      const sword = document.createElementNS(NS,'text');
      sword.setAttribute('x', x.toFixed(1));
      sword.setAttribute('y', y.toFixed(1));
      sword.setAttribute('text-anchor','middle');
      sword.setAttribute('dominant-baseline','central');
      sword.setAttribute('font-size','13');
      sword.setAttribute('fill','#f0d060');
      sword.textContent = '⚔';
      g.appendChild(sword);
    }
    const t = document.createElementNS(NS,'text');
    t.setAttribute('x', x.toFixed(1));
    t.setAttribute('y', (y + 12).toFixed(1));
    t.setAttribute('text-anchor','middle');
    t.setAttribute('font-size','8.6');
    t.setAttribute('fill','rgba(240,208,96,.92)');
    t.setAttribute('style','paint-order:stroke;stroke:rgba(0,0,0,.75);stroke-width:2px;stroke-linejoin:round');
    t.textContent = b.n;
    g.appendChild(t);

    gBattles.appendChild(g);
    requestAnimationFrame(()=> g.setAttribute('opacity','1'));
  }
}
/* ---------- 侧栏 ---------- */
function updatePanel(year, own){
  const abs = -year;
  $('yearBig').textContent = `前 ${abs} 年`;
  const era = ERAS.find(e => year >= e.from && year < e.to) || ERAS[ERAS.length-1];
  $('eraTag').textContent = era.name;

  // 年份说明：找最近一条备注或最近事件
  let note = NOTES[String(year)];
  if (!note){
    const past = EVENTS.filter(e=>e.y<=year);
    note = past.length ? past[past.length-1].s : era.note;
  }
  $('yearNote').textContent = note;

  // 势力占比
  const totalArea = REGIONS.reduce((s,r)=>s+Math.abs(polyArea(r.p)),0);
  const stat = {};
  for (const r of REGIONS){
    const o = own[r.k];
    if (o === 'none') continue;
    const a = Math.abs(polyArea(r.p));
    stat[o] = (stat[o]||0) + a;
  }
  const rows = Object.entries(stat).sort((a,b)=>b[1]-a[1]).slice(0,8);
  const maxv = rows.length ? rows[0][1] : 1;
  const alive = Object.keys(stat).length;
  $('powerList').innerHTML = rows.map(([k,v])=>{
    const sp = S[k];
    const pct = (v/totalArea*100);
    return `<div class="prow">
      <span class="pdot" style="background:${sp.c}"></span>
      <span class="pname">${sp.n}</span>
      <span class="pbar"><i style="width:${(v/maxv*100).toFixed(1)}%;background:${sp.c}"></i></span>
      <span class="pval">${pct.toFixed(1)}%</span>
    </div>`;
  }).join('');

  // 顶部元信息
  $('metaTitle').textContent = era.name + ' · 前' + abs + '年';
  $('metaSub').textContent = alive ? `存续势力 ${alive} 家 · 无主之地 ${(Object.values(own).filter(v=>v==='none').length)} 区` : '';

  // 事件列表：最近若干条 + 当前年触发
  const past = EVENTS.filter(e=>e.y<=year);
  const recent = past.slice(-6).reverse();
  const justNow = EVENTS.filter(e=>e.y===year);
  $('eventList').innerHTML = recent.length ? recent.map(e=>{
    const cls = ['ev'];
    if (e.t === 'merge') cls.push('tag-merge');
    if (e.t === 'era') cls.push('tag-era');
    if (e.y === year) cls.push('new');
    return `<div class="${cls.join(' ')}"><time>前${-e.y}</time><p>${e.s}</p></div>`;
  }).join('') : '<div class="empty">尚未发生任何大事。</div>';
}

/* ---------- 图例 ---------- */
let selectedOwner = null;

function buildLegend(own){
  const lg = $('legend');
  if (typeof selectedOwner !== 'undefined' && selectedOwner && S[selectedOwner]){
    lg.innerHTML = `<b style="color:${S[selectedOwner].c}">▍正在高亮：${S[selectedOwner].n}</b>` +
      `<b style="color:#8b98a8">再次点击地图取消</b>`;
    return;
  }
  const alive = new Set(Object.values(own).filter(v=>v!=='none'));
  const items = Object.keys(S).filter(k=>k!=='none' && alive.has(k));
  lg.innerHTML = items.map(k=>`<b><i style="background:${S[k].c}"></i>${S[k].n}</b>`).join('')
    || '<b style="color:#5d6b7d">天下无主</b>';
}

/* ---------- 播放控制 ---------- */
const MIN_Y = META.from, MAX_Y = META.to;
let playing = false, speed = 1, rafId = null, lastTs = 0;
let yearFloat = MIN_Y;

function setYear(y, opts){
  yearFloat = Math.min(MAX_Y, Math.max(MIN_Y, y));
  $('slider').value = Math.round(yearFloat);
  render(Math.round(yearFloat), opts);
  // 年份变化后取消高亮，避免压暗其他领土干扰对比
  if (selectedOwner){ selectedOwner = null; }
}

function togglePlay(){
  playing = !playing;
  $('btnPlay').textContent = playing ? '暂停' : '播放';
  if (playing){
    if (yearFloat >= MAX_Y) yearFloat = MIN_Y;
    lastTs = 0;
    rafId = requestAnimationFrame(tick);
  } else if (rafId){
    cancelAnimationFrame(rafId); rafId = null;
  }
}

const BASE_RATE = 3.4; // 每秒推进的年数（1×）
const HOLD_MS = 760;   // 到达兼并年份后的自动停顿

let holdUntil = 0;
let lastRendered = null;

function tick(ts){
  if (!playing) return;
  if (!lastTs){ lastTs = ts; rafId = requestAnimationFrame(tick); return; }
  const dt = Math.min(0.07, (ts - lastTs) / 1000);
  lastTs = ts;

  // 兼并年份停顿：让征服潮与灭国字幕被看见
  if (ts < holdUntil){ rafId = requestAnimationFrame(tick); return; }

  yearFloat += dt * BASE_RATE * speed;
  if (yearFloat >= MAX_Y){
    yearFloat = MAX_Y;
    $('slider').value = MAX_Y;
    render(MAX_Y);
    playing = false;
    $('btnPlay').textContent = '播放';
    return;
  }
  const shown = Math.round(yearFloat);

  // 跨过一个兼并事件时停一下
  if (shown !== lastRendered){
    lastRendered = shown;
    const hit = EVENTS.some(e => e.y === shown && e.t === 'merge' && e.ch);
    if (hit) holdUntil = ts + HOLD_MS;
    $('slider').value = shown;
    render(shown, { silent:true });
  }
  rafId = requestAnimationFrame(tick);
}

function jumpEvent(dir){
  const y = curYear;
  const list = EVENTS.map(e=>e.y);
  if (dir > 0){
    const n = list.find(v => v > y);
    if (n !== undefined) { setYear(n); }
  } else {
    const p = [...list].reverse().find(v => v < y);
    if (p !== undefined) { setYear(p); }
  }
}

/* ---------- 事件绑定 ---------- */
$('btnPlay').addEventListener('click', togglePlay);
$('btnReset').addEventListener('click', ()=>{
  playing = false; $('btnPlay').textContent = '播放';
  if (rafId){ cancelAnimationFrame(rafId); rafId = null; }
  holdUntil = 0; lastRendered = null; lastTs = 0;
  setYear(MIN_Y);
});
$('btnPrevEvt').addEventListener('click', ()=>jumpEvent(-1));
$('btnNextEvt').addEventListener('click', ()=>jumpEvent(1));
$('slider').addEventListener('input', e=>{
  playing = false; $('btnPlay').textContent = '播放';
  if (rafId){ cancelAnimationFrame(rafId); rafId = null; }
  holdUntil = 0; lastRendered = null;
  setYear(Number(e.target.value));
});
$('speedBox').addEventListener('click', e=>{
  const b = e.target.closest('button[data-speed]');
  if (!b) return;
  speed = Number(b.dataset.speed);
  [...$('speedBox').children].forEach(x=>x.classList.toggle('on', x===b));
});

/* 点击时间轴上的兼并刻度直接跳转 */
$('evtmarks').addEventListener('click', e=>{
  const i = e.target.closest('i[data-y]');
  if (!i) return;
  playing = false; $('btnPlay').textContent = '播放';
  if (rafId){ cancelAnimationFrame(rafId); rafId = null; }
  holdUntil = 0; lastRendered = null;
  // 从事件前一年进入，确保触发征服潮
  setYear(Number(i.dataset.y) - 1, { force:true });
  setTimeout(()=> setYear(Number(i.dataset.y)), 30);
});

/* 点击地图：高亮该国全部领土 */
gRegions.addEventListener('click', e=>{
  const el = e.target.closest('.region');
  if (!el) return;
  const own = ownerAt(curYear);
  const o = own[el.dataset.k];
  if (!o || o === 'none'){ selectedOwner = null; applySelection(); return; }
  selectedOwner = (selectedOwner === o) ? null : o;
  applySelection();
});

function applySelection(){
  const own = ownerAt(curYear);
  for (const r of REGIONS){
    const el = regionEls[r.k];
    const o = own[r.k];
    if (!selectedOwner){ el.style.opacity = '1'; continue; }
    el.style.opacity = (o === selectedOwner) ? '1' : '.28';
  }
  // 高亮时在图例中提示
  const lg = $('legend');
  if (selectedOwner && S[selectedOwner]){
    lg.innerHTML = `<b style="color:${S[selectedOwner].c}">▍正在高亮：${S[selectedOwner].n}</b>` +
      `<b style="color:#8b98a8">再次点击取消</b>`;
  } else {
    buildLegend(own);
  }
}
document.addEventListener('keydown', e=>{
  if (e.target.tagName === 'INPUT' && e.key !== ' ') return;
  const dossierBox = $('dossier');
  const dossierOpen = dossierBox && dossierBox.classList.contains('on');

  if (e.code === 'Space'){ e.preventDefault(); togglePlay(); }
  else if (e.key === 'Escape'){
    if (dossierOpen){ e.preventDefault(); clearDossier(); }
  }
  else if (e.key === 'd' || e.key === 'D'){
    // 重新打开最近一次兼并档案
    if (reopenDossier()) e.preventDefault();
  }
  else if (e.key === 'Enter'){
    if (dossierOpen){
      const t = $('dsToggle');
      if (t){ e.preventDefault(); t.click(); }
    }
  }
  else if (e.key === 'ArrowRight'){ e.preventDefault(); setYear(curYear + (e.shiftKey ? 20 : 5)); }
  else if (e.key === 'ArrowLeft'){ e.preventDefault(); setYear(curYear - (e.shiftKey ? 20 : 5)); }
  else if (e.key === 'Home'){ e.preventDefault(); setYear(MIN_Y); }
  else if (e.key === 'End'){ e.preventDefault(); setYear(MAX_Y); }
});

/* ---------- 时间轴：兼并事件刻度 ---------- */
const evtMarkEls = [];

(function buildEventMarks(){
  const box = $('evtmarks');
  const span = MAX_Y - MIN_Y;
  const merges = EVENTS.filter(e => e.t === 'merge' && e.ch);
  box.innerHTML = merges.map(e => {
    const p = (e.y - MIN_Y) / span * 100;
    return `<i data-y="${e.y}" style="left:${p.toFixed(2)}%" title="前${-e.y}年 领土变更"></i>`;
  }).join('');
  [...box.children].forEach(el => evtMarkEls.push(el));
})();

function highlightEventMarks(year){
  for (const el of evtMarkEls){
    el.classList.toggle('hit', Number(el.dataset.y) === year);
  }
}
(function buildTicks(){
  const box = $('ticks');
  const span = MAX_Y - MIN_Y;
  const marks = [
    { y:-770, t:'前770' },
    { y:-700, t:'前700' },
    { y:-600, t:'前600' },
    { y:-500, t:'前500' },
    { y:-403, t:'前403', era:'w' },
    { y:-300, t:'前300' },
    { y:-221, t:'前221' }
  ];
  box.innerHTML = marks.map(m=>{
    const p = (m.y - MIN_Y) / span * 100;
    const cls = m.era === 'w' ? 'era-w' : '';
    return `<span class="${cls}" style="left:${p.toFixed(2)}%">${m.t}</span>`;
  }).join('');
})();

/* ---------- 悬停提示 ---------- */
const tip = $('tip'), wrap = $('mapwrap');
gRegions.addEventListener('mousemove', e=>{
  const el = e.target.closest('.region');
  if (!el){ tip.classList.remove('on'); return; }
  const k = el.dataset.k;
  const own = ownerAt(curYear);
  const o = own[k];
  const region = REGIONS.find(r=>r.k===k);
  const sp = S[o] || S.none;
  const fate = o === 'none' ? '此时尚未归属任何诸侯'
    : (k !== o ? `此地此时属 <b style="color:${sp.c}">${sp.n}</b>` : `本地为 <b style="color:${sp.c}">${sp.n}</b> 核心区`);
  tip.innerHTML = `<h4><i style="background:${sp.c}"></i>${region.n}</h4>
    <div class="row">归属：<b style="color:${sp.c}">${sp.n}</b></div>
    <div class="fate">${fate}</div>`;
  tip.classList.add('on');
  const rect = wrap.getBoundingClientRect();
  let x = e.clientX - rect.left + 16, y = e.clientY - rect.top + 12;
  if (x + 230 > rect.width) x = e.clientX - rect.left - 236;
  if (y + 120 > rect.height) y = e.clientY - rect.top - 108;
  tip.style.left = x + 'px';
  tip.style.top = y + 'px';
});
gRegions.addEventListener('mouseleave', ()=>tip.classList.remove('on'));

/* ---------- 初始化 ---------- */
(function init(){
  setYear(MIN_Y);
})();