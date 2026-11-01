import { Breakpoints } from '@angular/cdk/layout';
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, ChangeDetectionStrategy } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Title } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { GoogleAnalyticsService } from '../../../../../analytics';
import { Subject } from 'rxjs';
import { AlertService } from '../../../../../alert.service';
import { StartNewKhitmaComponent } from '../../../../../dialog/start-new-khitma/start-new-khitma.component';
import { GET_JUZ_READ_EXTERNAL_URL, Juz, JUZ_STATUS, KhitmaGroup, KhitmaGroup_Sequential, KHITMA_CYCLE_TYPE, NUM_OF_AJZA } from '../../../../../entities/entities';
import { KhitmaGroupService } from '../../../../../khitma-group.service';
import { LocalDatabaseService } from '../../../../../local-database.service';
import { NativeShareService } from '../../../../../native-share.service';
import { SharingService } from '../../../../../sharing.service';
import { ReferralService } from '../../../../../referral.service';
import { impactLines } from '../../../../../referral';
import { khitmaName, memorialDua, ONE_TIME_PURPOSES, Purpose } from '../../../../../purpose';
import { renderShareCard } from '../../../../../share-card';
import { FRIDAY, repeatText, RoundSchedule } from '../../../../../schedule';
import { firstFridayAfterRamadan, hijri, isAfterRamadanPromptTime } from '../../../../../ramadan';
import { ajzaCount, fill, freeAjza, helpFinishMessage, readingAjza } from '../../../../../share-messages';
import { suggestedJuz } from '../../../../../all-booked';
import { googleCalendarUrl, icsFile, Reminder, reminderStart } from '../../../../../reminder';
import { startLikeParams } from '../../../../../start-like';
import { StatusMessageGenerators } from '../../status-messages';
import { countdownText, daysUntil, localDeadlineText } from '../../../../../deadline';
import { bookedForDays, bookingAgeText, staleBookings } from '../../../../../booking-age';
import { JuzAction, JuzActionsComponent, JuzActionsData } from '../../../../../dialog/juz-actions/juz-actions.component';
import { ConfirmDialogComponent, ConfirmDialogModel } from '../../../../../shared/confirm-dialog/confirm-dialog.component';
import { CommonService } from '../../../../../service/common.service';

@Component({
    selector: 'app-group-sequential',
    templateUrl: './sequential.component.html',
    styleUrls: ['./sequential.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
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
  /** Set when this member finishes a juz: the next free juz after it is offered, until taken or dismissed. */
  offerAfter: number = null;
  /** The juz the member just finished, so its circle can mark the moment. */
  celebrateJuzIndex: number = null;
  /** «جزء آخر» moves the suggestion on, when every juz is taken (see suggestion). */
  suggestionStep = 0;
  /** The juz whose «ذكّرني» menu is open. */
  reminderJuz: number = null;


  constructor(private groupsApi: KhitmaGroupService,
    private localDB: LocalDatabaseService,
    private dialog: MatDialog,
    private $gaService: GoogleAnalyticsService,
    private titleService: Title,
    private alert: AlertService,
    private sharing: SharingService,
    private referral: ReferralService,
    private nativeShare: NativeShareService,
    private router: Router, public common: CommonService) {
  }


  ngOnInit(): void {

    this.showNames = this.isAdmin;

    // Next to the invite button: what this member's earlier invitations brought about.
    this.referral.myImpact().then((stats) => {
      this.impactLine = impactLines(stats, this.common.translation, this.common.currentLanguage)[0] ?? null;
    });

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
      // A tap used to mark the juz read right away, so one mis-tap marked someone else's juz as read. Now the admin
      // says what they meant, seeing whose booking it is and how old it is.
      const days = bookedForDays(juz);
      const data: JuzActionsData = {
        juzNumber: juz.index + 1,
        owner: juz.owner,
        ageText: days === null ? null : bookingAgeText(days, this.common.translation, this.common.currentLanguage),
      };
      this.dialog
        .open<JuzActionsComponent, JuzActionsData, JuzAction>(JuzActionsComponent, { data, maxWidth: '80vw', width: '320px' })
        .afterClosed()
        .subscribe((action) => {
          if (action === 'done') {
            const completesKhitma = this.isLastJuz(juz.index);
            this.groupsApi.updateJuz(this.group.id, juz.index, juz.owner, JUZ_STATUS.DONE);
            if (completesKhitma) {
              this.$gaService.send('khitma_completed', { completed_by: 'admin' });
            }
          } else if (action === 'release') {
            this.groupsApi.updateJuz(this.group.id, juz.index, '', JUZ_STATUS.IDLE);
          }
          if (action) {
            this.$gaService.send('admin_juz_update', { action });
          }
        });
    }

    if (juz.status == JUZ_STATUS.DONE) {

      const t = this.common.translation.sequential;
      const dialogData = new ConfirmDialogModel(fill(t?.dialog || 'إتاحة الجزء {juz}؟', { juz: juz.index + 1 }),
        t?.releaseText || 'سيُحذف اسم قارئه، ويُتاح للاختيار من جديد.', t?.releaseYes, this.common.translation.dialog?.cancel);

      const dialogRef = this.dialog.open(ConfirmDialogComponent, {
        data: dialogData,
        maxWidth: "80vw"
      });

      dialogRef.afterClosed().subscribe(dialogResult => {

        if (dialogResult) {
          this.groupsApi.updateJuz(this.group.id, juz.index, "", JUZ_STATUS.IDLE);
          this.$gaService.send('admin_juz_update', { action: 'clear' });
        }

      });

    }

  }

  // "Help finish": while ajza have no reader, everyone can invite people for exactly those; once every juz is
  // taken, the admin can remind whoever is still reading. Most khitmas that stall have free ajza left.

  get freeAjza(): number[] {
    return freeAjza(this.group.ajza);
  }

  get readingAjza(): number[] {
    return readingAjza(this.group.ajza);
  }

  get freeAjzaText(): string {
    // Close to the end, say so: the last few ajza are the ones that most often never get read.
    const few = this.freeAjza.length <= 5 && this.group.ajza.filter((juz) => juz.status !== JUZ_STATUS.DONE).length <= 5;
    const template = few
      ? this.common.translation.sharing?.freeLeftFew || 'اقتربت الختمة: بقي {count} بلا قارئ'
      : this.common.translation.sharing?.freeLeft || 'بقي {count} بلا قارئ';
    return fill(template, { count: ajzaCount(this.freeAjza.length, this.common.currentLanguage) });
  }

  get allBookedText(): string {
    const template = this.common.translation.sharing?.allBooked || 'كلّ الأجزاء محجوزة، و{count} قيد القراءة';
    return fill(template, { count: ajzaCount(this.readingAjza.length, this.common.currentLanguage) });
  }

  /** Every juz is taken and none is this member's: a juz to read anyway, for the reward (all-booked.ts). */
  get suggestion(): number | null {
    // Not while the member is being thanked for the juz they just finished.
    if (this.group.isDone() || this.group.hasIdleAjza() || this.myAjzaIndexes?.length || this.offerAfter !== null) {
      return null;
    }
    return suggestedJuz(this.group.ajza, this.group.id, new Date(), this.suggestionStep);
  }

  suggestionText(key: string, fallback: string): string {
    return fill(this.common.translation.sequential?.[key] || fallback, { juz: this.suggestion });
  }

  readSuggestion() {
    this.$gaService.send('all_booked_suggestion', { action: 'read', step: this.suggestionStep });
  }

  anotherSuggestion() {
    this.suggestionStep++;
    this.$gaService.send('all_booked_suggestion', { action: 'another', step: this.suggestionStep });
  }

  // «ذكّرني»: an event in the member's own calendar to read the juz they booked (reminder.ts).

  private reminderFor(juzIndex: number): Reminder {
    const t = this.common.translation.reminder ?? {};
    return {
      title: fill(t.title || '📖 قراءة الجزء {juz} – {khitma}', { juz: juzIndex + 1, khitma: this.group.title }),
      details: fill(t.details || 'بعد قراءته، سجّل إتمامه في صفحة الختمة:\n{url}', { url: this.referral.groupUrl(this.group.id) }),
      start: reminderStart(new Date()),
    };
  }

  get googleReminderUrl(): string {
    return this.reminderJuz === null ? '' : googleCalendarUrl(this.reminderFor(this.reminderJuz));
  }

  reminderAdded(calendar: 'google' | 'phone') {
    this.$gaService.send('reminder_added', { calendar });
  }

  /** The phone's calendar: an .ics file, which iPhones and Android phones open with their calendar app. */
  downloadReminder() {
    const juz = this.reminderJuz + 1;
    const ics = icsFile(this.reminderFor(this.reminderJuz), new Date(), `${this.group.id}-${juz}-${Date.now()}@khitma.net`);
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
    link.download = `khitma-juz-${juz}.ics`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 60_000);
    this.reminderAdded('phone');
  }

  /** "موعد إتمام الختمة: الجمعة 6/3/2026 — بعد 5 أيام", or the date the admin typed (groups before picking existed). */
  get deadlineLine(): string | null {
    if (this.group.isDone()) {
      return null;
    }
    const label = this.common.translation.deadline?.label || 'موعد إتمام الختمة';
    const lang = this.common.currentLanguage;
    if (this.group.targetAt) {
      const days = countdownText(daysUntil(this.group.targetAt), this.common.translation, lang);
      return `${label}: ${localDeadlineText(this.group.targetAt, lang)} — ${days}`;
    }
    return this.group.targetDate ? `${label}: ${this.group.targetDate}` : null;
  }

  shareFreeAjza() {
    const message = helpFinishMessage(this.common.translation, this.common.currentLanguage, this.group.title, this.referral.groupUrl(this.group.id), this.freeAjza, this.deadlineLine);
    this.sharing.whatsapp(message, 'free_juz', this.group.id);
  }

  remindReaders() {
    this.sharing.whatsapp(StatusMessageGenerators[this.group.type](this.group, this.referral.groupUrl(this.group.id), this.common.translation, this.common.currentLanguage), 'status', this.group.id);
  }

  /** The first free juz after the one just finished (wrapping from 30 to 1), while the offer is open. */
  get offeredJuz(): number | null {
    if (this.offerAfter === null || this.group.isDone()) {
      return null;
    }
    for (let step = 1; step < NUM_OF_AJZA; step++) {
      const index = (this.offerAfter + step) % NUM_OF_AJZA;
      if (this.group.ajza[index]?.status === JUZ_STATUS.IDLE) {
        return index;
      }
    }
    return null;
  }

  get offerTitle(): string {
    const template = this.common.translation.sequential?.nextTitle || 'جزاكم الله خيرًا 🤍 بقي {count} بلا قارئ';
    return fill(template, { count: ajzaCount(this.freeAjza.length, this.common.currentLanguage) });
  }

  offerText(key: string, fallback: string): string {
    return fill(this.common.translation.sequential?.[key] || fallback, { juz: this.offeredJuz + 1 });
  }

  acceptNextJuz() {
    const juz = this.group.ajza[this.offeredJuz];
    this.offerAfter = null;
    if (juz?.status === JUZ_STATUS.IDLE) {
      this.$gaService.send('next_juz_offer', { action: 'accepted' });
      this.juzSelected(juz);
    }
  }

  /**
   * Frees ajza booked a week or more ago and still not done, after the admin confirms. Khitmas that stall at
   * 26-29 of 30 are nearly always waiting on bookings like these.
   */
  releaseStaleBookings() {
    const stale = staleBookings(this.group.ajza);
    if (!stale.length) {
      return;
    }
    const t = this.common.translation.gDashboard ?? {};
    const count = ajzaCount(stale.length, this.common.currentLanguage);
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: new ConfirmDialogModel(
        t.releaseTitle || 'إتاحة الأجزاء المتأخّرة؟',
        fill(t.releaseText || 'سيُتاح من جديد ما حُجز منذ أسبوع أو أكثر ولم يُتَمّ ({count}).', { count }),
        t.releaseYes,
        this.common.translation.dialog?.cancel
      ),
      maxWidth: '80vw',
    });
    dialogRef.afterClosed().subscribe((confirmed) => {
      if (!confirmed) {
        return;
      }
      stale.forEach((juz) => this.groupsApi.updateJuz(this.group.id, juz.index, '', JUZ_STATUS.IDLE));
      this.$gaService.send('stale_bookings_released', { count: stale.length });
      this.alert.show(fill(t.released || 'أُتيح {count} من جديد', { count }), 4000);
    });
  }

  /** The WhatsApp Status image for the moment on screen, drawn when its button is first touched. */
  private card: { key: string; image: Promise<Blob> } | null = null;

  /**
   * Draws the image for a juz just finished ("juz") or the completed khitma. Started on touch, so it's ready by the
   * click: Safari only lets a page share during a tap.
   */
  prepareCard(kind: 'juz' | 'complete'): Promise<Blob> {
    const finished = kind === 'juz' ? this.offerAfter : null;
    const key = `${kind}-${this.group.cycle || 0}-${finished}`;
    if (this.card?.key === key) {
      return this.card.image;
    }
    const t = this.common.translation.shareCard ?? {};
    // The juz just finished may not be in the group's data yet.
    const statuses = this.group.ajza.map((juz, index) => (index === finished ? JUZ_STATUS.DONE : juz.status));
    const done = statuses.filter((status) => status === JUZ_STATUS.DONE).length;
    const image = renderShareCard({
      headline: kind === 'juz'
        ? fill(t.juzHeadline || 'أتممتُ قراءة الجزء {juz}', { juz: finished + 1 })
        : t.completeHeadline || 'تمّت الختمة بفضل الله',
      title: this.group.title,
      statuses,
      highlight: finished,
      progress: fill(t.progress || 'تمّت قراءة {done} من 30 جزءًا', { done }),
      invitation: kind === 'juz' ? t.juzInvitation || 'اختاروا جزءًا وشاركونا الأجر' : t.completeInvitation || 'ابدؤوا ختمة جماعيّة لمن تحبّون',
      rtl: this.common.currentLanguage === 'ar',
    });
    image.catch(() => {});
    this.card = { key, image };
    return image;
  }

  /** Shares the image with a caption that carries the link: the group's after a juz, the home page after a khitma. */
  shareCard(kind: 'juz' | 'complete') {
    const t = this.common.translation.shareCard ?? {};
    const names = { juz: (this.offerAfter ?? 0) + 1, title: this.group.title, khitma: khitmaName(this.group.title) };
    const caption = kind === 'juz'
      ? fill(t.juzCaption || 'أتممتُ قراءة الجزء {juz} من {khitma} 🤍\nاختاروا جزءًا وشاركونا الأجر:', names) + '\n' + this.referral.groupUrl(this.group.id)
      : fill(t.completeCaption || 'تمّت {khitma} بفضل الله 🤍\nابدؤوا ختمة جماعيّة لمن تحبّون:', names) + '\n' + this.referral.homeUrl();
    const content = kind === 'juz' ? 'card_juz' : 'card_complete';
    this.prepareCard(kind).then(
      (image) => this.sharing.shareImage(image, `khitma-${kind}.png`, caption, content, this.group.id),
      // No image (a very old browser): the caption alone, on WhatsApp.
      () => this.sharing.whatsapp(caption, content, this.group.id)
    );
  }

  /** Set when the admin answers the after-Ramadan question on this phone. */
  private afterRamadanAnswered = false;

  private get afterRamadanKey(): string {
    return `afterRamadan:${this.group.id}:${hijri(new Date())?.year}`;
  }

  /**
   * Ramadan khitmas are the year's busiest; once Ramadan ends most groups stop. From the 20th of Ramadan (from Eid
   * for daily ones), their admin is asked whether the group continues with a weekly khitma.
   */
  get afterRamadanPrompt(): boolean {
    const schedule = this.group?.schedule;
    return (
      this.isAdmin &&
      this.group.purpose === 'ramadan' &&
      schedule?.every !== 'week' &&
      !this.afterRamadanAnswered &&
      isAfterRamadanPromptTime(new Date(), schedule?.every === 'day') &&
      !localStorage.getItem(this.afterRamadanKey)
    );
  }

  continueWeeklyAfterRamadan() {
    this.answerAfterRamadan('yes');
    const schedule = { every: 'week' as const, weekday: 5, cycleType: KHITMA_CYCLE_TYPE.AUTO_BOOK };
    this.groupsApi.setSchedule(this.group.id, schedule, firstFridayAfterRamadan(new Date()));
    this.alert.show(this.common.translation.ramadan?.afterDone || 'ستستمرّ الختمة كل جمعة بإذن الله', 4000);
  }

  answerAfterRamadan(action: 'yes' | 'later') {
    this.afterRamadanAnswered = true;
    localStorage.setItem(this.afterRamadanKey, action);
    this.$gaService.send('after_ramadan_weekly', { action });
  }

  /** For khitmas that repeat by themselves: when the next round starts. */
  get repeatLine(): string | null {
    return repeatText(<any>this.group, this.common.translation, this.common.currentLanguage);
  }

  // «هل تكرّرون الختمة؟»: when a one-time khitma completes, its admin is asked whether it should repeat (families
  // often read one for the deceased every Friday). Ramadan khitmas have their own question, after Ramadan.
  private repeatAnswered = false;

  private get repeatKey(): string {
    return `repeatAsked:${this.group.id}`;
  }

  get repeatPrompt(): boolean {
    const group = this.group;
    if (!this.isAdmin || !group?.isDone() || group.schedule || this.repeatAnswered || localStorage.getItem(this.repeatKey)) {
      return false;
    }
    const purpose = group.purpose as Purpose | undefined;
    return purpose ? ONE_TIME_PURPOSES.includes(purpose) && purpose !== 'ramadan' : (group.cycle ?? 0) === 0;
  }

  repeatKhitma(every: 'week' | 'month') {
    const cycleType = KHITMA_CYCLE_TYPE.AUTO_BOOK;
    const schedule: RoundSchedule = every === 'week' ? { every, weekday: FRIDAY, cycleType } : { every, cycleType };
    this.groupsApi.setSchedule(this.group.id, schedule);
    this.answerRepeat(every);
    this.alert.show(this.common.translation.repeat?.done || 'ستتكرّر الختمة تلقائيًا بإذن الله', 4000);
  }

  answerRepeat(action: 'week' | 'month' | 'no') {
    this.repeatAnswered = true;
    localStorage.setItem(this.repeatKey, action);
    this.$gaService.send('repeat_prompt', { action });
  }

  /** For a memorial khitma, the supplication for the deceased that its completion is for. */
  get memorialDuaText(): string | null {
    return this.group?.purpose === 'memorial' ? memorialDua(this.group.honoreeGender) : null;
  }

  /** "انضمّ عبر دعواتك 7 أشخاص، وقرؤوا 12 جزءًا." once this member's invitations brought someone. */
  impactLine: string | null = null;

  /** Members who start a khitma of their own are how khitma.net grows; only 1.4% did so far. */
  startOwnClicked(source: string) {
    this.$gaService.send('start_own_khitma_click', { source });
  }

  /** «ابدأ ختمة مثلها»: the same kind of khitma, for the same purpose, repeating the same way; never its names. */
  likeParams(source: string): Record<string, string> {
    // The same object while the group's kind is the same, so the template binding stays stable.
    const key = JSON.stringify([this.group.type, this.group.purpose, this.group.schedule, this.group.cycle]);
    const cached = this.likeCache.get(source);
    if (cached?.key === key) {
      return cached.params;
    }
    const params = startLikeParams(this.group, source);
    this.likeCache.set(source, { key, params });
    return params;
  }
  private likeCache = new Map<string, { key: string; params: Record<string, string> }>();

  dismissNextJuz() {
    this.$gaService.send('next_juz_offer', { action: 'dismissed' });
    this.offerAfter = null;
  }

  /** Whether finishing this juz completes the khitma: every other juz is already done. */
  private isLastJuz(juzIndex: number): boolean {
    return this.group.ajza.every((juz) => juz.index === juzIndex || juz.status === JUZ_STATUS.DONE);
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

    const t = this.common.translation.sequential;
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: new ConfirmDialogModel(fill(t?.dialog2Q || 'هل أتممت قراءة الجزء {juz}؟', { juz: juzIndex + 1 }), '', t?.doneYes, t?.doneNo),
      maxWidth: "80vw"
    });

    dialogRef.afterClosed().subscribe(dialogResult => {

      if (dialogResult) {

        this.$gaService.event('juz_done');
        this.referral.credit('read', this.group.id);

        const completesKhitma = this.isLastJuz(juzIndex);
        this.groupsApi.updateJuz(this.group.id, juzIndex, this.username, JUZ_STATUS.DONE);
        if (completesKhitma) {
          this.$gaService.send('khitma_completed', { completed_by: 'member' });
        }

        this.myAjzaIndexes = this.myAjzaIndexes.filter(_juzIndex => _juzIndex !== juzIndex)

        this.markFinished(juzIndex);
        this.onAchievement.emit();

        // The moment someone finishes is when they're most willing to read more: offer the next free juz.
        this.offerAfter = juzIndex;
        if (this.offeredJuz !== null) {
          this.$gaService.send('next_juz_offer', { action: 'shown' });
        }
      }

    });

  }


  private markFinished(juzIndex: number) {
    this.celebrateJuzIndex = juzIndex;
    setTimeout(() => {
      if (this.celebrateJuzIndex === juzIndex) {
        this.celebrateJuzIndex = null;
      }
    }, 6000);
    // A light tick on Android phones; iPhones ignore it.
    if (typeof navigator.vibrate === 'function') {
      navigator.vibrate(15);
    }
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
        descreption: this.group.description,
        cycle: this.group.cycle
      },
      maxWidth: "80vw"
    });

    dialogRef.afterClosed().subscribe(selectedCycleType => {

      if (!selectedCycleType) {
        return;
      }

      this.$gaService.event('group_new_khitmah');

      const failed = () =>
        this.alert.show(this.common.translation.sequential?.startFailed || 'تعذّر بدء الختمة التالية. تأكّد من الاتصال بالإنترنت ثمّ أعد المحاولة.', 6000);
      // It reads the group from the server (see the service), so it can't work offline: say so at once.
      if (!navigator.onLine) {
        failed();
        return;
      }
      this.groupsApi.startNewSequentialKhitmaCycle(this.group.id, selectedCycleType).then((cycle) => (this.group.cycle = cycle), failed);

    });


  }

  // getMyJuzReadUrl(juzIndex) {
  //   return GET_JUZ_READ_EXTERNAL_URL(juzIndex);
  // }

  shareKhitmaCompletedDua() {

    const dua = "اللهم ارحمني بالقرآن واجعله لي إماما ونورا وهدى ورحمة. اللهم ذكرني منه ما نسيت وعلمني منه ما جهلت وارزقني تلاوته آناء الليل وأطراف النهار واجعله لي حجة يا رب العالمين. اللهم أصلح لي ديني الذي هو عصمة أمري، وأصلح لي دنياي التي فيها معاشي، وأصلح لي آخرتي التي فيها معادي، واجعل الحياة زيادة لي في كل خير واجعل الموت راحة لي من كل شر. اللهم اجعل خير عمري آخره وخير عملي خواتمه وخير أيامي يوم ألقاك فيه. اللهم إني أسألك عيشة هنية وميتة سوية ومردا غير مخز ولا فاضح. اللهم إني أسألك خير المسألة وخير الدعاء وخير النجاح وخير العلم وخير العمل وخير الثواب وخير الحياة وخير الممات وثبتني وثقل موازيني وحقق إيماني وارفع درجتي وتقبل صلاتي واغفر خطيئاتي وأسألك العلا من الجنة. اللهم إني أسألك موجبات رحمتك وعزائم مغفرتك والسلامة من كل إثم والغنيمة من كل بر والفوز بالجنة والنجاة من النار. اللهم أحسن عاقبتنا في الأمور كلها، وأجرنا من خزي الدنيا وعذاب الآخرة. اللهم اقسم لنا من خشيتك ما تحول به بيننا وبين معصيتك ومن طاعتك ما تبلغنا بها جنتك ومن اليقين ما تهون به علينا مصائب الدنيا ومتعنا بأسماعنا وأبصارنا وقوتنا ما أحييتنا واجعله الوارث منا واجعل ثأرنا على من ظلمنا وانصرنا على من عادانا ولا تجعل مصيبتنا في ديننا ولا تجعل الدنيا أكبر همنا ولا مبلغ علمنا ولا تسلط علينا من لا يرحمنا. اللهم لا تدع لنا ذنبا إلا غفرته ولا هما إلا فرجته ولا دينا إلا قضيته ولا حاجة من حوائج الدنيا والآخرة إلا قضيتها يا أرحم الراحمين. ربنا آتنا في الدنيا حسنة وفي الآخرة حسنة وقنا عذاب النار. وصلى الله على سيدنا ونبينا محمد وعلى آله وأصحابه الأخيار وسلم تسليما كثيرا.";
    const text = this.memorialDuaText ? this.memorialDuaText + '\n\n' + dua : dua;
    this.sharing.share((this.group.title + this.common.translation.sequential?.done), text, 'completion_dua', this.group.id);
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
