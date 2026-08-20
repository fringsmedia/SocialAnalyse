import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@ci/shared", "@ci/db"],
};

export default nextConfig;
