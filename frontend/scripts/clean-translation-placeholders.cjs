#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const { glob } = require('glob')

/**
 * Clean up __STRING_NOT_TRANSLATED__ placeholders from translation files.
 * This script is more conservative than the general cleanup script.
 */
async function cleanPlaceholders() {
  console.log('🧹 Cleaning translation placeholders...\n')

  const localesDir = path.join(__dirname, '../src/i18n/locales')
  const translationFiles = await glob('**/*.json', { cwd: localesDir })

  let totalPlaceholders = 0
  let totalCleaned = 0

  for (const file of translationFiles) {
    const filePath = path.join(localesDir, file)
    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'))
    
    let placeholderCount = 0
    let cleanedCount = 0
    
    const cleanObject = (obj) => {
      const cleaned = {}
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'object' && value !== null) {
          const cleanedNested = cleanObject(value)
          if (Object.keys(cleanedNested).length > 0) {
            cleaned[key] = cleanedNested
          }
        } else if (typeof value === 'string') {
          if (value === '__STRING_NOT_TRANSLATED__') {
            placeholderCount++
            // Skip this key - don't include it in cleaned object
          } else {
            cleaned[key] = value
          }
        } else {
          cleaned[key] = value
        }
      }
      return cleaned
    }

    const cleanedContent = cleanObject(content)
    cleanedCount = placeholderCount

    if (placeholderCount > 0) {
      console.log(`📄 ${file}: Found ${placeholderCount} placeholders`)
      
      // Write the cleaned content back
      fs.writeFileSync(filePath, JSON.stringify(cleanedContent, null, 2) + '\n', 'utf8')
      
      totalPlaceholders += placeholderCount
      totalCleaned += cleanedCount
    }
  }

  if (totalPlaceholders === 0) {
    console.log('✅ No placeholders found!')
  } else {
    console.log(`\n🎉 Cleaned ${totalCleaned} placeholders from ${translationFiles.length} files`)
    console.log('\n💡 Remember to:')
    console.log('   1. Review the changes with git diff')
    console.log('   2. Test your application')
    console.log('   3. Add proper translations for any missing keys')
  }
}

cleanPlaceholders().catch(console.error)