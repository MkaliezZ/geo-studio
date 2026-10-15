# GEO Studio

[English](README.md) · [简体中文](README.zh-CN.md)

面向 Windows、macOS 和 Linux 的本地 GEO 工作台：采集网站、查看证据、改写内容、修改后复检，并使用自己的 API 观察 AI 回答。

当前界面为简体中文，处于桌面工具早期版本阶段。工程具备多系统构建配置，本地运行验收在 macOS x64 完成。

![网站诊断：真实 example.com 采集结果](docs/screenshots/audit.png)

## 功能

- **使用引导**：四步操作提示、提供商预设、DeepSeek 本机密钥复用，以及独立联网引用验证入口。
- **网站诊断**：组合 SiteOne 采集、可选 Chromium 渲染及 Protego robots 解析，检查 HTTP、noindex、摘要限制、标题、描述、canonical、H1、正文、JSON-LD 语法等。
- **证据与复检**：查看页面快照和原始证据，对比最近两次完成的诊断；缺失或未知结果不会算作问题已解决。
- **AI 改写**：导入已采集正文或粘贴文本，配置目标，生成草稿、查看差异、人工编辑、保存并导出 Markdown。标题、描述、H1、正文和 JSON-LD 失败项可直接创建携带原始证据的优化任务；生成草稿不会将问题标记为已解决。
- **回答与引用监测**：固定问题集、品牌别名、目标域、多提供商、重复采样，保留回答、来源字段和历史指标。
- **本地定时**：手动、每小时或每天执行，单批最多 30 次请求；仅在应用运行期间生效。
- **导出**：Markdown、JSON，不包含 API Key。

![AI 改写：真实 DeepSeek API 返回的草稿](docs/screenshots/rewrite.png)

![回答监测：真实 DeepSeek API 采样](docs/screenshots/monitor.png)

![真实联网引用匹配与来源访问验证](docs/screenshots/web-verification.png)

## 如何理解指标

提及率以成功返回文本的样本为分母。引用率只以具有提供商联网证据的成功样本为分母。普通 Chat 回答自行生成的链接单独展示，不会变成已验证引用；没有有效联网样本时，引用率显示为不可计算。

API 观测不等于同品牌消费端 App 的表现。技术检查和内容改进不保证收录、引用、排名或业务增长。生成的内容不会自动发布到网站。

## 从源码启动

需要 Node.js 24、npm，以及构建组件使用的 Python 3.12。需要渲染对照时，另行安装 Chromium 或 Google Chrome。

```sh
npm ci
npm run components -- --release
npm run dev
```

组件命令下载固定版本的 SiteOne 并校验 SHA256，在项目本地虚拟环境中构建 Protego 辅助程序，不全局安装 Python 包。开发者安装了 `uv` 时，也可以使用 `npm run components`。

开发命令会启动 Electron 和仅限本机访问的浏览器预览。桌面数据位于 Electron 的用户数据目录；浏览器预览默认使用 `.data/`，预览密钥仅在本次会话有效。

## 配置自己的 API

在「模型设置」填写名称、协议、Base URL、模型 ID 和自己的 API Key。「测试连接」会发送一次小请求，可能产生 API 费用。

| 协议 | 用途 |
| --- | --- |
| OpenAI Responses | 改写；监测要求端点支持 `web_search` |
| Perplexity Agent API | 改写、带提供商搜索来源的监测 |
| DeepSeek 联网（Anthropic 兼容） | 真实联网回答、搜索结果与回答引用匹配 |
| OpenAI-compatible Chat | 改写、普通回答与品牌提及监测 |

DeepSeek 选择 **OpenAI-compatible Chat**，Base URL 填写 `https://api.deepseek.com`，模型使用账号支持的 ID，例如 `deepseek-flash`。已执行真实连接、中文改写和普通回答监测测试；需要联网监测时，选择 **DeepSeek 联网搜索** 预设（`https://api.deepseek.com/anthropic`），或在已有的 DeepSeek 官方配置上点击「创建联网配置」，然后执行「验证联网引用」。Chat 和 Responses 通道不能代替这条搜索通道；API 验收仍不代表消费端 App 表现。模型及价格可能变化，请核对[官方文档](https://api-docs.deepseek.com/zh-cn/)。

联网验证通过需要：提供商成功搜索、回答引用与检索来源匹配，以及至少一个来源页面本机可访问。匹配仅忽略已知追踪参数和 fragment，保留影响内容的查询参数。此检查验证证据链，不保证回答的所有事实正确。界面展示工具错误和实际搜索次数；一次采样可能产生多次搜索费用。

## 构建和测试

```sh
npm test
npm run build
npm run package
```

全新检出需先执行 `npm run components -- --release`。根据构建主机生成 DMG/ZIP、NSIS 或 AppImage；完整安装包的最终用户无需安装 Node 或 Python。[构建工作流](.github/workflows/build.yml) 在 Windows、macOS、Linux 上构建和测试，CI 产物是开发版本，不是正式签名发行包。

本地测试覆盖真实采集/robots、Chromium 生成的中文正文、复检、取消任务、密钥恢复、并发请求和提供商协议。自动测试使用受控接口，无需密钥，也不会调用付费 API。真实供应商与系统验收边界见[实现状态](docs/IMPLEMENTATION.md)。

## 数据与隐私

密钥只存放在本机。桌面版优先使用操作系统加密；安全存储不可用时只保留在会话内；Linux 的 `basic_text` 后端不会用于持久化密钥。密钥与项目状态分开保存，不回传界面，也不进入报告导出。

诊断会访问目标网站。AI 操作会把所选正文或问题发送给配置的提供商并可能产生费用。应用关闭后不继续执行定时监测。

不要提交用户数据目录、`.data/`、`.env`、密钥、私人采集结果、日志或个人截图。上面的界面截图只使用公开示例内容。参见[安全说明](SECURITY.md)。

## 文档与许可证

- [PRD](docs/PRD.md)
- [实现与验收状态](docs/IMPLEMENTATION.md)
- [界面设计基线](docs/design/SYSTEM.md)

应用源码采用 [MIT](LICENSE)。第三方组件保留各自许可证，包括 SiteOne（MIT）和 Protego（BSD-3-Clause），许可声明位于 [resources/licenses](resources/licenses)。这些声明不构成完整法律认证。
