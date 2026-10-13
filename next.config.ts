import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The admin import page reads the bundled content packs from disk.
  outputFileTracingIncludes: {
    "/admin/import": ["./content/legacy/**/*.json", "./content/opendata/**/*.json"],
  },
};

export default nextConfig;
