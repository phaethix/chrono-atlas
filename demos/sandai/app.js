/*!
 * 三代 · 渲染层
 *
 * 一页三列：夏、商、周。列与列之间是取代，顶上是从点到国的序列，底下是
 * 埃及与中国处理图腾的两条岔路。全部内容来自《国家》一卷。
 */
'use strict';

const $ = (id) => document.getElementById(id);

/* ---------- 顶部序列 ---------- */
(function ribbon() {
  const box = $('ribbon');
  box.innerHTML = RIBBON.map(
    (s, i) =>
      `${i ? '<i class="sep"></i>' : ''}<div class="chip${s.on ? ' on' : ''}">
        <b>${s.shape}</b><span>${s.name}</span>
      </div>`,
  ).join('');
})();

/* ---------- 三列 ---------- */
(function columns() {
  const box = $('cols');
  const parts = [];

  COLUMNS.forEach((c, i) => {
    parts.push(`
      <article class="card" data-key="${c.key}" tabindex="0">
        <div class="tag">${c.tag}</div>
        <h2>${c.name}</h2>
        <p class="lead">${c.lead}</p>
        <dl>
          ${c.facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}
        </dl>
        <p class="note">${c.note}<em>${c.source}</em></p>
      </article>`);

    const link = LINKS[i];
    if (link) {
      parts.push(`<div class="arrow"><span>${link.label}</span><i>→</i></div>`);
    }
  });

  box.innerHTML = parts.join('');
})();

/* ---------- 底部对照 ---------- */
(function contrast() {
  const c = CONTRAST;
  $('contrast').innerHTML = `
    <h3>${c.title}</h3>
    <div class="pair">
      <div class="pane">
        <h4>${c.left.name}<em>${c.left.source}</em></h4>
        <p>${c.left.text}</p>
      </div>
      <div class="vs">对<br />照</div>
      <div class="pane">
        <h4>${c.right.name}<em>${c.right.source}</em></h4>
        <p>${c.right.text}</p>
      </div>
    </div>`;
})();

/* ---------- 演化进程 ---------- */
let stepIndex = -1;
let timer = null;
const cards = [...document.querySelectorAll('.card')];

function clearOn() {
  for (const card of cards) card.classList.remove('on');
}

function goStep(i) {
  stepIndex = Math.max(0, Math.min(STEPS.length - 1, i));
  clearOn();
  const card = cards.find((el) => el.dataset.key === STEPS[stepIndex].focus);
  if (card) card.classList.add('on');
  $('stepText').textContent = STEPS[stepIndex].text;
}

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
  }, 2600);
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
  clearOn();
  $('stepText').textContent = '按「播放」，看三代怎么一步步变成国家。';
});

/* 点一列看它自己的说明 */
$('cols').addEventListener('click', (e) => {
  const card = e.target.closest('.card');
  if (!card) return;
  stop();
  clearOn();
  card.classList.add('on');
  const col = COLUMNS.find((c) => c.key === card.dataset.key);
  if (col) $('stepText').textContent = `${col.name}：${col.lead}${col.note}`;
  stepIndex = -1;
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

/* 链接里带 #2 这类片段时，直接停在那一步 */
const hashStep = Number((location.hash || '').replace('#', ''));
if (hashStep >= 1 && hashStep <= STEPS.length) goStep(hashStep - 1);
