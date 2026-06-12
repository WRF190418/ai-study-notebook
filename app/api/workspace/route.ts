import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getWorkspace } from "@/lib/db";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "未登录。" }, { status: 401 });

  const workspace = await getWorkspace(user.id);
  return NextResponse.json({
    user: { id: user.id, name: user.name, email: user.email, onboardingCompletedAt: user.onboardingCompletedAt },
    ...workspace
  });
}
