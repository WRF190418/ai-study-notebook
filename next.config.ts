import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

export default function nextConfig(phase: string): NextConfig {
  return {
    distDir: phase === PHASE_DEVELOPMENT_SERVER ? ".next-dev" : ".next",
    serverExternalPackages: ["pdfjs-dist", "tesseract.js", "@tesseract.js-data/chi_sim"],
    experimental: {
      serverActions: {
        bodySizeLimit: "8mb"
      }
    }
  };
}
