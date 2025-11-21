import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "url";

export default defineConfig({
  plugins: [react()],
  root: fileURLToPath(new URL("./client", import.meta.url)), // 루트를 client로 지정
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./client/src", import.meta.url)), // @ -> src
    },
  },
  build: {
    outDir: fileURLToPath(new URL("./dist", import.meta.url)), // 빌드 결과
    rollupOptions: {
      input: fileURLToPath(new URL("./client/src/main.tsx", import.meta.url)), // entry point 지정
    },
  },
  server: {
    fs: {
      allow: [fileURLToPath(new URL("./client", import.meta.url))],
    },
  },
});
