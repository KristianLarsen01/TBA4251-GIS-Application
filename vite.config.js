/*
  Hensikt:
  Konfigurasjon for Vite (bygg/utviklingsserver) for dette prosjektet.

  Eksterne biblioteker/verktøy:
  - Vite: leser denne configen når du kjører `npm run dev` og `npm run build`.
  - @vitejs/plugin-react: gjør at Vite forstår React/JSX.

  Min kode vs bibliotek:
  - `plugins: [react()]` og `defineConfig(...)` er Vite-standard.
  - `base` er en prosjektspesifikk innstilling jeg setter for GitHub Pages
    (slik at appen finner ressursene sine under riktig URL-path).
*/
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/TBA4251-GIS-Application/',
})
