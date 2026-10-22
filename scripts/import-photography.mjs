// rebuilds src/assets/photography/ and src/data/photography.json from the Adobe Portfolio download
// in website-assets/portfolio/. run with `node scripts/import-photography.mjs`
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST = path.resolve(root, '../website-assets/portfolio/manifest.json');
const OUT_DIR = path.join(root, 'src/assets/photography');
const DATA_FILE = path.join(root, 'src/data/photography.json');
const LONG_EDGE = 2000;
const QUALITY = 80;
// the page background, used where a source PNG has transparent pixels
const BACKGROUND = '#050505';
// projects of the portfolio that stay off the site, by title
const HIDDEN = new Set(['Art in Science', 'Waterfalls']);

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

function videoId(url) {
  return url.match(/\/ccv\/([^/]+)\/embed/)?.[1] ?? url;
}

const raw = await fs.readFile(MANIFEST, 'utf8').catch(() => null);
if (raw === null) {
  console.error(`manifest not found at ${MANIFEST}`);
  process.exit(1);
}
const manifest = JSON.parse(raw);
const sourceDir = path.dirname(MANIFEST);
const kept = new Map();
const projects = [];

for (const project of [...manifest.projects].sort((a, b) => a.order - b.order)) {
  const { slug, title } = project;
  if (HIDDEN.has(title)) continue;
  const files = new Set(['cover.jpg']);
  kept.set(slug, files);
  let bytes = 0;
  let written = 0;

  const cover = await optimize(path.join(sourceDir, project.cover), path.join(OUT_DIR, slug, 'cover.jpg'));
  bytes += cover.bytes;
  written += cover.written;

  const images = [];
  for (const [i, image] of project.images.entries()) {
    const name = `${String(i + 1).padStart(3, '0')}.jpg`;
    files.add(name);
    const out = await optimize(path.join(sourceDir, image.file), path.join(OUT_DIR, slug, name));
    bytes += out.bytes;
    written += out.written;
    images.push({
      file: `${slug}/${name}`,
      width: out.width,
      height: out.height,
      // the source has no captions, hence a positional alt text
      alt: `${title}, photograph ${i + 1} of ${project.images.length}`,
    });
  }

  projects.push({
    order: project.order,
    slug,
    title,
    description: project.description,
    year: project.year,
    url: project.url,
    cover: `${slug}/cover.jpg`,
    images,
    videos: project.videos.map((url) => ({ id: videoId(url), url })),
  });
  const mb = (bytes / 1e6).toFixed(1);
  console.log(`${slug}: ${images.length} images and a cover, ${mb} MB, ${written} written`);
}

await prune(kept);
await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
await fs.writeFile(DATA_FILE, JSON.stringify({ projects }, null, 2) + '\n');
console.log(`wrote ${path.relative(root, DATA_FILE)} with ${projects.length} projects`);
