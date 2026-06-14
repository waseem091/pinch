const { execSync } = require('child_process');
const fs   = require('fs');
const path = require('path');

const ROOT         = path.resolve(__dirname, '..');
const BOUNTIES_APP = path.join(ROOT, 'frontend/bounties-app');
const PUBLIC       = path.join(ROOT, 'public');

console.log('[build] Installing bounties-app deps…');
execSync('npm install', { cwd: BOUNTIES_APP, stdio: 'inherit' });

console.log('[build] Building React app…');
execSync('npm run build', { cwd: BOUNTIES_APP, stdio: 'inherit' });

console.log('[build] Assembling public/…');
fs.mkdirSync(path.join(PUBLIC, 'bounties'), { recursive: true });
fs.copyFileSync(
  path.join(ROOT, 'frontend/index.html'),
  path.join(PUBLIC, 'index.html')
);
copyDir(path.join(ROOT, 'frontend/assets'), path.join(PUBLIC, 'assets'));
copyDir(path.join(BOUNTIES_APP, 'dist'), path.join(PUBLIC, 'bounties'));
console.log('[build] Done → public/');

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    entry.isDirectory() ? copyDir(s, d) : fs.copyFileSync(s, d);
  }
}
