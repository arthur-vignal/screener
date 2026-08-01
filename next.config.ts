import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow 127.0.0.1 origin in dev to avoid WebSocket blocks
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  // Standalone output for Railway/Docker (smaller image)
  output: "standalone",
};

export default nextConfig;
