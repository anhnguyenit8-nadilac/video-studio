#!/usr/bin/env node
// Sinh template reel 9:16 cho từng bộ màu trong templates/palettes.json.
// Với mỗi bộ: ghi brief (templates/briefs/<id>.json) -> build project -> check -> render MP4.
// Usage: node pipeline/make-templates.mjs [id-filter]
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const palettes = JSON.parse(await readFile(path.join(ROOT, "templates/palettes.json"), "utf8"));
const filter = process.argv[2];
const font = {
  family: "Be Vietnam Pro",
  weights: {
    400: "../../assets/fonts/be-vietnam-pro-vietnamese-400-normal.woff2",
    700: "../../assets/fonts/be-vietnam-pro-vietnamese-700-normal.woff2",
    800: "../../assets/fonts/be-vietnam-pro-vietnamese-800-normal.woff2",
  },
};

await mkdir(path.join(ROOT, "templates/briefs"), { recursive: true });
for (const p of palettes) {
  if (filter && !p.id.includes(filter)) continue;
  const brief = {
    slug: p.id,
    title: `Template ${p.name}`,
    width: 1080,
    height: 1920,
    fps: 30,
    bg: p.bg,
    fg: p.fg,
    accent: p.accent,
    palette: p.palette,
    font,
    scenes: [
      { headline: p.name, body: "Bộ màu cho video reel 9:16", seconds: 3 },
      { headline: "Tiêu đề chính của bạn", body: "Thay nội dung trong brief để dùng lại template này", seconds: 3 },
      { headline: "Điểm nổi bật số một", body: "Mỗi scene có thể đổi thời lượng và câu chữ", seconds: 3 },
      { headline: "Bắt đầu ngay hôm nay", body: "Lưu lại và chia sẻ bộ màu này", seconds: 3 },
    ],
  };
  const briefFile = path.join(ROOT, "templates/briefs", `${p.id}.json`);
  await writeFile(briefFile, JSON.stringify(brief, null, 2), "utf8");
  console.log(`>> ${p.id}`);
  execFileSync(path.join(ROOT, "pipeline/render.sh"), [briefFile, path.join(ROOT, "out/templates", p.id)], {
    stdio: ["ignore", "ignore", "inherit"],
    env: { ...process.env, HYPERFRAMES_BROWSER_PATH: process.env.HYPERFRAMES_BROWSER_PATH ?? "/usr/bin/google-chrome" },
  });
}
console.log("done");
