#!/usr/bin/env node
/**
 * Lesson Generator — powered by Claude API
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-... node scripts/generate-lesson.js
 *
 * You'll be prompted for:
 *   - Module number and title
 *   - Lesson number and topic/goal
 *   - Optional YouTube video ID
 *   - Estimated duration
 *
 * Output: a ready-to-use .mdx file in src/content/lessons/
 */

import Anthropic from '@anthropic-ai/sdk';
import * as readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LESSONS_DIR = path.join(__dirname, '..', 'src', 'content', 'lessons');

// ── Prompt template (from init-prototype.md) ──────────────────────────────────
const SYSTEM_PROMPT = `You are an expert Educational UX Designer and Technical Curriculum Developer.
Your goal is to write highly engaging, structured, and visually compelling course content for a
custom self-hosted learning platform.

Our core design principle: this site must look and feel like a modern, premium learning application
(e.g., Coursera, Maven, Refactoring UI), NOT a dry developer documentation site.

### Output Format
You MUST output ONLY the MDX body content — no frontmatter, no markdown code fences around the whole output.
Start directly with the first section heading (## ...) or an introductory sentence.

### Visual Components Available
Use these MDX component tags in your output exactly as shown:

<CodeLab title="Your Lab Title">
Step-by-step hands-on instructions. Include real code blocks with triple backticks.
</CodeLab>

<Pitfall title="The Mistake Everyone Makes">
Explain the common error and how to avoid it. Show a wrong vs. correct code example.
</Pitfall>

<Quiz question="Your question here?">
<div>
**The answer in bold**, followed by a clear explanation paragraph.
</div>
</Quiz>

### Copywriting Rules
- No dense walls of prose. Short paragraphs (2-3 sentences max).
- Use action-oriented, encouraging, clear tone.
- Focus on transformation: explain WHY it matters, not just WHAT it is.
- Use subheadings (##, ###) liberally.
- Use tables where helpful for comparisons.
- End with a motivating "Up Next" or closing sentence.

### Structure Required
1. Opening hook — why this lesson matters (2-3 sentences)
2. Core concept explanation with subheadings
3. At least ONE CodeLab block
4. At least ONE Pitfall block
5. At least ONE Quiz block
6. Closing / "Up Next" teaser`;

// ── Helpers ───────────────────────────────────────────────────────────────────
function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function buildFrontmatter({ title, description, module, moduleTitle, lesson, duration, youtubeId }) {
  return [
    '---',
    `title: "${title}"`,
    description ? `description: "${description}"` : null,
    `module: ${module}`,
    `moduleTitle: "${moduleTitle}"`,
    `lesson: ${lesson}`,
    duration ? `duration: "${duration}"` : null,
    youtubeId ? `youtubeId: "${youtubeId}"` : null,
    '---',
    '',
    `import CodeLab from '../../components/CodeLab.astro';`,
    `import Pitfall from '../../components/Pitfall.astro';`,
    `import Quiz from '../../components/Quiz.astro';`,
    '',
  ]
    .filter(l => l !== null)
    .join('\n');
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('❌ ANTHROPIC_API_KEY environment variable is not set.');
    console.error('   Run: ANTHROPIC_API_KEY=sk-... node scripts/generate-lesson.js');
    process.exit(1);
  }

  const rl = readline.createInterface({ input, output });

  console.log('\n🎓 Course Lesson Generator — powered by Claude\n');
  console.log('─'.repeat(50));

  const moduleNum   = await rl.question('Module number (e.g. 1): ');
  const moduleTitle = await rl.question('Module title (e.g. "Getting Started"): ');
  const lessonNum   = await rl.question('Lesson number (e.g. 3): ');
  const lessonTitle = await rl.question('Lesson title (e.g. "Error Handling Patterns"): ');
  const topic       = await rl.question('Lesson topic / goal (be specific): ');
  const duration    = await rl.question('Estimated duration (e.g. "20 min") [optional]: ');
  const youtubeId   = await rl.question('YouTube video ID [optional, press Enter to skip]: ');
  const description = await rl.question('One-sentence learning outcome [optional]: ');

  rl.close();

  console.log('\n⏳ Generating lesson with Claude… this takes ~15-30 seconds.\n');

  const client = new Anthropic({ apiKey });

  const userMessage = `Generate the complete MDX body content for this lesson:

Title: ${lessonTitle}
Topic / Learning Goal: ${topic}
Module: ${moduleNum} — ${moduleTitle}
Lesson: ${lessonNum}
${duration ? `Duration: ${duration}` : ''}

Remember: output ONLY the MDX body (no frontmatter, no wrapping code fences).
Start with the first section heading or opening paragraph.`;

  let body = '';

  // Stream the response
  process.stdout.write('Claude is writing');
  const stream = await client.messages.stream({
    model: 'claude-opus-4-5',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  });

  const dots = setInterval(() => process.stdout.write('.'), 1000);

  for await (const chunk of stream) {
    if (
      chunk.type === 'content_block_delta' &&
      chunk.delta.type === 'text_delta'
    ) {
      body += chunk.delta.text;
    }
  }

  clearInterval(dots);
  console.log(' done!\n');

  // Build the full MDX file
  const frontmatter = buildFrontmatter({
    title: lessonTitle,
    description: description || undefined,
    module: parseInt(moduleNum, 10),
    moduleTitle,
    lesson: parseInt(lessonNum, 10),
    duration: duration || undefined,
    youtubeId: youtubeId || undefined,
  });

  const fullContent = frontmatter + body.trim() + '\n';

  // Write the file
  const filename = `m${moduleNum}-l${lessonNum}-${slugify(lessonTitle)}.mdx`;
  const filepath = path.join(LESSONS_DIR, filename);

  fs.writeFileSync(filepath, fullContent, 'utf8');

  console.log('─'.repeat(50));
  console.log(`✅ Lesson written to:\n   src/content/lessons/${filename}`);
  console.log('\nNext steps:');
  console.log('  1. Review the file and adjust any details');
  console.log('  2. Run: npm run dev');
  console.log(`  3. Visit: http://localhost:4321/courses/lessons/m${moduleNum}-l${lessonNum}-${slugify(lessonTitle)}`);
  console.log('');
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
