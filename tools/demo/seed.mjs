// Sample khitmas for the local demo (`npm run demo`), written to the Firestore emulator, never to production.
// Each one is set up to show something that otherwise takes days or many people to reach: bookings a week old, a
// khitma one juz from completion, a weekly round that is due. Dates are relative to now, so the demo always looks
// current, and every `npm run demo` starts from the same state.

const PROJECT_ID = 'demo-khitma';
const EMULATOR = `http://${process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080'}`;
const DOCUMENTS = `${EMULATOR}/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const SITE = 'http://localhost:4201';

const IDLE = 0;
const BOOKED = 1;
const DONE = 2;
const AUTO_BOOK = 1;
const DAY = 86_400_000;

const ARABIC_DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

function toValue(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (typeof value === 'string') return { stringValue: value };
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(toValue) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([key, item]) => [key, toValue(item)])) } };
}

async function setDoc(path, data) {
  const response = await fetch(`${DOCUMENTS}/${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
    body: JSON.stringify({ fields: toValue(data).mapValue.fields }),
  });
  if (!response.ok) {
    throw new Error(`${path}: ${response.status} ${await response.text()}`);
  }
}

const ago = (days) => new Date(Date.now() - days * DAY);

/** YYYY-MM-DD in local time, and its readable Arabic form, as the create form stores a deadline. */
function deadline(daysFromNow) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  const pad = (n) => String(n).padStart(2, '0');
  return {
    targetAt: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    targetDate: `${ARABIC_DAYS[date.getDay()]} ${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`,
  };
}

/** The 30 ajza; `assigned` maps juz numbers (1-30) to [owner, status, days since it changed]. */
function ajza(assigned) {
  return Object.fromEntries(
    Array.from({ length: 30 }, (_, index) => {
      const [owner, status, days] = assigned[index + 1] ?? ['', IDLE, null];
      return [String(index), { index, owner, status, ...(days === null ? {} : { updatedAt: ago(days) }) }];
    })
  );
}

function sequentialGroup(fields) {
  return { description: '', authorId: '', type: 'SEQUENTIAL', cycle: 0, createdAt: ago(10), ...fields };
}

const READERS = ['سارة', 'ليلى', 'محمود', 'يوسف', 'عمر', 'هدى', 'أحمد', 'نور', 'زينب', 'حسن'];

const groups = {
  // Admin tools and member flows on a khitma in progress.
  'demo-family': sequentialGroup({
    title: 'ختمة العائلة',
    author: 'أبو أحمد',
    cycle: 2,
    purpose: 'regular',
    ...deadline(3),
    ajza: ajza({
      1: ['سارة', DONE, 5],
      2: ['خالد', DONE, 4],
      3: ['ليلى', DONE, 3],
      4: ['محمود', DONE, 3],
      5: ['سارة', BOOKED, 9],
      6: ['يوسف', BOOKED, 8],
      7: ['ليلى', BOOKED, 2],
      8: ['أبو أحمد', BOOKED, 0],
    }),
  }),
  // One juz from completion: finishing it shows the completion moment.
  'demo-memorial': sequentialGroup({
    title: 'ختمة عن روح فاطمة رحمها الله',
    author: 'خالد',
    purpose: 'memorial',
    honoreeGender: 'female',
    ...deadline(1),
    ajza: ajza({
      ...Object.fromEntries(Array.from({ length: 29 }, (_, i) => [i + 1, [READERS[i % READERS.length], DONE, 1 + (i % 3)]])),
      30: ['مريم', BOOKED, 1],
    }),
  }),
  // A weekly khitma whose next round is due: the first member to open it starts the round.
  'demo-friday': sequentialGroup({
    title: 'ورد الجمعة',
    author: 'أم علي',
    cycle: 4,
    purpose: 'regular',
    schedule: { every: 'week', weekday: 5, cycleType: AUTO_BOOK },
    nextRoundAt: new Date(Date.now() - 3_600_000),
    ajza: ajza({
      1: ['عمر', DONE, 4],
      2: ['هدى', DONE, 3],
      3: ['أحمد', BOOKED, 6],
      4: ['نور', DONE, 2],
      5: ['زينب', BOOKED, 6],
      6: ['أم علي', DONE, 1],
    }),
  }),
  // A Ramadan khitma, for the "continue weekly after Eid?" question (open it with `npm run demo:browse`).
  'demo-ramadan': sequentialGroup({
    title: 'ختمة رمضان',
    author: 'أبو أحمد',
    purpose: 'ramadan',
    ajza: ajza({
      ...Object.fromEntries(Array.from({ length: 10 }, (_, i) => [i + 1, [READERS[i], DONE, 2]])),
      11: ['سارة', BOOKED, 1],
      12: ['خالد', BOOKED, 1],
      13: ['أبو أحمد', BOOKED, 0],
    }),
  }),
};

for (const [id, group] of Object.entries(groups)) {
  await setDoc(`groups/${id}`, group);
}

// What the Aqsa and Ramadan pages read.
await setDoc('global/aqsa', { pages: { completed: 1250, granted: 1400 } });
await setDoc('global/ramadan2021', {
  totalAjzaCounter: 0,
  ajza: Object.fromEntries(Array.from({ length: 30 }, (_, i) => [String(i), 0])),
  startDate: '2021-04-13',
});
// The Ramadan announcement from tools/ramadan/README.md, to review in place (the bell shows it).
await setDoc('notifications/ramadan', {
  id: 'ramadan',
  isActive: true,
  title: 'ختمات رمضان',
  text:
    'اقترب رمضان. اجمعوا أهلكم وأصدقاءكم على ختم القرآن: ختمة واحدة خلال الشهر، أو ختمة كاملة كل يوم تبدأ وحدها ' +
    'ويتنقّل فيها كل مشارك بين الأجزاء. شاركوا الرابط في مجموعاتكم، ومن دلّ على خير فله مثل أجر فاعله.',
  actions: [
    { text: 'ختمة واحدة خلال رمضان', url: '/new?type=onetime&purpose=ramadan&from=notification_ramadan' },
    { text: 'ختمة كاملة كل يوم', url: '/new?type=recurring&template=ramadan-daily&from=notification_ramadan' },
  ],
});

console.log(`
Sample khitmas are in the Firestore emulator. Once the app is up, open:

  ${SITE}/group/demo-family     continue as «أبو أحمد» (admin) or «سارة» (member)
  ${SITE}/group/demo-memorial   continue as «مريم» and finish juz 30
  ${SITE}/group/demo-friday     continue as anyone: the weekly round that is due starts
  ${SITE}/new?type=onetime      the create form
  ${SITE}/guide/khitma-for-the-deceased/   a guide

See README.md, "Running locally", for what to try on each.
`);
