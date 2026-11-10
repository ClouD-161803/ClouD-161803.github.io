// refreshes src/data/talks.json with every public repository of ClouD-161803 that has the topic
// `talk` and a GitHub Pages site. the listing is read from the head of the deck's index.html (see
// talk-meta.mjs). a failed request keeps the cached file or entry and the script still exits 0, hence
// a build without network passes
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseTalkHead } from './talk-meta.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const talksPath = path.join(root, 'src/data/talks.json');
const owner = 'ClouD-161803';
const apiBase = process.env.GITHUB_API_BASE ?? 'https://api.github.com';
const rawBase = process.env.GITHUB_RAW_BASE ?? 'https://raw.githubusercontent.com';

const headers = {
  Accept: 'application/vnd.github+json',
  'User-Agent': 'claudiovestini.com-build',
  'X-GitHub-Api-Version': '2022-11-28',
};
if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

// a deck may inline tens of megabytes of data, hence only the stream up to </head> is read
async function fetchHead(url) {
  const response = await fetch(url, { headers: { 'User-Agent': headers['User-Agent'] }, signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let text = '';
  while (text.length < 1 << 20) {
    const { done, value } = await reader.read();
    if (done) break;
    text += decoder.decode(value, { stream: true });
    if (/<\/head>/i.test(text)) break;
  }
  await reader.cancel().catch(() => {});
  return text;
}

let previous = [];
try {
  previous = JSON.parse(await readFile(talksPath, 'utf8'));
} catch {}
const previousByRepo = new Map(previous.map((talk) => [talk.repo, talk]));

let repos;
try {
  const query = encodeURIComponent(`topic:talk user:${owner}`);
  const response = await fetch(`${apiBase}/search/repositories?q=${query}&per_page=100`, {
    headers,
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  repos = (await response.json()).items.filter((repo) => !repo.private && repo.has_pages);
} catch (error) {
  console.warn(`fetch-talks: search failed (${error instanceof Error ? error.message : error}), ${previous.length} cached talks kept`);
  process.exit(0);
}

const talks = [];
for (const repo of repos) {
  try {
    const head = parseTalkHead(await fetchHead(`${rawBase}/${repo.full_name}/${repo.default_branch}/index.html`));
    talks.push({
      repo: repo.full_name,
      url: repo.homepage || `https://${repo.owner.login.toLowerCase()}.github.io/${repo.name}/`,
      title: head.title ?? repo.description ?? repo.name,
      // without a talk-date tag, the day the repository was made stands in for the day of the talk
      date: head.date ?? repo.created_at.slice(0, 10),
      venue: head.venue,
    });
  } catch (error) {
    const kept = previousByRepo.get(repo.full_name);
    console.warn(`fetch-talks: ${repo.full_name} not read (${error instanceof Error ? error.message : error}), ${kept ? 'cached entry kept' : 'skipped'}`);
    if (kept) talks.push(kept);
  }
}

talks.sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title));
const json = `${JSON.stringify(talks, null, 2)}\n`;
if (json !== `${JSON.stringify(previous, null, 2)}\n`) await writeFile(talksPath, json);
console.log(`fetch-talks: ${talks.length} talks`);
