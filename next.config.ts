import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['faiss-node'],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push('faiss-node');
    }
    return config;
  },
};

export default nextConfig;
