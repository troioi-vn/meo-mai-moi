module.exports = {
  forbidden: [
    {
      name: 'no-pages-to-pages',
      comment: 'Pages should not import other pages directly.',
      severity: 'warn',
      from: { 
        path: 'src/pages',
        pathNot: '\\.test\\.(ts|tsx)$'
      },
      to: { path: 'src/pages', pathNot: 'src/pages/[^/]*/index' }
    },
    {
      name: 'no-api-dep-on-ui',
      comment: 'API layer must stay isolated from UI components.',
      severity: 'error',
      from: { path: 'src/api' },
      to: { path: 'src/components' }
    }
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    includeOnly: '^src',
    tsConfig: { fileName: 'tsconfig.json' },
    reporterOptions: { dot: { collapsePattern: 'node_modules/[^/]+' } }
  }
};
