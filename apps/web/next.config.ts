import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@nutivo/core"],
  experimental: { serverActions: { bodySizeLimit: "8mb" } },
  // Native PNG renderer for the Telegram card: load from node_modules, do not bundle.
  serverExternalPackages: ["@resvg/resvg-js"],
  // Fonts read from disk by the card renderer must ship with the server functions.
  outputFileTracingIncludes: { "/api/bot/**": ["./assets/fonts/**"], "/api/cron/**": ["./assets/fonts/**"] },
};

export default nextConfig;
