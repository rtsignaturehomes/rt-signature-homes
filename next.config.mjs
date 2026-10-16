/** @type {import('next').NextConfig} */
const nextConfig = {
  trailingSlash: true,
  poweredByHeader: false,
  output: "standalone",
  images: { unoptimized: true },
  async redirects() {
    // Retired to consolidate the "Home Remodeling in Redmond" target on the homepage
    // and avoid keyword cannibalization. The homepage is the replacement for the
    // Redmond location page and the whole-home remodeling service page; the Redmond
    // per-service pages map to their equivalent published main service pages.
    const r = (source, destination) => ({ source, destination, statusCode: 301 });
    return [
      r("/services/home-remodeling/", "/"),
      r("/service-areas/redmond/", "/"),
      r("/service-areas/redmond/home-remodeling/", "/"),
      r("/service-areas/redmond/kitchen-remodeling/", "/services/kitchen-remodeling/"),
      r("/service-areas/redmond/bathroom-remodeling/", "/services/bathroom-remodeling/"),
      r("/service-areas/redmond/home-additions/", "/services/home-additions/"),
      r("/service-areas/redmond/adu-builder/", "/services/adu-builder/"),
      r("/service-areas/redmond/custom-home-builder/", "/services/custom-home-builder/"),
      r("/service-areas/redmond/exterior-remodeling/", "/services/exterior-remodeling/"),
      r("/service-areas/redmond/flooring-installation/", "/services/flooring-installation/"),
      r("/service-areas/redmond/interior-painting/", "/services/interior-painting/"),
      r("/service-areas/redmond/exterior-painting/", "/services/exterior-painting/"),
    ];
  },
};

export default nextConfig;
