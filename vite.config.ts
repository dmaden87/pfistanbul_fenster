import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { maschinenlesbar } from './bau/maschinenlesbar'

export default defineConfig({
  plugins: [react(), maschinenlesbar()],
})
