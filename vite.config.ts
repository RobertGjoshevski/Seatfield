import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // Relative URLs work both at /Seatfield/ and at the custom domain root.
  base: './',
  plugins: [react(), tailwindcss()],
})
