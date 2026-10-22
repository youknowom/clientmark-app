import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import autoprefixer from 'autoprefixer'

import tailwindcss from 'tailwindcss'

export default defineConfig(() => {
  return {
    base: '/',
    build: {
      outDir: 'build',
    },
    css: {
      postcss: {
        plugins: [
          tailwindcss(),
          autoprefixer({}), // add options if needed
        ],
      },
      preprocessorOptions: {
        scss: {
          quietDeps: true,
        },
      },
    },
    esbuild: {
      loader: 'jsx',
      include: /src\/.*\.jsx?$/,
      exclude: [],
    },
    optimizeDeps: {
      force: true,
      esbuildOptions: {
        loader: {
          '.js': 'jsx',
        },
      },
    },
    plugins: [react()],
    resolve: {
      alias: [
        {
          find: 'src/',
          replacement: `${path.resolve(__dirname, 'src')}/`,
        },
      ],
      extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.scss'],
    },
    server: {
      port: 3001,
      proxy: {
        // https://vitejs.dev/config/server-options.html
      },
    },
    preview: {
      port: 3002,
      headers: {
        'Content-Security-Policy-Report-Only':
          "default-src 'self'; script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com https://js.stripe.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self' http://localhost:8081 https://clientmark.app https://api.stripe.com https://va.vercel-scripts.com ws: wss:; frame-src 'self' https://js.stripe.com; object-src 'none'; report-uri http://localhost:8081/csp-report;",
      },
    },
  }
})
