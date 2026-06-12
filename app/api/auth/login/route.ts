import { NextResponse } from "next/server";
import * as bcrypt from "bcryptjs";
import { z } from "zod";
import { createSession } from "@/lib/auth";
import { findUserByEmail } from "@/lib/db";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "邮箱或密码格式不正确。" }, { status: 400 });
  }

  const user = await findUserByEmail(parsed.data.email);
  if (!user) {
    return NextResponse.json({ error: "邮箱或密码不正确。" }, { status: 401 });
  }

  const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "邮箱或密码不正确。" }, { status: 401 });
  }

  await createSession(user);
  return NextResponse.json({
    user: { id: user.id, name: user.name, email: user.email }
  });
}
