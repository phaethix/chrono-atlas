<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="../assets/readme/logo-dark.svg" />
    <img src="../assets/readme/logo.svg" width="300" alt="Chrono Atlas" />
  </picture>
</p>

# 时空图集 Chrono Atlas

**二十四卷中国史，做成可交互的图。地图看空间，人物图看关系，每一条都能回到所据之书。**

<p align="center">
  <a href="https://github.com/phaethix/chrono-atlas"><img src="https://img.shields.io/github/stars/phaethix/chrono-atlas?style=flat&label=stars" alt="GitHub stars" /></a>
  <a href="https://github.com/phaethix/chrono-atlas/actions/workflows/ci.yml"><img src="https://github.com/phaethix/chrono-atlas/actions/workflows/ci.yml/badge.svg?branch=main" alt="CI" /></a>
  <a href="../LICENSE"><img src="https://img.shields.io/badge/license-MIT-green" alt="License: MIT" /></a>
  <a href="../README.md"><img src="https://img.shields.io/badge/docs-English-1C1917" alt="English documentation" /></a>
</p>

[在线浏览](https://phaethix.github.io/chrono-atlas/) · [人物与阶段](https://phaethix.github.io/chrono-atlas/demos/renwu/index.html) · [English README](../README.md)

一套按二十四卷规划的中国史图集，已有三卷做出视图。第一卷是人物与阶段图，第二卷把三代并排对照，第五卷是春秋战国的疆域动画。边界来自坐标列表，人物与关系来自全库共用的语料，每一条都注明出自哪一章。

首页列出全部二十四卷，标注其中已经做出来的三卷。这张卷目由 `catalog/manifest.js` 生成，校验脚本读的也是它，不另存一份，也就不会对不上。

<p align="center">
  <img src="../assets/readme/showcase.webp" width="100%" alt="左右对比：前 770 年有 25 个势力各自异色，前 221 年秦已吞并 38 个区域中的 35 个" />
</p>

左右两图是同一个页面的两个年份。它们之间没有一处是手绘的：每一帧都由坐标列表与年表重新生成，所以右图只是数据显示的左图的去向。

## 这是什么

历史地图通常是一张画好的图片：边界看得出，但看不出某条线为什么在那儿，也没法改。这里的每个区域边界是一组经纬度顶点，每次归属变化是年表里的一条记录。改坐标就能改边界，改年份就能改结论，改完刷新即可见效。

人物图同理。一条关系就是一条带出处的边；书里否定的说法，画成否定，而不是悄悄删掉。书里没有的线，图上也不会有。

所以每一处变化都能追溯到年份、章节与出处，也能被脚本校验。数据错了，交互做得再精致也只是把错误放大，因此每卷都配了完整性检查。

## 卷目

| 卷次 | 视图                                               | 内容                                             |
| ---- | -------------------------------------------------- | ------------------------------------------------ |
| 一   | [人物与阶段 · 从蛙到龙](../demos/renwu/)           | 15 个人物，6 个阶段，19 条关系，2 条被否定的旧说 |
| 二   | [三代 · 草创、探索、形成](../demos/sandai/)        | 3 列对照，3 步进程，1 组埃及对照                 |
| 五   | [春秋战国 · 疆域与兼并](../demos/chunqiu-zhanguo/) | 38 个区域，29 个势力，69 条事件，15 场战役       |

其余二十一卷已登记未开工：卷次、书名、分期与章目都记在 [`catalog/manifest.js`](../catalog/manifest.js)。要动手做一卷，先看 [design/0003](design/0003-full-history-architecture.md) 的流程，再看 [adding-a-demo.md](adding-a-demo.md) 的做法。

## 取材

每卷只依据一本书，且只依据那一本。第一卷依据的是易中天《祖先》：书里没出现的人、地点、年代，一律不进数据，哪怕别的书能补上。

书与旧说冲突时，以书为准，并在页面上写明。每条关系带一个 `claim` 字段——`book` 采信、`rejected` 不取——判为不取的必须写理由。规则本身，以及那个因为越界被下架的演示，记在 [design/0004](design/0004-content-must-come-from-the-book.md)。

## 快速开始

不需要安装任何东西。克隆后直接打开：

```bash
git clone https://github.com/phaethix/chrono-atlas.git
cd chrono-atlas
open index.html
```

双击 `index.html` 也可以。没有构建步骤，没有运行时依赖，不需要 Node。

想跑校验则需要 Node 18 以上：

```bash
node scripts/check.mjs   # 数据、关系、站内链接、卷目登记
npx prettier --check .   # 格式
```

两条都通过再提 PR。背后的约定见 [AGENTS.md](../AGENTS.md)。

## 目录结构

```
chrono-atlas/
├── index.html              画廊：两张卡片，然后是全部二十四卷
├── catalog/manifest.js     24 卷：卷次、书名、分期、状态、章目
├── corpus/                 跨卷共享的人物、群体、地点、文献与关系
│   ├── schema.js           实体与关系的词表
│   ├── people/<era>.js     人物分片，按时代切，不按卷切
│   └── relations/<era>.js  继位、血缘、君臣、敌对
├── demos/                  每个视图一个目录
│   ├── chunqiu-zhanguo/    疆域动画
│   │   ├── index.html      页面骨架
│   │   ├── data.js         本卷数据
│   │   ├── app.js          渲染与交互
│   │   ├── style.css       本演示样式
│   │   └── README.md       史料依据与已知简化
│   └── renwu/              人物图，同样五个文件
├── assets/site.css         画廊样式
├── docs/                   数据格式、架构决策、中文 README
└── scripts/check.mjs       零依赖自检
```

数据与渲染严格分开：`data.js` 里没有一行 DOM 操作，`app.js` 里没有一个坐标常量、没有一句史实。改数据只碰前者，改画法只碰后者。

## 技术取向

纯静态、零构建、零依赖。这样做不是排斥工具链，而是希望十年后这些页面仍然能打开。

两张图几乎不共用渲染代码——地图走多边形，人物图走边——这份重复被接受了。真正共用的是数据：一份语料、一套词表、一份卷目。理由见 [design/0003](design/0003-full-history-architecture.md)。

## 贡献

欢迎数据勘误、新的视图、渲染改进。开始之前请读 [CONTRIBUTING.md](../CONTRIBUTING.md)。

其中最重要的一条：**内容必须来自该卷所据之书**。书里没有的人、年份、关系，不要加；书里反驳的通行说法，图上跟随书，并写明这是书的主张。

## 协议

[MIT](../LICENSE)。代码与数据同一协议，用起来不必分两套规则。

史料原文与第三方历史地图的版权归属原权利人，本仓库只使用其记载的事实与公开的史实结论。
