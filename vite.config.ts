import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  plugins: [react(), tailwindcss(), cloudflare()],
  // Pre-bundle up front so a late-discovered import can't split React into two copies.
  optimizeDeps: {
    include: ["react", "react-dom", "react-dom/client", "zustand", "zustand/react/shallow", "@dnd-kit/core", "partysocket", "zod"],
  },
});
