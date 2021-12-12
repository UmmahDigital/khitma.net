import { Component, OnInit } from '@angular/core';
import { SocialAuthService, SocialUser } from "angularx-social-login";
import { FacebookLoginProvider, GoogleLoginProvider } from "angularx-social-login";
import { UserService } from 'src/app/service/user.service';
import { User } from '../model';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {

  user: User;

  constructor(private authService: SocialAuthService, private svcUser: UserService) { }

  ngOnInit(): void {

    this.user = this.svcUser.currentUser;
    if (this.user == null) {
      this.listenToSocialLogin();
    }
  }

  private listenToSocialLogin() {
    this.authService.authState.subscribe((user: SocialUser) => {
      if (user != null) {
        const localUser: User = {
          fullName: user.name,
          email: user.email,
          photoUrl: user.photoUrl,
          provider: user.provider
        };
        this.svcUser.saveUserLoging(localUser)

        setTimeout(() => {
          this.user = this.svcUser.currentUser;
        }, 1000);
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
