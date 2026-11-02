// ⌘K 全局搜索的题解索引：独立 JSON 端点，命令面板首次打开时按需 fetch。
// 不内联进每个页面 —— 375 条内联会让 548 页 HTML 各自膨胀 ~25KB。
import { getCollection } from "astro:content";
import { url } from "../lib/url";
import { slugOf } from "../lib/slug";
import { cleanProblemTitle } from "../lib/title";

export async function GET() {
  const problems = await getCollection("problems", ({ data }) => !data.draft);

  const items = problems.map((p) => {
    const d = p.data;
    const title = cleanProblemTitle(d.title);
    const level = d.difficulty ?? (d.kyu != null ? `${d.kyu} kyu` : "");
    const meta = [d.number && `#${d.number}`, level, d.platform].filter(Boolean).join(" · ");
    return {
      label: title,
      hint: meta || "题解",
      href: url(`/problems/${slugOf(p.id)}/`),
      keys: ["problem", "题解", title, meta, ...(d.tags ?? [])].filter(Boolean).join(" "),
    };
  });

  return new Response(JSON.stringify({ items }), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
