import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Relative base ('./') keeps asset URLs portable: the same build works when
// served from a GitHub Pages project subpath (https://user.github.io/repo/)
// AND when opened from any static host. See README for the deploy note.
export default defineConfig({
  plugins: [react()],
  base: './',
})
