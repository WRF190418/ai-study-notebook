import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { removeNoteStar, saveNoteStar } from "@/lib/db";

const starSchema = z.object({
  noteId: z.string().min(1).max(100),
  pageKey: z.string().regex(/^page-\d+-\d+$/).max(80),
  pageNumber: z.number().int().positive().max(100000),
  note: z.string().max(500).optional()
});

const removeSchema = starSchema.pick({ noteId: true, pageKey: true });

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "未登录。" }, { status: 401 });

  const parsed = starSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "加星页面信息无效。" }, { status: 400 });

  const star = await saveNoteStar(user.id, parsed.data);
  if (!star) return NextResponse.json({ error: "笔记不存在。" }, { status: 404 });
  return NextResponse.json({ star });
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "未登录。" }, { status: 401 });

  const parsed = removeSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "加星页面信息无效。" }, { status: 400 });

  await removeNoteStar(user.id, parsed.data.noteId, parsed.data.pageKey);
  return NextResponse.json({ ok: true });
}
