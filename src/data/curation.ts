/**
 * 本期策展主题「夜间漫游」：从四个板块的长期数据中取出 memoryId 命中的条目，
 * 保证策展页与板块页永远来自同一份数据源，不会两处维护。
 */
import {
  bookEntries,
  filmEntries,
  musicTracks,
  photoEntries,
  type MediaBook,
  type MediaFilm,
  type MediaPhoto,
  type MediaTrack,
} from "./media";

export interface CurationMovie {
  id: string;
  title: string;
  year: string;
  director: string;
  duration: string;
  image: string;
  alt: string;
  note: string;
}

export interface CurationMusic {
  id: string;
  title: string;
  artist: string;
  cover: string;
  alt: string;
  note: string;
  frequencies: [number, number, number];
}

export interface CurationBook {
  id: string;
  title: string;
  author: string;
  quote: string;
  note: string;
}

export interface CurationPhoto {
  id: string;
  title: string;
  location: string;
  image: string;
  alt: string;
  note: string;
}

const memoryOrder = ["last-train", "river", "windows", "before-dawn"] as const;

const pick = <T extends { memoryId?: string }>(items: T[], memoryId: string): T => {
  const found = items.find((item) => item.memoryId === memoryId);
  if (!found) throw new Error(`策展数据缺失：${memoryId}`);
  return found;
};

export const movies: CurationMovie[] = memoryOrder.map((id) => {
  const film = pick<MediaFilm>(filmEntries, id);
  return {
    id: film.id,
    title: film.title,
    year: film.year,
    director: film.director,
    duration: film.duration,
    image: film.image ?? "",
    alt: film.alt,
    note: film.note,
  };
});

export const music: CurationMusic[] = memoryOrder.map((id) => {
  const track = pick<MediaTrack>(musicTracks, id);
  return {
    id: track.id,
    title: track.title,
    artist: track.artist,
    cover: track.cover ?? "",
    alt: track.alt,
    note: track.note,
    frequencies: track.frequencies,
  };
});

export const books: CurationBook[] = memoryOrder.map((id) => {
  const book = pick<MediaBook>(bookEntries, id);
  return {
    id: book.id,
    title: book.title,
    author: book.author,
    quote: book.quote,
    note: book.note,
  };
});

export const photos: CurationPhoto[] = memoryOrder.map((id) => {
  const photo = pick<MediaPhoto>(photoEntries, id);
  return {
    id: photo.id,
    title: photo.title,
    location: photo.location,
    image: photo.image ?? "",
    alt: photo.alt,
    note: photo.note,
  };
});

export interface CityMemory {
  id: string;
  title: string;
  line: string;
  movie: CurationMovie;
  music: CurationMusic;
  book: CurationBook;
  photo: CurationPhoto;
}

const memoryMeta: Record<string, { title: string; line: string }> = {
  "last-train": { title: "末班车", line: "错过以后，城市才露出另一张脸。" },
  river: { title: "沿河走", line: "让水代替街道，保存那些倒影。" },
  windows: { title: "亮窗", line: "每一盏灯，都在替陌生人叙事。" },
  "before-dawn": { title: "天将亮", line: "夜晚并未结束，只是退到物件背后。" },
};

export const memories: CityMemory[] = memoryOrder.map((id, index) => ({
  id,
  title: memoryMeta[id].title,
  line: memoryMeta[id].line,
  movie: movies[index],
  music: music[index],
  book: books[index],
  photo: photos[index],
}));

export const theme = {
  title: "夜间漫游",
  subtitle: "一座城市的四种记忆",
  intro:
    "从一段旋律、一束银幕的光，到一页书和一次按下快门。沿着四种记忆，走进城市尚未入睡的部分。",
};
