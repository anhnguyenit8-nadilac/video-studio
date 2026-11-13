# video-studio

Luồng: prompt → (UI) brief.json → (HyperFrames) project HTML → MP4

- `ui/` — trình tạo brief từ prompt. Video prompt có thời lượng **5–10 phút** (kiểm tra ở UI và trong `pipeline/build.mjs` qua `durationRange`).
- `pipeline/` — build brief thành project HyperFrames, check và render MP4.
- `templates/` — 10 template reel 9:16 theo bộ màu, font Be Vietnam Pro.
- `assets/fonts/` — Be Vietnam Pro (400/700/800).
- Staging: workflow `.github/workflows/pages.yml` đưa `ui/` lên GitHub Pages khi push `main`.

Chạy: `pipeline/render.sh briefs/<file>.json`
Tạo template: `node pipeline/make-templates.mjs`
