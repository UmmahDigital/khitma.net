import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

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
import { CreateGroupComponent } from './pages/home/create-group/create-group.component';
import { JuzToggleComponent } from './shared/juz-toggle/juz-toggle.component';
import { GroupCreatedComponent } from './pages/group-created/group-created.component';
import { GroupComponent } from './pages/group/group.component';
import { JuzListComponent } from './shared/juz-list/juz-list.component';
import { GroupInviteComponent } from './pages/group/group-invite/group-invite.component';

import { environment } from '../environments/environment';
import { GroupJoinComponent } from './pages/group/group-join/group-join.component';
import { KhitmaInfoComponent } from './shared/khitma-info/khitma-info.component';

const routes: Routes = [
  { path: 'home', component: HomeComponent },
  {
    path: 'group/:groupId', component: GroupComponent, children: [
      { path: 'invite', component: GroupInviteComponent },
      { path: 'join', component: GroupJoinComponent },
    ]
  },
  { path: '', redirectTo: '/home', pathMatch: 'full' },
  { path: '**', redirectTo: '/home', pathMatch: 'full' },

];

@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    CreateGroupComponent,
    JuzToggleComponent,
    GroupCreatedComponent,
    GroupComponent,
    JuzListComponent,
    GroupInviteComponent,
    GroupJoinComponent,
    KhitmaInfoComponent,
  ],
  imports: [
    BrowserModule,
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
