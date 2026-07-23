import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["z-ai-web-dev-sdk"],
  reactStrictMode: false,
};

export default nextConfig;