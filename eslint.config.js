/*
  Hensikt:
  ESLint-konfigurasjon ("kodevask") som hjelper meg å fange vanlige feil og
  holde en jevn stil i JavaScript/React-koden.

  Eksterne biblioteker/verktøy:
  - ESLint: selve linteren.
  - @eslint/js: anbefalte basisregler.
  - eslint-plugin-react-hooks: regler som hindrer feil bruk av React Hooks.
  - eslint-plugin-react-refresh: Vite/React refresh-relaterte regler.
  - globals: forhåndsdefinerte globale variabler for nettleser (window, document...)

  Min kode vs bibliotek:
  - Det meste her er standard-oppsett fra bibliotekene over.
  - Jeg har valgt noen få prosjektspesifikke ting, f.eks. å ignorere `dist` og
    å tillate ubrukte variabler som starter med stor bokstav/underscore.
*/
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
      'react-refresh/only-export-components': 'off',
      'react-hooks/immutability': 'off',
    },
  },
])
