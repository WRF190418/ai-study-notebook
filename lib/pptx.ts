import JSZip from "jszip";
import { XMLParser } from "fast-xml-parser";
import sharp from "sharp";
import path from "node:path";

export type CoursewareImage = {
  key: string;
  fileName: string;
  sourceFile: string;
  slideNumber: number;
  slideText: string;
  alt: string;
  width: number;
  height: number;
  buffer: Buffer;
  mimeType: "image/webp";
};

export type CoursewareImageInfo = Omit<CoursewareImage, "buffer" | "mimeType">;
const parser = new XMLParser({ ignoreAttributes: false, parseTagValue: false, trimValues: false });
const MAX_IMAGES = 120;
const MAX_IMAGE_BYTES = 32 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 45 * 1024 * 1024;

export async function extractPptxMaterials(buffer: Buffer, sourceFile: string) {
  const zip = await JSZip.loadAsync(buffer);
  const warnings = new Set<string>();
  const presentation = await readXml(zip, "ppt/presentation.xml");
  const rels = await relationships(zip, "ppt/_rels/presentation.xml.rels");
  const slideIds = asArray(presentation?.["p:presentation"]?.["p:sldIdLst"]?.["p:sldId"]);
  const slidePaths = slideIds.length
    ? slideIds.map((slide) => resolvePart("ppt/presentation.xml", rels.get(slide["@_r:id"]) ?? ""))
    : Object.keys(zip.files).filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
        .sort((a, b) => Number(a.match(/(\d+)\.xml$/)?.[1]) - Number(b.match(/(\d+)\.xml$/)?.[1]));
  if (slidePaths.length > 500) throw new Error("课件页数超过 500 页，请按章节拆分后上传。");

  const images: CoursewareImage[] = [];
  const sections: string[] = [];
  const cached = new Map<string, { buffer: Buffer; width: number; height: number }>();
  let outputBytes = 0;
  for (const [index, slidePath] of slidePaths.entries()) {
    if (!slidePath.startsWith("ppt/slides/")) continue;
    const slide = await readXml(zip, slidePath);
    const paragraphs = collectNodes(slide, "a:p");
    const text = paragraphs.map((paragraph) => collectNodes(paragraph, "a:t")
      .map(nodeText).join("")).filter(Boolean).join("\n");
    const slideNumber = index + 1;
    const slideRels = await relationships(zip, `${path.posix.dirname(slidePath)}/_rels/${path.posix.basename(slidePath)}.rels`);
    const notesTarget = [...slideRels.values()].find((target) => resolvePart(slidePath, target).startsWith("ppt/notesSlides/notesSlide"));
    const notes = notesTarget ? await readXml(zip, resolvePart(slidePath, notesTarget)) : undefined;
    const notesText = collectNodes(notes, "p:sp")
      .filter((shape) => !collectNodes(shape, "p:ph").some((placeholder) => ["sldNum", "dt", "ftr", "hdr"].includes(placeholder["@_type"])))
      .flatMap((shape) => collectNodes(shape, "a:p").map((paragraph) => collectNodes(paragraph, "a:t").map(nodeText).join("")))
      .filter((line) => line.trim() && line.trim() !== "`").join("\n");
    const slideImageLines: string[] = [];
    for (const picture of collectNodes(slide, "p:pic")) {
      const blip = collectNodes(picture, "a:blip")[0];
      const target = slideRels.get(blip?.["@_r:embed"]);
      if (!target) continue;
      const mediaPath = resolvePart(slidePath, target);
      if (!mediaPath.startsWith("ppt/media/")) continue;
      if (!/\.(?:png|jpe?g|gif|webp|bmp|tiff?|svg)$/i.test(mediaPath)) {
        warnings.add(`${sourceFile} 有不支持的矢量图片（如 EMF/WMF），请另存为 PNG 后补充。`);
        continue;
      }
      if (images.length >= MAX_IMAGES || outputBytes >= MAX_OUTPUT_BYTES) {
        warnings.add(`${sourceFile} 图片较多，已保留前 ${images.length} 张；可按章节拆分以导入其余图片。`);
        continue;
      }
      const crop = collectNodes(picture, "a:srcRect")[0] ?? {};
      const transform = collectNodes(picture, "a:xfrm")[0] ?? {};
      const cacheKey = `${mediaPath}:${JSON.stringify(crop)}:${JSON.stringify(transform)}`;
      try {
        let normalized = cached.get(cacheKey);
        if (!normalized) {
          const entry = zip.file(mediaPath);
          if (!entry || expandedSize(entry) > MAX_IMAGE_BYTES) {
            warnings.add(`${sourceFile} 有单张图片过大，未导入该图片。`);
            continue;
          }
          const bytes = await entry.async("nodebuffer");
          if (bytes.length > MAX_IMAGE_BYTES) continue;
          let image = sharp(bytes, { limitInputPixels: 40_000_000 });
          const metadata = await image.metadata();
          if (!metadata.width || !metadata.height) continue;
          const left = Math.max(0, Number(crop["@_l"] ?? 0) / 100000);
          const top = Math.max(0, Number(crop["@_t"] ?? 0) / 100000);
          const right = Math.max(0, Number(crop["@_r"] ?? 0) / 100000);
          const bottom = Math.max(0, Number(crop["@_b"] ?? 0) / 100000);
          if ((left || top || right || bottom) && left + right < 1 && top + bottom < 1) {
            const x = Math.floor(metadata.width * left);
            const y = Math.floor(metadata.height * top);
            image = image.extract({ left: x, top: y,
              width: Math.max(1, Math.floor(metadata.width * (1 - right)) - x),
              height: Math.max(1, Math.floor(metadata.height * (1 - bottom)) - y) });
            // Materialize the crop before rotating so coordinates stay in the original image space.
            image = sharp(await image.png().toBuffer(), { limitInputPixels: 40_000_000 });
          }
          if (transform["@_flipH"] === "1" || transform["@_flipH"] === "true") image = image.flop();
          if (transform["@_flipV"] === "1" || transform["@_flipV"] === "true") image = image.flip();
          if (transform["@_rot"]) image = image.rotate(Number(transform["@_rot"]) / 60000, { background: "white" });
          const converted = await image.resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true })
            .webp({ quality: 94 }).toBuffer({ resolveWithObject: true });
          normalized = { buffer: converted.data, width: converted.info.width, height: converted.info.height };
          cached.set(cacheKey, normalized);
        }
        if (outputBytes + normalized.buffer.length > MAX_OUTPUT_BYTES) {
          warnings.add(`${sourceFile} 图片数据超过 45 MB，部分图片未导入，请拆分课件。`);
          continue;
        }
        const properties = collectNodes(picture, "p:cNvPr")[0];
        const alt = String(properties?.["@_descr"] || properties?.["@_title"] || text.split("\n")[0] || "课件插图").slice(0, 200);
        const key = `slide-image-${images.length + 1}`;
        images.push({ key, fileName: `slide-${slideNumber}-${images.length + 1}.webp`, sourceFile,
          slideNumber, slideText: text.slice(0, 1500), alt, ...normalized, mimeType: "image/webp" });
        outputBytes += normalized.buffer.length;
        slideImageLines.push(`- 图片 ${key}：${alt}（${normalized.width}×${normalized.height}）`);
      } catch {
        warnings.add(`${sourceFile} 第 ${slideNumber} 页有图片无法读取，文字仍已保留。`);
      }
    }
    sections.push(`### 幻灯片 ${slideNumber}\n\n${text || "（本页无可提取文字）"}${notesText ? `\n\n讲者备注（课件原文）：\n${notesText}` : ""}${slideImageLines.length ? `\n\n本页图片：\n${slideImageLines.join("\n")}` : ""}`);
  }
  return { text: sections.join("\n\n"), images, warnings: [...warnings] };
}

export function imageInfo(image: CoursewareImage): CoursewareImageInfo {
  const { buffer: _buffer, mimeType: _mimeType, ...info } = image;
  return info;
}

async function readXml(zip: JSZip, part: string) {
  const entry = zip.file(part);
  if (!entry) return undefined;
  if (expandedSize(entry) > 2 * 1024 * 1024) throw new Error("课件 XML 数据过大，请拆分后上传。");
  const text = await entry.async("text");
  if (text.length > 2 * 1024 * 1024 || /<!DOCTYPE|<!ENTITY/i.test(text)) throw new Error("课件 XML 格式不受支持。");
  return parser.parse(text);
}

async function relationships(zip: JSZip, part: string) {
  const xml = await readXml(zip, part);
  const entries = asArray(xml?.Relationships?.Relationship);
  return new Map<string, string>(entries.filter((entry) => entry["@_TargetMode"] !== "External")
    .map((entry) => [entry["@_Id"], entry["@_Target"]]));
}

function resolvePart(source: string, target: string) {
  return target.startsWith("/") ? target.slice(1) : path.posix.normalize(path.posix.join(path.posix.dirname(source), target));
}

function expandedSize(entry: JSZip.JSZipObject) {
  return (entry as JSZip.JSZipObject & { _data?: { uncompressedSize?: number } })._data?.uncompressedSize ?? 0;
}

function asArray<T>(value: T | T[] | undefined): T[] {
  return value === undefined ? [] : Array.isArray(value) ? value : [value];
}

function collectNodes(value: unknown, name: string): any[] {
  if (!value || typeof value !== "object") return [];
  if (Array.isArray(value)) return value.flatMap((item) => collectNodes(item, name));
  const found: any[] = [];
  for (const [key, child] of Object.entries(value)) {
    if (key === name) found.push(...asArray(child));
    else if (!key.startsWith("@_")) found.push(...collectNodes(child, name));
  }
  return found;
}

function nodeText(value: unknown): string {
  return typeof value === "string" ? value : value && typeof value === "object" && "#text" in value ? String(value["#text"]) : "";
}
