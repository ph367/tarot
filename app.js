const seedCases = [
  {
    id: "CASE-0001", title: "新院长上任后的副院长处境", type: "塔罗", person: "A",
    theme: "职业", question: "新院长上台以后，我作为副院长的处境如何？",
    background: "来访者目前在公立教育系统担任副院长。近期院长更换，因此担心自己的位置、权力和工作环境发生变化。",
    tarot: "权杖二逆位、星币二正位、星币骑士正位", chart: "",
    firstJudgment: "职位不一定变动，但主动权可能受到限制。",
    insight: "短期内职位本身相对稳定，但战略空间与自主权可能受到限制。重点不是会不会被撤，而是需要重新适应新的权力关系。",
    basis: "权杖二逆位指向规划权受限；星币二进入调整与权衡；星币骑士显示整体稳定、务实、按部就班。",
    mechanism: "位置可能保得住，但权力结构需要重新适应。",
    advice: "前期不要急于站队或证明自己，优先观察新院长的工作风格、用人偏好与权力分配方式。",
    prediction: "职位短期稳定，但部分事务可能绕开来访者。", followup: "待补充。", verified: "待验证",
    bias: "", review: "", extractableKnowledge: "星币骑士在组织变动问题中可能表示职位稳定，但发展速度和主动权有限。",
    public: "否", contentPotential: "可以做成帖子", methods: "三张牌阵", status: "待回访", date: "2026-09-12",
    narrative: "来访者担心新院长上任后，自己的副院长位置与权力空间受到影响。"
  },
  {
    id: "CASE-0002", title: "一段关系中的真实诉求", type: "塔罗", person: "M",
    theme: "感情", question: "这段关系是否还值得继续投入？",
    methods: "关系三张牌阵", insight: "表层冲突背后是双方对安全感的不同表达，需要先确认边界再谈结果。",
    followup: "已回访：当事人完成一次坦诚沟通", status: "已验证", date: "2026-09-05",
    narrative: "牌面从宝剑的防御逐步走向节制，重点不是立即选择去留，而是恢复真实沟通。"
  },
  {
    id: "CASE-0003", title: "土星回归阶段的边界重建", type: "占星", person: "K",
    theme: "综合盘", question: "为什么近一年持续感到责任过载？",
    methods: "本命盘、土星回归", insight: "旧有的取悦模式已无法支撑新的成人责任，重建边界是这一阶段的核心功课。",
    followup: "已验证：减少额外承诺后状态改善", status: "已验证", date: "2026-08-29",
    narrative: "K 的土星回归精准触发第六宫议题，工作、健康与责任分配互相影响。"
  }
];

let cases = JSON.parse(localStorage.getItem("xuanshu-cases") || "null") || seedCases;
cases = cases.map((item, index) => ({
  background: "", tarot: "", chart: "", firstJudgment: "", basis: "", mechanism: "", advice: "", prediction: "",
  verified: item.status === "已验证" ? "是" : "待验证", bias: "", review: "", extractableKnowledge: "", public: "否", contentPotential: "待判断",
  ...item, id: /^CASE-\d{4}$/.test(item.id) ? item.id : `CASE-${String(index + 1).padStart(4, "0")}`
}));
let activeFilter = "全部";
let resourceFilter = "全部";
let resources = [];
let currentResource = null;
let deferredInstallPrompt = null;
let aiEndpoint = localStorage.getItem("xuanshu-ai-endpoint") || "";
let aiAccessToken = localStorage.getItem("xuanshu-ai-access-token") || "";
let aiMessages = [];
let lastAIResult = "";
const savedKnowledge = JSON.parse(localStorage.getItem("xuanshu-knowledge") || "[]");
const deletedKnowledgeIds = new Set(JSON.parse(localStorage.getItem("xuanshu-deleted-knowledge") || "[]"));
const savedKnowledgeMap = new Map(savedKnowledge.map(item => [item.id, item]));
let knowledge = (window.SEED_KNOWLEDGE || []).filter(item => !deletedKnowledgeIds.has(item.id)).map(item => savedKnowledgeMap.has(item.id) ? { ...item, ...savedKnowledgeMap.get(item.id) } : item);
knowledge.push(...savedKnowledge.filter(item => !deletedKnowledgeIds.has(item.id) && !knowledge.some(seed => seed.id === item.id)));
let knowledgeSystemFilter = "全部体系";
let knowledgeCategoryFilter = "全部分类";
let rules = JSON.parse(localStorage.getItem("xuanshu-rules") || "null") || [
  { id:"RULE-AST-001", system:"占星", title:"职业问题不能只看第十宫", statement:"职业判断必须同时覆盖能力结构、工作模式、社会角色、收入模式与当前周期。", observe:["MC","10宫主","6宫","2宫","太阳","土星","木星","当前行运"], formula:"职业判断 = 能力结构 × 工作模式 × 社会角色 × 收入模式 × 当前周期", cases:["CASE-0003"], confidence:"形成中" },
  { id:"RULE-TAROT-017", system:"塔罗", title:"大量逆位且缺少行动牌", statement:"优先考虑内耗、信息不完整或现实行动受阻，而不是直接预测事情不会成功。", observe:["逆位比例","行动牌","元素缺失","人物主动性"], formula:"停滞 ≠ 失败\n先检查：信息完整度 × 行动能力 × 现实阻力", cases:["CASE-0002"], confidence:"待验证" }
];
let errors = JSON.parse(localStorage.getItem("xuanshu-errors") || "null") || [
  { caseId:"CASE-0001", question:"多久能适应新的领导关系？", judgment:"两个月内完成稳定过渡。", actual:"四个月后权责关系才逐渐清晰。", mistake:"时间判断偏快。", reason:"把权杖的速度解释得过快，没有充分考虑现实组织流程造成的延迟。" }
];
let contents = JSON.parse(localStorage.getItem("xuanshu-content") || "null") || [
  { id:"CONTENT-001", status:"选题池", platform:"小红书", title:"为什么有些人工作能力很强，却一直升不上去？", source:"CASE-0001", angle:"问题可能不是能力，而是权力结构。" },
  { id:"CONTENT-002", status:"创作中", platform:"短视频", title:"星盘里什么配置容易干最多的活，却拿不到最多的权？", source:"RULE-AST-001", angle:"用职业判断公式拆解常见误区。" },
  { id:"CONTENT-003", status:"已完成", platform:"直播", title:"塔罗为什么不能只看结果好不好？", source:"RULE-TAROT-017", angle:"从象征、机制、行动三层讲解。" }
];

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function formatDate(dateString) {
  return new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric" }).format(new Date(dateString));
}

function escapeHtml(value = "") {
  return value.replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
}

function caseCard(item) {
  const className = item.type === "占星" ? "astrology" : "tarot";
  return `<article class="case-card" data-id="${item.id}">
    <div class="meta"><span class="pill ${className}">${escapeHtml(item.type)}</span><time>${formatDate(item.date)}</time></div>
    <h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.insight)}</p>
    <div class="tags"><span>#${escapeHtml(item.theme)}</span><span>#${escapeHtml(item.methods.split("、")[0])}</span><span>${escapeHtml(item.status)}</span></div>
  </article>`;
}

function render() {
  const query = $("#globalSearch").value.trim().toLowerCase();
  const filtered = cases.filter(item => {
    const inFilter = activeFilter === "全部" || item.type === activeFilter || item.theme === activeFilter || item.status === activeFilter;
    const haystack = Object.values(item).join(" ").toLowerCase();
    return inFilter && haystack.includes(query);
  });

  $("#recentCases").innerHTML = cases.slice(0, 3).map(caseCard).join("");
  $("#caseList").innerHTML = filtered.map(item => `<article class="case-row">
    <span class="pill ${item.type === "占星" ? "astrology" : "tarot"}">${escapeHtml(item.type)}</span>
    <div><h3>${escapeHtml(item.title)}</h3><p>人物 ${escapeHtml(item.person || "未记录")} · ${escapeHtml(item.question)}</p></div>
    <small>${escapeHtml(item.theme)}</small><small class="status">${escapeHtml(item.status)}</small>
    <div class="case-actions"><button data-view-case="${item.id}" title="${escapeHtml(item.mechanism || item.insight)}">${escapeHtml(item.id)}</button><button data-case-to-content="${item.id}">转内容</button><button class="danger-action" data-delete-case="${item.id}">删除</button></div>
  </article>`).join("");
  $("#emptyState").classList.toggle("hidden", filtered.length > 0);

  $("#totalCases").textContent = cases.length;
  $("#caseCountBadge").textContent = cases.length;
  $("#astrologyCount").textContent = cases.filter(item => item.type === "占星").length;
  $("#tarotCount").textContent = cases.filter(item => item.type === "塔罗").length;
  $("#knowledgeNodes").textContent = knowledge.length;
  $("#ruleCount").textContent = rules.length;
  $("#contentCount").textContent = contents.length;
}

function renderKnowledgeCategories() {
  const categories = [...new Set(knowledge.filter(item => knowledgeSystemFilter === "全部体系" || item.system === knowledgeSystemFilter).map(item => item.category))].sort((a,b) => a.localeCompare(b,"zh-CN"));
  const select = $("#knowledgeCategory");
  select.innerHTML = '<option>全部分类</option>' + categories.map(value => `<option>${escapeHtml(value)}</option>`).join("");
  if (categories.includes(knowledgeCategoryFilter)) select.value = knowledgeCategoryFilter; else knowledgeCategoryFilter = "全部分类";
}

function renderKnowledge() {
  const query = $("#knowledgeSearch").value.trim().toLowerCase();
  const shown = knowledge.filter(item => {
    const inSystem = knowledgeSystemFilter === "全部体系" || item.system === knowledgeSystemFilter;
    const inCategory = knowledgeCategoryFilter === "全部分类" || item.category === knowledgeCategoryFilter;
    const haystack = [item.title,item.system,item.category,item.basic,item.mechanism,item.reality,...(item.aliases||[]),...(item.conditions||[]),...(item.sources||[])].join(" ").toLowerCase();
    return inSystem && inCategory && haystack.includes(query);
  });
  $("#knowledgeCardCount").textContent = knowledge.length;
  $("#knowledgeNodes").textContent = knowledge.length;
  $("#knowledgeCardGrid").innerHTML = shown.map(item => `<article class="knowledge-card-item" data-knowledge-id="${item.id}">
    <header><span>${escapeHtml(item.system)}</span><small>${escapeHtml(item.category)}</small></header>
    <h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.mechanism)}</p>
    <footer><span>${escapeHtml(item.status)}</span><div class="card-actions"><button data-edit-knowledge="${item.id}">修改</button><button class="danger-action" data-delete-knowledge="${item.id}">删除</button></div></footer>
  </article>`).join("");
  $("#knowledgeEmpty").classList.toggle("hidden", shown.length > 0);
}

function openKnowledgeCard(id) {
  const item = knowledge.find(card => card.id === id); if (!item) return;
  const detail = [`① 基础象征\n${item.basic}`,`② 心理 / 运作机制\n${item.mechanism}`,`③ 现实表现\n${item.reality}`,`④ 判断条件\n${(item.conditions||[]).map(value=>`• ${value}`).join("\n")}`,`⑤ 案例与验证\n${item.cases && item.cases.length ? item.cases.join(" · ") : "尚未关联案例，等待真实案例验证。"}`,`【教材来源】\n${(item.sources||[]).join(" · ") || "待补充"}`,`【卡片状态】\n${item.status}`].join("\n\n");
  $("#readerTitle").textContent = `${item.id}｜${item.title}`; $("#readerType").textContent = `${item.system} · ${item.category}`;
  $("#readerContent").innerHTML = `<pre>${escapeHtml(detail)}</pre>`; $("#shareResource").classList.add("hidden"); $("#downloadResource").classList.add("hidden"); $("#reader").classList.remove("hidden"); document.body.style.overflow="hidden";
}

function saveKnowledge() {
  localStorage.setItem("xuanshu-knowledge", JSON.stringify(knowledge));
  localStorage.setItem("xuanshu-deleted-knowledge", JSON.stringify([...deletedKnowledgeIds]));
  renderKnowledgeCategories(); renderKnowledge(); render();
}

function addKnowledgeCard() {
  const title = prompt("知识卡标题："); if (!title) return;
  const system = prompt("体系：占星 / 塔罗 / 数字命理", "占星") || "未分类";
  const category = prompt("分类：", "自定义") || "自定义";
  const basic = prompt("① 基础象征：", "") || "待补充";
  const mechanism = prompt("② 心理 / 运作机制：", "") || "待补充";
  const reality = prompt("③ 现实表现：", "") || "待补充";
  knowledge.unshift({ id:`K-CUSTOM-${Date.now()}`, system, category, title, basic, mechanism, reality, conditions:["待补充判断条件"], cases:[], sources:["个人笔记"], status:"整理中", aliases:[] });
  saveKnowledge(); showToast("知识卡已新增");
}

function editKnowledgeCard(id) {
  const item = knowledge.find(card => card.id === id); if (!item) return;
  const title = prompt("知识卡标题：", item.title); if (!title) return;
  item.title = title; item.basic = prompt("① 基础象征：", item.basic) || item.basic; item.mechanism = prompt("② 心理 / 运作机制：", item.mechanism) || item.mechanism; item.reality = prompt("③ 现实表现：", item.reality) || item.reality;
  item.status = "已修改"; saveKnowledge(); showToast("知识卡已修改");
}

function deleteKnowledgeCard(id) {
  const item = knowledge.find(card => card.id === id); if (!item || !confirm(`确定删除知识卡“${item.title}”吗？`)) return;
  deletedKnowledgeIds.add(id); knowledge = knowledge.filter(card => card.id !== id); saveKnowledge(); showToast("知识卡已删除");
}

function renderOSLibraries() {
  $("#ruleCountBadge").textContent = rules.length;
  $("#errorCountBadge").textContent = errors.length;
  $("#contentCountBadge").textContent = contents.length;
  $("#astRuleCount").textContent = rules.filter(item => item.system === "占星").length;
  $("#tarotRuleCount").textContent = rules.filter(item => item.system === "塔罗").length;
  $("#ruleGrid").innerHTML = rules.map(item => `<article class="rule-card"><header><span class="rule-id">${item.id}</span><span class="rule-system">${item.system}</span></header><div class="rule-body"><h3>${escapeHtml(item.title)}</h3><blockquote>${escapeHtml(item.statement)}</blockquote><div class="rule-observe">${item.observe.map(value => `<span>${escapeHtml(value)}</span>`).join("")}</div><div class="formula">${escapeHtml(item.formula).replace(/\n/g,"<br>")}</div></div><footer><span>关联 ${item.cases.join(" · ")}</span><div class="card-actions"><span>${item.confidence}</span><button class="danger-action" data-delete-rule="${item.id}">删除</button></div></footer></article>`).join("");
  $("#errorTableBody").innerHTML = errors.map((item,index) => `<tr><td>${escapeHtml(item.caseId)}</td><td>${escapeHtml(item.question)}</td><td>${escapeHtml(item.judgment)}</td><td>${escapeHtml(item.actual)}</td><td>${escapeHtml(item.mistake)}</td><td class="error-reason">${escapeHtml(item.reason)}</td><td><button class="table-delete" data-delete-error="${index}">删除</button></td></tr>`).join("");
  const statuses = ["选题池","创作中","已完成"];
  $("#contentBoard").innerHTML = statuses.map(status => {
    const items = contents.filter(item => item.status === status);
    return `<section class="board-column"><header>${status}<span>${items.length}</span></header>${items.map(item => `<article class="content-card"><span class="platform">${escapeHtml(item.platform)}</span><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.angle)}</p><footer><span>来源：${escapeHtml(item.source)}</span><button class="danger-action" data-delete-content="${item.id}">删除</button></footer></article>`).join("")}</section>`;
  }).join("");
}

function switchView(view) {
  $$(".view").forEach(section => section.classList.remove("active"));
  $$(".nav-item").forEach(item => item.classList.toggle("active", item.dataset.view === view));
  $(`#${view}View`).classList.add("active");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function openModal() {
  $("#caseModal").classList.remove("hidden");
  document.body.style.overflow = "hidden";
  setTimeout(() => $("#caseNarrative").focus(), 50);
}

function closeModal() {
  $("#caseModal").classList.add("hidden");
  document.body.style.overflow = "";
}

function inferType(text) {
  return /塔罗|牌阵|抽牌|宝剑|圣杯|权杖|星币|大阿卡纳/.test(text) ? "塔罗" : "占星";
}

function extractAfter(text, pattern, fallback) {
  const match = text.match(pattern);
  return (match && match[1] && match[1].trim().replace(/[。；\n].*$/, "")) || fallback;
}

function organizeNarrative() {
  const text = $("#caseNarrative").value.trim();
  if (!text) { showToast("请先讲述一些案例经过"); return; }
  const type = inferType(text);
  const person = extractAfter(text, /(?:代号|当事人|来访者)(?:是|为|叫)?\s*([A-Za-z\u4e00-\u9fa5]{1,8})/i, "待补充");
  const themeMap = [[/创业/, "创业"], [/财富|收入|金钱|投资/, "财富"], [/学业|考试|学校|学习/, "学业"], [/人际|同事|朋友/, "人际关系"], [/关系|感情|伴侣|恋爱|婚姻/, "感情"], [/时间|多久|何时/, "时间预测"], [/工作|事业|职业|岗位|领导|院长/, "职业"]];
  const matchedTheme = themeMap.find(([regex]) => regex.test(text));
  const theme = matchedTheme ? matchedTheme[1] : "综合盘";
  const title = `${person === "待补充" ? "一位来访者" : person}的${theme}议题`;
  const sentences = text.split(/[。！？\n]/).map(s => s.trim()).filter(Boolean);
  $("#caseTitle").value = title;
  $("#caseType").value = type;
  $("#casePerson").value = person;
  $("#caseTheme").value = theme;
  $("#caseQuestion").value = sentences.find(s => /问题|想问|是否|为什么|怎么办|犹豫|困惑/.test(s)) || sentences[0] || "";
  $("#caseBackground").value = sentences.slice(0, 3).join("。") + (sentences.length ? "。" : "");
  const tarotMatch = text.match(/[^。]*(?:牌阵|抽到|牌面|正位|逆位)[^。]*/);
  const chartMatch = text.match(/[^。]*(?:本命盘|行运|推运|合盘|宫位|相位)[^。]*/);
  $("#caseTarot").value = type !== "占星" ? ((tarotMatch && tarotMatch[0]) || "待补充原始牌面") : "";
  $("#caseChart").value = type !== "塔罗" ? ((chartMatch && chartMatch[0]) || "待补充原始星盘信息") : "";
  const judgment = sentences.find(s => /发现|说明|意味着|核心|判断|看到|感觉/.test(s)) || "根据叙述进一步提炼正式判断。";
  $("#caseFirstJudgment").value = sentences.find(s => /第一|一开始|直觉|感觉/.test(s)) || "待补充当时的第一反应。";
  $("#caseInsight").value = judgment;
  $("#caseBasis").value = "待结合原始牌面 / 星盘数据逐项记录判断依据。";
  $("#caseMechanism").value = "需要从象征继续下钻：现实中真正发生了什么？";
  $("#caseAdvice").value = "需要把判断转译成咨询者可以执行的现实行动。";
  $("#casePrediction").value = sentences.find(s => /预测|将会|可能|时间|个月|年内/.test(s)) || "";
  $("#caseFollowup").value = /回访|后来|验证|实际/.test(text) ? (sentences.find(s => /回访|后来|验证|实际/.test(s)) || "已有后续信息") : "待补充";
  $("#caseVerified").value = /回访|后来|验证|实际/.test(text) ? "部分" : "待验证";
  $("#caseBias").value = ""; $("#caseReview").value = "";
  $("#caseKnowledge").value = "待从案例提炼可复用规律，并关联知识卡 / 判断规则。";
  $("#previewEmpty").classList.add("hidden");
  $("#structuredForm").classList.remove("hidden");
  showToast("已生成结构化草稿");
}

async function organizeNarrativeSmart() {
  const narrative = $("#caseNarrative").value.trim();
  if (!narrative || !aiEndpoint) { organizeNarrative(); return; }
  $("#organizeButton").disabled = true; $("#organizeButton").innerHTML = "<span>✦</span> AI 正在整理…";
  try {
    const data = await aiRequest("/api/cases/structure", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ narrative }) });
    const fields = data.case || {};
    const fieldMap = { title:"caseTitle", theme:"caseTheme", person:"casePerson", system:"caseType", question:"caseQuestion", background:"caseBackground", tarot:"caseTarot", chart:"caseChart", firstJudgment:"caseFirstJudgment", judgment:"caseInsight", basis:"caseBasis", mechanism:"caseMechanism", advice:"caseAdvice", prediction:"casePrediction", followup:"caseFollowup", verified:"caseVerified", bias:"caseBias", review:"caseReview", knowledge:"caseKnowledge", public:"casePublic", content:"caseContent" };
    Object.entries(fieldMap).forEach(([key, id]) => { if (fields[key] !== undefined && $(`#${id}`)) $(`#${id}`).value = fields[key]; });
    $("#previewEmpty").classList.add("hidden"); $("#structuredForm").classList.remove("hidden"); showToast("AI 已完成结构化整理");
  } catch (error) { organizeNarrative(); showToast(`AI 暂不可用，已改用本地整理`); }
  finally { $("#organizeButton").disabled = false; $("#organizeButton").innerHTML = "<span>✦</span> 帮我整理"; }
}

function showToast(message) {
  const toast = $("#toast"); toast.textContent = message; toast.classList.remove("hidden");
  clearTimeout(window.toastTimer); window.toastTimer = setTimeout(() => toast.classList.add("hidden"), 2200);
}

function resetForm() {
  $("#caseNarrative").value = ""; $("#structuredForm").reset();
  $("#structuredForm").classList.add("hidden"); $("#previewEmpty").classList.remove("hidden");
}

$$('.nav-item').forEach(item => item.addEventListener('click', () => switchView(item.dataset.view)));
$$('[data-go]').forEach(item => item.addEventListener('click', () => switchView(item.dataset.go)));
[$("#startCaseButton"), $("#newCaseButton")].forEach(button => button.addEventListener("click", openModal));
$$('[data-close-modal]').forEach(item => item.addEventListener('click', closeModal));
$("#organizeButton").addEventListener("click", organizeNarrativeSmart);
$("#globalSearch").addEventListener("input", () => { render(); if ($("#globalSearch").value) switchView("cases"); });
$("#caseList").addEventListener("click", event => {
  const deleteButton = event.target.closest("[data-delete-case]");
  if (deleteButton) { const item=cases.find(record=>record.id===deleteButton.dataset.deleteCase); if(item && confirm(`确定删除 ${item.id}｜${item.title} 吗？`)){ cases=cases.filter(record=>record.id!==item.id); localStorage.setItem("xuanshu-cases",JSON.stringify(cases)); render(); showToast("案例已删除"); } return; }
  const contentButton = event.target.closest("[data-case-to-content]");
  if (contentButton) {
    const item = cases.find(record => record.id === contentButton.dataset.caseToContent);
    const title = item.mechanism ? `为什么${item.mechanism.replace(/[。！？]$/," ")}？` : item.question;
    contents.unshift({ id:`CONTENT-${String(contents.length + 1).padStart(3,"0")}`, status:"选题池", platform:"小红书", title, source:item.id, angle:item.extractableKnowledge || item.insight });
    localStorage.setItem("xuanshu-content", JSON.stringify(contents)); renderOSLibraries(); switchView("content"); showToast(`已从 ${item.id} 生成内容选题`); return;
  }
  const detailButton = event.target.closest("[data-view-case]");
  if (detailButton) {
    const item = cases.find(record => record.id === detailButton.dataset.viewCase);
    const detail = [`【咨询主题】\n${item.theme}`,`【背景】\n${item.background || item.narrative}`,`【原始问题】\n${item.question}`,`【牌面 / 星盘】\n${item.tarot || item.chart || item.methods}`,`【第一判断】\n${item.firstJudgment || "待补充"}`,`【核心结论】\n${item.insight}`,`【判断逻辑】\n${item.basis || "待补充"}`,`【现实机制】\n${item.mechanism || "待补充"}`,`【行动建议】\n${item.advice || "待补充"}`,`【预测】\n${item.prediction || "无"}`,`【后续反馈】\n${item.followup || "待补充"}`,`【验证 / 偏差】\n${item.verified} / ${item.bias || "待复盘"}`,`【可提炼规律】\n${item.extractableKnowledge || "待提炼"}`].join("\n\n");
    $("#readerTitle").textContent = `${item.id}｜${item.title}`; $("#readerType").textContent = `${item.type} · ${item.theme}`; $("#readerContent").innerHTML = `<pre>${escapeHtml(detail)}</pre>`; $("#shareResource").classList.add("hidden"); $("#downloadResource").classList.add("hidden"); $("#reader").classList.remove("hidden"); document.body.style.overflow="hidden";
  }
});
$$('[data-case-filter]').forEach(chip => chip.addEventListener('click', () => {
  activeFilter = chip.dataset.caseFilter; $$('[data-case-filter]').forEach(c => c.classList.remove('active')); chip.classList.add('active'); render();
}));
$$('.field-item').forEach(item => item.addEventListener('click', () => {
  activeFilter = item.dataset.filter; switchView('cases'); $$('[data-case-filter]').forEach(c => c.classList.toggle('active', c.dataset.caseFilter === activeFilter)); render();
}));
$$('.prompt-chips button').forEach(button => button.addEventListener('click', () => {
  const area = $("#caseNarrative"); area.value += `${area.value ? "\n\n" : ""}${button.dataset.prompt}`; area.focus();
}));
$("#structuredForm").addEventListener("submit", event => {
  event.preventDefault();
  const followup = $("#caseFollowup").value.trim();
  cases.unshift({
    id: `CASE-${String(Math.max(0, ...cases.map(item => Number(item.id.replace(/\D/g, "")) || 0)) + 1).padStart(4, "0")}`, title: $("#caseTitle").value.trim(), type: $("#caseType").value,
    person: $("#casePerson").value.trim(), theme: $("#caseTheme").value.trim(),
    question: $("#caseQuestion").value.trim(), background: $("#caseBackground").value.trim(),
    tarot: $("#caseTarot").value.trim(), chart: $("#caseChart").value.trim(), firstJudgment: $("#caseFirstJudgment").value.trim(),
    insight: $("#caseInsight").value.trim(), basis: $("#caseBasis").value.trim(), mechanism: $("#caseMechanism").value.trim(),
    advice: $("#caseAdvice").value.trim(), prediction: $("#casePrediction").value.trim(), followup,
    verified: $("#caseVerified").value, bias: $("#caseBias").value.trim(), review: $("#caseReview").value.trim(),
    extractableKnowledge: $("#caseKnowledge").value.trim(), public: $("#casePublic").value, contentPotential: $("#caseContent").value,
    methods: [$("#caseTarot").value && "塔罗", $("#caseChart").value && "星盘"].filter(Boolean).join("、") || $("#caseType").value,
    status: $("#caseVerified").value === "待验证" ? "待回访" : ($("#caseVerified").value === "是" ? "已验证" : "部分验证"),
    date: new Date().toISOString().slice(0, 10), narrative: $("#caseNarrative").value.trim()
  });
  localStorage.setItem("xuanshu-cases", JSON.stringify(cases)); render(); closeModal(); resetForm(); switchView("cases"); showToast("案例已保存到本地案例库");
});
$("#exportButton").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(cases, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob); const link = document.createElement("a");
  link.href = url; link.download = `玄枢案例库-${new Date().toISOString().slice(0,10)}.json`; link.click(); URL.revokeObjectURL(url); showToast("案例库已导出");
});
document.addEventListener("keydown", event => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); $("#globalSearch").focus(); }
  if (event.key === "Escape") closeModal();
});
$("#todayLabel").textContent = new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "long", day: "numeric" }).format(new Date());
render();
renderKnowledgeCategories();
renderKnowledge();

$("#knowledgeSearch").addEventListener("input", renderKnowledge);
$("#knowledgeSystem").addEventListener("change", event => { knowledgeSystemFilter = event.target.value; knowledgeCategoryFilter = "全部分类"; renderKnowledgeCategories(); renderKnowledge(); });
$("#knowledgeCategory").addEventListener("change", event => { knowledgeCategoryFilter = event.target.value; renderKnowledge(); });
$("#resetKnowledgeFilter").addEventListener("click", () => { knowledgeSystemFilter="全部体系"; knowledgeCategoryFilter="全部分类"; $("#knowledgeSystem").value="全部体系"; $("#knowledgeSearch").value=""; renderKnowledgeCategories(); renderKnowledge(); });
$("#newKnowledgeButton").addEventListener("click", addKnowledgeCard);
$("#knowledgeCardGrid").addEventListener("click", event => {
  const deleteButton=event.target.closest("[data-delete-knowledge]"); if(deleteButton){ deleteKnowledgeCard(deleteButton.dataset.deleteKnowledge); return; }
  const editButton=event.target.closest("[data-edit-knowledge]"); if(editButton){ editKnowledgeCard(editButton.dataset.editKnowledge); return; }
  const card=event.target.closest("[data-knowledge-id]"); if(card) openKnowledgeCard(card.dataset.knowledgeId);
});
$$('[data-knowledge-category]').forEach(button => button.addEventListener("click", () => { knowledgeCategoryFilter=button.dataset.knowledgeCategory; knowledgeSystemFilter=button.closest(".astrology-tree") ? "占星" : "塔罗"; $("#knowledgeSystem").value=knowledgeSystemFilter; renderKnowledgeCategories(); $("#knowledgeCategory").value=knowledgeCategoryFilter; renderKnowledge(); document.querySelector(".knowledge-toolbar").scrollIntoView({behavior:"smooth",block:"start"}); }));

// 教材文件使用 IndexedDB 保存 Blob，适合离线和较大文件；元数据与文件保持在同一记录中。
function openLibraryDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("xuanshu-library", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("resources", { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readResources() {
  try {
    const db = await openLibraryDB();
    const localResources = await new Promise((resolve, reject) => {
      const request = db.transaction("resources").objectStore("resources").getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const localNames = new Map(localResources.map(item => [normalizeBookName(item.name), item]));
    const catalog = (window.BUNDLED_RESOURCES || []).map(item => {
      const local = localNames.get(normalizeBookName(item.name));
      return local ? { ...item, ...local, category: item.category, topic: item.topic, catalogId: item.id, available: true } : item;
    });
    const catalogNames = new Set(catalog.map(item => normalizeBookName(item.name)));
    const additions = localResources.filter(item => !catalogNames.has(normalizeBookName(item.name)));
    resources = [...catalog, ...additions].sort((a, b) => b.addedAt.localeCompare(a.addedAt));
    renderResources();
  } catch (error) { showToast("当前浏览器无法打开本地资料库"); }
}

function normalizeBookName(name = "") {
  return name.toLowerCase().replace(/\s+/g, "").replace(/（[^）]*(z-library|pandora)[^）]*）/gi, "").replace(/\([^)]*(z-library|pandora)[^)]*\)/gi, "");
}

function saveResource(record) {
  return openLibraryDB().then(db => new Promise((resolve, reject) => {
    const transaction = db.transaction("resources", "readwrite");
    transaction.objectStore("resources").put(record);
    transaction.oncomplete = resolve; transaction.onerror = () => reject(transaction.error);
  }));
}

function removeResource(id) {
  return openLibraryDB().then(db => new Promise((resolve, reject) => {
    const transaction = db.transaction("resources", "readwrite");
    transaction.objectStore("resources").delete(id);
    transaction.oncomplete = resolve; transaction.onerror = () => reject(transaction.error);
  }));
}

function fileKind(file) {
  const ext = file.name.split(".").pop().toLowerCase();
  if (file.type === "application/pdf" || ext === "pdf") return "PDF";
  if (ext === "epub") return "EPUB";
  if (file.type.startsWith("image/")) return "图片";
  return "文本";
}

function formatBytes(bytes) {
  if (!bytes) return "0 MB";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function renderResources() {
  const shown = resources.filter(item => resourceFilter === "全部" || item.category === resourceFilter);
  $("#resourceGrid").innerHTML = shown.map(item => {
    const kindClass = item.kind === "PDF" ? "pdf" : item.kind === "EPUB" ? "epub" : item.kind === "图片" ? "image" : "";
    const ready = item.available !== false && (item.blob || item.url);
    return `<article class="resource-card ${ready ? "" : "catalog-only"}">
      <div class="resource-cover ${kindClass}">${escapeHtml(item.kind)}</div>
      <select class="resource-category" data-category-id="${item.id}" aria-label="资料分类" ${item.catalog ? "disabled" : ""}><option ${item.category === "未分类" ? "selected" : ""}>未分类</option><option ${item.category === "占星" ? "selected" : ""}>占星</option><option ${item.category === "塔罗" ? "selected" : ""}>塔罗</option><option ${item.category === "数字命理" ? "selected" : ""}>数字命理</option></select>
      <h3 title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</h3><p>${formatBytes(item.size)} · ${escapeHtml(item.topic || (item.bundled ? "内置教材" : "本地导入"))}</p>
      <div class="resource-actions">${ready ? `<button data-open-resource="${item.id}">打开</button><button data-share-resource="${item.id}">微信读书</button>${item.catalog ? "" : `<button data-delete-resource="${item.id}">删除</button>`}` : '<label class="inline-import">导入原文件<input type="file" hidden data-resource-upload></label><span>书目已加入</span>'}</div>
    </article>`;
  }).join("");
  const totalSize = resources.filter(item => item.available !== false).reduce((sum, item) => sum + item.size, 0);
  $("#resourceCount").textContent = resources.length; $("#bookCountBadge").textContent = resources.length;
  $("#resourceSize").textContent = formatBytes(totalSize); $("#resourceEmpty").classList.toggle("hidden", resources.length > 0);
  $("#resourceGrid").classList.toggle("hidden", resources.length === 0);
}

async function importResources(fileList) {
  const files = [...fileList]; if (!files.length) return;
  showToast(`正在导入 ${files.length} 份资料…`);
  try {
    for (const file of files) {
      const catalog = (window.BUNDLED_RESOURCES || []).find(item => normalizeBookName(item.name) === normalizeBookName(file.name));
      await saveResource({ id: `resource-${Date.now()}-${Math.random().toString(16).slice(2)}`, name: file.name, type: file.type, kind: fileKind(file), size: file.size, category: (catalog && catalog.category) || "未分类", topic: (catalog && catalog.topic) || "本地导入", addedAt: new Date().toISOString(), blob: file, available: true });
    }
    await readResources(); showToast(`已导入 ${files.length} 份资料`);
  } catch (error) { showToast("导入失败，可能是设备存储空间不足"); }
}

async function openResource(id) {
  currentResource = resources.find(item => item.id === id); if (!currentResource) return;
  if (currentResource.available === false) { showToast("请先导入你拥有的教材原文件"); return; }
  const url = currentResource.url || URL.createObjectURL(currentResource.blob);
  $("#readerTitle").textContent = currentResource.name; $("#readerType").textContent = `${currentResource.category} · ${currentResource.kind}`;
  const content = $("#readerContent"); content.innerHTML = ""; content.dataset.url = currentResource.blob ? url : "";
  if (currentResource.kind === "PDF") content.innerHTML = `<iframe title="PDF 阅读器" src="${url}"></iframe>`;
  else if (currentResource.kind === "图片") content.innerHTML = `<img alt="${escapeHtml(currentResource.name)}" src="${url}">`;
  else if (currentResource.kind === "文本") {
    const pre = document.createElement("pre"); pre.textContent = currentResource.blob ? await currentResource.blob.text() : await fetch(currentResource.url).then(response => response.text()); content.appendChild(pre);
  } else content.innerHTML = `<div class="unsupported"><span>▤</span><p>EPUB 已安全保存。内置 EPUB 翻页阅读器将在下一阶段接入。</p><button class="secondary-button" id="epubDownload">下载到“图书”打开</button></div>`;
  $("#reader").classList.remove("hidden"); document.body.style.overflow = "hidden";
  const epubButton = $("#epubDownload"); if (epubButton) epubButton.addEventListener("click", downloadCurrentResource);
}

function closeReader() {
  const url = $("#readerContent").dataset.url; if (url) URL.revokeObjectURL(url);
  $("#reader").classList.add("hidden"); document.body.style.overflow = ""; currentResource = null; $("#shareResource").classList.remove("hidden"); $("#downloadResource").classList.remove("hidden");
}

function downloadCurrentResource() {
  if (!currentResource) return;
  const temporaryUrl = currentResource.blob ? URL.createObjectURL(currentResource.blob) : currentResource.url; const link = document.createElement("a");
  link.href = temporaryUrl; link.download = currentResource.name; link.click(); if (currentResource.blob) setTimeout(() => URL.revokeObjectURL(temporaryUrl), 1000);
}

async function shareToWeRead(id) {
  const resource = id ? resources.find(item => item.id === id) : currentResource;
  if (!resource) return;
  let sourceBlob = resource.blob;
  if (!sourceBlob && resource.url) {
    showToast("正在准备教材文件…");
    try { sourceBlob = await fetch(resource.url).then(response => response.blob()); }
    catch (error) { const previous = currentResource; currentResource = resource; downloadCurrentResource(); currentResource = previous; showToast("文件已下载，请从微信读书导入"); return; }
  }
  const file = new File([sourceBlob], resource.name, { type: resource.type || "application/octet-stream" });
  if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
    try {
      await navigator.share({ files: [file], title: resource.name, text: "从玄枢资料库发送到微信读书" });
      showToast("已打开分享菜单，请选择微信读书");
      return;
    } catch (error) {
      if (error.name === "AbortError") return;
    }
  }
  const previous = currentResource;
  currentResource = resource;
  downloadCurrentResource();
  currentResource = previous;
  showToast("设备不支持直接分享：文件已下载，请在微信读书中导入");
}

document.addEventListener("change", event => {
  if (!event.target.matches("#resourceUpload, [data-resource-upload]")) return;
  importResources(event.target.files); event.target.value = "";
});
$$('[data-resource-filter]').forEach(chip => chip.addEventListener("click", () => {
  resourceFilter = chip.dataset.resourceFilter; $$('[data-resource-filter]').forEach(c => c.classList.remove("active")); chip.classList.add("active"); renderResources();
}));
$("#resourceGrid").addEventListener("click", async event => {
  const openButton = event.target.closest("[data-open-resource]"); if (openButton) openResource(openButton.dataset.openResource);
  const shareButton = event.target.closest("[data-share-resource]"); if (shareButton) shareToWeRead(shareButton.dataset.shareResource);
  const deleteButton = event.target.closest("[data-delete-resource]");
  if (deleteButton && confirm("确定从此设备删除这份资料吗？")) { await removeResource(deleteButton.dataset.deleteResource); await readResources(); showToast("资料已删除"); }
});
$("#resourceGrid").addEventListener("change", async event => {
  if (!event.target.matches("[data-category-id]")) return;
  const record = resources.find(item => item.id === event.target.dataset.categoryId); record.category = event.target.value; await saveResource(record); await readResources(); showToast("分类已更新");
});
$$('[data-close-reader]').forEach(button => button.addEventListener("click", closeReader));
$("#downloadResource").addEventListener("click", downloadCurrentResource);
$("#shareResource").addEventListener("click", () => shareToWeRead());

// PWA 安装：Android/桌面浏览器使用原生提示；iPhone 显示 Safari 安装步骤。
window.addEventListener("beforeinstallprompt", event => { event.preventDefault(); deferredInstallPrompt = event; $("#installButton").classList.remove("hidden"); });
$("#installButton").addEventListener("click", async () => {
  if (deferredInstallPrompt) { deferredInstallPrompt.prompt(); await deferredInstallPrompt.userChoice; deferredInstallPrompt = null; $("#installButton").classList.add("hidden"); return; }
  $("#iosInstallTip").classList.remove("hidden");
});
$$('[data-close-install]').forEach(button => button.addEventListener("click", () => $("#iosInstallTip").classList.add("hidden")));
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent); const isStandalone = window.navigator.standalone === true || matchMedia("(display-mode: standalone)").matches;
if (isIOS && !isStandalone) $("#installButton").classList.remove("hidden");
if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register("./sw.js");
readResources();
renderOSLibraries();

// AI 连接通过独立后端完成，公开网页中不保存 OpenAI API 密钥。
function normalizedEndpoint() { return aiEndpoint.trim().replace(/\/$/, ""); }

function renderAIState(message = "") {
  const connected = Boolean(aiEndpoint);
  $("#aiConnectionState").textContent = connected ? "已填写连接地址" : "尚未连接";
  $("#aiConnectionState").classList.toggle("connected", connected);
  $("#aiEndpoint").value = aiEndpoint;
  $("#aiAccessToken").value = aiAccessToken;
  if (message) $("#aiStatusMessage").textContent = message;
}

async function aiRequest(path, options = {}) {
  if (!aiEndpoint) throw new Error("请先填写 AI 后端地址");
  const headers = new Headers(options.headers || {}); if (aiAccessToken) headers.set("X-Xuanshu-Token", aiAccessToken);
  const response = await fetch(`${normalizedEndpoint()}${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `连接失败（${response.status}）`);
  return data;
}

async function testAIConnection() {
  aiEndpoint = $("#aiEndpoint").value.trim();
  aiAccessToken = $("#aiAccessToken").value.trim();
  if (!aiEndpoint) { showToast("请填写 AI 后端地址"); return; }
  localStorage.setItem("xuanshu-ai-endpoint", aiEndpoint);
  localStorage.setItem("xuanshu-ai-access-token", aiAccessToken);
  renderAIState("正在测试连接…");
  try { const data = await aiRequest("/health"); renderAIState(`连接成功 · ${data.model || "AI 服务"}`); showToast("AI 已连接"); }
  catch (error) { renderAIState(error.message); showToast("AI 连接失败"); }
}

function appendAIMessage(role, text) {
  aiMessages.push({ role, text }); if (role === "assistant") lastAIResult = text;
  $("#aiConversation").innerHTML = aiMessages.map(item => `<article class="ai-message ${item.role}"><strong>${item.role === "user" ? "你" : "玄枢整理 AI"}</strong><p>${escapeHtml(item.text).replace(/\n/g, "<br>")}</p></article>`).join("");
  $("#aiConversation").scrollTop = $("#aiConversation").scrollHeight;
}

async function askAI() {
  const input = $("#aiQuestion"); const question = input.value.trim(); if (!question) return;
  appendAIMessage("user", question); input.value = ""; $("#askAIButton").disabled = true;
  try { const data = await aiRequest("/api/organize", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ text:question, type:$("#organizeType").value, history:aiMessages.slice(-6) }) }); appendAIMessage("assistant", data.answer); }
  catch (error) { appendAIMessage("assistant", `暂时无法回答：${error.message}`); }
  finally { $("#askAIButton").disabled = false; }
}

$("#testAIButton").addEventListener("click", testAIConnection);
$("#askAIButton").addEventListener("click", askAI);
$("#aiQuestion").addEventListener("keydown", event => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); askAI(); } });
$$('[data-ai-prompt]').forEach((button,index) => button.addEventListener("click", () => { $("#aiQuestion").value = button.dataset.aiPrompt; $("#organizeType").value = ["case","knowledge","rule","content"][index] || "general"; $("#aiQuestion").focus(); }));
$("#copyAIResult").addEventListener("click", async () => { if(!lastAIResult){ showToast("还没有可复制的整理结果"); return; } try{ await navigator.clipboard.writeText(lastAIResult); showToast("整理结果已复制"); } catch { showToast("请长按整理结果复制"); } });
renderAIState();

$("#newRuleButton").addEventListener("click", () => {
  const title = prompt("用一句话写下这条判断规则："); if (!title) return;
  const system = /牌|塔罗/.test(title) ? "塔罗" : "占星";
  const next = Math.max(0, ...rules.filter(item => item.system === system).map(item => Number(item.id.split("-").pop()))) + 1;
  rules.push({ id:`RULE-${system === "塔罗" ? "TAROT" : "AST"}-${String(next).padStart(3,"0")}`, system, title, statement:"待补充适用条件与判断逻辑。", observe:["待补充观察项"], formula:"象征 → 现实机制 → 行动", cases:[], confidence:"待验证" });
  localStorage.setItem("xuanshu-rules", JSON.stringify(rules)); renderOSLibraries(); showToast("判断规则草稿已创建");
});
$("#ruleGrid").addEventListener("click", event => { const button=event.target.closest("[data-delete-rule]"); if(!button) return; const item=rules.find(rule=>rule.id===button.dataset.deleteRule); if(item && confirm(`确定删除 ${item.id}｜${item.title} 吗？`)){ rules=rules.filter(rule=>rule.id!==item.id); localStorage.setItem("xuanshu-rules",JSON.stringify(rules)); renderOSLibraries(); showToast("判断规则已删除"); } });
$("#newErrorButton").addEventListener("click", () => {
  const caseId = prompt("关联哪个 Case ID？", "CASE-0001"); if (!caseId) return;
  const actual = prompt("真实结果是什么？"); if (!actual) return;
  const source = cases.find(item => item.id === caseId);
  errors.unshift({ caseId, question:(source && source.question) || "待补充", judgment:(source && (source.prediction || source.insight)) || "待补充", actual, mistake:"待分析偏差", reason:"待复盘误差原因并修正规则" });
  localStorage.setItem("xuanshu-errors", JSON.stringify(errors)); renderOSLibraries(); showToast("误判记录已加入错误数据库");
});
$("#errorTableBody").addEventListener("click", event => { const button=event.target.closest("[data-delete-error]"); if(!button || !confirm("确定删除这条误判记录吗？")) return; errors.splice(Number(button.dataset.deleteError),1); localStorage.setItem("xuanshu-errors",JSON.stringify(errors)); renderOSLibraries(); showToast("误判记录已删除"); });
$("#newContentButton").addEventListener("click", () => {
  const title = prompt("记录一个内容选题："); if (!title) return;
  const next = Math.max(0,...contents.map(item=>Number(item.id.replace(/\D/g,""))||0))+1;
  contents.unshift({ id:`CONTENT-${String(next).padStart(3,"0")}`, status:"选题池", platform:"小红书", title, source:"手动灵感", angle:"待从知识、规则或案例补充依据。" });
  localStorage.setItem("xuanshu-content", JSON.stringify(contents)); renderOSLibraries(); showToast("选题已加入内容库");
});
$("#contentBoard").addEventListener("click", event => { const button=event.target.closest("[data-delete-content]"); if(!button) return; const item=contents.find(content=>content.id===button.dataset.deleteContent); if(item && confirm(`确定删除选题“${item.title}”吗？`)){ contents=contents.filter(content=>content.id!==item.id); localStorage.setItem("xuanshu-content",JSON.stringify(contents)); renderOSLibraries(); showToast("内容选题已删除"); } });
