// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

const thesis = '/files/Senior_Thesis_compressed.pdf';
const termPaper = '/files/MAE546_Term_Paper.pdf';
const arxiv = 'https://arxiv.org/abs/2511.18132';
const cubesat = '/files/CubeSat_project_report_compressed.pdf';

export default defineConfig({
  site: 'https://claudiovestini.com',
  output: 'static',
  trailingSlash: 'always',
  integrations: [mdx(), sitemap()],
  // the old Jekyll site's URLs and the first name of the music page, kept alive for links already out in the world
  redirects: {
    '/about/': '/',
    '/playlists/': '/music/',
    '/publication/2026-04-23-dykstras-algorithm-stalling-resolution-algorithmic-enhancements-and-applications-in-optimal-transport': thesis,
    '/publication/2025-12-15-towards-bridging-data-driven-control-synthesis-with-hamiltonian-jacobi-bellman-theory': termPaper,
    '/publication/2025-11-22-fast-forwarding-stalling-in-dykstras-algorithm': arxiv,
    '/publication/2025-06-27-materials-testing-for-heatshield-applications-during-cubesat-re-entry-with-passive-demise': cubesat,
  },
});
