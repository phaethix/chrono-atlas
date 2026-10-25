# AGENTS.md

在本仓库里工作的编码助手（以及人类协作者）的速查表。**硬性规则写在这里，理由写在 `CONTRIBUTING.md` 与 `docs/design/` 里。** 两者冲突时，以本文为准。

## 一句话

静态、零构建、零运行时依赖。每条史实有出处，每份数据可校验。

## 开工前与提交前

```bash
node scripts/check.mjs      # 数据完整性、枚举、阶段衔接、站内链接
npx prettier --check .      # 格式，必须全绿
```

两条都通过再提交。不通过就修，不要用注释或忽略规则绕过去。

## 不能做的事

- 不引入构建链、前端框架、运行时依赖。仓库克隆下来双击 `index.html` 就能开，这条不能破。
- 不在代码、注释、文档里加 emoji。
- 不把 `npm install` 变成跑起页面的前提。`npx` 只用于格式化与校验。
- 不提交 `.workbuddy/`、`node_modules/`、`_site/`。
- 不为了通过校验而放宽校验。`scripts/check.mjs` 是数据质量的底线，发现误报就改检查逻辑并说明，不要删规则。

## 目录职责

```
index.html            画廊，新增演示要在这里登记一张卡片
catalog/manifest.js   24 卷的卷次、书名、分期、状态、章目
corpus/               跨卷共享的人物、群体、地点、文献与关系
  core.js             命名空间与注册函数
  schema.js           实体类型、关系类型、证据等级的词表（唯一权威）
  people/<era>.js     人物分片，按时代切，不按卷切
  relations/<era>.js  关系边，与人物分片同代
demos/<id>/           一册书的视图，id 必须等于 META.id
  index.html          骨架：地图容器、侧栏、时间轴
  data.js             本卷数据，没有一行 DOM 操作
  app.js              全部画法与交互，没有一个坐标常量、没有一句史实
  style.css           本演示样式，紧凑写法，不交给 Prettier
  README.md           史料依据、异说取舍、已知简化
views/                被两卷以上用到的画法才抽到这里
assets/site.css       只服务画廊与文档页
docs/data-format.md   字段定义，唯一权威
docs/design/          架构决策记录，改结构前先读 0001—0003
scripts/check.mjs     零依赖自检
scripts/serve.mjs     本地预览
```

## 多卷与语料

24 卷的完整方案见 `docs/design/0003-full-history-architecture.md`。日常只需记住五条：

- **一个人物只建一条记录。** 先按 `alias` 查有没有，有就补别名，没有才新建。同一个人在三卷里出现三次，是这套结构最典型的腐烂方式。
- **实体 ID 永不复用。** 发布后改名只能加 `alias`，不能改 `id`，否则旧链接会指向另一个人。
- **关系只写确有出处的边。** 亲子只写「亲 → 子」，子女与兄弟由视图反推；婚姻、兄弟这类对称关系只存一条。
- **传说要标。** 谱系多半是后世追述，关系的 `src` 写 `legend`，`source` 写出处。标错一次，整套图谱就变成故事集。
- **卷只引用，不复制。** 卷的 `data.js` 里不要抄人物生卒，写 `refs` 指向语料。
- **视图分类型。** `META.view` 为 `map` 时画区域，为 `kin` 时画人物关系。不要给关系视图硬凑多边形，也不要让地图视图去读 `STEPS`。

新增一册的流程：改 `catalog/manifest.js` 的 `status` → 录实体 → 录关系 → 录事件与地图 → 写 README → 跑校验 → 改 `done`。三档状态 `planned` / `partial` / `done` 不允许跳级。

## 数据与渲染的边界

这条最容易破，破了之后这个项目就没有价值了。

- `data.js` 里只能有数据。出现 `document`、`window`、`querySelector` 就是错的。
- `app.js` 里不能有经纬度常量，也不能有史料判断。出现「前 2600 年」「仰韶」这类字面量就是错的。
- 同一件事只写一处：改边界只改 `data.js`，改画法只改 `app.js`。

## 改数据的顺序

1. 先改 `docs/data-format.md`（新字段、新枚举先写进文档）。
2. 再改 `scripts/check.mjs`（让脚本能拦住写错的字段）。
3. 最后改演示的 `data.js`，跑校验。

反过来做，文档会落后于代码，下一个贡献者就会照着过期的说明写。

## 字段的坑

- `META.id` 必须等于目录名，画廊链接与校验都依赖它。
- `INIT` 必须覆盖**每一个**区域，无主也要显式写 `none`。
- `EVENTS` 按 `y` 递增；同一年多条可以，但不要回退。
- `t` 只能是 `normal` / `shift` / `merge` / `era`；`src` 只能是 `arch` / `legend` / `text`。拼错不会报错，只会静默失效——所以必须跑校验。
- 带 `ch` 的事件不要标成 `normal`：地图会变色，但时间轴不记刻度、播放不停顿。
- `ERAS` 必须首尾对齐 `META`，中间不留缝、不重叠。
- `app.js` 不许硬编码起止年份；滑块的 `min` / `max` 也由脚本按 `META` 设置。
- 相邻多边形要共用顶点，还要避免三区各占一条边、谁也没覆盖中间那块（三角形空洞）。同色面积一大就会露出来。

## 换题材时先想清楚语义

同一套画法可以画疆域，也可以画文化区，但**用词不一样**。

- 有归属变更却不构成灭国：用 `t:'shift'`，不要借 `merge`。
- 界面词（势力版图 / 兼并档案 / 被灭 / 天下占比）走 `META.terms`，不要改 `app.js`。
- 传说与考古要能分开读：给事件标 `src`。
- 跨度差一个数量级时，写 `META.rate`，否则一趟播放要半小时。

## 格式

```bash
npx prettier --check .   # 检查
npm run format           # 修复，等价于 npx prettier --write .
```

- Prettier 版本锁在 **3.9.10**，不要顺手升级。升级会重排全仓库，把功能改动埋进格式噪音里。
- `demos/*/data.js`、`demos/*/app.js`、`demos/*/style.css` 在 `.prettierignore` 里。这是唯一的例外：这几份文件用对齐的空格排成表格，格式化会把它拆散。**不要为了「统一」把它们移出忽略列表。**

## 提交

```bash
git config core.hooksPath .githooks   # 每个克隆执行一次
```

- 提交信息只用英文，Conventional Commits：`feat:` / `fix:` / `docs:` / `refactor:` / `chore:`。
- 标题不超过 72 字符，不以句号结尾。
- 一个提交只做一件事。数据勘误与渲染调整必须分开，否则无法单独评审与回滚。
- 改动涉及异说取舍时，在 PR 里写清「取哪一说、为什么」。

## 文档语言

根 `README.md` 用英文（GitHub 与搜索引擎取它），`docs/README.zh-CN.md` 是中文版，两份要同步。其余文档、代码注释、演示文案保持中文。提交信息是唯一的英文例外。

## 本地预览

```bash
node scripts/serve.mjs        # http://localhost:8080
```

改完数据先自己看一遍：颜色有没有变、动画有没有触发、侧栏文字有没有溢出。校验脚本只管数据自洽，不管好不好看。
