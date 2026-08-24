import path from "node:path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // El motor (comisiones-cs-engine) se consume como código fuente TypeScript
  // desde el workspace; Next lo transpila con su propio pipeline.
  transpilePackages: ["comisiones-cs-engine"],
  // `pg` es un driver nativo de Node: debe quedar fuera del bundle del servidor.
  serverExternalPackages: ["pg"],
  // Documentos (hoja de vida, contratos) se suben vía server actions: subir el
  // límite del body para permitir PDFs/imágenes de varios MB.
  experimental: { serverActions: { bodySizeLimit: "15mb" } },
  // La raíz real del monorepo (hay lockfiles sueltos en el sistema que
  // confundirían la inferencia automática de Next).
  outputFileTracingRoot: path.join(import.meta.dirname, ".."),
  webpack: (config) => {
    // El motor usa imports con extensión `.js` (estilo NodeNext). Webpack debe
    // saber resolverlos a los `.ts` fuente al transpilar el paquete.
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js"],
      ".mjs": [".mts", ".mjs"],
    };
    return config;
  },
};

export default nextConfig;
