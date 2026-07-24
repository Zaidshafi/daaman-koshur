import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/daaman-koshur",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
