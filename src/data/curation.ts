/**
 * 本期策展「思考」。
 * 三件展品全部取自站点已有的真实数据源，不手工编造条目：
 * - 电影：.cache/douban-movies.json（豆瓣「看过」清单，含本地化海报与简介）
 * - 图书：.cache/douban-books.json（豆瓣「读过」清单，含我自己写的短评）
 * - 音乐：.cache/netease-playlist.json（网易云歌单曲目）
 * - 视觉：AI 生成的水墨图，放在 public/photos/curation/，如实标注来源。
 */
import fs from "node:fs";
import path from "node:path";

const CACHE_DIR = path.join(process.cwd(), ".cache");

const readCache = <T>(file: string): T => {
  const full = path.join(CACHE_DIR, file);
  if (!fs.existsSync(full)) {
    throw new Error(`策展数据缺失：${file}（该文件由构建时的豆瓣/网易云同步生成，应已入库）`);
  }
  return JSON.parse(fs.readFileSync(full, "utf8")) as T;
};

type CachedMovie = {
  id?: string;
  title: string;
  director: string;
  year: string;
  duration: string;
  note: string;
  summary: string;
  poster?: string;
  url: string;
  tint: [string, string];
};

type CachedBook = {
  id?: string;
  title: string;
  author: string;
  year: string;
  rating?: number;
  cover?: string;
  url: string;
  quote: string;
  tint: [string, string];
};

type CachedTrack = {
  id: string;
  title: string;
  artist: string;
  album: string;
  year: string;
  duration: string;
  cover?: string;
  url: string;
  tint: [string, string];
};

export interface CurationMovie {
  id: string;
  title: string;
  year: string;
  director: string;
  duration: string;
  image: string;
  alt: string;
  note: string;
  url: string;
}

export interface CurationMusic {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: string;
  note: string;
  url: string;
}

export interface CurationBook {
  id: string;
  title: string;
  author: string;
  year: string;
  quote: string;
  note: string;
  url: string;
}

export interface CurationPhoto {
  title: string;
  /** 媒介说明，代替「拍摄地点」——这张不是照片，不编造地点。 */
  medium: string;
  date: string;
  image: string;
  alt: string;
  note: string;
}

const movies = readCache<{ movies: CachedMovie[] }>("douban-movies.json").movies;
const books = readCache<{ books: CachedBook[] }>("douban-books.json").books;
const tracks = readCache<{ tracks: CachedTrack[] }>("netease-playlist.json").tracks;

const film = movies.find((item) => item.title === "十二怒汉" && item.year === "1957");
if (!film) throw new Error("策展数据缺失：《十二怒汉》不在豆瓣看过的清单里");

const book = books.find((item) => item.title.startsWith("思考，快与慢"));
if (!book) throw new Error("策展数据缺失：《思考，快与慢》不在豆瓣读过的清单里");

// 歌词里唱「写不完庄周的诗篇」，和本期「一个人如何想下去」正好接得上。
const track = tracks.find((item) => item.id === "2152380072") ?? tracks[0];
if (!track) throw new Error("策展数据缺失：网易云歌单没有曲目");

export const movie: CurationMovie = {
  id: film.id ?? "1293182",
  title: film.title,
  year: film.year,
  director: film.director,
  duration: film.duration,
  image: film.poster ?? "",
  alt: `《${film.title}》电影海报`,
  note: film.note || `${film.year} 年上映 · ${film.duration}`,
  url: film.url,
};

export const bookItem: CurationBook = {
  id: book.id ?? "",
  title: book.title,
  author: book.author,
  year: book.year,
  quote: book.quote,
  note: `${book.rating ? `我打了 ${book.rating} 星 · ` : ""}豆瓣「读过」里的短评原文`,
  url: book.url,
};

export const music: CurationMusic = {
  id: track.id,
  title: track.title,
  artist: track.artist,
  album: track.album,
  duration: track.duration,
  note: "歌单里的真实曲目；页内播放的是站点生成的合成音，不是原曲录音。",
  url: track.url,
};

/**
 * 第四个现场：视觉。
 * 这张是 AI 生成的水墨意象，不是自己拍的照片，所以不写拍摄地点，
 * 只如实标注媒介与生成方式。
 */
export const photo: CurationPhoto | null = {
  title: "太极双鱼",
  medium: "水墨 · 数字生成",
  date: "2026 冬",
  image: "/photos/curation/taiji-koi.webp",
  alt: "水墨风格的太极图，黑白两条锦鲤首尾相抱，留白处是远山、云雾与山亭",
  note: "AI 生成的水墨意象，非摄影作品。黑白互为表里，正好抵住本期「快与慢」的题目。",
};

export const theme = {
  title: "思考",
  subtitle: "一次判断的四个现场",
  intro:
    "本期从看过的电影、读过的书和最近在听的歌里，挑出同一件事的三个侧面：证据如何被检验，直觉如何骗人，一个人如何在独处时把问题想下去。",
  tags: ["#证据", "#判断", "#慢思考"],
};

export const exhibit = {
  line: "十二个人、一份证词、一段旋律——把「想清楚」拆成能旁观的过程。",
  movie,
  book: bookItem,
  music,
  photo,
};
