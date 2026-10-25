/*!
 * 国家 · 渲染层
 *
 * 四节横着排成标签，一次只显示一节。每节是若干并列的条目：
 * 两列（城与市）、三列（三条路、三种图腾、三代）。版式一样，内容不同。
 */
'use strict';

const $ = (id) => document.getElementById(id);

/* ---------- 卷首的五大文明 ---------- */
$('civCap').textContent = CIVS.caption;
$('civs').innerHTML = CIVS.items.map((n) => `<span>${n}</span>`).join('');

/* ---------- 标签 ---------- */
$('tabs').innerHTML = SECTIONS.map(
  (s, i) => `<button class="tab" data-i="${i}">${s.tab}</button>`,
).join('');

const tabs = [...document.querySelectorAll('.tab')];
let current = -1;
let timer = null;

function renderSection(i) {
  current = Math.max(0, Math.min(SECTIONS.length - 1, i));
  const s = SECTIONS[current];

  $('panel').innerHTML = `
    <div class="inner">
    <div class="head">
      <h2>${s.title}</h2>
      <p class="lead">${s.lead}</p>
    </div>
    <div class="items">
      ${s.items
        .map(
          (it) => `<article class="item">
            <div class="top"><h3>${it.name}</h3>${it.meta ? `<span>${it.meta}</span>` : ''}</div>
            <ul>${it.points.map((p) => `<li>${p}</li>`).join('')}</ul>
          </article>`,
        )
        .join('')}
    </div>
    <p class="note">${s.note}<em>${s.source}</em></p>
    </div>`;

  tabs.forEach((t, k) => t.classList.toggle('on', k === current));
  $('stepText').textContent = STEPS[current] ? STEPS[current].text : '';
}

/* ---------- 播放 ---------- */
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
  if (current >= SECTIONS.length - 1) renderSection(0);
  else renderSection(current + 1);
  timer = setInterval(() => {
    if (current >= SECTIONS.length - 1) {
      stop();
      return;
    }
    renderSection(current + 1);
  }, 4200);
});

$('btnPrev').addEventListener('click', () => {
  stop();
  renderSection(current - 1);
});
$('btnNext').addEventListener('click', () => {
  stop();
  renderSection(current + 1);
});
$('btnReset').addEventListener('click', () => {
  stop();
  renderSection(0);
});

$('tabs').addEventListener('click', (e) => {
  const tab = e.target.closest('.tab');
  if (!tab) return;
  stop();
  renderSection(Number(tab.dataset.i));
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight') {
    e.preventDefault();
    stop();
    renderSection(current + 1);
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault();
    stop();
    renderSection(current - 1);
  } else if (e.code === 'Space') {
    e.preventDefault();
    $('btnPlay').click();
  }
});

/* 链接里带 #3 时直接到第三节 */
const hash = Number((location.hash || '').replace('#', ''));
renderSection(hash >= 1 && hash <= SECTIONS.length ? hash - 1 : 0);
