import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Native PTY bindings must be loaded at runtime, not bundled.
  serverExternalPackages: ["@lydell/node-pty"],
  /* config options here */
  typescript: {
    ignoreBuildErrors: false,
  },
  reactStrictMode: false,
};

export default nextConfig;
