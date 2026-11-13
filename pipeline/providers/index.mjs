// Provider registry: lớp tích hợp để gắn thêm AI giọng nói / âm thanh sau này.
//
// Mỗi provider là một object:
//   { id: "elevenlabs", kind: "voice" | "audio", describe(): string,
//     async generate({ text, prompt, seconds, outDir, options }) -> { path, durationSec } }
//
// `path` là file audio đã ghi trong outDir. Pipeline sẽ copy vào assets/ của project.
// Thêm provider mới: tạo file trong providers/ rồi gọi register(...) hoặc thêm vào `builtin`.

import { copyFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const registry = new Map();

export function register(provider) {
  if (!provider?.id || !provider?.kind || typeof provider.generate !== "function") {
    throw new Error("Provider cần có id, kind và hàm generate()");
  }
  if (!["voice", "audio"].includes(provider.kind)) {
    throw new Error(`kind không hợp lệ: ${provider.kind}`);
  }
  registry.set(provider.id, provider);
  return provider;
}

export function getProvider(id) {
  const p = registry.get(id);
  if (!p) throw new Error(`Chưa có provider "${id}". Đã đăng ký: ${[...registry.keys()].join(", ")}`);
  return p;
}

export function listProviders() {
  return [...registry.values()].map((p) => ({ id: p.id, kind: p.kind, describe: p.describe?.() ?? "" }));
}

// Provider có sẵn: dùng file audio có sẵn của người dùng (không gọi AI).
register({
  id: "file",
  kind: "audio",
  describe: () => "Dùng file audio có sẵn (đặt `src` trong brief, đường dẫn tương đối với brief)",
  async generate({ options, outDir }) {
    const src = options?.src;
    if (!src || !existsSync(src)) throw new Error(`provider "file" cần options.src tồn tại: ${src}`);
    await mkdir(outDir, { recursive: true });
    const dest = path.join(outDir, path.basename(src));
    await copyFile(src, dest);
    return { path: dest, durationSec: options.durationSec ?? null };
  },
});

// Provider "none": bỏ qua, không tạo audio.
register({
  id: "none",
  kind: "voice",
  describe: () => "Không tạo giọng",
  async generate() {
    return null;
  },
});

export default { register, getProvider, listProviders };
