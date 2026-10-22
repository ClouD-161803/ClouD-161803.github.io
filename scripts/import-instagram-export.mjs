// turns Instagram's own export ("Export your information" in Accounts Center, JSON format) into
// website-assets/instagram/manifest.json and one folder of images per post under posts/. run with
// `node scripts/import-instagram-export.mjs <export folder or zip>... [--originals <folder>]...
// [--out <folder>] [--dry-run]`, and pass every part of an export split into several zips. an image
// whose local edit is found under an --originals folder is replaced by a copy of that edit
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_OUT = path.resolve(root, '../website-assets/instagram');
const IMAGE = /\.(jpe?g|png|webp|heic|tiff?)$/i;
// the largest distance, out of the 128 bits of hashOf, between an Instagram image and a local edit
// taken as the same picture. on the twelve covers of the profile render against 825 local edits, the
// true edit lay at 0 to 7 and the nearest wrong one at 20 or more
export const MATCH_THRESHOLD = 12;

// Meta writes each UTF-8 byte of a string as its own \u00XX escape, hence a pin emoji arrives as four
// Latin-1 characters. a string that does not decode as UTF-8 this way is returned unchanged
export function decodeMeta(text) {
  if (typeof text !== 'string' || !/[\u0080-ÿ]/.test(text) || /[^\u0000-ÿ]/.test(text)) return text ?? '';
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(Buffer.from(text, 'latin1'));
  } catch {
    return text;
  }
}

async function walk(dir, out = []) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(full, out);
    else out.push(full);
  }
  return out;
}

// returns the posts of an export newest first, each as { timestamp, caption, media: [{ uri, file }] }
// in carousel order, with file null when the uri is not in any root. a carousel carries its caption
// and time on the post, a single image on its one media item. Meta has placed the posts file in
// your_instagram_activity/content/ and in your_instagram_activity/media/, hence every posts_<n>.json
// is read wherever it is
export async function readExport(roots) {
  const files = (await Promise.all(roots.map((r) => walk(r)))).flat();
  const postFiles = files.filter((f) => /^posts_\d+\.json$/.test(path.basename(f)));
  if (postFiles.length === 0) throw new Error(`no posts_<n>.json under ${roots.join(', ')}`);
  const posts = [];
  for (const file of postFiles) {
    const data = JSON.parse(await fs.readFile(file, 'utf8'));
    for (const post of Array.isArray(data) ? data : (data.ig_posts ?? [])) {
      const media = post.media ?? [];
      const timestamp = post.creation_timestamp ?? media[0]?.creation_timestamp;
      const caption = decodeMeta(post.title || media[0]?.title || '');
      const resolved = [];
      for (const item of media) resolved.push({ uri: item.uri, file: await resolveUri(roots, item.uri) });
      posts.push({ timestamp, caption, media: resolved });
    }
  }
  return posts.sort((a, b) => b.timestamp - a.timestamp);
}

// a uri is relative to the root of the export, and in a split export the file may sit in any part
async function resolveUri(roots, uri) {
  for (const r of roots) {
    const full = path.join(r, uri);
    if (await fs.stat(full).catch(() => null)) return full;
  }
  return null;
}

const pad = (n) => String(n).padStart(2, '0');

// the date in this machine's time zone, as the profile page shows it to a visitor here
export function localDate(timestamp) {
  const d = new Date(timestamp * 1000);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function folderName(timestamp) {
  const d = new Date(timestamp * 1000);
  return `${localDate(timestamp)}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

// a greyscale copy of at most 256 px, decoded once per file and cropped for each aspect ratio
const thumbs = new Map();
function thumb(file) {
  if (!thumbs.has(file)) {
    thumbs.set(
      file,
      sharp(file, { failOn: 'none' })
        .rotate()
        .resize(256, 256, { fit: 'inside' })
        .toColourspace('b-w')
        .raw()
        .toBuffer({ resolveWithObject: true })
        .then(({ data, info }) => ({ data, width: info.width, height: info.height, channels: info.channels })),
    );
  }
  return thumbs.get(file);
}

// returns the horizontal and the vertical difference hash of a crop of file to aspect (width over
// height), 128 bits in all. the crop is the largest at aspect shrunk by zoom, placed at the fractions
// fx and fy of the free width and height, i.e. centered by default as Instagram places it
// hashes are kept per file and crop, with the aspect rounded to two decimals, since Instagram uses a
// handful of aspect ratios and each edit is compared with every Instagram image
const hashes = new Map();
export function hashOf(file, aspect, zoom = 1, fx = 0.5, fy = 0.5) {
  const key = `${file}|${aspect?.toFixed(2)}|${zoom}|${fx}|${fy}`;
  if (!hashes.has(key)) hashes.set(key, cropHash(file, aspect, zoom, fx, fy));
  return hashes.get(key);
}

async function cropHash(file, aspect, zoom, fx, fy) {
  const t = await thumb(file);
  let width = t.width;
  let height = t.height;
  if (aspect && width / height > aspect) width = height * aspect;
  else if (aspect) height = width / aspect;
  width = Math.max(9, Math.round(width / zoom));
  height = Math.max(9, Math.round(height / zoom));
  const crop = sharp(t.data, { raw: { width: t.width, height: t.height, channels: t.channels } }).extract({
    left: Math.round((t.width - width) * fx),
    top: Math.round((t.height - height) * fy),
    width,
    height,
  });
  const grid = (w, h) => crop.clone().resize(w, h, { fit: 'fill' }).extractChannel(0).raw().toBuffer();
  const [wide, tall] = await Promise.all([grid(9, 8), grid(8, 9)]);
  let bits = 0n;
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) bits = (bits << 1n) | (wide[y * 9 + x] < wide[y * 9 + x + 1] ? 1n : 0n);
  }
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) bits = (bits << 1n) | (tall[y * 8 + x] < tall[(y + 1) * 8 + x] ? 1n : 0n);
  }
  return bits;
}

export function distance(a, b) {
  let n = 0;
  for (let x = a ^ b; x; x &= x - 1n) n++;
  return n;
}

// returns the local edit nearest to an Instagram image with its distance, or null when none lies
// within threshold. a tie between two edits of one frame goes to the newer file
export async function bestOriginal(file, originals, threshold = MATCH_THRESHOLD) {
  const t = await thumb(file);
  const target = await hashOf(file);
  let best = null;
  for (const original of originals) {
    // a file that sharp cannot decode is never a match
    const hash = await hashOf(original.file, t.width / t.height).catch(() => null);
    if (hash === null) continue;
    const d = distance(target, hash);
    if (!best || d < best.distance || (d === best.distance && original.mtimeMs > best.mtimeMs)) {
      best = { ...original, distance: d };
    }
  }
  return best && best.distance <= threshold ? best : null;
}

export async function listOriginals(folders) {
  const out = [];
  for (const folder of folders) {
    for (const file of await walk(folder)) {
      if (IMAGE.test(file)) out.push({ file, mtimeMs: (await fs.stat(file)).mtimeMs });
    }
  }
  return out;
}

// a slide that the poster panned or zoomed inside Instagram fails the centered match. it is searched
// for over these crops, among the SPAN files on either side, in name order, of the edits matched for
// the same post, since a carousel is mostly shot in sequence. a slide with 20 neighbours takes 3 to 4 s
const SPAN = 10;
const PLACES = [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1];
const COARSE = [0, 0.25, 0.5, 0.75, 1];
const CROPS = [
  ...PLACES.flatMap((fx) => PLACES.map((fy) => [1, fx, fy])),
  ...[1.15, 1.3].flatMap((zoom) => COARSE.flatMap((fx) => COARSE.map((fy) => [zoom, fx, fy]))),
];

export function neighbours(originals, matched) {
  const byFolder = Object.groupBy(originals, (o) => path.dirname(o.file));
  const near = new Set();
  for (const file of matched) {
    const run = (byFolder[path.dirname(file)] ?? []).toSorted((a, b) => a.file.localeCompare(b.file));
    const at = run.findIndex((o) => o.file === file);
    for (const o of run.slice(Math.max(0, at - SPAN), at + SPAN + 1)) if (!matched.includes(o.file)) near.add(o);
  }
  return [...near];
}

export async function searchOriginal(file, candidates, threshold = MATCH_THRESHOLD) {
  const t = await thumb(file);
  const target = await hashOf(file);
  let best = null;
  for (const candidate of candidates) {
    for (const [zoom, fx, fy] of CROPS) {
      const hash = await hashOf(candidate.file, t.width / t.height, zoom, fx, fy).catch(() => null);
      if (hash === null) break;
      const d = distance(target, hash);
      if (!best || d < best.distance) best = { ...candidate, distance: d };
    }
  }
  return best && best.distance <= threshold ? best : null;
}

// the export does not carry shortcodes. they are taken from the entries already in the manifest and
// from the profile render in profile-scrape/posts.json, for the same caption within a day
async function knownPosts(out) {
  const manifest = JSON.parse(await fs.readFile(path.join(out, 'manifest.json'), 'utf8').catch(() => '{}'));
  const known = (manifest.posts ?? []).filter((p) => p.shortcode && p.date);
  const scrape = JSON.parse(await fs.readFile(path.join(out, 'profile-scrape/posts.json'), 'utf8').catch(() => '[]'));
  for (const p of scrape) {
    const parsed = Date.parse(p.date_text?.match(/on (.+)\.$/)?.[1] ?? '');
    if (p.code && !Number.isNaN(parsed)) known.push({ shortcode: p.code, caption: p.caption, date: localDate(parsed / 1000) });
  }
  const shortcode = (caption, date) =>
    known.find((k) => k.caption === caption && Math.abs(Date.parse(k.date) - Date.parse(date)) <= 864e5)?.shortcode ?? null;
  return { manifest, shortcode };
}

// a zip is unpacked by ditto into export/<zip name>/ beside the manifest, once, and also in a dry run
async function unpack(input, out) {
  if (!input.endsWith('.zip')) return input;
  const dest = path.join(out, 'export', path.basename(input, '.zip'));
  await fs.mkdir(dest, { recursive: true });
  if ((await fs.readdir(dest)).length === 0) execFileSync('ditto', ['-x', '-k', input, dest]);
  return dest;
}

export async function run({ inputs, originals: originalFolders = [], out = DEFAULT_OUT, dryRun = false, log = console.log }) {
  const roots = await Promise.all(inputs.map((input) => unpack(path.resolve(input), out)));
  const posts = await readExport(roots);
  const originals = await listOriginals(originalFolders);
  const { manifest, shortcode } = await knownPosts(out);
  const entries = [];
  let local = 0;
  let total = 0;
  let skipped = 0;
  for (const post of posts) {
    const date = localDate(post.timestamp);
    const folder = path.join('posts', folderName(post.timestamp));
    const images = post.media.filter((item) => {
      if (item.file && IMAGE.test(item.file)) return true;
      log(`warning: ${folder}: skipped ${item.uri}, ${item.file ? 'not an image' : 'not in the export'}`);
      skipped++;
      return false;
    });
    const matches = [];
    for (const item of images) matches.push(originals.length ? await bestOriginal(item.file, originals) : null);
    const matched = matches.filter(Boolean).map((m) => m.file);
    if (matched.length) {
      const near = neighbours(originals, matched);
      for (const [i, item] of images.entries()) matches[i] ??= await searchOriginal(item.file, near);
    }
    const files = [];
    const sources = [];
    for (const [i, item] of images.entries()) {
      const match = matches[i];
      const source = match?.file ?? item.file;
      const name = `${pad(i + 1)}${path.extname(source).toLowerCase()}`;
      files.push(path.join(folder, name));
      sources.push(match ? { original: match.file, distance: match.distance } : { export: item.uri });
      if (!dryRun) {
        if (i === 0) await fs.rm(path.join(out, folder), { recursive: true, force: true });
        await fs.mkdir(path.join(out, folder), { recursive: true });
        await fs.copyFile(source, path.join(out, folder, name));
      }
      local += Boolean(match);
      total++;
    }
    if (files.length === 0) continue;
    entries.push({
      shortcode: shortcode(post.caption, date),
      date,
      caption: post.caption,
      source: sources.some((s) => s.original) ? 'instagram-export+local' : 'instagram-export',
      files,
      sources,
    });
  }
  log(`${entries.length} posts, ${total} images, ${local} from local edits, ${skipped} skipped`);
  if (!dryRun) {
    const file = path.join(out, 'manifest.json');
    const backup = path.join(out, 'manifest.before-export.json');
    if (manifest.posts && !(await fs.stat(backup).catch(() => null))) await fs.copyFile(file, backup);
    const { posts: _, ...rest } = manifest;
    await fs.writeFile(file, JSON.stringify({ ...rest, posts: entries }, null, 2) + '\n');
    log(`wrote ${file}`);
  }
  return entries;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const opts = { inputs: [], originals: [], dryRun: false };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--originals') opts.originals.push(path.resolve(args[++i]));
    else if (args[i] === '--out') opts.out = path.resolve(args[++i]);
    else if (args[i] === '--dry-run') opts.dryRun = true;
    else opts.inputs.push(args[i]);
  }
  if (opts.inputs.length === 0) {
    console.error('usage: node scripts/import-instagram-export.mjs <export folder or zip>... [--originals <folder>]... [--out <folder>] [--dry-run]');
    process.exit(1);
  }
  await run(opts);
}
