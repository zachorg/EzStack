// Simple ESM to CJS rewriter for index.js only
const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'dist');
const esm = path.join(distDir, 'index.js');
const cjs = path.join(distDir, 'index.cjs');

if (!fs.existsSync(esm)) process.exit(0);

let code = fs.readFileSync(esm, 'utf8');
// Minimal transform: export default -> module.exports =
code = code.replace(/export default /g, 'module.exports = ');
// Named exports: export { A, B } -> module.exports = { A, B }
code = code.replace(/export \{([\s\S]*?)\};?/g, (m, g1) => `module.exports = {${g1}}`);

fs.writeFileSync(cjs, code);
console.log('Wrote', cjs);


