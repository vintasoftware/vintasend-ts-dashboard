import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    domains: ["img.clerk.com", "cdn.auth0.com", "vintasend-assets.s3.amazonaws.com"],
  },
};

export default nextConfig;
