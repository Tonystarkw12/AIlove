import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
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
