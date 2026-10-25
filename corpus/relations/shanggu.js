/*!
 * 语料 · 上古的关系边
 *
 * 只写"亲 → 子"，不写"子 → 亲"；兄弟与子孙由视图反推。
 * 每条边都带 src 与 source：谱系是《史记》写下来的，不是挖出来的。
 */
'use strict';

CORPUS.relate(
  // 婚姻
  { from: 'person-huangdi', to: 'person-leizu', kind: 'spouse', role: 'primary', src: 'legend', source: '《史记·五帝本纪》' },
  { from: 'person-changyi', to: 'person-changpu', kind: 'spouse', role: 'primary', src: 'legend', source: '《史记·五帝本纪》' },

  // 黄帝一系
  { from: 'person-huangdi', to: 'person-xuanxiao', kind: 'parent', role: 'father', src: 'legend', source: '《史记·五帝本纪》' },
  { from: 'person-huangdi', to: 'person-changyi', kind: 'parent', role: 'father', src: 'legend', source: '《史记·五帝本纪》' },
  { from: 'person-leizu', to: 'person-xuanxiao', kind: 'parent', role: 'mother', src: 'legend', source: '《史记·五帝本纪》' },
  { from: 'person-leizu', to: 'person-changyi', kind: 'parent', role: 'mother', src: 'legend', source: '《史记·五帝本纪》' },

  // 昌意 → 颛顼
  { from: 'person-changyi', to: 'person-zhuanxu', kind: 'parent', role: 'father', src: 'legend', source: '《史记·五帝本纪》' },
  { from: 'person-changpu', to: 'person-zhuanxu', kind: 'parent', role: 'mother', src: 'legend', source: '《史记·五帝本纪》' },

  // 玄嚣 → 蟜极 → 帝喾
  { from: 'person-xuanxiao', to: 'person-qiaoji', kind: 'parent', role: 'father', src: 'legend', source: '《史记·五帝本纪》' },
  { from: 'person-qiaoji', to: 'person-diku', kind: 'parent', role: 'father', src: 'legend', source: '《史记·五帝本纪》' },

  // 帝喾诸子：挚、尧、契、弃
  { from: 'person-diku', to: 'person-zhi', kind: 'parent', role: 'father', src: 'legend', source: '《史记·五帝本纪》' },
  { from: 'person-diku', to: 'person-yao', kind: 'parent', role: 'father', src: 'legend', source: '《史记·五帝本纪》' },
  { from: 'person-diku', to: 'person-qi', kind: 'parent', role: 'father', src: 'legend', source: '《史记·殷本纪》' },
  { from: 'person-diku', to: 'person-ji', kind: 'parent', role: 'father', src: 'legend', source: '《史记·周本纪》' },

  // 颛顼 → 穷蝉 → … → 瞽叟 → 舜
  { from: 'person-zhuanxu', to: 'person-qiongchan', kind: 'parent', role: 'father', src: 'legend', source: '《史记·五帝本纪》' },
  { from: 'person-qiongchan', to: 'person-jingkang', kind: 'parent', role: 'father', src: 'legend', source: '《史记·五帝本纪》' },
  { from: 'person-jingkang', to: 'person-juwang', kind: 'parent', role: 'father', src: 'legend', source: '《史记·五帝本纪》' },
  { from: 'person-juwang', to: 'person-qiaoniu', kind: 'parent', role: 'father', src: 'legend', source: '《史记·五帝本纪》' },
  { from: 'person-qiaoniu', to: 'person-gusou', kind: 'parent', role: 'father', src: 'legend', source: '《史记·五帝本纪》' },
  { from: 'person-gusou', to: 'person-shun', kind: 'parent', role: 'father', src: 'legend', source: '《史记·五帝本纪》' },

  // 颛顼 → 鲧 → 禹
  { from: 'person-zhuanxu', to: 'person-gun', kind: 'parent', role: 'father', src: 'legend', source: '《史记·夏本纪》' },
  { from: 'person-gun', to: 'person-yu', kind: 'parent', role: 'father', src: 'legend', source: '《史记·夏本纪》' },

  // 兄弟：只在史料明记同母异母处写
  { from: 'person-xuanxiao', to: 'person-changyi', kind: 'sibling', role: 'same-mother', src: 'legend', source: '《史记·五帝本纪》' },
  { from: 'person-zhi', to: 'person-yao', kind: 'sibling', role: 'different-mother', src: 'legend', source: '《史记·五帝本纪》' },
  { from: 'person-qi', to: 'person-ji', kind: 'sibling', role: 'different-mother', src: 'legend', source: '《史记》殷周本纪' },

  // 继位：孙继祖、族孙继位、父死子继、兄终弟及、禅让，都走同一条边
  { from: 'person-huangdi', to: 'person-zhuanxu', kind: 'succession', role: 'throne', src: 'legend', source: '《史记·五帝本纪》', note: '孙继祖位。黄帝崩，昌意之子高阳立。' },
  { from: 'person-zhuanxu', to: 'person-diku', kind: 'succession', role: 'throne', src: 'legend', source: '《史记·五帝本纪》', note: '族孙继位。颛顼崩，玄嚣之孙高辛立。' },
  { from: 'person-diku', to: 'person-zhi', kind: 'succession', role: 'throne', src: 'legend', source: '《史记·五帝本纪》', note: '父死子继。' },
  { from: 'person-zhi', to: 'person-yao', kind: 'succession', role: 'throne', src: 'legend', source: '《史记·五帝本纪》', note: '兄终弟及。挚立而不善，尧代之。' },
  { from: 'person-yao', to: 'person-shun', kind: 'succession', role: 'throne', src: 'legend', source: '《史记·五帝本纪》', note: '禅让。' },
  { from: 'person-shun', to: 'person-yu', kind: 'succession', role: 'throne', src: 'legend', source: '《史记·五帝本纪》', note: '禅让。' },

  // 君臣
  { from: 'person-shun', to: 'person-yu', kind: 'ruler', src: 'legend', source: '《史记·五帝本纪》' },

  // 战争：不建血缘边的两个人，也能有关系
  { from: 'person-huangdi', to: 'person-yandi', kind: 'rival', src: 'legend', source: '《史记·五帝本纪》', note: '阪泉之战。' },
  { from: 'person-huangdi', to: 'person-chiyou', kind: 'rival', src: 'legend', source: '《史记·五帝本纪》', note: '涿鹿之战。' },
  { from: 'person-huangdi', to: 'person-chiyou', kind: 'killed', src: 'legend', source: '《史记·五帝本纪》' }
);
