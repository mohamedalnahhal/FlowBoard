import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // Next 16 blocks cross-origin requests to /_next/* dev resources by default,
  // so opening the dev server over the LAN IP (e.g. from a phone) 403s every JS
  // chunk and the app renders but never hydrates. Allowlist the LAN origin so
  // dev access over the network works. Dev-only; ignored in production builds.
  allowedDevOrigins: ["192.168.88.10"],
  // Pin the workspace root to this project. Without this, Next infers the root
  // from the nearest lockfile and picks up a stray ~/package-lock.json instead.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
