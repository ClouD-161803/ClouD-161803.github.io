// rebuilds src/assets/art/ and src/data/art.json from the Instagram export in
// website-assets/instagram/. run with `node scripts/import-art.mjs [manifest path]`, where the path is
// relative to the working directory
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { fixCaption, parseCaption } from './art-caption.mjs';

const ACCOUNT = '__cldrt__';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const explicitManifest = process.argv[2];
const MANIFEST = explicitManifest
  ? path.resolve(explicitManifest)
  : path.resolve(root, '../website-assets/instagram/manifest.json');
const OUT_DIR = path.join(root, 'src/assets/art');
const DATA_FILE = path.join(root, 'src/data/art.json');
const MUSEUMS_FILE = path.join(root, 'src/data/museums.json');
const FLAGS_FILE = path.join(root, 'src/data/flags.json');
const FIXES_FILE = path.join(root, 'src/data/caption-fixes.json');
const LONG_EDGE = 2000;
const QUALITY = 80;
// the page background, used where a source PNG has transparent pixels
const BACKGROUND = '#050505';

const FIELDS = ['title', 'artist', 'year', 'museum', 'city', 'country'];

// writes a JPEG copy of src at dest unless dest is already newer, and returns its pixel size
async function optimize(src, dest) {
  const srcStat = await fs.stat(src);
  const destStat = await fs.stat(dest).catch(() => null);
  if (destStat && destStat.mtimeMs > srcStat.mtimeMs) {
    const { width, height } = await sharp(dest).metadata();
    return { width, height, bytes: destStat.size, written: false };
  }
  await fs.mkdir(path.dirname(dest), { recursive: true });
  const info = await sharp(src)
    // bakes the EXIF orientation into the pixels, since the metadata is stripped below
    .rotate()
    .resize({ width: LONG_EDGE, height: LONG_EDGE, fit: 'inside', withoutEnlargement: true })
    .flatten({ background: BACKGROUND })
    .withIccProfile('srgb', { attach: false })
    .jpeg({ quality: QUALITY, mozjpeg: true, progressive: true })
    .toFile(dest);
  return { width: info.width, height: info.height, bytes: info.size, written: true };
}

// removes files and folders under OUT_DIR that this run did not produce
async function prune(kept) {
  const entries = await fs.readdir(OUT_DIR, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    const dir = path.join(OUT_DIR, entry.name);
    if (!entry.isDirectory() || !kept.has(entry.name)) {
      await fs.rm(dir, { recursive: true, force: true });
      continue;
    }
    for (const file of await fs.readdir(dir)) {
      if (!kept.get(entry.name).has(file)) await fs.rm(path.join(dir, file));
    }
  }
}

async function writeData(posts) {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify({ account: ACCOUNT, posts }, null, 2) + '\n');
  console.log(`wrote ${path.relative(root, DATA_FILE)} with ${posts.length} posts`);
}

const raw = await fs.readFile(MANIFEST, 'utf8').catch(() => null);
if (raw === null) {
  if (explicitManifest) {
    console.error(`error: manifest not found at ${MANIFEST}`);
    process.exit(1);
  }
  // a clean clone has no manifest, and the assets already in place are left alone
  console.warn(`warning: manifest not found at ${MANIFEST}, the art page will be empty`);
  await writeData([]);
  process.exit(0);
}

const manifest = JSON.parse(raw);
const museums = JSON.parse(await fs.readFile(MUSEUMS_FILE, 'utf8'));
const flags = JSON.parse(await fs.readFile(FLAGS_FILE, 'utf8'));
const fixes = JSON.parse(await fs.readFile(FIXES_FILE, 'utf8'));
const sourceDir = path.dirname(MANIFEST);
const kept = new Map();
const posts = [];
const used = new Set();

// a lowercase ascii slug of the title, made unique with a counter, or the shortcode when the
// caption has no title
function slugOf(title, fallback) {
  const base =
    title
      ?.normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || fallback;
  let slug = base;
  for (let n = 2; used.has(slug); n++) slug = `${base}-${n}`;
  used.add(slug);
  return slug;
}

for (const [n, post] of (manifest.posts ?? []).entries()) {
  const caption = fixCaption(post.caption, fixes);

  // a field written in the manifest wins over the parsed one. a caption outside the form leaves
  // every field null, and the page then shows the caption verbatim
  const parsed = parseCaption(caption);
  const fields = Object.fromEntries(FIELDS.map((f) => [f, post[f] ?? parsed?.[f] ?? null]));
  const exhibition = post.exhibition ?? parsed?.exhibition ?? null;
  const key = slugOf(fields.title, post.shortcode ?? `local-${n + 1}`);
  if (FIELDS.some((f) => !fields[f])) {
    console.warn(`warning: ${key}: caption does not fit the title, artist and year, pin form`);
  }
  // a name shared by two museums, such as National Museum in Oslo and in Stockholm, is keyed with its city
  const museum = fields.museum ? (museums[`${fields.museum}, ${fields.city}`] ?? museums[fields.museum]) : null;
  if (fields.museum && !museum) console.warn(`warning: ${key}: no entry for "${fields.museum}" in museums.json`);
  const flag = fields.country ? (flags[fields.country] ?? null) : null;
  if (fields.country && !flag) console.warn(`warning: ${key}: no flag for "${fields.country}" in flags.json`);

  const files = new Set();
  kept.set(key, files);
  let bytes = 0;
  let written = 0;
  const images = [];
  for (const [i, file] of post.files.entries()) {
    const name = `${String(i + 1).padStart(3, '0')}.jpg`;
    files.add(name);
    const out = await optimize(path.join(sourceDir, file), path.join(OUT_DIR, key, name));
    bytes += out.bytes;
    written += out.written;
    const photograph = `photograph ${i + 1} of ${post.files.length}`;
    images.push({
      file: `${key}/${name}`,
      width: out.width,
      height: out.height,
      alt: fields.title
        ? `${fields.title}, ${fields.artist}, ${fields.year}, ${photograph}`
        : caption || `Photograph ${i + 1} of ${post.files.length}`,
    });
  }
  posts.push({
    key,
    shortcode: post.shortcode ?? null,
    date: post.date ?? null,
    caption,
    title: fields.title,
    artist: fields.artist,
    year: fields.year,
    museum: fields.museum,
    exhibition,
    museum_url: museum?.url ?? null,
    maps_url: museum?.maps ?? null,
    city: fields.city,
    country: fields.country,
    flag,
    images,
    note: post.note ?? null,
  });
  console.log(`${key}: ${images.length} images, ${(bytes / 1e6).toFixed(1)} MB, ${written} written`);
}

await prune(kept);
await writeData(posts);
