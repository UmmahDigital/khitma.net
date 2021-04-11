import { Component, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { KhitmaGroup, Juz, JUZ_STATUS, NUM_OF_AJZA, GET_JUZ_READ_EXTERNAL_URL, KHITMA_CYCLE_TYPE, KHITMA_GROUP_TYPE, SameTaskKhitmaGroup, GroupMember } from 'src/app/entities/entities';
import { LocalDatabaseService } from 'src/app/local-database.service';
import { KhitmaGroupService } from '../../../khitma-group.service';

import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialogModel, ConfirmDialogComponent } from '../../../shared/confirm-dialog/confirm-dialog.component';


import { Overlay, OverlayContainer, ScrollStrategy } from '@angular/cdk/overlay';
import { GoogleAnalyticsService } from 'ngx-google-analytics';
import { Title } from '@angular/platform-browser';
import { AlertService } from 'src/app/alert.service';
import { NativeApiService } from 'src/app/native-api.service';
import { EditKhitmaDetailsComponent } from 'src/app/dialog/edit-khitma-details/edit-khitma-details.component';
import { StartNewKhitmaComponent } from 'src/app/dialog/start-new-khitma/start-new-khitma.component';
import { NativeShareService } from 'src/app/native-share.service';
import { Router } from '@angular/router';


@Component({
  selector: 'app-group-dashboard',
  templateUrl: './group-dashboard.component.html',
  styleUrls: ['./group-dashboard.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class GroupDashboardComponent implements OnInit {


  readonly KHITMA_GROUP_TYPE = KHITMA_GROUP_TYPE;

  // [todo]: split using ViewChild?

  group: KhitmaGroup;
  myJuzIndex: number;
  username: string;

  isAdmin: boolean = false;

  showCelebration: boolean = false;

  isGroupInfoExpanded: false;

  currentViewMode: 'progress';

  isInitiated = false;

  showNames = false;

  inviteMsg = "";
  statusMsg = "";


  sameTaskGroupMetadata = {};



  constructor(private groupsApi: KhitmaGroupService, private localDB: LocalDatabaseService,
    private dialog: MatDialog,
    private $gaService: GoogleAnalyticsService,
    private titleService: Title,
    private alert: AlertService,
    private nativeApi: NativeApiService,
    private nativeShare: NativeShareService,
    private router: Router,) {
  }

  ngOnInit(): void {

    this.groupsApi.getCurrentGroup().subscribe((group: KhitmaGroup) => {

      if (!group) {
        return;
      }

      this.titleService.setTitle(group.title);

      this.group = new KhitmaGroup(group);


      if (!this.isInitiated) {
        this.username = this.localDB.getUsername(this.group.id);
        this.isAdmin = this.group.isAdmin(this.username);
        this.showNames = this.isAdmin;
        this.isInitiated = true;
      }

      if (!group.type || group.type === KHITMA_GROUP_TYPE.SEQUENTIAL) {
        this.group.ajza = group.ajza;

        this.myJuzIndex = this.group.getMyJuzIndex(this.username)

        this.statusMsg = this.getKhitmaStatusMsg();

        let url = this.group.getURL();

        this.inviteMsg = "إنضمّوا إلى"
          + ' "' + this.group.title + '" '
          + "عبر الرابط "
          + url;
      } else if (group.type === KHITMA_GROUP_TYPE.SAME_TASK) {

        let tmpGroup = new SameTaskKhitmaGroup(group);

        this.sameTaskGroupMetadata["counts"] = tmpGroup.getCounts();

        this.sameTaskGroupMetadata["myMember"] = tmpGroup.createGroupMember(this.username);

        this.group = tmpGroup;

      }




      window.scroll(0, 0);

    });

  }

  getMyLastReadJuz(ajza: Juz[]) {

    for (let i = (NUM_OF_AJZA - 1); i >= 0; i--) {
      if (ajza[i].owner === this.username) {
        return ajza[i];
      }
    }

    return null;
  }

  adminJuzUpdate(juz: Juz) {

    if (juz.status == JUZ_STATUS.BOOKED) {
      this.groupsApi.updateJuz(this.group.id, juz.index, juz.owner, JUZ_STATUS.DONE);
    }

    if (juz.status == JUZ_STATUS.DONE) {

      const dialogData = new ConfirmDialogModel(
        "تأكيد إتاحة الجزء",
        " ستتم ازالة اسم العضو الحالي من جزء" + (juz.index + 1) + " وإتاحته للإختيار.");

      const dialogRef = this.dialog.open(ConfirmDialogComponent, {
        data: dialogData,
        maxWidth: "80%"
      });

      dialogRef.afterClosed().subscribe(dialogResult => {

        if (dialogResult) {
          this.groupsApi.updateJuz(this.group.id, juz.index, "", JUZ_STATUS.IDLE);
        }

      });

    }

    this.$gaService.event('admin_juz_update');

  }

  juzSelected(juz: Juz) {

    const isUpdateForOtherUserCaseAdminCase = (juz.owner != this.username);
    const isUpdateMyDoneJuzAdminCase = (juz.owner == this.username && juz.status == JUZ_STATUS.DONE);

    // if (this.isAdmin && (isUpdateForOtherUserCaseAdminCase || isUpdateMyDoneJuzAdminCase)) {
    //   this.adminJuzUpdate(juz);
    // }

    if (this.isAdmin) {
      this.adminJuzUpdate(juz);
    }

    if (juz.status != JUZ_STATUS.IDLE || this.myJuzIndex != null) {
      return;
    }

    this.$gaService.event('juz_selected');

    this.myJuzIndex = juz.index;

    // this.localDB.setMyJuz(this.group.id, this.group.cycle, juz.index);
    this.groupsApi.updateJuz(this.group.id, juz.index, this.username, JUZ_STATUS.BOOKED);
  }

  juzDone() {

    const title = "تأكيد إتمام الجزء";
    const msg = "هل أتممت قراءة جزء " + (this.myJuzIndex + 1) + "؟";

    const dialogData = new ConfirmDialogModel(title, msg);

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: dialogData,
      maxWidth: "80%"
    });

    dialogRef.afterClosed().subscribe(dialogResult => {

      if (dialogResult) {

        this.$gaService.event('juz_done');

        this.groupsApi.updateJuz(this.group.id, this.myJuzIndex, this.username, JUZ_STATUS.DONE);
        // this.localDB.setMyJuz(this.group.id, this.group.cycle, null);
        this.myJuzIndex = null;

        this.showCelebration = true;

        setTimeout(() => {
          this.showCelebration = false;
        }, 2250);
      }

    });

  }

  juzGiveup() {

    this.$gaService.event('juz_giveup');

    // add confirmation modal
    this.groupsApi.updateJuz(this.group.id, this.myJuzIndex, this.username, JUZ_STATUS.IDLE);
    // this.localDB.setMyJuz(this.group.id, this.group.cycle, null);
    this.myJuzIndex = null;
  }

  startNewKhitmah() {


    const dialogRef = this.dialog.open(StartNewKhitmaComponent, {
      data: {
        title: this.group.title,
        author: this.group.author,
        descreption: this.group.description
      },
      maxWidth: "80%"
    });

    dialogRef.afterClosed().subscribe(selectedCycleType => {

      if (selectedCycleType == KHITMA_CYCLE_TYPE.AUTO_BOOK || selectedCycleType == KHITMA_CYCLE_TYPE.ALL_IDLE) {

        this.$gaService.event('group_new_khitmah');

        this.group.cycle++;
        this.groupsApi.startNewKhitmah(this.group.cycle, selectedCycleType);

      }

    });




    // const dialogData = new ConfirmDialogModel(
    //   "تأكيد بدء ختمة جديدة",
    //   "بدء ختمة جديدة سيقوم بإعادة كل الأجزاء إلى وضعيّة الإتاحة وتمكين كل عضو في المجموعة من اختيار جزئه الجديد.");

    // const dialogRef = this.dialog.open(ConfirmDialogComponent, {
    //   data: dialogData,
    //   maxWidth: "80%"
    // });

    // dialogRef.afterClosed().subscribe(dialogResult => {

    //   if (dialogResult) {

    //     this.$gaService.event('group_new_khitmah');

    //     this.group.cycle++;
    //     this.groupsApi.startNewKhitmah(this.group.cycle);

    //   }

    // });

  }

  getMyJuzReadUrl() {
    return GET_JUZ_READ_EXTERNAL_URL(this.myJuzIndex);
  }

  getKhitmaStatusMsg() {

    function getJuzIcon(juz) {

      const ICONS = ['🔴', '🟡', '🟢'];

      return ICONS[juz.status];
    }

    function getDateInArabic(date: Date) {
      // var months = ["يناير", "فبراير", "مارس", "إبريل", "مايو", "يونيو",
      //   "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

      var days = ["اﻷحد", "اﻷثنين", "الثلاثاء", "اﻷربعاء", "الخميس", "الجمعة", "السبت"];

      return days[date.getDay()] + " " + date.getDate() + "/" + (date.getMonth() + 1) + "/" + date.getUTCFullYear();
    }

    const NEW_LINE = "\n";
    const now = new Date();

    let msg = this.group.title;

    msg += NEW_LINE;
    msg += NEW_LINE;
    msg += getDateInArabic(now);
    msg += NEW_LINE;
    msg += NEW_LINE;

    this.group.ajza.forEach(juz => {

      msg += ("0" + (juz.index + 1)).slice(-2) + " " + getJuzIcon(juz) + " " + (juz.owner || "");

      // if (juz.status === JUZ_STATUS.DONE) {
      //   msg += " 👏";
      // }

      msg += NEW_LINE;

    });

    msg += NEW_LINE;
    msg += NEW_LINE;

    if (this.group.targetDate) {
      msg += "موعد تسليم الختمة: " + this.group.targetDate + ".";
      msg += NEW_LINE;
      msg += NEW_LINE;
    }

    msg += "رجاء حتلنة جزئكم عن طريق الرابط: " + this.group.getURL();

    msg += NEW_LINE;
    msg += NEW_LINE;

    msg += "بارك الله بكم!";

    return msg;
  }

  groupStatusCopied() {
    this.alert.show("تمّ نسخ الرسالة بنجاح", 2500);
  }

  inviteMsgCopied() {
    this.alert.show("تمّ نسخ الرسالة، يمكنك الآن مشاركتها مع معارفك وأصدقائك.", 5000);
  }

  shareStatusMsg() {
    this.nativeApi.share(("وضع الختمة: " + this.group.title), this.getKhitmaStatusMsg(), null);
  }

  shareInviteMsg() {
    this.nativeApi.share(("دعوة انضمام: " + this.group.title), this.inviteMsg, null);
  }

  shareKhitmaCompletedDua() {

    const dua = "اللهم ارحمنى بالقرآن وأجعله لى إماما ونورا وهدى ورحمة اللهم ذكرنى منه مانسيت وعلمنى منه ماجهلت وارزقني تلاوته آناء الليل وأطراف النهار واجعله لي حجة يارب العالمين . اللهم أصلح لى دينى الذى هو عصمة أمري، وأصلح لي دنياي التي فيها معاشي، وأصلح لي آخرتي التي فيها معادي، وأجعل الحياة زيادة لي في كل خير وأجعل الموت راحة لي من كل شر . اللهم أجعل خير عمري آخره وخير عملي خواتمه وخير أيامي يوم ألقاك فيه . اللهم إني أسألك عيشة هنية وميتة سوية ومردا غير مخز ولا فاضح . اللهم إنى أسألك خير المسألة وخير الدعاء وخير النجاح وخير العلم وخير العمل وخير الثواب وخير الحياة وخير الممات وثبتنى وثقل موازيني وحقق إيماني وارفع درجتي وتقبل صلاتي واغفر خطيئاتي وأسألك العلا من الجنة . اللهم إني أسألك موجبات رحمتك وعزائم مغفرتك والسلامة من كل إثم والغنيمة من كل بر والفوز بالجنة والنجاة من النار . اللهم أحسن عاقبتنا في الأمور كلها، وأجرنا من خزي الدنيا وعذاب الآخرة . اللهم اقسم لنا من خشيتك ماتحول به بيننا وبين معصيتك ومن طاعتك ماتبلغنا بها جنتك ومن اليقين ماتهون به علينا مصائب الدنيا ومتعنا بأسماعنا وأبصارنا وقوتنا ماأحييتنا واجعله الوارث منا واجعل ثأرنا على من ظلمنا وانصرنا على من عادانا ولا تجعل مصيبتنا في ديننا ولا تجعل الدنيا أكبر همنا ولا مبلغ علمنا ولا تسلط علينا من لا يرحمنا . اللهم لا تدع لنا ذنبا إلا غفرته ولا هما إلا فرجته ولا دينا إلا قضيته ولا حاجة من حوائج الدنيا والآخرة إلا قضيتها يا أرحم الراحمين. ربنا آتنا في الدنيا حسنة وفي الآخرة حسنة وقنا عذاب النار وصلى الله على سيدنا ونبينا محمد وعلى آله وأصحابه الأخيار وسلم تسليما كثيرا.";
    this.nativeApi.share((this.group.title + " - تمّت الختمة بفضل الله"), dua, null);

    // fetch(location.origin + '/assets/dua.png')
    //   .then(function (response) {
    //     return response.blob()
    //   })
    //   .then(blob => {

    //     var file = new File([blob], "picture.jpg", { type: 'image/jpeg' });
    //     var filesArray = [file];

    //     if (this.nativeShare.canShare && this.nativeShare.canShareFile(filesArray)) {

    //       this.nativeShare.share({
    //         title: "دعاء ختم القرآن الكريم",
    //         text: this.group.title + " - تمّت الختمة بفضل الله",
    //         files: filesArray
    //       });
    //     }
    //     else {
    //       const dua = "اللهم ارحمنى بالقرآن وأجعله لى إماما ونورا وهدى ورحمة اللهم ذكرنى منه مانسيت وعلمنى منه ماجهلت وارزقني تلاوته آناء الليل وأطراف النهار واجعله لي حجة يارب العالمين . اللهم أصلح لى دينى الذى هو عصمة أمري، وأصلح لي دنياي التي فيها معاشي، وأصلح لي آخرتي التي فيها معادي، وأجعل الحياة زيادة لي في كل خير وأجعل الموت راحة لي من كل شر . اللهم أجعل خير عمري آخره وخير عملي خواتمه وخير أيامي يوم ألقاك فيه . اللهم إني أسألك عيشة هنية وميتة سوية ومردا غير مخز ولا فاضح . اللهم إنى أسألك خير المسألة وخير الدعاء وخير النجاح وخير العلم وخير العمل وخير الثواب وخير الحياة وخير الممات وثبتنى وثقل موازيني وحقق إيماني وارفع درجتي وتقبل صلاتي واغفر خطيئاتي وأسألك العلا من الجنة . اللهم إني أسألك موجبات رحمتك وعزائم مغفرتك والسلامة من كل إثم والغنيمة من كل بر والفوز بالجنة والنجاة من النار . اللهم أحسن عاقبتنا في الأمور كلها، وأجرنا من خزي الدنيا وعذاب الآخرة . اللهم اقسم لنا من خشيتك ماتحول به بيننا وبين معصيتك ومن طاعتك ماتبلغنا بها جنتك ومن اليقين ماتهون به علينا مصائب الدنيا ومتعنا بأسماعنا وأبصارنا وقوتنا ماأحييتنا واجعله الوارث منا واجعل ثأرنا على من ظلمنا وانصرنا على من عادانا ولا تجعل مصيبتنا في ديننا ولا تجعل الدنيا أكبر همنا ولا مبلغ علمنا ولا تسلط علينا من لا يرحمنا . اللهم لا تدع لنا ذنبا إلا غفرته ولا هما إلا فرجته ولا دينا إلا قضيته ولا حاجة من حوائج الدنيا والآخرة إلا قضيتها يا أرحم الراحمين. ربنا آتنا في الدنيا حسنة وفي الآخرة حسنة وقنا عذاب النار وصلى الله على سيدنا ونبينا محمد وعلى آله وأصحابه الأخيار وسلم تسليما كثيرا.";
    //       this.nativeApi.share((this.group.title + " - تمّت الختمة بفضل الله"), dua, null);
    //     }

    //   });

  }

  juzOwnerEdited(updatedJuz: Juz) {


    if (updatedJuz.owner == "" || updatedJuz.owner == null) {
      updatedJuz.status = JUZ_STATUS.IDLE;
    }

    updatedJuz.owner = KhitmaGroup.refineOwnerName(updatedJuz.owner);

    this.groupsApi.updateJuz(this.group.id, updatedJuz.index, updatedJuz.owner, updatedJuz.status);


    console.log("dashboard - juz update, new owner: " + updatedJuz.owner);

  }

  showEditGroupDialog() {

    const dialogRef = this.dialog.open(EditKhitmaDetailsComponent, {
      data: {
        title: this.group.title,
        author: this.group.author,
        descreption: this.group.description,
        targetDate: this.group.targetDate,
        admins: this.group.admins,
      },
      maxWidth: "80%"
    });

    dialogRef.afterClosed().subscribe(dialogResult => {

      if (dialogResult) {

        this.groupsApi.updateGroupInfo(this.group.id,
          dialogResult.title,
          dialogResult.description,
          dialogResult.targetDate,
          dialogResult.admins
        );

      }

    });

  }

  leaveGroup() {

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: new ConfirmDialogModel(
        "تأكيد ترك المجموعة",
        "لا ننصح بترك المجموعة كي لا يفوتك الثواب العظيم إن شاء الله، لكن في حال تركت المجموعة فسيتم إتاحة جزئك من جديد وتحويلك للصفحة الرئيسية."),
      maxWidth: "80%"
    });

    dialogRef.afterClosed().subscribe(dialogResult => {

      if (dialogResult) {

        this.$gaService.event('group_leave');

        if (this.myJuzIndex != null) {
          this.groupsApi.updateJuz(this.group.id, this.myJuzIndex, "", JUZ_STATUS.IDLE);
        }

        this.localDB.archiveGroup(this.group);

        if (this.group.type === KHITMA_GROUP_TYPE.SAME_TASK) {
          this.groupsApi.removeGroupMember(this.group.id, this.username).then(() => {
            this.router.navigate(['/']);

          });

        }
        else {
          this.router.navigate(['/']);

        }





      }

    });

  }



  //****** */

  taskToggled(isDone: boolean) {

    this.groupsApi.updateMemberTask(this.group.id, this.username, isDone);
  }


}
