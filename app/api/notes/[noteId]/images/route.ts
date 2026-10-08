import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { findMediaAsset, findNoteById, getWorkspace, insertImageIntoNote, viewDb } from "@/lib/db";
import { attachImageToNote, ImageUploadError, isImageFile } from "@/lib/media";

const metadataSchema = z.object({
  placement: z.enum(["start", "end", "after_heading"]).default("end"),
  afterHeading: z.string().max(160).default(""),
  alt: z.string().max(200).default("")
});

export async function GET(_request: Request, context: { params: Promise<{ noteId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "未登录。" }, { status: 401 });
  const { noteId } = await context.params;
  if (!await findNoteById(user.id, noteId)) return NextResponse.json({ error: "笔记不存在。" }, { status: 404 });
  const assets = await viewDb((db) => db.mediaAssets.filter((asset) => asset.userId === user.id && asset.noteId === noteId));
  return NextResponse.json({ assets });
}

export async function PATCH(request: Request, context: { params: Promise<{ noteId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "未登录。" }, { status: 401 });
  const { noteId } = await context.params;
  const parsed = metadataSchema.extend({ assetId: z.string() }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "图片插入参数不正确。" }, { status: 400 });
  const asset = await findMediaAsset(user.id, parsed.data.assetId);
  if (!asset || asset.noteId !== noteId) return NextResponse.json({ error: "图片不存在。" }, { status: 404 });
  if (parsed.data.placement === "after_heading" && !parsed.data.afterHeading.trim()) {
    return NextResponse.json({ error: "请选择插入位置。" }, { status: 400 });
  }
  try {
    const alt = `${parsed.data.alt || asset.alt || "课件插图"}${asset.sourceFile ? ` · ${asset.sourceFile} 第 ${asset.slideNumber} 页` : ""}`;
    const note = await insertImageIntoNote(user.id, noteId, { ...parsed.data, alt, imageUrl: `/api/media/${asset.id}` });
    if (!note) return NextResponse.json({ error: "笔记不存在。" }, { status: 404 });
    return NextResponse.json({ note, workspace: await getWorkspace(user.id), message: "图片已插入笔记。" });
  } catch (error) {
    const message = error instanceof Error && error.message === "NOTE_IMAGE_HEADING_NOT_FOUND" ? "插入位置已不存在，请重新选择。" : "图片插入失败，请稍后重试。";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(request: Request, context: { params: Promise<{ noteId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "未登录。" }, { status: 401 });
  if (exceedsUploadLimit(request)) {
    return NextResponse.json({ error: "单张图片不能超过 10 MB。" }, { status: 413 });
  }

  try {
    const form = await request.formData();
    const file = form.get("image");
    if (!isImageFile(file)) {
      return NextResponse.json({ error: "请选择要插入的图片。" }, { status: 400 });
    }

    const parsed = metadataSchema.safeParse({
      placement: readString(form, "placement") || "end",
      afterHeading: readString(form, "afterHeading"),
      alt: readString(form, "alt")
    });
    if (!parsed.success) {
      return NextResponse.json({ error: "图片插入位置不正确。" }, { status: 400 });
    }
    if (parsed.data.placement === "after_heading" && !parsed.data.afterHeading.trim()) {
      return NextResponse.json({ error: "请输入图片要放在哪个标题后。" }, { status: 400 });
    }

    const { noteId } = await context.params;
    const result = await attachImageToNote({
      userId: user.id,
      noteId,
      file,
      ...parsed.data
    });
    const workspace = await getWorkspace(user.id);
    return NextResponse.json({
      message:
        parsed.data.placement === "start"
          ? "图片已插入笔记开头。"
          : parsed.data.placement === "after_heading"
            ? `图片已插入“${parsed.data.afterHeading}”标题后。`
            : "图片已插入笔记结尾。",
      note: result.note,
      asset: result.asset,
      workspace
    });
  } catch (error) {
    if (error instanceof ImageUploadError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Inserting note image failed.", error);
    return NextResponse.json({ error: "图片插入失败，请稍后重试。" }, { status: 500 });
  }
}

function readString(form: FormData, key: string) {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
}

function exceedsUploadLimit(request: Request) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  return Number.isFinite(contentLength) && contentLength > 11 * 1024 * 1024;
}
