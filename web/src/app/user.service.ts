import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/auth';

import { auth, User } from 'firebase/app';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AngularFireDatabase } from '@angular/fire/database';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  static SCOPED_PREFIX = 'https://www.facebook.com/app_scoped_user_id/';
  user$: Observable<User>;
  isLoading = true;

  constructor(
    private afAuth: AngularFireAuth,
    private db: AngularFireDatabase
  ) {
    this.isLoading = true;
    this.user$ = this.afAuth.user.pipe(tap(() => (this.isLoading = false)));

    this.afAuth.auth.getRedirectResult().then(result => {
      const profile: any =
        result &&
        result.user &&
        result.additionalUserInfo &&
        result.additionalUserInfo.profile;

      /*
      const profile = {
        link: 'https://www.facebook.com/app_scoped_user_id/YXNpZADpBWEZA6.../',
        name: 'Felix Halim',
        last_name: 'Halim',
        granted_scopes: ['user_link', 'email', 'public_profile'],
        id: '10154284390372081',
        first_name: 'Felix'
      };
      */

      if (profile) {
        const p = UserService.SCOPED_PREFIX;
        this.db.object(`r/${result.user.uid}`).set({
          l: profile.link.startsWith(p)
            ? profile.link.substring(p.length)
            : profile.link,
          n: profile.name,
          f: profile.first_name,
          p: result.user.photoURL
        });
      }
    });
  }

  login(method: string) {
    const a = this.afAuth.auth;
    switch (method) {
      case 'anon':
        return a.signInAnonymously();
      case 'google':
        return a.signInWithRedirect(new auth.GoogleAuthProvider());
      case 'facebook':
        return a.signInWithRedirect(new auth.FacebookAuthProvider());
      case 'twitter':
        return a.signInWithRedirect(new auth.TwitterAuthProvider());
    }
  }

  logout() {
    this.afAuth.auth.signOut();
  }
}
