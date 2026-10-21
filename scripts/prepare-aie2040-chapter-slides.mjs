import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { createWorker, OEM, PSM } from "tesseract.js";
import sharp from "sharp";

const root = process.cwd();
const outputRoot = path.join(root, "data", "aie2040-chapters");
const cachePath = path.join(root, "data", "ocr-cache");
const langPath = path.join(root, "node_modules", "@tesseract.js-data", "eng", "4.0.0_best_int");
const workerCount = Math.max(1, Math.min(3, Number(process.env.AIE2040_OCR_WORKERS || 3)));

const sources = [
  { key: "chapter1", sourcePath: "D:/Win_Data/Desktop/chapter1_slides.pdf", expectedPages: 147 },
  { key: "chapter2", sourcePath: "D:/Win_Data/Desktop/chapter2_slides.pdf", expectedPages: 139 },
  { key: "chapter3", sourcePath: "D:/Win_Data/Desktop/chapter3_slides.pdf", expectedPages: 143 },
  { key: "chapter4", sourcePath: "D:/Win_Data/Desktop/chapter4_slides.pdf", expectedPages: 128 },
  { key: "chapter5", sourcePath: "D:/Win_Data/Desktop/chapter5_slides.pdf", expectedPages: 155 }
];

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "ignore", "inherit"] });
    child.on("error", reject);
    child.on("exit", (code) => code === 0 ? resolve() : reject(new Error(`${command} exited with ${code}`)));
  });
}

async function exists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

async function createOcrWorker() {
  const worker = await createWorker("eng", OEM.LSTM_ONLY, { cachePath, gzip: true, langPath });
  await worker.setParameters({
    preserve_interword_spaces: "1",
    tessedit_pageseg_mode: PSM.AUTO
  });
  return worker;
}

function cleanOcrText(value) {
  return value
    .split(/\r?\n/)
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter(Boolean)
    .filter((line) => !/^Probability & Statistics \| Chapter \d+$/i.test(line))
    .join("\n")
    .trim();
}

async function renderSource(spec) {
  const directory = path.join(outputRoot, spec.key);
  const pagesDir = path.join(directory, "pages");
  const ocrDir = path.join(directory, "ocr");
  const renderDir = path.join(directory, "rendered-jpeg");
  await Promise.all([
    fs.mkdir(pagesDir, { recursive: true }),
    fs.mkdir(ocrDir, { recursive: true }),
    fs.mkdir(renderDir, { recursive: true })
  ]);

  const existingPages = (await fs.readdir(pagesDir)).filter((file) => /^page-\d{3}\.webp$/.test(file));
  const existingOcr = (await fs.readdir(ocrDir)).filter((file) => /^page-\d{3}\.txt$/.test(file));
  if (existingPages.length === spec.expectedPages && existingOcr.length === spec.expectedPages) {
    console.log(`READY ${spec.key}: ${spec.expectedPages} rendered pages and OCR files`);
    return;
  }

  const rendered = (await fs.readdir(renderDir)).filter((file) => /^page-\d{3}\.jpg$/.test(file));
  if (rendered.length !== spec.expectedPages) {
    for (const file of rendered) await fs.rm(path.join(renderDir, file), { force: true });
    console.log(`RENDER ${spec.key}: ${spec.expectedPages} pages`);
    await run("pdftoppm", [
      "-jpeg", "-jpegopt", "quality=96", "-scale-to", "1920",
      spec.sourcePath, path.join(renderDir, "page")
    ]);
  }

  const files = (await fs.readdir(renderDir)).filter((file) => /^page-\d{3}\.jpg$/.test(file)).sort();
  if (files.length !== spec.expectedPages) {
    throw new Error(`${spec.key}: rendered ${files.length}, expected ${spec.expectedPages}`);
  }

  let cursor = 0;
  let completed = 0;
  const workers = await Promise.all(Array.from({ length: workerCount }, () => createOcrWorker()));
  try {
    await Promise.all(workers.map(async (worker) => {
      while (true) {
        const index = cursor++;
        if (index >= files.length) return;
        const number = index + 1;
        const source = path.join(renderDir, files[index]);
        const pageFile = path.join(pagesDir, `page-${String(number).padStart(3, "0")}.webp`);
        const ocrFile = path.join(ocrDir, `page-${String(number).padStart(3, "0")}.txt`);
        if (!(await exists(pageFile))) {
          await sharp(source).webp({ quality: 92, effort: 4 }).toFile(pageFile);
        }
        if (!(await exists(ocrFile))) {
          const result = await worker.recognize(source);
          await fs.writeFile(ocrFile, cleanOcrText(result.data.text), "utf8");
        }
        completed += 1;
        if (completed % 20 === 0 || completed === files.length) {
          console.log(`OCR ${spec.key}: ${completed}/${files.length}`);
        }
      }
    }));
  } finally {
    await Promise.all(workers.map((worker) => worker.terminate()));
  }

  for (const file of files) await fs.rm(path.join(renderDir, file), { force: true });
  await fs.rmdir(renderDir).catch(() => undefined);
}

async function buildMaterials(spec) {
  const directory = path.join(outputRoot, spec.key);
  const pages = [];
  for (let number = 1; number <= spec.expectedPages; number += 1) {
    const suffix = String(number).padStart(3, "0");
    const fileName = `page-${suffix}.webp`;
    const imagePath = path.join(directory, "pages", fileName);
    const text = await fs.readFile(path.join(directory, "ocr", `page-${suffix}.txt`), "utf8");
    const metadata = await sharp(imagePath).metadata();
    pages.push({ number, fileName, text, width: metadata.width, height: metadata.height });
  }
  const material = {
    key: spec.key,
    sourceFile: path.basename(spec.sourcePath),
    sourcePath: spec.sourcePath,
    pageCount: pages.length,
    extractionMethod: "local-english-ocr",
    pages
  };
  await fs.writeFile(path.join(directory, "materials.json"), JSON.stringify(material, null, 2), "utf8");
  await fs.writeFile(
    path.join(directory, "source.txt"),
    pages.map((page) => `### 第 ${page.number} 页\n${page.text || "（OCR 未识别到文字）"}`).join("\n\n"),
    "utf8"
  );

  const contactDir = path.join(directory, "contacts");
  await fs.mkdir(contactDir, { recursive: true });
  for (let start = 0; start < pages.length; start += 12) {
    const slice = pages.slice(start, start + 12);
    const composites = await Promise.all(slice.map(async (page, index) => {
      const image = sharp(path.join(directory, "pages", page.fileName)).resize({ width: 480, height: 270, fit: "contain", background: "#ffffff" });
      return { input: await image.toBuffer(), left: (index % 3) * 500 + 10, top: Math.floor(index / 3) * 300 + 24 };
    }));
    const labels = slice.map((page, index) => ({
      input: Buffer.from(`<svg width="500" height="24"><text x="10" y="18" font-family="Arial" font-size="16" fill="#111827">Page ${page.number}</text></svg>`),
      left: (index % 3) * 500,
      top: Math.floor(index / 3) * 300
    }));
    await sharp({ create: { width: 1500, height: 1200, channels: 3, background: "#e5e7eb" } })
      .composite([...labels, ...composites])
      .jpeg({ quality: 90 })
      .toFile(path.join(contactDir, `contact-${String(Math.floor(start / 12) + 1).padStart(2, "0")}.jpg`));
  }
  console.log(`MATERIAL ${spec.key}: ${pages.length} pages, ${pages.reduce((sum, page) => sum + page.text.length, 0)} OCR chars`);
  return material;
}

await fs.mkdir(outputRoot, { recursive: true });
for (const spec of sources) {
  await renderSource(spec);
  await buildMaterials(spec);
}
const summary = await Promise.all(sources.map(async (spec) => {
  const material = JSON.parse(await fs.readFile(path.join(outputRoot, spec.key, "materials.json"), "utf8"));
  return {
    key: spec.key,
    sourceFile: material.sourceFile,
    pages: material.pageCount,
    ocrChars: material.pages.reduce((sum, page) => sum + page.text.length, 0)
  };
}));
await fs.writeFile(path.join(outputRoot, "sources.json"), JSON.stringify(summary, null, 2), "utf8");
console.log(JSON.stringify({ prepared: true, workerCount, sources: summary }, null, 2));
