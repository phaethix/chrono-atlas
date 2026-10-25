<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/readme/logo-dark.svg" />
    <img src="assets/readme/logo.svg" width="300" alt="Chrono Atlas" />
  </picture>
</p>

# Chrono Atlas

**Chinese history as data you can read: territory, people, kinship and events. Every demo ships with sources and integrity checks, and every fact carries its evidence.**

<p align="center">
  <a href="https://github.com/phaethix/chrono-atlas"><img src="https://img.shields.io/github/stars/phaethix/chrono-atlas?style=flat&label=stars" alt="GitHub stars" /></a>
  <a href="https://github.com/phaethix/chrono-atlas/actions/workflows/ci.yml"><img src="https://github.com/phaethix/chrono-atlas/actions/workflows/ci.yml/badge.svg?branch=main" alt="CI" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-green" alt="License: MIT" /></a>
  <a href="./docs/README.zh-CN.md"><img src="https://img.shields.io/badge/docs-%E4%B8%AD%E6%96%87-d4a017" alt="Chinese documentation" /></a>
</p>

[Browse online](https://phaethix.github.io/chrono-atlas/) · [First demo](https://phaethix.github.io/chrono-atlas/demos/chunqiu-zhanguo/index.html) · [Chinese version](docs/README.zh-CN.md)

Reproducible data and animation for Chinese history, planned as 24 volumes. The first two are the Neolithic and the Spring and Autumn–Warring States periods. Borders come from coordinate lists; people and their relations live once in a shared corpus, and every volume that mentions them points at the same record.

The atlas is moving from territory alone to the full span of the twenty-four volumes: who was whose son, who succeeded whom, who studied under whom, and which of those claims rest on excavation rather than on a later retelling. The plan is in [docs/design/0003](docs/design/0003-full-history-architecture.md).

<p align="center">
  <img src="assets/readme/showcase.webp" width="100%" alt="Side by side: in 770 BCE, 25 polities are shown in distinct colours; by 221 BCE, Qin has absorbed 35 of the 38 regions" />
</p>

Left and right are the same page at two dates. Nothing was redrawn by hand between them: each frame is regenerated from the coordinate list and the chronology, so the second is simply what the data says the first one became.

## What this is

A historical map is usually a finished picture. You can see the borders, but not why a line runs where it does, and you cannot change anything. The demos here work differently: each region's border is a list of longitude and latitude vertices, and each change of ownership is a row in the chronology. Move a coordinate and the border moves. Change a year and the conclusion changes. Refresh and see it.

Every territorial change therefore traces back to a year and a source, and can be checked by a script. Bad data makes a polished interface worse, not better, so every demo comes with an integrity check.

## Demos

| Demo                                                        | Period          | Content                                                    |
| ----------------------------------------------------------- | --------------- | ---------------------------------------------------------- |
| [Spring and Autumn, Warring States](demos/chunqiu-zhanguo/) | 770 – 221 BCE   | 38 historical regions, 29 polities, 68 events, 15 battles  |
| [Ancestors](demos/zuxian/)                                  | 7000 – 1900 BCE | 39 regions, 17 archaeological cultures, 46 events, 9 sites |

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
node scripts/check.mjs   # data integrity, links, demo registration
npx prettier --check .   # formatting
```

Both should pass before a pull request. The conventions behind them are in [AGENTS.md](AGENTS.md).

## Layout

```
chrono-atlas/
├── index.html              gallery page
├── catalog/manifest.js     the 24 volumes: number, title, period, status, chapters
├── corpus/                 people, polities, places, texts and their relations, shared
│   ├── schema.js           controlled vocabulary for entities and relations
│   ├── people/<era>.js     one record per person, sharded by era not by volume
│   └── relations/<era>.js  kinship, succession, teachers, rivals
├── demos/                  one directory per volume's view
│   ├── chunqiu-zhanguo/
│   │   ├── index.html      page structure
│   │   ├── data.js         all data for this volume
│   │   ├── app.js          rendering and interaction
│   │   ├── style.css       demo-specific styles
│   │   └── README.md       sources and known simplifications
│   └── zuxian/
│       └── …               same five files
├── assets/site.css         shared site styles
├── docs/                   data format, architecture decisions, Chinese README
└── scripts/check.mjs       zero-dependency checks
```

Data and rendering are kept strictly apart: `data.js` contains no DOM operation, and `app.js` contains no coordinate constant. Changing data touches only the former, changing the drawing only the latter.

## Technical stance

Static, no build, no dependencies. This is not a rejection of tooling but a bet that these pages should still open ten years from now.

The second demo made the cost of that bet concrete. The drawing code is duplicated almost line for line, and that duplication is accepted. What did not transfer was the vocabulary: a culture replacing another is not a state destroying one, and a legend is not an excavation. Those differences live in the data (`META.terms`, `shift` events, `src` tags) rather than in a shared engine. The reasoning is in [docs/design/0002](docs/design/0002-second-demo-and-data-semantics.md).

## Contributing

Data corrections, new demos and rendering improvements are all welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) before starting.

The most important rule: historical changes need a source. Disputed years, boundary evidence, changing place names, all of it should say in the pull request which account was chosen and why.

## License

[MIT](LICENSE). Code and data share one license, so there are not two sets of rules to follow.

Copyright in primary sources and third-party historical maps remains with their respective owners. This repository uses only the facts they record and publicly established historical conclusions.
