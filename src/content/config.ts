import { defineCollection, z } from 'astro:content';

const courses = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    icon: z.string(),
    color: z.string().optional(),
    status: z.enum(['available', 'coming-soon']).default('coming-soon'),
    order: z.number(),
    audience: z.string().optional(),
  }),
});

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

export const collections = { courses, lessons };
