/*!
 * 人物与阶段 · 视图数据
 *
 * 这一页只画《祖先》里的人：六个阶段，十五个人，一条继位的链。
 * 人物与关系在 corpus/，阶段归属与旁白在这里——它们是本书的编排，不是人物属性。
 */
'use strict';

const META = {
  id: 'renwu',
  view: 'kin',
  title: '人物与阶段',
  subtitle: '从蛙到龙',
  scope: '上古 · 传说时代',
  summary:
    '十五个人，六个阶段。一条继位的链从左走到右，没有族谱——本书说得很清楚：五帝之间没有血缘。',
  tags: ['中国', '上古', '人物', '传说'],
  sources: ['《易中天中华史》第一卷《祖先》'],
};

/* 六个阶段：点、面、面、片、圈、国 */
const STAGES = [
  { key: 'horde', name: '原始群', shape: '点', note: '分散、弱小、自生自灭。' },
  { key: 'matri', name: '母系氏族', shape: '面', note: '只知其母，蛙女神掌生育。' },
  { key: 'patri', name: '父系氏族', shape: '面', note: '蛇取代蛙，男人要父系的继承权。' },
  { key: 'tribe', name: '部落', shape: '片', note: '图腾取代生殖崇拜，牛与龙登场。' },
  { key: 'union', name: '部落联盟', shape: '圈', note: '二头政长，四岳十二牧。' },
  { key: 'state', name: '国家', shape: '国', note: '世袭取代推举。' },
];

/* 谁属于哪个阶段：本书的编排，不是人物的固有属性 */
const PLACEMENT = {
  'person-xiawa': 'horde',
  'person-nuwa': 'matri',
  'person-fuxi': 'patri',
  'person-yandi': 'tribe',
  'person-huangdi': 'tribe',
  'person-chiyou': 'tribe',
  'person-zhuanxu': 'union',
  'person-diku': 'union',
  'person-yao': 'union',
  'person-shun': 'union',
  'person-yu': 'union',
  'person-gun': 'union',
  'person-xie': 'union',
  'person-ji': 'union',
  'person-qi': 'state',
};

/* 演化进程：每步停在一个阶段的代表身上 */
const STEPS = [
  { focus: 'person-xiawa', text: '原始群是点。分散、弱小、自生自灭，不过把猿群变成了人群。' },
  { focus: 'person-nuwa', text: '氏族是面。娲读如蛙，蛙腹多子——母系社会靠"只知其母"成立。' },
  { focus: 'person-fuxi', text: '父系代兴，蛇取代蛙。请神吃饭，掌勺的变成了掌权的。' },
  { focus: 'person-yandi', text: '牧羊人自西东进，图腾由羊换牛。部落是片，炎帝为它揭幕。' },
  { focus: 'person-huangdi', text: '以氏别贵贱，用轩冕换和平。龙旗是各个图腾各取一角拼出来的。' },
  { focus: 'person-yao', text: '联盟是圈。二头政长，四岳十二牧；禅让不是礼让，是不得不让。' },
  { focus: 'person-qi', text: '禹的儿子继位，世袭取代推举。点、面、片、圈之后，国登场。' },
];
