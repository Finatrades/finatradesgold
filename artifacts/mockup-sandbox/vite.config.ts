import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { mockupPreviewPlugin } from "./mockupPreviewPlugin";

export default defineConfig({
  plugins: [react(), tailwindcss(), mockupPreviewPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  base: "/__mockup/",
  server: {
    host: "0.0.0.0",
    port: 5173,
    allowedHosts: true,
  },
});
