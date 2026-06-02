import type { NextConfig } from "next";

const isGithubActions = process.env.GITHUB_ACTIONS === 'true';

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  // Subpath is not required since custom domain dash.rollinhead.com maps to root
  basePath: '',
};

export default nextConfig;
