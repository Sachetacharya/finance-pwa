// Run: node generate-icons.js
// Requires: npm install sharp (or use this script)
// This generates PNG icons from the SVG

const fs = require('fs');
const { execSync } = require('child_process');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const svgPath = 'public/icon.svg';
const svg = fs.readFileSync(svgPath, 'utf-8');

try {
  const sharp = require('sharp');

  async function generate() {
    for (const size of sizes) {
      await sharp(Buffer.from(svg))
        .resize(size, size)
        .png()
        .toFile(`public/icons/icon-${size}x${size}.png`);
      console.log(`Generated icon-${size}x${size}.png`);
    }
    // Also generate apple touch icon
    await sharp(Buffer.from(svg))
      .resize(180, 180)
      .png()
      .toFile('public/icons/apple-touch-icon.png');
    console.log('Generated apple-touch-icon.png');
  }

  generate().then(() => console.log('Done!'));
} catch (e) {
  console.log('sharp not installed. Install with: npm install sharp');
  console.log('Or open icon.svg in a browser and manually export PNGs');
}
