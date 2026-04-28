import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Make sure the bundled menu PDF is included in the Vercel/serverless build
  outputFileTracingIncludes: {
    "/api/menu-pdf/**": ["./lib/assets/menu-enisi.pdf"],
  },
  // Aggressive tree-shaking for icon libraries — only the icons we import
  // end up in the client bundle.
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  // Backward-compat redirects for old route names
  async redirects() {
    return [
      { source: "/print", destination: "/admin", permanent: true },
      { source: "/banaku", destination: "/banku", permanent: true },
    ];
  },
};

export default nextConfig;
