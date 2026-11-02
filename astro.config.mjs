import { existsSync, cpSync } from 'node:fs';
import { defineConfig } from 'astro/config';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeSlug from 'rehype-slug';
import stripLeadingH1 from './src/lib/rehype-strip-heading.mjs';
import remarkBlockMath from './src/lib/remark-block-math.mjs';

// ── 部署配置：GitHub Pages 用户站点 + 自定义域名 ──────────────────
// 仓库 id-zy/id-zy.github.io 是「用户站点」，站点根即仓库根，因此 base 为 '/'。
// 绑定的自定义域名 blog.id-zyuan.xyz 由 public/CNAME 声明；
// public/.nojekyll 必须存在，否则 GitHub Pages 的 Jekyll 会忽略 _astro/ 等下划线目录。
export default defineConfig({
  site: 'https://blog.id-zyuan.xyz',
  base: '/',
  trailingSlash: 'ignore',
  // 关闭 Astro 自带清空，改为手动 rm -rf dist（避开安全删除对批量删除的拦截）
  build: { emptyOutDir: false },
  // 正文首个 h1 与页面标题重复，渲染时去掉（详见插件注释）
  // remark-math + rehype-katex：渲染 Obsidian 笔记里的 $行内公式$ 与 $$块公式$$（347 篇受影响）
  // remarkBlockMath：remark-math 只认多行 $$，Obsidian 的「单独一行 $$..$$」需升级为块级
  markdown: {
    remarkPlugins: [remarkMath, remarkBlockMath],
    // rehypeSlug：给标题写 id，供详情页目录锚点跳转（slug 算法与 Astro headings 一致）
    rehypePlugins: [rehypeKatex, rehypeSlug, stripLeadingH1],
  },
  integrations: [
    {
      // Astro 在构建开始就复制 public/，而豆瓣图片是构建过程中才下载进去的，
      // 构建结束时补一次同步，保证 dist 里不缺图。
      name: 'sync-douban-covers',
      hooks: {
        'astro:build:done': async ({ logger }) => {
          const source = new URL('./public/covers', import.meta.url);
          if (existsSync(source)) {
            cpSync(source, new URL('./dist/covers', import.meta.url), { recursive: true });
            logger.info('豆瓣图片已同步到 dist/covers');
          }
        },
      },
    },
  ],
});
