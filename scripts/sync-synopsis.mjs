#!/usr/bin/env node
/**
 * 豆瓣电影简介预取脚本。
 *
 * 为什么要单独跑：m.douban.com 的 rexxar 接口对同一 IP 有节流（约 20 次/窗口，
 * 超限返回 {"msg":"subject_ip_rate_limit"}）。放在构建里会让构建忽快忽慢、且抓不全，
 * 所以做成一次性预取：慢慢抓、逐条落盘，构建时只读缓存。
 *
 * 用法：node scripts/sync-synopsis.mjs [--delay=3500] [--limit=20]
 *   已经有简介的条目会跳过，可反复运行直到全部补齐。
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const args = Object.fromEntries(
  process.argv.slice(2).map((item) => {
    const [key, value] = item.replace(/^--/, "").split("=");
    return [key, value ?? "true"];
  }),
);
const DELAY = Number(args.delay ?? 2500);
const PAUSE = Number(args.pause ?? 600) * 1000; // 命中限流后的冷却时间（秒）
const LIMIT = Number(args.limit ?? 0); // 0 表示不限制条数
const CACHE_DIR = path.join(process.cwd(), ".cache");
const MOVIES = path.join(CACHE_DIR, "douban-movies.json");
const SYNOPSIS = path.join(CACHE_DIR, "douban-synopsis.json");
const UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const readJson = (file, fallback) => {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
};
const writeSynopsis = (items) => {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(SYNOPSIS, JSON.stringify({ syncedAt: new Date().toISOString(), items }, null, 2), "utf8");
};

/**
 * 用 curl 而不是 node fetch：undici 走 keep-alive 连接，豆瓣的 IP 节流会盯上这条连接，
 * 一被限流就连着几十次全是 subject_ip_rate_limit；curl 每次都新建连接，实测稳定。
 * 剧集（如《繁花》《唐顿庄园》）在 /movie/ 路径会 302 到 /tv/，curl -L 跟随即可。
 */
const requestJson = (id) =>
  JSON.parse(
    execFileSync(
      "curl",
      [
        "-s",
        "-L",
        "--noproxy",
        "*",
        "-A",
        UA,
        "-H",
        `Referer: https://m.douban.com/movie/subject/${id}/`,
        `https://m.douban.com/rexxar/api/v2/movie/${id}?for_mobile=1`,
      ],
      { encoding: "utf8", timeout: 20000 },
    ) || "{}",
  );

const movies = readJson(MOVIES, { movies: [] }).movies ?? [];
const store = readJson(SYNOPSIS, { items: {} }).items ?? {};
const queue = movies.filter((movie) => movie.id && !store[movie.id]);
if (LIMIT > 0) queue.length = Math.min(queue.length, LIMIT);

console.log(`[简介预取] 共 ${movies.length} 部，已有 ${Object.keys(store).length} 条，本次待抓 ${queue.length} 条`);

let done = 0;
let failed = 0;
for (const movie of queue) {
  let ok = false;
  for (let attempt = 1; attempt <= 6 && !ok; attempt += 1) {
    try {
      const payload = requestJson(movie.id);
      if (payload?.intro) {
        store[movie.id] = String(payload.intro).replace(/\s+/g, " ").trim();
        writeSynopsis(store);
        done += 1;
        console.log(`  ✓ ${movie.title}（${store[movie.id].length} 字）  进度 ${done}/${queue.length}`);
        ok = true;
      } else if (payload?.msg === "subject_ip_rate_limit") {
        console.log(`  … 被限流，冷却 ${PAUSE / 1000}s 后重试（${movie.title}，第 ${attempt} 次）`);
        await sleep(PAUSE);
      } else {
        console.log(`  - ${movie.title}：接口无简介（${payload?.msg ?? "空响应"}），跳过`);
        ok = true; // 没有简介不是错误，换下一条
      }
    } catch (error) {
      console.log(`  ! ${movie.title}：请求失败 ${error.message}，${attempt < 6 ? "重试" : "放弃"}`);
      await sleep(5000);
    }
  }
  if (!ok) failed += 1;
  await sleep(DELAY);
}

console.log(`[简介预取] 结束：新增 ${done} 条，失败 ${failed} 条，缓存共 ${Object.keys(store).length} 条`);
