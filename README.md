# Khitma

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 11.0.6 and now runs on Angular 22.
It needs Node.js 24 LTS (or 22.22.3+); the end-to-end tests also need Java 21+ for the Firestore emulator.

## Development server

Run `ng serve` for a dev server. Navigate to `https://localhost:4200/` (the dev server uses a self-signed certificate). The app will automatically reload if you change any of the source files.

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
   - `oldest-supported-browser`: the behavior tests again, with Chromium made to act like the oldest phones in `.browserslistrc` (iOS 14.5).

Screenshot baselines exist for macOS only (`e2e/tests/__screenshots__/darwin`), so CI skips them. After an intended design change, review the diffs and run `npm run e2e:update-screenshots`.

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.io/cli) page.
