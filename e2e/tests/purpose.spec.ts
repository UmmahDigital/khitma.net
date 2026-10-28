import { expect, test } from '@playwright/test';
import { analyticsEvents, joinedGroups, openApp, recordedEvents, recordEventsAcrossReloads, sharedPayloads } from '../support/app';
import { getDoc } from '../support/firestore';
import { createSequentialGroup, JUZ_STATUS, newGroupId } from '../support/fixtures';

// Most one-time khitmas are read for someone who passed away. The create form asks what the khitma is for first,
// writes the title for memorial and healing khitmas, and stores the purpose (analytics get it instead of titles).

const { DONE } = JUZ_STATUS;
const ADMIN = 'أبو أحمد';
const DUA_FEMALE = 'اللَّهُمَّ اغْفِرْ لَهَا وَارْحَمْهَا، وَعَافِهَا وَاعْفُ عَنْهَا، وَأَكْرِمْ نُزُلَهَا، وَوَسِّعْ مُدْخَلَهَا';
const DUA_MALE = 'اللَّهُمَّ اغْفِرْ لَهُ وَارْحَمْهُ، وَعَافِهِ وَاعْفُ عَنْهُ، وَأَكْرِمْ نُزُلَهُ، وَوَسِّعْ مُدْخَلَهُ';

test.describe('khitma purpose', () => {
  test('a memorial khitma gets its title, pronoun and invitation written for the creator', async ({ page }) => {
    await recordEventsAcrossReloads(page);
    await openApp(page, '/new?type=onetime');
    await expect(page.getByRole('heading', { name: 'ما الغرض من الختمة؟' })).toBeVisible();
    await page.getByRole('button', { name: 'عن روح متوفّى' }).click();
    await expect(page.getByRole('button', { name: 'عن روح متوفّى' })).toHaveAttribute('aria-pressed', 'true');

    await page.getByLabel('اسم المتوفّى').fill('فاطمة');
    await expect(page.getByLabel('عنوان الختمة')).toHaveValue('ختمة عن روح فاطمة رحمه الله');
    await page.getByRole('button', { name: 'رحمها الله' }).click();
    await expect(page.getByLabel('عنوان الختمة')).toHaveValue('ختمة عن روح فاطمة رحمها الله');

    await page.getByLabel('اسمك (مسؤول الختمة)').fill('خالد');
    await page.getByRole('button', { name: 'إنشاء الختمة الجماعيّة' }).click();
    await expect(page).toHaveURL(/\/group\/[^/]+\/invite$/);
    const groupId = new URL(page.url()).pathname.split('/')[2];

    expect(await getDoc(`groups/${groupId}`)).toMatchObject({
      title: 'ختمة عن روح فاطمة رحمها الله',
      type: 'SEQUENTIAL',
      purpose: 'memorial',
      honoreeGender: 'female',
    });
    // The invitation doesn't say "khitma" twice.
    await expect(page.getByLabel('رسالة الدعوة للإنضمام (يمكنك تعديلها)')).toHaveValue(
      /^انضمّوا إلى ختمة عن روح فاطمة رحمها الله، واختاروا جزءًا لقراءته 📖/
    );
    expect(await recordedEvents(page)).toContainEqual(['group_created', expect.objectContaining({ purpose: 'memorial' })]);
  });

  test('a title the creator wrote is never overwritten', async ({ page }) => {
    await openApp(page, '/new?type=onetime');
    await page.getByRole('button', { name: 'لشفاء مريض' }).click();
    await page.getByLabel('اسم المريض').fill('خالد');
    await expect(page.getByLabel('عنوان الختمة')).toHaveValue('ختمة لشفاء خالد شفاه الله');

    await page.getByLabel('عنوان الختمة').fill('ختمة أبي');
    await page.getByLabel('اسم المريض').fill('خالد بن محمد');
    await page.getByRole('button', { name: 'شفاها الله' }).click();
    await expect(page.getByLabel('عنوان الختمة')).toHaveValue('ختمة أبي');
  });

  test('the less common khitma types wait under "more options", unless a link asks for one', async ({ page }) => {
    await openApp(page, '/new?type=onetime');
    await expect(page.getByRole('radio', { name: 'توزيع صفحات' })).toHaveCount(0);
    await page.getByRole('button', { name: 'خيارات أخرى' }).click();
    await expect(page.getByRole('radio', { name: 'توزيع أجزاء' })).toBeChecked();

    await page.goto('/new?type=onetime.pagesdistribution');
    await expect(page.getByRole('radio', { name: 'توزيع صفحات' })).toBeChecked();
    await expect(page.getByRole('button', { name: 'خيارات أخرى' })).toHaveCount(0);
  });

  test('a completed memorial khitma ends with the supplication for the deceased', async ({ page }) => {
    const groupId = newGroupId('purpose-done');
    const assigned = Object.fromEntries(Array.from({ length: 30 }, (_, i) => [i + 1, { owner: `عضو ${i + 1}`, status: DONE }]));
    await createSequentialGroup(groupId, {
      title: 'ختمة عن روح فاطمة رحمها الله', author: ADMIN, assigned, purpose: 'memorial', honoreeGender: 'female',
    });

    await openApp(page, `/group/${groupId}`, { storage: { groups: joinedGroups({ [groupId]: 'عضو 3' }) } });
    await expect(page.locator('.memorial-dua')).toContainText('دعاء للمتوفّى');
    await expect(page.locator('.memorial-dua-text')).toHaveText(DUA_FEMALE);
    await page.getByRole('button', { name: 'مشاركة دعاء الختمة' }).click();
    const [shared] = await sharedPayloads(page);
    expect(shared.text!.startsWith(DUA_FEMALE + '\n\n')).toBe(true);
    // Analytics know the purpose of the group the events come from.
    expect(await analyticsEvents(page)).toContainEqual(['share', expect.objectContaining({ group_purpose: 'memorial', content_type: 'completion_dua' })]);
  });

  test('other completed khitmas keep their usual ending', async ({ page }) => {
    const groupId = newGroupId('purpose-plain');
    const assigned = Object.fromEntries(Array.from({ length: 30 }, (_, i) => [i + 1, { owner: `عضو ${i + 1}`, status: DONE }]));
    await createSequentialGroup(groupId, { author: ADMIN, assigned });

    await openApp(page, `/group/${groupId}`, { storage: { groups: joinedGroups({ [groupId]: 'عضو 3' }) } });
    await expect(page.getByRole('button', { name: 'مشاركة دعاء الختمة' })).toBeVisible();
    await expect(page.locator('.memorial-dua')).toHaveCount(0);
    await expect(page.getByText(DUA_MALE)).toHaveCount(0);
  });
});
