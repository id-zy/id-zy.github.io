/**
 * 四个板块的兜底数据（豆瓣/网易云不可达时使用，内容仍是示例，可整体替换）。
 * 本期策展已改为直接读取真实缓存，不再依赖这里的条目。
 * 没有 image/cover 的条目由页面用 CSS 生成封面，避免占位外链。
 */

const unsplash = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1600&q=80`;
const still = (seed: string) => `https://picsum.photos/seed/${seed}/1600/1000`;

export interface MediaTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  year: string;
  mood: string;
  cover?: string;
  tint: [string, string];
  alt: string;
  note: string;
  frequencies: [number, number, number];
}

export interface MediaFilm {
  id: string;
  title: string;
  year: string;
  director: string;
  duration: string;
  kind: string;
  region: string;
  image?: string;
  tint: [string, string];
  alt: string;
  note: string;
}

export interface MediaBook {
  id: string;
  title: string;
  author: string;
  year: string;
  status: "在读" | "读完" | "重读";
  category: string;
  tint: [string, string];
  quote: string;
  note: string;
}

export interface MediaPhoto {
  id: string;
  title: string;
  location: string;
  date: string;
  roll: string;
  image?: string;
  tint: [string, string];
  alt: string;
  note: string;
}

export const musicTracks: MediaTrack[] = [
  {
    id: "rain-loop",
    title: "雨后环线",
    artist: "示例声音计划",
    album: "夜行散记",
    year: "2026",
    mood: "夜行",
    cover: unsplash("photo-1493225457124-a3eb161ffa5f"),
    tint: ["#4f7b83", "#28474d"],
    alt: "示例音乐封面：暗光中的唱机与唱片",
    note: "轨道接缝的低响、雨滴与远处人声折进一段循环。此处只生成八秒合成氛围音，不是原曲录音。",
    frequencies: [110, 164.81, 220],
  },
  {
    id: "under-water",
    title: "水面以下",
    artist: "示例声音计划",
    album: "夜行散记",
    year: "2026",
    mood: "夜行",
    cover: unsplash("photo-1511379938547-c1f69419868d"),
    tint: ["#4f7b83", "#22383d"],
    alt: "示例音乐封面：录音设备与交错的声音线缆",
    note: "低频像桥墩，细碎噪声像水纹，是一次向下的听觉散步。此处只生成八秒合成氛围音。",
    frequencies: [98, 146.83, 196],
  },
  {
    id: "window-etude",
    title: "亮窗练习曲",
    artist: "示例声音计划",
    album: "夜行散记",
    year: "2025",
    mood: "独处",
    cover: unsplash("photo-1470225620780-dba8ba36b745"),
    tint: ["#3c5c73", "#1d2d38"],
    alt: "示例音乐封面：蓝色暗光里的混音台",
    note: "三个音彼此保持距离，像深夜里互不相识的房间。此处只生成八秒合成氛围音。",
    frequencies: [123.47, 185, 246.94],
  },
  {
    id: "before-light",
    title: "天色将明",
    artist: "示例声音计划",
    album: "夜行散记",
    year: "2025",
    mood: "清晨",
    cover: unsplash("photo-1524368535928-5b5e00ddc76b"),
    tint: ["#d8a24a", "#8d5d17"],
    alt: "示例音乐封面：演出空间里渐亮的灯光",
    note: "声音从近乎静止开始，留一点空白给第一班车。此处只生成八秒合成氛围音。",
    frequencies: [130.81, 196, 261.63],
  },
  {
    id: "platform-noise",
    title: "站台噪声",
    artist: "示例声音计划",
    album: "城市底噪",
    year: "2025",
    mood: "夜行",
    tint: ["#6e1f2a", "#38101a"],
    alt: "示例曲目《站台噪声》的渐变封面",
    note: "把广播、铁轨与拖行李箱的声音压成一层底噪，听久了会变成节拍。",
    frequencies: [92.5, 138.59, 185],
  },
  {
    id: "under-flyover",
    title: "立交桥下",
    artist: "示例声音计划",
    album: "城市底噪",
    year: "2024",
    mood: "独处",
    tint: ["#2e2440", "#171227"],
    alt: "示例曲目《立交桥下》的渐变封面",
    note: "桥洞像一个天然混响室，车流经过时声音被拉长又迅速收走。",
    frequencies: [87.31, 130.81, 174.61],
  },
  {
    id: "store-bgm",
    title: "便利店 BGM",
    artist: "示例声音计划",
    album: "城市底噪",
    year: "2024",
    mood: "日常",
    tint: ["#d8a24a", "#6e1f2a"],
    alt: "示例曲目《便利店 BGM》的渐变封面",
    note: "凌晨两点的店里，音乐永远比白天慢半拍，像替值夜的人守着时间。",
    frequencies: [146.83, 220, 293.66],
  },
  {
    id: "slow-return",
    title: "慢速返程",
    artist: "示例声音计划",
    album: "城市底噪",
    year: "2023",
    mood: "清晨",
    tint: ["#4f7b83", "#1b2a41"],
    alt: "示例曲目《慢速返程》的渐变封面",
    note: "写给走回家的路：没有高潮，只有一段允许你放慢的和声。",
    frequencies: [103.83, 155.56, 207.65],
  },
];

export const filmEntries: MediaFilm[] = [
  {
    id: "last-train-film",
    title: "末班车的乘客",
    year: "2024",
    director: "林岸",
    duration: "24 分钟",
    kind: "短片",
    region: "中国大陆",
    image: unsplash("photo-1519608487953-e999c86e7455"),
    tint: ["#1b2a41", "#0e1626"],
    alt: "示例电影剧照：夜色中的城市天际线与稀疏灯火",
    note: "镜头始终留在车厢外。人影被灯光短暂照亮，又交还给黑夜。",
  },
  {
    id: "river-film",
    title: "河流不说晚安",
    year: "2023",
    director: "许照",
    duration: "31 分钟",
    kind: "纪录",
    region: "中国大陆",
    image: unsplash("photo-1477959858617-67f85cf4f1df"),
    tint: ["#22383d", "#101114"],
    alt: "示例电影剧照：高楼之间向远处延伸的城市河道",
    note: "沿河的长镜头把喧闹推到画外，水面收下这座城市无法归档的情绪。",
  },
  {
    id: "windows-film",
    title: "窗内的宇宙",
    year: "2022",
    director: "周弥",
    duration: "18 分钟",
    kind: "短片",
    region: "中国大陆",
    image: unsplash("photo-1519501025264-65ba15a82390"),
    tint: ["#2e2440", "#171227"],
    alt: "示例电影剧照：夜幕下密集的建筑与亮窗",
    note: "每一扇亮窗都是一个拒绝收尾的故事，摄影机只在远处凝望。",
  },
  {
    id: "before-dawn-film",
    title: "清晨以前",
    year: "2021",
    director: "顾迟",
    duration: "27 分钟",
    kind: "短片",
    region: "中国香港",
    image: unsplash("photo-1480714378408-67cf0d13bc1b"),
    tint: ["#6e1f2a", "#38101a"],
    alt: "示例电影剧照：微光中层层叠叠的城市建筑",
    note: "清洁车转过街角，早餐店拉起卷帘，城市开始练习另一种记忆。",
  },
  {
    id: "night-bus-film",
    title: "夜班公交",
    year: "2025",
    director: "何砚",
    duration: "42 分钟",
    kind: "纪录",
    region: "中国大陆",
    image: still("night-bus-2025"),
    tint: ["#1b2a41", "#101114"],
    alt: "示例电影《夜班公交》的剧照占位",
    note: "一辆车、一位司机、十一位乘客，镜头不提问，只记录他们各自下车的地方。",
  },
  {
    id: "convenience-film",
    title: "二十四小时",
    year: "2024",
    director: "苏黎",
    duration: "15 分钟",
    kind: "短片",
    region: "日本",
    image: still("convenience-2024"),
    tint: ["#d8a24a", "#8d5d17"],
    alt: "示例电影《二十四小时》的剧照占位",
    note: "整部片只发生在四十平米里，借冷柜的光完成所有布光。",
  },
  {
    id: "rooftop-film",
    title: "天台上的无线电",
    year: "2023",
    director: "程野",
    duration: "36 分钟",
    kind: "长片",
    region: "中国大陆",
    image: still("rooftop-2023"),
    tint: ["#4f7b83", "#22383d"],
    alt: "示例电影《天台上的无线电》的剧照占位",
    note: "两个陌生人靠一台旧收音机分享夜晚，谁也没有问对方的名字。",
  },
  {
    id: "tunnel-film",
    title: "隧道尽头有光，但不亮",
    year: "2022",
    director: "沈括",
    duration: "21 分钟",
    kind: "实验",
    region: "中国大陆",
    image: still("tunnel-2022"),
    tint: ["#2e2440", "#101114"],
    alt: "示例电影《隧道尽头有光，但不亮》的剧照占位",
    note: "全片只用隧道灯与仪表盘的光，把通勤路拍成一段呼吸。",
  },
];

export const bookEntries: MediaBook[] = [
  {
    id: "city-asleep",
    title: "城市入睡以后",
    author: "周遥",
    year: "2025",
    status: "读完",
    category: "城市",
    tint: ["#4f7b83", "#28474d"],
    quote: "末班车穿过江面时，所有人都短暂地望向了同一个方向。窗外没有答案，只有被灯光重新排列的黑夜。",
    note: "与《末班车的乘客》形成互文：一个保留凝视，一个保留沉默。",
  },
  {
    id: "river-notes",
    title: "沿河笔记",
    author: "沈青",
    year: "2024",
    status: "重读",
    category: "随笔",
    tint: ["#22383d", "#101114"],
    quote: "我沿着河走，并不是想去哪里。水把两岸的灯带向远处，我便觉得自己也终于移动了一点。",
    note: "河流在这里不是风景，而是一种剪辑方式。",
  },
  {
    id: "strange-rooms",
    title: "陌生房间",
    author: "唐未",
    year: "2023",
    status: "读完",
    category: "小说",
    tint: ["#2e2440", "#171227"],
    quote: "对面楼还有七扇窗亮着。我看不见屋里的人，却替他们保留了一杯热茶、一本摊开的书和一句晚安。",
    note: "摘录把观看变成温柔的虚构，距离本身也是城市生活的一部分。",
  },
  {
    id: "edge-of-day",
    title: "白昼边缘",
    author: "陆澄",
    year: "2022",
    status: "读完",
    category: "随笔",
    tint: ["#d8a24a", "#8d5d17"],
    quote: "天快亮时，街道把昨夜遗落的东西一一归还：路牌、树影、店名，以及那个走了很远的自己。",
    note: "这一则把夜游带回日常，光不是突然出现的。",
  },
  {
    id: "night-shift",
    title: "值夜的人",
    author: "柳原",
    year: "2026",
    status: "在读",
    category: "非虚构",
    tint: ["#1b2a41", "#0e1626"],
    quote: "他们把城市交给白天，自己留下看守那些还没熄灭的部分。",
    note: "正在读的一本访谈集，与《夜班公交》可以对照着看。",
  },
  {
    id: "light-manual",
    title: "灯的使用说明",
    author: "安栖",
    year: "2025",
    status: "在读",
    category: "技术",
    tint: ["#6e1f2a", "#38101a"],
    quote: "一盏灯并不照亮房间，它只是替房间确定边界。",
    note: "讲照明设计，也讲人如何在光里安放自己。",
  },
  {
    id: "walk-alone",
    title: "一个人走路的技术",
    author: "简屿",
    year: "2024",
    status: "读完",
    category: "随笔",
    tint: ["#4f7b83", "#1b2a41"],
    quote: "走路是最慢的交通方式，也是唯一允许中途改变的交通方式。",
    note: "把散步写成一种方法论，读完想立刻出门走一小时。",
  },
  {
    id: "sound-map",
    title: "声音地图",
    author: "闻涛",
    year: "2023",
    status: "重读",
    category: "非虚构",
    tint: ["#2e2440", "#101114"],
    quote: "闭上眼，城市会按声音重新分区：菜场、路口、桥洞、无人巷。",
    note: "与声音板块同源，读它时最好戴着耳机。",
  },
];

export const photoEntries: MediaPhoto[] = [
  {
    id: "platform-afterglow",
    title: "站台的余光",
    location: "临江站",
    date: "2026-03-18",
    roll: "夜行卷",
    image: unsplash("photo-1514565131-fce0801e578c"),
    tint: ["#6e1f2a", "#38101a"],
    alt: "示例照片：夜间道路、车流与城市灯光",
    note: "车门合上以后，站台仍留着一小片暖色。",
  },
  {
    id: "slow-time-bridge",
    title: "桥下的慢时间",
    location: "南河步道",
    date: "2026-04-02",
    roll: "夜行卷",
    image: unsplash("photo-1449824913935-59a10b8d2000"),
    tint: ["#22383d", "#101114"],
    alt: "示例照片：街道向远处延伸，两侧是城市建筑",
    note: "水面没有脚步，所以倒影总比行人慢半拍。",
  },
  {
    id: "one-window-away",
    title: "一扇窗的距离",
    location: "旧城北街",
    date: "2025-11-27",
    roll: "亮窗卷",
    image: unsplash("photo-1511818966892-d7d671e672a2"),
    tint: ["#2e2440", "#171227"],
    alt: "示例照片：建筑立面与规则排列的窗户局部",
    note: "只截取建筑的一角，让每扇窗保留匿名。",
  },
  {
    id: "before-first-bus",
    title: "第一班车以前",
    location: "东门路口",
    date: "2025-09-14",
    roll: "清晨卷",
    image: unsplash("photo-1494526585095-c41746248156"),
    tint: ["#d8a24a", "#8d5d17"],
    alt: "示例照片：天色将明时安静的建筑与窗光",
    note: "街道还没有变亮，窗里已经有人开始新的一天。",
  },
  {
    id: "wet-crossing",
    title: "雨后的斑马线",
    location: "解放路口",
    date: "2026-05-09",
    roll: "夜行卷",
    image: still("wet-crossing-2026"),
    tint: ["#1b2a41", "#0e1626"],
    alt: "示例照片：雨后路面反光与人行横道",
    note: "刚下过雨，路面把红灯复制了一份。",
  },
  {
    id: "night-market-steam",
    title: "夜市的热气",
    location: "西关小巷",
    date: "2025-12-21",
    roll: "夜行卷",
    image: still("night-market-2025"),
    tint: ["#6e1f2a", "#8d5d17"],
    alt: "示例照片：夜市摊位与升腾的热气",
    note: "热气让镜头短暂起雾，那是这张照片最好的部分。",
  },
  {
    id: "stair-light",
    title: "楼梯间的声控灯",
    location: "南塘老楼",
    date: "2025-08-03",
    roll: "亮窗卷",
    image: still("stair-light-2025"),
    tint: ["#4f7b83", "#28474d"],
    alt: "示例照片：老楼楼梯间与声控灯",
    note: "拍了六次才等到灯亮的那一秒。",
  },
  {
    id: "empty-last-car",
    title: "空车厢",
    location: "环线末班",
    date: "2026-01-30",
    roll: "清晨卷",
    image: still("empty-car-2026"),
    tint: ["#2e2440", "#101114"],
    alt: "示例照片：夜间空荡的列车车厢",
    note: "终点站之前，车厢里只剩下灯和影子。",
  },
];

/** 板块元信息：列表页开屏与 SiteNav 共用 */
export const sections = [
  {
    id: "music",
    label: "音乐",
    href: "/music",
    tagline: "声场",
    intro: "把城市的底噪听成伴奏。这里收录最近在听的曲目，声音只在你邀请它时出现。",
    tint: ["#4f7b83", "#28474d"],
  },
  {
    id: "movie",
    label: "电影",
    href: "/movie",
    tagline: "放映厅",
    intro: "一份长期片单。灯光亮起，不代表观看已经结束。",
    tint: ["#6e1f2a", "#38101a"],
  },
  {
    id: "book",
    label: "图书",
    href: "/book",
    tagline: "阅读室",
    intro: "在读、读完与重读。文字不解释夜晚，只替它保留余温。",
    tint: ["#d8a24a", "#8d5d17"],
  },
  {
    id: "gallery",
    label: "相册",
    href: "/gallery",
    tagline: "显影",
    intro: "随手拍下的城市片段，按卷归档，点开可以慢慢看。",
    tint: ["#2e2440", "#171227"],
  },
] as const;

export type SectionId = (typeof sections)[number]["id"];
