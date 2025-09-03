/* import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    domains: [
      "www.foodandwine.com",
      "images.ctfassets.net",
      "images.unsplash.com",
      "www.thefooddictator.com",
    ],
  },
};

export default nextConfig;
 */

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**", // allow all hosts
      },
    ],
  },
};

export default nextConfig;
