import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The admin import page reads the bundled legacy content packs from disk.
  outputFileTracingIncludes: {
    "/admin/import": ["./content/legacy/**/*.json"],
  },
};

export default nextConfig;
