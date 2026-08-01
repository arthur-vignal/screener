import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow 127.0.0.1 origin in dev to avoid WebSocket blocks
  // when browser hits localhost vs 127.0.0.1
  allowedDevOrigins: ["127.0.0.1", "localhost"],
};

export default nextConfig;
