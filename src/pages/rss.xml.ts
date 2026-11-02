import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { url } from "../lib/url";
import { slugOf } from "../lib/slug";

// 零依赖生成 RSS 2.0（环境无外网，未使用 @astrojs/rss）
// 收录范围：非 draft、非题解（题解 365 篇会把博客淹没），按日期倒序取最近 50 篇

const esc = (s: string): string =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

export const GET: APIRoute = async ({ site }) => {
  const origin = site ?? new URL("https://blog.id-zyuan.xyz");

  const posts = (
    await getCollection("posts", ({ data }) => !data.draft && data.category !== "题目")
  )
    .sort((a, b) => (b.data.date?.getTime() ?? 0) - (a.data.date?.getTime() ?? 0))
    .slice(0, 50);

  const items = posts
    .map((p) => {
      const link = new URL(url(`/blog/${slugOf(p.id)}/`), origin).href;
      const date = p.data.date ?? new Date();
      const desc = p.data.summary ?? p.data.description ?? "";
      const category = p.data.category ?? "";
      return [
        "    <item>",
        `      <title>${esc(p.data.title)}</title>`,
        `      <link>${esc(link)}</link>`,
        `      <guid isPermaLink="true">${esc(link)}</guid>`,
        `      <pubDate>${date.toUTCString()}</pubDate>`,
        category ? `      <category>${esc(category)}</category>` : "",
        desc ? `      <description>${esc(desc)}</description>` : "",
        "    </item>",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n");

  const self = new URL(url("/rss.xml"), origin).href;
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>博客 · 夜刊</title>
    <link>${esc(new URL(url("/blog/"), origin).href)}</link>
    <description>技术笔记、题解与影评的个人站点</description>
    <language>zh-CN</language>
    <atom:link href="${esc(self)}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
};
