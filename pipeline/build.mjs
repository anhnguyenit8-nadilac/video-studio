#!/usr/bin/env node
// Brief JSON -> HyperFrames project (index.html + compositions/scene-N.html).
// Usage: node pipeline/build.mjs briefs/demo.json [outDir]
//
// Brief fields (tất cả tùy chọn trừ scenes):
//   slug, title, width, height, fps, bg, fg, accent,
//   font: { family, weights: { "400": "assets/fonts/x.woff2", ... } }
//   palette: ["#hex", ...]        -> hiển thị dải màu (swatch) ở cuối mỗi scene
//   scenes: [{ headline, body, seconds, bg, fg, accent, voice, audio }]
import { readFile, writeFile, mkdir, copyFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { getProvider } from "./providers/index.mjs";
import "./providers/ai-providers.mjs"; // đăng ký provider AI (để trống sẵn, xem file)

const [, , briefArg, outArg] = process.argv;
if (!briefArg) {
  console.error("Usage: node pipeline/build.mjs <brief.json> [outDir]");
  process.exit(1);
}

const briefPath = path.resolve(briefArg);
const brief = JSON.parse(await readFile(briefPath, "utf8"));
const briefDir = path.dirname(briefPath);
const outDir = path.resolve(outArg ?? path.join("out", brief.slug ?? "video"));
const W = brief.width ?? 1920;
const H = brief.height ?? 1080;
const vertical = H > W;
const FPS = brief.fps ?? 30;

if (!Array.isArray(brief.scenes) || brief.scenes.length === 0) {
  throw new Error("Brief cần ít nhất một scene trong `scenes`");
}

const esc = (s = "") =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const family = brief.font?.family ?? "Inter, Helvetica Neue, Arial, sans-serif";
const fontWeights = brief.font?.weights ?? {};
const sizes = vertical
  ? { title: 150, body: 58, pad: "8%", bar: 130 }
  : { title: 112, body: 46, pad: "9%", bar: 96 };

let cursor = 0;
const scenes = brief.scenes.map((s, i) => {
  const seconds = Number(s.seconds ?? 4);
  const scene = { ...s, index: i + 1, start: cursor, duration: seconds, id: `scene-${i + 1}` };
  cursor += seconds;
  return scene;
});
const total = cursor;

// Giới hạn thời lượng (nếu brief khai báo durationRange, ví dụ video prompt 5–10 phút)
if (brief.durationRange) {
  const { min, max } = brief.durationRange;
  if (total < min || total > max) {
    throw new Error(`Tổng thời lượng ${total}s nằm ngoài khoảng ${min}–${max}s`);
  }
  const bad = scenes.find((s) => s.duration < 3 || s.duration > 30);
  if (bad) throw new Error(`${bad.id} có thời lượng ${bad.duration}s, cần từ 3 đến 30 giây`);
}

await mkdir(path.join(outDir, "compositions"), { recursive: true });
await mkdir(path.join(outDir, "assets"), { recursive: true });

// Copy font files của brief vào project và tạo @font-face
const fontFaces = [];
for (const [weight, rel] of Object.entries(fontWeights)) {
  const src = path.resolve(briefDir, rel);
  if (!existsSync(src)) throw new Error(`Không thấy file font: ${src}`);
  const dest = path.join(outDir, "assets", "fonts", path.basename(src));
  await mkdir(path.dirname(dest), { recursive: true });
  await copyFile(src, dest);
  fontFaces.push(
    `@font-face { font-family: "${family.split(",")[0].replace(/"/g, "")}"; font-weight: ${weight}; font-style: normal; src: url("assets/fonts/${path.basename(src)}") format("woff2"); }`,
  );
}
const fontFamilyCss = `"${family.split(",")[0].replace(/"/g, "")}", Helvetica Neue, Arial, sans-serif`;

// Audio: provider sinh file -> copy vào assets/
const audioTags = [];
for (const scene of scenes) {
  for (const [kind, spec] of [["voice", scene.voice], ["audio", scene.audio]]) {
    if (!spec || spec.provider === "none") continue;
    const provider = getProvider(spec.provider);
    const result = await provider.generate({
      text: spec.text,
      prompt: spec.prompt,
      seconds: scene.duration,
      outDir: path.join(outDir, "assets", "generated"),
      options: { ...spec, src: spec.src ? path.resolve(briefDir, spec.src) : undefined },
    });
    if (!result) continue;
    const rel = path.relative(outDir, result.path).split(path.sep).join("/");
    const audioId = `${scene.id}-${kind}`;
    const start = spec.start ?? scene.start;
    audioTags.push(
      `<audio id="${audioId}" src="${rel}" data-start="${start}" data-duration="${result.durationSec ?? scene.duration}" data-volume="${spec.volume ?? (kind === "voice" ? 1 : 0.5)}"></audio>`,
    );
  }
}

// Scene composition
for (const scene of scenes) {
  const bg = esc(scene.bg ?? brief.bg ?? "#0f0f14");
  const fg = esc(scene.fg ?? brief.fg ?? "#f5f5f7");
  const accent = esc(scene.accent ?? brief.accent ?? "#7c5cff");
  const body = scene.body ? `<p id="${scene.id}-body" class="body">${esc(scene.body)}</p>` : "";
  const swatches = (brief.palette ?? []).length
    ? `<div id="${scene.id}-swatches" class="swatches clip" data-start="0" data-duration="${scene.duration}">
      ${brief.palette
        .map(
          (c) =>
            `<div class="sw"><div class="chip" style="background:${esc(c)}"></div><span>${esc(c.replace("#", "").toUpperCase())}</span></div>`,
        )
        .join("")}
    </div>`
    : "";
  const html = `<template>
  <style>
    ${fontFaces.join("\n    ")}
    #root { position: absolute; inset: 0; background: ${bg}; color: ${fg};
      font-family: ${fontFamilyCss}; display: flex; flex-direction: column; justify-content: center;
      padding: 0 ${sizes.pad}; box-sizing: border-box; }
    #${scene.id}-bar { position: absolute; left: ${sizes.pad}; top: ${vertical ? "22%" : "34%"}; width: ${sizes.bar}px; height: 10px; background: ${accent}; border-radius: 5px; }
    #${scene.id}-title { font-size: ${sizes.title}px; font-weight: 800; line-height: 1.02; margin: 0; letter-spacing: -0.03em; max-width: 92%; }
    #${scene.id}-body { font-size: ${sizes.body}px; font-weight: 400; line-height: 1.3; margin: 40px 0 0; opacity: 0.9; max-width: 88%; }
    .swatches { position: absolute; left: ${sizes.pad}; right: ${sizes.pad}; bottom: ${vertical ? "9%" : "8%"}; display: flex; gap: 18px; }
    .sw { flex: 1; display: flex; flex-direction: column; gap: 12px; }
    .sw .chip { height: ${vertical ? 180 : 130}px; border-radius: 28px; box-shadow: inset 0 0 0 3px rgba(255,255,255,0.28); }
    .sw span { font-size: ${vertical ? 34 : 26}px; font-weight: 700; letter-spacing: 0.04em; }
  </style>
  <div id="root" data-composition-id="${scene.id}" data-width="${W}" data-height="${H}">
    <div id="${scene.id}-bar" class="clip" data-start="0" data-duration="${scene.duration}"></div>
    <h1 id="${scene.id}-title" class="clip" data-start="0" data-duration="${scene.duration}">${esc(scene.headline)}</h1>
    ${body}
    ${swatches}
  </div>
  <script>
    const tl = gsap.timeline({ paused: true });
    tl.fromTo("#${scene.id}-bar", { scaleX: 0, transformOrigin: "left center" }, { scaleX: 1, duration: 0.6, ease: "power3.out" }, 0.2);
    tl.fromTo("#${scene.id}-title", { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.7, ease: "power4.out" }, 0.3);
    ${scene.body ? `tl.fromTo("#${scene.id}-body", { opacity: 0, y: 24 }, { opacity: 0.9, y: 0, duration: 0.6, ease: "power3.out" }, 0.7);` : ""}
    ${swatches ? `tl.fromTo("#${scene.id}-swatches", { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" }, 0.9);` : ""}
    window.__timelines["${scene.id}"] = tl;
  </script>
</template>
`;
  await writeFile(path.join(outDir, "compositions", `${scene.id}.html`), html, "utf8");
}

const hosts = scenes
  .map(
    (s) =>
      `      <div id="host-${s.id}" data-composition-id="${s.id}" data-composition-src="compositions/${s.id}.html" data-start="${s.start}" data-duration="${s.duration}" data-track-index="1" data-track-kind="graphics" data-width="${W}" data-height="${H}"></div>`,
  )
  .join("\n");

const indexHtml = `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <title>${esc(brief.title ?? "Video")}</title>
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>
  <style>html,body{margin:0;background:#000;overflow:hidden}</style>
</head>
<body>
  <div id="root" data-composition-id="main" data-start="0" data-duration="${total}" data-width="${W}" data-height="${H}">
${hosts}
${audioTags.map((t) => "    " + t).join("\n")}
  </div>
  <script>
    window.__timelines = window.__timelines || {};
    window.__timelines["main"] = gsap.timeline({ paused: true });
  </script>
</body>
</html>
`;
await writeFile(path.join(outDir, "index.html"), indexHtml, "utf8");
await writeFile(path.join(outDir, "brief.json"), JSON.stringify(brief, null, 2), "utf8");

console.log(JSON.stringify({ outDir, scenes: scenes.length, durationSec: total, fps: FPS, size: `${W}x${H}`, audio: audioTags.length }));
