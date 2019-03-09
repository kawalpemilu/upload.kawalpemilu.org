import { Injectable } from '@angular/core';
import {
  CanActivate,
  Router,
  ActivatedRouteSnapshot,
  RouterStateSnapshot
} from '@angular/router';
import { UserService } from './user.service';
import { map } from 'rxjs/operators';
import { LOCAL_STORAGE_LAST_URL } from 'shared';

@Injectable({
  providedIn: 'root'
})
export class AuthGuardService implements CanActivate {
  constructor(private userService: UserService, private router: Router) {}

  canActivate(next: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    return this.userService.user$.pipe(
      map(user => {
        if (user) {
          return true;
        }
        console.log('Save last url: ', state.url);
        localStorage.setItem(LOCAL_STORAGE_LAST_URL, state.url);
        this.router.navigate(['/login']);
        return false;
      })
    );
  }
}
