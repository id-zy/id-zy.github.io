// Obsidian 里块公式最常见的写法是「单独一行 $$...$$」，
// 但 remark-math v6 在分词阶段就把同行写法归为行内公式（inlineMath），
// 节点上不保留 $ 定界符信息，事后无法区分 $$ 与 $。
// 本插件在 remark-math 之后跑：借 mdast 节点的 position.offset 回查原始
// markdown，凡以 $$ 开头、$$ 结尾且独占所在段落的公式，升级为块级 math 节点
// （hAST 映射与 mdast-util-math 一致：pre > code.language-math.math-display，
// rehype-katex 依据 math-display 类启用 displayMode）。句中混排的 $$..$$ 不动。
const isDoubleDollar = (file, node) => {
  const { offset: start } = node.position?.start ?? {};
  const { offset: end } = node.position?.end ?? {};
  if (start == null || end == null) return false;
  const raw = String(file.value ?? "").slice(start, end);
  return /^\$\$[^\n]+\$\$$/.test(raw.trim());
};

/** 段落去掉纯空白文本后是否只剩这一个公式节点 */
const isSoleContent = (paragraph, node) => {
  const meaningful = (paragraph.children ?? []).filter(
    (child) => !(child.type === "text" && !String(child.value ?? "").trim()),
  );
  return meaningful.length === 1 && meaningful[0] === node;
};

const blockMathNode = (tex, position) => ({
  type: "math",
  value: tex,
  position,
  data: {
    hName: "pre",
    hChildren: [
      {
        type: "element",
        tagName: "code",
        properties: { className: ["language-math", "math-display"] },
        children: [],
      },
    ],
  },
});

export default function remarkBlockMath() {
  return (tree, file) => {
    const visit = (node) => {
      const children = node.children;
      if (!Array.isArray(children)) return;
      for (let index = 0; index < children.length; index += 1) {
        const child = children[index];
        if (child.type === "paragraph") {
          const math = (child.children ?? []).find(
            (leaf) => leaf.type === "inlineMath" && isDoubleDollar(file, leaf),
          );
          if (math && isSoleContent(child, math)) {
            children[index] = blockMathNode(math.value, child.position);
            continue;
          }
        }
        visit(child);
      }
    };
    visit(tree);
  };
}
