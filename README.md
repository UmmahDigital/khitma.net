# Khitma

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 11.0.6 and now runs on Angular 22.
It needs Node.js 24 LTS (24.15+, or 22.22.3+; Angular 22 rejects Node 25); the local demo and the end-to-end tests also need Java 21+ for the Firestore emulator.

## Running locally

On a Mac with Homebrew (both packages are keg-only, so add the `export` line to `~/.zshrc` to keep it):

```sh
brew install node@24 openjdk@21
export PATH="/opt/homebrew/opt/node@24/bin:/opt/homebrew/opt/openjdk@21/bin:$PATH"
npm ci
```

### With sample khitmas (nothing touches production)

`npm run demo` starts the Firestore emulator, fills it with sample khitmas, and serves the app against it at http://localhost:4201. It reloads as you edit. Stop it with Ctrl+C; every start begins again from the same samples.

Open a sample khitma and tap a name under «انضممت من قبل؟ اختر اسمك…» to be that person. Use a private window to be a second person at the same time.

| Open | As | To see |
|---|---|---|
| `/group/demo-family` | «أبو أحمد», the admin | booking ages in the names list; in the admin tools, «إتاحة المحجوز منذ أسبوع أو أكثر (2)» and «تكرار الختمة تلقائيًا»; tapping a booked juz; the countdown and the help-finish card |
| `/group/demo-family` | «سارة» | «أتممت قراءة جزء 5»: the next free juz is offered, with an image for WhatsApp Status |
| `/group/demo-memorial` | «مريم» | finishing juz 30 completes the khitma: the supplication for the deceased, a Status image, «ابدأ ختمة جديدة» |
| `/group/demo-friday` | anyone, e.g. «عمر» | its weekly round was due, so opening it starts the next one: everyone moves to their next juz |
| `/new?type=onetime` | | the purpose question, memorial titles, the deadline |
| `/guide/khitma-for-the-deceased/` | | the guides |

- **Invitations:** open `/group/demo-family/invite` and press «نسخ الرسالة». Open the link from the copied message (it ends in `?r=…`) in a private window, join with a new name and finish a juz; back in the first window, the home page shows «أثر دعواتك».
- **Another date:** while the demo runs, `npm run demo:browse -- 2027-02-20` opens it in a phone-sized browser whose clock reads that date, so the home page offers the Ramadan khitmas. `npm run demo:browse -- 2027-03-01 /group/demo-ramadan`, as «أبو أحمد», shows the "continue weekly after Eid?" question. The browser needs `npx playwright install chromium` once.
- **The bell** shows the Ramadan announcement from `tools/ramadan/README.md`, to review in place.
- Stop the demo before `npm run e2e`: the tests reuse its emulator and clear it.

### Against the real database

`npm start` (`ng serve`) serves the app at https://localhost:4200 (a self-signed certificate) against the **production** Firestore: anything you create or change there is real. Analytics are off. The app reloads as you edit.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `npm run build:prod` for a production build. The build artifacts will be stored in `dist/khitma`, which Firebase Hosting serves.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io), or `npm run test:ci` for a single headless run.

## Running end-to-end tests

The end-to-end tests use [Playwright](https://playwright.dev) against a local Firestore emulator (no real data is touched):

1. `npm run e2e:build` builds the app for the emulator into `dist/khitma-e2e`.
2. `npm run e2e` starts the emulator and a static server, then runs two projects:
   - `mobile-chromium`: every behavior test plus screenshot comparisons of the current design;
   - `oldest-supported-browser`: the behavior tests again, with Chromium made to act like the oldest phones in `.browserslistrc` (iOS 14.5, and Chromium 79 for Samsung Internet 12 and old Android WebViews).

The tests use a roomy phone (390×844). `e2e/tests/small-screens.spec.ts` also opens the pages and dialogs on phones with fewer CSS pixels: set to large text (360×595), to the largest display size (320×560), and held sideways (740×340). Pages may not scroll sideways there, and every dialog button must be on the screen.

Screenshot baselines exist for macOS only (`e2e/tests/__screenshots__/darwin`), so CI skips them. After an intended design change, review the diffs and run `npm run e2e:update-screenshots`.

### Checking a real old browser

The simulated old browser cannot catch JavaScript syntax that old engines fail to parse (the Chromium in Playwright understands everything). Before changing `.browserslistrc` or upgrading Angular, also run the main flows in a real Chromium 79, the engine of Samsung Internet 12:

1. Download and unzip `https://storage.googleapis.com/chromium-browser-snapshots/Mac/706915/chrome-mac.zip` (Linux: `Linux_x64/706915/chrome-linux.zip`).
2. Run `OLD_CHROMIUM=/path/to/chrome-mac/Chromium.app/Contents/MacOS/Chromium OLD_CHROMIUM_X64=1 npm run e2e -- --project=mobile-chromium real-old-browser`. `OLD_CHROMIUM_X64=1` runs this Intel-only build through Rosetta on Apple Silicon; leave it out elsewhere. Screenshots of each screen are saved under `e2e/.results`.

## Tools

- `node tools/metrics/weekly-report.mjs`: the weekly numbers, read-only from Firestore: groups created, first-khitma completion, groups with no juz booked, repeat rate, active recurring groups; where new juz groups stop on the way to their first khitma (a juz booked, a second name, half read, 27 of 30, completed, stalled near the end); and one-time against recurring khitmas, by how they were created. It needs a `gcloud` login that can read the project, and prints counts only, never names or titles.
- `node tools/icons/update-icon-font.mjs`: rebuilds the small icon font after an icon is added to a template (`e2e/tests/icons.spec.ts` checks it).
- `node tools/og-images/render.mjs`: renders the link-preview images in `src/assets/og/` from the HTML templates in `tools/og-images/`.
- `tools/ramadan/README.md`: the Ramadan announcement (an in-app notification to add in Firestore, and a WhatsApp message), to publish by hand in mid-Sha'ban.
- `tools/demo/`: the local demo's sample khitmas (`seed.mjs`) and the date-changing browser (`browse.mjs`); see "Running locally".

## Reports from people's phones

Problems on people's phones reach Google Analytics as events (`src/app/field-reports.ts`), without names or titles:

- `app_error`: an error the app didn't handle, with `error_message` (anything not in English, such as a name in it, becomes `…`), `error_where` (file and position) and `error_source` (`angular`, `window` or `promise`). Each error is sent once, and at most five per page.
- `dialog_offscreen`: a dialog whose buttons reach outside the screen, with `dialog` (its component, e.g. `app-start-new-khitma`), `overflow_px`, `viewport` and `root_font_px`.

To see the parameters in GA4's reports, register them once as event-scoped custom dimensions (Admin → Custom definitions).

## Backups

Firestore keeps, for project `quran-khitma`:

- point-in-time recovery: the database as it was at any minute of the last 7 days;
- a backup every day, kept 7 days, and every Sunday, kept 14 weeks (`gcloud firestore backups list --location=nam5 --project=quran-khitma`);
- delete protection on the database.

To put groups back as they were before a bad write (vandalism, a broken release), within 7 days: export them as they were at a minute before it, then import that export. Documents with the same IDs are overwritten; groups created since are kept. The bucket must be in the database's location (nam5, in the US).

```sh
gcloud firestore export gs://BUCKET/restore-1 --collection-ids=groups --snapshot-time=2026-11-01T06:00:00Z --project=quran-khitma
gcloud firestore import gs://BUCKET/restore-1 --collection-ids=groups --project=quran-khitma
```

Further back, restore a backup into a new database, then export from it and import into `(default)` the same way:
`gcloud firestore databases restore --source-backup=projects/quran-khitma/locations/nam5/backups/BACKUP_ID --destination-database=restored --project=quran-khitma`.

## Link previews

Shared group links (`/group/{id}`) are answered by a small Cloud Function (`functions/`): it returns the app's
`index.html` with the khitma's title and progress in its preview tags, marked `noindex` (see `functions/preview.js`).
Firebase Hosting sends those links to it (`firebase.json` rewrites), and its CDN keeps each answer for 5 minutes and
purges it on every deploy.

- The function revalidates `index.html` on every request (an ETag check), because a copy from before a deploy would name
  bundles that no longer exist. It reads it from the site the visitor used, so preview channels work too
  (`functions/shell.js`).
- If Firestore can't be read, the page goes out without the khitma's tags; if `index.html` can't be fetched, the last
  copy is used, or the page reloads itself after two seconds.
- One instance is kept warm (`minInstances: 1` in `functions/index.js`, about $8 a month), so people opening a shared
  link don't wait for a cold start. Set it to 0 to drop the cost.
- Deploy the function before Hosting starts pointing at it:
  `cd functions && npm ci && cd .. && firebase deploy --only functions:groupPreview --project quran-khitma`.
  CI deploys Hosting only, so a change in `functions/` is deployed by hand the same way.
- Tests: `cd functions && npm test`.
- Locally: `echo SITE_ORIGIN=http://127.0.0.1:5000 > functions/.env.local`, then
  `firebase emulators:start --only hosting,functions,firestore --project demo-khitma` and open `/group/{id}`.

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.io/cli) page.
