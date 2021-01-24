import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { ClipboardModule } from '@angular/cdk/clipboard';


import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MaterialModule } from './modules/material.module';

import { Routes, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

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

const routes: Routes = [
  { path: '', component: HomeComponent },
  {
    path: 'new', component: CreateGroupComponent, children: [
      { path: 'invite', component: GroupInviteComponent },
    ]
  },
  { path: 'group/:groupId/invite', component: GroupInviteComponent },
  {
    path: 'group/:groupId', component: GroupComponent, children: [
      { path: 'join', component: GroupJoinComponent },
      { path: 'dashboard', component: GroupDashboardComponent },
    ]
  },
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
  ],
  imports: [
    BrowserModule,
    ClipboardModule,
    BrowserAnimationsModule,
    RouterModule.forRoot(routes, { paramsInheritanceStrategy: 'always' }),
    MaterialModule,
    FormsModule,
    AngularFireModule.initializeApp(environment.firebaseConfig),
    AngularFirestoreModule, // firestore
    // AngularFireAuthModule, // auth
    AngularFireStorageModule // storage
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
