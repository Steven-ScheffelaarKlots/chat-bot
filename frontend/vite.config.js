/**
 * VITE CONFIGURATION
 *
 * Vite is the build tool / dev server for the React frontend.
 * It handles:
 *   - Hot module replacement (HMR) — changes appear instantly without refresh
 *   - Bundling JSX and modern JS for the browser
 *   - The proxy configuration below
 *
 * THE PROXY:
 *   When the frontend fetches `/api/chat`, Vite's dev server intercepts it
 *   and forwards it to http://localhost:3001/api/chat (our Express backend).
 *   This avoids CORS issues during development — from the browser's perspective,
 *   everything is on the same origin (localhost:5173).
 *
 *   Without this proxy, the browser would refuse the request because
 *   localhost:5173 (frontend) and localhost:3001 (backend) are different origins.
 */

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Any request to /api/* gets forwarded to the backend
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
});
