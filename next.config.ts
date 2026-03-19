import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  allowedDevOrigins: ['*.trycloudflare.com', '*.loca.lt'],
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
