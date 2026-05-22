import { defineCollection, z } from 'astro:content';

const lessons = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    module: z.number(),
    moduleTitle: z.string(),
    lesson: z.number(),
    duration: z.string().optional(),
    youtubeId: z.string().optional(),
  }),
});

export const collections = { lessons };
