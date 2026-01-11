import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 1. Ignora erros de tipagem do TypeScript durante o build
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // 2. Ignora erros de linting (ESLint) durante o build
  eslint: {
    ignoreDuringBuilds: true,
  },

  // 3. Desativa o modo estrito (Ajuda a evitar conflitos com o editor de texto novo)
  reactStrictMode: false,
};

export default nextConfig;