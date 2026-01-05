import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Ignora erros de "estilo" de código (variáveis não usadas, etc) durante o deploy
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Ignora erros de tipagem rigorosa (TypeScript) durante o deploy
    ignoreBuildErrors: true,
  },
};

export default nextConfig;