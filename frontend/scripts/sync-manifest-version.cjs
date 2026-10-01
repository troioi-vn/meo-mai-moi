// Version icon URLs by image content, independently of the app release.
// Keep all published manifest paths updated for existing installations.
const { createHash } = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')

const repoRoot = path.resolve(__dirname, '../..')
const publicDir = path.join(repoRoot, 'frontend/public')
const manifests = ['site.webmanifest', 'site-light.webmanifest', 'site-dark.webmanifest']
const manifestDirs = [publicDir, path.join(repoRoot, 'backend/public')]
const iconSrc = /("src":\s*")\/((?:icon|maskable)-\d+\.png)(?:\?[^" ]*)?(")/g

for (const name of manifests) {
  const source = fs.readFileSync(path.join(publicDir, name), 'utf8')
  const stamped = source.replaceAll(iconSrc, (_, prefix, filename, suffix) => {
    const version = createHash('sha256')
      .update(fs.readFileSync(path.join(publicDir, filename)))
      .digest('hex')
      .slice(0, 12)
    return `${prefix}/${filename}?v=${version}${suffix}`
  })

  for (const dir of manifestDirs) {
    const file = path.join(dir, name)
    if (fs.readFileSync(file, 'utf8') !== stamped) {
      fs.writeFileSync(file, stamped)
      console.log(`Updated ${path.relative(repoRoot, file)}`)
    }
  }
}
