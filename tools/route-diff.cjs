#!/usr/bin/env node
/**
 * 路由 diff 门禁：比对 dist 实际产出的路由与基线清单，防止 sync / 重构静默丢页。
 *
 * 背景：2026-11-01 两次自造 bug（掉 18 个标签页、SQL-索引 被误判为索引页）都只有页数变化能发现，
 * 构建日志全「成功」。此脚本把「路由增删」变成显式动作：要么是预期改动（--update 更新基线），
 * 要么是回归（退出码 1，CI 直接 fail）。
 *
 * 用法：
 *   node tools/route-diff.cjs            # 比对基线，有差异 → 退出码 1
 *   node tools/route-diff.cjs --update   # 把当前路由写入基线
 *   node tools/route-diff.cjs --list     # 只打印当前路由清单
 */
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DIST = path.join(ROOT, "dist");
const BASELINE = path.join(__dirname, "route-baseline.json");

const argv = process.argv.slice(2);
const UPDATE = argv.includes("--update");
const LIST = argv.includes("--list");

/** 收集 dist 下所有 html，归一成路由（一律带尾斜杠，根为 "/"） */
function collectRoutes() {
  if (!fs.existsSync(DIST)) {
    console.error("✗ dist 不存在，请先 npm run build");
    process.exit(2);
  }
  const routes = [];
  (function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        walk(p);
        continue;
      }
      if (!e.name.endsWith(".html")) continue;
      const rel = path.relative(DIST, p).split(path.sep).join("/");
      if (rel === "index.html") {
        routes.push("/");
      } else if (rel.endsWith("/index.html")) {
        routes.push("/" + rel.slice(0, -"index.html".length));
      } else {
        // 例如 404.html：按文件路径计一条
        routes.push("/" + rel);
      }
    }
  })(DIST);
  return routes.sort();
}

const current = collectRoutes();

if (LIST) {
  current.forEach((r) => console.log(r));
  console.log(`--- 共 ${current.length} 条`);
  process.exit(0);
}

if (UPDATE) {
  const payload = { count: current.length, routes: current };
  fs.writeFileSync(BASELINE, JSON.stringify(payload, null, 1) + "\n", "utf8");
  console.log(`✓ 基线已更新：${current.length} 条 → ${path.relative(ROOT, BASELINE)}`);
  process.exit(0);
}

if (!fs.existsSync(BASELINE)) {
  console.error(`✗ 基线不存在（${path.relative(ROOT, BASELINE)}），首次运行请加 --update`);
  process.exit(2);
}

const base = JSON.parse(fs.readFileSync(BASELINE, "utf8"));
const baseSet = new Set(base.routes);
const curSet = new Set(current);

const added = current.filter((r) => !baseSet.has(r));
const removed = base.routes.filter((r) => !curSet.has(r));

console.log(`基线 ${base.routes.length} 条 ｜ 当前 ${current.length} 条`);

if (!added.length && !removed.length) {
  console.log("✓ 路由与基线完全一致");
  process.exit(0);
}

if (added.length) {
  console.log(`\n新增 ${added.length} 条：`);
  added.slice(0, 40).forEach((r) => console.log("  + " + r));
  if (added.length > 40) console.log(`  … 另有 ${added.length - 40} 条`);
}
if (removed.length) {
  console.log(`\n消失 ${removed.length} 条：`);
  removed.slice(0, 40).forEach((r) => console.log("  - " + r));
  if (removed.length > 40) console.log(`  … 另有 ${removed.length - 40} 条`);
}

console.log(
  "\n若这是预期改动（新增文章、删标签等），执行 `node tools/route-diff.cjs --update` 更新基线并一并提交；" +
    "否则说明有页面被静默丢弃，需排查。"
);
process.exit(1);
