import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    emptyOutDir: false,
    lib: {
      entry: resolve(import.meta.dirname, "src/views/home-script.ts"),
      fileName: "app",
      formats: ["es"],
    },
    outDir: ".generated",
    reportCompressedSize: false,
    rolldownOptions: {
      output: {
        entryFileNames: "app.js",
      },
    },
  },
});
