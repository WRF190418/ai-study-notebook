import { NextResponse } from "next/server";
import { viewDb } from "@/lib/db";

export async function GET() {
  try {
    await viewDb(() => true);
    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("Health check failed.", error);
    return NextResponse.json({ status: "error" }, { status: 503 });
  }
}
