import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Im Dev laeuft Vite (5173) getrennt vom Backend (8000). Der Proxy leitet
// alle /api-Aufrufe ans Backend weiter -> das Frontend nutzt einfach relative
// Pfade ("/api/status"), genau wie spaeter in Produktion (vom Pi ausgeliefert).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://127.0.0.1:8000",
    },
  },
  build: {
    outDir: "dist",
  },
});
