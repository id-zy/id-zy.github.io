#!/usr/bin/env node
/**
 * ============================================================
 *  sync-from-note.cjs  ——  Obsidian 笔记库（D:/Note） →  Astro 博客（本仓库）
 * ------------------------------------------------------------
 *  设计原则
 *    1. vault 是唯一源头：本脚本【只读】D:/Note，绝不写回笔记；
 *    2. blog 侧是产物：默认发布全部笔记；库侧写 draft: true 才不进站；
 *    3. 幂等：内容哈希相同就跳过，重复跑安全；
 *    4. 不静默丢字段：vault 里出现映射表没定义的键，一律进 warnings，不再像
 *       旧 Hexo 脚本那样靠 KEEP_FIELDS 白名单默默丢掉（375 篇题解的题号/难度/
 *       数据结构就是这么丢的）；
 *    5. 不静默删 blog 文件：站上有、源侧已 draft/已删的，列出为「孤儿」；
 *       加 --prune 才移进 .workbuddy/trash-sync/（移动，不删除）。
 *
 *  用法
 *    node tools/sync-from-note.cjs                 # 干跑：列出 新增/更新/跳过/失败
 *    node tools/sync-from-note.cjs --roster        # 自检：清单 + 同名覆盖 + 被 draft 跳过的文件
 *    node tools/sync-from-note.cjs --write         # 真正写入
 *    node tools/sync-from-note.cjs --force         # 内容相同也重写
 *    node tools/sync-from-note.cjs --prune         # 把孤儿移进回收目录（配合 --write）
 *    node tools/sync-from-note.cjs --file=<路径>   # 只处理指定笔记（绕过发布开关）
 *    node tools/sync-from-note.cjs --only=题目|博客
 *
 *  目录映射（写死，避免 category 参与路径计算导致 /problems 静默丢页）
 *    02-算法题库/{LeetCode,Codewars}/题集/*.md  →  src/content/posts/题目/*.md
 *    09-博客/*.md（不含索引页）                   →  src/content/posts/博客/*.md
 *
 *  frontmatter 映射（vault → 站点）
 *    title            去「-LeetCode / -Codewars」后缀
 *    date             YYYY-MM-DD（去掉时间，不造时分秒）
 *    categories       题目 → category: 题目；博客 → 按学科映射（Java/数据库/数据结构/…）
 *    subject          原样带（不再被丢）
 *    tags             剔掉 算法/题目/LeetCode/Codewars，改用 topics 前 3 个
 *    summary          原样带（库侧统一字段；description 为旧文件兜底）
 *    题号             number（强制字符串，LCR 170 / 面试题 16.24 都留着）
 *    难度             difficulty（简单/中等/困难）或 kyu（1–8）
 *    数据结构         topics（行内单值或区块列表都吃）
 *    平台             platform
 *    blog             不入站（发布标记只在 vault 有意义）
 *
 *  正文转换
 *    [[双链]]        → 去方括号；整行是库内溯源（题集索引 / 算法地图 / MOC）则整行删
 *    ==高亮==        → 原样保留并告警（旧主题才需要 <mark>，且本站不认）
 *    > [!note] 标题  → > **标题**
 *    ![[图.png]]     → 复制到 public/img/<slug>/ 并改成标准 markdown 图
 *    ```TEXT/PYTHON  → 语言名转小写（Shiki 不认大写，会退化成无高亮）
 * ============================================================
 */
"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const yaml = require("js-yaml");

const BLOG_ROOT = path.resolve(__dirname, "..");
const CONTENT = path.join(BLOG_ROOT, "src", "content", "posts");
const PUBLIC = path.join(BLOG_ROOT, "public");
const VAULT = process.env.NOTE_VAULT || "D:/Note";

// 发布开关：默认发布；库侧写 `draft: true` 才不进站（旧口径 blog: true 已于 2026-11-01 废止）
const DRAFT_FIELD = "draft";

// —— 学科映射：文件名前缀 → category ————————————————
const SUBJECT_BY_PREFIX = {
  创作: "创作",
  Java: "Java",
  SQL: "数据库",
  MySQL: "数据库",
  "数据结构": "数据结构",
  BI: "BI",
  "微机原理": "微机原理",
  "数据挖掘": "数据挖掘",
  "离散数学": "离散数学",
  "操作系统": "操作系统",
  "计算机网络": "计算机网络",
};

// —— 已知的 vault 键：出现在这里才允许（其余进 warnings）——
const KNOWN_VAULT_KEYS = new Set([
  "title", "date", "categories", "category", "subject", "tags", "summary", "description", "cover",
  "aliases", "题号", "number", "难度", "difficulty", "数据结构", "topics", "平台", "platform",
  "blog", "draft", "rating",
]);
const GENERIC_TAGS = new Set(["算法", "题目", "LeetCode", "Codewars", "笔记", "学习"]);
const SRC_SUFFIX = /[\s\-—－_]+(?:LeetCode|Codewars)\s*$/i;

// ---------------- CLI ----------------
const argv = process.argv.slice(2);
const opt = {
  write: argv.includes("--write"),
  force: argv.includes("--force"),
  roster: argv.includes("--roster"),
  prune: argv.includes("--prune"),
  only: (argv.find((a) => a.startsWith("--only=")) || "").slice(7),
  files: argv.filter((a) => a.startsWith("--file=")).map((a) => path.resolve(a.slice(7))),
};

// ---------------- 工具 ----------------
const sha = (s) => crypto.createHash("sha1").update(s, "utf8").digest("hex");

function splitFrontmatter(text) {
  const m = text.match(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n?/);
  if (!m) return { data: null, body: text, error: "没有 frontmatter" };
  try {
    return { data: yaml.load(m[1], { schema: yaml.CORE_SCHEMA }) || {}, body: text.slice(m[0].length) };
  } catch (e) {
    return { data: null, body: text, error: "frontmatter 解析失败: " + e.message };
  }
}

const toArray = (v) => (v == null ? [] : (Array.isArray(v) ? v : [v]).map((x) => String(x).trim()).filter(Boolean));
const str = (v) => (v == null ? "" : String(v).trim());

// ---------------- 收集源文件 ----------------
const SOURCES = [
  { kind: "题目", dirs: [path.join(VAULT, "02-算法题库/LeetCode/题集"), path.join(VAULT, "02-算法题库/Codewars/题集")] },
  { kind: "博客", dirs: [path.join(VAULT, "09-博客")] },
];

function collect() {
  const out = [];
  for (const src of SOURCES) {
    if (opt.only && opt.only !== src.kind) continue;
    for (const dir of src.dirs) {
      if (!fs.existsSync(dir)) continue;
      for (const f of fs.readdirSync(dir)) {
        if (!f.toLowerCase().endsWith(".md")) continue;
        const p = path.join(dir, f);
        if (opt.files.length && !opt.files.includes(p)) continue;
        out.push({ kind: src.kind, file: p, name: f });
      }
    }
  }
  return out;
}

// ---------------- 图片暂存 ----------------
function stageImage(abs, slug, ctx) {
  const base = path.basename(abs);
  const rel = `/img/${slug}/${encodeURIComponent(base)}`;
  const dst = path.join(PUBLIC, "img", slug, base);
  ctx.images.push({ src: abs, dst, rel });
  return rel;
}

let _imgIndex = null;
function imgIndex() {
  if (_imgIndex) return _imgIndex;
  const m = new Map();
  const IMG = /\.(png|jpe?g|gif|webp|svg|bmp|avif)$/i;
  const walk = (root) => {
    const stack = [root];
    while (stack.length) {
      const dir = stack.pop();
      let ents;
      try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { continue; }
      for (const e of ents) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) { if (![".obsidian", ".git", "node_modules"].includes(e.name)) stack.push(p); }
        else if (IMG.test(e.name) && !m.has(e.name)) m.set(e.name, p);
      }
    }
  };
  walk(path.join(VAULT, "99-附件"));
  walk(VAULT);
  _imgIndex = m;
  return m;
}

// ---------------- 正文转换 ----------------
// 库内导航小节：`## 🔗 相关链接` 里的双链在第 2 步已降级成纯文本，
// 到站点上就只剩「概念卡：二分查找算法（…）」这种点不动也读不懂的死文字，
// 标题还占一个 h2。整段删掉；只要段内还有真实链接、图片或代码就保留（保守起见）。
const INTERNAL_HEADING = /^#{2,4}[ \t]*.*(?:相关链接|相关笔记|延伸阅读|所属[ \t]*MOC|相关题目)/;

function stripInternalSections(text, ctx) {
  const lines = text.split("\n");
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (INTERNAL_HEADING.test(line)) {
      const level = (line.match(/^#+/) || ["##"])[0].length;
      let j = i + 1;
      const block = [];
      while (j < lines.length) {
        const lv = (lines[j].match(/^#+/) || [""])[0].length;
        if (lv && lv <= level) break;
        block.push(lines[j]);
        j++;
      }
      const body = block.join("\n");
      const hasRealTarget = /\]\(|!\[|https?:\/\/|```/.test(body);
      if (!hasRealTarget) {
        ctx.removedSections.push(line.trim());
        i = j;
        continue;
      }
    }
    out.push(line);
    i++;
  }
  return out.join("\n");
}

function convertBody(body, ctx) {
  let out = body.replace(/\r\n/g, "\n");

  // 0 保护代码区
  const stash = [];
  out = out.replace(/```[\s\S]*?```|`[^`\n]*`/g, (m) => { stash.push(m); return `\u0001C${stash.length - 1}\u0001`; });

  // 1 库内溯源整行删除（题解尾部常见：> 🔗 题集索引：… · 算法地图：…MOC）
  out = out.split("\n").filter((line) => {
    const t = line.trim();
    if (!t) return true;
    const traced = /题集索引|算法地图|所属 MOC|源自 .*\.md|原子卡|工作区间/.test(t);
    if (traced) { ctx.removedLines.push(t.slice(0, 40)); return false; }
    return true;
  }).join("\n");

  // 2 双链降级：先删「[[…]]」里带 MOC 的整段，再统一去括号
  out = out.replace(/\[\[([^\]]+)\]\]/g, (m, inner) => {
    const name = inner.split("|")[0].trim();
    if (/MOC$|题集索引|算法地图/.test(name)) { ctx.removedLinks.push(name); return ""; }
    ctx.links.push(name);
    return name;
  });

  // 2.5 Obsidian 内部 .md 链接：博客上没有对应路由，降级为纯文本（否则 404）
  out = out.replace(/\[([^\]\n]+)\]\(([^)\s]+\.md)\)/g, (m, text, target) => {
    ctx.mdLinks.push(target);
    return text;
  });

  // 2.6 Hexo 时代的 tabs 语法：{% tabs %} / <!-- tab 标题 --> / <!-- endtab -->
  //     整块删掉会把两个思路揉成一段，所以把 tab 标题转成四级标题保留结构
  out = out.replace(/^[ \t]*\{%\s*(?:tabs|endtabs)[^%]*%\}[ \t]*$/gm, "");
  out = out.replace(/^[ \t]*<!--[ \t]*tab[ \t]+(.+?)[ \t]*-->[ \t]*$/gm, (m, title) => {
    ctx.tabs.push(title.trim());
    return `#### ${title.trim()}`;
  });
  out = out.replace(/^[ \t]*<!--[ \t]*endtab[ \t]*-->[ \t]*$/gm, "");

  // 3 Obsidian 嵌入图片
  out = out.replace(/!\[\[([^\]|]+?)(?:\|([^\]]*))?\]\]/g, (m, file, alt) => {
    const name = file.trim();
    if (!/\.(png|jpe?g|gif|webp|svg|bmp|avif)$/i.test(name)) { ctx.warns.push(`嵌入笔记 ![[${name}]] 已丢弃`); return ""; }
    const abs = imgIndex().get(path.basename(name));
    if (!abs) { ctx.warns.push(`找不到图片「${name}」`); return m; }
    return `![${(alt || path.basename(name, path.extname(name))).trim()}](${stageImage(abs, ctx.slug, ctx)})`;
  });

  // 4 标准 markdown 本地图搬运，外链原样
  out = out.replace(/!\[([^\]]*)\]\(\s*([^)\s]+)(?:\s+"[^"]*")?\s*\)/g, (m, alt, src) => {
    if (/^https?:\/\//i.test(src)) return m;
    const abs = path.isAbsolute(src) ? src : path.resolve(path.dirname(ctx.srcFile), src);
    const real = fs.existsSync(abs) ? abs : imgIndex().get(path.basename(src));
    if (!real) { ctx.warns.push(`图片路径无效「${src}」`); return m; }
    return `![${alt}](${stageImage(real, ctx.slug, ctx)})`;
  });

  // 5 callout 降级
  out = out.replace(/^>[ \t]*\[!(\w+)\][+-]?[ \t]*(.*)$/gm, (m, kind, title) => {
    ctx.callouts.push(kind);
    return title.trim() ? `> **${title.trim()}**` : "";
  });

  // 6 == 高亮：不转 <mark>，只记一笔。行内代码与 LaTeX 数学里的 == 是运算符，不算高亮
  const probe = out.replace(/^```[\s\S]*?```/gm, "").replace(/`[^`\n]*`/g, "").replace(/\$\$[\s\S]*?\$\$/g, "").replace(/\$[^$\n]*\$/g, "");
  if (probe.includes("==")) ctx.warns.push("正文含 == 高亮，已原样保留（本站不认）");

  // 7 还原代码区，顺手小写化语言名（Shiki 只认小写）
  out = out.replace(/\u0001C(\d+)\u0001/g, (m, i) => {
    const code = stash[Number(i)];
    return code.replace(/^```([A-Za-z+#]+)/, (mm, lang) => {
      const low = lang.toLowerCase();
      if (low !== lang) { ctx.loweredFences.push(lang); }
      return "```" + low;
    });
  });

  // 7.5 删掉只剩死文字的库内导航小节（相关链接 / 相关笔记）
  out = stripInternalSections(out, ctx);

  // 8 收尾：去掉正文末尾因删除溯源行而变孤立的水平分隔线，压空行，去头尾多空行
  out = out.replace(/(\n\s*---+\s*)+$/g, "\n");
  return out.replace(/\n{3,}/g, "\n\n").replace(/^\n+/, "").replace(/\s+$/, "") + "\n";
}

// ---------------- frontmatter 映射 ----------------
function mapFrontmatter(kind, data, name, ctx) {
  const fm = {};
  const rawTitle = str(data.title);
  let title = rawTitle.replace(SRC_SUFFIX, "").trim();
  // 「3970. 题名」这种带题号前缀的写法统一去掉：题号进 number。
  // 同一批题解里 16 篇带前缀、359 篇不带，页面上看起来是两套规矩。
  let prefixNum = "";
  const numPref = title.match(/^(\d+)\.\s*(.+)$/);
  if (numPref) { prefixNum = numPref[1]; title = numPref[2].trim(); }
  fm.title = title;

  if (data.date) {
    const d = str(data.date);
    fm.date = d.slice(0, 10);
    if (/\d{2}:\d{2}/.test(d) && !/[1-9]/.test(d.slice(11).replace(/:/g, ""))) {
      ctx.warns.push(`date 只有 00:00:00 时间，已去掉时间`);
    }
  } else {
    ctx.errors.push("缺 date，Astro 会排到 1970 年，必须补");
  }

  const subject = str(data.subject);
  if (subject) fm.subject = subject;

  if (kind === "题目") {
    fm.category = "题目";
  } else {
    const prefix = name.split("-")[0];
    fm.category = SUBJECT_BY_PREFIX[prefix] || "";
    if (!fm.category) ctx.errors.push(`分类映射不到：文件名前缀「${prefix}」不在 SUBJECT_BY_PREFIX 里`);
  }

  // 题号 / 难度 / 数据结构 / 平台
  if (kind === "题目") {
    const num = str(data.number) || str(data["题号"]) || prefixNum;
    if (num && num !== "—") fm.number = String(num);
    const diff = str(data.difficulty) || str(data["难度"]);
    if (["简单", "中等", "困难"].includes(diff)) fm.difficulty = diff;
    else {
      const kyu = diff.match(/^(\d+)\s*kyu$/i);
      if (kyu) fm.kyu = Number(kyu[1]);
      else if (diff && diff !== "—") ctx.errors.push(`难度值无法归一：「${diff}」（只认 简单/中等/困难 或 N kyu）`);
      else if (!diff) ctx.warns.push("难度为空");
    }
    // vault 旧键「数据结构」与站点键 topics 等价，两者都认（模板 2026-11-01 起改用 topics）
    const topics = (toArray(data.topics).length ? toArray(data.topics) : toArray(data["数据结构"]))
      .filter((t) => t && t !== "—");
    if (topics.length) fm.topics = topics;
    else ctx.warns.push("数据结构为空");

    const plat = str(data.platform) || str(data["平台"]) ||
      (/Codewars/i.test(rawTitle) ? "Codewars" : /LeetCode/i.test(rawTitle) ? "LeetCode" : "");
    if (plat === "LeetCode" || plat === "Codewars") fm.platform = plat;
    else ctx.warns.push("平台无法判定");
  }

  // tags：
  //   题解 → 剔平台/泛标签，topics 优先，不够用剩余主题词补，最多 4 个
  //   博客 → 只剔「笔记/学习」这种零信息标签，其余原样保留（不截断，
  //          否则会连带把 北极星指标 / 状态扩维 这类标签页砍掉）
  const rawTags = toArray(data.tags);
  let tags;
  if (kind === "题目") {
    const kept = rawTags.filter((t) => !GENERIC_TAGS.has(t));
    tags = [...new Set([...(fm.topics || []), ...kept])].slice(0, 4);
  } else {
    tags = rawTags.filter((t) => !["笔记", "学习"].includes(t));
  }
  if (tags.length) fm.tags = tags;
  else ctx.warns.push("tags 为空（泛标签剔干净后没有可用主题词）");

  // 摘要：库侧统一写 summary；description 仅为旧文件兜底（2026-11-01 起已全量改名）
  const desc = str(data.summary) || str(data.description);
  if (desc) {
    fm.summary = desc;
    if (desc.length > 160) ctx.warns.push(`summary ${desc.length} 字，超出 160`);
    else if (desc.length < 100) ctx.warns.push(`summary ${desc.length} 字，不足 100`);
  } else if (kind === "题目") {
    ctx.warns.push("无 summary（题解暂无摘要，必要时另行生成）");
  } else {
    ctx.errors.push("博客缺 description/summary");
  }

  if (data.cover) fm.cover = str(data.cover);
  if (data.aliases) fm.aliases = toArray(data.aliases);

  // 未知键：报，不丢
  for (const k of Object.keys(data)) {
    if (!KNOWN_VAULT_KEYS.has(k)) ctx.warns.push(`未知字段「${k}」未映射`);
  }
  return fm;
}

// ---------------- 组装一篇 ----------------
function buildPost(item) {
  const ctx = {
    slug: path.basename(item.name, ".md"),
    srcFile: item.file,
    images: [], links: [], removedLinks: [], removedLines: [], removedSections: [],
    mdLinks: [], tabs: [],
    callouts: [], warns: [], errors: [], loweredFences: [],
  };
  const text = fs.readFileSync(item.file, "utf8");
  const { data, body, error } = splitFrontmatter(text);
  if (error) { ctx.errors.push(error); return { item, ctx, content: null }; }

  const fm = mapFrontmatter(item.kind, data, item.name, ctx);
  const newBody = convertBody(body, ctx);
  const head = yaml.dump(fm, { indent: 2, lineWidth: -1, noRefs: true, sortKeys: false, quotingType: '"' })
    // 日期不加引号，跟站内现有 415 篇的写法保持一致（z.coerce.date 两种都认）
    .replace(/^(date|updated): "(\d{4}-\d{2}-\d{2})"$/gm, "$1: $2");
  const content = `---\n${head}---\n\n${newBody}`;
  const dst = path.join(CONTENT, item.kind, `${ctx.slug}.md`);
  return { item, ctx, fm, content, dst };
}

// ---------------- 主流程 ----------------
const items = collect();
const results = items.map(buildPost);

const skippedNoMark = [];
const ready = [];
for (const r of results) {
  const raw = (() => { try { return splitFrontmatter(fs.readFileSync(r.item.file, "utf8")).data || {}; } catch { return {}; } })();
  // Obsidian 冲突副本（「xxx 1.md」）不进站，也是孤儿来源
  if (/ \d+\.md$/.test(r.item.name)) { skippedNoMark.push([r.item.file, "Obsidian 冲突副本"]); continue; }
  // 索引页（categories: MOC / 文件名是「成文索引」「题集索引」）直接跳过。
  // 注意别用宽泛的「含索引」判定：`SQL-索引.md` 是一篇讲索引的文章，不是索引页。
  if (str(raw.categories) === "MOC" || str(raw.category) === "MOC" || /(成文索引|题集索引|^索引)/.test(r.item.name)) { skippedNoMark.push([r.item.file, "索引页"]); continue; }
  // 发布开关（2026-11-01 起）：默认发布；`draft: true` 或 `blog: false` 才不进站。
  // 旧口径是「标了 blog: true 才发布」，410 篇已全部去掉该字段，改由 draft 反向控制。
  const isDraft = raw.draft === true || raw.draft === "true";
  const optedOut = raw.blog === false || raw.blog === "false";
  if (!opt.files.length && (isDraft || optedOut)) {
    skippedNoMark.push([r.item.file, isDraft ? "draft: true（不发布）" : "blog: false（不发布）"]);
    continue;
  }
  ready.push(r);
}

// --print=<文件名>：把某一篇的生成结果打出来供人工审阅，不落盘
const printName = (argv.find((a) => a.startsWith("--print=")) || "").slice(8);
if (printName) {
  const hit = ready.find((r) => path.basename(r.item.file, ".md") === printName);
  if (!hit) { console.error("没找到：" + printName); process.exit(1); }
  console.log(hit.content.slice(0, 2600));
  console.log("\n---- 告警 ----\n" + (hit.ctx.warns.join("\n") || "（无）"));
  process.exit(0);
}

if (opt.roster) {  console.log(`源清单：命中 ${ready.length} 篇（题目 ${ready.filter((r) => r.item.kind === "题目").length} / 博客 ${ready.filter((r) => r.item.kind === "博客").length}）`);
  console.log(`跳过 ${skippedNoMark.length} 篇：`);
  for (const [f, why] of skippedNoMark) console.log(`  - ${path.relative(VAULT, f)}  （${why}）`);
  const dup = new Map();
  for (const r of ready) {
    const k = r.dst;
    dup.set(k, (dup.get(k) || 0) + 1);
  }
  const over = [...dup.entries()].filter(([, n]) => n > 1);
  console.log(over.length ? `⚠ 同名覆盖风险 ${over.length} 处：${over.map(([k]) => path.basename(k)).join(", ")}` : "无同名覆盖风险");
  const errs = ready.filter((r) => r.ctx.errors.length);
  console.log(`源侧硬错误 ${errs.length} 篇${errs.length ? "：" : ""}`);
  for (const r of errs.slice(0, 20)) console.log(`  ✗ ${path.basename(r.item.file)} → ${r.ctx.errors.join("；")}`);
  process.exit(0);
}

let add = 0, upd = 0, skip = 0, fail = 0;
const rows = [];
for (const r of ready) {
  if (r.ctx.errors.length) { fail++; rows.push(["失败", r]); continue; }
  const old = fs.existsSync(r.dst) ? fs.readFileSync(r.dst, "utf8") : null;
  let action;
  if (old == null) action = "新增";
  else if (sha(old) === sha(r.content)) action = "跳过";
  else action = "更新";
  if (action === "新增") add++;
  else if (action === "更新") upd++;
  else skip++;
  rows.push([action, r]);

  if (opt.write && (action !== "跳过" || opt.force)) {
    fs.mkdirSync(path.dirname(r.dst), { recursive: true });
    fs.writeFileSync(r.dst, r.content, "utf8");
    for (const img of r.ctx.images) {
      fs.mkdirSync(path.dirname(img.dst), { recursive: true });
      fs.copyFileSync(img.src, img.dst);
    }
  }
}

// —— 孤儿检测：站上有、本次却没有对应产出（源侧标了 draft、源文件已删、冲突副本）——
if (opt.files.length || opt.only) {
  // 局部处理（--only / --file）时不做孤儿判断：本次没产出 ≠ 源侧已删。
  // 否则 `--only=博客 --write --prune` 会把整个 题目/ 目录当成孤儿移进回收站。
  console.log("\n（本次为局部处理：--only / --file，已跳过孤儿检测）");
} else {
  const produced = new Set(rows.filter(([a]) => a !== "失败").map(([, r]) => path.resolve(r.dst)));
  const stale = [];
  for (const kind of ["题目", "博客"]) {
    const dir = path.join(CONTENT, kind);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      if (!f.endsWith(".md")) continue;
      const p = path.resolve(dir, f);
      if (!produced.has(p)) stale.push(p);
    }
  }
  if (stale.length) {
    console.log(`\n孤儿 ${stale.length} 篇（站上有、源侧已 draft 或已删）：`);
    for (const p of stale) console.log(`  - ${path.relative(BLOG_ROOT, p).replace(/\\/g, "/")}`);
    if (opt.prune && opt.write) {
      const trash = path.join(BLOG_ROOT, ".workbuddy", `trash-sync-${new Date().toISOString().slice(0, 10)}`);
      for (const p of stale) {
        const dest = path.join(trash, path.relative(CONTENT, p));
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.renameSync(p, dest);
      }
      console.log(`  已移入 ${path.relative(BLOG_ROOT, trash).replace(/\\/g, "/")}/（移动，未删除）`);
    } else {
      console.log("  未处理（确认无误后执行 --write --prune 移入回收目录）");
    }
  }
}

console.log(`${opt.write ? "已写入" : "干跑"}：新增 ${add}｜更新 ${upd}｜跳过 ${skip}｜失败 ${fail}`);
if (skippedNoMark.length) console.log(`另跳过 ${skippedNoMark.length} 篇（索引页／draft／冲突副本）`);

const warnAgg = new Map();
for (const [, r] of rows) for (const w of r.ctx.warns) warnAgg.set(w.replace(/「.*」/g, "「…」").replace(/\d+/g, "N"), (warnAgg.get(w.replace(/「.*」/g, "「…」").replace(/\d+/g, "N")) || 0) + 1);
if (warnAgg.size) {
  console.log("\n告警汇总：");
  for (const [k, v] of [...warnAgg.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15)) console.log(`  ${String(v).padStart(4)}  ${k}`);
}

const lowered = rows.reduce((n, [, r]) => n + r.ctx.loweredFences.length, 0);
if (lowered) console.log(`\n语言名小写化：${lowered} 处（${[...new Set(rows.flatMap(([, r]) => r.ctx.loweredFences))].join(", ")}）`);
const removed = rows.reduce((n, [, r]) => n + r.ctx.removedLines.length, 0);
if (removed) console.log(`删除库内溯源行：${removed} 行`);
const mdLinks = rows.reduce((n, [, r]) => n + r.ctx.mdLinks.length, 0);
if (mdLinks) console.log(`.md 死链降级为纯文本：${mdLinks} 处`);
const tabCount = rows.reduce((n, [, r]) => n + r.ctx.tabs.length, 0);
if (tabCount) console.log(`Hexo tab 转四级标题：${tabCount} 处`);
const deadSections = rows.reduce((n, [, r]) => n + r.ctx.removedSections.length, 0);
if (deadSections) console.log(`删除空壳「相关链接」小节：${deadSections} 处`);

if (fail) {
  console.log("\n失败明细：");
  for (const [a, r] of rows) if (a === "失败") console.log(`  ✗ ${path.basename(r.item.file)} → ${r.ctx.errors.join("；")}`);
}
if (!opt.write) console.log("\n（干跑未落盘。确认后加 --write）");
