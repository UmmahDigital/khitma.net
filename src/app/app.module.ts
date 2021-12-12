import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { ClipboardModule } from '@angular/cdk/clipboard';


import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MaterialModule } from './modules/material.module';

import { Routes, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { FlexLayoutModule } from '@angular/flex-layout';


import { AngularFireModule } from '@angular/fire/compat';
import { AngularFirestoreModule } from '@angular/fire/compat/firestore';
import { AngularFireStorageModule } from '@angular/fire/compat/storage';

import { SocialLoginModule, SocialAuthServiceConfig } from 'angularx-social-login';
import {
  GoogleLoginProvider,
  FacebookLoginProvider
} from 'angularx-social-login';

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
import { Group_Pages_Component } from './pages/group/group-dashboard/group-types/pages/pages.component';
import { Group_SameTask_Component } from './pages/group/group-dashboard/group-types/sametask/sametask.component';
import { Group_Sequential_Component } from './pages/group/group-dashboard/group-types/sequential/sequential.component';
import { KhitmaPagesProgressComponent } from './shared/khitma-pages-progress/khitma-pages-progress.component';
import { LoadingComponent } from './shared/loading/loading.component';
import { NotificationComponent } from './shared/notification/notification.component';
import { AqsaKhitmaComponent } from './pages/aqsa-khitma/aqsa-khitma.component';
import { ProfileComponent } from './user/profile/profile.component';
import { RegisterComponent } from './user/register/register.component';
import { LoginComponent } from './common/login/login.component';



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
  { path: 'aqsa', component: AqsaKhitmaComponent },
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
    NewTaskComponent,
    Group_Sequential_Component,
    Group_SameTask_Component,
    Group_Pages_Component,
    KhitmaPagesProgressComponent,
    LoadingComponent,
    NotificationComponent,
    AqsaKhitmaComponent,
    ProfileComponent,
    RegisterComponent,
    LoginComponent
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
    AngularFireStorageModule, // storage,
    NgxGoogleAnalyticsModule.forRoot(environment.firebaseConfig.measurementId), ServiceWorkerModule.register('ngsw-worker.js', { enabled: environment.production }),
    SocialLoginModule
  ],
  providers: [GroupJoinedGuard, KhitmaGroupService, {
    provide: 'SocialAuthServiceConfig',
    useValue: {
      autoLogin: false,
      providers: [
        {
          id: GoogleLoginProvider.PROVIDER_ID,
          provider: new GoogleLoginProvider(
            '220375398314-mnqgol2uls5dkt92et2dom61utorjfhe.apps.googleusercontent.com'
          )
        },
        {
          id: FacebookLoginProvider.PROVIDER_ID,
          provider: new FacebookLoginProvider('632795004523692')
        }
      ]
    } as SocialAuthServiceConfig,
  }],
  bootstrap: [AppComponent]
})
export class AppModule { }
