/** @type {import('next').NextConfig} */
const nextConfig = {
  trailingSlash: true,
  poweredByHeader: false,
  output: "standalone",
  images: { unoptimized: true },
};

export default nextConfig;
