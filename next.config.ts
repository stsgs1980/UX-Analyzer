import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["z-ai-web-dev-sdk"],
  reactStrictMode: false,
  turbopack: {
    root: "/home/z/my-project/UX-Analyzer",
  },
};

export default nextConfig;