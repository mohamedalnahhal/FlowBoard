import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // Next 16 blocks cross-origin requests to /_next/* dev resources by default,
  // so opening the dev server over a LAN IP (host, phone, another device) 403s
  // every JS chunk and the app renders but never hydrates. Allow-list the whole
  // private LAN ranges (each "*" matches one address segment) so this never
  // breaks again when the IP changes via DHCP. Dev-only; ignored in production.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.*.*.*"],
  // Pin the workspace root to this project. Without this, Next infers the root
  // from the nearest lockfile and picks up a stray ~/package-lock.json instead.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
