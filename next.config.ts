import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // vintasend-dashboard-core is published as ESM only. Listing it here makes
  // Next transpile it for every target, and next/jest reads the same list when
  // it builds the test transform, so it is also what lets Jest load the package.
  transpilePackages: ['vintasend-dashboard-core'],

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'img.clerk.com' },
      { protocol: 'https', hostname: 'cdn.auth0.com' },
      { protocol: 'https', hostname: 'vintasend-assets.s3.amazonaws.com' },
    ],
  },
};

export default nextConfig;
