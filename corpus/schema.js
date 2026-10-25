/*!
 * 语料层 · 词表
 *
 * 这个文件是关系与实体的唯一词表。check.mjs 读它做校验，docs/data-format.md
 * 与 docs/design/0003 引用它。加一种关系类型，先改这里，再改文档。
 *
 * 方向的约定：边从"上位 / 主动"指向"下位 / 被动"。
 *   亲 → 子、师 → 生、前任 → 继任、加害者 → 受害者。
 * 无向关系（婚姻、兄弟、同盟、敌对）只存一条，视图两侧都画。
 */
'use strict';

const SCHEMA = {
  /* 实体：四种。id 一律 <kind>-<slug>，全库唯一。 */
  entities: {
    person: {
      label: '人物',
      required: ['n'],
      optional: ['alias', 'from', 'to', 'role', 'note', 'src'],
    },
    polity: {
      label: '群体',
      required: ['n'],
      optional: ['alias', 'from', 'to', 'kind', 'note', 'src'],
    },
    place: {
      label: '地点',
      required: ['n'],
      optional: ['alias', 'lon', 'lat', 'modern', 'note', 'src'],
    },
    text: {
      label: '文献',
      required: ['n'],
      optional: ['alias', 'from', 'to', 'note', 'src'],
    },
  },

  /* 证据性质。arch 考古、legend 神话与追述、text 成文记载。 */
  src: ['arch', 'legend', 'text'],

  /* 本书的判断。book 采信，rejected 明确不取。不写就是未表态，图上不画。 */
  claims: ['book', 'rejected'],

  /* 关系：kind 决定两端能是什么实体，role 决定细分。 */
  relations: {
    parent: {
      label: '亲子',
      from: ['person'],
      to: ['person'],
      roles: ['father', 'mother', 'adoptive'],
      note: '只存亲 → 子。子 → 亲、兄弟姊妹都由视图反推，不要重复录。',
    },
    spouse: {
      label: '婚姻',
      from: ['person'],
      to: ['person'],
      roles: ['primary', 'secondary', 'later'],
      symmetric: true,
    },
    sibling: {
      label: '兄弟姊妹',
      from: ['person'],
      to: ['person'],
      roles: ['same-mother', 'different-mother', 'same-father'],
      symmetric: true,
      note: '只在史料明记同母异母时显式写；其余由共同的亲推出来。',
    },
    succession: {
      label: '继位',
      from: ['person'],
      to: ['person'],
      roles: ['stage', 'throne', 'title', 'school'],
      note: '前任 → 继任。兄终弟及与父死子继都走这一条。',
    },
    teacher: {
      label: '师承',
      from: ['person'],
      to: ['person'],
      roles: [],
    },
    ruler: {
      label: '君臣',
      from: ['person'],
      to: ['person'],
      roles: [],
      note: '君 → 臣。统治某个群体用 founder，不要混用。',
    },
    ally: { label: '同盟', from: ['person', 'polity'], to: ['person', 'polity'], roles: [], symmetric: true },
    rival: { label: '敌对', from: ['person', 'polity'], to: ['person', 'polity'], roles: [], symmetric: true },
    killed: { label: '杀', from: ['person'], to: ['person'], roles: [], note: '加害者 → 受害者。' },
    author: { label: '著述', from: ['person'], to: ['text'], roles: [] },
    founder: {
      label: '创建',
      from: ['person'],
      to: ['polity', 'text'],
      roles: [],
      note: '人 → 群体或学派。建国、立教、开宗都用它。',
    },
  },
};
