import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/muvv_rotas_2/', // <--- ADICIONE ESTA LINHA EXATAMENTE ASSIM
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})