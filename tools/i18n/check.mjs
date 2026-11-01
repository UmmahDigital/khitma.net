// Checks a translation file against the English one, key by key:   node tools/i18n/check.mjs ur
// The text of a language page (tools/landing/content/ur.json):         node tools/i18n/check.mjs ur --landing
// Arabic (ar.json) is the source of every text; English (en.json) has the same keys, so a translation follows it.
// Problems (missing or extra keys, lost placeholders or line breaks, empty texts, Arabic letters in a language that
// doesn't use them) make it exit with 1. Texts still identical to English are listed to review: some rightly stay
// (Khitma.net, WhatsApp), most don't.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../../', import.meta.url));
const ARABIC_SCRIPT = new Set(['ar', 'ur']);
const ARABIC_LETTERS = /[\u0600-\u06FF]/;

function flatten(value, prefix = '', out = []) {
  for (const [key, item] of Object.entries(value)) {
    if (item && typeof item === 'object') {
      flatten(item, `${prefix}${key}.`, out);
    } else {
      out.push([prefix + key, item]);
    }
  }
  return out;
}

// --landing checks a language page's text (tools/landing/content) instead of the app's.
const landing = process.argv.includes('--landing');
const folder = landing ? 'tools/landing/content' : 'src/assets/translate';
const read = (lang) => flatten(JSON.parse(readFileSync(join(root, folder, `${lang}.json`), 'utf8')));
const placeholders = (text) => [...new Set(String(text).match(/\{\w+\}/g) ?? [])].sort().join(' ');
const lineBreaks = (text) => (String(text).match(/\n/g) ?? []).length;

const lang = process.argv[2];
if (!lang) {
  console.error('Usage: node tools/i18n/check.mjs <language code>');
  process.exit(2);
}
// Arabic is the source, not a translation: some of its sentences are built in code (number grammar), so it rightly
// lacks a few English keys and names the khitma with {khitma}.
if (lang === 'ar') {
  console.error('ar.json is the source text; check a translation instead, e.g. node tools/i18n/check.mjs ur');
  process.exit(2);
}

const english = read('en');
const translated = read(lang);
const problems = [];
const sameAsEnglish = [];

const englishKeys = english.map(([key]) => key);
const translatedKeys = translated.map(([key]) => key);
for (const key of englishKeys.filter((key) => !translatedKeys.includes(key))) problems.push(`missing: ${key}`);
for (const key of translatedKeys.filter((key) => !englishKeys.includes(key))) problems.push(`not in en.json: ${key}`);
if (!problems.length && englishKeys.join('\n') !== translatedKeys.join('\n')) problems.push('keys are not in the order of en.json');

const byKey = Object.fromEntries(translated);
for (const [key, source] of english) {
  if (!(key in byKey)) continue;
  const text = byKey[key];
  if (typeof source !== 'string') {
    // Flags such as "loaded": true, kept as they are.
    if (text !== source) problems.push(`${key}: ${JSON.stringify(text)} instead of ${JSON.stringify(source)}`);
    continue;
  }
  if (typeof text !== 'string') {
    problems.push(`${key}: not a text`);
    continue;
  }
  if (String(source).trim() && !text.trim()) problems.push(`${key}: empty`);
  if (placeholders(source) !== placeholders(text)) {
    problems.push(`${key}: placeholders ${placeholders(text) || '(none)'} instead of ${placeholders(source) || '(none)'}`);
  }
  if (lineBreaks(source) !== lineBreaks(text)) problems.push(`${key}: ${lineBreaks(text)} line breaks instead of ${lineBreaks(source)}`);
  if (!ARABIC_SCRIPT.has(lang) && ARABIC_LETTERS.test(text)) problems.push(`${key}: Arabic letters`);
  if (lang !== 'en' && text.trim() && text === source && /[a-z]{3}/i.test(text) && !(landing && key === 'lang')) {
    sameAsEnglish.push(`${key}: ${text}`);
  }
}

for (const line of problems) console.log(`✘ ${line}`);
if (sameAsEnglish.length) {
  console.log(`\nStill as in English (${sameAsEnglish.length}), check each:`);
  for (const line of sameAsEnglish) console.log(`  ${line}`);
}
console.log(problems.length ? `\n${problems.length} problem(s) in ${folder}/${lang}.json` : `\n${folder}/${lang}.json: ${translated.length} texts, no problems`);
process.exit(problems.length ? 1 : 0);
