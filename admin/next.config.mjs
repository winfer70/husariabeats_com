// admin/next.config.mjs — HusariaBeats admin panel Next.js configuration.
// Enables standalone output for Docker multi-stage builds.
// Rewrites /api/* to internal FastAPI service (server-side proxy, no CORS needed).

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",

  async rewrites() {
    const apiBase = process.env.INTERNAL_API_URL || "http://api:8000";
    return [
      {
        // Proxy all /api/* calls to FastAPI — used by client components for writes.
        // Avoids CORS issues since the proxy runs server-side inside Docker network.
        source:      "/api/:path*",
        destination: `${apiBase}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
