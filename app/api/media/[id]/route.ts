import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { findMediaAsset } from "@/lib/db";
import { readMediaAsset } from "@/lib/media";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "未登录。" }, { status: 401 });

  const { id } = await context.params;
  const asset = await findMediaAsset(user.id, id);
  if (!asset) return NextResponse.json({ error: "图片不存在。" }, { status: 404 });

  try {
    const image = await readMediaAsset(asset);
    return new Response(image, {
      headers: {
        "Content-Type": asset.mimeType,
        "Content-Length": String(image.byteLength),
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(asset.fileName)}`,
        "Cache-Control": "private, max-age=86400"
      }
    });
  } catch (error) {
    console.error("Reading note image failed.", error);
    return NextResponse.json({ error: "图片文件读取失败。" }, { status: 404 });
  }
}
