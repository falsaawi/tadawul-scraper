import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @cloudflare/puppeteer talks to the Browser Rendering binding; keep it out
  // of the server bundle.
  serverExternalPackages: ["@cloudflare/puppeteer"],
};

export default nextConfig;
