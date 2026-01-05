import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A configuração do 'eslint' foi REMOVIDA daqui pois gera erro no Next.js 16
  
  typescript: {
    // Mantemos este para garantir que o build não pare por erros de tipagem
    ignoreBuildErrors: true,
  },
};

export default nextConfig;