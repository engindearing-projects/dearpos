import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";
import path from "node:path";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const config: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@dearpos/core", "@dearpos/db"],
  turbopack: {
    root: repoRoot,
  },
  typedRoutes: true,
};

export default config;
