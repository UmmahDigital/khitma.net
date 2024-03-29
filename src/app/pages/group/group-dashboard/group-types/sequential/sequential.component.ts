import { Breakpoints } from '@angular/cdk/layout';
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Title } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { GoogleAnalyticsService } from 'ngx-google-analytics';
import { Subject } from 'rxjs';
import { AlertService } from '../../../../../alert.service';
import { StartNewKhitmaComponent } from '../../../../../dialog/start-new-khitma/start-new-khitma.component';
import { GET_JUZ_READ_EXTERNAL_URL, Juz, JUZ_STATUS, KhitmaGroup, KhitmaGroup_Sequential, KHITMA_CYCLE_TYPE, NUM_OF_AJZA } from '../../../../../entities/entities';
import { KhitmaGroupService } from '../../../../../khitma-group.service';
import { LocalDatabaseService } from '../../../../../local-database.service';
import { NativeApiService } from '../../../../../native-api.service';
import { NativeShareService } from '../../../../../native-share.service';
import { ConfirmDialogComponent, ConfirmDialogModel } from '../../../../../shared/confirm-dialog/confirm-dialog.component';
import { CommonService } from '../../../../../service/common.service';

@Component({
  selector: 'app-group-sequential',
  templateUrl: './sequential.component.html',
  styleUrls: ['./sequential.component.scss']
})
export class Group_Sequential_Component implements OnInit, OnChanges {



  @Input()
  // @GroupTypeConverter()
  group: KhitmaGroup_Sequential;


  @Input() groupWatch$: Subject<KhitmaGroup_Sequential>;
  @Input() userWatch$?: Subject<string>;
  @Input() isAdmin: boolean;
  @Input() username: string;

  @Output() onAchievement?= new EventEmitter();


  myAjzaIndexes: number[];
  showNames = false;


  constructor(private groupsApi: KhitmaGroupService,
    private localDB: LocalDatabaseService,
    private dialog: MatDialog,
    private $gaService: GoogleAnalyticsService,
    private titleService: Title,
    private alert: AlertService,
    private nativeApi: NativeApiService,
    private nativeShare: NativeShareService,
    private router: Router, public common: CommonService) {
  }


  ngOnInit(): void {

    this.showNames = this.isAdmin;

    this.userWatch$.subscribe(action => {

      switch (action) {
        case 'leave-group': {

          this.myAjzaIndexes.forEach(juzIndex => {
            this.groupsApi.updateJuz(this.group.id, juzIndex, "", JUZ_STATUS.IDLE);
          });
          break;
        }
      }
    })
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.myAjzaIndexes = this.group.getMyAjzaIndexes(this.username); // [todo]: validate need
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

      const dialogData = new ConfirmDialogModel(this.common.translation.sequential?.dialog,
        this.common.translation.sequential?.remove + (juz.index + 1) + this.common.translation.sequential?.choice);

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

  private _hasAjza(): boolean {
    return this.myAjzaIndexes.length > 0;
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

    if (juz.status != JUZ_STATUS.IDLE) {
      return;
    }

    this.$gaService.event('juz_selected');

    this.myAjzaIndexes.push(juz.index);

    this.groupsApi.updateJuz(this.group.id, juz.index, this.username, JUZ_STATUS.BOOKED);
  }

  juzDone(juzIndex) {

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: new ConfirmDialogModel(this.common.translation.sequential?.dialog2,
        this.common.translation.sequential?.dialog2Q + (juzIndex + 1) + "؟"),
      maxWidth: "80%"
    });

    dialogRef.afterClosed().subscribe(dialogResult => {

      if (dialogResult) {

        this.$gaService.event('juz_done');

        this.groupsApi.updateJuz(this.group.id, juzIndex, this.username, JUZ_STATUS.DONE);

        this.myAjzaIndexes = this.myAjzaIndexes.filter(_juzIndex => _juzIndex !== juzIndex)

        this.onAchievement.emit();
      }

    });

  }


  juzGiveup(juzIndex) {

    this.$gaService.event('juz_giveup');

    // add confirmation modal
    this.groupsApi.updateJuz(this.group.id, juzIndex, this.username, JUZ_STATUS.IDLE);
    this.myAjzaIndexes = this.myAjzaIndexes.filter(_juzIndex => _juzIndex !== juzIndex)

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

      if (!selectedCycleType) {
        return;
      }


      this.$gaService.event('group_new_khitmah');

      this.group.cycle++;
      this.groupsApi.startNewSequentialKhitmaCycle(this.group.cycle, selectedCycleType);


    });


  }

  // getMyJuzReadUrl(juzIndex) {
  //   return GET_JUZ_READ_EXTERNAL_URL(juzIndex);
  // }

  shareKhitmaCompletedDua() {

    const dua = "اللهم ارحمنى بالقرآن وأجعله لى إماما ونورا وهدى ورحمة اللهم ذكرنى منه مانسيت وعلمنى منه ماجهلت وارزقني تلاوته آناء الليل وأطراف النهار واجعله لي حجة يارب العالمين . اللهم أصلح لى دينى الذى هو عصمة أمري، وأصلح لي دنياي التي فيها معاشي، وأصلح لي آخرتي التي فيها معادي، وأجعل الحياة زيادة لي في كل خير وأجعل الموت راحة لي من كل شر . اللهم أجعل خير عمري آخره وخير عملي خواتمه وخير أيامي يوم ألقاك فيه . اللهم إني أسألك عيشة هنية وميتة سوية ومردا غير مخز ولا فاضح . اللهم إنى أسألك خير المسألة وخير الدعاء وخير النجاح وخير العلم وخير العمل وخير الثواب وخير الحياة وخير الممات وثبتنى وثقل موازيني وحقق إيماني وارفع درجتي وتقبل صلاتي واغفر خطيئاتي وأسألك العلا من الجنة . اللهم إني أسألك موجبات رحمتك وعزائم مغفرتك والسلامة من كل إثم والغنيمة من كل بر والفوز بالجنة والنجاة من النار . اللهم أحسن عاقبتنا في الأمور كلها، وأجرنا من خزي الدنيا وعذاب الآخرة . اللهم اقسم لنا من خشيتك ماتحول به بيننا وبين معصيتك ومن طاعتك ماتبلغنا بها جنتك ومن اليقين ماتهون به علينا مصائب الدنيا ومتعنا بأسماعنا وأبصارنا وقوتنا ماأحييتنا واجعله الوارث منا واجعل ثأرنا على من ظلمنا وانصرنا على من عادانا ولا تجعل مصيبتنا في ديننا ولا تجعل الدنيا أكبر همنا ولا مبلغ علمنا ولا تسلط علينا من لا يرحمنا . اللهم لا تدع لنا ذنبا إلا غفرته ولا هما إلا فرجته ولا دينا إلا قضيته ولا حاجة من حوائج الدنيا والآخرة إلا قضيتها يا أرحم الراحمين. ربنا آتنا في الدنيا حسنة وفي الآخرة حسنة وقنا عذاب النار وصلى الله على سيدنا ونبينا محمد وعلى آله وأصحابه الأخيار وسلم تسليما كثيرا.";
    this.nativeApi.share((this.group.title + this.common.translation.sequential?.done), dua, null);

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


}
