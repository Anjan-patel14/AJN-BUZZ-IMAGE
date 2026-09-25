import fs from 'node:fs';
const route = fs.readFileSync('src/app/api/ajn-bot/route.ts','utf8');
const bot = fs.readFileSync('src/components/AjnBot.tsx','utf8');
const shell = fs.readFileSync('src/components/Shell.tsx','utf8');
const env = fs.readFileSync('.env.local.example','utf8');
for (const [name, text, needles] of [
  ['bot route', route, ['GEMINI_API_KEY','responseMimeType','responseSchema','TOOL_CATALOG']],
  ['bot UI', bot, ['Ask AJN Bot','Run this task','processImage','compressImage']],
  ['navigation', shell, ['/bot','AJN Bot']],
  ['env example', env, ['GEMINI_API_KEY=','GEMINI_MODEL=']],
]) for (const needle of needles) if (!text.includes(needle)) throw new Error(`${name}: missing ${needle}`);
if (/GEMINI_API_KEY\s*[:=]\s*['\"]\S+['\"]/i.test(route)) throw new Error('A hardcoded Gemini API key was embedded in source.');
if (/NEXT_PUBLIC_GEMINI_API_KEY/i.test(route) || /NEXT_PUBLIC_GEMINI_API_KEY/i.test(bot)) throw new Error('Gemini API key must never use NEXT_PUBLIC_.');
console.log('AJN Bot source contract: PASS');
