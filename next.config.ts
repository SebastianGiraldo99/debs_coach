import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Salida autocontenida para el contenedor: `.next/standalone` trae su propio
   * `server.js` y solo los `node_modules` que el build rastreó de verdad.
   *
   * Sin esto la imagen tendría que cargar con las dependencias enteras
   * —incluidas las de build— y pesaría varias veces más. El precio es que
   * `public/` y `.next/static/` NO se copian solos: el Dockerfile lo hace a
   * mano, y si se olvidan la app arranca sin CSS ni imágenes.
   */
  output: "standalone",
  serverExternalPackages: ["@neslinesli93/qpdf-wasm"],
  outputFileTracingIncludes: {
    "/api/deudas/extracto": ["./node_modules/@neslinesli93/qpdf-wasm/dist/qpdf.wasm"],
  },
};

export default nextConfig;
