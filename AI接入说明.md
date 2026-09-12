# 玄枢教材 AI 接入

玄枢网页在 GitHub Pages 上运行。OpenAI API 密钥不能放在网页代码中，因此 AI 请求通过一个私人 Cloudflare Worker 后端转发。

## 后端能做什么

- 接收你在 iPhone 导入的 PDF / EPUB 教材
- 把教材加入 OpenAI Vector Store
- 通过 `file_search` 检索教材，并返回引用书名
- 把口述案例整理为统一字段
- 用独立访问口令阻止其他人调用你的服务

## 部署

1. 安装 Node.js 后，在 `worker` 目录运行 `npx wrangler login`。
2. 复制 `wrangler.toml.example` 为 `wrangler.toml`。
3. 运行 `npx wrangler kv namespace create XUANSHU_KV`，把返回的 id 填入配置。
4. 运行 `npx wrangler secret put OPENAI_API_KEY`，粘贴 OpenAI API Key。
5. 运行 `npx wrangler secret put APP_ACCESS_TOKEN`，设置只有你知道的访问口令。
6. 运行 `npx wrangler deploy`，得到 `https://...workers.dev` 地址。
7. 在 iPhone 的“玄枢 → 教材 AI”中填写地址与访问口令，点击“保存并测试”。

## 教材流程

公开 App 只显示 16 本书的书目，不分发原文件。你需要在 iPhone 上点击“导入原文件”，选择自己拥有的 PDF / EPUB。导入后点击“交给 AI”，等待索引完成，再到“教材 AI”提问。

> 超大的单本教材可能超过 Worker 套餐的请求大小限制。这种情况需要在电脑端直接上传到同一个 OpenAI Vector Store，再把 `XUANSHU_VECTOR_STORE_ID` 设置为该向量库 ID。
