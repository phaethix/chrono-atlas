# 安全策略

## 这个项目的攻击面

本仓库是一组静态 HTML 页面，没有后端、没有数据库、没有用户输入的服务端处理，也不在运行时加载第三方脚本。这大幅缩小了可能的问题范围。

仍然值得报告的情况：

- 页面中的脚本存在 XSS 或 DOM 注入路径，例如数据文件里的字符串未经转义就写入 `innerHTML`
- 站内链接或重定向可被利用于钓鱼
- 依赖或 CI 配置中存在供应链风险
- 仓库内容包含意外泄露的凭据或个人信息

## 报告方式

请不要为安全问题开公开 Issue。

通过 GitHub 的 [Security Advisories](https://github.com/phaethix/chrono-atlas/security/advisories/new) 私下报告，或在仓库的 Security 标签页提交私密报告。

请在报告中包含：受影响的页面或文件、复现步骤、可能的影响。如果涉及具体代码位置，附上链接。

## 响应

维护者会在一周内确认收到，并在确认问题后尽快修复。修复完成后会在 Advisory 中说明，并在有需要时于 Release Notes 中提及。

## 不在范围内

历史数据本身的准确性问题不属于安全漏洞，请按 [CONTRIBUTING.md](CONTRIBUTING.md) 的流程提 Issue 或 PR。

第三方浏览器或 GitHub Pages 平台自身的漏洞，请向对应维护方报告。
