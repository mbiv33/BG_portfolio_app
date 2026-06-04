import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss()],
  server: {
    // Proxy analytics API calls to `wrangler pages dev` during local development.
    proxy: {
      "/api": "http://localhost:8788"
    }
  }
});
