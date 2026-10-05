// Learner progress, kept in localStorage so it works on a static site.
//   course-progress     { "<course>/<lesson>": "visited" | "complete" }
//   course-last-visited { "<course>": { lesson: "<course>/<lesson>", at: <epoch ms> } }

export type LessonState = 'visited' | 'complete';
export type Progress = Record<string, LessonState>;
export type LastVisited = Record<string, { lesson: string; at: number }>;

const PROGRESS_KEY = 'course-progress';
const LAST_VISITED_KEY = 'course-last-visited';

function read<T>(key: string): T {
  try { return JSON.parse(localStorage.getItem(key) || '{}'); } catch { return {} as T; }
}
function write(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

export const getProgress = () => read<Progress>(PROGRESS_KEY);
export const getLastVisited = () => read<LastVisited>(LAST_VISITED_KEY);

/** Records a lesson as visited (never downgrades a completed lesson). */
export function recordVisit(lessonSlug: string) {
  const progress = getProgress();
  if (!progress[lessonSlug]) {
    progress[lessonSlug] = 'visited';
    write(PROGRESS_KEY, progress);
  }
  const [courseSlug] = lessonSlug.split('/');
  const last = getLastVisited();
  last[courseSlug] = { lesson: lessonSlug, at: Date.now() };
  write(LAST_VISITED_KEY, last);
}

export function markComplete(lessonSlug: string) {
  const progress = getProgress();
  progress[lessonSlug] = 'complete';
  write(PROGRESS_KEY, progress);
}

/**
 * Picks the lesson a learner should resume at, given a course's lessons in order:
 * the last-visited lesson if it isn't finished, otherwise the first unfinished
 * lesson after it (wrapping to the start). Returns null when everything is complete.
 */
export function resumeLesson(courseSlug: string, orderedSlugs: string[]): string | null {
  const progress = getProgress();
  const lastSlug = getLastVisited()[courseSlug]?.lesson;
  const start = Math.max(0, orderedSlugs.indexOf(lastSlug ?? ''));
  for (let i = 0; i < orderedSlugs.length; i++) {
    const slug = orderedSlugs[(start + i) % orderedSlugs.length];
    if (progress[slug] !== 'complete') return slug;
  }
  return null;
}

const STATUS_LABELS: Record<string, string> = {
  'not-started': 'Not started',
  visited: 'In progress',
  complete: 'Completed',
};

/**
 * Syncs every progress-aware element on the page with localStorage:
 * - [data-lesson-slug] elements get data-status and a screen-reader label
 * - each [data-progress-scope] gets its [data-progress-bar] / [data-progress-label]
 *   filled from the lessons inside that scope
 */
export function refreshProgressUI(root: ParentNode = document) {
  const progress = getProgress();

  root.querySelectorAll<HTMLElement>('[data-lesson-slug]').forEach(el => {
    const status = progress[el.dataset.lessonSlug!] ?? 'not-started';
    el.dataset.status = status;
    const label = el.querySelector('.status-label');
    if (label) label.textContent = STATUS_LABELS[status];
  });

  root.querySelectorAll<HTMLElement>('[data-progress-scope]').forEach(scope => {
    const lessons = scope.querySelectorAll<HTMLElement>('[data-lesson-slug]');
    const done = [...lessons].filter(el => el.dataset.status === 'complete').length;
    const pct = lessons.length ? Math.round((done / lessons.length) * 100) : 0;
    scope.querySelectorAll<HTMLElement>('[data-progress-bar]').forEach(bar => { bar.style.width = `${pct}%`; });
    scope.querySelectorAll<HTMLElement>('[data-progress-label]').forEach(label => {
      label.textContent = label.dataset.progressLabel === 'count'
        ? `${done} of ${lessons.length} complete`
        : `${pct}%`;
    });
  });
}
