import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // Pin the workspace root to this project. Without this, Next infers the root
  // from the nearest lockfile and picks up a stray ~/package-lock.json instead.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
