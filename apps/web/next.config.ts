import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@eng/shared'],
  output: 'standalone',
};

export default nextConfig;
