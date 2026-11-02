#!/usr/bin/env node
/**
 * 构建后生成 sitemap.xml 与 robots.txt（零依赖；环境无外网，未用 @astrojs/sitemap）。
 *
 * 数据源是 dist 的真实路由（目录名即 URL），因此标签页、分类页、详情页一并覆盖，
 * 不会出现「新增集合忘了加进 sitemap」的漏项。
 *
 * 用法：node tools/gen-sitemap.cjs        # 在 npm run build 之后自动执行
 */
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DIST = path.join(ROOT, "dist");
const CONFIG = path.join(ROOT, "astro.config.mjs");

if (!fs.existsSync(DIST)) {
  console.error("✗ dist 不存在，请先 npm run build");
  process.exit(2);
}

// site 从 astro.config.mjs 读取，避免两处硬编码漂移
const configText = fs.readFileSync(CONFIG, "utf8");
const siteMatch = configText.match(/^\s*site:\s*['"]([^'"]+)['"]/m);
if (!siteMatch) {
  console.error("✗ astro.config.mjs 里找不到 site，sitemap 需要绝对地址");
  process.exit(2);
}
const SITE = siteMatch[1].replace(/\/+$/, "");

const SKIP = new Set(["/404.html"]);

const urls = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      walk(p);
      continue;
    }
    if (!e.name.endsWith(".html")) continue;
    const rel = path.relative(DIST, p).split(path.sep).join("/");
    let route;
    if (rel === "index.html") route = "/";
    else if (rel.endsWith("/index.html")) route = "/" + rel.slice(0, -"index.html".length);
    else route = "/" + rel;
    if (SKIP.has(route)) continue;
    const lastmod = fs.statSync(p).mtime.toISOString().slice(0, 10);
    urls.push({ loc: SITE + route, lastmod });
  }
})(DIST);

urls.sort((a, b) => a.loc.localeCompare(b.loc));

const body = urls
  .map(
    (u) =>
      `  <url>\n    <loc>${u.loc.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</loc>\n    <lastmod>${u.lastmod}</lastmod>\n  </url>`
  )
  .join("\n");

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;

fs.writeFileSync(path.join(DIST, "sitemap.xml"), xml, "utf8");

// robots.txt 与 sitemap 同源生成，省得两处维护
const robots = `User-agent: *
Allow: /

Sitemap: ${SITE}/sitemap.xml
`;
fs.writeFileSync(path.join(DIST, "robots.txt"), robots, "utf8");

console.log(`✓ sitemap.xml（${urls.length} 条）+ robots.txt 已写入 dist/`);
