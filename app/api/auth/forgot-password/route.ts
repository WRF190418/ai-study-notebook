import { NextResponse } from "next/server";
import { z } from "zod";
import { createPasswordReset } from "@/lib/db";

const schema = z.object({
  email: z.string().email()
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "请输入有效邮箱。" }, { status: 400 });
  }

  const reset = await createPasswordReset(parsed.data.email);
  if (!reset) {
    return NextResponse.json({ error: "没有找到这个邮箱对应的账号。" }, { status: 404 });
  }

  return NextResponse.json({
    message: "验证码已生成。当前开发版本会直接显示验证码；接入邮件服务后会发送到邮箱。",
    devCode: reset.code,
    expiresAt: reset.expiresAt
  });
}
