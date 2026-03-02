import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: "autoUpdate",
        strategies: "injectManifest",
        srcDir: "src",
        filename: "sw.ts",
        includeAssets: ["favicon.svg", "apple-touch-icon.png"],
        manifest: {
          name: "OurDM",
          short_name: "OurDM",
          description: "High-end Instagram-style messaging with LiveKit calls.",
          theme_color: "#020617",
          background_color: "#020617",
          display: "standalone",
          start_url: "/",
          icons: [
            {
              src: "pwa-192x192.png",
              sizes: "192x192",
              type: "image/png"
            },
            {
              src: "pwa-512x512.png",
              sizes: "512x512",
              type: "image/png"
            }
          ]
        },
        workbox: {
          runtimeCaching: [
            {
              urlPattern: ({ url }) => url.origin === self.location.origin,
              handler: "StaleWhileRevalidate"
            }
          ]
        },
        devOptions: {
          enabled: true
        }
      })
    ],
    server: {
      host: true,
      port: Number(env.VITE_PORT) || 5173
    },
    resolve: {
      alias: {
        "@": "/src"
      }
    }
  };
});
