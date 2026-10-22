# claudiovestini.com

The personal website of Claudio Vestini: an about page with his recent publications and files, his essays, a publications page, a projects page, a photography section, an art section, and a music page with his playlists. It is a static site built with Astro 7 and deployed to GitHub Pages by a GitHub Actions workflow, reachable at https://claudiovestini.com and at https://cloud-161803.github.io/.

## Running the site

The site needs Node 22.23.4 or newer, the floor in the `engines` field of `package.json`, and `.nvmrc` and the deploy workflow use Node 24, the current long-term release, since the runner's Node 22 fell one patch short. The four commands are

```bash
npm ci
npm run dev
npm run build
npm run preview
```

where `npm ci` installs the dependencies from `package-lock.json`, `npm run dev` starts the dev server, `npm run build` writes the static site into `dist/`, and `npm run preview` serves `dist/` as GitHub Pages will. The `prebuild` script runs `scripts/fetch-github.mjs` before every build, and `npm run import:photography`, `npm run import:art`, and `npm run fetch:github` run the three data scripts by hand. From a terminal `npm run dev` runs in the foreground, and Ctrl-C ends it. Astro 7 backgrounds the server only when it is started as `astro dev --background` or when it detects an agent, and a backgrounded server is ended with

```bash
npx astro dev stop
```

## Layout of the repository

- `astro.config.mjs` sets the site URL, the static output, the MDX and sitemap integrations, and the redirects from the old Jekyll URLs.
- `src/layouts/Base.astro` is the one layout, with the fonts, the page metadata, and the header. `src/styles/global.css` is the one stylesheet, with the design tokens at its top.
- `src/components/` holds `Header.astro`, `SectionNav.astro`, the row of page names shared by a group of pages, `Prose.astro`, the wrapper that gives a Markdown body its reading styles, and `Gallery.astro` and `Lightbox.astro`, shared by the photography and art pages.
- `src/data/nav.ts` lists the navigation items. A new section of the site adds its item there.
- `src/content/essays/` holds the essays, and `src/content.config.ts` their schema.
- `src/pages/` holds one file per route. `index.astro` is the about page, `essays/index.astro` the list of essays, `essays/[slug].astro` one essay, `publications.astro` the publications page, `photography.astro` the grid of photography projects, `photography/[slug].astro` one project, `art.astro` the art page, `projects.astro` the projects page, `music.astro` the music page, which was named `playlists.astro` before, and `404.astro` the not-found page.
- `src/lib/` holds the date formatting and the sorted list of posts.
- `src/assets/profile.jpg` is the 900 px copy of the portrait, and `src/assets/photography/` and `src/assets/art/` hold the optimized copies of the photographs. Astro resizes and converts all of them at build time.
- `src/data/` holds the navigation, `publications.json` with the publications, the photography and art data written by the import scripts, the curated projects list with its GitHub cache, and `playlists.json` with the playlists of the music page.
- `scripts/` holds the three Node scripts: `import-photography.mjs` and `import-art.mjs` rebuild the galleries from the source folders beside the checkout, and `fetch-github.mjs` refreshes the GitHub cache before every build.
- `public/` is copied into `dist/` as it is: `files/` with the PDFs, `images/` with the favicons, the web manifest, and the original portrait, `robots.txt`, which points crawlers at the sitemap, and `CNAME`.
- `.github/workflows/deploy.yml` builds and deploys the site. It installs the dependencies and runs `npm run build`.

## What was removed from the Jekyll site

The previous site was built on the academicpages Jekyll template. Every template folder (`_includes`, `_layouts`, `_sass`, `_data`, `_pages`, `_posts`, `_drafts`, `_talks`, `_teaching`, `_portfolio`, `_publications`), the Jekyll and Docker configuration (`_config.yml`, `_config_docker.yml`, `Dockerfile`, `docker-compose.yaml`, `.devcontainer`), the helpers (`markdown_generator`, `scripts`, `talkmap` with its notebooks), the talk-scraping workflow, the issue templates, the template's sample files (`paper1-3.pdf`, `slides1-3.pdf`, `bibtex1.bib`), and the unused images (`500x300.png`, `bio-photo*.jpg`, `editing-talk.png`, `images/themes/`) were deleted. The text of the about page, the four PDFs, the favicons, and the portrait were carried over. The git history of `master` keeps the whole Jekyll site.

## Design

The site is dark only, and its design tokens are the custom properties in the `:root` block of `src/styles/global.css`.

| Token | Value | Use |
|---|---|---|
| `--color-void` | `#050505` | the page background |
| `--color-surface` | `#0f0f0e` | code blocks and image frames |
| `--color-line` | `#232320` | borders and rules |
| `--color-text` | `#f2f2ef` | text |
| `--color-subtle` | `#a6a6a0` | secondary text, e.g. dates and captions |
| `--color-muted` | `#7c7c76` | the smallest muted text, chosen for a contrast above 4.5:1 |
| `--color-accent` | `#f08050` | link underlines and focus rings |
| `--color-mark` | `#c94fe6` | the Saturn mark before the name, the underline of the active navigation item, and the text selection |
| `--measure-read` | 42rem | the column of a reading page and of a list |
| `--measure-wide` | 64rem | the column of a gallery and of the music page |
| `--measure-prose` | 35rem | the measure of running prose, about 65 characters |

The accent is a coral orange and the mark a toned magenta, the two hues of the research group's logo (`website-assets/ab/group-logo.png`). Neither colours text, hence their contrast on the background, 7.7:1 and 5.6:1, is held to the 3:1 bar for interface parts. Inter is used for everything that is chrome (the navigation, headings, dates, lists, captions, and tables), Crimson Pro for running prose, i.e. the essay bodies and the about page, and the system monospace for code. The prose is set at 1.25rem with a line height of 1.6, rising to 1.3125rem from 40em, a size chosen for the small x-height of Crimson Pro. Both fonts, and EB Garamond for the outlined years of the essays list, are self-hosted through the `@fontsource-variable` packages, hence the browser does not fetch any font from a third-party server at run time. They were chosen on an audition page, `website-assets/ab/index.html` beside the checkout, which shows the about page with six serifs for the prose, six faces for the chrome, and six accents chosen from three dropdowns, with the woff2 weight and the contrast ratio of each. The pair was chosen on `website-assets/ab/colors.html`, which shows darker purples, the hues of the logo, and purple and orange pairs.

The layout follows antfu.me. Claudio's monogram, the upper of the two signatures he drew on 2026-10-22, traced to an outline (`src/assets/signature.svg`, from `website-assets/signature/upper-3.svg`) and drawn with a 16-unit stroke so that its thin strokes survive at this size, sits alone at the top left of every page as the way home, at 4rem, static for now. A write-on animation of it, the strokes drawn in his pen order over per-stroke masks, is built and reviewed beside the checkout in `website-assets/signature/` (`writeon.html` shows it live, `writeon-frames.html` frozen, `tools/` regenerates it) and goes in once its crossings are right. The mark is fixed in the corner on screens wider than 80em, and the top right holds two right-aligned rows: the four icon links (GitHub, LinkedIn, Google Scholar, ORCID) above, and the six lowercase page links below in one row, with a hairline between the writing group (publications, projects, essays) and the arts group (photography, art, music). The about page has no link there, since the mark is the way to it from every page. The current page is underlined in the mark colour. The root element reserves its scrollbar gutter, so that a page too short to scroll does not shift the column against one that scrolls. There is no footer. The content column is centred: a reading page, i.e. a post or the about page, and the lists of posts, publications, and projects use the read column, and the galleries and the music page use the wide column, each with 1.5rem of horizontal padding. The pages of a group share a row of large page names in place of their title, the current one in full white and the others at a quarter opacity, rising to half on hover: publications, projects, and essays form the writing group, and photography, art, and music the arts group. Under the row a quiet line in the muted grey names the pages of the other group, with a grey arrow pointing the way the top right has them, i.e. right from a writing page and left from an arts page, so that a visitor crosses from writing to arts without reaching for the top right. About stands alone with its name as the title. The essays list is grouped by year, with the year drawn large and outlined in EB Garamond behind the first entries of its group, and each entry carries its day and month and a reading time at 220 words a minute. Motion follows antfu.me and t3.gg. Navigation is client-side through Astro's `ClientRouter`, with a 0.2 s crossfade of the page in which the header keeps still. Content rises in with a stagger in the shape of antfu's slide-enter and the parameters of t3.gg, i.e. 20 px over 0.6 s on an overshooting ease-out: the direct children of the main column and of a prose body take their rank from their position, and the items of every list take theirs from an inline `--enter-stage`, capped at twelve, each 50 ms after the previous one. Behind the page a fixed canvas, `src/components/Plum.astro`, grows faint branching lines in from the edges, a port of the ArtPlum component of antfu.me (MIT), masked out towards the centre and kept across navigations. Every motion is skipped when the visitor prefers reduced motion, and the canvas then stays blank. The lightbox binds its links on Astro's `page-load` event, hence it works after a client-side navigation. The link labels, e.g. "back to the essays", are lowercase. Astro bundles the scoped styles of each component with `global.css` into one served stylesheet.

## Deployment

The workflow in `.github/workflows/deploy.yml` runs on every push to `master` and on manual dispatch. Its build job installs the dependencies with `npm ci`, restores Astro's image cache (`node_modules/.astro`, keyed on a hash of `src/assets/`) through `actions/cache`, runs `npm run build`, and uploads `dist/` as the Pages artifact, and its deploy job publishes the artifact with `actions/deploy-pages`. Before the first push, the Pages source must be set to "GitHub Actions" under the repository's Settings, Pages. Otherwise GitHub tries to build the repository with Jekyll and the deployment fails. The repository carries the optimized sources of the photographs, about 270 MB under `src/assets/`, most of it the art posts, and the build writes two responsive widths per image (480 and 1024 px for a cover or a grid cell, 1024 and 2000 px for a photograph in a flow gallery) plus the full-size copy that the lightbox opens. A cold build on this Mac takes about 50 s and writes 2,504 files into `dist/_astro/`, 420 MB in all, and a later deploy that changes no image regenerates none, thanks to the cache.

## Custom domain

The domain `claudiovestini.com` is registered at Porkbun. `public/CNAME` holds the domain and is copied to `dist/CNAME`, which GitHub Pages reads. The DNS records GitHub Pages needs are four A records on the apex, `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, and `185.199.111.153`, and a CNAME record from `www` to `cloud-161803.github.io`. Whether they are in place can be checked with the two commands below, of which the first should print the four addresses and the second the GitHub host.

```bash
dig +short claudiovestini.com
```

```bash
dig +short www.claudiovestini.com
```

After the first deployment, the domain is entered in the custom-domain field of the Pages settings, and "Enforce HTTPS" is ticked once the certificate has been issued. Without the domain the site keeps working at https://cloud-161803.github.io/.

## Essays

An essay is a Markdown file, `.md` or `.mdx`, in `src/content/essays/`. Its file name is its URL slug, and its frontmatter has a `title`, a `date` in the form `YYYY-MM-DD`, an optional `description`, which becomes the page's meta description, an optional `draft: true`, which hides the post from the build while the dev server still shows it, an optional `note`, a one-line provenance shown under the date, and an optional `order`, which ranks essays that share a date, lowest first. The list at `/essays/` groups the essays by year, newest first, with the day and month and a reading time at 220 words a minute. The first essay, the Cuppers final match report, carries the date 2024-02-25, the Sunday of the final as given by Keble's news post of 26 February 2024. Its text was taken from his Google Doc, in which one paragraph break fell mid-sentence, before "MOTM nomination", and this break was closed.

Five further essays are the ones Claudio wrote for SLA 220, Russian literature, at Princeton in spring 2026: two from the midterm, dated 2026-03-18, and three from the final, dated 2026-05-13, the dates of the Word documents. Each carries the course in its `note`. The texts are his submissions, converted from `website-assets/blog/essays/` beside the checkout, with the prompt line, the reference list, and the Honour Code pledge removed, the misspellings and the small copy edits that the grader marked adopted, and nothing else changed. The essay "Anna" opens with the Welty line of its prompt as an epigraph, and the letter to the aliens with a two-line preface on the premise. Their titles are his: "The Great Russian Novel" (the letter to the aliens), "The Defense", "Petersburg", "Smerdyakov" (beginnings and endings in Turgenev and Dostoevsky), and "Anna". Any of the five can be hidden with `draft: true`.

## About page and files

The about page at `/` carries the text of `src/content/about.md`, Markdown that Claudio rewrote on 2026-10-22, with the senior thesis linked to `/files/Senior_Thesis_compressed.pdf`, followed by a "Recent Publications" section at the anchor `#publications`, which shows the three newest entries. The publications live in `src/data/publications.json`, newest first, each with `title`, `authors`, `venue`, `year`, a `date` in the form `YYYY-MM-DD` taken from the old Jekyll files, and `url`, which is a path under `/files/` or the arXiv page. The page `src/pages/publications.astro` renders `/publications/`, every entry newest first in the same row style as the about page, with the CV link at the bottom. A new publication is an object appended to the JSON, and both pages sort by `date`. The title of the MAE 546 term paper reads "Hamilton-Jacobi-Bellman", the spelling of the PDF itself, while the old URL in the redirect map keeps the spelling "Hamiltonian" of the Jekyll site. The four PDFs keep their paths under `/files/`: `CV.pdf`, `Senior_Thesis_compressed.pdf`, `MAE546_Term_Paper.pdf`, and `CubeSat_project_report_compressed.pdf`. The old URLs `/about/` and the four `/publication/...` pages redirect to the about page and to the four publications (the arXiv preprint to its arXiv page) through the `redirects` map in `astro.config.mjs`, which Astro builds as pages with a meta refresh, since GitHub Pages does not serve HTTP redirects. The old `/publications/` is now a page of its own and is not in the map. The same logo is the site's tab icon, as the four PNG favicons in `public/images/` (32, 192, and 512 px, and the 180 px touch icon), cut square from the 653 px original, with a version query on their links so that browsers drop the cached icon of the old site. Under the name, the logo of the Beeson Group (`src/assets/beeson-group.png`, the 653 px `dylan-inverted-image.png` from beeson.princeton.edu, the largest copy the site serves) links to the group's research page, and the words "Beeson Group" to its home page. The "Recent Publications" heading links the word "publications" to the publications page, with the curriculum vitae beside it.

## Photography

The photography pages show nine of the eleven projects of Claudio's Adobe Portfolio site ("Art in Science" and "Waterfalls" are hidden by title through the `HIDDEN` set at the top of the import script), `https://claudiovestini.myportfolio.com/work`. The source files live outside the repository, in `website-assets/portfolio/` next to the checkout, as one folder per project with the original downloads (58 files, 222 MB, up to 8400 px wide). The `manifest.json` in that folder records for each project its order, slug, title, year, description, cover, and video embed URLs, and for each image its pixel size and its source URL on Adobe's CDN. The `README.md` next to it describes the download.

### Rebuilding the pages

The script `scripts/import-photography.mjs` reads `../website-assets/portfolio/manifest.json` relative to the checkout and writes an optimized JPEG copy of every image into `src/assets/photography/<slug>/<nnn>.jpg` and `src/assets/photography/<slug>/cover.jpg`. It then writes `src/data/photography.json`, which the pages read. Run it with

```bash
npm run import:photography
```

A rerun skips every output that is newer than its source, hence it finishes in well under a second when nothing changed, and it removes the outputs of projects or images that left the manifest. It exits non-zero when the manifest, or a source file the manifest lists, is missing.

Each optimized copy has a long edge of at most 2000 px (a smaller source is not upscaled), is a progressive JPEG at quality 80 written by mozjpeg, has its EXIF orientation baked into the pixels, is converted to sRGB, and is stripped of its metadata. A PNG source, which the illustrations of Art in Science are, is flattened onto the page background. The 58 copies take 17 MB. At build time Astro writes webp renditions of each copy into `dist/_astro/`, at 640, 1024, 1600, and 2000 px wide for the project pages, at 480, 720, and 1024 px for the covers, and at the copy's full size for the lightbox.

### Pages and projects

`src/pages/photography.astro` renders `/photography/`, a grid of covers in manifest order, and `src/pages/photography/[slug].astro` renders one page per project at `/photography/<slug>/`, with the photographs in page order, a previous and a next link, and the lightbox. The two components `src/components/Gallery.astro` and `src/components/Lightbox.astro` are shared with the art page. The URL slugs are the slugs of the Adobe Portfolio pages, and three of them differ from the project's title, since Adobe kept the address a page was first created under.

| Order | Title | Slug | Images | Year |
|---|---|---|---|---|
| 1 | People of Belice | `people-of-belice` | 5 | 2026 |
| 2 | Sunset at The Getty | `sunset-at-the-getty` | 2 | 2026 |
| 3 | Waterfalls | `sunset-at-the-getty-museum` | 2 | 2026 |
| 4 | Architecture: United States | `architecture-united-states` | 5 | 2026 |
| 5 | Oxford From the Sky | `oxford-from-the-sky` | 4 | 2025 |
| 6 | Architecture: South East Asia | `architecture-south-east-asia` | 5 | 2025 |
| 7 | People of Rio | `rio-de-janeiro` | 3 | 2025 |
| 8 | Oxford Fashion Gala | `oxford-fashion-gala` | 9 | 2025 |
| 9 | Keble in the Snow | `keble-in-snow` | 2 | 2024 |
| 10 | Foxes in the Snow | `foxes-in-snow` | 3 | 2024 |
| 11 | Art in Science | `foxes` | 7 | 2026 |

Two projects, Sunset at The Getty and Waterfalls, also have a video on Adobe Portfolio (Adobe video ids `No7Kmsd8ZcK` and `26evUhaKJec`, kept in the `videos` array of `photography.json`). The project page links the video with one line, "A video of this project is on Adobe Portfolio", pointing at the project's Adobe Portfolio page, and does not embed Adobe's player.

The source does not have captions, hence the import script generates the alt text of every photograph as "<title>, photograph N of M", and the lightbox shows the project title as its caption.

## Art

The art page at `/art/` is a grid of artworks that Claudio photographs in museums, newest first, in the shape of the photography page. The page replaces his Instagram account `__cldrt__`, from which the posts are imported, and it does not mention or link Instagram. Each cell shows the first image of a post as a 4:5 cover and a two-line caption: the title in italics with the artist and the year, then a pin line with the museum linked to its website, the city linked to a Google Maps search, and the flag of the country. An exhibition is shown as a tag at the end of the pin line. The cover opens the post at `/art/<slug>/`, where the slug is the title in lowercase ASCII (`/art/il-trovatore/`), with a counter when two titles coincide. There every image of the carousel is laid out by the flow gallery shared with the photography projects and opens in the lightbox, and the date of the post is shown under the title. A caption outside the three-line form described below is shown verbatim in place of the two lines.

All 282 posts of the account are in, posted between 2025-01-03 and 2026-06-15, with 1,047 images. They come from Instagram's own export of the account, described below. 46 of the images are Claudio's full-size local edits in place of Instagram's copies. The download routes that were tried before the export, and their results, are recorded in `website-assets/instagram/README.md`.

### Source files and manifest

The source files live outside the repository, in `website-assets/instagram/` next to the checkout, together with a `manifest.json` whose `posts` array runs newest first. Each entry has the post's `shortcode` and `date`, both null when unknown, its `caption` verbatim including emoji, and `files` as paths relative to that folder, in the order of the carousel. An optional `note` is carried into the page data.

```json
{
  "shortcode": "DZm1oLggm0i",
  "date": "2026-06-15",
  "caption": "\"Il Trovatore\"\n\nGiorgio de Chirico, 1960\n\n📍 Irish Museum of Modern Art, Dublin, Ireland",
  "files": ["posts/2026-06-15_083918/01.jpg", "posts/2026-06-15_083918/02.jpg"]
}
```

The script `scripts/import-art.mjs` reads every post of the manifest. It first applies the spelling corrections in `src/data/caption-fixes.json` to the caption, each a phrase as posted mapped to its correction and replaced only where it stands as whole words. The manifest keeps the caption as posted, and the page shows it corrected. The script then parses the caption's three-line form, i.e. a quoted title, then the artist and the year split at the last comma, then a pin line with the museum, the city, and the country, into the fields `title`, `artist`, `year`, `museum`, `city`, and `country`. An unquoted "untitled" is taken as the title, and a bust emoji (👤) before the artist is dropped. An exhibition is a tag on the museum that hosts it, written as "Museum (temporary exhibition)" or as "Name Exhibition at Museum", and it is parsed into the field `exhibition`. A field written in the manifest entry wins over the parsed one, and a caption outside the form leaves every field null with a warning. The museum's website and its Google Maps search come from `src/data/museums.json`, keyed by "Museum, City" for a name that two museums share (National Museum in Oslo and in Stockholm) and otherwise by the museum name, and the flag comes from `src/data/flags.json`, keyed by the country. A museum or a country missing from these files is reported as a warning and leaves the link or the flag out.

The script writes an optimized JPEG copy of each image into `src/assets/art/<key>/<nnn>.jpg`, where the key is the title slug, or the shortcode or `local-<n>` for an entry without a title, with the settings of the photography import, i.e. a long edge of at most 2000 px, a progressive JPEG at quality 80, sRGB, and stripped metadata. It then writes `src/data/art.json`, which both art pages read. The alt text of an image is "title, artist, year, photograph N of M", or the caption when the form does not fit, and a caption is never invented. When the manifest has an empty `posts` array, the script removes the copies and writes an `art.json` with an empty `posts` array. When the manifest is missing from its default location, it writes the same `art.json`, leaves `src/assets/art/` as it is, and exits 0, so that a clean clone builds and the page shows "Nothing here yet."

### Importing the Instagram export

The posts come from Instagram's own export of the account, which holds every caption, the time of each post, and the images of each carousel in order. The script `scripts/import-instagram-export.mjs` reads this export and copies the images of each post into `website-assets/instagram/posts/<date>_<time>/`. An image whose local edit it finds under `~/Pictures/Camera/Edited/` is replaced by a copy of that edit, which is larger than Instagram's copy. It then rewrites the `posts` array of the manifest and keeps the other keys, and the manifest before the first run is kept as `manifest.before-export.json`.

The export does not contain shortcodes. The script takes a shortcode from an earlier manifest entry or from the profile render in `website-assets/instagram/profile-scrape/posts.json` when the caption is the same and the dates lie within a day, and writes null otherwise. Each entry also lists in `sources` where each image came from, i.e. the path of the local edit with its hash distance, or the path inside the export. A local edit is found by comparing a 128-bit difference hash of each Instagram image with that of the center crop of each local edit to the same aspect ratio. A distance of at most 12 bits counts as a match. On the twelve covers of the profile render, each true edit lay at 0 to 7 bits and the nearest wrong one at 20 or more. A slide that was panned or zoomed inside Instagram fails this centered comparison. For such a slide the script searches crops at several positions and two zoom levels of the ten edits on either side, in name order, of each edit already matched for the same post, which takes 3 to 4 s per slide. A slide left unmatched keeps the Instagram copy. Videos are skipped with a warning.

Meta does not document the layout of the export. In the export of this account the posts are listed in `your_instagram_activity/media/posts_1.json`, and the images sit under `media/posts/`. The script reads every `posts_<n>.json`, and it does not read `posts.json` or `archived_posts.json` beside them, hence an archived post stays off the page. The test `scripts/import-instagram-export.test.mjs` builds a synthetic export in this layout, with captions escaped byte by byte as Meta writes them, a carousel, a single image, a video, and a local edit that Instagram cropped to 4:5.

```bash
node --test scripts/
```

1. Request the export in Accounts Center, at <https://accountscenter.instagram.com/info_and_permissions/dyi/> or in Instagram under More, Settings, Meta Account, Your information and permissions, Export your information. Choose Create export, the profile `__cldrt__`, and Export to device. Then choose specific information, tick Media alone under Your Instagram activity, and choose all time as the date range, JSON as the format, and high as the media quality, and choose Start export. Instagram sends an email when the files are ready, which it says can take up to 30 days, and keeps them under Available downloads for 4 days.

2. Download every part of the export. A zip is unpacked once into `website-assets/instagram/export/<zip name>/`, and an export already unpacked by the browser is passed as its folder. Run the script on every part, first with `--dry-run`, which reports the counts and the warnings without copying or writing anything.

   ```bash
   node scripts/import-instagram-export.mjs ~/Downloads/<export>.zip --originals ~/Pictures/Camera/Edited --dry-run
   ```

3. Run it again without `--dry-run`, and read the `sources` of any image matched at more than 8 bits.

4. Add each new museum to `src/data/museums.json` with its `url` and `maps` link, and each new country to `src/data/flags.json`.

5. Rebuild the page, which rewrites `src/assets/art/` and `src/data/art.json`. The script also accepts another manifest path as its first argument, relative to the working directory, and exits 1 when the given file is missing.

   ```bash
   npm run import:art
   ```

6. Build the site and check `/art/`.

   ```bash
   npm run build
   ```

## Projects

The page at `/projects/` lists a curated set of GitHub repositories with their public metadata. The list lives in `src/data/projects.json`, the metadata in `src/data/github-cache.json`, and the page `src/pages/projects.astro` reads only these two files. The build therefore never touches the network and never fails for lack of it.

### How the page is built

The script `scripts/fetch-github.mjs` runs as the `prebuild` script, i.e. before every `npm run build`, and it can be run by hand from the checkout root with

```bash
npm run fetch:github
```

For each entry in `projects.json` the script sends one GET request to `https://api.github.com/repos/<owner>/<name>`. From a successful reply it keeps `full_name`, `html_url`, `description`, `language`, `stargazers_count`, `pushed_at`, `homepage`, `size`, `topics`, and `archived`, adds a `fetched_at` timestamp, and stores the entry in the committed cache `src/data/github-cache.json` under the key `<owner>/<name>`. On Claudio's machine it also writes each raw response to `website-assets/github/<owner>__<name>.json`, a folder beside the repository, and it skips this step where the folder is missing, as on the GitHub Actions runner.

When a request fails (no network, a 404, a rate limit, or a reply that is not JSON), the script prints one warning line naming the repository and the status, keeps the cached entry, and still exits 0. A reply that marks the repository as private, or whose `visibility` is not `public`, is skipped with one warning and the cached entry is kept, hence a token does not widen what the page shows beyond the anonymous view. The script never deletes a cache entry, and it rewrites the cache only when at least one repository was refreshed. Since the cache is committed, a build without network renders the last fetched state. An entry that is in the list but not in the cache renders as its name linked to `https://github.com/<owner>/<name>` with the text "coming soon".

Unauthenticated requests to the GitHub API are limited to 60 per hour per address. The script sends `Authorization: Bearer <token>` when the environment variable `GITHUB_TOKEN` is set, and the deploy workflow passes `GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}` to the build step, which raises the limit to 1000 per hour for the workflow. The variable `GITHUB_API_BASE` overrides the API host, which is useful to test the no-network path with an unreachable address such as `http://127.0.0.1:9`.

### Adding an entry

Append an object to the array in `src/data/projects.json`, at the position where the page should show it, since the page keeps the order of the file:

```json
{ "owner": "ClouD-161803", "name": "dykstra-projection", "description": null }
```

The `description` field is an optional override of the one-line description on GitHub, and `null` keeps GitHub's. Then run the fetch command above and commit the updated cache together with the list.

### Repositories without content

A row whose cached metadata has neither a description nor a language renders as the name linked to GitHub and the muted text "coming soon". The two `beeson-group` entries, `tycho` and `pydylan`, are empty on GitHub and render this way. The state is derived from the data rather than from a flag, thus each row fills itself with GitHub's description, language, star count, and month of the last push once the repository has content and the fetch script has run.

## Music

The page at `/music/` embeds the public playlists of Claudio's Spotify profile, `https://open.spotify.com/user/21jugv5fxyelubdxmar3yhmty`. The list lives in `src/data/playlists.json`, with the profile URL under `profile` and the playlists under `playlists`, each with `id`, `name`, `url`, `description`, and `tracks`, and an optional `hidden: true`, which keeps a playlist off the page ("jazzy" is hidden). The page `src/pages/music.astro` renders one figure per playlist, with the name, the description, the track count, and an "open on Spotify" link in the caption and Spotify's embed below it. The figures sit in two columns from 48em up and in one column on a narrow screen. The page was first published as `/playlists/`, and that URL redirects to `/music/` through the `redirects` map in `astro.config.mjs`.

### Where the list came from

The profile page loads its playlist shelf with JavaScript, and Spotify's anonymous token endpoint for the Web API is blocked. The list was therefore obtained by rendering the public profile and its "Show all" page, `https://open.spotify.com/user/21jugv5fxyelubdxmar3yhmty/playlists`, with headless Chrome (`--dump-dom`) and reading the playlist ids from the rendered page. The profile header counts 13 public playlists and the rendered page lists 13, thus the list is complete. The names come from Spotify's public oEmbed endpoint, `https://open.spotify.com/oembed`, and the descriptions and track counts from each rendered playlist page. The full record, including the thumbnails and owner lines the site does not use, is in `website-assets/spotify/playlists.json` beside the repository, with a README on the routes tried.

### Adding or removing a playlist

The id is the last path segment of the playlist URL, `https://open.spotify.com/playlist/<id>`. To add a playlist, append an object to `playlists` in `src/data/playlists.json`, at the position where the page should show it:

```json
{ "id": "3TpiLbdmyZYOWLoKgF8852", "name": "Yorke", "url": "https://open.spotify.com/playlist/3TpiLbdmyZYOWLoKgF8852", "description": "museo", "tracks": 224 }
```

The `description` may be an empty string, in which case the caption leaves it out. To remove a playlist, delete its object. An empty array renders the title, the profile link, and the line "Nothing here yet.", and the build still passes.

### The embeds

An embed takes its source from a `data-src` attribute when it comes within 400 px of the viewport, through an IntersectionObserver bound on every page load. A visit therefore asks Spotify for two or three players at a time rather than thirteen, which its edge answers with an empty 406 after a burst, and the browser's `loading="lazy"` attribute, reported to break the embed, is not used.

Each embed is Spotify's own iframe at `https://open.spotify.com/embed/playlist/<id>?theme=0`, where `theme=0` selects the dark theme, and it needs no API key and no account. A playlist must be public for the embed to render. The iframe carries the playlist name in its `title`, and the caption above it is plain HTML, meaning that a visitor who blocks third-party frames still sees every name and can reach each playlist through its link.

## Photographs in posts (planned)

No post carries images yet. When the first essay with photographs is written, the recommended route is Markdown images in a folder next to the post, which Astro optimises at build time and whose alt text becomes the caption, together with a full-bleed figure style that lets a photograph break out of the reading column to the wide column. A component that pulls an image from the photography collection by project and index is the alternative when posts start reusing gallery images.

## Notes (planned)

The notes section is not in this release, and nothing of it is built yet. A first attempt, a separate [Quartz](https://quartz.jzhao.xyz/) subsite with its own build, was set aside because it sat outside the site's layout and navigation and needed a hand-maintained copy of the vault in the repository. The planned version renders selected vault notes inside the Astro site as a content collection, fetched at build time by the deploy workflow from the vault repository `ClouD-161803/phd-obsidian-vault` (a private repository, hence through a deploy key or a fine-grained token stored as a repository secret), filtered by the allowlist and the privacy rules of the first attempt, with wikilinks resolved to pages, a graph of their links, and the Oxford notes PDFs listed on the same page. A push to the vault would then trigger the site's workflow through a repository dispatch. The Quartz attempt, with its sync script and allowlist, is kept in `website-assets/notes/quartz-attempt/` beside the checkout.

## Still to do

The site is complete locally and nothing is committed or pushed. These are the steps that remain, all Claudio's.

1. Read the branch `rebuild-2026-10`, and commit it with the usual sequence.
2. Set the Pages source to "GitHub Actions" under the repository's Settings, Pages, before the first push, then push `master`.
3. Check the DNS records of `claudiovestini.com` with the two `dig` commands in the Custom domain section, enter the domain in the Pages custom-domain field after the first deployment, and tick "Enforce HTTPS" once the certificate is issued.
4. Write a one-line description in the frontmatter of the Cuppers final match report if a search snippet other than the site description is wanted.
5. Import the older Instagram posts from the Google Takeout export as described in the Art section, with their shortcodes, dates, and captions.
