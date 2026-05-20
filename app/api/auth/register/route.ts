import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/errors";
import { createUser, publicUser } from "@/lib/server/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const user = await createUser(String(body.email ?? ""), String(body.password ?? ""), String(body.name ?? ""));
    return NextResponse.json({ user: publicUser(user) });
  } catch (error) {
    return errorResponse(error);
  }
}
