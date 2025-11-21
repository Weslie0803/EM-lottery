import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  resolve: {
    alias: {
      "@core": path.resolve(__dirname, "src/core"),
      "@components": path.resolve(__dirname, "src/components"),
      "@hooks": path.resolve(__dirname, "src/hooks")
    }
  },
  build: {
    outDir: "dist-renderer"
  },
    // dev 用根路径，prod 用相对路径以兼容 file://
  base: mode === "development" ? "/" : "./"
}));
