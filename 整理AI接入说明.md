# 玄枢整理 AI 接入

玄枢网页在 GitHub Pages 上运行。OpenAI API 密钥不能放在网页代码中，因此整理请求通过一个私人 Cloudflare Worker 后端转发。教材只保存在用户设备，不会上传给 AI。

## 整理 AI 能做什么

- 把口述案例整理成完整案例字段
- 把学习心得整理成五层知识卡
- 从复盘中提炼判断规则
- 把案例与规律转成内容选题
- 区分事实、推测、判断、缺失信息和待验证项

## 部署

1. 安装 Node.js 后，在 `worker` 目录运行 `npx wrangler login`。
2. 复制 `wrangler.toml.example` 为 `wrangler.toml`。
3. 运行 `npx wrangler secret put OPENAI_API_KEY`，粘贴 OpenAI API Key。
4. 运行 `npx wrangler secret put APP_ACCESS_TOKEN`，设置只有你知道的访问口令。
5. 运行 `npx wrangler deploy`，得到 `https://...workers.dev` 地址。
6. 在 iPhone 的“玄枢 → 整理 AI”中填写地址与访问口令，点击“保存并测试”。

## 隐私边界

- OpenAI API Key 只存放在 Worker 的加密 Secret 中。
- 公开 GitHub 仓库不包含 API Key。
- 教材不会发送给整理 AI。
- 只有你主动提交的口述或文本会进入整理请求。
