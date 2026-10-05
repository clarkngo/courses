import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

// Ordered lesson lists per available course, fetched by the catalog's
// "Continue learning" row only when the learner has saved progress.
export const GET: APIRoute = async () => {
  const base = import.meta.env.BASE_URL;
  const courses = await getCollection('courses');
  const lessons = await getCollection('lessons');

  const items = courses
    .filter(c => c.data.status === 'available')
    .map(c => ({
      slug: c.slug,
      title: c.data.title,
      icon: c.data.icon,
      color: c.data.color ?? '#3b63f5',
      href: `${base}${c.slug}/`,
      lessons: lessons
        .filter(l => l.slug.startsWith(c.slug + '/'))
        .sort((a, b) => a.data.module - b.data.module || a.data.lesson - b.data.lesson)
        .map(l => ({
          slug: l.slug,
          title: l.data.title,
          href: `${base}${c.slug}/lessons/${l.slug.slice(c.slug.length + 1)}`,
        })),
    }))
    .filter(c => c.lessons.length > 0);

  return new Response(JSON.stringify(items), {
    headers: { 'Content-Type': 'application/json' },
  });
};
