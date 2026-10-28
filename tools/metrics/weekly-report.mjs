// Weekly numbers from Firestore, for the goals in the growth plan. Read-only; prints counts and percentages only,
// never names or titles.
//
//   node tools/metrics/weekly-report.mjs            # Markdown
//   node tools/metrics/weekly-report.mjs --json     # one JSON object, e.g. to keep a history
//
// Needs read access to the project: it uses `gcloud auth print-access-token` (be logged in with an account that can
// read Firestore), or a token in FIRESTORE_TOKEN. Each run reads every group once (about 25,000 reads: a few cents).

import { execFileSync } from 'node:child_process';

const PROJECT = process.env.FIRESTORE_PROJECT || 'quran-khitma';
const DAY = 24 * 60 * 60 * 1000;
const asJson = process.argv.includes('--json');

const token = process.env.FIRESTORE_TOKEN || execFileSync('gcloud', ['auth', 'print-access-token'], { encoding: 'utf8' }).trim();
const base = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/groups`;
const fields = ['type', 'cycle', 'ajza', 'members', 'completedRounds'];

async function* groups() {
  let pageToken = '';
  do {
    const query = new URLSearchParams({ pageSize: '1000' });
    for (const field of fields) query.append('mask.fieldPaths', field);
    if (pageToken) query.set('pageToken', pageToken);
    const response = await fetch(`${base}?${query}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) throw new Error(`Firestore: ${response.status} ${await response.text()}`);
    const page = await response.json();
    yield* page.documents ?? [];
    pageToken = page.nextPageToken ?? '';
  } while (pageToken);
}

const int = (value) => Number(value?.integerValue ?? 0);

/** One group, reduced to what the report needs. */
function summarize(doc) {
  const f = doc.fields ?? {};
  const type = f.type?.stringValue || 'SEQUENTIAL';
  const cycle = int(f.cycle);
  const completedAt = Object.values(f.completedRounds?.mapValue?.fields ?? {}).map((v) => Date.parse(v.timestampValue));
  let done = 0;
  const names = new Set();
  if (type === 'SEQUENTIAL') {
    const ajza = f.ajza?.mapValue?.fields
      ? Object.values(f.ajza.mapValue.fields)
      : f.ajza?.arrayValue?.values ?? [];
    for (const juz of ajza) {
      const j = juz.mapValue?.fields ?? {};
      const status = int(j.status);
      if (status === 2) done += 1;
      if (status !== 0 && j.owner?.stringValue) names.add(j.owner.stringValue.trim());
    }
  } else {
    for (const name of Object.keys(f.members?.mapValue?.fields ?? {})) names.add(name);
  }
  return {
    type,
    cycle,
    created: Date.parse(doc.createTime),
    updated: Date.parse(doc.updateTime),
    completedAt,
    names: names.size,
    completed: cycle >= 1 || done === 30 || completedAt.length > 0,
  };
}

const pct = (part, whole) => (whole ? Math.round((part / whole) * 1000) / 10 : null);
const median = (values) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
};

const now = Date.now();
const all = [];
for await (const doc of groups()) all.push(summarize(doc));
const juz = all.filter((g) => g.type === 'SEQUENTIAL');
const createdBetween = (list, fromDaysAgo, toDaysAgo) =>
  list.filter((g) => g.created <= now - fromDaysAgo * DAY && g.created > now - toDaysAgo * DAY);

const thisWeek = createdBetween(all, 0, 7);
const month = createdBetween(juz, 30, 37);
const week = createdBetween(juz, 7, 14);
const repeatable = createdBetween(juz, 30, 90).filter((g) => g.completed);
const roundsThisWeek = all.flatMap((g) => g.completedAt).filter((t) => t > now - 7 * DAY).length;
const recordsRounds = all.some((g) => g.completedAt.length > 0);
const types = ['SEQUENTIAL', 'SAME_TASK', 'PAGES_DISTRIBUTION'];

const report = {
  date: new Date(now).toISOString().slice(0, 10),
  groups_total: all.length,
  created_last_7_days: thisWeek.length,
  created_last_7_days_by_type: Object.fromEntries(types.map((t) => [t, thisWeek.filter((g) => g.type === t).length])),
  active_last_7_days: all.filter((g) => g.updated > now - 7 * DAY).length,
  rounds_completed_last_7_days: recordsRounds ? roundsThisWeek : null,
  cohort_30_37_days: {
    groups: month.length,
    completed_first_khitma_pct: pct(month.filter((g) => g.completed).length, month.length),
    no_juz_booked_pct: pct(month.filter((g) => g.names === 0).length, month.length),
    median_names: median(month.map((g) => g.names)),
  },
  cohort_7_14_days: {
    groups: week.length,
    no_juz_booked_pct: pct(week.filter((g) => g.names === 0).length, week.length),
  },
  repeat_pct_of_completed_30_90_days: pct(repeatable.filter((g) => g.cycle >= 1).length, repeatable.length),
  active_recurring_groups: juz.filter((g) => g.cycle >= 2 && g.updated > now - 30 * DAY).length,
};

if (asJson) {
  console.log(JSON.stringify(report));
} else {
  const c30 = report.cohort_30_37_days;
  const byType = report.created_last_7_days_by_type;
  console.log(`# Khitma.net weekly numbers, ${report.date}

| Metric | Value |
|---|---|
| Groups created in the last 7 days | ${report.created_last_7_days} (juz ${byType.SEQUENTIAL}, same task ${byType.SAME_TASK}, pages ${byType.PAGES_DISTRIBUTION}) |
| Groups with any activity in the last 7 days | ${report.active_last_7_days} |
| Khitma rounds completed in the last 7 days | ${report.rounds_completed_last_7_days ?? 'not recorded yet (needs the timestamps release)'} |
| Juz groups created 30-37 days ago | ${c30.groups} |
| ... that finished their first khitma | ${c30.completed_first_khitma_pct}% |
| ... that never had a juz booked | ${c30.no_juz_booked_pct}% |
| ... median names | ${c30.median_names} |
| Juz groups created 7-14 days ago with no juz booked | ${report.cohort_7_14_days.no_juz_booked_pct}% of ${report.cohort_7_14_days.groups} |
| Finished groups (created 30-90 days ago) that started another khitma | ${report.repeat_pct_of_completed_30_90_days}% |
| Active recurring groups (2+ rounds, active in the last 30 days) | ${report.active_recurring_groups} |`);
}
