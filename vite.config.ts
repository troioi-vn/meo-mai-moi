import { defineConfig } from 'vite-plus'

export default defineConfig({
  staged: {
    'frontend/**/*.{js,jsx,ts,tsx,mjs,cjs,json}': 'vp check --fix',
    'vite.config.ts': 'vp check --fix',
  },
  fmt: {
    semi: false,
    singleQuote: true,
    trailingComma: 'es5',
    printWidth: 100,
    tabWidth: 2,
    sortPackageJson: false,
  },
  lint: { options: { typeAware: true, typeCheck: true } },
})
