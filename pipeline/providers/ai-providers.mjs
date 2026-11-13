// Nơi đăng ký các provider AI (giọng nói, nhạc/âm thanh).
// Khi có API key, thêm một file như thế này rồi import ở build.mjs:
//
//   import { register } from "./index.mjs";
//   register({
//     id: "my-voice",
//     kind: "voice",
//     describe: () => "Giọng AI X",
//     async generate({ text, outDir, options }) {
//       // gọi API, ghi file vào outDir, rồi trả về:
//       return { path: "/abs/path/file.mp3", durationSec: 6.2 };
//     },
//   });
//
// Hiện chưa có provider AI nào được cấu hình.
export {};
