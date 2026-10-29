import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { MaterialModule } from './material.module';
import { AnalyticsModule } from '../analytics';
import { JuzToggleComponent } from '../shared/juz-toggle/juz-toggle.component';
import { JuzListComponent } from '../shared/juz-list/juz-list.component';
import { KhitmaInfoComponent } from '../shared/khitma-info/khitma-info.component';
import { JuzComponent } from '../shared/juz/juz.component';
import { JuzGridComponent } from '../shared/juz-grid/juz-grid.component';
import { GroupListComponent } from '../shared/group-list/group-list.component';
import { GroupListItemComponent } from '../shared/group-list/group-list-item/group-list-item.component';
import { ConfirmDialogComponent } from '../shared/confirm-dialog/confirm-dialog.component';
import { CelebrationComponent } from '../shared/celebration/celebration.component';
import { KhitmaDoneCelebrationComponent } from '../shared/khitma-done-celebration/khitma-done-celebration.component';
import { QuranBrowserComponent } from '../shared/quran-browser/quran-browser.component';
import { AjzaProgressComponent } from '../shared/ajza-progress/ajza-progress.component';
import { EditKhitmaDetailsComponent } from '../dialog/edit-khitma-details/edit-khitma-details.component';
import { StartNewKhitmaComponent } from '../dialog/start-new-khitma/start-new-khitma.component';
import { PopMenuComponent } from '../shared/pop-menu/pop-menu.component';
import { KhitmaProgressComponent } from '../shared/khitma-progress/khitma-progress.component';
import { MoonComponent } from '../shared/moon/moon.component';
import { GlassButtonComponent } from '../shared/glass-button/glass-button.component';
import { TodoComponent } from '../shared/todo/todo.component';
import { GroupMembersComponent } from '../shared/group-members/group-members.component';
import { NewTaskComponent } from '../dialog/new-task/new-task.component';
import { JuzActionsComponent } from '../dialog/juz-actions/juz-actions.component';
import { ScheduleComponent } from '../dialog/schedule/schedule.component';
import { KhitmaPagesProgressComponent } from '../shared/khitma-pages-progress/khitma-pages-progress.component';
import { LoadingComponent } from '../shared/loading/loading.component';
import { NotificationComponent } from '../shared/notification/notification.component';
import { TranslateDirective } from '../directives/translate.directive';

// Everything that isn't a page: shared components, directives and dialogs, with the Angular and Material modules their
// templates use. The app shell and the group pages use it from AppModule; the other pages, loaded when first opened,
// import it themselves.
const declarations = [
  JuzToggleComponent,
  JuzListComponent,
  KhitmaInfoComponent,
  JuzComponent,
  JuzGridComponent,
  GroupListComponent,
  GroupListItemComponent,
  ConfirmDialogComponent,
  CelebrationComponent,
  KhitmaDoneCelebrationComponent,
  QuranBrowserComponent,
  AjzaProgressComponent,
  EditKhitmaDetailsComponent,
  StartNewKhitmaComponent,
  PopMenuComponent,
  KhitmaProgressComponent,
  MoonComponent,
  GlassButtonComponent,
  TodoComponent,
  GroupMembersComponent,
  NewTaskComponent,
  JuzActionsComponent,
  ScheduleComponent,
  KhitmaPagesProgressComponent,
  LoadingComponent,
  NotificationComponent,
  TranslateDirective,
];

const modules = [CommonModule, FormsModule, RouterModule, MaterialModule, ClipboardModule, AnalyticsModule];

@NgModule({
  declarations,
  imports: modules,
  exports: [...declarations, ...modules],
})
export class SharedModule {}
