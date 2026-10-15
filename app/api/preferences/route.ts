import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { updateUserPreferences } from "@/lib/db";

const preferencesSchema = z.object({
  theme: z.enum(["warm-study", "mist-forest", "midnight-atlas", "cognitive-lab"]).optional(),
  ambience: z.enum(["standard", "immersive", "minimal"]).optional()
}).refine((value) => Object.keys(value).length > 0, "至少需要一项偏好设置");

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "未登录。" }, { status: 401 });

  const parsed = preferencesSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "主题设置无效。" }, { status: 400 });

  const preferences = await updateUserPreferences(user.id, parsed.data);
  return NextResponse.json({ preferences });
}
