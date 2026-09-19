import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const root = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [tailwindcss(), viteReact()],
  resolve: {
    alias: { "@": resolve(root, "src") },
  },
  publicDir: "public",
  build: {
    outDir: "dist-android",
    emptyOutDir: true,
    assetsDir: "assets",
    rollupOptions: {
      input: resolve(root, "android.html"),
    },
  },
});
