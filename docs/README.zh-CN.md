<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="../assets/readme/logo-dark.svg" />
    <img src="../assets/readme/logo.svg" width="300" alt="Chrono Atlas" />
  </picture>
</p>

# 时空图集 Chrono Atlas

**把历史的疆域、人口与事件做成可交互的时间轴动画。每个演示都附一份可读、可校验、可贡献的数据。**

<p align="center">
  <a href="https://github.com/phaethix/chrono-atlas"><img src="https://img.shields.io/github/stars/phaethix/chrono-atlas?style=flat&label=stars" alt="GitHub stars" /></a>
  <a href="https://github.com/phaethix/chrono-atlas/actions/workflows/ci.yml"><img src="https://github.com/phaethix/chrono-atlas/actions/workflows/ci.yml/badge.svg?branch=main" alt="CI" /></a>
  <a href="../LICENSE"><img src="https://img.shields.io/badge/license-MIT-green" alt="License: MIT" /></a>
  <a href="../README.md"><img src="https://img.shields.io/badge/docs-English-1C1917" alt="English documentation" /></a>
</p>

中国历史疆域变迁的可复现数据与动画。第一个演示是春秋战国，五百五十年间的兼并。

<p align="center">
  <img src="../assets/readme/showcase.webp" width="100%" alt="同一张地图的两个年份：前 770 年有 25 个势力并各自异色，前 221 年秦已吞并 38 个区域中的 35 个" />
</p>

上面两张图是同一个页面的两个年份。它们之间没有一处是手绘的：每一帧都由坐标列表与年表重新生成，所以后一张图只是数据显示的前一张图的去向。

[在线浏览](https://phaethix.github.io/chrono-atlas/) · [第一个演示](https://phaethix.github.io/chrono-atlas/demos/chunqiu-zhanguo/index.html) · [English README](../README.md)

## 这是什么

历史地图通常是一张画好的图片：边界看得出，但看不出某条线为什么在那儿，也没法改。这里的每个区域边界是一组经纬度顶点，每次归属变化是年表里的一条记录。改坐标就能改边界，改年份就能改结论，改完刷新即可见效。

所以每一处版图变化都能追溯到年份与史料，也能被脚本校验。数据错了，交互做得再精致也只是把错误放大，因此每个演示都配了完整性检查。

## 演示

| 演示                                               | 区间            | 内容                                           |
| -------------------------------------------------- | --------------- | ---------------------------------------------- |
| [春秋战国 · 疆域与兼并](../demos/chunqiu-zhanguo/) | 前 770 — 前 221 | 38 个历史区域，29 个势力，68 条事件，15 场战役 |

想加新题材，见 [adding-a-demo.md](adding-a-demo.md)。

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
node scripts/check.mjs
```

## 目录结构

```
chrono-atlas/
├── index.html              画廊首页
├── demos/                  每个演示一个目录
│   └── chunqiu-zhanguo/
│       ├── index.html      页面骨架
│       ├── data.js         全部数据
│       ├── app.js          渲染与交互
│       ├── style.css       本演示样式
│       └── README.md       史料依据与已知简化
├── assets/site.css         站点级共享样式
├── docs/                   数据格式、新增演示的说明、中文 README
└── scripts/check.mjs       零依赖自检
```

数据与渲染严格分开：`data.js` 里没有一行 DOM 操作，`app.js` 里没有一个坐标常量。改数据只碰前者，改画法只碰后者。

## 技术取向

纯静态、零构建、零依赖。这样做不是排斥工具链，而是希望十年后这些页面仍然能打开。

代价是没有组件复用，第二个演示出现前也不打算抽公共引擎。抽象应当从重复中长出来，而不是从预判中。

## 贡献

欢迎贡献数据勘误、新的演示、或者渲染改进。开始之前请读 [CONTRIBUTING.md](../CONTRIBUTING.md)。

其中最重要的一条：**史实类改动请附出处**。年份异说、边界依据、地名沿革，都请在 PR 里说明取哪一说、为什么。

## 协议

[MIT](../LICENSE)。代码与数据同一协议，用起来不必分两套规则。

史料原文与第三方历史地图的版权归属原权利人，本仓库只使用其记载的事实与公开的史实结论。
