import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { saveReadingProgress } from "@/lib/db";

const progressSchema = z.object({
  noteId: z.string().min(1).max(100),
  pageKey: z.string().regex(/^page-\d+-\d+$/).max(80),
  pageNumber: z.number().int().positive().max(100000)
});

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "未登录。" }, { status: 401 });

  const parsed = progressSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "阅读进度信息无效。" }, { status: 400 });

  const progress = await saveReadingProgress(user.id, parsed.data);
  if (!progress) return NextResponse.json({ error: "笔记不存在。" }, { status: 404 });
  return NextResponse.json({ progress });
}
