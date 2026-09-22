import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The dev server is bound on 0.0.0.0, so browsers that open 127.0.0.1
  // are treated as a different origin and their module scripts are rejected.
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
