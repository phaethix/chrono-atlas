<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/readme/logo-dark.svg" />
    <img src="assets/readme/logo.svg" width="300" alt="Chrono Atlas" />
  </picture>
</p>

# Chrono Atlas

**Historical territory, population and events as interactive timeline animations. Every demo ships with data that is readable, verifiable and open to contribution.**

<p align="center">
  <a href="https://github.com/phaethix/chrono-atlas"><img src="https://img.shields.io/github/stars/phaethix/chrono-atlas?style=flat&label=stars" alt="GitHub stars" /></a>
  <a href="https://github.com/phaethix/chrono-atlas/actions/workflows/ci.yml"><img src="https://github.com/phaethix/chrono-atlas/actions/workflows/ci.yml/badge.svg?branch=main" alt="CI" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-green" alt="License: MIT" /></a>
  <a href="./docs/README.zh-CN.md"><img src="https://img.shields.io/badge/docs-%E4%B8%AD%E6%96%87-d4a017" alt="Chinese documentation" /></a>
</p>

[Browse online](https://phaethix.github.io/chrono-atlas/) · [First demo](https://phaethix.github.io/chrono-atlas/demos/chunqiu-zhanguo/index.html) · [Chinese version](docs/README.zh-CN.md)

Reproducible data and animation for how Chinese territory changed over time. The first demo covers the Spring and Autumn and Warring States periods, five and a half centuries of annexation.

<p align="center">
  <img src="assets/readme/showcase.webp" width="100%" alt="The same map at two dates: in 770 BCE, 25 polities are shown in distinct colours; by 221 BCE, Qin has absorbed 35 of the 38 regions" />
</p>

The two maps above are the same page at two dates. Nothing was redrawn by hand between them: each frame is regenerated from the coordinate list and the chronology, so the second is simply what the data says the first one became.

## What this is

A historical map is usually a finished picture. You can see the borders, but not why a line runs where it does, and you cannot change anything. The demos here work differently: each region's border is a list of longitude and latitude vertices, and each change of ownership is a row in the chronology. Move a coordinate and the border moves. Change a year and the conclusion changes. Refresh and see it.

Every territorial change therefore traces back to a year and a source, and can be checked by a script. Bad data makes a polished interface worse, not better, so every demo comes with an integrity check.

## Demos

| Demo                                                        | Period        | Content                                                   |
| ----------------------------------------------------------- | ------------- | --------------------------------------------------------- |
| [Spring and Autumn, Warring States](demos/chunqiu-zhanguo/) | 770 – 221 BCE | 38 historical regions, 29 polities, 68 events, 15 battles |

To add a new subject, see [docs/adding-a-demo.md](docs/adding-a-demo.md).

## Quick start

Nothing to install. Clone and open:

```bash
git clone https://github.com/phaethix/chrono-atlas.git
cd chrono-atlas
open index.html
```

Double-clicking `index.html` works too. There is no build step, no runtime dependency and no need for Node.

Running the checks does need Node 18 or newer:

```bash
node scripts/check.mjs
```

## Layout

```
chrono-atlas/
├── index.html              gallery page
├── demos/                  one directory per demo
│   └── chunqiu-zhanguo/
│       ├── index.html      page structure
│       ├── data.js         all data
│       ├── app.js          rendering and interaction
│       ├── style.css       demo-specific styles
│       └── README.md       sources and known simplifications
├── assets/site.css         shared site styles
├── docs/                   data format, how to add a demo, Chinese README
└── scripts/check.mjs       zero-dependency checks
```

Data and rendering are kept strictly apart: `data.js` contains no DOM operation, and `app.js` contains no coordinate constant. Changing data touches only the former, changing the drawing only the latter.

## Technical stance

Static, no build, no dependencies. This is not a rejection of tooling but a bet that these pages should still open ten years from now.

The cost is no component reuse, and no shared engine until a second demo exists. Abstraction should grow out of repetition, not out of anticipation.

## Contributing

Data corrections, new demos and rendering improvements are all welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) before starting.

The most important rule: historical changes need a source. Disputed years, boundary evidence, changing place names, all of it should say in the pull request which account was chosen and why.

## License

[MIT](LICENSE). Code and data share one license, so there are not two sets of rules to follow.

Copyright in primary sources and third-party historical maps remains with their respective owners. This repository uses only the facts they record and publicly established historical conclusions.
