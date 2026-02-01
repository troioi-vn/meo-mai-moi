#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const { glob } = require('glob')

async function findUnusedTranslations() {
  console.log('🔍 Finding unused translation keys...\n')

  // Get all translation files
  const localesDir = path.join(__dirname, '../src/i18n/locales')
  const translationFiles = await glob('**/*.json', { cwd: localesDir })

  // Collect all keys from translation files
  const allKeys = new Set()
  const keyToFile = new Map()

  for (const file of translationFiles) {
    const content = JSON.parse(fs.readFileSync(path.join(localesDir, file), 'utf8'))
    const [lang, namespaceFile] = file.split('/')
    const namespace = namespaceFile.replace('.json', '')

    const flatten = (obj, prefix = '') => {
      Object.keys(obj).forEach((key) => {
        const fullKey = prefix ? `${prefix}.${key}` : key
        const namespacedKey = `${namespace}:${fullKey}`
        if (typeof obj[key] === 'object') {
          flatten(obj[key], fullKey)
        } else {
          allKeys.add(namespacedKey)
          keyToFile.set(namespacedKey, `${lang}/${file}`)
        }
      })
    }
    flatten(content)
  }

  console.log(`📁 Found ${allKeys.size} translation keys across ${translationFiles.length} files`)

  // Find usage in source files (excluding generated, test, and i18n files)
  const sourceFiles = await glob('src/**/*.{js,jsx,ts,tsx}', {
    ignore: [
      'src/**/*.spec.{js,ts}',
      'src/**/*.test.{js,ts}',
      'src/**/*.d.ts',
      'src/i18n/**',
      'src/api/generated/**',
      'src/testing/**',
    ],
  })

  const usedKeys = new Set()

  for (const file of sourceFiles) {
    const content = fs.readFileSync(file, 'utf8')

    // Only process files that use translations
    if (!content.includes('useTranslation') && !content.includes('i18n.t')) {
      continue
    }

    // Find direct namespaced calls like t('auth:changePassword.title')
    const namespacedMatches = content.match(
      /t\(['"]((?:common|auth|pets|settings|validation):[^'"]+)['"]/g
    )
    if (namespacedMatches) {
      namespacedMatches.forEach((match) => {
        const key = match.replace(/t\(['"]/, '').replace(/['"]\)/, '')
        usedKeys.add(key)
      })
    }

    // Find i18n.t calls with namespace
    const i18nNamespacedMatches = content.match(
      /i18n\.t\(['"]((?:common|auth|pets|settings|validation):[^'"]+)['"]/g
    )
    if (i18nNamespacedMatches) {
      i18nNamespacedMatches.forEach((match) => {
        const key = match.replace(/i18n\.t\(['"]/, '').replace(/['"]\)/, '')
        usedKeys.add(key)
      })
    }
  }

  console.log(`🔎 Found ${usedKeys.size} keys used in source code`)

  // Find unused keys
  const unusedKeys = [...allKeys].filter((key) => !usedKeys.has(key))

  if (unusedKeys.length === 0) {
    console.log('\n✅ No unused translation keys found!')
    return
  }

  console.log(`\n⚠️  Found ${unusedKeys.length} unused translation keys:\n`)

  // Group by file
  const groupedByFile = new Map()

  unusedKeys.forEach((key) => {
    const file = keyToFile.get(key)
    if (!groupedByFile.has(file)) {
      groupedByFile.set(file, [])
    }
    groupedByFile.get(file).push(key)
  })

  for (const [file, keys] of groupedByFile) {
    console.log(`📄 ${file}:`)
    keys.slice(0, 10).forEach((key) => console.log(`  - ${key}`))
    if (keys.length > 10) {
      console.log(`  ... and ${keys.length - 10} more`)
    }
    console.log('')
  }

  console.log(`💡 To remove unused keys, run:`)
  console.log(`   bun run i18n:clean`)
}

findUnusedTranslations().catch(console.error)
