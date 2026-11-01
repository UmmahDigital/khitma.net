import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { getDoc } from '../support/firestore';
import { createSameTaskGroup, createSequentialGroup, JUZ_STATUS, newGroupId } from '../support/fixtures';
import { RealBrowser } from '../support/real-browser';

// Opt-in: the main flows in a real old Chromium. Unlike the simulated old browser, it catches
// JavaScript syntax that old engines cannot parse. See README for how to run it.
const EXECUTABLE = process.env.OLD_CHROMIUM;
const ORIGIN = 'http://localhost:4300';
const ADMIN = 'أبو أحمد';
const { BOOKED, DONE } = JUZ_STATUS;

const joined = (entries: Record<string, string>) =>
  Object.fromEntries(Object.entries(entries).map(([id, username], i) => [id, { isJoined: true, username, joinTimestamp: 1_700_000_000_000 + i }]));

async function juz(groupId: string, n: number) {
  const ajza = (await getDoc(`groups/${groupId}`))!.ajza;
  const j = Array.isArray(ajza) ? ajza[n - 1] : ajza[String(n - 1)];
  return [j.owner ?? '', j.status];
}

test.skip(!EXECUTABLE, 'set OLD_CHROMIUM to an old Chromium executable to run this check');

test('main flows in a real old Chromium', async () => {
  test.setTimeout(300_000);
  const shots = test.info().outputPath('screens');
  mkdirSync(shots, { recursive: true });
  const b = await RealBrowser.launch(EXECUTABLE!, { port: 9300, x64: process.env.OLD_CHROMIUM_X64 === '1' });
  test.info().annotations.push({ type: 'browser', description: b.version });
  const step = (name: string, body: () => Promise<void>) =>
    test.step(name, async () => {
      b.errors.length = 0;
      try {
        await body();
      } catch (error) {
        await b.screenshot(join(shots, 'failure.png')).catch(() => {});
        throw new Error(`${(error as Error).message}; page errors: ${JSON.stringify(b.errors)}`);
      }
      expect(b.errors.filter((e) => e.startsWith('uncaught')), 'uncaught page errors').toEqual([]);
    });

  const seq = newGroupId('real-seq');
  const same = newGroupId('real-same');
  const rewind = newGroupId('real-rewind');
  await createSequentialGroup(seq, { title: 'ختمة الحيّ', author: ADMIN, assigned: { 1: { owner: ADMIN, status: DONE } } });
  await createSameTaskGroup(same, { author: ADMIN, members: { [ADMIN]: false, 'سارة': false } });
  await createSequentialGroup(rewind, {
    author: ADMIN,
    cycle: 2,
    assigned: { 1: { owner: 'سارة', status: BOOKED }, 2: { owner: 'خالد', status: BOOKED }, 3: { owner: ADMIN, status: DONE } },
  });

  try {
    await step('home lists the groups saved on the phone', async () => {
      await b.open(ORIGIN, '/', { groups: joined({ [seq]: 'سارة', [same]: 'سارة' }) });
      await b.see('#ayat-count .main-counter');
      await b.see('a', 'ختمة الحيّ');
      await b.see('a', 'ورد يومي');
      await b.screenshot(join(shots, 'home.png'));
    });

    await step('a member books a juz', async () => {
      await b.open(ORIGIN, `/group/${seq}`, { groups: joined({ [seq]: 'سارة' }) });
      await b.see('body', 'السلام عليكم يا سارة');
      await b.screenshot(join(shots, 'dashboard.png'));
      await b.evaluate(`document.querySelectorAll('app-juz-grid app-juz-toggle')[4].click()`);
      await expect.poll(() => juz(seq, 5), { timeout: 15_000 }).toEqual(['سارة', BOOKED]);
      await b.see('button', 'أتممت قراءة جزء 5');
    });

    await step('and finishes it through the confirm dialog', async () => {
      await b.click('button', 'أتممت قراءة جزء 5');
      await b.see('mat-dialog-container');
      await new Promise((r) => setTimeout(r, 600));
      await b.screenshot(join(shots, 'confirm-dialog.png'));
      const overlay = await b.evaluate(`[getComputedStyle(document.querySelector('.cdk-overlay-container')).zIndex,
        getComputedStyle(document.querySelector('.cdk-overlay-backdrop')).backgroundColor]`);
      expect(overlay).toEqual(['1000', 'rgba(0, 0, 0, 0.32)']);
      await b.click('mat-dialog-container button', 'نعم، أتممته');
      await expect.poll(() => juz(seq, 5), { timeout: 15_000 }).toEqual(['سارة', DONE]);
    });

    await step('the admin rewinds the khitmah', async () => {
      await b.open(ORIGIN, `/group/${rewind}`, { groups: joined({ [rewind]: ADMIN }) });
      await b.clickText('أدوات مسؤول المجموعة');
      await b.click('button', 'بدء الختمة التالية');
      await b.see('mat-dialog-container mat-radio-button', 'حجز الجزء السابق لكل عضو');
      await new Promise((r) => setTimeout(r, 600));
      await b.screenshot(join(shots, 'new-khitmah-dialog.png'));
      await b.evaluate(`[...document.querySelectorAll('mat-radio-button')].find((r) => r.textContent.includes('حجز الجزء السابق')).querySelector('input').click()`);
      await b.click('mat-dialog-container button', 'بدء');
      await expect
        .poll(async () => [(await getDoc(`groups/${rewind}`))!.cycle, await juz(rewind, 30), await juz(rewind, 1), await juz(rewind, 2)], { timeout: 15_000 })
        .toEqual([1, ['سارة', BOOKED], ['خالد', BOOKED], [ADMIN, BOOKED]]);
    });

    await step('a same-task member checks off the task', async () => {
      await b.open(ORIGIN, `/group/${same}`, { groups: joined({ [same]: 'سارة' }) });
      await b.click('app-todo label.todo');
      await expect.poll(async () => (await getDoc(`groups/${same}`))!.members['سارة'].isTaskDone, { timeout: 15_000 }).toBe(true);
      await b.screenshot(join(shots, 'same-task.png'));
    });

    await step('someone creates a group and reaches the invite page', async () => {
      await b.open(ORIGIN, '/');
      await b.click('a', 'إنشاء مجموعة ختمة دوريّة');
      await b.fill('عنوان الختمة', 'ختمة الجمعة');
      await b.fill('اسمك (مسؤول المجموعة)', 'أبو محمد');
      await b.screenshot(join(shots, 'create.png'));
      await b.click('button', 'إنشاء مجموعة الختمة');
      await b.waitFor(`/^\\/group\\/[^/]+\\/invite$/.test(location.pathname)`, 'the invite page');
      await b.see('textarea');
      // The QR code's encoder loads on its own, as a separate chunk.
      await b.see('app-qr-code svg path');
      await b.screenshot(join(shots, 'invite.png'));
    });

    await step('the big screen shows the ajza as they change', async () => {
      await b.open(ORIGIN, `/group/${seq}/screen`);
      await b.see('.juz-cell', 'سارة');
      await b.see('.screen-qr svg path');
      await createSequentialGroup(seq, {
        title: 'ختمة الحيّ',
        author: ADMIN,
        assigned: { 1: { owner: ADMIN, status: DONE }, 5: { owner: 'سارة', status: DONE }, 9: { owner: 'ليلى', status: BOOKED } },
      });
      await b.see('.juz-cell', 'ليلى');
      await b.screenshot(join(shots, 'big-screen.png'));
    });
  } finally {
    await b.close();
  }
});
