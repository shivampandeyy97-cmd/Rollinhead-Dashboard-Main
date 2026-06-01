import type { NextConfig } from "next";

const isGithubActions = process.env.GITHUB_ACTIONS === 'true';

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  // Set basePath for GitHub Pages subpath deployment on GitHub Actions
  basePath: isGithubActions ? '/Rollinhead-Dashboard-Main' : '',
};

export default nextConfig;
