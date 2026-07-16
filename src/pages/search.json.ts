import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

export const GET: APIRoute = async () => {
  const base = import.meta.env.BASE_URL;
  const courses = await getCollection('courses');
  const lessons = await getCollection('lessons');

  const courseBySlug = new Map(courses.map(c => [c.slug, c.data]));
  const availableSlugs = new Set(
    courses.filter(c => c.data.status === 'available').map(c => c.slug)
  );

  const courseItems = courses
    .filter(c => c.data.status === 'available')
    .map(c => ({
      type: 'course' as const,
      title: c.data.title,
      subtitle: c.data.audience ?? 'Course',
      description: c.data.description,
      icon: c.data.icon,
      url: `${base}${c.slug}/`,
    }));

  const lessonItems = lessons
    .filter(l => {
      const [courseSlug] = l.slug.split('/');
      return availableSlugs.has(courseSlug);
    })
    .map(l => {
      const [courseSlug, ...rest] = l.slug.split('/');
      const lessonSlug = rest.join('/');
      const course = courseBySlug.get(courseSlug);
      return {
        type: 'lesson' as const,
        title: l.data.title,
        subtitle: course?.title ?? courseSlug,
        description: l.data.description ?? '',
        icon: course?.icon ?? '📘',
        url: `${base}${courseSlug}/lessons/${lessonSlug}`,
      };
    });

  const items = [...courseItems, ...lessonItems];

  return new Response(JSON.stringify(items), {
    headers: { 'Content-Type': 'application/json' },
  });
};
