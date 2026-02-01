module.exports = {
  input: [
    // IMPORTANT: i18next-scanner has fundamental TypeScript parsing limitations
    // The parser cannot handle modern TypeScript syntax like:
    // - interface declarations
    // - type annotations (e.g., import type { ... })
    // - complex destructuring with types
    // - modern import/export syntax
    
    // For now, we manually maintain translation keys or use alternative tools
    // Consider using @lingual/i18n-check for unused key detection instead
    
    // Minimal configuration that might work for simple files
    'src/pages/**/*.tsx',
    'src/components/**/*.tsx',
    
    // Exclude everything that causes parsing errors
    '!src/**/*.spec.*',
    '!src/**/*.test.*',
    '!src/**/*.d.ts',
    '!src/i18n/**',
    '!src/api/**',
    '!src/testing/**',
    '!src/types/**',
    '!src/lib/**',
    '!src/utils/**',
    '!src/hooks/**',
    '!src/contexts/**',
    '!src/components/ui/**', // UI components have complex TypeScript
    '!src/components/auth/**', // Auth components have interfaces
    '!src/components/helper/**', // Helper components have type issues
    '!src/components/invitations/**', // Invitation components have interfaces
    '!src/components/layout/**', // Layout components have interfaces
    '!src/components/messaging/**', // Messaging components have interfaces
    '!src/components/notifications/**', // Notification components have type issues
    '!src/components/pet-health/**', // Pet health components have type issues
    '!src/components/pets/**', // Pet components have type issues
    '!src/components/placement/**', // Placement components have interfaces
    '!src/components/shared/**', // Shared components have type issues
    '!src/components/user/**', // User components have interfaces
    '!**/node_modules/**',
  ],
  output: './',
  options: {
    debug: false,
    func: {
      list: ['i18next.t', 'i18n.t', 't'],
      extensions: ['.tsx'],
    },
    trans: {
      component: 'Trans',
      i18nKey: 'i18nKey',
      defaultsKey: 'defaults',
      extensions: ['.tsx'],
    },
    lngs: ['en', 'ru'],
    ns: ['common', 'auth', 'pets', 'settings', 'validation', 'helper', 'placement'],
    defaultLng: 'en',
    defaultNs: 'common',
    defaultValue: '__STRING_NOT_TRANSLATED__',
    resource: {
      loadPath: 'src/i18n/locales/{{lng}}/{{ns}}.json',
      savePath: 'src/i18n/locales/{{lng}}/{{ns}}.json',
      jsonIndent: 2,
      lineEnding: '\n',
    },
    nsSeparator: ':',
    keySeparator: '.',
    pluralSeparator: '_',
    contextSeparator: '_',
    interpolation: {
      prefix: '{{',
      suffix: '}}',
    },
  },
}
