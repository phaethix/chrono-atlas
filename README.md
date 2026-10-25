<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/readme/logo-dark.svg" />
    <img src="assets/readme/logo.svg" width="300" alt="Chrono Atlas" />
  </picture>
</p>

# Chrono Atlas

**Twenty-four volumes of Chinese history as interactive charts. Maps for space, people for relations, and every claim traceable to the book it came from.**

<p align="center">
  <a href="https://github.com/phaethix/chrono-atlas"><img src="https://img.shields.io/github/stars/phaethix/chrono-atlas?style=flat&label=stars" alt="GitHub stars" /></a>
  <a href="https://github.com/phaethix/chrono-atlas/actions/workflows/ci.yml"><img src="https://github.com/phaethix/chrono-atlas/actions/workflows/ci.yml/badge.svg?branch=main" alt="CI" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-green" alt="License: MIT" /></a>
  <a href="./docs/README.zh-CN.md"><img src="https://img.shields.io/badge/docs-%E4%B8%AD%E6%96%87-d4a017" alt="Chinese documentation" /></a>
</p>

[Browse online](https://phaethix.github.io/chrono-atlas/) · [People and stages](https://phaethix.github.io/chrono-atlas/demos/renwu/index.html) · [Chinese version](docs/README.zh-CN.md)

A Chinese history atlas planned as twenty-four volumes, two of which have a chart. Volume one is a chart of people and stages; volume five, from Spring and Autumn to Warring States, is a territorial animation. Borders come from coordinate lists, people and their relations from a shared corpus, and every entry names the chapter it rests on.

The gallery lists all twenty-four volumes and marks the two that exist. That list is generated from `catalog/manifest.js`, which is also what the checks read — there is no second copy to fall out of date.

<p align="center">
  <img src="assets/readme/showcase.webp" width="100%" alt="Side by side: in 770 BCE, 25 polities are shown in distinct colours; by 221 BCE, Qin has absorbed 35 of the 38 regions" />
</p>

Left and right are the same page at two dates. Nothing was redrawn by hand between them: each frame is regenerated from the coordinate list and the chronology, so the second is simply what the data says the first one became.

## What this is

A historical map is usually a finished picture. You can see the borders, but not why a line runs where it does, and you cannot change anything. Here each region's border is a list of longitude and latitude vertices, and each change of ownership is a row in the chronology. Move a coordinate and the border moves. Change a year and the conclusion changes. Refresh and see it.

The people chart works the same way. A relation is an edge with a source; relations the book rejects are drawn as rejects, not quietly dropped. And a line that is not in the book is not in the chart.

Every entry therefore traces back to a year, a chapter and a source, and can be checked by a script. Bad data makes a polished interface worse, not better, so every volume ships with an integrity check.

## The volumes

| Vol. | Chart                                                       | Content                                               |
| ---- | ----------------------------------------------------------- | ----------------------------------------------------- |
| 1    | [People and stages](demos/renwu/)                           | 15 figures, 6 stages, 19 relations, 2 rejected claims |
| 5    | [Spring and Autumn, Warring States](demos/chunqiu-zhanguo/) | 38 regions, 29 polities, 69 events, 15 battles        |

The other twenty-two are catalogued but unbuilt: number, title, period and chapter headings are recorded in [`catalog/manifest.js`](catalog/manifest.js). To add one, see [docs/design/0003](docs/design/0003-full-history-architecture.md) for the order of work and [docs/adding-a-demo.md](docs/adding-a-demo.md) for the mechanics.

## Sourcing

Each volume is built from one book, and only from that book. For volume one that book is Yi Zhongtian's _Ancestors_; a person, place or date absent from it does not enter the data, even where other sources would support it.

Where the book contradicts an older account, the book wins and the page says so. A relation carries a `claim` field — `book` or `rejected` — and a rejected claim must explain itself. The rule, and the demo that was withdrawn for breaking it, are in [docs/design/0004](docs/design/0004-content-must-come-from-the-book.md).

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
node scripts/check.mjs   # data, relations, links, volume registration
npx prettier --check .   # formatting
```

Both should pass before a pull request. The conventions behind them are in [AGENTS.md](AGENTS.md).

## Layout

```
chrono-atlas/
├── index.html              gallery: two cards, then all twenty-four volumes
├── catalog/manifest.js     the 24 volumes: number, title, period, status, chapters
├── corpus/                 people, polities, places, texts and their relations, shared
│   ├── schema.js           controlled vocabulary for entities and relations
│   ├── people/<era>.js     one record per person, sharded by era not by volume
│   └── relations/<era>.js  succession, kinship, patronage, rivalry
├── demos/                  one directory per chart
│   ├── chunqiu-zhanguo/    a territorial animation
│   │   ├── index.html      page structure
│   │   ├── data.js         this volume's data
│   │   ├── app.js          rendering and interaction
│   │   ├── style.css       demo-specific styles
│   │   └── README.md       sources and known simplifications
│   └── renwu/              a chart of people, same five files
├── assets/site.css         gallery styles
├── docs/                   data format, architecture decisions, Chinese README
└── scripts/check.mjs       zero-dependency checks
```

Data and rendering are kept strictly apart: `data.js` contains no DOM operation, and `app.js` contains no coordinate constant and no historical claim. Changing data touches only the former, changing the drawing only the latter.

## Technical stance

Static, no build, no dependencies. This is not a rejection of tooling but a bet that these pages should still open ten years from now.

The two charts share almost no rendering code — a map walks polygons, a people chart walks edges — and that duplication is accepted. What they do share is the data: one corpus, one controlled vocabulary, one volume catalog. The reasoning is in [docs/design/0003](docs/design/0003-full-history-architecture.md).

## Contributing

Data corrections, new charts and rendering improvements are all welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) before starting.

The most important rule: content must come from the volume's book. If a person, date or relationship is not there, it does not go in — and if the book argues against a familiar account, the chart follows the book and says so.

## License

[MIT](LICENSE). Code and data share one license, so there are not two sets of rules to follow.

Copyright in primary sources and third-party historical maps remains with their respective owners. This repository uses only the facts they record and publicly established historical conclusions.
