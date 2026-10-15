# Security and privacy

Do not put API keys, access tokens, private website content, user-data folders, raw application logs, or personal screenshots in public issues, pull requests, or commits. Use synthetic or public sample content when reporting problems. If a credential is exposed, revoke it at the provider before removing it from code or history.

The desktop app stores keys separately using Electron safeStorage when operating-system encryption is available. Otherwise it keeps keys in memory for that application session. Linux's basic_text backend is not accepted for persistence. This does not protect against malware or another process with access to your logged-in account.

The development preview is a local development surface. Do not expose it to a network or deploy it as a multi-user service. Audits contact target websites; AI requests send content to the API endpoint you configure. Use only API providers you trust.

Report vulnerabilities without including real credentials or private data. If no private reporting channel is available, open a minimal issue asking for a private channel, without publishing exploit details or sensitive content.

## 中文

不要把密钥、访问令牌、私人网站内容、用户数据目录、原始日志或个人截图放入公开 issue、PR 或提交。复现问题请使用公开或合成示例。若凭据泄露，应先在提供商处撤销，再清理代码和历史。

桌面密钥优先使用操作系统加密，缺少安全存储时只保留在会话中；Linux basic_text 不用于持久化。开发预览仅限本机使用，不应暴露到网络。审计会访问目标站点，AI 请求会把内容发给配置的端点。

漏洞反馈不要附带真实凭据或私人数据；没有私密反馈渠道时，可以只提交请求私密渠道的简短 issue。
