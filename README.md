# claudiovestini.com

This repository holds the personal website of Claudio Vestini, served at https://claudiovestini.com. It is a static site built with Astro, set in Inter and Crimson Pro through the self-hosted `@fontsource-variable` packages, and deployed to GitHub Pages by a GitHub Actions workflow on every push to `master`.

## Running and building

The site runs on Node 24, the version in `.nvmrc`, and the `engines` field of `package.json` allows Node 22.23.4 or newer.

```bash
npm ci
```

```bash
npm run dev
```

```bash
npm run build
```

```bash
node --test
```

These install the dependencies from `package-lock.json`, start the dev server, write the static site into `dist/`, and run the tests of the caption parser, of the Instagram export import, and of the background drawing, respectively. The `prebuild` script runs `scripts/fetch-github.mjs` before every build, and `npm run preview` serves `dist/` locally.

## Layout of the repository

- `src/pages/` holds one file per route: the about page, the publications, projects, essays, photography, art, and music pages, and the not-found page.
- `src/layouts/Base.astro` is the single layout, with the fonts, the page metadata, the header, and the background canvas.
- `src/components/` holds the header, the row of section names, the prose wrapper, the gallery and lightbox of the photography and art pages, and the background canvas.
- `src/content/` holds the essays and `about.md`, the text of the about page.
- `src/data/` holds the JSON data of every list, the GitHub cache, the museum and flag lookups, and the navigation in `nav.ts`.
- `src/lib/` holds the date formatting, the sorted list of essays, and the background drawing with its test.
- `src/assets/` holds the portrait, the monogram, the Beeson Group logo, and the optimized photographs written by the import scripts.
- `src/styles/global.css` is the single stylesheet, with the design tokens at its top.
- `scripts/` holds the import and fetch scripts and their tests.
- `public/` is copied into `dist/` unchanged, with the PDFs under `files/`, the favicons, `robots.txt`, and `CNAME`.
- `astro.config.mjs` sets the site URL, the sitemap, and the `redirects` map, which keeps the URLs of the previous site reaching their pages.

## Content

### An essay

An essay is a Markdown or MDX file in `src/content/essays/`, and its file name is its URL slug. The frontmatter, defined in `src/content.config.ts`, takes the fields below.

```yaml
title: "Anna"
date: 2026-03-18
description: "The meta description of the page, optional."
note: "A one-line provenance shown under the date, optional."
order: 5        # ranks essays of the same date, lowest first, optional
draft: false    # true shows the essay in the dev server only
```

### A publication

A publication is an object in `src/data/publications.json` with `title`, `authors`, `venue`, `year`, `date` (`YYYY-MM-DD`), and `url`, which is a path under `/files/` or an external page. A PDF goes into `public/files/`. The publications page and the three recent entries on the about page are both sorted by `date`.

### A project

A project is an object in `src/data/projects.json` with `owner`, `name`, and `description`, where `null` keeps the description from GitHub. The page lists the projects in the order of the file. Before every build `scripts/fetch-github.mjs` fetches the public metadata of each repository into `src/data/github-cache.json`, which is committed. A failed request leaves the cached entry in place, hence a build without network still passes. After adding a project, run the fetch and commit the cache together with the list.

```bash
npm run fetch:github
```

### A photography project

The photographs come from the Adobe Portfolio download in `../website-assets/portfolio/`, beside the checkout, whose `manifest.json` lists each project with its `order`, `slug`, `title`, `year`, `description`, `cover`, `images`, and `videos`. After adding a project to the manifest, run the import, which writes optimized copies into `src/assets/photography/` and the page data into `src/data/photography.json`. A project is kept off the site by adding its title to the `HIDDEN` set at the top of `scripts/import-photography.mjs`.

```bash
npm run import:photography
```

### An art post

The art posts come from the Instagram manifest in `../website-assets/instagram/manifest.json`, beside the checkout, whose `posts` array runs newest first. Each post has `shortcode`, `date`, `caption`, and `files`, and `scripts/import-instagram-export.mjs` builds the manifest from Instagram's own data export. A caption is written in a three-line form, parsed by `scripts/art-caption.mjs`.

```text
"Medusa"
Cecilia Vicuña, 1972
📍 Irish Museum of Modern Art, Dublin, Ireland
```

The museum line may carry an exhibition, written as "Museum (temporary exhibition)" or as "Name Exhibition at Museum". A field written in the manifest entry overrides the parsed one. The import corrects misspellings through `src/data/caption-fixes.json`, looks up the museum's `url` and `maps` link in `src/data/museums.json`, and looks up the country's flag in `src/data/flags.json`. It warns about a museum or a country missing from either lookup, hence add each new one there. The import then writes optimized copies into `src/assets/art/` and the page data into `src/data/art.json`.

```bash
npm run import:art
```

### A playlist

A playlist is an object in the `playlists` array of `src/data/playlists.json`, with `id`, `name`, `url`, `description`, and `tracks`, where the `id` is the last path segment of the Spotify URL. The page lists the playlists in the order of the file, and `"hidden": true` keeps a playlist in the file but off the page.

## Design

The site is dark only. The tokens below are custom properties at the top of `src/styles/global.css`.

| Token | Value | Use |
|---|---|---|
| `--color-void` | `#050505` | the page background |
| `--color-surface` | `#0f0f0e` | code blocks and image frames |
| `--color-line` | `#232320` | borders and rules |
| `--color-text` | `#f2f2ef` | text |
| `--color-subtle` | `#a6a6a0` | secondary text, e.g. dates and captions |
| `--color-muted` | `#7c7c76` | the faintest text |
| `--color-accent` | `#f08050` | link underlines and focus rings |
| `--color-mark` | `#c94fe6` | the monogram, the underline of the current page link, and the text selection |
| `--measure-read` | 42rem | the column of an essay, the about page, and the lists |
| `--measure-wide` | 64rem | the column of the galleries and the music page |
| `--measure-prose` | 35rem | the measure of running prose |

Inter sets everything outside running prose, i.e. the navigation, headings, dates, lists, and captions. Crimson Pro sets the essay bodies and the about page, and EB Garamond draws only the large outlined years of the essays list. The accent and the mark take the two hues of the logo in `src/assets/beeson-group.png`, which is the logo of the Beeson Group at Princeton University and links to the group's site from the about page.

Claudio's monogram, `src/assets/signature.svg`, sits at the top left of every page as the link to the about page, and stays fixed in the corner on screens wider than 80em. It writes itself on over 1.9 s, holds for 6 s, unwrites in 0.9 s, and repeats. Each of the five pen strokes is its own shape, as wide as the ink along its centreline, which a round pen reveals in pen order, and the traced ink trims the shapes to the real outline, hence a crossing shows nothing of a later stroke until its pen arrives. Once the write is done the traced ink itself fades in over the shapes, so that the monogram held on the page is the static one. `tools/writeon-band.js` in `../website-assets/signature/`, beside the checkout, generates the file from the traced path and the pen order, and `tools/band-frames.js` next to it renders paused frames through headless Chrome for checking. The top right holds the icon links (GitHub, LinkedIn, Google Scholar, and ORCID) above one row of page links, split by a hairline into the writing pages and the arts pages. The content column is centered, and the pages of each group share a row of large section names in place of a title. Content rises in with a stagger of 50 ms per element, after the slide-enter of antfu.me. Navigation is client-side through Astro's client router, with a 0.2 s crossfade of the page while the header keeps still. Behind the page, the canvas in `src/components/Orbits.astro` traces faint grey orbits of the circular restricted three-body problem, one scene per visit drawn at random from twenty-one in `src/lib/orbits.ts` (Lyapunov, halo, and distant retrograde families, manifold tubes, resonant rosettes, horseshoes and tadpoles, a low-thrust whorl, the Hill contours, and the rest), computed on the spot by a short propagator and corrector and traced over twelve seconds at the pace of the spacecraft's flight. The idea, a generative drawing growing in from the edges and masked out at the centre, is that of the ArtPlum component of antfu.me (MIT, https://github.com/antfu/antfu.me), whose port is kept inactive as `src/components/Plum.astro` with `src/lib/plum.ts` and its test, and swapping the component in `src/layouts/Base.astro` brings the branching lines back. When the visitor prefers reduced motion, nothing moves, the monogram stands complete, and the canvas stays blank.

## Deployment

The workflow `.github/workflows/deploy.yml` runs on every push to `master` and on manual dispatch. It installs the dependencies, runs `npm run build` with `GITHUB_TOKEN` set for the GitHub fetch, and publishes `dist/` with `actions/deploy-pages`. The Pages source in the repository settings must be set to GitHub Actions. The workflow caches the optimized image variants in `node_modules/.astro`, keyed on a hash of `src/assets/`, hence a deploy that changes no image regenerates none.

The custom domain is set by `public/CNAME`, which is copied to `dist/CNAME`. The domain reaches GitHub Pages through four A records on the apex and a CNAME record for `www`.

| Name | Type | Value |
|---|---|---|
| `claudiovestini.com` | A | `185.199.108.153` |
| `claudiovestini.com` | A | `185.199.109.153` |
| `claudiovestini.com` | A | `185.199.110.153` |
| `claudiovestini.com` | A | `185.199.111.153` |
| `www` | CNAME | `cloud-161803.github.io` |
