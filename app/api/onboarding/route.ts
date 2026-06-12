import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { completeOnboarding } from "@/lib/db";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "未登录。" }, { status: 401 });

  const updated = await completeOnboarding(user.id);
  if (!updated) return NextResponse.json({ error: "找不到当前用户。" }, { status: 404 });

  return NextResponse.json({
    user: {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      onboardingCompletedAt: updated.onboardingCompletedAt
    }
  });
}
