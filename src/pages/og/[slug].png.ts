import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import sharp from 'sharp';

// Social preview cards (1200×630 PNG) generated at build time: one per available
// course, plus `default` for the catalog. Drawn as SVG and rasterised by sharp, so
// no network or browser is needed. Text uses the system sans-serif.

const WIDTH = 1200;
const HEIGHT = 630;
const SITE_NAME = "Clark's Courses";

type Card = { title: string; kicker: string; footer: string; color: string };

export const getStaticPaths: GetStaticPaths = async () => {
  const courses = (await getCollection('courses')).filter(c => c.data.status === 'available');
  const lessons = await getCollection('lessons');

  const coursePaths = courses.map(c => {
    const count = lessons.filter(l => l.slug.startsWith(c.slug + '/')).length;
    return {
      params: { slug: c.slug },
      props: {
        title: c.data.title,
        kicker: c.data.category,
        footer: `${count} free lesson${count === 1 ? '' : 's'} · Self-paced`,
        color: c.data.color ?? '#3b63f5',
      } satisfies Card,
    };
  });

  return [
    ...coursePaths,
    {
      params: { slug: 'default' },
      props: {
        title: 'Skills That Move the World Forward',
        kicker: `${courses.length} free courses on AI and modern technology`,
        footer: 'Self-paced · Built for complete beginners',
        color: '#2447e0',
      } satisfies Card,
    },
  ];
};

const escapeXml = (s: string) =>
  s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]!));

/** Mixes a hex colour toward black so white text on it stays readable. */
function darken(hex: string, amount: number) {
  const n = parseInt(hex.slice(1), 16);
  const channel = (shift: number) => Math.round(((n >> shift) & 255) * (1 - amount));
  return `rgb(${channel(16)}, ${channel(8)}, ${channel(0)})`;
}

/** Greedy word wrap using an average glyph width estimate. */
function wrap(text: string, maxChars: number) {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    if (line && (line + ' ' + word).length > maxChars) { lines.push(line); line = word; }
    else line = line ? `${line} ${word}` : word;
  }
  if (line) lines.push(line);
  return lines;
}

function renderSvg({ title, kicker, footer, color }: Card) {
  const fontSize = title.length > 48 ? 60 : 76;
  const maxChars = Math.floor(1040 / (fontSize * 0.56));
  let lines = wrap(title, maxChars);
  if (lines.length > 3) lines = [...lines.slice(0, 2), lines.slice(2).join(' ').slice(0, maxChars - 1) + '…'];
  const lineHeight = fontSize * 1.15;
  const titleTop = 300 - ((lines.length - 1) * lineHeight) / 2;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${darken(color, 0.3)}"/>
      <stop offset="1" stop-color="${darken(color, 0.55)}"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  <circle cx="1080" cy="80" r="260" fill="#fff" fill-opacity="0.06"/>
  <circle cx="1150" cy="560" r="170" fill="#fff" fill-opacity="0.05"/>
  <g font-family="'Plus Jakarta Sans', 'Helvetica Neue', Helvetica, 'DejaVu Sans', Arial, sans-serif" fill="#fff">
    <text x="80" y="120" font-size="28" font-weight="600" fill-opacity="0.8" letter-spacing="2">${escapeXml(kicker.toUpperCase())}</text>
    ${lines.map((l, i) => `<text x="80" y="${titleTop + i * lineHeight}" font-size="${fontSize}" font-weight="700">${escapeXml(l)}</text>`).join('\n    ')}
    <rect x="80" y="500" width="56" height="56" rx="12" fill="#fff"/>
    <text x="108" y="539" font-size="30" font-weight="700" fill="${darken(color, 0.3)}" text-anchor="middle">C</text>
    <text x="156" y="524" font-size="28" font-weight="700">${escapeXml(SITE_NAME)}</text>
    <text x="156" y="556" font-size="22" fill-opacity="0.75">${escapeXml(footer)}</text>
  </g>
</svg>`;
}

export const GET: APIRoute = async ({ props }) => {
  const png = await sharp(Buffer.from(renderSvg(props as Card))).png().toBuffer();
  return new Response(png, { headers: { 'Content-Type': 'image/png' } });
};
