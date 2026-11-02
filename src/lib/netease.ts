/**
 * 网易云音乐数据（构建期抓取，静态输出）
 *
 * - 普通歌单：music.163.com/api/playlist/detail?id=（公开歌单免登录，直接给 tracks）
 * - 「我喜欢的音乐」：specialType=5 的系统歌单，旧接口返回 20001（需登录），
 *   但 api/v6/playlist/detail?id= 匿名可读；它只给 6 首预览，完整清单在 trackIds，
 *   需再按 id 批量调 api/v3/song/detail（100 首/次）并按 trackIds 顺序还原。
 * - 用户歌单列表：music.163.com/api/user/playlist?uid=（免登录，含喜欢歌单的 id）
 * - 封面图 p*.music.126.net 无防盗链，可直接外链
 * - 音频直链是带时间戳的临时签名，不能写进静态页；由前端播放时实时向 Meting 取（<audio> 自动跟随 302）
 */
import fs from "node:fs";
import path from "node:path";

export interface NeteaseTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  year: string;
  duration: string;
  cover?: string;
  /** 网易云网页地址，用于「在网易云打开」 */
  url: string;
  tint: [string, string];
  /** 逐行歌词（含时间轴，外文歌带官方翻译） */
  lyrics?: LyricLine[];
}

export interface LyricLine {
  /** 起始秒 */
  t: number;
  text: string;
  /** 官方翻译（有则显示） */
  tr?: string;
}

export interface NeteasePlaylist {
  id: string;
  name: string;
  cover?: string;
  total: number;
  tracks: NeteaseTrack[];
  /** 数据来源：netease-api / cache / 空（无数据） */
  source: "api" | "cache" | "empty";
}

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const CACHE_FILE = path.join(process.cwd(), ".cache", "netease-playlist.json");
const TINTS: Array<[string, string]> = [
  ["#4f7b83", "#28474d"],
  ["#5a3f52", "#241722"],
  ["#3d4a5e", "#171d26"],
  ["#5a4a32", "#241c14"],
  ["#33493a", "#141f17"],
  ["#4a3a3a", "#1d1414"],
];

type RawTrack = {
  id?: number | string;
  name?: string;
  ar?: Array<{ name?: string }>;
  artists?: Array<{ name?: string }>;
  al?: { name?: string; picUrl?: string; publishTime?: number };
  album?: { name?: string; picUrl?: string; publishTime?: number };
  dt?: number;
  duration?: number;
};

const headers = {
  accept: "application/json, text/plain, */*",
  "accept-language": "zh-CN,zh;q=0.9",
  referer: "https://music.163.com/",
  "user-agent": BROWSER_UA,
};

const formatDuration = (ms: number) => {
  if (!ms) return "";
  const total = Math.round(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
};

const toYear = (publishTime?: number) => {
  if (!publishTime) return "";
  const date = new Date(publishTime);
  return Number.isNaN(date.getTime()) ? "" : String(date.getFullYear());
};

/** 兼容两套字段：新接口 ar/al/dt，旧接口 artists/album/duration。 */
const mapTrack = (track: RawTrack, index: number): NeteaseTrack | null => {
  if (!track.name || track.id === undefined) return null;
  const artists = (track.ar ?? track.artists ?? []).map((item) => item.name).filter(Boolean);
  const album = track.al ?? track.album ?? {};
  const cover = album.picUrl ? `${album.picUrl.replace(/^http:/, "https:")}?param=500y500` : undefined;
  const id = String(track.id);
  return {
    id,
    title: track.name,
    artist: artists.length ? artists.join(" / ") : "未知歌手",
    album: album.name ?? "",
    year: toYear(album.publishTime),
    duration: formatDuration(track.dt ?? track.duration ?? 0),
    cover,
    url: `https://music.163.com/song?id=${id}`,
    tint: TINTS[index % TINTS.length],
  };
};

type PlaylistPayload = {
  result?: { name?: string; coverImgUrl?: string; trackCount?: number; tracks?: RawTrack[] };
  playlist?: { name?: string; coverImgUrl?: string; trackCount?: number; tracks?: RawTrack[] };
};

const fetchPlaylist = async (playlistId: string, limit: number): Promise<NeteasePlaylist | null> => {
  const response = await fetch(`https://music.163.com/api/playlist/detail?id=${encodeURIComponent(playlistId)}`, {
    headers,
  });
  if (!response.ok) return null;
  const payload = (await response.json()) as PlaylistPayload;
  const result = payload.result ?? payload.playlist;
  // code 20001 = 需要登录态，此时没有 result，直接判失败。
  if (!result || !Array.isArray(result.tracks)) return null;
  const tracks = result.tracks
    .slice(0, limit)
    .map(mapTrack)
    .filter((track): track is NeteaseTrack => track !== null);
  // 空歌单（刚新建还没加歌）也要返回，让页面显示空态，而不是被当成失败回退到别的歌单。
  return {
    id: String(playlistId),
    name: result.name ?? "未命名歌单",
    cover: result.coverImgUrl ? `${result.coverImgUrl}?param=500y500` : undefined,
    total: result.trackCount ?? result.tracks.length,
    tracks,
    source: tracks.length ? "api" : "empty",
  };
};

/** 用户歌单列表（含 specialType=5 的「我喜欢的音乐」）。 */
const fetchUserPlaylists = async (
  uid: string,
): Promise<Array<{ id: string; name: string; trackCount: number; specialType: number }>> => {
  const response = await fetch(
    `https://music.163.com/api/user/playlist?uid=${encodeURIComponent(uid)}&limit=1000&offset=0`,
    { headers },
  );
  if (!response.ok) return [];
  const payload = (await response.json()) as {
    playlist?: Array<{ id?: number; name?: string; trackCount?: number; specialType?: number }>;
  };
  return (payload.playlist ?? [])
    .filter((item) => item.id !== undefined)
    .map((item) => ({
      id: String(item.id),
      name: item.name ?? "",
      trackCount: item.trackCount ?? 0,
      specialType: item.specialType ?? 0,
    }));
};

/** 批量取歌曲详情：单批最多 100 首，返回 id → 原始字段，便于按 trackIds 原顺序还原。 */
const fetchSongDetails = async (ids: string[]): Promise<Map<string, RawTrack>> => {
  const found = new Map<string, RawTrack>();
  for (let start = 0; start < ids.length; start += 100) {
    const batch = ids.slice(start, start + 100);
    const body = encodeURIComponent(JSON.stringify(batch.map((id) => ({ id: Number(id) }))));
    try {
      const response = await fetch(`https://music.163.com/api/v3/song/detail?c=${body}`, { headers });
      if (!response.ok) continue;
      const payload = (await response.json()) as { songs?: RawTrack[] };
      for (const song of payload.songs ?? []) {
        if (song.id !== undefined) found.set(String(song.id), song);
      }
    } catch {
      /* 单批失败时跳过，其余批次继续。 */
    }
  }
  return found;
};

/**
 * 「我喜欢的音乐」等系统歌单走 v6 详情：tracks 只有 6 首预览，完整清单在 trackIds，
 * 需要再按 id 批量取详情并按 trackIds 顺序还原。
 */
const fetchPlaylistByTrackIds = async (playlistId: string, limit: number): Promise<NeteasePlaylist | null> => {
  const response = await fetch(
    `https://music.163.com/api/v6/playlist/detail?id=${encodeURIComponent(playlistId)}`,
    { headers },
  );
  if (!response.ok) return null;
  const payload = (await response.json()) as {
    playlist?: {
      name?: string;
      coverImgUrl?: string;
      trackCount?: number;
      trackIds?: Array<{ id?: number | string }>;
    };
  };
  const playlist = payload.playlist;
  const allIds = (playlist?.trackIds ?? [])
    .map((item) => item.id)
    .filter((id): id is number | string => id !== undefined)
    .map((id) => String(id));
  if (!playlist) return null;
  const ids = allIds.slice(0, limit);
  const details = await fetchSongDetails(ids);
  const tracks = ids
    .map((id, index) => {
      const raw = details.get(id);
      return raw ? mapTrack(raw, index) : null;
    })
    .filter((track): track is NeteaseTrack => track !== null);
  return {
    id: String(playlistId),
    name: playlist.name ?? "未命名歌单",
    cover: playlist.coverImgUrl ? `${playlist.coverImgUrl}?param=500y500` : undefined,
    total: playlist.trackCount ?? allIds.length,
    tracks,
    source: tracks.length ? "api" : "empty",
  };
};

const readCache = (): NeteasePlaylist | null => {
  try {
    const parsed = JSON.parse(fs.readFileSync(CACHE_FILE, "utf8")) as NeteasePlaylist;
    return Array.isArray(parsed.tracks) && parsed.tracks.length ? { ...parsed, source: "cache" } : null;
  } catch {
    return null;
  }
};

const writeCache = (playlist: NeteasePlaylist) => {
  try {
    fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify({ ...playlist, syncedAt: new Date().toISOString() }, null, 2), "utf8");
  } catch {
    /* 缓存写不进去不影响构建。 */
  }
};

/** 先走普通歌单接口（含 tracks），失败再走 v6 + trackIds（系统歌单如「我喜欢的音乐」）。 */
const tryPlaylist = async (playlistId: string, limit: number): Promise<NeteasePlaylist | null> => {
  const direct = await fetchPlaylist(playlistId, limit).catch(() => null);
  if (direct) return direct;
  return fetchPlaylistByTrackIds(playlistId, limit).catch(() => null);
};

/**
 * 歌词：music.163.com/api/song/lyric 匿名可读，返回 lrc（原文）与 tlyric（官方翻译）。
 * 只有几首歌，直接构建期抓取内嵌，页面零额外请求；抓到后写缓存，后续构建不再请求。
 */
const LYRICS_CACHE = path.join(process.cwd(), ".cache", "netease-lyrics.json");
/** 作词/作曲等制作信息行，听歌时高亮它们没意义，开头 15 秒内直接丢掉。 */
const CREDIT_LINE = /^(作词|作曲|编曲|制作人?|监制|出品|发行|录音|混音|母带|吉他|贝斯|鼓|和声|弦乐|键盘|钢琴|OP|SP|词|曲)\s*[:：]/;

const parseLrc = (raw?: string): Array<{ t: number; text: string }> => {
  if (!raw) return [];
  const lines: Array<{ t: number; text: string }> = [];
  for (const line of raw.split(/\r?\n/)) {
    const stamps = [...line.matchAll(/\[(\d{1,2}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g)];
    if (!stamps.length) continue;
    const text = line.replace(/\[[^\]]*\]/g, "").trim();
    for (const stamp of stamps) {
      const fraction = stamp[3] ? Number(`0.${stamp[3]}`) : 0;
      lines.push({ t: Number(stamp[1]) * 60 + Number(stamp[2]) + fraction, text });
    }
  }
  return lines.sort((a, b) => a.t - b.t);
};

const readLyricsCache = (): Record<string, LyricLine[]> => {
  try {
    const parsed = JSON.parse(fs.readFileSync(LYRICS_CACHE, "utf8")) as { items?: Record<string, LyricLine[]> };
    return parsed.items && typeof parsed.items === "object" ? parsed.items : {};
  } catch {
    return {};
  }
};

const writeLyricsCache = (items: Record<string, LyricLine[]>) => {
  try {
    fs.mkdirSync(path.dirname(LYRICS_CACHE), { recursive: true });
    fs.writeFileSync(LYRICS_CACHE, JSON.stringify({ syncedAt: new Date().toISOString(), items }, null, 2), "utf8");
  } catch {
    /* 缓存写不进去不影响构建。 */
  }
};

const fetchLyrics = async (id: string): Promise<LyricLine[]> => {
  try {
    const response = await fetch(`https://music.163.com/api/song/lyric?id=${encodeURIComponent(id)}&lv=1&kv=1&tv=-1`, { headers });
    if (!response.ok) return [];
    const payload = (await response.json()) as { lrc?: { lyric?: string }; tlyric?: { lyric?: string } };
    const main = parseLrc(payload.lrc?.lyric);
    const translated = new Map(parseLrc(payload.tlyric?.lyric).map((line) => [line.t.toFixed(2), line.text]));
    return main.flatMap((line): LyricLine[] => {
      if (!line.text) return [];
      if (line.t < 15 && CREDIT_LINE.test(line.text)) return [];
      const tr = translated.get(line.t.toFixed(2));
      return [tr && tr !== line.text ? { t: line.t, text: line.text, tr } : { t: line.t, text: line.text }];
    });
  } catch {
    return [];
  }
};

/** 给每首歌补歌词：缓存优先，缓存没有才请求，抓不到就留空（页面显示「暂无歌词」）。 */
const attachLyrics = async (playlist: NeteasePlaylist): Promise<NeteasePlaylist> => {
  const cache = readLyricsCache();
  let dirty = false;
  for (const track of playlist.tracks) {
    if (cache[track.id]) {
      track.lyrics = cache[track.id];
      continue;
    }
    const lines = await fetchLyrics(track.id);
    if (lines.length) {
      cache[track.id] = lines;
      track.lyrics = lines;
      dirty = true;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  if (dirty) writeLyricsCache(cache);
  return playlist;
};

/**
 * 取歌曲单：优先 NETEASE_PLAYLIST_ID（指定歌单）；
 * 否则用 NETEASE_USER_ID 定位「我喜欢的音乐」（specialType=5），再退到其首个可读歌单。
 */
const loadPlaylist = async (): Promise<NeteasePlaylist> => {
  const limit = Number(import.meta.env.NETEASE_TRACK_LIMIT ?? 40);
  const playlistId = import.meta.env.NETEASE_PLAYLIST_ID;
  const userId = import.meta.env.NETEASE_USER_ID;

  try {
    if (playlistId) {
      const playlist = await tryPlaylist(String(playlistId), limit);
      if (playlist?.tracks.length) {
        writeCache(playlist);
        return playlist;
      }
      if (playlist) {
        // 指定的歌单存在但为空：优先用同 id 的旧缓存，否则如实返回空态。
        // 不继续遍历用户其他歌单——指定了歌单就只用它。
        const cached = readCache();
        if (cached && cached.id === playlist.id && cached.tracks.length) return cached;
        return playlist;
      }
    }
    if (userId) {
      const playlists = await fetchUserPlaylists(String(userId));
      const favorites = playlists.filter((item) => item.specialType === 5);
      const ordered = [...favorites, ...playlists.filter((item) => item.specialType !== 5)];
      for (const item of ordered) {
        const playlist = await tryPlaylist(item.id, limit);
        if (playlist) {
          writeCache(playlist);
          return playlist;
        }
      }
    }
  } catch {
    /* 网络不可达时退回缓存。 */
  }

  return (
    readCache() ?? { id: "", name: "未配置歌单", total: 0, tracks: [], source: "empty" }
  );
};

export async function getNeteasePlaylist(): Promise<NeteasePlaylist> {
  const playlist = await loadPlaylist();
  if (!playlist.tracks.length) return playlist;
  try {
    return await attachLyrics(playlist);
  } catch {
    return playlist;
  }
}

/** 前端播放用的解析端点，可在 .env 覆盖成自建的 NeteaseCloudMusicApi / Meting。 */
export const METING_ENDPOINT = import.meta.env.NETEASE_METING_ENDPOINT ?? "https://api.injahow.cn/meting/";
