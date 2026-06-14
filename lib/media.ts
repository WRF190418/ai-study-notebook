import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { nanoid } from "nanoid";
import { createMediaAsset, deleteMediaAsset, findNoteById, insertImageIntoNote } from "@/lib/db";
import type { MediaAsset } from "@/lib/types";

const dataDir =
  process.env.APP_DATA_DIR ||
  process.env.RAILWAY_VOLUME_MOUNT_PATH ||
  path.join(process.cwd(), "data");
const mediaDir = path.join(dataDir, "media");
const maxImageBytes = 10 * 1024 * 1024;

const imageTypes = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "image/gif": ".gif"
} as const;

type SupportedImageType = keyof typeof imageTypes;

export class ImageUploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImageUploadError";
  }
}

export async function saveNoteImage(input: { userId: string; noteId: string; file: File }) {
  validateImage(input.file);
  const mimeType = input.file.type as SupportedImageType;
  const id = nanoid();
  const storageName = `${id}${imageTypes[mimeType]}`;
  const buffer = Buffer.from(await input.file.arrayBuffer());
  validateImageSignature(buffer, mimeType);

  await mkdir(mediaDir, { recursive: true });
  await writeFile(path.join(mediaDir, storageName), buffer, { flag: "wx" });

  try {
    return await createMediaAsset({
      id,
      userId: input.userId,
      noteId: input.noteId,
      fileName: cleanFileName(input.file.name),
      mimeType,
      size: buffer.byteLength,
      storageName
    });
  } catch (error) {
    await unlink(path.join(mediaDir, storageName)).catch(() => undefined);
    throw error;
  }
}

export async function readMediaAsset(asset: MediaAsset) {
  if (!/^[A-Za-z0-9_-]+\.(?:png|jpg|webp|gif)$/.test(asset.storageName)) {
    throw new ImageUploadError("图片存储路径无效。");
  }
  return readFile(path.join(mediaDir, asset.storageName));
}

export async function removeNoteImage(asset: MediaAsset) {
  await deleteMediaAsset(asset.userId, asset.id);
  await unlink(path.join(mediaDir, asset.storageName)).catch(() => undefined);
}

export async function removeStoredMediaFiles(assets: MediaAsset[]) {
  await Promise.all(
    assets.map((asset) => unlink(path.join(mediaDir, asset.storageName)).catch(() => undefined))
  );
}

export async function attachImageToNote(input: {
  userId: string;
  noteId: string;
  file: File;
  alt?: string;
  placement: "start" | "end" | "after_heading";
  afterHeading?: string;
}) {
  const existingNote = await findNoteById(input.userId, input.noteId);
  if (!existingNote) throw new ImageUploadError("没有找到要插入图片的笔记。");

  const asset = await saveNoteImage(input);
  try {
    const note = await insertImageIntoNote(input.userId, input.noteId, {
      imageUrl: `/api/media/${asset.id}`,
      alt: input.alt?.trim() || stripExtension(asset.fileName),
      placement: input.placement,
      afterHeading: input.afterHeading
    });
    if (!note) throw new ImageUploadError("笔记在插入图片前已不存在。");
    return { asset, note };
  } catch (error) {
    await removeNoteImage(asset);
    if (error instanceof Error && error.message === "NOTE_IMAGE_HEADING_NOT_FOUND") {
      throw new ImageUploadError(`笔记中没有找到标题“${input.afterHeading}”，图片未插入。`);
    }
    throw error;
  }
}

export function isImageFile(value: FormDataEntryValue | null): value is File {
  return (
    value !== null &&
    typeof value !== "string" &&
    typeof value.name === "string" &&
    typeof value.size === "number" &&
    typeof value.type === "string" &&
    typeof value.arrayBuffer === "function"
  );
}

function validateImage(file: File) {
  if (!file.size) throw new ImageUploadError("请选择有效的图片文件。");
  if (file.size > maxImageBytes) throw new ImageUploadError("单张图片不能超过 10 MB。");
  if (!(file.type in imageTypes)) {
    throw new ImageUploadError("仅支持 PNG、JPG、WEBP 或 GIF 图片。");
  }
}

function validateImageSignature(buffer: Buffer, type: SupportedImageType) {
  const valid =
    (type === "image/png" && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) ||
    (type === "image/jpeg" && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer.at(-2) === 0xff && buffer.at(-1) === 0xd9) ||
    (type === "image/gif" && ["GIF87a", "GIF89a"].includes(buffer.subarray(0, 6).toString("ascii"))) ||
    (type === "image/webp" &&
      buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
      buffer.subarray(8, 12).toString("ascii") === "WEBP");
  if (!valid) throw new ImageUploadError("图片内容与文件格式不匹配。");
}

function cleanFileName(value: string) {
  return value.replace(/[^\p{L}\p{N}._ -]/gu, "_").slice(0, 120) || "note-image";
}

function stripExtension(value: string) {
  return value.replace(/\.[^.]+$/, "").trim() || "笔记图片";
}
