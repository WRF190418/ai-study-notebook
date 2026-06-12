import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { createCourse } from "@/lib/db";

const schema = z.object({
  title: z.string().min(2).max(80),
  code: z.string().min(1).max(30),
  term: z.string().min(2).max(40),
  description: z.string().min(2).max(220)
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "未登录。" }, { status: 401 });

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "课程信息不完整。" }, { status: 400 });
  }

  const course = await createCourse(user.id, parsed.data);
  return NextResponse.json({ course });
}
