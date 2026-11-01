import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { analyticsEvents, joinedGroups, openApp } from '../support/app';
import { createSequentialGroup, JUZ_STATUS, newGroupId } from '../support/fixtures';

// «ذكّرني»: most members book a juz in a WhatsApp group and mean to read it later; an event in their own calendar
// brings them back to it.

const { BOOKED } = JUZ_STATUS;

test.describe('a reminder to read the booked juz', () => {
  test('goes to Google Calendar or the phone’s calendar, at 8pm', async ({ page }) => {
    const groupId = newGroupId('remind');
    await createSequentialGroup(groupId, { title: 'ختمة العائلة', author: 'أبو أحمد', assigned: { 7: { owner: 'سارة', status: BOOKED } } });

    // The test clock: Sunday 1 March 2026, 11:00 in Jerusalem (UTC+2), so 8pm that evening is 18:00 UTC.
    await openApp(page, `/group/${groupId}`, { storage: { groups: joinedGroups({ [groupId]: 'سارة' }) }, freezeTime: true });
    await page.getByRole('button', { name: 'ذكّرني بقراءته' }).click();

    const google = new URL((await page.getByRole('menuitem', { name: 'تقويم Google' }).getAttribute('href'))!);
    expect(google.origin + google.pathname).toBe('https://calendar.google.com/calendar/render');
    expect(google.searchParams.get('text')).toBe('📖 قراءة الجزء 7 – ختمة العائلة');
    expect(google.searchParams.get('dates')).toBe('20260301T180000Z/20260301T183000Z');
    expect(google.searchParams.get('details')).toContain(`/group/${groupId}`);

    const downloading = page.waitForEvent('download');
    await page.getByRole('menuitem', { name: 'تقويم الهاتف' }).click();
    const download = await downloading;
    expect(download.suggestedFilename()).toBe('khitma-juz-7.ics');
    const ics = readFileSync((await download.path())!, 'utf8').replace(/\r\n /g, '');
    expect(ics).toContain('SUMMARY:📖 قراءة الجزء 7 – ختمة العائلة');
    expect(ics).toContain('DTSTART:20260301T180000Z');
    expect(ics).toContain(`/group/${groupId}`);
    expect(await analyticsEvents(page)).toContainEqual(['reminder_added', expect.objectContaining({ calendar: 'phone' })]);
  });

  test('is offered only for a juz the member is reading', async ({ page }) => {
    const groupId = newGroupId('remind-none');
    await createSequentialGroup(groupId, { author: 'أبو أحمد', assigned: { 7: { owner: 'خالد', status: BOOKED } } });
    await openApp(page, `/group/${groupId}`, { storage: { groups: joinedGroups({ [groupId]: 'سارة' }) } });
    await expect(page.getByText('السلام عليكم يا سارة')).toBeVisible();
    await expect(page.getByRole('button', { name: 'ذكّرني بقراءته' })).toHaveCount(0);
  });
});
