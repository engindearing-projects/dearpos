import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@dearpos/core", "@dearpos/db"],
  experimental: {
    typedRoutes: true,
  },
};

export default config;
