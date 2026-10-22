import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const essays = defineCollection({
  loader: glob({ pattern: '*.{md,mdx}', base: './src/content/essays' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    description: z.string().optional(),
    draft: z.boolean().default(false),
    // a one-line provenance shown under the date, e.g. the course an essay was written for
    note: z.string().optional(),
    // the rank among essays of the same date, lowest first
    order: z.number().optional(),
  }),
});

export const collections = { essays };
