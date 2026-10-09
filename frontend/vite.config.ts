import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import basicSsl from '@vitejs/plugin-basic-ssl'

// `npm run dev:mobile` serves HTTPS on the Wi-Fi network (phones only allow GPS over HTTPS)
// and forwards /api to the local backend, so a phone can test the driver screens.
export default defineConfig(({ mode }) => ({
  plugins: [
    mode === 'mobile' && basicSsl(),
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Air Arabia Ride Tracker',
        short_name: 'Ride Tracker',
        description: 'Driver rides, fuel and fees for Air Arabia Egypt',
        theme_color: '#E4002B',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: { navigateFallbackDenylist: [/^\/api/] },
    }),
  ],
  server: mode === 'mobile'
    ? { port: 5175, host: true, proxy: { '/api': 'http://localhost:5080' } }
    : { port: 5173 },
}))
