import { defineConfig } from "vite";

export default defineConfig({
  resolve: {
    alias: [
      { find: "@", replacement: "/src" },
      { find: "@/core", replacement: "/src/core" },
    ],
  },
});
