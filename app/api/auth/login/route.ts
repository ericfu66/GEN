import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/errors";
import { login, publicUser } from "@/lib/server/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const user = await login(String(body.email ?? ""), String(body.password ?? ""));
    return NextResponse.json({ user: publicUser(user) });
  } catch (error) {
    return errorResponse(error);
  }
}
