import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/auth';

import { auth, User } from 'firebase/app';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  user$: Observable<User>;

  constructor(private afAuth: AngularFireAuth) {
    this.user$ = this.afAuth.user;
    this.afAuth.authState.subscribe(u => {
      console.log('state', u);
    });
  }

  login(method: string) {
    const provider =
      method === 'google'
        ? new auth.GoogleAuthProvider()
        : new auth.FacebookAuthProvider();
    return window !== window.top
      ? this.afAuth.auth.signInWithPopup(provider)
      : this.afAuth.auth.signInWithRedirect(provider);
  }

  logout() {
    this.afAuth.auth.signOut();
  }
}
