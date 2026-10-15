# GEO Studio

[English](README.md) · [简体中文](README.zh-CN.md)

A local-first GEO workbench for Windows, macOS, and Linux: audit a website, review the evidence, improve its content, recheck changes, and observe AI answers through your own API providers.

The current interface is in Simplified Chinese. Distribution is through GitHub source code and local builds; signing and notarization are not project delivery requirements. This is an early version: local desktop runtime testing has been performed on macOS x64; other systems still need hands-on validation.

[Local setup](#local-setup) · [API configuration](#configure-your-own-api) · [Desktop packaging](#build-your-own-desktop-app) · [Troubleshooting](#troubleshooting)

![Website audit — real example.com crawl](docs/screenshots/audit.png)

## What it does

- **Website audits:** SiteOne collection, optional Chromium rendering, HTTP and HTML checks, and per-URL/per-bot robots decisions using Protego.
- **Guided setup:** a four-step guide, provider presets, local DeepSeek key reuse, and an explicit web-citation verification action.
- **Evidence and rechecks:** inspect page snapshots and compare the latest two completed audits. Missing or unknown checks do not count as resolved issues.
- **AI rewriting:** bring your own API key, import collected text or paste content, generate a draft, review line differences, edit, save, and export Markdown. Failed title/description/H1/body/JSON-LD checks can create a targeted optimization task with the original evidence; generating a draft never marks the issue resolved.
- **Answer monitoring:** fixed question sets, brand aliases, target domains, multiple providers, repeat sampling, raw answers, provider citations, and historical metrics.
- **Local scheduling:** manual, hourly, or daily sampling while the app is running; a maximum of 30 requests per batch.
- **Exports:** Markdown and JSON, without API keys.

![AI rewriting — actual DeepSeek API response](docs/screenshots/rewrite.png)

![Answer monitoring — actual DeepSeek API sample](docs/screenshots/monitor.png)

![Real web-search citation and source access verification](docs/screenshots/web-verification.png)

## What the metrics mean

Brand mention rate measures successful text answers. Citation rate uses only successful samples with provider evidence of web search. A URL written in an ordinary Chat answer is shown separately and does **not** become a verified citation. Without eligible web samples, citation rate is unavailable rather than zero.

API observations do not represent the consumer apps of the same providers. Technical checks and better writing do not guarantee indexing, citations, ranking, or business growth. The app never automatically publishes generated content.

## Local setup

### 1. Prepare your environment

| System | Supported component architecture | Terminal |
| --- | --- | --- |
| Windows | x64 | PowerShell |
| macOS | Intel x64 / Apple Silicon arm64 | Terminal (zsh/bash) |
| Linux | x64 | bash or equivalent |

Install Git, Node.js 24 (including npm), Python 3.12, and `tar`; make their commands available on `PATH`. These versions match the build workflow. On Windows the component script uses `python`; on macOS/Linux it uses `python3`. Some Linux distributions also require their Python venv package. Windows/Linux arm64 components are not currently provided.

Install Chromium or Google Chrome only if you want rendering comparisons. No database server or cloud deployment is required. Website audits work without an API key; AI rewriting and answer monitoring require your own provider account and API credits.

### 2. Get the source and prepare components

Run in PowerShell on Windows or Terminal on macOS/Linux:

```sh
git clone https://github.com/MkaliezZ/geo-studio.git
cd geo-studio
npm ci
npm run components -- --release
```

This requires access to npm, PyPI, and GitHub release downloads. The component command downloads a pinned SiteOne release with SHA256 verification and builds the Protego helper in a project-local virtual environment. No global Python packages or `uv` installation are required for this route. Build on the OS and architecture you intend to run.

### 3. Launch and complete your first workflow

```sh
npm run dev
```

This starts the Electron desktop app and a loopback-only development preview. Keep the terminal open; quit the app or press Ctrl+C in that terminal to stop. This preview is for local development, not a public multi-user web deployment.

1. Create a project and enter a public website URL. Start with a one-page audit.
2. Open a failed finding and inspect its evidence. For supported content findings, create an optimization task directly from the finding.
3. Configure an API provider in **模型设置**, generate a draft, review it, then manually apply the chosen changes to your website.
4. Recheck the same website with the same scope to compare results. A saved draft alone does not resolve a finding.
5. Configure monitoring questions, brand aliases, and target domains. Use a search-capable protocol and **验证联网引用** to validate web evidence before interpreting citation metrics.

Desktop data is stored in Electron's user-data directory. The browser preview uses `.data/` and keeps API keys in memory for that preview session only. For a desktop app that runs without a development terminal, follow the packaging steps below.

## Configure your own API

In **模型设置** (Model settings), enter a provider name, protocol, Base URL, model ID, and your own API key. A connection test sends a small paid request.

| Protocol | Use |
| --- | --- |
| OpenAI Responses | Rewriting; monitoring requests require `web_search` support |
| Perplexity Agent API | Rewriting and monitoring with provider search references |
| DeepSeek search (Anthropic-compatible) | Real web-search answer monitoring with matched provider search results |
| OpenAI-compatible Chat | Rewriting and ordinary answer/brand monitoring |

DeepSeek works through **OpenAI-compatible Chat**, Base URL `https://api.deepseek.com`, with an account-supported model such as `deepseek-flash`. An actual API connection, Chinese rewrite, and ordinary-answer monitor have been tested. For web monitoring, choose the **DeepSeek search** preset (`https://api.deepseek.com/anthropic`) or use the local “创建联网配置” action on an existing official DeepSeek configuration, then click “验证联网引用”. The Chat and Responses endpoints are not a substitute for this search channel. This does not validate DeepSeek consumer-app search. Model availability and pricing can change; consult the [provider documentation](https://api-docs.deepseek.com/).

A successful web verification requires successful provider search results, a matching answer citation, and at least one source URL accessible from this machine. Known tracking parameters and fragments are normalized; content-selecting query parameters are retained. This verifies the evidence chain, not the truth of every claim. Tool errors and actual search counts are shown; one sample can trigger multiple billable searches.

## Build your own desktop app

Complete local setup first, then run the checks:

```sh
npm test
npm run build
```

Create an unsigned app directory on **macOS/Linux**:

```sh
CSC_IDENTITY_AUTO_DISCOVERY=false npm run package:dir
```

On **Windows PowerShell**:

```powershell
$env:CSC_IDENTITY_AUTO_DISCOVERY = "false"
npm run package:dir
```

Open the application from the platform's unpacked directory under `release/` (`.app` on macOS, `.exe` on Windows, executable on Linux). This app runs independently of the development server and does not require Node or Python on the destination machine. Keep the entire unpacked app together when copying it.

For optional installer/archive output, replace `npm run package:dir` with `npm run package` in the same unsigned command: macOS produces DMG/ZIP, Windows NSIS, and Linux AppImage. No signing account or paid certificate is required. Unsigned downloads may trigger operating-system publisher warnings. Build on the target platform; the commands above do not provide arbitrary cross-compilation.

The [GitHub Actions workflow](.github/workflows/build.yml) builds and tests on Windows, macOS, and Linux with signing discovery disabled. If a successful run has retained artifacts, signed-in GitHub users can download them from [Actions](https://github.com/MkaliezZ/geo-studio/actions); these are optional unsigned development builds. Source setup above remains the primary distribution route.

The local suite includes real collector/robots tests, Chromium-generated Chinese content, rechecks, task cancellation, key recovery, concurrent requests, and provider contracts. Tests use controlled providers and do not require or charge your API key. See [validation status](docs/IMPLEMENTATION.md) for the boundaries of real-provider and OS validation.

## Update an existing checkout

Save any local source changes first, then run from the repository directory:

```sh
git pull --ff-only
npm ci
npm run components -- --release
npm run dev
```

For a standalone desktop build, quit the old app and repeat the unsigned packaging steps instead of running `npm run dev`. Keep your user-data directory; updating source does not require deleting projects or API settings.

## Troubleshooting

| Symptom | What to check |
| --- | --- |
| `git`, `node`, `npm`, Python, or `tar` not found | Install the prerequisites and reopen your terminal. Confirm Node 24 and that `python` (Windows) or `python3` (macOS/Linux) points to Python 3.12. |
| Component missing or audit cannot start | Run `npm run components -- --release` on this machine; component binaries are not committed to Git. |
| Download/pip fails | Check network access to npm, PyPI, and GitHub releases; on Linux, ensure Python venv support is installed. Retry the failed setup step. |
| Rendering comparison unavailable | Install Chromium/Chrome and set its executable path in Settings. |
| Connection refused or no desktop UI | Launch with `npm run dev`, or open a packaged app. `npm start` alone still expects a running development server. Check whether local ports 5173/4319 are already in use. |
| API test/rewrite fails | Check Base URL, protocol, model access, account balance, and key. Ordinary Chat configuration does not enable verified web citations. |
| No verified citation | Inspect the search results, citation match, and source access separately; tool errors or source access restrictions can prevent verification. |

## Privacy

API keys stay on your machine. Desktop storage uses the operating system's encryption facility when available; otherwise keys remain in memory for the session. On Linux, Electron's `basic_text` backend is rejected. Keys are separate from project state and are not returned to the renderer or included in exports.

Website audits contact the target websites. AI actions send the chosen content/questions to the configured API provider and may incur fees. Scheduling stops when the app closes.

Do not commit user-data directories, `.data/`, `.env` files, keys, private crawls, logs, or personal screenshots. Only public example content is used in the screenshots above. See [security guidance](SECURITY.md).

## Project documents and license

- [Product requirements (Chinese)](docs/PRD.md)
- [Implementation and validation status (Chinese)](docs/IMPLEMENTATION.md)
- [Design baseline (Chinese)](docs/design/SYSTEM.md)

Application code is licensed under [MIT](LICENSE). Third-party components retain their own licenses, including SiteOne (MIT) and Protego (BSD-3-Clause); notices are in [resources/licenses](resources/licenses). Those notices are attribution records, not a legal certification of every distribution scenario.
