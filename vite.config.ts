import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { maschinenlesbar } from './bau/maschinenlesbar'
import { vorgerendertEinsetzen } from './bau/vorgerendert'

export default defineConfig({
  plugins: [react(), maschinenlesbar(), vorgerendertEinsetzen()],
})
