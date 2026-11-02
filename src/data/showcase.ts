// 首页分区的占位数据，待你之后替换为真实内容。
// 颜色用 hue（色相）生成渐变占位块，无需图片资源。

// 音乐：第一位为「正在播放」，其余为列表。dur 为时长（秒），占位数据。
// lyrics 为逐行歌词（占位），接入网易云 API 时可用接口返回的真实歌词替换。
// 接入网易云 API 时，用接口返回替换整个数组即可（封面可用 picUrl 的 hue 占位或真实图）。
export const music = [
  {
    title: "示例曲目 A", artist: "示例艺人", hue: 205, dur: 214,
    lyrics: [
      "（示例歌词 · 占位）",
      "轻轻拨动弦上的光",
      "风穿过指间的凉",
      "把心事弹给月亮听",
      "夜色就这样慢下来",
    ],
  },
  {
    title: "示例曲目 B", artist: "示例艺人", hue: 8, dur: 198,
    lyrics: [
      "（示例歌词 · 占位）",
      "灯火在窗外摇晃",
      "我在琴声里流浪",
      "一首未完的故乡",
    ],
  },
  {
    title: "示例曲目 C", artist: "示例艺人", hue: 150, dur: 236,
    lyrics: [
      "（示例歌词 · 占位）",
      "山高水长路弯弯",
      "琵琶语里说平生",
      "且听且行且从容",
    ],
  },
  {
    title: "示例曲目 D", artist: "示例艺人", hue: 282, dur: 175,
    lyrics: [
      "（示例歌词 · 占位）",
      "晚风收起白日的喧响",
      "只剩弦与心的对望",
    ],
  },
  {
    title: "示例曲目 E", artist: "示例艺人", hue: 42, dur: 252,
    lyrics: [
      "（示例歌词 · 占位）",
      "春水初生，春林初盛",
      "春风十里，不如你",
      "指尖落下满城烟雨",
    ],
  },
];

// short：票根背面的一句短评；seat：票根上的座位号（占位，可换成真实场次）
export const movies = [
  { title: "电影名（占位）", year: 2024, rating: 4.5, hue: 150, status: "看过",
    short: "散场后在门口站了很久，路灯把影子拉得很长。", seat: "7 排 12 座" },
  { title: "电影名（占位）", year: 2023, rating: 4, hue: 168, status: "看过",
    short: "镜头很慢，慢到能听见风穿过麦子的声音。", seat: "5 排 08 座" },
  { title: "电影名（占位）", year: 2022, rating: 5, hue: 138, status: "看过",
    short: "看完那天晚上没开灯，在床上躺了一整夜。", seat: "9 排 03 座" },
  { title: "电影名（占位）", year: 2021, rating: 3.5, hue: 186, status: "想看",
    short: "据说结尾收得很轻，像一句话没说完。", seat: "未定" },
  { title: "电影名（占位）", year: 2020, rating: 4, hue: 120, status: "看过",
    short: "第二次看才发现，前半段一直在下雨。", seat: "3 排 15 座" },
  { title: "电影名（占位）", year: 2019, rating: 4.5, hue: 158, status: "想看",
    short: "存了很久，想等一个足够安静的下午再看。", seat: "未定" },
];

// quote：你划下的那一句；progress：阅读进度；date：读完（或标注）的月份
export const books = [
  { title: "书名（占位）", author: "作者名", rating: 5, hue: 150, status: "读过",
    quote: "把这句话换成你真正划过的那一行。", progress: 100, date: "2026.04" },
  { title: "书名（占位）", author: "作者名", rating: 4, hue: 170, status: "在读",
    quote: "读到一半，先记住这一句。", progress: 62, date: "2026.10" },
  { title: "书名（占位）", author: "作者名", rating: 4.5, hue: 132, status: "读过",
    quote: "好的句子会自己发光，不需要解释。", progress: 100, date: "2026.02" },
  { title: "书名（占位）", author: "作者名", rating: 3.5, hue: 188, status: "想看",
    quote: "还没拆封，先记着。", progress: 0, date: "待读" },
  { title: "书名（占位）", author: "作者名", rating: 4, hue: 144, status: "读过",
    quote: "读完了，反而不知道该说什么。", progress: 100, date: "2025.12" },
];

export const gallery = [
  { hue: 150, tilt: -2, note: "雨后的窗", date: "2026.06" },
  { hue: 168, tilt: 1.5, note: "楼梯间的绿", date: "2026.05" },
  { hue: 132, tilt: -1, note: "午后树叶", date: "2026.04" },
  { hue: 186, tilt: 2, note: "一条很慢的路", date: "2026.03" },
  { hue: 120, tilt: -1.5, note: "早上的雾", date: "2026.02" },
  { hue: 158, tilt: 1, note: "窗台上的光", date: "2026.01" },
  { hue: 176, tilt: -2, note: "夏天的尾巴", date: "2025.09" },
  { hue: 142, tilt: 1.5, note: "第一次拍夜景", date: "2025.07" },
];
