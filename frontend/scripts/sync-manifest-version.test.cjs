const assert = require('node:assert/strict')
const { execFileSync } = require('node:child_process')
const { createHash } = require('node:crypto')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { test } = require('node:test')

test('icon URLs change with artwork and stay stable across releases', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pwa-manifest-'))
  try {
    for (const dir of ['frontend/scripts', 'frontend/public', 'backend/public', 'backend/config']) {
      fs.mkdirSync(path.join(root, dir), { recursive: true })
    }
    const script = path.join(root, 'frontend/scripts/sync-manifest-version.cjs')
    fs.copyFileSync(path.join(__dirname, 'sync-manifest-version.cjs'), script)
    const publicDir = path.join(root, 'frontend/public')
    const iconFile = path.join(publicDir, 'icon-192.png')
    fs.writeFileSync(iconFile, 'original artwork')
    const manifest = {
      id: '/',
      start_url: '/build/index.html',
      icons: [{ src: '/icon-192.png?v=old', sizes: '192x192' }],
      shortcuts: [{ url: '/', icons: [{ src: '/icon-192.png?v=old' }] }],
      screenshots: [{ src: '/screenshots/pets.png' }],
    }
    const names = ['site.webmanifest', 'site-light.webmanifest', 'site-dark.webmanifest']
    for (const name of names) {
      for (const dir of ['frontend/public', 'backend/public']) {
        fs.writeFileSync(path.join(root, dir, name), JSON.stringify(manifest, null, 2))
      }
    }
    const runManifestSync = () => execFileSync(process.execPath, [script])
    runManifestSync()
    const original = fs.readFileSync(path.join(publicDir, names[0]), 'utf8')
    const expected = `/icon-192.png?v=${createHash('sha256').update('original artwork').digest('hex').slice(0, 12)}`
    const stamped = JSON.parse(original)
    assert.equal(stamped.icons[0].src, expected)
    assert.equal(stamped.shortcuts[0].icons[0].src, expected)
    assert.deepEqual(stamped.screenshots, manifest.screenshots)
    assert.equal(stamped.id, manifest.id)
    assert.equal(stamped.start_url, manifest.start_url)
    fs.writeFileSync(path.join(root, 'backend/config/version.php'), 'a different release')
    runManifestSync()
    assert.equal(fs.readFileSync(path.join(publicDir, names[0]), 'utf8'), original)
    fs.writeFileSync(iconFile, 'replacement artwork')
    runManifestSync()
    const updated = fs.readFileSync(path.join(publicDir, names[0]), 'utf8')
    assert.notEqual(updated, original)
    for (const name of names) {
      assert.equal(fs.readFileSync(path.join(root, 'backend/public', name), 'utf8'), updated)
    }
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})
