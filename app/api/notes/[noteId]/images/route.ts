import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { getWorkspace } from "@/lib/db";
import { attachImageToNote, ImageUploadError, isImageFile } from "@/lib/media";

const metadataSchema = z.object({
  placement: z.enum(["start", "end", "after_heading"]).default("end"),
  afterHeading: z.string().max(160).default(""),
  alt: z.string().max(200).default("")
});

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
