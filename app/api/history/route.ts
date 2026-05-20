import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/errors";
import { requireUser } from "@/lib/server/auth";
import { clearHistory } from "@/lib/server/db";

export async function GET() {
  try {
    const user = await requireUser();
    return NextResponse.json({ history: user.history ?? [] });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE() {
  try {
    const user = await requireUser();
    await clearHistory(user.id);
    return NextResponse.json({ history: [] });
  } catch (error) {
    return errorResponse(error);
  }
}
