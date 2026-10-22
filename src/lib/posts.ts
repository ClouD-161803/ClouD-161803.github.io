import { getCollection } from 'astro:content';

// drafts are visible in the dev server and left out of the build
export async function getPosts() {
  const posts = await getCollection('essays', ({ data }) => import.meta.env.DEV || !data.draft);
  return posts.sort(
    (a, b) =>
      b.data.date.valueOf() - a.data.date.valueOf() || (a.data.order ?? 0) - (b.data.order ?? 0),
  );
}
