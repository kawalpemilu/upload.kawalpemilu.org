import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/auth';

import { auth, User } from 'firebase/app';
import { Observable, of } from 'rxjs';
import { tap, switchMap, shareReplay, filter, map } from 'rxjs/operators';
import { AngularFirestore } from '@angular/fire/firestore';
import {
  FsPath,
  Relawan,
  LOCAL_STORAGE_LAST_URL,
  Upsert,
  RelawanPhotos,
  lsGetItem,
  USER_ROLE
} from 'shared';
import { ApiService } from './api.service';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  user: User;
  relawan$: Observable<Relawan>;
  relawanPhotos$: Observable<RelawanPhotos>;
  topUploaders$: Observable<RelawanPhotos[]>;
  topReporters$: Observable<RelawanPhotos[]>;
  topReviewers$: Observable<RelawanPhotos[]>;
  topReferrers$: Observable<Relawan[]>;
  upsert$: { [imageId: string]: Observable<Upsert> } = {};
  isModerator$: Observable<boolean>;
  isLoading = true;

  constructor(
    private afAuth: AngularFireAuth,
    private fsdb: AngularFirestore,
    private api: ApiService,
    private router: Router
  ) {
    this.isLoading = true;

    const user$ = this.afAuth.user.pipe(shareReplay(1));

    this.relawan$ = user$.pipe(
      switchMap(user =>
        user
          ? this.fsdb
              .doc<Relawan>(FsPath.relawan(user.uid))
              .valueChanges()
              .pipe(
                filter(r => !!r),
                tap(r => (r.auth = this.user = user))
              )
          : of(null)
      ),
      switchMap(async r => {
        if (r && (!r.profile || !r.profile.link)) {
          console.log(`User profile access is required`);
          await this.logout();
          this.router.navigate(['/']);
          return null;
        }
        this.isLoading = false;
        return r;
      }),
      shareReplay(1)
    );

    this.isModerator$ = this.relawan$.pipe(
      map(r => r && r.profile.role >= USER_ROLE.MODERATOR)
    );

    this.relawanPhotos$ = user$.pipe(
      switchMap(user =>
        user
          ? this.fsdb
              .doc<RelawanPhotos>(FsPath.relawanPhoto(user.uid))
              .valueChanges()
          : of(null)
      ),
      shareReplay(1)
    );

    this.topUploaders$ = this.fsdb
      .collection<RelawanPhotos>(FsPath.relawanPhoto(), ref =>
        ref.orderBy('uploadCount', 'desc').limit(20)
      )
      .valueChanges()
      .pipe(shareReplay(1));

    this.topReporters$ = this.fsdb
      .collection<RelawanPhotos>(FsPath.relawanPhoto(), ref =>
        ref.orderBy('reportCount', 'desc').limit(20)
      )
      .valueChanges()
      .pipe(shareReplay(1));

    this.topReviewers$ = this.fsdb
      .collection<RelawanPhotos>(FsPath.relawanPhoto(), ref =>
        ref.orderBy('reviewCount', 'desc').limit(20)
      )
      .valueChanges()
      .pipe(shareReplay(1));

    this.topReferrers$ = this.fsdb
      .collection<Relawan>(FsPath.relawan(), ref =>
        ref.orderBy('profile.dr4', 'desc').limit(20)
      )
      .valueChanges()
      .pipe(shareReplay(1));

    this.afAuth.auth
      .getRedirectResult()
      .then(async result => {
        const profile: any =
          result &&
          result.user &&
          result.additionalUserInfo &&
          result.additionalUserInfo.profile;

        if (profile) {
          const url = lsGetItem(LOCAL_STORAGE_LAST_URL);
          if (url) {
            console.log('Navigate to last url: ', url);
            this.router.navigateByUrl(url);
          }
          // @ts-ignore
          const body = { token: result.credential.accessToken };
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

  getUpsert$(imageId: string) {
    if (!this.upsert$[imageId]) {
      this.upsert$[imageId] = this.fsdb
        .doc<Upsert>(FsPath.upserts(imageId))
        .valueChanges()
        .pipe(shareReplay(1));
    }
    return this.upsert$[imageId];
  }
}
