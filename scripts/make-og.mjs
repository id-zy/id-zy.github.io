// 生成社交分享封面 public/og.png（1200×630）
// 只用 ASCII 文案与矢量图形，避免 librsvg 缺中文字体导致方块字。
// 用法：node scripts/make-og.mjs
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "og.png");

const W = 1200;
const H = 630;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="glow" cx="26%" cy="18%" r="78%">
      <stop offset="0%" stop-color="#2c7d5b" stop-opacity="0.55"/>
      <stop offset="55%" stop-color="#123425" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#08150e" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="base" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0a1a12"/>
      <stop offset="52%" stop-color="#08150e"/>
      <stop offset="100%" stop-color="#050d09"/>
    </linearGradient>
    <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
      <path d="M60 0H0V60" fill="none" stroke="#8fbfa4" stroke-opacity="0.055" stroke-width="1"/>
    </pattern>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#base)"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>
  <rect width="${W}" height="${H}" fill="url(#grid)"/>

  <!-- 左上品牌标记：圆角方框 + 叶子 -->
  <g transform="translate(92 86)">
    <rect width="68" height="68" rx="15" fill="#2c7d5b"/>
    <path d="M34 15c10 4 14 15 8 25-8-2-14-10-12-21 2 6 6 10 12 12-6-6-6-14-8-16z" fill="#d8ece0"/>
    <circle cx="34" cy="34" r="5" fill="#d8ece0"/>
  </g>

  <!-- 主标题：域名 -->
  <text x="92" y="300" fill="#f2ede2" font-family="Helvetica Neue, Helvetica, Arial, sans-serif"
        font-size="76" font-weight="600" letter-spacing="-1">blog.id-zyuan.xyz</text>

  <!-- 副标题 -->
  <text x="94" y="360" fill="#9fb4a6" font-family="Helvetica Neue, Helvetica, Arial, sans-serif"
        font-size="27" letter-spacing="7">PERSONAL HOMEPAGE</text>

  <!-- 分割线 -->
  <rect x="94" y="424" width="120" height="2" fill="#d8a24a"/>

  <!-- 数据行 -->
  <text x="94" y="492" fill="#d8a24a" font-family="Helvetica Neue, Helvetica, Arial, sans-serif"
        font-size="21" letter-spacing="3">548 PAGES · STATIC · NO TRACKING</text>

  <!-- 右下装饰：三层窗口轮廓，呼应桌面隐喻 -->
  <g opacity="0.42" transform="translate(812 250)">
    <rect x="42" y="42" width="270" height="176" rx="13" fill="none" stroke="#8fbfa4" stroke-opacity="0.3" stroke-width="1.5"/>
    <rect x="21" y="21" width="270" height="176" rx="13" fill="none" stroke="#8fbfa4" stroke-opacity="0.55" stroke-width="1.5"/>
    <rect x="0" y="0" width="270" height="176" rx="13" fill="#0e2418" stroke="#8fbfa4" stroke-opacity="0.8" stroke-width="1.5"/>
    <circle cx="24" cy="22" r="4.5" fill="#d8a24a"/>
    <circle cx="42" cy="22" r="4.5" fill="#8fbfa4" fill-opacity="0.6"/>
    <circle cx="60" cy="22" r="4.5" fill="#8fbfa4" fill-opacity="0.35"/>
    <rect x="20" y="48" width="120" height="9" rx="4.5" fill="#d8ece0" fill-opacity="0.72"/>
    <rect x="20" y="74" width="200" height="7" rx="3.5" fill="#d8ece0" fill-opacity="0.3"/>
    <rect x="20" y="94" width="168" height="7" rx="3.5" fill="#d8ece0" fill-opacity="0.24"/>
    <rect x="20" y="114" width="188" height="7" rx="3.5" fill="#d8ece0" fill-opacity="0.18"/>
    <rect x="20" y="142" width="86" height="7" rx="3.5" fill="#d8a24a" fill-opacity="0.65"/>
  </g>

  <!-- 底部细边 -->
  <rect x="0" y="${H - 3}" width="${W}" height="3" fill="#d8a24a" fill-opacity="0.35"/>
</svg>`;

await sharp(Buffer.from(svg)).png({ quality: 92, compressionLevel: 9 }).toFile(OUT);
const meta = await sharp(OUT).metadata();
console.log(`已生成 ${OUT} — ${meta.width}×${meta.height}`);
