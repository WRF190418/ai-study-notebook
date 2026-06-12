import { NextResponse } from "next/server";
import * as bcrypt from "bcryptjs";
import { z } from "zod";
import { resetPasswordWithCode } from "@/lib/db";

const schema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
  password: z.string().min(6).max(80)
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "请输入邮箱、6 位验证码和至少 6 位新密码。" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const ok = await resetPasswordWithCode(parsed.data.email, parsed.data.code, passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "验证码无效或已过期。" }, { status: 400 });
  }

  return NextResponse.json({ message: "密码已重置，可以用新密码登录。" });
}
