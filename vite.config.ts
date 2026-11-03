import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // GitHub Pages project site: change this to '/REPOSITORY_NAME/' if needed.
  // For a custom domain or user site, keep '/'.
  base: './'
})
