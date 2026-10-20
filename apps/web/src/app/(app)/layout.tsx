import type { ReactNode } from "react";

/** Authenticated app shell. Bottom navigation is added with the Today screen. */
export default function AppLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-dvh">{children}</div>;
}
