import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Web-only for now; relative base keeps it portable into a Capacitor WebView later.
export default defineConfig({
  base: "./",
  plugins: [react()],
});
