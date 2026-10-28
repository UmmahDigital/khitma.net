import { JUZ_STATUS, KHITMA_GROUP_TYPE } from 'src/app/entities/entities';

function _getDateInArabic(date: Date) {
  // var months = ["يناير", "فبراير", "مارس", "إبريل", "مايو", "يونيو",
  //   "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

  var days = [
    'اﻷحد',
    'اﻷثنين',
    'الثلاثاء',
    'اﻷربعاء',
    'الخميس',
    'الجمعة',
    'السبت',
  ];

  return (
    days[date.getDay()] +
    ' ' +
    date.getDate() +
    '/' +
    (date.getMonth() + 1) +
    '/' +
    date.getUTCFullYear()
  );
}

function statusMsg_Sequential(group) {
  function getJuzIcon(juz) {
    const ICONS = ['🔴', '🟡', '🟢'];

    return ICONS[juz.status];
  }

  const NEW_LINE = '\n';
  const now = new Date();

  let msg = group.title;

  msg += NEW_LINE;
  msg += _getDateInArabic(now);
  msg += NEW_LINE;
  msg += NEW_LINE;

  // What the khitma still needs comes first: the free ajza are what the group can act on.
  const count = (status) => group.ajza.filter((juz) => juz.status === status).length;
  const free = group.ajza.filter((juz) => juz.status === JUZ_STATUS.IDLE).map((juz) => juz.index + 1);
  msg += '🟢 تمّ ' + count(JUZ_STATUS.DONE) + ' · 🟡 قيد القراءة ' + count(JUZ_STATUS.BOOKED) + ' · 🔴 متاح ' + free.length;
  msg += NEW_LINE;
  if (free.length) {
    msg += 'الأجزاء المتاحة: ' + free.join('، ');
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

    // if (juz.status === JUZ_STATUS.DONE) {
    //   msg += " 👏";
    // }

    msg += NEW_LINE;
  });

  msg += NEW_LINE;
  msg += NEW_LINE;

  if (group.targetDate) {
    msg += 'موعد تسليم الختمة: ' + group.targetDate + '.';
    msg += NEW_LINE;
    msg += NEW_LINE;
  }

  msg += 'رجاء تحديث حالة جزئكم عن طريق الرابط: ' + group.getURL();

  msg += NEW_LINE;
  msg += NEW_LINE;

  msg += 'بارك الله بكم!';

  return msg;
}

function statusMsg_SameTask(group) {
  function getStatusIcon(isDone) {
    return isDone ? '🟢' : '🔴';
  }

  const NEW_LINE = '\n';
  const now = new Date();

  let msg = group.title;

  msg += NEW_LINE;
  msg += _getDateInArabic(now);
  msg += NEW_LINE;
  msg += NEW_LINE;

  msg += 'المهمّة الحاليّة: ' + group.task;
  msg += NEW_LINE;
  msg += NEW_LINE;

  group.members.forEach((member) => {
    msg += getStatusIcon(member.isTaskDone) + ' ' + member.name;
    msg += NEW_LINE;
  });

  msg += NEW_LINE;

  if (group.targetDate) {
    msg += 'موعد تسليم المهمّة: ' + group.targetDate + '.';
    msg += NEW_LINE;
    msg += NEW_LINE;
  }

  msg += 'رجاء تحديث حالة مهمّتكم عن طريق الرابط: ' + group.getURL();

  msg += NEW_LINE;
  msg += NEW_LINE;

  msg += 'بارك الله بكم!';

  return msg;
}

function statusMsg_Pages(group) {
  function getStatusIcon(isDone) {
    return isDone ? '🟢' : '🔴';
  }

  function hasPages(member) {
    return member.pagesTask?.start != null;
  }

  const NEW_LINE = '\n';
  const now = new Date();

  let msg = group.title;

  msg += NEW_LINE;
  msg += _getDateInArabic(now);
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
    msg += 'موعد تسليم الختمة: ' + group.targetDate + '.';
    msg += NEW_LINE;
    msg += NEW_LINE;
  }

  msg += 'رجاء تحديث حالة صفحاتكم عن طريق الرابط: ' + group.getURL();

  msg += NEW_LINE;
  msg += NEW_LINE;

  msg += 'بارك الله بكم!';

  return msg;
}

let _StatusMessages = {};
_StatusMessages[KHITMA_GROUP_TYPE.SEQUENTIAL] = statusMsg_Sequential;
_StatusMessages[KHITMA_GROUP_TYPE.SAME_TASK] = statusMsg_SameTask;
_StatusMessages[KHITMA_GROUP_TYPE.PAGES_DISTRIBUTION] = statusMsg_Pages;

export const StatusMessageGenerators = _StatusMessages;
