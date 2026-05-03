// Converts all JPG/PNG images to WebP using sharp.
// Run: node scripts/build-webp.js
const sharp = require('sharp');
const fs    = require('fs');
const path  = require('path');

const IMAGES_DIR = path.join(__dirname, '..', 'images');
const EXTS = ['.jpg', '.jpeg', '.png'];

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (EXTS.includes(path.extname(entry.name).toLowerCase())) out.push(full);
  }
  return out;
}

(async () => {
  const files = walk(IMAGES_DIR);
  let converted = 0;
  for (const src of files) {
    const dest = src.replace(/\.(jpg|jpeg|png)$/i, '.webp');
    if (fs.existsSync(dest)) continue;
    try {
      await sharp(src).webp({ quality: 82 }).toFile(dest);
      converted++;
      console.log('  WebP:', path.relative(IMAGES_DIR, dest));
    } catch (e) {
      console.error('  SKIP', src, e.message);
    }
  }
  console.log(`Done: ${converted} files converted.`);
})();
