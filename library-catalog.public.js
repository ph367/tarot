// 仅公开书目元数据，不公开受版权保护的教材文件。
// 用户在自己的设备导入原文件后，App 会按文件名与书目自动匹配。
window.BUNDLED_RESOURCES = [
  ["book-tarot-001", "其实你已经很塔罗了（图文版）简体.PDF", "PDF", 2935625, "塔罗", "解读框架"],
  ["book-ast-001", "生命四元素：占星与心理学 (史蒂芬·阿若优) .pdf", "PDF", 51556288, "占星", "占星心理学"],
  ["book-tarot-003", "Qabalistic Tarot (Robert Wang) .pdf", "PDF", 8232334, "塔罗", "卡巴拉"],
  ["book-tarot-004", "Book T - The Golden Dawn Tarot (Original) (S.L. MacGregor Mathers, S.R.M.D.) .pdf", "PDF", 641294, "塔罗", "黄金黎明"],
  ["book-tarot-005", "塔罗图形密钥·译言古登堡计划 ((英)亚瑟·爱德华·韦特) .epub", "EPUB", 6364444, "塔罗", "经典理论"],
  ["book-tarot-006", "78度的智慧 完整台湾译本.pdf", "PDF", 18970646, "塔罗", "78张牌"],
  ["book-tarot-007", "Jung and Tarot An archetypal journey (Sallie Nichols) .pdf", "PDF", 49683349, "塔罗", "荣格心理学"],
  ["book-tarot-008", "荣格心理学导论【无封面】 .pdf", "PDF", 10472641, "塔罗", "荣格心理学"],
  ["book-tarot-009", "78度的智慧（简体）.pdf", "PDF", 10569406, "塔罗", "78张牌"],
  ["book-num-001", "生命靈數全書：The Complete Book of Numerology.epub", "EPUB", 2992392, "数字命理", "生命灵数"],
  ["book-ast-002", "当代占星研究 (蘇·湯普金 著 胡因梦 译) .epub", "EPUB", 478999, "占星", "当代占星"],
  ["book-tarot-012", "塔罗之书 解牌字典 丹尼尔.pdf", "PDF", 219798925, "塔罗", "解牌字典"],
  ["book-tarot-013", "学会塔罗的16堂课珍藏版（丹尼尔）.pdf", "PDF", 52584311, "塔罗", "入门课程"],
  ["book-tarot-014", "塔罗解牌大师21秘技简体.pdf", "PDF", 6944191, "塔罗", "解读技巧"],
  ["book-tarot-015", "塔罗逆位精解.pdf", "PDF", 676157, "塔罗", "逆位"],
  ["book-tarot-016", "你可以再塔罗一点（珍藏版）.pdf", "PDF", 77924058, "塔罗", "进阶解读"]
].map(([id, name, kind, size, category, topic]) => ({
  id, name, kind, size, category, topic, catalog: true, available: false,
  bundled: true, addedAt: "2026-09-12T00:00:00.000Z"
}));
