
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,

  serverExternalPackages: [
    "pdf-parse",
    "@napi-rs/canvas",
  ],
};

export default nextConfig;
