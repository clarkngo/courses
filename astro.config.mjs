import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import mdx from '@astrojs/mdx';

export default defineConfig({
  site: 'https://clarkngo.github.io',
  base: '/courses/',
  integrations: [
    tailwind({ applyBaseStyles: false }),
    mdx(),
  ],
});
