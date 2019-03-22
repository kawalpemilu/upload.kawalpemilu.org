import { Injectable } from '@angular/core';
import {
  CanActivate,
  Router,
  ActivatedRouteSnapshot,
  RouterStateSnapshot
} from '@angular/router';
import { UserService } from './user.service';
import { switchMap } from 'rxjs/operators';
import { LOCAL_STORAGE_LAST_URL, lsSetItem } from 'shared';

@Injectable({
  providedIn: 'root'
})
export class AuthGuardService implements CanActivate {
  constructor(private userService: UserService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    return this.userService.relawan$.pipe(
      switchMap(async relawan => {
        if (!relawan) {
          if (state.url !== '/login') {
            console.log('Save last url: ', state.url);
            lsSetItem(LOCAL_STORAGE_LAST_URL, state.url);
            this.router.navigate(['/login']);
          }
          return false;
        }

        if (!relawan.profile || !relawan.profile.link) {
          await this.userService.logout();
          this.router.navigate(['/login']);
          return false;
        }

        if ((relawan.profile.role || 0) < (route.data.role || 0)) {
          console.log('No access ', relawan.profile.role, route.data.role);
          this.router.navigate(['/']);
          return false;
        }

        if (route.data.depth && !relawan.depth) {
          console.log('No refferal ', relawan.depth, route.data.depth);
          this.router.navigate(['/']);
          return false;
        }

        return true;
      })
    );
  }
}
