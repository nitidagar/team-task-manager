import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  preview: {
    allowedHosts: ['remarkable-learning-production-9c4c.up.railway.app'],
    host: true,
    port: process.env.PORT || 4173
  }
})