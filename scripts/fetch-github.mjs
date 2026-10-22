// refreshes src/data/github-cache.json from the GitHub API for each repository in src/data/projects.json.
// a failed request keeps the cached entry and the script still exits 0, hence a build without network passes
import { access, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const projectsPath = path.join(root, 'src/data/projects.json');
const cachePath = path.join(root, 'src/data/github-cache.json');
// raw responses are written to a folder beside the repository, which exists on Claudio's machine and not in CI
const rawDir = path.resolve(root, '../website-assets/github');
const apiBase = process.env.GITHUB_API_BASE ?? 'https://api.github.com';

const keptFields = [
  'full_name',
  'html_url',
  'description',
  'language',
  'stargazers_count',
  'pushed_at',
  'homepage',
  'size',
  'topics',
  'archived',
];

async function readJson(file, fallback) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch {
    return fallback;
  }
}

async function exists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

async function fetchRepo(owner, name, headers) {
  const response = await fetch(`${apiBase}/repos/${owner}/${name}`, {
    headers,
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    const rateLimited = response.status === 403 && response.headers.get('x-ratelimit-remaining') === '0';
    throw new Error(rateLimited ? 'HTTP 403, rate limited' : `HTTP ${response.status}`);
  }
  return response.json();
}

const projects = await readJson(projectsPath, []);
const cache = await readJson(cachePath, {});
const writeRaw = await exists(rawDir);

const headers = {
  Accept: 'application/vnd.github+json',
  'User-Agent': 'claudiovestini.com-build',
  'X-GitHub-Api-Version': '2022-11-28',
};
if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

let refreshed = 0;
let fetched = 0;
for (const { owner, name } of projects) {
  const key = `${owner}/${name}`;
  const state = key in cache ? 'cached entry kept' : 'not in cache';
  try {
    const data = await fetchRepo(owner, name, headers);
    // a token can see private repositories, and the page must show only what an anonymous visitor sees
    if (data.private || data.visibility !== 'public') {
      console.warn(`fetch-github: ${key} is not public, skipped, ${state}`);
      continue;
    }
    const entry = Object.fromEntries(keptFields.map((field) => [field, data[field] ?? null]));
    // fetched_at moves only with a real change, so a routine build leaves the committed cache untouched
    const previous = cache[key] ?? {};
    const changed = keptFields.some((field) => JSON.stringify(previous[field] ?? null) !== JSON.stringify(entry[field]));
    entry.fetched_at = changed || !previous.fetched_at ? new Date().toISOString() : previous.fetched_at;
    if (changed || !previous.fetched_at) refreshed += 1;
    cache[key] = entry;
    fetched += 1;
    if (writeRaw) {
      await writeFile(path.join(rawDir, `${owner}__${name}.json`), `${JSON.stringify(data, null, 2)}\n`);
    }
  } catch (error) {
    const reason = error instanceof Error ? [error.message, error.cause?.code].filter(Boolean).join(", ") : String(error);
    console.warn(`fetch-github: ${key} not refreshed (${reason}), ${state}`);
  }
}

if (refreshed > 0) await writeFile(cachePath, `${JSON.stringify(cache, null, 2)}\n`);
console.log(`fetch-github: ${fetched} of ${projects.length} repositories fetched, ${refreshed} changed`);
