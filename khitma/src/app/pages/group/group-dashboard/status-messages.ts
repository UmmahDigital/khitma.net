import { KHITMA_GROUP_TYPE } from "src/app/entities/entities";


function _getDateInArabic(date: Date) {
    // var months = ["يناير", "فبراير", "مارس", "إبريل", "مايو", "يونيو",
    //   "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

    var days = ["اﻷحد", "اﻷثنين", "الثلاثاء", "اﻷربعاء", "الخميس", "الجمعة", "السبت"];

    return days[date.getDay()] + " " + date.getDate() + "/" + (date.getMonth() + 1) + "/" + date.getUTCFullYear();
}

function statusMsg_Sequential(group) {

    function getJuzIcon(juz) {

        const ICONS = ['🔴', '🟡', '🟢'];

        return ICONS[juz.status];
    }


    const NEW_LINE = "\n";
    const now = new Date();

    let msg = group.title;

    msg += NEW_LINE;
    msg += NEW_LINE;
    msg += _getDateInArabic(now);
    msg += NEW_LINE;
    msg += NEW_LINE;

    group.ajza.forEach(juz => {

        msg += ("0" + (juz.index + 1)).slice(-2) + " " + getJuzIcon(juz) + " " + (juz.owner || "");

        // if (juz.status === JUZ_STATUS.DONE) {
        //   msg += " 👏";
        // }

        msg += NEW_LINE;

    });

    msg += NEW_LINE;
    msg += NEW_LINE;

    if (group.targetDate) {
        msg += "موعد تسليم الختمة: " + group.targetDate + ".";
        msg += NEW_LINE;
        msg += NEW_LINE;
    }

    msg += "رجاء حتلنة جزئكم عن طريق الرابط: " + group.getURL();

    msg += NEW_LINE;
    msg += NEW_LINE;

    msg += "بارك الله بكم!";

    return msg;
}


function statusMsg_SameTask(group) {

    function getStatusIcon(isDone) {
        return isDone ? '🟢' : '🔴';
    }

    const NEW_LINE = "\n";
    const now = new Date();

    let msg = group.title;

    msg += NEW_LINE;
    msg += NEW_LINE;
    msg += _getDateInArabic(now);
    msg += NEW_LINE;
    msg += NEW_LINE;
    msg += "المهمّة: " + group.task;
    msg += NEW_LINE;
    msg += NEW_LINE;

    group.members.forEach(member => {

        msg += getStatusIcon(member.isTaskDone) + " " + member.name;
        msg += NEW_LINE;

    });

    msg += NEW_LINE;

    if (group.targetDate) {
        msg += "موعد تسليم المهمّة: " + group.targetDate + ".";
        msg += NEW_LINE;
        msg += NEW_LINE;
    }

    msg += "رجاء حتلنة مهمّتكم عن طريق الرابط: " + group.getURL();

    msg += NEW_LINE;
    msg += NEW_LINE;

    msg += "بارك الله بكم!";

    return msg;
}

let _StatusMessages = {};
_StatusMessages[KHITMA_GROUP_TYPE.SEQUENTIAL] = statusMsg_Sequential;
_StatusMessages[KHITMA_GROUP_TYPE.SAME_TASK] = statusMsg_SameTask;


export const StatusMessageGenerators = _StatusMessages;