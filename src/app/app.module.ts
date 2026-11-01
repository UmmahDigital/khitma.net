import { BrowserModule } from '@angular/platform-browser';
import { ErrorHandler, inject, NgModule, provideAppInitializer } from '@angular/core';
import { provideHttpClient, withInterceptorsFromDi, withXhr } from '@angular/common/http';
import { MAT_BUTTON_TOGGLE_DEFAULT_OPTIONS } from '@angular/material/button-toggle';
import { MAT_DIALOG_DEFAULT_OPTIONS, MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { Routes, RouterModule } from '@angular/router';
import { ServiceWorkerModule } from '@angular/service-worker';
import { environment } from '../environments/environment';
import { AnalyticsModule, GoogleAnalyticsService } from './analytics';
import { AppComponent } from './app.component';
import { ReportingErrorHandler, watchDialogs } from './field-reports';
import { GroupJoinedGuard } from './group.routeguard';
import { KhitmaGroupService } from './khitma-group.service';
import { SharedModule } from './modules/shared.module';
import { HomeComponent } from './pages/home/home.component';
import { GroupComponent } from './pages/group/group.component';
import { GroupDashboardComponent } from './pages/group/group-dashboard/group-dashboard.component';
import { GroupJoinComponent } from './pages/group/group-join/group-join.component';
import { Group_Pages_Component } from './pages/group/group-dashboard/group-types/pages/pages.component';
import { Group_SameTask_Component } from './pages/group/group-dashboard/group-types/sametask/sametask.component';
import { Group_Sequential_Component } from './pages/group/group-dashboard/group-types/sequential/sequential.component';
import { CommonService } from './service/common.service';

// `data.screen` names each screen in analytics (see analytics.ts): page titles can't be used, as they carry group names.
// Most visitors arrive on a group link, so the home and group pages are in the first download; the other pages load
// when first opened.
const routes: Routes = [
  { path: '', component: HomeComponent, data: { screen: 'home' } },
  {
    path: 'new',
    loadComponent: () => import('./pages/create-group/create-group.component').then((m) => m.CreateGroupComponent),
    data: { screen: 'create_group' },
    children: [
      {
        path: 'invite',
        loadComponent: () => import('./pages/create-group/group-invite/group-invite.component').then((m) => m.GroupInviteComponent),
        data: { screen: 'group_invite' },
      },
    ],
  },
  {
    path: 'me/groups/archive',
    loadComponent: () => import('./pages/archive/archive.component').then((m) => m.ArchiveComponent),
    data: { screen: 'archive' },
  },
  {
    path: 'me/groups',
    loadComponent: () => import('./pages/me/dashboard/dashboard.component').then((m) => m.DashboardComponent),
    data: { screen: 'my_groups' },
  },
  {
    path: 'me/personal-khitma',
    loadComponent: () => import('./pages/me/personal-khitma/personal-khitma.component').then((m) => m.PersonalKhitmaComponent),
    data: { screen: 'personal_khitma' },
  },
  {
    path: 'group/:groupId/invite',
    loadComponent: () => import('./pages/create-group/group-invite/group-invite.component').then((m) => m.GroupInviteComponent),
    data: { screen: 'group_invite' },
  },
  {
    path: 'group/:groupId/screen',
    loadComponent: () => import('./pages/group/group-screen/group-screen.component').then((m) => m.GroupScreenComponent),
    data: { screen: 'group_screen' },
  },
  {
    path: 'group/:groupId',
    canActivate: [GroupJoinedGuard],
    children: [
      { path: 'join', component: GroupJoinComponent, data: { screen: 'group_join' } },
      { path: 'dashboard', component: GroupDashboardComponent, data: { screen: 'group_dashboard' } },
    ],
  },
  { path: 'quran', loadComponent: () => import('./pages/quran/quran.component').then((m) => m.QuranComponent), data: { screen: 'quran' } },
  {
    path: 'quran/juz/:juzIndex',
    loadComponent: () => import('./pages/quran/quran.component').then((m) => m.QuranComponent),
    data: { screen: 'quran_juz' },
  },
  { path: 'about', loadComponent: () => import('./pages/about/about.component').then((m) => m.AboutComponent), data: { screen: 'about' } },
  {
    path: 'ramadan',
    loadComponent: () => import('./pages/global-khitma/global-khitma.component').then((m) => m.GlobalKhitmaComponent),
    data: { screen: 'ramadan' },
  },
  {
    path: 'aqsa',
    loadComponent: () => import('./pages/aqsa-khitma/aqsa-khitma.component').then((m) => m.AqsaKhitmaComponent),
    data: { screen: 'aqsa' },
  },
  { path: '**', redirectTo: '/', pathMatch: 'full' },
];

@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    GroupComponent,
    GroupJoinComponent,
    GroupDashboardComponent,
    Group_Sequential_Component,
    Group_SameTask_Component,
    Group_Pages_Component,
  ],
  bootstrap: [AppComponent],
  imports: [
    BrowserModule,
    SharedModule,
    RouterModule.forRoot(routes, {
      paramsInheritanceStrategy: 'always',
      scrollPositionRestoration: 'enabled',
    }),
    AnalyticsModule.forRoot(environment.firebaseConfig.measurementId),
    ServiceWorkerModule.register('ngsw-worker.js', {
      enabled: environment.production && !environment.useEmulators,
    }),
  ],
  providers: [
    // Keep the original toggle look: no check mark on the selected option (shown by default since Material 17).
    {
      provide: MAT_BUTTON_TOGGLE_DEFAULT_OPTIONS,
      useValue: { hideSingleSelectionIndicator: true, hideMultipleSelectionIndicator: true },
    },
    // Dialogs fit the screen: their title and buttons stay in view and only their body scrolls. Without a maxHeight,
    // Material lets a dialog grow past the screen (large text, a phone held sideways), taking its buttons out of reach.
    // dvh is the screen between the browser's bars. Browsers without it (before Chrome 108, Samsung Internet 21 and
    // iOS 15.4) get vh, which is measured as if the bars were hidden, so it can be a little taller.
    {
      provide: MAT_DIALOG_DEFAULT_OPTIONS,
      useFactory: (): MatDialogConfig => ({
        ...new MatDialogConfig(),
        maxHeight: CSS.supports('height', '1dvh') ? 'calc(100dvh - 32px)' : 'calc(100vh - 32px)',
      }),
    },
    // What goes wrong on people's phones reaches analytics (field-reports.ts).
    { provide: ErrorHandler, useClass: ReportingErrorHandler },
    provideAppInitializer(() => {
      (inject(ErrorHandler) as ReportingErrorHandler).listenToWindow(window);
      watchDialogs(inject(MatDialog), inject(GoogleAnalyticsService), window);
    }),
    GroupJoinedGuard,
    KhitmaGroupService,
    CommonService,
    provideHttpClient(withXhr(), withInterceptorsFromDi()),
  ],
})
export class AppModule {}
