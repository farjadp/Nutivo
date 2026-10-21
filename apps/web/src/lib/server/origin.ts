import "server-only";

/**
 * The address the user actually visited. Behind a proxy (Railway) `request.url` is the internal
 * one (http://localhost:8080), so prefer the configured app URL, then the forwarded host.
 */
export function publicOrigin(request: Request): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (host) return `${request.headers.get("x-forwarded-proto") ?? "https"}://${host}`;
  return new URL(request.url).origin;
}
