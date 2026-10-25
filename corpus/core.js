/*!
 * 语料层 · 命名空间
 *
 * 跨卷共享的人物、群体、地点、文献与关系都挂在这里。每个分片是一个普通脚本，
 * 直接往 CORPUS 上注册，不依赖模块系统——这样 file:// 打开也能跑。
 *
 * 加载顺序：core.js → schema.js → people/*.js → relations/*.js → 本卷 data.js
 * 页面只需要加载自己那一卷用到的人物分片，不必全量加载。
 */
(function () {
  const C = (globalThis.CORPUS = globalThis.CORPUS || {
    people: {},
    polities: {},
    places: {},
    texts: {},
    relations: [],
  });

  // 注册函数只是为了少写几层括号，不做校验；校验在 scripts/check.mjs
  C.addPeople = obj => Object.assign(C.people, obj);
  C.addPolities = obj => Object.assign(C.polities, obj);
  C.addPlaces = obj => Object.assign(C.places, obj);
  C.addTexts = obj => Object.assign(C.texts, obj);
  C.relate = (...edges) => C.relations.push(...edges);

  // 按 id 取实体，找不到就返回 null，不要抛错——页面上常常先渲染再补数据
  C.get = id =>
    C.people[id] || C.polities[id] || C.places[id] || C.texts[id] || null;

  C.kindOf = id => {
    if (C.people[id]) return 'person';
    if (C.polities[id]) return 'polity';
    if (C.places[id]) return 'place';
    if (C.texts[id]) return 'text';
    return null;
  };
})();
