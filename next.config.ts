import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  /* config options here */
  // Allow Cloudflare quick tunnel + localhost during dev so cookies work
  allowedDevOrigins: [
    "poker-heath-deserve-display.trycloudflare.com",
    "localhost:3000",
    "127.0.0.1:3000",
  ],
};

export default nextConfig;