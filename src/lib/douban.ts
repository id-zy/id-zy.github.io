import fs from "node:fs";
import path from "node:path";
import type { MediaBook, MediaFilm } from "../data/media";

export interface DoubanWallBook {
  id?: string;
  title: string;
  author: string;
  year: string;
  status: string;
  quote: string;
  cover?: string;
  url: string;
  tint: [string, string];
  rating?: number;
}

/**
 * 豆瓣抓取说明
 * - book.douban.com 的「读过」列表页对匿名请求返回 403，必须先访问用户主页拿到 bid cookie 再带着请求。
 * - 构建期抓取成功后写入 .cache/douban-books.json；之后网络不通或触发风控时直接读缓存，构建不会失败。
 */
const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const BOOK_BASE = "https://book.douban.com";
const CACHE_DIR = path.join(process.cwd(), ".cache");
const POSTERS_DIR = path.join(process.cwd(), "public", "covers", "douban-film");
const BOOK_TINTS: Array<[string, string]> = [
  ["#4f7b83", "#28474d"],
  ["#22383d", "#101114"],
  ["#5a4a32", "#241c14"],
  ["#3d3350", "#171326"],
  ["#4a3a3a", "#1d1414"],
  ["#33493a", "#141f17"],
];

const readCache = <T>(fileName: string, key: string): T[] => {
  try {
    const parsed = JSON.parse(fs.readFileSync(path.join(CACHE_DIR, fileName), "utf8")) as Record<string, unknown>;
    return Array.isArray(parsed[key]) ? (parsed[key] as T[]) : [];
  } catch {
    return [];
  }
};

const writeCache = (fileName: string, key: string, items: unknown[]) => {
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    // 数据没变化就不重写文件：syncedAt 时间戳每次构建都会变，
    // 会让 git 里出现只有时间戳差异的无效提交。
    const filePath = path.join(CACHE_DIR, fileName);
    try {
      const prev = JSON.parse(fs.readFileSync(filePath, "utf8")) as Record<string, unknown>;
      if (JSON.stringify(prev[key]) === JSON.stringify(items)) return;
    } catch {
      /* 旧缓存不存在或损坏，走正常写入。 */
    }
    fs.writeFileSync(
      filePath,
      JSON.stringify({ syncedAt: new Date().toISOString(), [key]: items }, null, 2),
      "utf8",
    );
  } catch {
    /* 缓存写不进去不影响构建。 */
  }
};

type ApiBook = {
  id?: string | number;
  title?: string;
  author?: string | string[];
  pubdate?: string;
  year?: string | number;
  image?: string;
  cover?: string;
  cover_url?: string;
  alt?: string;
  url?: string;
  summary?: string;
};

const searchUrl = (title: string) =>
  `https://search.douban.com/book/subject_search?search_text=${encodeURIComponent(title)}&cat=1001`;

const normalize = (book: ApiBook, index: number, fallback: MediaBook[]): DoubanWallBook | null => {
  if (!book.title) return null;
  const base = fallback[index % fallback.length];
  const id = book.id === undefined ? undefined : String(book.id);
  return {
    id,
    title: book.title,
    author: Array.isArray(book.author) ? book.author.join(" / ") : book.author ?? "未知作者",
    year: String(book.year ?? book.pubdate ?? ""),
    status: base.status,
    quote: book.summary?.slice(0, 90) || base.quote,
    cover: book.cover_url ?? book.cover ?? book.image,
    url: book.alt ?? book.url ?? (id ? `https://book.douban.com/subject/${id}/` : searchUrl(book.title)),
    tint: base.tint,
  };
};

/** 「读过」列表页每本的结构：封面 + 书名 + 作者/出版社/年份 + 星级 + 短评。 */
const parseBookListPage = (html: string): DoubanWallBook[] => {
  const items = [...html.matchAll(/<li class="subject-item">([\s\S]*?)<\/li>/g)];
  return items.flatMap((match, index): DoubanWallBook[] => {
    const block = match[1];
    const href = block.match(/href="(https:\/\/book\.douban\.com\/subject\/(\d+)\/?)"/)?.[1];
    const title = block.match(/<h2>[\s\S]*?title="([^"]+)"/)?.[1] ?? block.match(/<h2>[\s\S]*?>([^<]+)<\/a>/)?.[1];
    if (!title) return [];
    const cover = block.match(/<img[^>]+src="([^"]+)"/)?.[1];
    const pubLine = (block.match(/<div class="pub">([\s\S]*?)<\/div>/)?.[1] ?? "").replace(/<[^>]+>/g, "");
    const parts = pubLine
      .split("/")
      .map((part) => part.replace(/&nbsp;/g, " ").trim())
      .filter(Boolean);
    const year = parts.find((part) => /^(?:19|20)\d{2}(?:-\d{1,2})?$/.test(part))?.slice(0, 4) ?? "";
    const rating = Number(block.match(/class="rating(\d)-t"/)?.[1] ?? 0);
    const comment = (block.match(/<p class="comment comment-item"[^>]*>([\s\S]*?)<\/p>/)?.[1] ?? "")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const author = parts[0] ?? "未知作者";
    return [{
      id: href?.match(/subject\/(\d+)/)?.[1],
      title: title.replace(/&amp;/g, "&").trim(),
      author,
      year,
      status: "读完",
      quote: comment,
      cover,
      url: href ?? searchUrl(title),
      tint: BOOK_TINTS[index % BOOK_TINTS.length],
      rating: rating || undefined,
    }];
  });
};

/**
 * 豆瓣图床有防盗链（非豆瓣 referer 返回 403，无 referer 返回 418 占位图），
 * 图片在构建期带豆瓣 referer 下载到 public/covers/ 本地化，页面零外链。
 */
const localizeImage = async (
  remoteUrl: string,
  dirName: string,
  fileName: string,
  upgrade: (url: string) => string,
  referer: string,
): Promise<string | undefined> => {
  const dir = path.join(process.cwd(), "public", "covers", dirName);
  const filePath = path.join(dir, fileName);
  if (!fs.existsSync(filePath)) {
    const response = await fetch(upgrade(remoteUrl), {
      headers: { referer, "user-agent": BROWSER_UA },
    });
    if (!response.ok) return undefined;
    const buffer = Buffer.from(await response.arrayBuffer());
    // 过小的响应基本是防盗链占位图，直接放弃，让页面退回渐变封面。
    if (buffer.length < 1024) return undefined;
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, buffer);
  }
  const base = import.meta.env.BASE_URL || "/";
  return `${base.endsWith("/") ? base : `${base}/`}covers/${dirName}/${fileName}`;
};

/** 批量图片本地化：单张失败只影响那一条，不中断。 */
type ImageJob = {
  url: string;
  dirName: string;
  fileName: string;
  upgrade: (url: string) => string;
  referer: string;
};

const localizeAll = async <T>(
  items: T[],
  getJob: (item: T) => ImageJob | undefined,
  apply: (item: T, local?: string) => T,
): Promise<T[]> => {
  const jobs = items.map((item) => ({ item, job: getJob(item) }));
  const settled = new Map<T, string | undefined>();
  // 并发上限 8：几十上百张图同时打豆瓣图床容易被风控。
  const CONCURRENCY = 8;
  let cursor = 0;
  const worker = async () => {
    while (cursor < jobs.length) {
      const current = jobs[cursor++];
      if (!current.job) {
        settled.set(current.item, undefined);
        continue;
      }
      try {
        settled.set(
          current.item,
          await localizeImage(current.job.url, current.job.dirName, current.job.fileName, current.job.upgrade, current.job.referer),
        );
      } catch {
        settled.set(current.item, undefined);
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, jobs.length) }, worker));
  return items.map((item) => apply(item, settled.get(item)));
};

/** 书封面批量本地化。 */
const localizeCovers = (books: DoubanWallBook[]): Promise<DoubanWallBook[]> =>
  localizeAll(
    books,
    (book) =>
      book.cover && book.id
        ? {
            url: book.cover,
            dirName: "douban",
            fileName: `${book.id}.jpg`,
            upgrade: (url) => url.replace("/view/subject/s/public/", "/view/subject/m/public/"),
            referer: "https://book.douban.com/",
          }
        : undefined,
    (book, local) => (book.cover && book.id ? { ...book, cover: local } : book),
  );

/** 电影海报批量本地化。 */
const localizePosters = (films: DoubanMovie[]): Promise<DoubanMovie[]> =>
  localizeAll(
    films,
    (film) =>
      film.poster && film.id
        ? {
            url: film.poster,
            dirName: "douban-film",
            fileName: `${film.id}.jpg`,
            upgrade: (url) => url.replace("/view/photo/s_ratio_poster/public/", "/view/photo/m_ratio_poster/public/"),
            referer: "https://movie.douban.com/",
          }
        : undefined,
    (film, local) => (film.poster && film.id ? { ...film, poster: local } : film),
  );

/** 抓完整「读过」清单：先取 bid cookie，再逐页翻。任一步失败都退回缓存/本地数据。 */
const scrapeWatchedBooks = async (userId: string): Promise<DoubanWallBook[]> => {
  const baseHeaders = {
    accept: "text/html,application/xhtml+xml",
    "accept-language": "zh-CN,zh;q=0.9",
    "user-agent": BROWSER_UA,
  };
  const profileUrl = `${BOOK_BASE}/people/${encodeURIComponent(userId)}/`;
  const seed = await fetch(profileUrl, { headers: baseHeaders });
  if (!seed.ok) return [];
  const setCookies =
    typeof seed.headers.getSetCookie === "function"
      ? seed.headers.getSetCookie()
      : [seed.headers.get("set-cookie") ?? ""].filter(Boolean);
  const cookie = setCookies.map((item) => item.split(";")[0]).filter(Boolean).join("; ");

  const collected: DoubanWallBook[] = [];
  const pageSize = 15;
  let total = Number(
    (await seed.text()).match(/读过[\s\S]{0,120}?<span class="number">\s*(\d+)\s*<\/span>/)?.[1] ?? 0,
  );

  for (let start = 0; start < 600; start += pageSize) {
    const pageUrl = `${BOOK_BASE}/people/${encodeURIComponent(userId)}/collect?start=${start}&sort=time&mode=grid&filter=all&tags_sort=count`;
    let html = "";
    try {
      const response = await fetch(pageUrl, { headers: { ...baseHeaders, cookie, referer: profileUrl } });
      if (!response.ok) break;
      html = await response.text();
    } catch {
      break;
    }
    const listed = Number(html.match(/1-\d+&nbsp;\/&nbsp;(\d+)/)?.[1] ?? 0);
    if (listed) total = listed;
    const pageBooks = parseBookListPage(html);
    if (!pageBooks.length) break;
    collected.push(...pageBooks);
    if (total && collected.length >= total) break;
    if (pageBooks.length < pageSize) break;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  const unique = [...new Map(collected.map((book) => [book.id ?? book.url, book])).values()];
  return localizeCovers(unique.map((book, index) => ({ ...book, tint: BOOK_TINTS[index % BOOK_TINTS.length] })));
};

export async function getDoubanWallBooks(fallback: MediaBook[]): Promise<DoubanWallBook[]> {
  const endpoint = import.meta.env.DOUBAN_BOOKS_ENDPOINT;
  if (endpoint) {
    try {
      const response = await fetch(endpoint, { headers: { accept: "application/json" } });
      if (response.ok) {
        const payload: unknown = await response.json();
        const list = Array.isArray(payload)
          ? payload
          : typeof payload === "object" && payload !== null && Array.isArray((payload as { books?: unknown }).books)
            ? (payload as { books: ApiBook[] }).books
            : [];
        const normalized = (list as ApiBook[])
          .map((book, index) => normalize(book, index, fallback))
          .filter((book): book is DoubanWallBook => book !== null);
        if (normalized.length) return normalized;
      }
    } catch {
      // 静态构建时接口不可达则保留本地内容，页面不会构建失败。
    }
  }

  const userId = import.meta.env.DOUBAN_USER_ID;
  if (userId) {
    try {
      const cached = readCache<DoubanWallBook>("douban-books.json", "books");
      const scraped = await scrapeWatchedBooks(String(userId));
      if (scraped.length) {
        writeCache("douban-books.json", "books", scraped);
        return scraped;
      }
      if (cached.length) return cached;
    } catch {
      const cached = readCache<DoubanWallBook>("douban-books.json", "books");
      if (cached.length) return cached;
    }
  }

  return fallback.map((book) => ({
    title: book.title,
    author: book.author,
    year: book.year,
    status: book.status,
    quote: book.quote,
    url: searchUrl(book.title),
    tint: book.tint,
  }));
}

export interface DoubanMovie { id?: string; title: string; director: string; actors: string; year: string; duration: string; note: string; summary: string; poster?: string; url: string; rating?: string; tint: [string, string]; }
type ApiMovie = { id?: string | number; title?: string; directors?: Array<{ name?: string }>; director?: string; casts?: Array<{ name?: string }>; actors?: string | string[]; year?: string | number; duration?: string; durations?: string[]; image?: string; poster?: string; cover?: string; alt?: string; url?: string; rating?: number | string | { average?: number }; summary?: string; };

const decodeHtml = (value: string) => value
  .replace(/<[^>]+>/g, " ")
  .replace(/&nbsp;|&#160;/g, " ")
  .replace(/&amp;/g, "&")
  .replace(/&quot;/g, '"')
  .replace(/&#39;|&apos;/g, "'")
  .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
  .replace(/\s+/g, " ")
  .trim();

/**
 * 豆瓣「看过」列表的 intro 字段是「/」拼成的自由文本，顺序大致为：
 * 上映日期… / 演员… / 国家地区… / 导演 / 片长 / 片名 / 类型… / 编剧… / 语言…
 * 但有两个坑：片长可能写成「129 分钟」（数字与分钟之间有空格），
 * 部分条目在导演与片长之间还插了购票时间戳（如「2023-12-16 20:00」），
 * 因此不能简单地取「片长前一项」当导演。
 */
const GENRES = new Set([
  "剧情", "喜剧", "爱情", "动作", "科幻", "动画", "悬疑", "惊悚", "恐怖", "犯罪",
  "同性", "音乐", "歌舞", "传记", "历史", "战争", "西部", "奇幻", "冒险", "灾难",
  "武侠", "古装", "运动", "家庭", "儿童", "纪录片", "短片", "情色", "黑色电影",
  "真人秀", "脱口秀", "戏曲", "鬼怪", "荒诞", "青春", "犯罪片",
]);

const REGIONS = new Set([
  "中国大陆", "中国香港", "中国台湾", "中国", "美国", "英国", "法国", "日本", "韩国",
  "加拿大", "德国", "意大利", "西班牙", "澳大利亚", "新西兰", "印度", "泰国", "俄罗斯",
  "瑞典", "丹麦", "挪威", "芬兰", "荷兰", "比利时", "波兰", "巴西", "墨西哥", "阿根廷",
  "爱尔兰", "奥地利", "瑞士", "以色列", "伊朗", "土耳其", "捷克", "匈牙利", "葡萄牙",
  "希腊", "冰岛", "南非", "新加坡", "马来西亚", "越南", "菲律宾", "印度尼西亚", "乌克兰",
  "罗马尼亚", "塞尔维亚", "克罗地亚", "爱沙尼亚", "卢森堡", "摩纳哥", "埃及", "摩洛哥",
  "突尼斯", "黎巴嫩", "阿联酋", "格鲁吉亚", "哈萨克斯坦", "蒙古", "尼泊尔", "斯里兰卡",
  "巴基斯坦", "肯尼亚", "尼日利亚", "乌拉圭", "秘鲁", "委内瑞拉", "古巴", "智利",
  "哥伦比亚", "约旦", "卡塔尔", "沙特阿拉伯", "科威特", "叙利亚", "伊拉克", "阿富汗",
  "孟加拉国", "缅甸", "柬埔寨", "老挝", "文莱", "不丹", "马尔代夫", "波黑", "保加利亚",
  "斯洛文尼亚", "斯洛伐克", "立陶宛", "拉脱维亚", "白俄罗斯", "摩尔多瓦", "阿尔巴尼亚",
  "北马其顿", "黑山", "塞浦路斯", "马耳他", "巴林", "阿曼", "也门", "厄瓜多尔", "玻利维亚",
  "巴拉圭", "巴拿马", "哥斯达黎加", "危地马拉", "牙买加", "海地", "多米尼加", "萨尔瓦多",
]);

const isDateToken = (value: string) => /^(?:19|20)\d{2}(?:-\d{1,2}(?:-\d{1,2})?)?(?:\s+\d{1,2}:\d{2})?/.test(value);
const isDurationToken = (value: string) => /^\d+\s*分钟/.test(value);
const isUrlToken = (value: string) => /^(?:https?:\/\/|www\.)/i.test(value) || (/\.[a-z]{2,4}$/i.test(value) && !/\s/.test(value));
const isGenreToken = (value: string) => GENRES.has(value);

/** 把「129 分钟」「99分钟(公映版)」统一成「129分钟」。 */
const normalizeDuration = (value?: string): string | undefined => {
  const matched = value?.match(/^(\d+)\s*分钟/);
  return matched ? `${matched[1]}分钟` : undefined;
};

const parseWatchedPage = (html: string, fallback: MediaFilm[]): DoubanMovie[] => {
  const blocks = [...html.matchAll(/<div class="item comment-item"[\s\S]*?<div class="info">([\s\S]*?)<\/div>\s*<\/div>/g)];
  return blocks.flatMap((match, index): DoubanMovie[] => {
    const block = match[0];
    const href = block.match(/href="(https:\/\/movie\.douban\.com\/subject\/(\d+)\/)"/)?.[1];
    const id = block.match(/movie\.douban\.com\/subject\/(\d+)\//)?.[1];
    const rawTitle = block.match(/<em>([\s\S]*?)<\/em>/)?.[1];
    if (!href || !rawTitle) return [];
    const title = decodeHtml(rawTitle).split(" / ")[0];
    const intro = decodeHtml(block.match(/<li class="intro">([\s\S]*?)<\/li>/)?.[1] ?? "");
    const poster = block.match(/<img[^>]+src="([^"]+)"/)?.[1];
    const watchedAt = block.match(/<span class="date">([^<]+)<\/span>/)?.[1]?.trim();
    const stars = Number(block.match(/class="rating(\d)-t"/)?.[1] ?? 0);
    const year = intro.match(/(?:19|20)\d{2}/)?.[0] ?? "";
    const parts = intro.split(" / ").map((part) => part.trim()).filter(Boolean);

    const durationIndex = parts.findIndex(isDurationToken);
    const lastDurationIndex = parts.reduce((last, part, partIndex) => (isDurationToken(part) ? partIndex : last), -1);
    const duration = normalizeDuration(durationIndex >= 0 ? parts[durationIndex] : undefined) ?? fallback[index % fallback.length].duration;

    // 导演：从片长往前找第一个「既不是日期时间、也不是片长/网址」的项。
    let director = "";
    for (let cursor = durationIndex - 1; cursor >= 0; cursor -= 1) {
      const candidate = parts[cursor];
      if (isDateToken(candidate) || isDurationToken(candidate) || isUrlToken(candidate)) continue;
      // 导演紧邻片长，扫到第一个像名字的项就停；若明显像地区名则继续往前一名。
      if (REGIONS.has(candidate)) continue;
      director = candidate;
      break;
    }

    // 演员：上映日期之后、导演之前，去掉国家/地区与官网地址。
    const directorIndex = director ? parts.indexOf(director, Math.max(durationIndex - 1, 0)) : durationIndex;
    const dateEnd = parts.reduce(
      (last, part, partIndex) => (partIndex < Math.max(directorIndex, 0) && isDateToken(part) ? partIndex : last),
      -1,
    );
    const actorEnd = directorIndex >= 0 ? directorIndex : Math.max(durationIndex, 0);
    const actors = [...new Set(
      parts.slice(dateEnd + 1, Math.max(dateEnd + 1, actorEnd))
        .filter((part) => !REGIONS.has(part) && !isUrlToken(part) && !isDateToken(part) && !isDurationToken(part)),
    )].slice(0, 5);

    // 类型：最后一段片长之后先跳过片名，再连续取类型词，遇到编剧/语言就停。
    const genres: string[] = [];
    if (lastDurationIndex >= 0) {
      for (const part of parts.slice(lastDurationIndex + 2)) {
        if (!isGenreToken(part)) break;
        genres.push(part);
        if (genres.length >= 3) break;
      }
    }

    const base = fallback[index % fallback.length];
    return [{
      id,
      title,
      director: director || "导演信息待补充",
      actors: actors.length ? actors.join(" / ") : "演员信息待补充",
      year,
      duration,
      note: `${stars ? `${stars} 星 · ` : ""}${watchedAt ? `看过于 ${watchedAt}` : "来自豆瓣看过清单"}`,
      summary: `${year ? `${year} 年上映的` : "一部"}${genres.length ? `${genres.join("、")}类型` : ""}电影，由 ${director || "未知导演"} 执导${actors.length ? `，${actors.slice(0, 3).join("、")}主演` : ""}。`,
      poster,
      url: href,
      rating: stars ? `${stars} 星` : undefined,
      tint: base.tint,
    }];
  });
};

/**
 * 简介原文：条目详情页（movie.douban.com/subject/xxx/）对匿名请求会 302 到 sec.douban.com 风控页，
 * 改用移动端 rexxar 接口；但该接口对同一 IP 有节流（约 20 次/窗口，返回 subject_ip_rate_limit），
 * 放在构建里会拖慢并抓不全，因此由 scripts/sync-synopsis.mjs 慢速预取到缓存，构建只读缓存。
 * 原文平均 200–500 字，渲染时截断到 120 字；完整原文留在缓存里，改截断长度不用重抓。
 */
const SYNOPSIS_CACHE = "douban-synopsis.json";
const SYNOPSIS_LIMIT = 120;

const readSynopsisCache = (): Record<string, string> => {
  try {
    const parsed = JSON.parse(fs.readFileSync(path.join(CACHE_DIR, SYNOPSIS_CACHE), "utf8")) as { items?: Record<string, string> };
    return parsed.items && typeof parsed.items === "object" ? parsed.items : {};
  } catch {
    return {};
  }
};

/** 渲染用：压平空白并截断到 120 字。 */
const shortenSynopsis = (text?: string): string | undefined => {
  if (!text) return undefined;
  const flat = text.replace(/\s+/g, " ").trim();
  if (!flat) return undefined;
  return flat.length > SYNOPSIS_LIMIT ? `${flat.slice(0, SYNOPSIS_LIMIT).trimEnd()}…` : flat;
};

/** 把缓存里的简介原文贴到清单上；没有简介的条目保留原有模板句。 */
const applySynopses = (movies: DoubanMovie[]): DoubanMovie[] => {
  const cache = readSynopsisCache();
  return movies.map((movie) => {
    const intro = movie.id ? cache[movie.id] : undefined;
    const summary = shortenSynopsis(intro);
    return summary ? { ...movie, summary } : movie;
  });
};

export async function getDoubanMovies(fallback: MediaFilm[]): Promise<DoubanMovie[]> {  const endpoint = import.meta.env.DOUBAN_MOVIES_ENDPOINT;
  if (endpoint) {
    try {
      const response = await fetch(endpoint, { headers: { accept: "application/json" } });
      if (response.ok) {
        const payload: unknown = await response.json();
        const list = Array.isArray(payload) ? payload : typeof payload === "object" && payload !== null && Array.isArray((payload as { subjects?: unknown }).subjects) ? (payload as { subjects: ApiMovie[] }).subjects : typeof payload === "object" && payload !== null && Array.isArray((payload as { movies?: unknown }).movies) ? (payload as { movies: ApiMovie[] }).movies : [];
        const movies = (list as ApiMovie[]).flatMap((movie, index): DoubanMovie[] => {
          if (!movie.title) return [];
          const base = fallback[index % fallback.length];
          const id = movie.id === undefined ? undefined : String(movie.id);
          const rating = typeof movie.rating === "object" ? movie.rating.average : movie.rating;
          const actors = Array.isArray(movie.actors) ? movie.actors.join(" / ") : movie.actors ?? movie.casts?.map((item) => item.name).filter(Boolean).join(" / ") ?? "演员信息待补充";
          return [{ id, title: movie.title, director: movie.director ?? movie.directors?.map((item) => item.name).filter(Boolean).join(" / ") ?? "未知导演", actors, year: String(movie.year ?? ""), duration: movie.duration ?? movie.durations?.[0] ?? base.duration, note: movie.summary?.slice(0, 120) || base.note, summary: movie.summary ?? base.note, poster: movie.poster ?? movie.cover ?? movie.image, url: movie.alt ?? movie.url ?? (id ? `https://movie.douban.com/subject/${id}/` : `https://search.douban.com/movie/subject_search?search_text=${encodeURIComponent(movie.title)}`), rating: rating === undefined ? undefined : String(rating), tint: base.tint }];
        });
        if (movies.length) return movies;
      }
    } catch { /* 保持静态构建可用。 */ }
  }
  const userId = import.meta.env.DOUBAN_USER_ID;
  if (userId) {
    const cachedMovies = readCache<DoubanMovie>("douban-movies.json", "movies");
    try {
      const page = `https://movie.douban.com/people/${encodeURIComponent(userId)}/collect?sort=time&type=all&filter=all&mode=grid`;
      const headers = {
        accept: "text/html,application/xhtml+xml",
        "user-agent": BROWSER_UA,
      };
      /** 豆瓣会间歇性返回空列表或风控页，单页必须重试，否则整页条目会凭空消失。 */
      const fetchPage = async (url: string, attempts = 3): Promise<string | undefined> => {
        for (let attempt = 0; attempt < attempts; attempt += 1) {
          try {
            const response = await fetch(url, { headers });
            if (response.ok) {
              const html = await response.text();
              if (html.includes('class="item comment-item"')) return html;
            }
          } catch { /* 换一次重试。 */ }
          await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
        }
        return undefined;
      };

      const firstHtml = await fetchPage(page);
      if (firstHtml) {
        const totalPages = Number(firstHtml.match(/data-total-page="(\d+)"/)?.[1] ?? 1);
        const movies = parseWatchedPage(firstHtml, fallback);
        for (let index = 1; index < totalPages; index += 1) {
          // 逐页错开，避免连续请求触发风控。
          await new Promise((resolve) => setTimeout(resolve, 150));
          const html = await fetchPage(`${page}&start=${index * 15}`);
          if (html) movies.push(...parseWatchedPage(html, fallback));
        }
        // 与缓存合并：新抓到的覆盖旧的，缓存里多出来的补在后面，
        // 这样即使某一页这次没抓到也不会把已同步的条目丢掉。
        const unique = [...new Map([...movies, ...cachedMovies].map((movie) => [movie.id ?? movie.url, movie])).values()];
        if (unique.length) {
          const localized = await localizePosters(unique);
          const withIntro = applySynopses(localized);
          writeCache("douban-movies.json", "movies", withIntro);
          return withIntro;
        }
      }
    } catch { /* 豆瓣不可达时读缓存，再不行用本地电影，构建不中断。 */ }
    if (cachedMovies.length) return cachedMovies;
  }
  return fallback.map((movie) => ({ title: movie.title, director: movie.director, actors: "演员信息待补充", year: movie.year, duration: movie.duration, note: movie.note, summary: movie.note, poster: movie.image, url: `https://search.douban.com/movie/subject_search?search_text=${encodeURIComponent(movie.title)}`, tint: movie.tint }));
}
