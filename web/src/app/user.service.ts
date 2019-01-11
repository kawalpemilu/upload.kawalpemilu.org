import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/auth';

import { auth, User } from 'firebase/app';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  user$: Observable<User>;
  isLoading = true;

  constructor(private afAuth: AngularFireAuth) {
    this.isLoading = true;
    this.user$ = this.afAuth.user.pipe(
      tap(u => {
        console.log('User', (u && u.uid) || '-');
        this.isLoading = false;
      })
    );
  }

  login(method: string) {
    const provider =
      method === 'google'
        ? new auth.GoogleAuthProvider()
        : new auth.FacebookAuthProvider();
    this.isLoading = true;
    return window !== window.top
      ? this.afAuth.auth.signInWithPopup(provider)
      : this.afAuth.auth.signInWithRedirect(provider);
  }

  logout() {
    this.afAuth.auth.signOut();
  }
}
