import path from "node:path";
import { createWorker, OEM, PSM, type Worker } from "tesseract.js";

const languagePath = path.join(
  process.cwd(),
  "node_modules",
  "@tesseract.js-data",
  "chi_sim",
  "4.0.0_best_int"
);
const cachePath = path.join(process.cwd(), "data", "ocr-cache");

let workerPromise: Promise<Worker> | undefined;
let recognitionQueue = Promise.resolve();

export function recognizeImageText(image: Buffer) {
  const recognition = recognitionQueue.then(async () => {
    const worker = await getWorker();
    const result = await worker.recognize(image);
    return normalizeOcrText(result.data.text);
  });

  recognitionQueue = recognition.then(
    () => undefined,
    () => undefined
  );
  return recognition;
}

async function getWorker() {
  if (!workerPromise) {
    workerPromise = createWorker("chi_sim", OEM.LSTM_ONLY, {
      cachePath,
      gzip: true,
      langPath: languagePath
    }).then(async (worker) => {
      await worker.setParameters({
        preserve_interword_spaces: "1",
        tessedit_pageseg_mode: PSM.AUTO
      });
      return worker;
    });
  }
  return workerPromise;
}

function normalizeOcrText(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter(Boolean)
    .join("\n")
    .trim();
}
