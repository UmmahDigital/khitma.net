import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { ClipboardModule } from '@angular/cdk/clipboard';


import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MaterialModule } from './modules/material.module';

import { Routes, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { FlexLayoutModule } from '@angular/flex-layout';


import { AngularFireModule } from '@angular/fire';
import { AngularFirestoreModule } from '@angular/fire/firestore';
import { AngularFireStorageModule } from '@angular/fire/storage';
// import { AngularFireAuthModule } from '@angular/fire/auth';

import { HomeComponent } from './pages/home/home.component';
import { CreateGroupComponent } from './pages/create-group/create-group.component';
import { GroupInviteComponent } from './pages/create-group/group-invite/group-invite.component';

import { GroupComponent } from './pages/group/group.component';
import { GroupDashboardComponent } from './pages/group/group-dashboard/group-dashboard.component';
import { GroupJoinComponent } from './pages/group/group-join/group-join.component';

import { JuzToggleComponent } from './shared/juz-toggle/juz-toggle.component';
import { JuzListComponent } from './shared/juz-list/juz-list.component';

import { environment } from '../environments/environment';
import { KhitmaInfoComponent } from './shared/khitma-info/khitma-info.component';
import { JuzComponent } from './shared/juz/juz.component';
import { JuzGridComponent } from './shared/juz-grid/juz-grid.component';
import { GroupListComponent } from './shared/group-list/group-list.component';
import { GroupListItemComponent } from './shared/group-list/group-list-item/group-list-item.component';

import { ConfirmDialogComponent } from './shared/confirm-dialog/confirm-dialog.component';
import { CelebrationComponent } from './shared/celebration/celebration.component';

import { NgxGoogleAnalyticsModule } from 'ngx-google-analytics';
import { ServiceWorkerModule } from '@angular/service-worker';
import { ArchiveComponent } from './pages/archive/archive.component';
import { TestComponent } from './test/test.component';
import { KhitmaDoneCelebrationComponent } from './shared/khitma-done-celebration/khitma-done-celebration.component';
import { QuranBrowserComponent } from './shared/quran-browser/quran-browser.component';
import { DashboardComponent } from './pages/me/dashboard/dashboard.component';
import { AboutComponent } from './pages/about/about.component';
import { EditKhitmaDetailsComponent } from './dialog/edit-khitma-details/edit-khitma-details.component';
import { StartNewKhitmaComponent } from './dialog/start-new-khitma/start-new-khitma.component';

import { GroupJoinedGuard } from './group.routeguard';
import { KhitmaGroupService } from './khitma-group.service';
import { QuranComponent } from './pages/quran/quran.component';
import { GetComponent } from './pages/get/get.component';
import { PersonalKhitmaComponent } from './pages/me/personal-khitma/personal-khitma.component';
import { PopMenuComponent } from './shared/pop-menu/pop-menu.component';
import { KhitmaProgressComponent } from './shared/khitma-progress/khitma-progress.component';
import { CommonModule } from '@angular/common';
import { GlobalKhitmaComponent } from './pages/global-khitma/global-khitma.component';
import { MoonComponent } from './shared/moon/moon.component';
import { GlassButtonComponent } from './shared/glass-button/glass-button.component';
import { TodoComponent } from './shared/todo/todo.component';
import { GroupMembersComponent } from './shared/group-members/group-members.component';
import { NewTaskComponent } from './dialog/new-task/new-task.component';




GroupJoinedGuard

const routes: Routes = [
  { path: '', component: HomeComponent },
  {
    path: 'new', component: CreateGroupComponent, children: [
      { path: 'invite', component: GroupInviteComponent },
    ]
  },
  { path: 'me/groups/archive', component: ArchiveComponent },
  // { path: 'me', component: DashboardComponent },
  { path: 'me/groups', component: DashboardComponent },
  { path: 'me/personal-khitma', component: PersonalKhitmaComponent },
  { path: 'group/:groupId/invite', component: GroupInviteComponent },
  {
    path: 'group/:groupId', canActivate: [GroupJoinedGuard], children: [
      { path: 'join', component: GroupJoinComponent },
      { path: 'dashboard', component: GroupDashboardComponent },
    ]
  },
  { path: 'test', component: TestComponent },
  { path: 'quran', component: QuranComponent },
  { path: 'quran/juz/:juzIndex', component: QuranComponent },
  { path: 'about', component: AboutComponent },
  { path: 'get', component: GetComponent },
  { path: 'ramadan', component: GlobalKhitmaComponent },
  { path: '**', redirectTo: '/', pathMatch: 'full' },

];



@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    CreateGroupComponent,
    JuzToggleComponent,
    GroupComponent,
    JuzListComponent,
    GroupInviteComponent,
    GroupJoinComponent,
    KhitmaInfoComponent,
    GroupDashboardComponent,
    JuzComponent,
    JuzGridComponent,
    GroupListComponent,
    GroupListItemComponent,
    ConfirmDialogComponent,
    CelebrationComponent,
    ArchiveComponent,
    TestComponent,
    KhitmaDoneCelebrationComponent,
    QuranBrowserComponent,
    DashboardComponent,
    AboutComponent,
    EditKhitmaDetailsComponent,
    StartNewKhitmaComponent,
    QuranComponent,
    GetComponent,
    PersonalKhitmaComponent,
    PopMenuComponent,
    KhitmaProgressComponent,
    GlobalKhitmaComponent,
    MoonComponent,
    GlassButtonComponent,
    TodoComponent,
    GroupMembersComponent,
    NewTaskComponent
  ],
  imports: [
    CommonModule,
    BrowserModule,
    ClipboardModule,
    BrowserAnimationsModule,
    RouterModule.forRoot(routes, { paramsInheritanceStrategy: 'always', scrollPositionRestoration: 'enabled' }),
    MaterialModule,
    FormsModule,
    FlexLayoutModule,
    AngularFireModule.initializeApp(environment.firebaseConfig),
    AngularFirestoreModule, // firestore
    // AngularFireAuthModule, // auth
    AngularFireStorageModule, // storage,
    NgxGoogleAnalyticsModule.forRoot(environment.firebaseConfig.measurementId), ServiceWorkerModule.register('ngsw-worker.js', { enabled: environment.production })
  ],
  providers: [GroupJoinedGuard, KhitmaGroupService],
  bootstrap: [AppComponent]
})
export class AppModule { }