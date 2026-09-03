import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdfjs no servidor: fora do bundle, senao o worker interno quebra o build
  serverExternalPackages: ["pdfjs-dist"],
  // Sem a bolinha do dev tools no canto: atrapalha demo gravada e print.
  devIndicators: false,
  // Endurecimento basico. CSP fica pra depois, planejada em vez de copiada.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
