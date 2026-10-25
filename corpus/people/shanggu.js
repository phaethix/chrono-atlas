/*!
 * 语料 · 上古（传说时代）
 *
 * 五帝谱系。全部出自《史记·五帝本纪》，属后世追述，故 src 一律为 legend：
 * 这不是"挖出来的事实"，是"被写下来的谱系"。两者在图上必须能分开。
 *
 * 收录范围到夏禹为止。商契、周弃放在这里，是因为《史记》把他们接在帝喾名下——
 * 接得成不成立，正是第一卷要读者自己判断的事。
 */
'use strict';

CORPUS.addPeople({
  'person-huangdi': {
    n: '黄帝',
    alias: ['轩辕', '轩辕氏', '有熊氏', '帝轩'],
    role: '传说中的部落联合体首领',
    note: '姬姓，号轩辕氏。《史记》以为五帝之首。生卒无确年，传统纪年（前 2698—前 2599）为后世推算，不取。',
    src: 'legend',
  },
  'person-leizu': {
    n: '嫘祖',
    alias: ['西陵氏之女'],
    role: '黄帝正妃',
    note: '《史记》称其生玄嚣、昌意，二子之后皆有天下。',
    src: 'legend',
  },
  'person-xuanxiao': {
    n: '玄嚣',
    alias: ['青阳'],
    role: '黄帝长子',
    note: '降居江水。其孙为帝喾，故商周以后的帝王世系多由此分支。',
    src: 'legend',
  },
  'person-changyi': {
    n: '昌意',
    role: '黄帝次子',
    note: '降居若水，娶蜀山氏女昌仆，生颛顼。',
    src: 'legend',
  },
  'person-changpu': {
    n: '昌仆',
    alias: ['蜀山氏女'],
    role: '昌意之妻',
    src: 'legend',
  },
  'person-zhuanxu': {
    n: '颛顼',
    alias: ['高阳', '帝颛顼'],
    role: '五帝之二',
    note: '昌意之子、黄帝之孙。鲧与舜两支都从他这里分出。',
    src: 'legend',
  },
  'person-qiaoji': {
    n: '蟜极',
    role: '玄嚣之子',
    src: 'legend',
  },
  'person-diku': {
    n: '帝喾',
    alias: ['高辛', '帝喾高辛'],
    role: '五帝之三',
    note: '蟜极之子、玄嚣之孙。尧、挚、契、弃皆其子，商周两族的始祖都挂在他名下。',
    src: 'legend',
  },
  'person-zhi': {
    n: '挚',
    alias: ['帝挚'],
    role: '帝喾之子，先立后废',
    note: '《史记》称其"立，不善"，弟放勋代之。',
    src: 'legend',
  },
  'person-yao': {
    n: '尧',
    alias: ['放勋', '唐尧'],
    role: '五帝之四',
    note: '帝喾之子。传统以为都平阳，陶寺遗址常被比附，但无文字自证。',
    src: 'legend',
  },
  'person-qiongchan': {
    n: '穷蝉',
    role: '颛顼之子',
    note: '舜的世系由此下传五代至瞽叟。',
    src: 'legend',
  },
  'person-jingkang': { n: '敬康', role: '穷蝉之子', src: 'legend' },
  'person-juwang': { n: '句望', role: '敬康之子', src: 'legend' },
  'person-qiaoniu': { n: '桥牛', role: '句望之子', src: 'legend' },
  'person-gusou': {
    n: '瞽叟',
    role: '桥牛之子，舜之父',
    note: '《史记》称其顽，与后妻及少子象一再谋害舜。',
    src: 'legend',
  },
  'person-shun': {
    n: '舜',
    alias: ['重华', '虞舜'],
    role: '五帝之五',
    note: '颛顼七世孙，与尧相差四代，却继尧之位。辈分与继位顺序对不上，是追述拼接的痕迹。',
    src: 'legend',
  },
  'person-gun': {
    n: '鲧',
    role: '颛顼之子，禹之父',
    note: '治水无功，殛于羽山。',
    src: 'legend',
  },
  'person-yu': {
    n: '禹',
    alias: ['文命', '夏禹', '大禹'],
    role: '部落联盟末任首领，夏之始祖',
    note: '鲧之子、颛顼之孙。治水与铸鼎之事见于后世追述。',
    src: 'legend',
  },
  'person-qi': {
    n: '契',
    alias: ['殷契'],
    role: '商之始祖',
    note: '母曰简狄，有娀氏之女。《史记》系为帝喾次妃所生。',
    src: 'legend',
  },
  'person-ji': {
    n: '弃',
    alias: ['后稷', '周弃'],
    role: '周之始祖',
    note: '母曰姜原，有邰氏之女。《史记》系为帝喾元妃所生。',
    src: 'legend',
  },
  'person-yandi': {
    n: '炎帝',
    alias: ['神农氏', '姜姓'],
    role: '传说中的部落首领',
    note: '姜姓。《国语》称炎黄同出少典，本书不取；此处不建血缘边，免得把兄弟之说当成事实。',
    src: 'legend',
  },
  'person-chiyou': {
    n: '蚩尤',
    alias: ['九黎之君'],
    role: '九黎部落总酋长',
    note: '涿鹿之战败于黄帝，死后被奉为战神"兵主"。',
    src: 'legend',
  },
});
