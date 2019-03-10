import { Injectable } from '@angular/core';
import {
  CanActivate,
  Router,
  ActivatedRouteSnapshot,
  RouterStateSnapshot
} from '@angular/router';
import { UserService } from './user.service';
import { switchMap } from 'rxjs/operators';
import { LOCAL_STORAGE_LAST_URL } from 'shared';

@Injectable({
  providedIn: 'root'
})
export class AuthGuardService implements CanActivate {
  constructor(private userService: UserService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    return this.userService.userRelawan$.pipe(
      switchMap(async user => {
        if (user) {
          if (user.profile.link) {
            if ((user.profile.role || 0) >= (route.data.role || 0)) {
              return true;
            }
            console.log('No access ', user.profile.role, route.data.role);
            this.router.navigate(['/f']);
            return false;
          }
          await this.userService.logout();
        }
        console.log('Save last url: ', state.url);
        localStorage.setItem(LOCAL_STORAGE_LAST_URL, state.url);
        this.router.navigate(['/login']);
        return false;
      })
    );
  }
}
