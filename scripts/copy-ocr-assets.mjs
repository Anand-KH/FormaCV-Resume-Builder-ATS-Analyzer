// Copies the OCR engine, worker, and English model into public/tesseract so
// OCR runs from this app's own origin (no third-party CDN requests).
import { copyFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const target = join(root, "public", "tesseract");
const modules = join(root, "node_modules");
const files = [
  ["tesseract.js/dist/worker.min.js", "worker.min.js"],
  // Tesseract picks the fastest variant the browser supports.
  ["tesseract.js-core/tesseract-core-lstm.wasm.js", "tesseract-core-lstm.wasm.js"],
  ["tesseract.js-core/tesseract-core-simd-lstm.wasm.js", "tesseract-core-simd-lstm.wasm.js"],
  ["tesseract.js-core/tesseract-core-relaxedsimd-lstm.wasm.js", "tesseract-core-relaxedsimd-lstm.wasm.js"],
  // Compact integer model: ~3 MB, good accuracy for printed resumes.
  ["@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz", "eng.traineddata.gz"],
];

mkdirSync(target, { recursive: true });
for (const [from, to] of files) {
  const source = join(modules, from);
  const destination = join(target, to);
  if (!existsSync(source)) throw new Error(`Missing OCR asset: ${from}. Run npm install.`);
  if (existsSync(destination) && statSync(destination).size === statSync(source).size) continue;
  copyFileSync(source, destination);
}
console.log("OCR assets ready in public/tesseract");
