import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * The address the user actually visited. Behind a proxy (Railway) `request.url` is the internal
 * one (http://localhost:8080), so prefer the configured app URL, then the forwarded host.
 */
function publicOrigin(request: NextRequest): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (host) return `${request.headers.get("x-forwarded-proto") ?? "https"}://${host}`;
  return new URL(request.url).origin;
}

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
