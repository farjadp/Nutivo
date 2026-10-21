import { NextResponse, type NextRequest } from "next/server";
import { publicOrigin } from "@/lib/server/origin";
import { logEvent } from "@/lib/server/log";
import { createClient } from "@/lib/supabase/server";

const TYPES = new Set(["email", "magiclink", "signup"]);

/**
 * The button in the sign-in email lands here, on our own domain (mail apps distrust a button that
 * points elsewhere than the sender). The token hash is single-use and expires with the code.
 */
export async function GET(request: NextRequest) {
  const params = new URL(request.url).searchParams;
  const tokenHash = params.get("token_hash");
  const type = params.get("type") ?? "email";
  const origin = publicOrigin(request);
  if (tokenHash && TYPES.has(type)) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: type === "signup" ? "signup" : "email" });
    if (!error) return NextResponse.redirect(new URL("/today", origin));
    void logEvent({ kind: "system", level: "warn", event: "auth.link_failed", message: error.message });
  }
  return NextResponse.redirect(new URL("/login?error=link", origin));
}
