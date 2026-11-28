# 个人 GPT 服务

公开网站继续在 GitHub Pages 免费运行；这里是可选的个人服务，只允许配置的 GitHub 数字账户 ID 调用 OpenAI。其他访客无需该服务。

```powershell
python server/owner_api.py --init
python server/owner_api.py
```

`--init`只创建仓库外的私有配置，已存在时拒绝覆盖。默认路径为 `I:/Agents-workspace/Outputs/cangjingge/private-api/openai.local.json`；可用 `--config`指定另一处仓库外路径。填写OpenAI Key（或使用OPENAI_API_KEY环境变量）、GitHub OAuth Client ID/Secret，注册回调`http://127.0.0.1:8860/callback`，检查本人账户ID和调用上限后才启用enabled。不要把配置、SQLite用量文件或任何密钥放进仓库。

服务只绑定127.0.0.1，打开http://127.0.0.1:8860。手机远程使用需自行配置HTTPS反向代理和对应的base_url/回调；本项目不自动租服务器。个人服务同站登录与调用，不开放跨站CORS。

登录使用state、PKCE和HttpOnly会话Cookie；服务端验证GitHub返回的固定数字账户ID。每个POST还验证Origin和CSRF。API Key不发给网页。模型固定gpt-5.4-mini-2026-03-17，不启用额外工具。证据只读取公开全文卡，待核标记或原文口径待核的字段不送入模型；返回片段必须逐字匹配已传入的来源；无来源的模型内容不展示。

SQLite事务在调用前预留每日/月次数、输入输出token和保守费用上界，并发不能绕过上限。没有已核证据时不调用模型、不预留额度。成功重复问题复用缓存；超时或未知状态保留预留额度、不自动重试。费用为本项目的保守预留，不代表OpenAI组织余额或账单，不能阻止其他应用消费。

默认禁用。真实OAuth与OpenAI测试需要维护者配置，不应把模拟测试结果当作真实接通。

回归：`python scripts/tests/test_owner_api.py`。测试用模拟上游，不产生API费用。
