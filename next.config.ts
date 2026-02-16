import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "img.clerk.com" },
      { protocol: "https", hostname: "cdn.auth0.com" },
      { protocol: "https", hostname: "vintasend-assets.s3.amazonaws.com" },
    ],
  },
};

export default nextConfig;
