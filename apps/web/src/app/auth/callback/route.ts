import { NextResponse, type NextRequest } from "next/server";
import { publicOrigin } from "@/lib/server/origin";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = new URL(request.url).searchParams.get("code");
  const origin = publicOrigin(request);
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL("/today", origin));
  }
  return NextResponse.redirect(new URL("/login?error=link", origin));
}
