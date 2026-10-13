import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { recognizeEnglishLayout } from "@/lib/ocr";

const supportedTypes = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
const maxImageSize = 12 * 1024 * 1024;

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "未登录。" }, { status: 401 });

  const form = await request.formData();
  const image = form.get("image");
  if (!(image instanceof File) || !supportedTypes.has(image.type) || image.size > maxImageSize) {
    return NextResponse.json({ error: "请选择不超过 12MB 的 PNG、JPG、WEBP 或 GIF 图片。" }, { status: 400 });
  }

  try {
    const layout = await recognizeEnglishLayout(Buffer.from(await image.arrayBuffer()));
    return NextResponse.json({ layout });
  } catch (error) {
    console.error("English OCR failed", error);
    return NextResponse.json({ error: "英文识别失败，请稍后重试。" }, { status: 500 });
  }
}
