export const workTypes = [
  { id: "all", label: "全部" },
  { id: "website", label: "网站" },
  { id: "tool", label: "工具" },
] as const;

export type WorkType = Exclude<(typeof workTypes)[number]["id"], "all">;
export type WorkVisual = "archive" | "terminal";

export interface Work {
  slug: string;
  title: string;
  englishTitle: string;
  type: WorkType;
  typeLabel: string;
  tagline: string;
  summary: string;
  role: string;
  period: string;
  tech: string[];
  visual: WorkVisual;
  sceneLabel: string;
  /** 项目性质，如「个人项目 · 已上线」 */
  nature: string;
  /** 视觉舞台顶栏中间那行字 */
  mockTitle: string;
  /** 视觉舞台右下角的英文标注 */
  visualNote: string;
  /** 详情页左侧说明 */
  asideNote: string;
  background: string;
  goals: string[];
  process: { title: string; text: string }[];
  outcomes: string[];
  responsibilities: string[];
}

// 两个案例都对应真实完成并上线的项目，文中数字均可在站内或仓库核验。
export const works: Work[] = [
  {
    slug: "this-site",
    title: "此间",
    englishTitle: "THIS SITE / PERSONAL HOMEPAGE",
    type: "website",
    typeLabel: "网站",
    tagline: "一块 macOS 风格的桌面，把写作、观影和音乐装进一个个应用窗口。",
    summary: "用 Astro 从零重写的个人站：博客、375 篇算法题解、观影与读书档案、音乐播放器，构建为 548 页纯静态页面，push 即自动部署。",
    role: "设计 / 前端 / 内容",
    period: "2026.10 — 至今",
    tech: ["Astro", "TypeScript", "CSS", "GitHub Actions"],
    visual: "archive",
    sceneLabel: "个人主页 / 桌面与应用",
    nature: "个人项目 · 已上线",
    mockTitle: "blog.id-zyuan.xyz",
    visualNote: "LIVE / BLOG.ID-ZYUAN.XYZ",
    asideNote:
      "这个站点本身。下面的界面是纯 CSS 重绘，用来说明信息架构；真实页面可以直接在 blog.id-zyuan.xyz 打开。",
    background:
      "此前用 Hexo 维护旧站，写作则散落在 Obsidian 里。我想要一个界面和内容都由自己掌控的地方，于是用 Astro 把站点重写了一遍：每个内容板块是一个「应用」，切换应用的观感接近切换窗口。",
    goals: [
      "把真实账号数据接进页面：豆瓣的观影与读书记录、网易云歌单，构建期抓取并缓存到本地。",
      "保持纯静态、零后端，任何一页都能直接从 CDN 返回，部署不依赖服务器。",
      "让写好的东西能直接上站，而不是复制粘贴到另一套系统里。",
    ],
    process: [
      {
        title: "先定桌面，再定页面",
        text: "以 macOS 的菜单栏、窗口和 Dock 为骨架，把博客、题解、电影、图书、音乐、相册拆成独立应用，用 View Transitions 承接切换时的连续感。",
      },
      {
        title: "给外部数据留退路",
        text: "豆瓣和网易云都没有可用的公开接口，抓取会限流、会改版。于是把数据落到本地缓存，构建时优先读缓存，失败则降级为占位，保证外部服务出问题不会拖垮整站构建。",
      },
      {
        title: "在最细的地方收口",
        text: "处理 Obsidian 里单独成行的公式块、让歌词逐行高亮并居中、把文章卡片整块设为可点、逐页验证深层链接返回 200。",
      },
    ],
    outcomes: [
      "548 页全部预渲染，深层链接逐页验证返回 200，正文不依赖 JavaScript 即可阅读。",
      "108 部观影记录与读书档案来自真实豆瓣账号，歌单与歌词来自网易云。",
      "从 Hexo 平滑迁到新域名：旧地址 301 指向新站，部署由 GitHub Actions 完成。",
    ],
    responsibilities: ["视觉与交互设计", "Astro 组件与数据层", "内容运营与 CI/CD"],
  },
  {
    slug: "vault-pipeline",
    title: "摆渡",
    englishTitle: "VAULT / CONTENT PIPELINE",
    type: "tool",
    typeLabel: "工具",
    tagline: "从 Obsidian 笔记库到线上站点，一条不需要人搬运的流水线。",
    summary: "一个 Node.js 同步工具：读取库里的笔记与 frontmatter，校验、转换后写入 Astro 内容集合——375 篇题解和 40 篇博客由此上站。",
    role: "设计 / 开发",
    period: "2026.10 — 至今",
    tech: ["Node.js", "Astro", "CI"],
    visual: "terminal",
    sceneLabel: "同步工具 / 终端输出",
    nature: "个人项目 · 本地工具",
    mockTitle: "vault → site / sync",
    visualNote: "REAL OUTPUT",
    asideNote: "跑在本地的同步脚本，不对外提供服务。下面的终端内容按真实执行输出整理。",
    background:
      "所有写作都在 Obsidian 里完成——题解、技术笔记、影评。手工复制到站点既容易漏，也容易把字段写歪。于是写了一条流水线：读库、校验字段、生成路径、写入内容集合，构建时再验证结果。",
    goals: [
      "单一事实源：Obsidian 库是唯一入口，站点内容全部由它派生。",
      "幂等可重跑：重复执行不产生重复字段或脏数据，写前先清掉同键行。",
      "错误前置：字段白名单校验、缺失项告警，问题在构建前就暴露出来。",
    ],
    process: [
      {
        title: "先写字段契约",
        text: "把分类、平台、题号、难度、标签、摘要这些字段怎么写在库里、怎么显示在站上先定下来，代码只是执行这份约定。",
      },
      {
        title: "校验、幂等、可回溯",
        text: "未知字段告警、缺失字段回退、写前清理同键行；每批写入后比对库侧原文、生成文件与构建产物三处，确认逐字一致。",
      },
      {
        title: "接进构建流程",
        text: "同步脚本在 astro build 之前执行，本地与 CI 走同一条路径，push 即完成「笔记 → 站点」的全链路。",
      },
    ],
    outcomes: [
      "375 篇题解与 40 篇博客零手工搬运，字段口径长期保持一致。",
      "存量治理（摘要补齐、103 个裸代码块补语言标注）由幂等脚本批量完成，逐批验证后落库。",
      "写前备份、写后结构检查，出错能定位到具体文件并可回滚。",
    ],
    responsibilities: ["同步工具设计与实现", "字段契约与校验规则", "批量治理脚本与验证"],
  },
];
