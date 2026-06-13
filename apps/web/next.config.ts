import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  transpilePackages: ["@pinch/protocol"],
  webpack(config) {
    config.resolve.alias["@react-aria/focus"] = path.resolve(
      __dirname,
      "../../node_modules/@react-aria/focus/dist/main.js"
    );
    config.resolve.fallback = {
      ...config.resolve.fallback,
      "@stripe/crypto": false,
      "@farcaster/mini-app-solana": false,
    };
    return config;
  },
};

export default nextConfig;
