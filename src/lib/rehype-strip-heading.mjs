// 页面 header 已用 frontmatter 的 title 渲染 h1，而 Obsidian 导出的笔记习惯
// 把标题同时写成正文第一个一级标题，直接渲染会出现两个一模一样的 h1。
// 这里在 markdown 转 HTML 时移除正文开头的那一个；正文中段或行内的 h1 不动。
const stripLeadingH1 = () => (tree) => {
  const nodes = tree.children ?? [];
  const first = nodes.findIndex(
    (node) => !(node.type === "text" && !String(node.value ?? "").trim()),
  );
  if (first === -1) return;
  const node = nodes[first];
  if (node.type === "element" && node.tagName === "h1") nodes.splice(first, 1);
};

export default stripLeadingH1;
