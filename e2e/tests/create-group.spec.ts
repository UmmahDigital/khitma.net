import { expect, Page, test } from '@playwright/test';
import { openApp, readLocalStorage, sharedPayloads } from '../support/app';
import { getDoc } from '../support/firestore';

async function fillGroupDetails(page: Page, title: string, author: string) {
  await page.getByLabel('عنوان الختمة').fill(title);
  await page.getByLabel('اسمك (مسؤول الختمة)').fill(author);
}

function groupIdFromInviteUrl(page: Page): string {
  const match = new URL(page.url()).pathname.match(/^\/group\/([^/]+)\/invite$/);
  if (!match) throw new Error(`Not on an invite page: ${page.url()}`);
  return match[1];
}

test.describe('creating a group', () => {
  test('recurring sequential group: invite, share, then dashboard as admin', async ({ page }) => {
    await openApp(page, '/');
    await page.getByRole('link', { name: 'إنشاء مجموعة ختمة دوريّة' }).click();
    await expect(page).toHaveURL(/\/new\?type=recurring$/);

    await fillGroupDetails(page, 'ختمة الجمعة', 'أبو محمد');
    await page.getByRole('button', { name: 'إنشاء مجموعة الختمة' }).click();

    await expect(page).toHaveURL(/\/group\/[^/]+\/invite$/);
    const groupId = groupIdFromInviteUrl(page);
    const group = await getDoc(`groups/${groupId}`);
    expect(group).toMatchObject({ title: 'ختمة الجمعة', author: 'أبو محمد', type: 'SEQUENTIAL', cycle: 0 });
    expect(Object.keys(group!.ajza)).toHaveLength(30);
    expect(Object.values<any>(group!.ajza).every((juz) => juz.status === 0 && juz.owner === undefined)).toBe(true);
    expect(await readLocalStorage(page, 'groups')).toMatchObject({ [groupId]: { isJoined: true, username: 'أبو محمد' } });

    const invite = page.getByLabel('رسالة الدعوة للإنضمام (يمكنك تعديلها)');
    await expect(invite).toHaveValue(new RegExp(`/group/${groupId}`));
    await page.getByRole('button', { name: 'مشاركة' }).click();
    const [shared] = await sharedPayloads(page);
    expect(shared.text).toContain(`/group/${groupId}`);

    await page.getByRole('link', { name: 'الانتقال لصفحة مجموعة الختمة' }).click();
    await expect(page).toHaveURL(new RegExp(`/group/${groupId}/dashboard$`));
    await expect(page.getByText('أدوات مسؤول المجموعة')).toBeVisible();
  });

  test('recurring same-task group stores the first task and the admin as a member', async ({ page }) => {
    await openApp(page, '/new?type=recurring');
    await fillGroupDetails(page, 'ورد الكهف', 'أم علي');
    await page.getByRole('button', { name: 'نفس المهمّة' }).click();
    await page.getByLabel('المهمّة الأولى').fill('سورة الكهف');
    await page.getByRole('button', { name: 'إنشاء مجموعة الختمة' }).click();

    await expect(page).toHaveURL(/\/group\/[^/]+\/invite$/);
    const group = await getDoc(`groups/${groupIdFromInviteUrl(page)}`);
    expect(group).toMatchObject({
      title: 'ورد الكهف',
      type: 'SAME_TASK',
      task: 'سورة الكهف',
      members: { 'أم علي': { isTaskDone: false } },
    });
  });

  test('one-time page distribution group', async ({ page }) => {
    await openApp(page, '/');
    await page.getByRole('link', { name: 'بدء ختمة جماعيّة لمرّة واحدة' }).click();
    await expect(page).toHaveURL(/\/new\?type=onetime$/);

    await fillGroupDetails(page, 'ختمة عن روح جدّي', 'خالد');
    await page.getByRole('button', { name: 'توزيع صفحات' }).click();
    await page.getByRole('button', { name: 'إنشاء الختمة الجماعيّة' }).click();

    await expect(page).toHaveURL(/\/group\/[^/]+\/invite$/);
    const group = await getDoc(`groups/${groupIdFromInviteUrl(page)}`);
    expect(group).toMatchObject({ type: 'PAGES_DISTRIBUTION', members: { 'خالد': { isTaskDone: false } } });
  });

  test('cannot submit without a title and a name', async ({ page }) => {
    await openApp(page, '/new?type=onetime');
    const submit = page.getByRole('button', { name: 'إنشاء الختمة الجماعيّة' });
    await expect(submit).toBeDisabled();
    await page.getByLabel('عنوان الختمة').fill('ختمة');
    await expect(submit).toBeDisabled();
    await page.getByLabel('اسمك (مسؤول الختمة)').fill('خالد');
    await expect(submit).toBeEnabled();
  });
});
