import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/errors";
import { incrementUse, toggleLike } from "@/lib/server/plaza";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const action = String(body.action ?? "use");
    if (action === "like") {
      const item = await toggleLike(id, 1);
      return NextResponse.json({ entry: item });
    }
    if (action === "unlike") {
      const item = await toggleLike(id, -1);
      return NextResponse.json({ entry: item });
    }
    const item = await incrementUse(id);
    return NextResponse.json({ entry: item });
  } catch (error) {
    return errorResponse(error);
  }
}
