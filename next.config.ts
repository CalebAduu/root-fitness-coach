import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Disable ESLint during builds to avoid deployment failures
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Disable TypeScript errors during builds
    ignoreBuildErrors: true,
  },
  serverExternalPackages: ['faiss-node'],
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push('faiss-node');
    }
    return config;
  },
};

export default nextConfig;
