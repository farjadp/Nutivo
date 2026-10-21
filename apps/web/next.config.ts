import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A second local dev server (e.g. with sign-in on while another runs in review mode) needs its own build folder.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  transpilePackages: ["@nutivo/core"],
  experimental: { serverActions: { bodySizeLimit: "8mb" } },
  // Native PNG renderer for the Telegram card: load from node_modules, do not bundle.
  serverExternalPackages: ["@resvg/resvg-js"],
  // Fonts read from disk by the card renderer must ship with the server functions.
  outputFileTracingIncludes: { "/api/bot/**": ["./assets/**"], "/api/cron/**": ["./assets/**"] },
};

export default nextConfig;
