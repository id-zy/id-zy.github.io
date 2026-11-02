import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

// 兼容 Obsidian 直出的 frontmatter：
// - 分类可能写成 categories（字符串或数组），统一收敛到 category
// - 摘要统一写 summary；description 只为 2026-11-01 前的旧文件兜底，新内容不要再用
// - date 可能缺失，兜底为 1970（排在列表最后，不会让构建失败）
const first = (value?: string | string[]) => (Array.isArray(value) ? value[0] : value);

// 题解的结构化元数据（2026-11-01 新增，全部可选，存量 415 篇零影响）：
// - number     题号，字符串，允许 "585"、"LCR 170"、"面试题 16.24"；必须加引号写
// - difficulty 难度，只认三档；Codewars 的 kyu 走下面的 kyu 字段，不混进 difficulty
// - kyu        Codewars 段位 1–8
// - topics     数据结构 / 算法思想，数组，2–4 个为宜
// - platform   平台；不再靠 title 的 "-LeetCode" 后缀猜
// - subject    领域（算法 / 博客 等），对齐笔记库的 subject，避免被 schema 丢掉
const difficultySchema = z.enum(["简单", "中等", "困难"]);

const postSchema = z
  .object({
    title: z.string(),
    date: z.coerce.date().optional(),
    category: z.string().optional(),
    categories: z.union([z.string(), z.array(z.string())]).optional(),
    tags: z.array(z.string()).default([]),
    summary: z.string().optional(),
    description: z.string().optional(),
    rating: z.number().min(0).max(5).optional(),
    // 站侧兜底开关：所有查询都按 !draft 过滤。正常流程不用手写——
    // 发布开关在笔记库侧：写 draft: true 的笔记直接不进站（见 tools/sync-from-note.cjs）。
    draft: z.boolean().default(false),
    aliases: z.array(z.string()).optional(),
    // —— 题解元数据（可选）——
    // 注意：number 用 string，写成裸数字 585 会直接构建失败（Expected string, received number）
    number: z.string().optional(),
    difficulty: difficultySchema.optional(),
    kyu: z.number().int().min(1).max(8).optional(),
    topics: z.array(z.string()).optional(),
    platform: z.enum(["LeetCode", "Codewars"]).optional(),
    subject: z.string().optional(),
  })
  .transform((data) => ({
    ...data,
    date: data.date ?? new Date(0),
    category: first(data.category ?? data.categories) ?? "未分类",
    summary: data.summary ?? data.description,
  }));

// 博客：创作 / 博客 / 离散数学等，走 /blog
const posts = defineCollection({
  loader: glob({ pattern: ["**/*.md", "!题目/**"], base: "./src/content/posts" }),
  schema: postSchema,
});

// 题解：题目/ 目录下，走 /problems，与博客分开
const problems = defineCollection({
  loader: glob({ pattern: "题目/**/*.md", base: "./src/content/posts" }),
  schema: postSchema,
});

export const collections = { posts, problems };
