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
const fields = ['type', 'cycle', 'ajza', 'members', 'completedRounds', 'purpose', 'schedule'];

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
  // How the group was created: recurring groups get the purpose "regular"; one-time ones the purpose picked
  // (memorial, healing…); groups from before purposes existed have none.
  const purpose = f.purpose?.stringValue || '';
  return {
    type,
    cycle,
    created: Date.parse(doc.createTime),
    updated: Date.parse(doc.updateTime),
    completedAt,
    names: names.size,
    done,
    createdAs: purpose === 'regular' ? 'recurring' : purpose ? 'one_time' : 'unknown',
    scheduled: Boolean(f.schedule?.mapValue),
    completed: cycle >= 1 || done === 30 || completedAt.length > 0,
  };
}

const pct = (part, whole) => (whole ? Math.round((part / whole) * 1000) / 10 : null);
const shown = (percent) => (percent === null ? '–' : `${percent}%`);
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

// Where new juz groups stop on the way to their first completed khitma. A group that completed one, or started
// another round, passed every step.
const reached = (g, ajzaDone) => g.completed || g.done >= ajzaDone;
const daysToComplete = month
  .filter((g) => g.completedAt.length)
  .map((g) => Math.round(((Math.min(...g.completedAt) - g.created) / DAY) * 10) / 10)
  .filter((days) => days >= 0);
const funnel = {
  groups: month.length,
  any_juz_booked_pct: pct(month.filter((g) => g.names >= 1 || g.completed).length, month.length),
  two_or_more_names_pct: pct(month.filter((g) => g.names >= 2).length, month.length),
  half_read_pct: pct(month.filter((g) => reached(g, 15)).length, month.length),
  read_27_pct: pct(month.filter((g) => reached(g, 27)).length, month.length),
  completed_pct: pct(month.filter((g) => g.completed).length, month.length),
  stalled_near_end_pct: pct(month.filter((g) => !g.completed && g.done >= 26 && g.updated < now - 7 * DAY).length, month.length),
  // Only rounds completed since completion times are recorded.
  median_days_to_complete: median(daysToComplete),
};

// One-time and recurring khitmas, by how they were created (purposes are recorded since 2026-10-29), over a longer
// window for steadier numbers; two weeks is enough for most one-time khitmas to finish.
const older = createdBetween(juz, 14, 90);
const createdAs = Object.fromEntries(
  ['one_time', 'recurring', 'unknown'].map((kind) => {
    const list = older.filter((g) => g.createdAs === kind);
    return [
      kind,
      {
        groups: list.length,
        completed_pct: pct(list.filter((g) => g.completed).length, list.length),
        two_or_more_names_pct: pct(list.filter((g) => g.names >= 2).length, list.length),
        another_round_pct: pct(list.filter((g) => g.cycle >= 1).length, list.length),
        scheduled_pct: pct(list.filter((g) => g.scheduled).length, list.length),
      },
    ];
  })
);

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
  funnel_30_37_days: funnel,
  created_as_14_90_days: createdAs,
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
| Active recurring groups (2+ rounds, active in the last 30 days) | ${report.active_recurring_groups} |

## Where new juz groups stop (created 30-37 days ago)

| Step | Groups |
|---|---|
| Created | ${funnel.groups} |
| A juz booked | ${funnel.any_juz_booked_pct}% |
| Two or more names | ${funnel.two_or_more_names_pct}% |
| Half the khitma read | ${funnel.half_read_pct}% |
| 27 of 30 ajza read | ${funnel.read_27_pct}% |
| First khitma completed | ${funnel.completed_pct}% |
| Stalled near the end (26+ read, nothing changed for a week) | ${funnel.stalled_near_end_pct}% |
| Median days to complete | ${funnel.median_days_to_complete ?? 'not recorded yet'} |

## One-time and recurring (juz groups created 14-90 days ago)

| Created as | Groups | Completed | Two or more names | Started another round | Set a schedule |
|---|---|---|---|---|---|
${[
  ['One-time', createdAs.one_time],
  ['Recurring', createdAs.recurring],
  ['Before purposes existed', createdAs.unknown],
]
  .map(([label, k]) => `| ${label} | ${k.groups} | ${shown(k.completed_pct)} | ${shown(k.two_or_more_names_pct)} | ${shown(k.another_round_pct)} | ${shown(k.scheduled_pct)} |`)
  .join('\n')}`);
}
