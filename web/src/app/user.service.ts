import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/auth';

import { auth, User } from 'firebase/app';
import { Observable, of } from 'rxjs';
import { tap, switchMap, shareReplay, filter } from 'rxjs/operators';
import { AngularFirestore } from '@angular/fire/firestore';
import { FsPath, Relawan, LOCAL_STORAGE_LAST_URL } from 'shared';
import { ApiService } from './api.service';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  user$: Observable<User>;
  userRelawan$: Observable<Relawan>;
  isLoading = true;

  constructor(
    private afAuth: AngularFireAuth,
    private fsdb: AngularFirestore,
    private api: ApiService,
    private router: Router
  ) {
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
                tap(r => (r.auth = user))
              )
          : of(null)
      ),
      shareReplay(1)
    );

    this.userRelawan$.pipe(filter(r => !!r)).subscribe(r => {
      if (!r.profile || !r.profile.link) {
        console.log(`User profile access is required`);
        this.logout();
      }
    });

    this.afAuth.auth
      .getRedirectResult()
      .then(result => {
        const profile: any =
          result &&
          result.user &&
          result.additionalUserInfo &&
          result.additionalUserInfo.profile;

        if (profile) {
          const url = localStorage.getItem(LOCAL_STORAGE_LAST_URL);
          console.log('Navigate to last url: ', url);
          this.router.navigateByUrl(url);

          const body = { link: profile.link };
          return this.api.post(result.user, `register/login`, body);
        }
      })
      .catch(console.error);
  }

  login(method: string) {
    const a = this.afAuth.auth;
    switch (method) {
      case 'anon':
        return a.signInAnonymously();
      case 'google':
        return a.signInWithRedirect(new auth.GoogleAuthProvider());
      case 'facebook':
        const provider = new auth.FacebookAuthProvider();
        provider.addScope('email');
        provider.addScope('user_link');
        provider.setCustomParameters({ auth_type: 'rerequest' });
        return a.signInWithRedirect(provider);
      case 'twitter':
        return a.signInWithRedirect(new auth.TwitterAuthProvider());
    }
  }

  logout() {
    return this.afAuth.auth.signOut();
  }
}
