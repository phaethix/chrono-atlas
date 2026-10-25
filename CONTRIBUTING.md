# 贡献指南

感谢你愿意花时间。这个项目接受三类贡献：数据勘误、新的演示、渲染与交互改进。

## 开始之前

```bash
git clone https://github.com/phaethix/chrono-atlas.git
cd chrono-atlas
node scripts/check.mjs
```

不需要 `npm install`，仓库没有依赖。校验通过说明你的环境正常。

## 三类贡献的路径

### 数据勘误

这类最受欢迎，也最需要证据。发现某年某地归属有误、某条边界画错了、某个年份取错了，都是实质改进。

改 `demos/<演示>/data.js`，然后在 PR 描述里写清三件事：错在哪、依据是什么、改成什么。如果存在异说且你选了其中一说，说明为什么选它。

不接受只写「我觉得应该」的改动。史实争议无法靠直觉裁决，需要可查的出处。

### 新的演示

完整步骤在 [docs/adding-a-demo.md](docs/adding-a-demo.md)。简要版：

```bash
cp -r demos/chunqiu-zhanguo demos/your-era
```

改 `data.js` 的 `META.id` 与目录名保持一致，替换数据，改 `index.html` 的标题，在根 `index.html` 加卡片，跑校验。

新演示不需要沿用春秋战国的视觉。如果题材形态不同（人口曲线、行军路线、贸易网络），`app.js` 可以完全重写，校验脚本只检查 `data.js` 的自洽性。

### 渲染与交互

改 `app.js` 与 `style.css`。这类改动容易影响其他演示，因为目前各演示共享同一套渲染代码的拷贝。改动前请说明它解决的问题，改动后请贴一张截图或录屏。

不做的事：引入构建工具、引入前端框架、把项目改成需要 `npm install` 才能跑。这不是技术偏好，是不想让十年后的页面依赖今天的工具链。

## 提交信息

用 Conventional Commits，且必须使用英文。前缀有助于生成 changelog，英文则让仓库的历史对非中文使用者也可读。

```
feat(demo): add the staged animation of Qin's conquests
fix(data): correct the ownership of Yue in 306 BCE
docs: explain how to pick boundary vertices
chore(ci): cache the Node toolchain
```

常用类型：`feat`、`fix`、`docs`、`style`、`refactor`、`test`、`chore`、`ci`。

标题不超过 72 字符，不以句号结尾。需要说清背景时，空一行写正文，正文每行不超过 100 字符。

本地钩子与 CI 共用同一份检查逻辑：

```bash
git config core.hooksPath .githooks
```

设置后 `git commit` 会由 `.githooks/commit-msg` 自动校验，不合格的提交信息当场就会被拒绝。这个命令每个克隆只需执行一次。

### 一个提交只做一件事

同一个提交里不要混入不相关的改动。改数据就只改数据，改流水线就只改流水线。这不只是为了好看：

- 数据勘误需要单独评审，混在重构里会让它难以被审出来
- 出问题时能只回滚一个提交，而不是连带撤掉一堆无关改动
- `git log` 的每一行都对应一个可理解的动作

如果一次改动同时涉及数据修正和渲染调整，就分成两个提交。同一个 PR 里可以有多个提交。

## 分支与 PR

从 `main` 切分支，名字简短即可：

```bash
git checkout -b fix/yue-306
```

PR 描述里请填写模板中的各项。模板不是形式：其中的「数据来源」和「已知简化」两项，读者需要靠它们判断这个演示的可信边界。

PR 会经过两个自动检查：数据校验与格式检查。两者都通过后才进入人工评审。

## 代码风格

格式由 Prettier 统一，版本锁在 3.9.10：

```bash
npx prettier --check .   # 提交前必须通过
npm run format           # 不通过就修，等价于 prettier --write .
```

`.prettierignore` 里排除了 `demos/*/data.js`、`app.js`、`style.css`。这三类文件用对齐的空格把数据段排成表格，格式化会把它拆散，所以刻意不交给工具——不要为了「统一」把它们移出去。

其余约定：两空格缩进、单引号、分号结尾，`.editorconfig` 已配好缩进与换行，主流编辑器会自动遵循。

一个约定：数据段用对齐的写法让表格状结构可读，比如势力表和多边形数组。不要为了行宽去拆散它们，可读性优先于行长。

更完整的硬性规则（不能引入什么、数据与渲染的边界、字段的坑）见 [AGENTS.md](AGENTS.md)。

## 文档语言

根目录的 `README.md` 用英文，是项目的默认门面，GitHub 与搜索引擎取的都是它。中文版在 `docs/README.zh-CN.md`，两份内容应当同步：改了英文版的事实、数字或目录结构，也请顺手改中文版，反之亦然。

其余文档与代码注释保持中文。这个项目的史料依据以中文文献为主，注释里的判断用中文表达更准确，也便于提供出处的人参与。提交信息是唯一的例外，必须用英文，理由见上文。

## 史料与版权

可以引用史书的记载内容，但不能大段抄录现代学者的译文、注释或历史地图的图像。事实与结论不受版权保护，表达受保护。

如果你要引用某部现代著作的具体边界走向，请在 `README.md` 里注明出处，并确认这种使用方式属于合理引用。

## 行为准则

参与本项目即表示同意遵守 [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)。对史实的分歧请针对证据，不针对人。

## 有疑问

不确定某个改动是否合适，先开一个 Issue 讨论。讨论清楚再动手，比改完被拒更省时间。
