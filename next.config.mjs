/** @type {import('next').NextConfig} */

// Modo estático para GitHub Pages: STATIC_EXPORT=1.
const isExport = process.env.STATIC_EXPORT === "1";

// En GitHub Pages el sitio vive bajo /<repo>. Configúralo con NEXT_PUBLIC_BASE_PATH.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig = isExport
  ? {
      reactStrictMode: true,
      output: "export",
      trailingSlash: true,
      images: { unoptimized: true },
      basePath: basePath || undefined,
      assetPrefix: basePath || undefined,
    }
  : {
      reactStrictMode: true,
      // Servidor autocontenido (modo API + SQLite).
      output: "standalone",
    };

export default nextConfig;
