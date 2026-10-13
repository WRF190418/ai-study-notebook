import path from "node:path";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";
import { createWorker, OEM, PSM, type Worker } from "tesseract.js";

const appDataDir =
  process.env.APP_DATA_DIR ||
  process.env.RAILWAY_VOLUME_MOUNT_PATH ||
  path.join(process.cwd(), "data");
const languagePath = path.join(
  process.cwd(),
  "node_modules",
  "@tesseract.js-data",
  "chi_sim",
  "4.0.0_best_int"
);
const englishLanguagePath = path.join(
  process.cwd(),
  "node_modules",
  "@tesseract.js-data",
  "eng",
  "4.0.0_best_int"
);
const cachePath = path.join(appDataDir, "ocr-cache");
const selectionCachePath = path.join(cachePath, "english-layout");

let workerPromise: Promise<Worker> | undefined;
let englishWorkerPromise: Promise<Worker> | undefined;
let recognitionQueue = Promise.resolve();

export type EnglishOcrLayout = {
  width: number;
  height: number;
  words: Array<{
    text: string;
    confidence: number;
    bbox: { x0: number; y0: number; x1: number; y1: number };
  }>;
};

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

export async function recognizeEnglishLayout(image: Buffer): Promise<EnglishOcrLayout> {
  const cacheKey = createHash("sha256").update(image).digest("hex");
  const cacheFile = path.join(selectionCachePath, `${cacheKey}.json`);
  try {
    return JSON.parse(await readFile(cacheFile, "utf8")) as EnglishOcrLayout;
  } catch {
    // First recognition for this exact image.
  }

  const recognition = recognitionQueue.then(async () => {
    const metadata = await sharp(image).metadata();
    if (!metadata.width || !metadata.height) throw new Error("无法读取图片尺寸。");
    const worker = await getEnglishWorker();
    const result = await worker.recognize(image, {}, { text: true, blocks: true });
    const words = (result.data.blocks ?? [])
      .flatMap((block) => block.paragraphs)
      .flatMap((paragraph) => paragraph.lines)
      .flatMap((line) => line.words)
      .map((word) => ({
        text: word.text.replace(/\s+/g, " ").trim(),
        confidence: word.confidence,
        bbox: word.bbox
      }))
      .filter(
        (word) =>
          word.confidence >= 35 &&
          /[A-Za-z]/.test(word.text) &&
          word.bbox.x1 > word.bbox.x0 &&
          word.bbox.y1 > word.bbox.y0
      );
    const layout: EnglishOcrLayout = { width: metadata.width, height: metadata.height, words };
    await mkdir(selectionCachePath, { recursive: true });
    await writeFile(cacheFile, JSON.stringify(layout), "utf8");
    return layout;
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

async function getEnglishWorker() {
  if (!englishWorkerPromise) {
    englishWorkerPromise = createWorker("eng", OEM.LSTM_ONLY, {
      cachePath,
      gzip: true,
      langPath: englishLanguagePath
    }).then(async (worker) => {
      await worker.setParameters({
        preserve_interword_spaces: "1",
        tessedit_pageseg_mode: PSM.AUTO
      });
      return worker;
    });
  }
  return englishWorkerPromise;
}

function normalizeOcrText(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter(Boolean)
    .join("\n")
    .trim();
}
