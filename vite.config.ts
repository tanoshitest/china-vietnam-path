import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    build: {
      rollupOptions: {
        output: {
          // Ép Vite cố định tên file chạy chính, không chèn chuỗi hash ngẫu nhiên
          entryFileNames: '[name].js',
        },
      },
    },
  },
});