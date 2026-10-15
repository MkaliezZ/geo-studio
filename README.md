# GEO Studio

[English](README.md) · [简体中文](README.zh-CN.md)

A local-first GEO workbench for Windows, macOS, and Linux: audit a website, review the evidence, improve its content, recheck changes, and observe AI answers through your own API providers.

The current interface is in Simplified Chinese. This is an early desktop release; cross-platform build configuration is available, while local runtime testing has been performed on macOS x64.

![Website audit — real example.com crawl](docs/screenshots/audit.png)

## What it does

- **Website audits:** SiteOne collection, optional Chromium rendering, HTTP and HTML checks, and per-URL/per-bot robots decisions using Protego.
- **Evidence and rechecks:** inspect page snapshots and compare the latest two completed audits. Missing or unknown checks do not count as resolved issues.
- **AI rewriting:** bring your own API key, import collected text or paste content, generate a draft, review line differences, edit, save, and export Markdown.
- **Answer monitoring:** fixed question sets, brand aliases, target domains, multiple providers, repeat sampling, raw answers, provider citations, and historical metrics.
- **Local scheduling:** manual, hourly, or daily sampling while the app is running; a maximum of 30 requests per batch.
- **Exports:** Markdown and JSON, without API keys.

![AI rewriting — actual DeepSeek API response](docs/screenshots/rewrite.png)

![Answer monitoring — actual DeepSeek API sample](docs/screenshots/monitor.png)

## What the metrics mean

Brand mention rate measures successful text answers. Citation rate uses only successful samples with provider evidence of web search. A URL written in an ordinary Chat answer is shown separately and does **not** become a verified citation. Without eligible web samples, citation rate is unavailable rather than zero.

API observations do not represent the consumer apps of the same providers. Technical checks and better writing do not guarantee indexing, citations, ranking, or business growth. The app never automatically publishes generated content.

## Run from source

Requirements: Node.js 24, npm, and Python 3.12 for the component build. Install Chromium/Google Chrome separately if you want rendering comparisons.

```sh
npm ci
npm run components -- --release
npm run dev
```

This downloads a pinned SiteOne release with SHA256 verification and builds the Protego helper in a project-local virtual environment. No global Python packages are required. Alternatively, developers with `uv` can use `npm run components`.

`npm run dev` starts the Electron app and a loopback-only development preview. The desktop app stores data in Electron's user-data directory; the browser preview uses `.data/` and keeps API keys in memory for that preview session only.

## Configure your own API

In **模型设置** (Model settings), enter a provider name, protocol, Base URL, model ID, and your own API key. A connection test sends a small paid request.

| Protocol | Use |
| --- | --- |
| OpenAI Responses | Rewriting; monitoring requests require `web_search` support |
| Perplexity Agent API | Rewriting and monitoring with provider search references |
| OpenAI-compatible Chat | Rewriting and ordinary answer/brand monitoring |

DeepSeek works through **OpenAI-compatible Chat**, Base URL `https://api.deepseek.com`, with an account-supported model such as `deepseek-flash`. An actual API connection, Chinese rewrite, and ordinary-answer monitor have been tested. This does not validate DeepSeek consumer-app search or web citation tracking. Model availability and pricing can change; consult the [provider documentation](https://api-docs.deepseek.com/).

## Build and test

```sh
npm test
npm run build
npm run package
```

Run `npm run components -- --release` first in a clean checkout. Packaging produces DMG/ZIP, NSIS, or AppImage for the host platform. End users of a complete package do not need Node or Python. The [build workflow](.github/workflows/build.yml) builds and tests on Windows, macOS, and Linux; downloadable CI artifacts are development builds, not signed production releases.

The local suite includes real collector/robots tests, Chromium-generated Chinese content, rechecks, task cancellation, key recovery, concurrent requests, and provider contracts. Tests use controlled providers and do not require or charge your API key. See [validation status](docs/IMPLEMENTATION.md) for the boundaries of real-provider and OS validation.

## Privacy

API keys stay on your machine. Desktop storage uses the operating system's encryption facility when available; otherwise keys remain in memory for the session. On Linux, Electron's `basic_text` backend is rejected. Keys are separate from project state and are not returned to the renderer or included in exports.

Website audits contact the target websites. AI actions send the chosen content/questions to the configured API provider and may incur fees. Scheduling stops when the app closes.

Do not commit user-data directories, `.data/`, `.env` files, keys, private crawls, logs, or personal screenshots. Only public example content is used in the screenshots above. See [security guidance](SECURITY.md).

## Project documents and license

- [Product requirements (Chinese)](docs/PRD.md)
- [Implementation and validation status (Chinese)](docs/IMPLEMENTATION.md)
- [Design baseline (Chinese)](docs/design/SYSTEM.md)

Application code is licensed under [MIT](LICENSE). Third-party components retain their own licenses, including SiteOne (MIT) and Protego (BSD-3-Clause); notices are in [resources/licenses](resources/licenses). Those notices are attribution records, not a legal certification of every distribution scenario.
