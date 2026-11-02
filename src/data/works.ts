export const workTypes = [
  { id: "all", label: "全部" },
  { id: "website", label: "网站" },
  { id: "tool", label: "工具" },
  { id: "experiment", label: "实验" },
] as const;

export type WorkType = Exclude<(typeof workTypes)[number]["id"], "all">;
export type WorkVisual = "archive" | "tool" | "prism";

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
  background: string;
  goals: string[];
  process: { title: string; text: string }[];
  outcomes: string[];
  responsibilities: string[];
}

// 以下内容均为案例页结构演示，不对应真实客户、用户数据或在线产品。
export const works: Work[] = [
  {
    slug: "qiye-editorial-archive",
    title: "栖页",
    englishTitle: "QIYE / EDITORIAL ARCHIVE",
    type: "website",
    typeLabel: "网站",
    tagline: "为慢阅读设计的一座私人内容档案馆。",
    summary: "把散落的笔记、书摘与观察整理成可漫游的编辑型网站，以安静的层级替代信息流。",
    role: "设计 / 前端",
    period: "2025.03 — 2025.05",
    tech: ["Astro", "TypeScript", "CSS"],
    visual: "archive",
    sceneLabel: "编辑型网站 / 首页与索引",
    background: "示例设定：一位长期记录者积累了大量笔记、书摘与片段，却不愿把它们交给按时间催促阅读的信息流。项目试图做一个可以停留、回看，也允许偶然发现的私人档案馆。",
    goals: [
      "让内容之间的关系比发布时间更容易被感知。",
      "在桌面与移动设备上都保留舒展、清晰的阅读节奏。",
      "以少量组件支撑首页、专题、索引和阅读页的变化。",
    ],
    process: [
      {
        title: "先整理内容，再画页面",
        text: "以主题、媒介和阅读状态建立内容模型，用真实长度的示例文本检验标题、摘要与索引的边界。",
      },
      {
        title: "让导航退到内容之后",
        text: "用编辑目录替代密集入口，以字号、留白和细线区分层级；链接只在需要行动时出现。",
      },
      {
        title: "用组件约束变化",
        text: "把刊头、目录、文章元信息与脚注整理为可复用模块，再针对窄屏重排，而不是等比缩小桌面稿。",
      },
    ],
    outcomes: [
      "形成从首页到专题、索引与阅读页的完整高保真页面体系。",
      "建立可复用的排版规则与内容字段，方便后续替换为真实文章。",
      "完成键盘浏览、焦点状态与减少动态效果等基础体验检查。",
    ],
    responsibilities: ["信息架构与内容建模", "版式、交互与响应式界面", "Astro 页面与纯 CSS 视觉原型"],
  },
  {
    slug: "mark-annotation-tool",
    title: "刻度",
    englishTitle: "MARK / ANNOTATION TOOL",
    type: "tool",
    typeLabel: "工具",
    tagline: "把片段、想法与出处收进一张安静的工作台。",
    summary: "一件围绕本地标注设计的工具概念：减少面板干扰，让收集、整理与回看发生在同一视野里。",
    role: "产品设计 / 原型",
    period: "2025.06 — 2025.08",
    tech: ["TypeScript", "Astro", "IndexedDB"],
    visual: "tool",
    sceneLabel: "本地工具 / 标注工作流",
    background: "示例设定：阅读过程中，摘录常常散落在不同文档里，想法与原文也逐渐失去联系。这个工具概念以本地优先为前提，探索如何在一个工作区内完成摘录、批注和归档。",
    goals: [
      "让原文与批注始终保有清晰的上下文关系。",
      "用键盘也能完成选择、标记和移动焦点等核心操作。",
      "明确本地保存与空状态，不制造已经同步或在线的错觉。",
    ],
    process: [
      {
        title: "先走通一条最短路径",
        text: "围绕“粘贴片段—添加批注—归入主题”绘制任务流，暂时舍弃协作、分享和复杂账户体系。",
      },
      {
        title: "把状态放在手边",
        text: "将筛选、当前片段与批注面板放在同一视野，用对齐和色彩提示选择状态，减少弹窗切换。",
      },
      {
        title: "为空与错误预留位置",
        text: "同时设计首次使用、无搜索结果、本地存储不可用等界面，让工具不只展示理想状态。",
      },
    ],
    outcomes: [
      "形成覆盖收集、标注、检索与归档的交互原型。",
      "整理出工具界面的状态矩阵和键盘操作路径。",
      "明确示例中的本地数据边界，未接入账户、同步或外部服务。",
    ],
    responsibilities: ["任务流与功能边界", "工作台界面及状态设计", "前端交互与本地数据原型"],
  },
  {
    slug: "prism-generative-study",
    title: "折光",
    englishTitle: "PRISM / GENERATIVE STUDY",
    type: "experiment",
    typeLabel: "实验",
    tagline: "把一组几何规则，推演出会呼吸的画面。",
    summary: "一场关于网格、透明度与留白的生成视觉实验，用有限参数寻找秩序和偶然之间的平衡。",
    role: "创意编码 / 视觉设计",
    period: "2025.09 — 2025.10",
    tech: ["Canvas", "TypeScript", "CSS"],
    visual: "prism",
    sceneLabel: "生成实验 / 参数与构图",
    background: "示例设定：如果一张海报不是被逐像素摆放，而是由一小组规则生长出来，它能否仍然保持编辑设计的克制？实验从电影放映时的光束与显影色彩出发，研究生成构图。",
    goals: [
      "让随机结果始终服从可识别的网格与视觉重心。",
      "把参数控制设计成创作过程的一部分，而非技术面板。",
      "在动态画面中保留低动态偏好与静态导出的选择。",
    ],
    process: [
      {
        title: "从一张网格开始",
        text: "先固定画布分区与基线，再允许圆形、切线和透明色块在有限区域内发生偏移。",
      },
      {
        title: "给偶然设置边界",
        text: "限制色相、数量和重叠范围，以种子复现构图，避免每次生成完全失去方向。",
      },
      {
        title: "把控制器放进画面",
        text: "将密度、偏移和显影强度安排在画布边缘，让调整时的视觉反馈保持直接。",
      },
    ],
    outcomes: [
      "建立一套可复现的几何构图与配色规则。",
      "形成画布、参数区和静态帧展示的完整实验界面。",
      "补充减少动态效果时的静态画面与清晰控制状态。",
    ],
    responsibilities: ["生成规则与参数设计", "Canvas 视觉原型", "控制界面与响应式呈现"],
  },
];
