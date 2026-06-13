import JSZip from "jszip";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { recognizeImageText } from "@/lib/ocr";

const MAX_FILE_BYTES = 15 * 1024 * 1024;
const MAX_TOTAL_BYTES = 30 * 1024 * 1024;
const MAX_FILES = 8;
const MAX_IMAGE_FILES = 4;
const MAX_EXTRACTED_CHARS = 60_000;

const imageExtensions: Record<string, string> = {
  ".gif": "image/gif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp"
};
const supportedImageMimes = new Set(Object.values(imageExtensions));

export type ParsedMaterials = {
  extractedText: string;
  imageDataUrls: string[];
  fileNames: string[];
};

export class MaterialParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MaterialParseError";
  }
}

export async function parseUploadedMaterials(files: File[]): Promise<ParsedMaterials> {
  if (files.length > MAX_FILES) {
    throw new MaterialParseError(`一次最多上传 ${MAX_FILES} 个文件。`);
  }

  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
  if (totalBytes > MAX_TOTAL_BYTES) {
    throw new MaterialParseError("上传文件总大小不能超过 30 MB。");
  }

  const textSections: string[] = [];
  const imageDataUrls: string[] = [];

  for (const file of files) {
    if (file.size === 0) throw new MaterialParseError(`文件“${file.name}”是空文件。`);
    if (file.size > MAX_FILE_BYTES) {
      throw new MaterialParseError(`文件“${file.name}”超过 15 MB，请压缩或拆分后重试。`);
    }

    const extension = getExtension(file.name);
    const imageMime = supportedImageMimes.has(file.type) ? file.type : imageExtensions[extension];
    if (file.type.startsWith("image/") && !imageMime) {
      throw new MaterialParseError(`不支持图片“${file.name}”的格式，请转换为 PNG、JPG、WEBP 或 GIF。`);
    }
    const buffer = Buffer.from(await file.arrayBuffer());

    if (imageMime) {
      if (imageDataUrls.length >= MAX_IMAGE_FILES) {
        throw new MaterialParseError(`一次最多上传 ${MAX_IMAGE_FILES} 张图片。`);
      }
      imageDataUrls.push(`data:${imageMime};base64,${buffer.toString("base64")}`);
      try {
        const ocrText = await recognizeImageText(buffer);
        if (ocrText) textSections.push(`## 图片 OCR：${file.name}\n\n${ocrText}`);
      } catch (error) {
        console.warn(`Local OCR failed for ${file.name}.`, error);
      }
      continue;
    }

    let extracted: string;
    try {
      extracted = await extractDocumentText(buffer, extension, file.name);
    } catch (error) {
      if (error instanceof MaterialParseError) throw error;
      console.error(`Document extraction failed for ${file.name}.`, error);
      throw new MaterialParseError(buildDocumentParseMessage(file.name, extension, error));
    }
    if (!extracted.trim()) {
      throw new MaterialParseError(`未能从“${file.name}”中提取到文字。扫描版 PDF 请改为上传页面截图。`);
    }
    textSections.push(`## 文件：${file.name}\n\n${extracted.trim()}`);
  }

  const extractedText = truncateText(textSections.join("\n\n---\n\n"));
  return {
    extractedText,
    imageDataUrls,
    fileNames: files.map((file) => file.name)
  };
}

async function extractDocumentText(buffer: Buffer, extension: string, fileName: string) {
  if (extension === ".pdf") return extractPdfText(buffer);
  if (extension === ".pptx") return extractPptxText(buffer);
  if (extension === ".docx") return extractDocxText(buffer);
  if ([".txt", ".md", ".markdown", ".csv"].includes(extension)) return buffer.toString("utf8");

  if (extension === ".ppt" || extension === ".doc") {
    throw new MaterialParseError(`暂不支持旧版“${extension}”文件，请另存为 PPTX、DOCX 或 PDF 后上传。`);
  }

  throw new MaterialParseError(
    `不支持“${fileName}”的格式。可上传 PNG、JPG、WEBP、PDF、PPTX、DOCX、TXT 或 Markdown。`
  );
}

async function extractPdfText(buffer: Buffer) {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const standardFontDataUrl = pathToFileURL(
    `${path.join(process.cwd(), "node_modules", "pdfjs-dist", "standard_fonts")}${path.sep}`
  ).href;
  const loadingTask = getDocument({
    data: new Uint8Array(buffer),
    standardFontDataUrl,
    useWorkerFetch: false
  });
  const document = await loadingTask.promise;
  const pages: string[] = [];

  try {
    const batchSize = 6;
    for (let start = 1; start <= document.numPages; start += batchSize) {
      const pageNumbers = Array.from(
        { length: Math.min(batchSize, document.numPages - start + 1) },
        (_, index) => start + index
      );
      const batch = await Promise.all(
        pageNumbers.map(async (pageNumber) => {
          const page = await document.getPage(pageNumber);
          const content = await page.getTextContent();
          const text = content.items
            .map((item) => ("str" in item ? item.str : ""))
            .join(" ")
            .replace(/\s+/g, " ")
            .trim();
          page.cleanup();
          return text ? `### PDF 第 ${pageNumber} 页\n\n${text}` : "";
        })
      );
      pages.push(...batch.filter(Boolean));
    }
  } finally {
    await loadingTask.destroy();
  }

  return pages.join("\n\n");
}

async function extractPptxText(buffer: Buffer) {
  const zip = await JSZip.loadAsync(buffer);
  const slidePaths = Object.keys(zip.files)
    .filter((path) => /^ppt\/slides\/slide\d+\.xml$/i.test(path))
    .sort((left, right) => getNumericSuffix(left) - getNumericSuffix(right));
  const slides: string[] = [];

  for (const [index, path] of slidePaths.entries()) {
    const xml = await zip.file(path)?.async("text");
    const text = xml ? extractOpenXmlParagraphs(xml, "a") : "";
    if (text) slides.push(`### 幻灯片 ${index + 1}\n\n${text}`);
  }

  return slides.join("\n\n");
}

async function extractDocxText(buffer: Buffer) {
  const zip = await JSZip.loadAsync(buffer);
  const documentXml = await zip.file("word/document.xml")?.async("text");
  if (!documentXml) return "";
  return extractOpenXmlParagraphs(documentXml, "w");
}

function extractOpenXmlParagraphs(xml: string, prefix: "a" | "w") {
  const paragraphs = xml.split(new RegExp(`</${prefix}:p>`, "i"));
  return paragraphs
    .map((paragraph) => {
      const matches = paragraph.matchAll(new RegExp(`<${prefix}:t(?:\\s[^>]*)?>([\\s\\S]*?)</${prefix}:t>`, "gi"));
      return Array.from(matches, (match) => decodeXml(match[1])).join("");
    })
    .map((text) => text.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

function decodeXml(value: string) {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 16)));
}

function truncateText(value: string) {
  if (value.length <= MAX_EXTRACTED_CHARS) return value;
  return `${value.slice(0, MAX_EXTRACTED_CHARS)}\n\n> 课件内容较长，已截取前 ${MAX_EXTRACTED_CHARS} 个字符进行整理。`;
}

function getExtension(fileName: string) {
  const index = fileName.lastIndexOf(".");
  return index >= 0 ? fileName.slice(index).toLowerCase() : "";
}

function getNumericSuffix(value: string) {
  return Number(value.match(/(\d+)(?=\.xml$)/i)?.[1] ?? 0);
}

function buildDocumentParseMessage(fileName: string, extension: string, error: unknown) {
  const detail = error instanceof Error ? error.message.toLowerCase() : "";
  if (extension === ".pdf" && (detail.includes("password") || detail.includes("encrypted"))) {
    return `PDF“${fileName}”已加密，请解除密码保护后重新上传。`;
  }
  if (extension === ".pptx" && detail.includes("zip")) {
    return `课件“${fileName}”不是有效的 PPTX 文件，请用 PowerPoint 重新另存后上传。`;
  }
  return `无法解析“${fileName}”，文件可能已损坏或格式与扩展名不一致。请重新导出后上传。`;
}
