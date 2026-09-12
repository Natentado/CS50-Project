import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { nitro } from 'nitro/vite'
import viteReact from '@vitejs/plugin-react'

const preset = process.env.TARGET_PRESET ?? 'node-server'

export default defineConfig(({ command }) => ({
  server: { port: 3000 },
  plugins: [
    tanstackStart(),
    command === 'build' ? nitro({ preset }) : [],
    viteReact(),
  ],
}))
