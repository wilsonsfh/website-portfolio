import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // the AI lives on the deployed worker; preview.proxy defaults to this too
  server: { proxy: { "/api": { target: "https://portfolio.wilsonsoon.workers.dev", changeOrigin: true } } },
});
