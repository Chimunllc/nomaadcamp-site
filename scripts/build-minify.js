// Minifies main.js and style.css in-place (overwrites originals).
// Netlify runs this during build so the deployed files are always minified.
// Run locally: node scripts/build-minify.js
const { minify } = require('terser');
const CleanCSS   = require('clean-css');
const fs         = require('fs');
const path       = require('path');

const ROOT = path.join(__dirname, '..');

(async () => {
  // JS
  const jsSrc  = path.join(ROOT, 'main.js');
  const jsCode = fs.readFileSync(jsSrc, 'utf8');
  const jsResult = await minify(jsCode, { compress: true, mangle: true });
  fs.writeFileSync(jsSrc, jsResult.code);
  const jsSaved = ((jsCode.length - jsResult.code.length) / jsCode.length * 100).toFixed(1);
  console.log(`JS  : ${jsCode.length} → ${jsResult.code.length} bytes (${jsSaved}% smaller)`);

  // CSS
  const cssSrc  = path.join(ROOT, 'style.css');
  const cssCode = fs.readFileSync(cssSrc, 'utf8');
  const cssResult = new CleanCSS({ level: 2 }).minify(cssCode);
  fs.writeFileSync(cssSrc, cssResult.styles);
  const cssSaved = ((cssCode.length - cssResult.styles.length) / cssCode.length * 100).toFixed(1);
  console.log(`CSS : ${cssCode.length} → ${cssResult.styles.length} bytes (${cssSaved}% smaller)`);

  console.log('Done.');
})();
