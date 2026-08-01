import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: parseInt(process.env.PORT || '5175'),
    host: true,
    allowedHosts: [
      'loveai.201014.xyz',
      '192.168.0.14',
      'localhost',
    ],
    watch: {
      ignored: [
        '**/node_modules/**',
        '**/.git/**',
        '**/dist/**',
        '**/*.tsbuildinfo',
        '**/__pycache__/**',
        '**/.pytest_cache/**',
        '**/.mypy_cache/**',
        '**/.ruff_cache/**',
        '**/.cache/**',
        '**/logs/**',
        '**/.vscode/**',
        '**/.cursor/**',
        '**/.claude/**',
        '**/.codex/**',
        '**/.codegraph/**',
        '**/.amazonq/**',
        '**/.kiro/**',
        '**/.zread/**',
      ],
    },
  },
})