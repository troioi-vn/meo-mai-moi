#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const { glob } = require('glob')

async function removeUnusedTranslations() {
  console.log('🧹 Removing unused translation keys...\n')

  // Create backup
  const localesDir = path.join(__dirname, '../src/i18n/locales')
  const backupDir = path.join(__dirname, '../src/i18n/locales.backup')

  if (fs.existsSync(backupDir)) {
    fs.rmSync(backupDir, { recursive: true, force: true })
  }
  fs.mkdirSync(backupDir, { recursive: true })

  // Copy all translation files to backup
  const translationFiles = await glob('**/*.json', { cwd: localesDir })
  for (const file of translationFiles) {
    const srcPath = path.join(localesDir, file)
    const destPath = path.join(backupDir, file)
    fs.mkdirSync(path.dirname(destPath), { recursive: true })
    fs.copyFileSync(srcPath, destPath)
  }

  console.log('📦 Created backup in src/i18n/locales.backup')

  // Get all source files
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

  // Collect all used keys
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

    // Find useTranslation calls to understand context (handles both single string and array)
    let namespaces = []
    // Check for array syntax: useTranslation(['ns1', 'ns2'])
    const arrayMatch = content.match(
      /useTranslation\(\s*\[\s*['"]([^'"]*(?:\s*,\s*['"][^'"]*)*)['"]\s*\]\s*\)/
    )
    if (arrayMatch) {
      namespaces = arrayMatch[1].split(/\s*,\s*/).map((ns) => ns.replace(/['"]/g, ''))
    } else {
      // Check for single namespace: useTranslation('ns')
      const singleMatch = content.match(/useTranslation\(\s*['"]([^'"]+)['"]\s*\)/)
      if (singleMatch) {
        namespaces = [singleMatch[1]]
      }
    }

    if (namespaces.length > 0) {
      // For files with useTranslation, look for t() calls and assume they use these namespaces
      const tMatches = content.match(/t\(['"]([^'"]+)['"]/g)
      if (tMatches) {
        tMatches.forEach((match) => {
          const key = match.replace(/t\(['"]/, '').replace(/['"]\)/, '')
          // If key already has namespace, use as-is
          if (key.includes(':')) {
            usedKeys.add(key)
          } else {
            // Otherwise, add with each namespace found in this file
            namespaces.forEach((ns) => {
              usedKeys.add(`${ns}:${key}`)
            })
          }
        })
      }
    } else {
      // For files without useTranslation, assume common namespace for t() calls
      const tMatches = content.match(/t\(['"]([^'"]+)['"]/g)
      if (tMatches) {
        tMatches.forEach((match) => {
          const key = match.replace(/t\(['"]/, '').replace(/['"]\)/, '')
          if (key.includes(':')) {
            usedKeys.add(key)
          } else {
            usedKeys.add(`common:${key}`)
          }
        })
      }
    }

    // Also look for direct i18n.t calls without namespace (assume common)
    const i18nMatches = content.match(/i18n\.t\(['"]([^'"]+)['"]/g)
    if (i18nMatches) {
      i18nMatches.forEach((match) => {
        const key = match.replace(/i18n\.t\(['"]/, '').replace(/['"]\)/, '')
        if (key.includes(':')) {
          usedKeys.add(key)
        } else {
          usedKeys.add(`common:${key}`)
        }
      })
    }
  }

  console.log(`🔎 Found ${usedKeys.size} keys used in source code`)

  // Process each translation file
  let totalRemoved = 0
  let totalFiles = 0

  for (const file of translationFiles) {
    const filePath = path.join(localesDir, file)
    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'))
    const [lang, namespaceFile] = file.split('/')
    const namespace = namespaceFile.replace('.json', '')

    let removedFromFile = 0

    // Function to recursively remove unused keys
    const removeUnused = (obj, prefix = '') => {
      const keys = Object.keys(obj)
      for (const key of keys) {
        const fullKey = prefix ? `${prefix}.${key}` : key
        const namespacedKey = `${namespace}:${fullKey}`

        if (typeof obj[key] === 'object' && obj[key] !== null) {
          // Recurse into nested objects
          const nestedRemoved = removeUnused(obj[key], fullKey)
          if (nestedRemoved > 0 && Object.keys(obj[key]).length === 0) {
            delete obj[key]
            removedFromFile++
          }
        } else {
          // Check if this key is used
          if (!usedKeys.has(namespacedKey)) {
            delete obj[key]
            removedFromFile++
          }
        }
      }
      return removedFromFile
    }

    removeUnused(content)

    // Only write back if we actually removed something
    if (removedFromFile > 0) {
      fs.writeFileSync(filePath, JSON.stringify(content, null, 2) + '\n')
      totalRemoved += removedFromFile
      totalFiles++
      console.log(`📄 ${file}: removed ${removedFromFile} unused keys`)
    }
  }

  if (totalRemoved === 0) {
    console.log('\n✅ No unused translation keys found to remove!')
    // Remove backup since nothing was changed
    fs.rmSync(backupDir, { recursive: true, force: true })
  } else {
    console.log(
      `\n✅ Successfully removed ${totalRemoved} unused translation keys from ${totalFiles} files!`
    )
    console.log(`📦 Backup created at src/i18n/locales.backup`)
    console.log(`\n💡 To restore backup, run:`)
    console.log(`   cp -r src/i18n/locales.backup/* src/i18n/locales/`)
  }
}

removeUnusedTranslations().catch(console.error)
