// 详情页 <meta name="description"> 的取值规则：
//   1. 优先用 frontmatter 的 summary（库侧同一字段，2026-11-01 起统一）
//   2. 没有摘要就取正文第一段，清洗 Markdown 标记、跳过「描述：」这类占位行，截到 80 字
// 之所以要兜底：375 篇题解里 365 篇还没有 summary，若不兜底这些页面在搜索结果里没有摘要。

const PLACEHOLDER =
  /^(描述|题目描述|题目表述|问题描述|示例\s*\d*|提示|输入|输出|解释|要求|说明)[：:]?$/;

// 题解开头常见「难度：简单 | 题号：704 | 链接：…」这种元信息行，不是摘要
const METADATA = /^(难度|题号|链接|数据结构|平台|标签|来源|时间|作者|题目)\s*[：:|]/;

const cleanMarkdown = (body: string): string =>
  body
    .replace(/```[\s\S]*?```/g, "") // 代码块
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "") // 图片
    .replace(/^\s*#{1,6}\s+.*$/gm, "") // 标题整行（首个 H1 常是「704. 二分查找」，不能当摘要）
    .replace(/^\s*\|.*\|\s*$/gm, "") // 表格行
    .replace(/^\s*(?:>+\s*|[-*+]\s+|\d+\.\s+)/gm, "") // 引用 / 列表标记
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1") // 链接只留文字
    .replace(/\$\$[\s\S]*?\$\$|\$[^$\n]*\$/g, "") // 公式
    .replace(/<[^>]+>/g, "")
    .replace(/[*_`~]/g, "");

export const firstParagraph = (body: string, limit = 80): string => {
  if (!body) return "";
  const text = cleanMarkdown(body);
  const para = text
    .split(/\n+/)
    .map((line) => line.trim())
    .find((line) => line.length >= 8 && !PLACEHOLDER.test(line) && !METADATA.test(line));
  if (!para) return "";
  // 「描述：给定一个…」这类行首标签去掉，否则 meta 里会出现「描述：」字样
  const cleaned = para.replace(/^(描述|题目描述|问题描述|题目表述|提示)[：:]\s*/, "");
  const cut = cleaned.slice(0, limit).replace(/[，、；：,;:\s]+$/, "");
  return cleaned.length > limit ? `${cut}…` : cut;
};

export const descriptionOf = (summary: string | undefined, body: string, limit = 80): string =>
  (summary ?? "").trim() || firstParagraph(body, limit);
