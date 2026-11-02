/**
 * 全站唯一的音乐播放器状态。
 *
 * `<audio id="player-audio">` 放在 BaseLayout 里并带 transition:persist，
 * 页面切换时元素不被替换、播放不中断；但每页的音乐 UI 是全新的 DOM，
 * 所以每次 astro:page-load 都要 mountPlayer 一次，把当前曲目与播放进度画回去。
 */

export interface PlayerTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  year: string;
  duration: string;
  cover?: string;
  url: string;
  tint: [string, string];
  lyrics?: LyricLine[];
}

export interface LyricLine {
  t: number;
  text: string;
  tr?: string;
}

const AUDIO_ID = "player-audio";

/** 模块级状态：视图过渡不会重新执行模块，所以切页后仍然保留。 */
let tracks: PlayerTrack[] = [];
let index = 0;
let meting = "";
let signature = "";
let wired = false;
/** 当前高亮的歌词行，-1 表示还没开始。 */
let lyricIndex = -1;

interface Ui {
  app: HTMLElement;
  cover: HTMLElement | null;
  backdrop: HTMLElement | null;
  title: HTMLElement | null;
  artist: HTMLElement | null;
  meta: HTMLElement | null;
  status: HTMLElement | null;
  lyrics: HTMLElement | null;
  lyricList: HTMLElement | null;
  lyricEmpty: HTMLElement | null;
  play: HTMLButtonElement | null;
  bar: HTMLButtonElement | null;
  fill: HTMLElement | null;
  cur: HTMLElement | null;
  dur: HTMLElement | null;
  link: HTMLAnchorElement | null;
}

let ui: Ui | null = null;

const audioEl = () => document.getElementById(AUDIO_ID) as HTMLAudioElement | null;

const fmt = (sec: number) =>
  Number.isFinite(sec) && sec > 0
    ? `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`
    : "0:00";

/** 封面与模糊背景共用同一套 CSS 变量。 */
const setArt = (el: HTMLElement | null, track: PlayerTrack) => {
  if (!el) return;
  el.style.setProperty("--c1", track.tint[0]);
  el.style.setProperty("--c2", track.tint[1]);
  if (track.cover) {
    el.style.setProperty("--disc", `url('${track.cover.replaceAll("'", "%27")}')`);
    el.classList.add("has-art");
  } else {
    el.style.removeProperty("--disc");
    el.classList.remove("has-art");
  }
};

/** 错误/提示信息：有内容才显示，避免占位空行撑开布局。 */
const setStatus = (message: string) => {
  if (!ui?.status) return;
  ui.status.textContent = message;
  ui.status.hidden = !message;
};

/** 把当前曲目的歌词铺进列表；没有歌词时显示「暂无歌词」。 */
const renderLyrics = () => {
  if (!ui?.lyricList) return;
  const lines = tracks[index]?.lyrics ?? [];
  ui.lyricList.replaceChildren();
  lyricIndex = -1;
  if (ui.lyricEmpty) ui.lyricEmpty.hidden = lines.length > 0;
  for (const line of lines) {
    const item = document.createElement("li");
    const text = document.createElement("span");
    text.className = "l-text";
    text.textContent = line.text;
    item.append(text);
    if (line.tr) {
      const tr = document.createElement("span");
      tr.className = "l-tr";
      tr.textContent = line.tr;
      item.append(tr);
    }
    ui.lyricList.append(item);
  }
  if (ui.lyricList.parentElement) ui.lyricList.style.transform = "translateY(0)";
};

/** 按播放进度定位当前行：只在高亮行变化时动 DOM，并把它滚到容器中间。 */
const syncLyrics = () => {
  const audio = audioEl();
  const lines = tracks[index]?.lyrics ?? [];
  if (!ui?.lyricList || !lines.length) return;
  const time = audio?.currentTime ?? 0;
  let next = -1;
  for (let cursor = 0; cursor < lines.length; cursor += 1) {
    if (lines[cursor].t <= time + 0.15) next = cursor;
    else break;
  }
  if (next === lyricIndex) return;
  const nodes = ui.lyricList.children;
  if (lyricIndex >= 0) nodes[lyricIndex]?.classList.remove("is-active");
  lyricIndex = next;
  const active = next >= 0 ? (nodes[next] as HTMLElement | undefined) : undefined;
  if (!active) return;
  active.classList.add("is-active");
  const viewport = ui.lyrics?.clientHeight ?? 0;
  const shift = viewport / 2 - (active.offsetTop + active.offsetHeight / 2);
  const maxShift = Math.min(0, viewport - ui.lyricList.scrollHeight);
  ui.lyricList.style.transform = `translateY(${Math.max(maxShift, shift).toFixed(1)}px)`;
};

const paint = () => {
  const track = tracks[index];
  if (!ui || !track) return;
  if (ui.title) ui.title.textContent = track.title;
  if (ui.artist) ui.artist.textContent = track.artist;
  if (ui.meta) ui.meta.textContent = [track.album, track.year].filter(Boolean).join(" · ") || "网易云音乐";
  setStatus("");
  renderLyrics();
  setArt(ui.cover, track);
  setArt(ui.backdrop, track);
  const label = ui.cover?.querySelector("span");
  if (label) label.textContent = track.album || track.title;
  if (ui.link) ui.link.href = track.url;
  if (ui.dur) ui.dur.textContent = track.duration || "0:00";
  if (ui.fill) ui.fill.style.width = "0";
  if (ui.cur) ui.cur.textContent = "0:00";
};

const paintProgress = () => {
  const audio = audioEl();
  syncLyrics();
  if (!ui || !audio) return;
  if (Number.isFinite(audio.duration) && audio.duration > 0) {
    if (ui.fill) ui.fill.style.width = `${(audio.currentTime / audio.duration) * 100}%`;
    if (ui.cur) ui.cur.textContent = fmt(audio.currentTime);
    if (ui.dur) ui.dur.textContent = fmt(audio.duration);
  }
};

const sync = () => {
  const audio = audioEl();
  const playing = !!audio && !audio.paused && !!audio.getAttribute("src");
  if (!ui) return;
  ui.app.dataset.playing = String(playing);
  if (ui.play) {
    ui.play.textContent = playing ? "Ⅱ" : "▶";
    ui.play.setAttribute("aria-label", `${playing ? "暂停" : "播放"} ${tracks[index]?.title ?? ""}`);
  }
  paintProgress();
};

const load = (autoplay: boolean) => {
  const audio = audioEl();
  const track = tracks[index];
  if (!audio || !track) return;
  if (audio.dataset.trackId !== track.id) {
    audio.src = `${meting}?server=netease&type=url&id=${encodeURIComponent(track.id)}`;
    audio.dataset.trackId = track.id;
  }
  if (autoplay) {
    audio.play().catch(() => {
      setStatus("这首暂时取不到播放地址，可点 ↗ 去网易云");
    });
  }
};

const step = (delta: number, force = false) => {
  if (!tracks.length) return;
  const audio = audioEl();
  const wasPlaying = force || (!!audio && !audio.paused);
  index = (index + delta + tracks.length) % tracks.length;
  paint();
  if (wasPlaying) load(true);
};

/** audio 常驻不销毁，事件只绑一次；回调统一读模块级状态。 */
const wire = () => {
  const audio = audioEl();
  if (!audio || wired) return;
  wired = true;
  audio.addEventListener("play", sync);
  audio.addEventListener("pause", sync);
  audio.addEventListener("timeupdate", paintProgress);
  audio.addEventListener("loadedmetadata", paintProgress);
  audio.addEventListener("ended", () => step(1, true));
  audio.addEventListener("error", () => {
    if (tracks[index]) {
      setStatus(`《${tracks[index].title}》取不到播放地址（版权或会员限制），可点 ↗ 去网易云`);
    }
    sync();
  });
};

/** 每页音乐 UI 挂载后调用；歌单变了才重置到第一首。 */
export function mountPlayer(root: HTMLElement) {
  let next: PlayerTrack[] = [];
  try {
    next = JSON.parse(root.querySelector<HTMLScriptElement>("[data-music-data]")?.textContent ?? "[]");
  } catch {
    next = [];
  }
  const sig = next.map((track) => track.id).join(",");
  if (sig !== signature) {
    signature = sig;
    tracks = next;
    index = 0;
  }
  meting = root.dataset.meting ?? meting;

  const pick = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel);
  ui = {
    app: (root.closest("[data-mac-app]") as HTMLElement | null) ?? root,
    cover: pick("[data-music-cover]"),
    backdrop: pick("[data-music-backdrop]"),
    title: pick("[data-music-title]"),
    artist: pick("[data-music-artist]"),
    meta: pick("[data-music-meta]"),
    status: pick("[data-music-status]"),
    lyrics: pick("[data-music-lyrics]"),
    lyricList: pick("[data-lyrics-list]"),
    lyricEmpty: pick("[data-lyrics-empty]"),
    play: pick<HTMLButtonElement>("[data-music-play]"),
    bar: pick<HTMLButtonElement>("[data-music-bar]"),
    fill: pick("[data-music-fill]"),
    cur: pick("[data-music-current]"),
    dur: pick("[data-music-duration]"),
    link: pick<HTMLAnchorElement>("[data-music-link]"),
  };

  wire();
  paint();
  sync();

  ui.play?.addEventListener("click", () => {
    const audio = audioEl();
    if (!audio) return;
    if (audio.paused) load(true);
    else audio.pause();
  });
  pick("[data-music-prev]")?.addEventListener("click", () => step(-1));
  pick("[data-music-next]")?.addEventListener("click", () => step(1));
  ui.bar?.addEventListener("click", (event) => {
    const audio = audioEl();
    const bar = ui?.bar;
    if (!audio || !bar || !Number.isFinite(audio.duration) || !audio.duration) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    audio.currentTime = ratio * audio.duration;
  });
}
