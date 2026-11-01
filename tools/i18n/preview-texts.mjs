// The texts of link previews (functions/preview.js) in the languages a shared link can ask for (?hl=), taken from the
// app's own translations so the two say the same. Run after changing those texts, then deploy the function:
//   node tools/i18n/preview-texts.mjs && firebase deploy --only functions:groupPreview
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../../', import.meta.url));
const LANGUAGES = ['ur', 'id', 'ms', 'tr', 'bn'];
// How sentences end, where it isn't ".".
const FULL_STOP = { ur: '۔', bn: '।' };

// The words for juz after a count, as in src/app/languages.ts ({ code: 'ur', … juz: { one: '…', other: '…' } }).
const languagesTs = readFileSync(join(root, 'src/app/languages.ts'), 'utf8');
function juzWords(code) {
  const match = languagesTs.match(new RegExp(`code: '${code}'[^\\n]*juz: \\{ one: '([^']+)', other: '([^']+)' \\}`));
  if (!match) throw new Error(`No juz words for ${code} in src/app/languages.ts`);
  return { one: match[1], other: match[2] };
}

const texts = {};
for (const code of LANGUAGES) {
  const t = JSON.parse(readFileSync(join(root, 'src/assets/translate', `${code}.json`), 'utf8'));
  texts[code] = {
    brand: t.app.title,
    complete: t.shareCard.completeHeadline,
    progress: t.shareCard.progress,
    freeLeft: t.sharing.freeLeft,
    invitation: t.shareCard.juzInvitation,
    allTaken: t.sequential.allTitle,
    join: t.gJoin.join,
    stop: FULL_STOP[code] ?? '.',
    juz: juzWords(code),
  };
}
writeFileSync(join(root, 'functions/preview-texts.json'), JSON.stringify(texts, null, 2) + '\n');
console.log(`functions/preview-texts.json: ${LANGUAGES.join(', ')}`);
