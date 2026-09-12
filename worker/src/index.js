const OPENAI_BASE = "https://api.openai.com/v1";

function cors(env) {
  return {
    "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "https://ph367.github.io",
    "Access-Control-Allow-Headers": "Content-Type, X-Xuanshu-Token",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Vary": "Origin"
  };
}

function json(data, status, env) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json; charset=utf-8", ...cors(env) } });
}

async function openai(env, path, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("Authorization", `Bearer ${env.OPENAI_API_KEY}`);
  const response = await fetch(`${OPENAI_BASE}${path}`, { ...init, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((data.error && data.error.message) || `OpenAI API ${response.status}`);
  return data;
}

async function ensureVectorStore(env) {
  if (env.XUANSHU_VECTOR_STORE_ID) return env.XUANSHU_VECTOR_STORE_ID;
  if (!env.XUANSHU_KV) throw new Error("请绑定 XUANSHU_KV，或设置 XUANSHU_VECTOR_STORE_ID");
  let id = await env.XUANSHU_KV.get("vector_store_id");
  if (id) return id;
  const store = await openai(env, "/vector_stores", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "玄枢教材知识库" })
  });
  id = store.id; await env.XUANSHU_KV.put("vector_store_id", id); return id;
}

function outputText(response) {
  return (response.output || []).flatMap(item => item.content || []).filter(part => part.type === "output_text").map(part => part.text).join("\n").trim();
}

function sourceNames(response) {
  const names = new Set();
  for (const item of response.output || []) {
    if (item.type === "file_search_call") for (const result of item.results || []) if (result.filename) names.add(result.filename);
    for (const part of item.content || []) for (const annotation of part.annotations || []) if (annotation.filename) names.add(annotation.filename);
  }
  return [...names];
}

async function uploadBook(request, env) {
  const incoming = await request.formData(); const file = incoming.get("file");
  if (!(file instanceof File)) return json({ error: "没有收到教材文件" }, 400, env);
  const upload = new FormData(); upload.append("purpose", "assistants"); upload.append("file", file, file.name);
  const created = await openai(env, "/files", { method: "POST", body: upload });
  const vectorStoreId = await ensureVectorStore(env);
  const attached = await openai(env, `/vector_stores/${vectorStoreId}/files`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
      file_id: created.id,
      attributes: { category: String(incoming.get("category") || "未分类"), topic: String(incoming.get("topic") || "") }
    })
  });
  return json({ ok: true, fileId: created.id, vectorStoreId, status: attached.status }, 200, env);
}

async function chat(request, env) {
  const body = await request.json(); if (!body.question) return json({ error: "问题不能为空" }, 400, env);
  const vectorStoreId = await ensureVectorStore(env);
  const history = (body.history || []).slice(-8).map(item => `${item.role === "user" ? "用户" : "助手"}：${item.text}`).join("\n");
  const response = await openai(env, "/responses", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
      model: env.OPENAI_MODEL || "gpt-4.1-mini", store: false,
      instructions: "你是玄枢教材研究助手。优先使用 file_search 检索用户私人教材。区分书中观点、你的综合判断和未知信息；没有证据时明确说未在已索引教材中找到。用中文回答，并在关键结论后标注教材名。玄学内容用于反思与咨询辅助，不冒充医疗、法律或财务专业意见。",
      input: `${history ? `最近对话：\n${history}\n\n` : ""}当前问题：${body.question}`,
      tools: [{ type: "file_search", vector_store_ids: [vectorStoreId], max_num_results: 8 }],
      include: ["file_search_call.results"]
    })
  });
  return json({ answer: outputText(response) || "没有生成有效回答。", sources: sourceNames(response) }, 200, env);
}

async function structureCase(request, env) {
  const body = await request.json(); if (!body.narrative) return json({ error: "案例经过不能为空" }, 400, env);
  const response = await openai(env, "/responses", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
      model: env.OPENAI_MODEL || "gpt-4.1-mini", store: false,
      instructions: "把口语化的占星或塔罗案例整理为严格 JSON。不得补造牌面、星盘或反馈，缺失写‘待补充’。判断始终区分象征、现实机制、行动建议。只输出 JSON。字段：title,theme,person,system,question,background,tarot,chart,firstJudgment,judgment,basis,mechanism,advice,prediction,followup,verified,bias,review,knowledge,public,content。theme 取职业/财富/感情/学业/人际关系/创业/时间预测/综合盘；system 取占星/塔罗/两者结合；verified 取待验证/是/否/部分；public 取是/否。",
      input: body.narrative
    })
  });
  const raw = outputText(response).replace(/^```json\s*|\s*```$/g, "");
  try { return json({ case: JSON.parse(raw) }, 200, env); }
  catch { return json({ error: "AI 返回内容无法结构化，请重试" }, 502, env); }
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { headers: cors(env) });
    const url = new URL(request.url);
    if (url.pathname === "/health") return json({ ok: true, model: env.OPENAI_MODEL || "gpt-4.1-mini" }, 200, env);
    if (!env.OPENAI_API_KEY) return json({ error: "服务端尚未配置 OPENAI_API_KEY" }, 503, env);
    if (env.APP_ACCESS_TOKEN && request.headers.get("X-Xuanshu-Token") !== env.APP_ACCESS_TOKEN) return json({ error: "访问口令不正确" }, 401, env);
    try {
      if (url.pathname === "/api/books" && request.method === "POST") return await uploadBook(request, env);
      if (url.pathname === "/api/chat" && request.method === "POST") return await chat(request, env);
      if (url.pathname === "/api/cases/structure" && request.method === "POST") return await structureCase(request, env);
      return json({ error: "接口不存在" }, 404, env);
    } catch (error) { return json({ error: error.message || "服务器错误" }, 500, env); }
  }
};
