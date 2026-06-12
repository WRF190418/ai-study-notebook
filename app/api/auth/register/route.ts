import { NextResponse } from "next/server";
import * as bcrypt from "bcryptjs";
import { z } from "zod";
import { createSession } from "@/lib/auth";
import { createUser, findUserByEmail } from "@/lib/db";

const schema = z.object({
  name: z.string().min(2).max(30),
  email: z.string().email(),
  password: z.string().min(6).max(80)
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "请输入有效的姓名、邮箱和至少 6 位密码。" }, { status: 400 });
  }

  const existing = await findUserByEmail(parsed.data.email);
  if (existing) {
    return NextResponse.json({ error: "这个邮箱已经注册，可以直接登录。" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const user = await createUser({ ...parsed.data, passwordHash });
  await createSession(user);

  return NextResponse.json({
    user: { id: user.id, name: user.name, email: user.email }
  });
}
