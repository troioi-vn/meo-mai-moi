import { defineConfig } from 'orval'

export default defineConfig({
  api: {
    input: {
      target: '../backend/storage/api-docs/api-docs.json',
      override: {
        transformer: './scripts/orval/transform-openapi.ts',
      },
    },
    output: {
      mode: 'tags-split',
      target: './src/api/generated',
      schemas: './src/api/generated/model',
      client: 'react-query',
      httpClient: 'axios',
      clean: true,
      override: {
        mutator: {
          path: './src/api/orval-mutator.ts',
          name: 'customInstance',
        },
      },
    },
  },
})
