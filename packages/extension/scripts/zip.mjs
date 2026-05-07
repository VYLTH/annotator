/**
 * Pack the dist/ folder into a sideload-ready zip.
 * No deps — uses the `zip` binary if present (macOS / Linux); falls back to
 * a tiny pure-Node implementation otherwise.
 */
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateRawSync } from 'node:zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const distDir = resolve(root, 'dist');
const releasesDir = resolve(root, 'releases');

if (!existsSync(distDir)) {
  console.error(`build first — ${distDir} does not exist`);
  process.exit(1);
}
mkdirSync(releasesDir, { recursive: true });

const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const version = pkg.version;
const outZip = resolve(releasesDir, `annotator-extension-${version}.zip`);

try {
  execSync(`zip -r "${outZip}" .`, { cwd: distDir, stdio: 'ignore' });
  console.log(`packed → ${relative(root, outZip)}`);
  process.exit(0);
} catch {
  // fall through to pure-Node
}

console.log('zip binary missing — using pure-Node fallback');

function* walk(dir, base = dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) yield* walk(full, base);
    else yield { full, rel: relative(base, full).replaceAll('\\', '/'), data: readFileSync(full) };
  }
}

// minimal ZIP (DEFLATE, no extras)
const records = [];
const local = [];
let offset = 0;

for (const f of walk(distDir)) {
  const compressed = deflateRawSync(f.data);
  const crc = crc32(f.data);
  const nameBuf = Buffer.from(f.rel, 'utf8');

  const localHeader = Buffer.alloc(30);
  localHeader.writeUInt32LE(0x04034b50, 0);
  localHeader.writeUInt16LE(20, 4);
  localHeader.writeUInt16LE(0, 6);
  localHeader.writeUInt16LE(8, 8);                 // method: deflate
  localHeader.writeUInt16LE(0, 10);                // mod time
  localHeader.writeUInt16LE(0x4DA5, 12);           // mod date (some valid value)
  localHeader.writeUInt32LE(crc, 14);
  localHeader.writeUInt32LE(compressed.length, 18);
  localHeader.writeUInt32LE(f.data.length, 22);
  localHeader.writeUInt16LE(nameBuf.length, 26);
  localHeader.writeUInt16LE(0, 28);

  local.push(localHeader, nameBuf, compressed);
  records.push({
    rel: f.rel, nameBuf, crc,
    compressedSize: compressed.length, uncompressedSize: f.data.length,
    offset,
  });
  offset += localHeader.length + nameBuf.length + compressed.length;
}

const central = [];
let centralSize = 0;
for (const r of records) {
  const h = Buffer.alloc(46);
  h.writeUInt32LE(0x02014b50, 0);
  h.writeUInt16LE(20, 4); h.writeUInt16LE(20, 6);
  h.writeUInt16LE(0, 8); h.writeUInt16LE(8, 10);
  h.writeUInt16LE(0, 12); h.writeUInt16LE(0x4DA5, 14);
  h.writeUInt32LE(r.crc, 16);
  h.writeUInt32LE(r.compressedSize, 20);
  h.writeUInt32LE(r.uncompressedSize, 24);
  h.writeUInt16LE(r.nameBuf.length, 28);
  h.writeUInt16LE(0, 30); h.writeUInt16LE(0, 32);
  h.writeUInt16LE(0, 34); h.writeUInt16LE(0, 36);
  h.writeUInt32LE(0, 38); h.writeUInt32LE(r.offset, 42);
  central.push(h, r.nameBuf);
  centralSize += h.length + r.nameBuf.length;
}

const eocd = Buffer.alloc(22);
eocd.writeUInt32LE(0x06054b50, 0);
eocd.writeUInt16LE(0, 4); eocd.writeUInt16LE(0, 6);
eocd.writeUInt16LE(records.length, 8);
eocd.writeUInt16LE(records.length, 10);
eocd.writeUInt32LE(centralSize, 12);
eocd.writeUInt32LE(offset, 16);
eocd.writeUInt16LE(0, 20);

writeFileSync(outZip, Buffer.concat([...local, ...central, eocd]));
console.log(`packed → ${relative(root, outZip)}`);

function crc32(buf) {
  let c, table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  let crc = 0xFFFFFFFF;
  for (const b of buf) crc = (crc >>> 8) ^ table[(crc ^ b) & 0xFF];
  return (crc ^ 0xFFFFFFFF) >>> 0;
}
