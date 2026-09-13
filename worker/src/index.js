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

async function openai(env, body) {
  const response = await fetch(`${OPENAI_BASE}/responses`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((data.error && data.error.message) || `OpenAI API ${response.status}`);
  return data;
}

function outputText(response) {
  return (response.output || []).flatMap(item => item.content || []).filter(part => part.type === "output_text").map(part => part.text).join("\n").trim();
}

const formatInstructions = {
  case: "整理为标准案例，依次包含：案例背景、原始问题、使用工具、牌面或星盘原始信息、第一判断、正式判断、判断依据、核心机制、行动建议、预测、后续反馈、验证程度、偏差、复盘、可提炼知识、公开性、内容化方向。缺失项明确写待补充。",
  knowledge: "整理为五层知识卡：基础象征、心理或运作机制、现实表现、判断条件、关联案例。区分原始观点、个人理解和待验证部分。",
  rule: "整理为判断规则：规则标题、适用体系、规则陈述、必须观察项、判断公式、适用条件、反例、关联案例、置信状态。",
  content: "整理为内容草稿：核心洞察、目标受众、标题选项、开头钩子、论述结构、案例切片、行动建议、风险边界、适合平台。",
  general: "整理为清晰笔记：主题、事实、观点、推理、疑问、下一步行动。"
};

async function organize(request, env) {
  const body = await request.json();
  if (!body.text) return json({ error: "请先输入需要整理的内容" }, 400, env);
  const type = formatInstructions[body.type] ? body.type : "general";
  const history = (body.history || []).slice(-6).map(item => `${item.role === "user" ? "用户" : "整理结果"}：${item.text}`).join("\n");
  const response = await openai(env, {
    model: env.OPENAI_MODEL || "gpt-4.1-mini",
    store: false,
    instructions: `你是玄枢整理 AI。任务是结构化用户自己的口述和笔记，不是教材问答。${formatInstructions[type]} 不得补造牌面、星盘数据、人物经历或后续反馈。明确区分事实、推测、判断和待验证项。玄学内容只作为反思与咨询辅助，不冒充医疗、法律或财务专业意见。用简洁中文输出。`,
    input: `${history ? `最近上下文：\n${history}\n\n` : ""}本次原始内容：\n${body.text}`
  });
  return json({ answer: outputText(response) || "没有生成有效整理结果。", type }, 200, env);
}

const caseSchema = {
  type: "object", additionalProperties: false,
  properties: {
    title:{type:"string"}, theme:{type:"string"}, person:{type:"string"}, system:{type:"string"}, question:{type:"string"}, background:{type:"string"}, tarot:{type:"string"}, chart:{type:"string"}, firstJudgment:{type:"string"}, judgment:{type:"string"}, basis:{type:"string"}, mechanism:{type:"string"}, advice:{type:"string"}, prediction:{type:"string"}, followup:{type:"string"}, verified:{type:"string"}, bias:{type:"string"}, review:{type:"string"}, knowledge:{type:"string"}, public:{type:"string"}, content:{type:"string"}
  },
  required:["title","theme","person","system","question","background","tarot","chart","firstJudgment","judgment","basis","mechanism","advice","prediction","followup","verified","bias","review","knowledge","public","content"]
};

async function structureCase(request, env) {
  const body = await request.json(); if (!body.narrative) return json({ error: "案例经过不能为空" }, 400, env);
  const response = await openai(env, {
    model: env.OPENAI_MODEL || "gpt-4.1-mini", store: false,
    instructions: "整理用户口述的占星或塔罗案例。不得补造牌面、星盘或反馈，缺失写‘待补充’。判断区分象征、现实机制与行动。theme 取职业/财富/感情/学业/人际关系/创业/时间预测/综合盘；system 取占星/塔罗/两者结合；verified 取待验证/是/否/部分；public 取是/否。",
    input: body.narrative,
    text: { format: { type:"json_schema", name:"structured_case", strict:true, schema:caseSchema } }
  });
  try { return json({ case: JSON.parse(outputText(response)) }, 200, env); }
  catch { return json({ error: "AI 返回内容无法结构化，请重试" }, 502, env); }
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { headers: cors(env) });
    const url = new URL(request.url);
    if (url.pathname === "/health") return json({ ok: true, model: env.OPENAI_MODEL || "gpt-4.1-mini", purpose:"organizing" }, 200, env);
    if (!env.OPENAI_API_KEY) return json({ error: "服务端尚未配置 OPENAI_API_KEY" }, 503, env);
    if (env.APP_ACCESS_TOKEN && request.headers.get("X-Xuanshu-Token") !== env.APP_ACCESS_TOKEN) return json({ error: "访问口令不正确" }, 401, env);
    try {
      if (url.pathname === "/api/organize" && request.method === "POST") return await organize(request, env);
      if (url.pathname === "/api/cases/structure" && request.method === "POST") return await structureCase(request, env);
      return json({ error: "接口不存在" }, 404, env);
    } catch (error) { return json({ error: error.message || "服务器错误" }, 500, env); }
  }
};
