import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @cloudflare/puppeteer talks to the Browser Rendering binding; keep it out
  // of the server bundle. @prisma/client / .prisma/client are kept external so
  // Next's bundler (turbopack) does not inline the query-engine WASM as base64
  // (which forces `new WebAssembly.Module(bytes)` — forbidden on Workers). Left
  // external, the `.wasm` import survives to OpenNext/wrangler, which bundle it
  // as a proper CompiledWasm module.
  serverExternalPackages: ["@cloudflare/puppeteer", "@prisma/client", ".prisma/client"],
};

export default nextConfig;
