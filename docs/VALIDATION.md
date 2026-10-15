# Validation / 验收记录

Date / 日期：2026-10-15

## Automated and native checks / 自动与桌面检查

- Local automated suite: **24 passed, 0 failed** on macOS x64. Real collector, robots helper, Chromium rendering, rechecks, cancellation, key recovery, and concurrency are covered. Provider unit/integration tests use controlled responses and never spend API credits.
- Source and rebuilt macOS package smoke tests: renderer load, component availability, a real robots denial, and operating-system encryption round-trip passed.
- A previous 15-second robots-helper timeout failed during cold starts. The helper's one-file runtime extraction was measured at roughly 10–12 seconds locally; its limit is now 45 seconds, with cancellation retained. Retests passed. Startup cost remains a limitation.
- Windows/Linux CI results must be read from the repository's Actions runs. Build configuration alone is not evidence of runtime validation. macOS arm64 has not been locally tested.

## Real DeepSeek API / 真实接口验收

Endpoint: `https://api.deepseek.com/chat/completions`  
Protocol: OpenAI-compatible Chat  
Returned model: `deepseek-flash`

The actual Electron process loaded the product renderer and ran the same application Store/Service with operating-system-encrypted key storage. The shared frontend was also exercised in the in-app browser against that native process's loopback backend. This was not a mocked provider response. It does not constitute full native-window interaction coverage.

| Case / 用例 | Observed / 实测结果 |
| --- | --- |
| Connection / 连通性 | Returned `OK`; 43 prompt + 88 completion tokens, including reasoning |
| Chinese rewrite / 中文改写 | A 259-character draft; 228 prompt + 879 completion tokens, including reasoning; draft restored from history |
| Ordinary answer sample / 普通回答采样 | Completed 1/1 sample, no request error; 108 prompt + 346 completion tokens, including reasoning |
| Mention / 提及 | Supplied example brand found in the answer |
| Web evidence / 联网证据 | None; 0 provider citation fields; citation rate unavailable |
| Public website / 公开站点 | Live `example.com` crawl: 1 page, 3 findings requiring attention |
| UI / 界面 | Desktop viewport 1440×1000, no horizontal document overflow; no frontend warning/error captured; no “开源/MIT” label in the UI |

The monitoring prompt deliberately supplied the product description and brand. This verifies transport, parsing, persistence, and metric handling; **it does not measure organic brand visibility, search ranking, or citation growth**. Completion token counts include reasoning tokens and are not equal to visible answer length.

Keys were imported locally, encrypted, and never included in repository files, screenshots, exports, or this record. No account balance, credential source document, private prompt, local user path, or response identifier is published here. Screenshots use only public or synthetic product examples.

## Remaining limits / 尚未验证

Real web-search citation monitoring through OpenAI Responses and Perplexity Agent API remains untested. DeepSeek's compatible Chat sample is not evidence of consumer-app search behavior. Signed distribution, all-platform installation, and sustained stability remain separate acceptance work.

中文说明：本轮已验证真实 DeepSeek 连通性、中文改写、普通回答采样、历史恢复及本机加密存储。提及测试使用了包含品牌的示例提示词，仅验证功能链路；没有有效联网证据，所以引用率不可计算。不能将这些结果解释成自然曝光、引用率提升或所有系统均已验收。
