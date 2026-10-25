/*!
 * 语料 · 上古的关系边
 *
 * 每条边都带两个判断：
 *   claim: 'book'      本书采信
 *   claim: 'rejected'  本书明确不取，只在图上留一个叉，用来对照
 *
 * 本书的立场是先破后立：五帝之间没有血缘，禅让不是礼让，鲧是禹的母亲不是父亲。
 * 所以这张图上没有族谱，只有一条继位的链，和几组被否定的旧说。
 */
'use strict';

CORPUS.relate(
  // 阶段代表：点 → 面 → 面 → 片 → 圈 → 国
  { from: 'person-xiawa', to: 'person-nuwa', kind: 'succession', role: 'stage', claim: 'book', src: 'legend', source: '第一章' },
  { from: 'person-nuwa', to: 'person-fuxi', kind: 'succession', role: 'stage', claim: 'book', src: 'legend', source: '第三章' },
  { from: 'person-fuxi', to: 'person-yandi', kind: 'succession', role: 'stage', claim: 'book', src: 'legend', source: '第四章' },
  { from: 'person-yandi', to: 'person-huangdi', kind: 'succession', role: 'stage', claim: 'book', src: 'legend', source: '第五章' },

  // 五帝先后：本书说他们无血缘，只有先后
  { from: 'person-huangdi', to: 'person-zhuanxu', kind: 'succession', role: 'throne', claim: 'book', src: 'legend', source: '第六章' },
  { from: 'person-zhuanxu', to: 'person-diku', kind: 'succession', role: 'throne', claim: 'book', src: 'legend', source: '第六章' },
  { from: 'person-diku', to: 'person-yao', kind: 'succession', role: 'throne', claim: 'book', src: 'legend', source: '第六章' },
  { from: 'person-yao', to: 'person-shun', kind: 'succession', role: 'throne', claim: 'book', src: 'legend', source: '第六章', note: '禅让。本书的解释是"不得不让"。' },
  { from: 'person-shun', to: 'person-yu', kind: 'succession', role: 'throne', claim: 'book', src: 'legend', source: '第六章' },
  { from: 'person-yu', to: 'person-qi', kind: 'succession', role: 'throne', claim: 'book', src: 'legend', source: '第六章' },

  // 两场仗
  { from: 'person-huangdi', to: 'person-yandi', kind: 'rival', claim: 'book', src: 'legend', source: '第五章', note: '阪泉之战。' },
  { from: 'person-huangdi', to: 'person-chiyou', kind: 'rival', claim: 'book', src: 'legend', source: '第五章', note: '涿鹿之战。' },
  { from: 'person-huangdi', to: 'person-chiyou', kind: 'killed', claim: 'book', src: 'legend', source: '第五章' },

  // 本书的两个翻案
  { from: 'person-gun', to: 'person-yu', kind: 'parent', role: 'mother', claim: 'book', src: 'legend', source: '后记', note: '鲧是禹的母亲。鱼崇拜在前，蛇崇拜在后，父子之说讲不通。' },
  { from: 'person-yu', to: 'person-qi', kind: 'parent', role: 'father', claim: 'book', src: 'legend', source: '第六章' },

  // 联盟的部长
  { from: 'person-yao', to: 'person-xie', kind: 'ruler', claim: 'book', src: 'legend', source: '第六章', note: '民政部长。' },
  { from: 'person-yao', to: 'person-ji', kind: 'ruler', claim: 'book', src: 'legend', source: '第六章', note: '农业部长。' },

  // 本书明确不取的两说，留着当对照
  { from: 'person-nuwa', to: 'person-fuxi', kind: 'spouse', claim: 'rejected', src: 'legend', source: '后记', note: '人首蛇身的夫妻或兄妹之说，本书判为谎言。' },
  { from: 'person-yandi', to: 'person-huangdi', kind: 'sibling', claim: 'rejected', src: 'legend', source: '第四章', note: '《国语》称炎黄同出少典，本书不取。' }
);
