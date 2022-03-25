import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { SocialAuthService, SocialUser } from "angularx-social-login";
import { FacebookLoginProvider, GoogleLoginProvider } from "angularx-social-login";
import { LocalDatabaseService } from '../../local-database.service';
import { UserService } from '../../service/user.service';
import { User } from '../model';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {

  user: User;
  @Output() onLogin = new EventEmitter();

  constructor(private authService: SocialAuthService, private svcUser: UserService, private localDB: LocalDatabaseService) { }

  ngOnInit(): void {

    this.user = this.svcUser.currentUser;
    if (this.user == null) {
      this.listenToSocialLogin();
    }
  }

  private listenToSocialLogin() {
    let groupIds = this.localDB.getMyGroups();
    this.authService.authState.subscribe((user: SocialUser) => {
      if (user != null) {
        const localUser: User = {
          fullName: user.name,
          email: user.email,
          photoUrl: user.photoUrl,
          provider: user.provider,
          groupIds
        };
        this.svcUser.saveUserLogin(localUser)

        setTimeout(() => {
          this.user = this.svcUser.currentUser;
          this.onLogin.emit("loggedIn");
        }, 1000);
      } else {
        console.log("not logged in");

      }
    });
  }

  signInWithGoogle(): void {
    this.authService.signIn(GoogleLoginProvider.PROVIDER_ID);
  }

  signInWithFB(): void {
    this.authService.signIn(FacebookLoginProvider.PROVIDER_ID);
  }

  signOut(): void {
    this.svcUser.logout();
    this.user = null;

    this.authService.authState.subscribe((user: SocialUser) => {
      if (user != null) {
        this.authService.signOut();
      }

    });

  }


}
