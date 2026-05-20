import { NextResponse } from "next/server";
import { getCurrentUser, publicUser } from "@/lib/server/auth";
import { safeConfig } from "@/lib/server/provider";

export async function GET() {
  const user = await getCurrentUser();
  return NextResponse.json({
    user: user ? publicUser(user) : null,
    config: safeConfig(user?.config)
  });
}
