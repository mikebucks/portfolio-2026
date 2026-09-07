import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ["three", "@react-three/drei", "gsap"],
  },
  // OG routes read fonts at runtime; tracing can't see that, so list them.
  outputFileTracingIncludes: {
    "/opengraph-image": ["./src/assets/fonts/**"],
    "/projects/[slug]/opengraph-image": ["./src/assets/fonts/**"],
  },
};

export default nextConfig;
