import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/auth';

import { auth, User } from 'firebase/app';
import { Observable, of } from 'rxjs';
import { tap, switchMap, shareReplay, filter } from 'rxjs/operators';
import { AngularFirestore } from '@angular/fire/firestore';
import { FsPath, Relawan } from 'shared';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  static SCOPED_PREFIX = 'https://www.facebook.com/app_scoped_user_id/';
  user$: Observable<User>;
  userRelawan$: Observable<Relawan>;
  isLoading = true;

  constructor(private afAuth: AngularFireAuth, private fsdb: AngularFirestore) {
    this.isLoading = true;
    this.user$ = this.afAuth.user.pipe(tap(() => (this.isLoading = false)));
    this.userRelawan$ = this.user$.pipe(
      switchMap(user =>
        user
          ? this.fsdb
              .doc<Relawan>(FsPath.relawan(user.uid))
              .valueChanges()
              .pipe(
                filter(r => !!r),
                tap(r => (r.u = user))
              )
          : of(null)
      ),
      shareReplay(1)
    );

    this.afAuth.auth
      .getRedirectResult()
      .then(result => {
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
          const r = {
            l: this.truncateProfile(profile.link),
            n: profile.name,
            f: profile.first_name,
            p: result.user.photoURL
          } as Relawan;
          return this.fsdb
            .doc(FsPath.relawan(result.user.uid))
            .set(r, { merge: true });
        }
      })
      .catch(console.error);
  }

  truncateProfile(link: string) {
    const p = UserService.SCOPED_PREFIX;
    return link
      ? link.startsWith(p)
        ? link.substring(p.length)
        : link
      : '';
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
