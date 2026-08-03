import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ["three", "@react-three/drei", "gsap"],
  },
  // The OG routes read Inter off disk at render time (see src/lib/ogFonts.ts).
  // File tracing can't see a runtime join(process.cwd(), ...) read, so the .ttf
  // files must be named explicitly or they're dropped from the deployed bundle
  // — which fails only for on-demand renders (an unknown project slug), long
  // after a build that looked fine.
  outputFileTracingIncludes: {
    "/opengraph-image": ["./src/assets/fonts/**"],
    "/projects/[slug]/opengraph-image": ["./src/assets/fonts/**"],
  },
};

export default nextConfig;
