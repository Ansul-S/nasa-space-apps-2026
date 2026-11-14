import type { NextConfig } from "next";

// Static site: all analog data is calculated in advance by the pipeline and
// served as JSON from public/data, so no server is needed at runtime.
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
