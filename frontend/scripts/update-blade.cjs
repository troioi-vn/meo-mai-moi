// scripts/update-blade.cjs
// Reads the Vite manifest and updates the Blade template with the new asset filenames.

const fs = require('fs-extra');
const path = require('path');

// Corrected paths by resolving from the script's directory up to the project root.
const manifestPath = path.resolve(__dirname, '../dist/.vite/manifest.json');
const bladeTemplatePath = path.resolve(__dirname, '../../backend/resources/views/welcome.blade.php');

try {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  
  const entryChunk = Object.values(manifest).find(chunk => chunk.isEntry === true);

  if (!entryChunk) {
    throw new Error('Could not find the entry chunk in manifest.json.');
  }

  const jsFile = entryChunk.file;
  const cssFile = entryChunk.css ? entryChunk.css[0] : null;

  if (!jsFile) {
    throw new Error('Manifest entry is missing JS file path.');
  }

  let templateContent = fs.readFileSync(bladeTemplatePath, 'utf-8');

  templateContent = templateContent.replace(
    /<script type="module" src="{{ asset\('build\/[^']+'\) }}">/,
    `<script type="module" src="{{ asset('build/${jsFile}') }}">`
  );

  if (cssFile) {
    templateContent = templateContent.replace(
      /<link rel="stylesheet" href="{{ asset\('build\/[^']+'\) }}">/,
      `<link rel="stylesheet" href="{{ asset('build/${cssFile}') }}">`
    );
  } else {
    templateContent = templateContent.replace(/<link rel="stylesheet" href="{{ asset\('build\/[^']+'\) }}">/, '');
  }

  fs.writeFileSync(bladeTemplatePath, templateContent);
  console.log(`✅ Successfully updated Blade template: ${bladeTemplatePath}`);

} catch (error) {
  console.error('❌ Error updating Blade template:', error);
  process.exit(1);
}
