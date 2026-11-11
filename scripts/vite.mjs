#!/usr/bin/env node
// vite.mjs, v1, 2026-11-11. Author: Tomaž Berčič.
//
// Runs Vite for this project while keeping node_modules OUT of Google Drive.
// npm install fails on the Drive virtual disk (EPERM / EBADF) and would sync
// thousands of files, so dependencies live in a toolchain folder on the local disk:
//   default: ~/.nmvpp-web-toolchain   (override with env NMVPP_TOOLCHAIN)
// If a normal ./node_modules exists (e.g. in GitHub Actions), it is used instead.
//
// Usage: node scripts/vite.mjs [dev|build|preview]

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cmd = process.argv[2] || 'dev';
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const DEPS = Object.keys({ ...pkg.dependencies });

let TC; // folder that contains node_modules
let OUT;
if (fs.existsSync(path.join(ROOT, 'node_modules', 'vite'))) {
  TC = ROOT;
  OUT = path.join(ROOT, 'dist');
} else {
  TC = process.env.NMVPP_TOOLCHAIN || path.join(os.homedir(), '.nmvpp-web-toolchain');
  OUT = path.join(TC, 'dist');
  const want = JSON.stringify({ dependencies: pkg.dependencies, devDependencies: pkg.devDependencies });
  const stamp = path.join(TC, '.deps.json');
  const fresh = fs.existsSync(path.join(TC, 'node_modules', 'vite')) && fs.existsSync(stamp) && fs.readFileSync(stamp, 'utf8') === want;
  if (!fresh) {
    fs.mkdirSync(TC, { recursive: true });
    fs.writeFileSync(path.join(TC, 'package.json'), JSON.stringify({
      name: 'nmvpp-web-toolchain', private: true, type: 'module',
      dependencies: pkg.dependencies, devDependencies: pkg.devDependencies,
    }, null, 2));
    console.log(`[nmvpp] installing dependencies in ${TC}`);
    const r = spawnSync('npm', ['install', '--no-audit', '--no-fund'], { cwd: TC, stdio: 'inherit', shell: true });
    if (r.status !== 0) process.exit(r.status || 1);
    fs.writeFileSync(stamp, want);
  }
}
const NM = path.join(TC, 'node_modules');
if (cmd === 'install') { console.log(`[nmvpp] dependencies ready in ${NM}`); process.exit(0); }
const vite = await import(pathToFileURL(path.join(NM, 'vite', 'dist', 'node', 'index.js')).href);

// Resolve bare imports of our dependencies as if they were imported from inside the toolchain.
const depRe = new RegExp(`^(${DEPS.map((d) => d.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')).join('|')})(/|$)`);
const toolchainResolve = {
  name: 'nmvpp-toolchain-resolve',
  enforce: 'pre',
  async resolveId(source, importer, options) {
    if (TC === ROOT || !depRe.test(source)) return null;
    // the importer must exist on disk, otherwise Vite falls back to the project root
    return this.resolve(source, path.join(TC, 'package.json'), { ...options, skipSelf: true });
  },
};

const pages = {
  main: path.join(ROOT, 'index.html'),
  explore: path.join(ROOT, 'explore', 'index.html'),
  student: path.join(ROOT, 'student', 'index.html'),
  compare: path.join(ROOT, 'compare', 'index.html'),
};

const config = {
  configFile: false,
  root: ROOT,
  base: './',
  publicDir: path.join(ROOT, 'public'),
  cacheDir: path.join(NM, '.vite-nmvpp'),
  plugins: [toolchainResolve],
  optimizeDeps: { noDiscovery: true, include: [] },
  // Google Drive sometimes refuses lstat on files that were just removed: keep docs out of the watcher
  server: { port: 5173, strictPort: false, fs: { allow: [ROOT, NM] }, watch: { ignored: ['**/docs/**', '**/*.md'] } },
  preview: { port: 4173 },
  build: { outDir: OUT, emptyOutDir: true, target: 'es2020', rollupOptions: { input: pages } },
};

if (cmd === 'build') {
  await vite.build(config);
  console.log(`[nmvpp] build written to ${OUT}`);
} else if (cmd === 'preview') {
  const server = await vite.preview(config);
  server.printUrls();
} else {
  const server = await vite.createServer(config);
  server.watcher.on('error', (e) => console.warn('[nmvpp] watcher:', e.message));
  await server.listen();
  server.printUrls();
}
