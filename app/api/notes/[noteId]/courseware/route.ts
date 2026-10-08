import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { findNoteById } from "@/lib/db";
import { extractPptxMaterials } from "@/lib/pptx";
import { isImageFile, saveCoursewareImages } from "@/lib/media";

export async function POST(request: Request, context: { params: Promise<{ noteId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "未登录。" }, { status: 401 });
  const { noteId } = await context.params;
  if (!await findNoteById(user.id, noteId)) return NextResponse.json({ error: "笔记不存在。" }, { status: 404 });
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > 301 * 1024 * 1024) return NextResponse.json({ error: "课件不能超过 300 MB。" }, { status: 413 });
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!isImageFile(file) || !file.name.toLowerCase().endsWith(".pptx") || !file.size || file.size > 300 * 1024 * 1024) {
      return NextResponse.json({ error: "请选择 300 MB 以内的 PPTX 课件。" }, { status: 400 });
    }
    const material = await extractPptxMaterials(Buffer.from(await file.arrayBuffer()), file.name);
    const images = await saveCoursewareImages(user.id, noteId, material.images);
    return NextResponse.json({ assets: images.map(({ asset }) => asset), warnings: material.warnings,
      message: images.length ? `已导入 ${images.length} 张课件图片。` : "课件中没有可导入的内嵌图片。" });
  } catch (error) {
    console.error("Importing courseware images failed.", error);
    return NextResponse.json({ error: "课件图片导入失败，请检查文件格式或拆分课件后重试。" }, { status: 400 });
  }
}
