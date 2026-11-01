import { JUZ_STATUS, KHITMA_GROUP_TYPE } from 'src/app/entities/entities';
import { localDeadlineText } from '../../../deadline';
import { fill } from '../../../share-messages';

// The status message admins share in the group's WhatsApp chat. Arabic is the source; the other languages come
// from the translation files' `status` section.

const ARABIC_DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

function todayText(date: Date, lang: string): string {
  if (lang !== 'ar') {
    return date.toLocaleDateString(lang, { weekday: 'long', day: 'numeric', month: 'numeric', year: 'numeric' });
  }
  return ARABIC_DAYS[date.getDay()] + ' ' + date.getDate() + '/' + (date.getMonth() + 1) + '/' + date.getUTCFullYear();
}

/** The admin's free-text date; a picked date in the reader's language. */
function dueText(group, lang: string): string {
  return lang !== 'ar' && group.targetAt ? localDeadlineText(group.targetAt, lang) : group.targetDate;
}

function texts(translation: any) {
  const t = translation?.status ?? {};
  return {
    summary: t.summary || '🟢 تمّ {done} · 🟡 قيد القراءة {reading} · 🔴 متاح {free}',
    freeList: t.freeList || 'الأجزاء المتاحة: {list}',
    task: t.task || 'المهمّة الحاليّة: {task}',
    deadline: t.deadline || 'موعد إتمام الختمة: {date}.',
    taskDeadline: t.taskDeadline || 'موعد إتمام المهمّة: {date}.',
    updateJuz: t.updateJuz || 'رجاء تحديث حالة جزئكم عن طريق الرابط: {url}',
    updateTask: t.updateTask || 'رجاء تحديث حالة مهمّتكم عن طريق الرابط: {url}',
    updatePages: t.updatePages || 'رجاء تحديث حالة صفحاتكم عن طريق الرابط: {url}',
    bless: t.bless || 'بارك الله بكم!',
  };
}

function statusMsg_Sequential(group, url: string = group.getURL(), translation?: any, lang = 'ar') {
  function getJuzIcon(juz) {
    const ICONS = ['🔴', '🟡', '🟢'];

    return ICONS[juz.status];
  }

  const t = texts(translation);
  const NEW_LINE = '\n';
  const now = new Date();

  let msg = group.title;

  msg += NEW_LINE;
  msg += todayText(now, lang);
  msg += NEW_LINE;
  msg += NEW_LINE;

  // What the khitma still needs comes first: the free ajza are what the group can act on.
  const count = (status) => group.ajza.filter((juz) => juz.status === status).length;
  const free = group.ajza.filter((juz) => juz.status === JUZ_STATUS.IDLE).map((juz) => juz.index + 1);
  msg += fill(t.summary, { done: count(JUZ_STATUS.DONE), reading: count(JUZ_STATUS.BOOKED), free: free.length });
  msg += NEW_LINE;
  if (free.length) {
    msg += fill(t.freeList, { list: free.join(lang === 'ar' ? '، ' : ', ') });
    msg += NEW_LINE;
  }
  msg += NEW_LINE;

  group.ajza.forEach((juz) => {
    msg +=
      ('0' + (juz.index + 1)).slice(-2) +
      ' ' +
      getJuzIcon(juz) +
      ' ' +
      (juz.owner || '');

    msg += NEW_LINE;
  });

  msg += NEW_LINE;
  msg += NEW_LINE;

  if (group.targetDate) {
    msg += fill(t.deadline, { date: dueText(group, lang) });
    msg += NEW_LINE;
    msg += NEW_LINE;
  }

  msg += fill(t.updateJuz, { url });

  msg += NEW_LINE;
  msg += NEW_LINE;

  msg += t.bless;

  return msg;
}

function statusMsg_SameTask(group, url: string = group.getURL(), translation?: any, lang = 'ar') {
  function getStatusIcon(isDone) {
    return isDone ? '🟢' : '🔴';
  }

  const t = texts(translation);
  const NEW_LINE = '\n';
  const now = new Date();

  let msg = group.title;

  msg += NEW_LINE;
  msg += todayText(now, lang);
  msg += NEW_LINE;
  msg += NEW_LINE;

  msg += fill(t.task, { task: group.task });
  msg += NEW_LINE;
  msg += NEW_LINE;

  group.members.forEach((member) => {
    msg += getStatusIcon(member.isTaskDone) + ' ' + member.name;
    msg += NEW_LINE;
  });

  msg += NEW_LINE;

  if (group.targetDate) {
    msg += fill(t.taskDeadline, { date: dueText(group, lang) });
    msg += NEW_LINE;
    msg += NEW_LINE;
  }

  msg += fill(t.updateTask, { url });

  msg += NEW_LINE;
  msg += NEW_LINE;

  msg += t.bless;

  return msg;
}

function statusMsg_Pages(group, url: string = group.getURL(), translation?: any, lang = 'ar') {
  function getStatusIcon(isDone) {
    return isDone ? '🟢' : '🔴';
  }

  function hasPages(member) {
    return member.pagesTask?.start != null;
  }

  const t = texts(translation);
  const NEW_LINE = '\n';
  const now = new Date();

  let msg = group.title;

  msg += NEW_LINE;
  msg += todayText(now, lang);
  msg += NEW_LINE;
  msg += NEW_LINE;

  // Reading order: members with pages by their first page, then anyone still waiting for pages.
  const members = [
    ...group.members.filter(hasPages).sort((a, b) => a.pagesTask.start - b.pagesTask.start),
    ...group.members.filter((member) => !hasPages(member)),
  ];

  members.forEach((member) => {
    msg += getStatusIcon(member.isTaskDone) + ' ' + member.name;

    if (hasPages(member)) {
      msg += ': ' + (member.pagesTask.start + 1) + '-' + (member.pagesTask.end + 1);
    }

    msg += NEW_LINE;
  });

  msg += NEW_LINE;

  if (group.targetDate) {
    msg += fill(t.deadline, { date: dueText(group, lang) });
    msg += NEW_LINE;
    msg += NEW_LINE;
  }

  msg += fill(t.updatePages, { url });

  msg += NEW_LINE;
  msg += NEW_LINE;

  msg += t.bless;

  return msg;
}

let _StatusMessages = {};
_StatusMessages[KHITMA_GROUP_TYPE.SEQUENTIAL] = statusMsg_Sequential;
_StatusMessages[KHITMA_GROUP_TYPE.SAME_TASK] = statusMsg_SameTask;
_StatusMessages[KHITMA_GROUP_TYPE.PAGES_DISTRIBUTION] = statusMsg_Pages;

export const StatusMessageGenerators = _StatusMessages;
