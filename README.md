# Clark's Courses

A self-paced course platform built with [Astro](https://astro.build), Tailwind CSS, and MDX — deployed on GitHub Pages at [clarkngo.github.io/courses](https://clarkngo.github.io/courses).

## Courses

| Course | Status |
|---|---|
| Impact of AI for First Responders | ✅ Available |
| AWS Certification Guide: From Zero to Certified | ✅ Available |
| Physical AI | 🔒 Coming Soon |
| Digital Twins | 🔒 Coming Soon |
| Secure Agentic AI | 🔒 Coming Soon |
| AI & LLM Skills | 🔒 Coming Soon |
| Web Development | 🔒 Coming Soon |
| Data & Python | 🔒 Coming Soon |
| Soft Skills & Career | 🔒 Coming Soon |

## Stack

- **Framework:** Astro with static output
- **Styling:** Tailwind CSS
- **Content:** MDX lessons with custom components (`Quiz`, `Pitfall`, `CodeLab`, `YouTubeEmbed`)
- **Deployment:** GitHub Pages via `gh-pages` branch

## Local Development

```bash
npm install
npm run dev
```

## Adding a Course

1. Add a course file to `src/content/courses/<slug>.md` with frontmatter (`title`, `description`, `icon`, `color`, `status`, `order`, `audience`).
2. Add lesson files to `src/content/lessons/<slug>/` with frontmatter (`title`, `module`, `moduleTitle`, `lesson`, `duration`).
3. Set `status: "available"` when the course is ready to publish.
