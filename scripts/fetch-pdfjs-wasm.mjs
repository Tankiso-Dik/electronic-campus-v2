#!/usr/bin/env node
// Fetch pdf.js image decoder WASM files (and fallback JS) at build-time
// - Pins to the installed pdfjs-dist version
// - Writes files into /public so worker can request `${wasmUrl}openjpeg.wasm`
// - Exits non-zero on failure to prevent silent deploys without decoders

import { createWriteStream } from 'node:fs';
import { mkdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const log = (...args) => console.log('[pdfjs-wasm]', ...args);
const warn = (...args) => console.warn('[pdfjs-wasm]', ...args);
const error = (...args) => console.error('[pdfjs-wasm]', ...args);

async function fileExists(p) {
  try { await stat(p); return true; } catch { return false; }
}

async function downloadTo(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  await mkdir(path.dirname(dest), { recursive: true });
  // Stream to file to avoid buffering large binaries
  await new Promise((resolve, reject) => {
    const ws = createWriteStream(dest);
    res.body.pipe(ws);
    res.body.on('error', reject);
    ws.on('finish', resolve);
    ws.on('error', reject);
  });
}

async function main() {
  // Resolve installed version of pdfjs-dist
  const pdfjsPkgPath = path.join(process.cwd(), 'node_modules', 'pdfjs-dist', 'package.json');
  let version = process.env.PDFJS_DIST_VERSION;
  if (!version) {
    try {
      const pkg = JSON.parse(await (await fetch('file://' + pdfjsPkgPath)).text());
      version = pkg.version;
    } catch (e) {
      error('Failed to resolve pdfjs-dist version. Set PDFJS_DIST_VERSION env var.');
      process.exit(1);
    }
  }

  const base = `https://unpkg.com/pdfjs-dist@${version}/image_decoders/`;
  const targets = [
    { name: 'openjpeg.wasm', minBytes: 50_000 },
    { name: 'qcms_bg.wasm', minBytes: 50_000 },
    { name: 'openjpeg_nowasm_fallback.js', minBytes: 1_000 },
  ];

  const outDir = path.join(process.cwd(), 'public');
  const force = process.env.FORCE_FETCH_PDFJS_WASM === '1';
  let fetched = 0;

  for (const t of targets) {
    const dest = path.join(outDir, t.name);
    if (!force && await fileExists(dest)) {
      try {
        const s = await stat(dest);
        if (s.size >= t.minBytes) { log('exists', t.name, s.size + 'B'); continue; }
        warn('re-fetch (too small)', t.name, s.size + 'B');
      } catch {}
    }
    const url = base + t.name;
    log('fetch', url);
    await downloadTo(url, dest);
    const s2 = await stat(dest);
    if (s2.size < t.minBytes) {
      error('downloaded file too small:', t.name, s2.size + 'B');
      process.exit(1);
    }
    fetched++;
  }

  if (!fetched) log('all decoder assets present');
  // Touch a marker for debugging
  await writeFile(path.join(outDir, '.pdfjs_image_decoders_ready'), new Date().toISOString());
}

main().catch((e) => {
  error(e?.stack || e?.message || String(e));
  process.exit(1);
});

