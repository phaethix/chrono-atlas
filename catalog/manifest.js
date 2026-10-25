/*!
 * 全书卷目 · 24 卷
 *
 * 这张表是"要装多少东西"的唯一清单：卷次、书名、分期、录入状态、章目、
 * 以及该卷已有的视图（演示目录名）。页面与校验脚本都读它，不要另抄一份。
 *
 * 字段：
 *   no        卷次，1—24，唯一
 *   id        演示目录名，等于 demos/<id>/；没有演示时不写
 *   title     书名，以纸质版为准
 *   period    分期，取自各卷图书在版编目（CIP）的时代标引
 *   status    planned 未录入 / partial 部分录入 / done 已成视图
 *   views     该卷涉及的演示目录名，可以为空，也可以多个
 *   note      补充说明，只在需要时写
 *   chapters  章目，取自电子版目录，只保留"第X章"，扉页与附录不入
 *
 * 新增一册：把对应条目的 status 改成 partial，补 id 与 views，
 * 再按 docs/design/0003 的流程录实体与事件。不要改动卷次。
 */
'use strict';

const VOLUMES = [
  {
    no: 1,
    title: '祖先',
    period: '史前',
    status: 'done',
    views: ['renwu'],
    note: '只覆盖人物与阶段；制度、器物与论证尚未录入。',
    chapters: ['第一章 夏娃造反', '第二章 女娲登坛', '第三章 伏羲设局', '第四章 炎帝东征', '第五章 黄帝出场', '第六章 尧舜下课'],
  },
  {
    no: 2,
    title: '国家',
    period: '夏、商',
    status: 'planned',
    views: [],
    chapters: ['第一章 国家与人', '第二章 城市跟你说', '第三章 从雅典到费城', '第四章 谢绝宗教', '第五章 告别图腾', '第六章 闯他一回红灯'],
  },
  {
    no: 3,
    title: '奠基者',
    period: '西周',
    status: 'planned',
    views: [],
    chapters: ['第一章 生于忧患', '第二章 定音鼓', '第三章 西周大封建', '第四章 天下为家', '第五章 两个基本点', '第六章 根本所在'],
  },
  {
    no: 4,
    title: '青春志',
    period: '春秋',
    status: 'partial',
    views: [],
    chapters: ['第一章 刺客', '第二章 情人', '第三章 战士', '第四章 人臣', '第五章 使节', '第六章 鬼神'],
  },
  {
    no: 5,
    title: '从春秋到战国',
    id: 'chunqiu-zhanguo',
    period: '春秋战国',
    status: 'partial',
    views: ['chunqiu-zhanguo'],
    note: '疆域视图覆盖第四至第六卷，人物与事件尚未按卷录入。',
    chapters: ['第一章 祸起萧墙', '第二章 五侯争霸', '第三章 南方崛起', '第四章 礼坏乐崩', '第五章 商鞅变法', '第六章 合纵连横'],
  },
  {
    no: 6,
    title: '百家争鸣',
    period: '战国 · 先秦诸子',
    status: 'partial',
    views: [],
    chapters: ['第一章 这世界有救吗', '第二章 哪个社会好', '第三章 君权，民权，人权', '第四章 活着为什么', '第五章 生存之道', '第六章 制度与人性'],
  },
  {
    no: 7,
    title: '秦并天下',
    period: '秦',
    status: 'planned',
    views: [],
    chapters: ['第一章 始皇革命', '第二章 陈胜造反', '第三章 项羽争雄', '第四章 刘邦称帝', '第五章 大秦没死'],
  },
  {
    no: 8,
    title: '汉武的帝国',
    period: '西汉',
    status: 'planned',
    views: [],
    chapters: ['第一章 帝国之初', '第二章 独尊儒术', '第三章 高度集权', '第四章 官治天下', '第五章 是非功过'],
  },
  {
    no: 9,
    title: '两汉两罗马',
    period: '两汉与罗马',
    status: 'planned',
    views: [],
    chapters: ['第一章 世界', '第二章 历史', '第三章 制度', '第四章 信仰', '第五章 理念'],
  },
  {
    no: 10,
    title: '三国纪',
    period: '三国',
    status: 'planned',
    views: [],
    chapters: ['第一章 袁绍揭幕', '第二章 魏武挥鞭', '第三章 孙刘联盟', '第四章 三分天下', '第五章 武侯治蜀', '第六章 桃园惊梦'],
  },
  {
    no: 11,
    title: '魏晋风度',
    period: '魏晋',
    status: 'planned',
    views: [],
    chapters: ['第一章 时代', '第二章 人物', '第三章 精神', '第四章 风尚', '第五章 价值观'],
  },
  {
    no: 12,
    title: '南朝，北朝',
    period: '南北朝',
    status: 'planned',
    views: [],
    chapters: ['第一章 大换血', '第二章 鲜卑人', '第三章 南朝试验田', '第四章 宗教问题', '第五章 再造新文明'],
  },
  {
    no: 13,
    title: '隋唐定局',
    period: '隋唐',
    status: 'planned',
    views: [],
    chapters: ['第一章 隋炀帝', '第二章 唐太宗', '第三章 官僚政治', '第四章 混血王朝', '第五章 世界帝国'],
  },
  {
    no: 14,
    title: '禅宗兴起',
    period: '唐 · 禅宗',
    status: 'planned',
    views: [],
    chapters: ['第一章 拜占庭', '第二章 阿拉伯', '第三章 禅', '第四章 佛教中国化', '第五章 大洗牌'],
  },
  {
    no: 15,
    title: '女皇武则天',
    period: '唐 · 武周',
    status: 'planned',
    views: [],
    chapters: ['第一章 夺宫', '第二章 弄权', '第三章 血洗', '第四章 变脸', '第五章 无字碑'],
  },
  {
    no: 16,
    title: '安史之乱',
    period: '唐 · 安史之乱',
    status: 'planned',
    views: [],
    chapters: ['第一章 开元新政', '第二章 潜在危机', '第三章 动乱始末', '第四章 走向沉沦', '第五章 唐诗精神'],
  },
  {
    no: 17,
    title: '大宋革新',
    period: '北宋',
    status: 'planned',
    views: [],
    chapters: ['第一章 新生活', '第二章 新政权', '第三章 新经济', '第四章 新形势', '第五章 新战略'],
  },
  {
    no: 18,
    title: '王安石变法',
    period: '北宋 · 熙宁',
    status: 'planned',
    views: [],
    chapters: ['第一章 箭在弦上', '第二章 一意孤行', '第三章 乾坤逆转', '第四章 教训所在'],
  },
  {
    no: 19,
    title: '风流南宋',
    period: '南宋',
    status: 'planned',
    views: [],
    chapters: ['第一章 南宋始末', '第二章 繁华港湾', '第三章 理学是非', '第四章 宋词韵味'],
  },
  {
    no: 20,
    title: '铁血蒙元',
    period: '元',
    status: 'planned',
    views: [],
    chapters: ['第一章 成吉思汗', '第二章 征服世界', '第三章 大元王朝', '第四章 崖山之后'],
  },
  {
    no: 21,
    title: '朱明王朝',
    period: '明',
    status: 'planned',
    views: [],
    chapters: ['第一章 太祖改制', '第二章 燕王定鼎', '第三章 变态统治', '第四章 多样世俗', '第五章 新型文艺'],
  },
  {
    no: 22,
    title: '严嵩与张居正',
    period: '明 · 嘉靖至万历',
    status: 'planned',
    views: [],
    chapters: ['第一章 嘉靖继统', '第二章 严嵩倒台', '第三章 海瑞反腐', '第四章 张居正治国', '第五章 万历谢幕'],
  },
  {
    no: 23,
    title: '大航海时代',
    period: '明初至清中期',
    status: 'planned',
    views: [],
    chapters: ['第一章 郑和远航', '第二章 西学东渐', '第三章 康熙答题', '第四章 黛玉葬花'],
  },
  {
    no: 24,
    title: '命运和选择',
    period: '通史综论',
    status: 'planned',
    views: [],
    chapters: ['第一章 邦国时代', '第二章 帝国之初', '第三章 巅峰与定型', '第四章 问苍茫大地'],
  },
];
