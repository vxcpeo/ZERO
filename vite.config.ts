import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 5173,
    strictPort: false,
  },
  build: {
    target: "es2022",
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          // ethers is by far the largest dependency; keeping it separate lets the shell render
          // before wallet code is parsed.
          ethers: ["ethers"],
          vue: ["vue", "vue-router", "pinia"],
        },
      },
    },
  },
});
