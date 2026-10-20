import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@nutivo/core"],
  experimental: { serverActions: { bodySizeLimit: "8mb" } },
};

export default nextConfig;
