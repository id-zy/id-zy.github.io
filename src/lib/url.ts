// 站内链接统一加 base 前缀（GitHub Pages 子路径部署 base=/my-blog 时必需）
// 例：base="/my-blog/" 时 url("/blog") -> "/my-blog/blog"，url("/") -> "/my-blog/"
const RAW_BASE = (import.meta.env.BASE_URL as string) || "/";
const BASE = RAW_BASE.replace(/\/+$/, ""); // 去掉结尾斜杠，便于拼接；根路径则为 ""

export const url = (path = "/"): string => {
  const p = path.startsWith("/") ? path : "/" + path;
  return BASE + p;
};
