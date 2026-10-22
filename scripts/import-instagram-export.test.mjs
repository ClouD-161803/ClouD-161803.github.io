// run with `node --test scripts/`. builds a synthetic export in the shape of posts_1.json, with
// strings escaped byte by byte as Meta writes them, and checks the manifest and the copied files
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { decodeMeta, run } from './import-instagram-export.mjs';

// the inverse of decodeMeta, i.e. one \u00XX character per UTF-8 byte
const encodeMeta = (text) => Buffer.from(text, 'utf8').toString('latin1');

// a smooth random picture of the given size, the same for the same seed
async function picture(file, seed, width, height) {
  let s = seed;
  const grid = Buffer.alloc(8 * 12 * 3).map(() => ((s = (s * 1103515245 + 12345) % 2 ** 31) >> 16) & 255);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await sharp(grid, { raw: { width: 8, height: 12, channels: 3 } })
    .resize(width, height, { fit: 'fill', kernel: 'cubic' })
    .jpeg({ quality: 90 })
    .toFile(file);
}

const MEDUSA = '"Medusa"\n\nCecilia Vicuña, 1972\n\n📍 Irish Museum of Modern Art, Dublin, Ireland';
const PLAIN = 'Untitled study ñ';
// noon in this machine's time zone, so that the date does not depend on the zone
const NEWER = new Date(2026, 5, 15, 12).getTime() / 1000;
const OLDER = new Date(2026, 5, 13, 12).getTime() / 1000;

test('decodeMeta repairs byte-escaped UTF-8 and leaves other text alone', () => {
  assert.equal(decodeMeta(encodeMeta(MEDUSA)), MEDUSA);
  assert.equal(decodeMeta('Cecilia Vicuña'), 'Cecilia Vicuña');
  assert.equal(decodeMeta('plain'), 'plain');
  assert.equal(decodeMeta(undefined), '');
});

test('run writes newest-first entries with local edits in place of matched export images', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ig-export-'));
  const exportRoot = path.join(dir, 'instagram-cldrt-2026-10-22');
  const out = path.join(dir, 'assets');
  const originals = path.join(dir, 'Edited');

  // a 2:3 local edit, which Instagram center-cropped to 4:5 and scaled to 1080 px wide
  await picture(path.join(originals, 'Art', 'CLD03190.jpg'), 1, 1365, 2048);
  await sharp(path.join(originals, 'Art', 'CLD03190.jpg'))
    .extract({ left: 0, top: Math.round((2048 - 1706) / 2), width: 1365, height: 1706 })
    .resize(1080, 1350)
    .toFile(path.join(dir, 'cover.jpg'));
  await fs.mkdir(path.join(exportRoot, 'media/posts/202606'), { recursive: true });
  await fs.rename(path.join(dir, 'cover.jpg'), path.join(exportRoot, 'media/posts/202606/111_a_n.jpg'));
  await picture(path.join(exportRoot, 'media/posts/202606/222_b_n.jpg'), 2, 1080, 1350);
  // the next frame of the same shoot, which Instagram shows as the second slide panned to the top
  await picture(path.join(originals, 'Art', 'CLD03191.jpg'), 5, 1365, 2048);
  await sharp(path.join(originals, 'Art', 'CLD03191.jpg'))
    .extract({ left: 0, top: 0, width: 1365, height: 1706 })
    .resize(1080, 1350)
    .toFile(path.join(exportRoot, 'media/posts/202606/666_e_n.jpg'));
  await fs.writeFile(path.join(exportRoot, 'media/posts/202606/333_c_n.mp4'), 'not a video');
  await picture(path.join(exportRoot, 'media/posts/202606/444_d_n.jpg'), 3, 1080, 720);
  await picture(path.join(originals, 'Art', 'CLD09999.jpg'), 4, 2048, 1365);

  const posts = [
    {
      media: [
        { uri: 'media/posts/202606/444_d_n.jpg', creation_timestamp: OLDER, title: encodeMeta(PLAIN), media_metadata: {} },
      ],
    },
    {
      media: [
        { uri: 'media/posts/202606/111_a_n.jpg', creation_timestamp: NEWER, title: '' },
        { uri: 'media/posts/202606/666_e_n.jpg', creation_timestamp: NEWER, title: '' },
        { uri: 'media/posts/202606/222_b_n.jpg', creation_timestamp: NEWER, title: '' },
        { uri: 'media/posts/202606/333_c_n.mp4', creation_timestamp: NEWER, title: '' },
        { uri: 'media/posts/202606/555_missing_n.jpg', creation_timestamp: NEWER, title: '' },
      ],
      title: encodeMeta(MEDUSA),
      creation_timestamp: NEWER,
    },
  ];
  await fs.mkdir(path.join(exportRoot, 'your_instagram_activity/media'), { recursive: true });
  await fs.writeFile(path.join(exportRoot, 'your_instagram_activity/media/posts_1.json'), JSON.stringify(posts));

  // the shortcode of the carousel is known from the profile render, that of the single image from
  // an earlier manifest entry
  await fs.mkdir(path.join(out, 'profile-scrape'), { recursive: true });
  await fs.writeFile(
    path.join(out, 'profile-scrape/posts.json'),
    JSON.stringify([{ code: 'DZm11d8AvdX', caption: MEDUSA, date_text: 'Photo by cldrt on June 15, 2026.' }]),
  );
  const before = { account: '__cldrt__', sources_tried: [{ source: 'instaloader' }], posts: [{ shortcode: 'DZiwQ16girX', date: '2026-06-13', caption: PLAIN, files: [] }] };
  await fs.writeFile(path.join(out, 'manifest.json'), JSON.stringify(before));

  const warnings = [];
  const entries = await run({ inputs: [exportRoot], originals: [originals], out, log: (line) => warnings.push(line) });

  assert.equal(entries.length, 2);
  const [medusa, plain] = entries;
  assert.equal(medusa.caption, MEDUSA);
  assert.equal(medusa.date, '2026-06-15');
  assert.equal(medusa.shortcode, 'DZm11d8AvdX');
  assert.equal(medusa.source, 'instagram-export+local');
  assert.deepEqual(medusa.files, [
    'posts/2026-06-15_120000/01.jpg',
    'posts/2026-06-15_120000/02.jpg',
    'posts/2026-06-15_120000/03.jpg',
  ]);
  assert.equal(medusa.sources[0].original, path.join(originals, 'Art', 'CLD03190.jpg'));
  assert.ok(medusa.sources[0].distance <= 12);
  assert.equal(medusa.sources[1].original, path.join(originals, 'Art', 'CLD03191.jpg'));
  assert.ok(medusa.sources[1].distance <= 12);
  assert.deepEqual(medusa.sources[2], { export: 'media/posts/202606/222_b_n.jpg' });
  assert.deepEqual(
    await fs.readFile(path.join(out, medusa.files[0])),
    await fs.readFile(path.join(originals, 'Art', 'CLD03190.jpg')),
  );
  assert.ok(warnings.some((w) => w.includes('333_c_n.mp4, not an image')));
  assert.ok(warnings.some((w) => w.includes('555_missing_n.jpg, not in the export')));

  assert.equal(plain.caption, PLAIN);
  assert.equal(plain.date, '2026-06-13');
  assert.equal(plain.shortcode, 'DZiwQ16girX');
  assert.equal(plain.source, 'instagram-export');
  assert.deepEqual(plain.files, ['posts/2026-06-13_120000/01.jpg']);

  const manifest = JSON.parse(await fs.readFile(path.join(out, 'manifest.json'), 'utf8'));
  assert.deepEqual(manifest.sources_tried, before.sources_tried);
  assert.deepEqual(manifest.posts, entries);
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(out, 'manifest.before-export.json'), 'utf8')), before);
  await fs.rm(dir, { recursive: true });
});
