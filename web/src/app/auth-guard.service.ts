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
        if (relawan) {
          if (relawan.profile.link) {
            if ((relawan.profile.role || 0) >= (route.data.role || 0)) {
              if (route.data.depth) {
                if (relawan.depth) {
                  return true;
                }
                console.log('No refferal ', relawan.depth, route.data.depth);
                this.router.navigate(['/']);
                return false;
              }
              return true;
            }
            console.log('No access ', relawan.profile.role, route.data.role);
            this.router.navigate(['/']);
            return false;
          }
          await this.userService.logout();
        }
        console.log('Save last url: ', state.url);
        lsSetItem(LOCAL_STORAGE_LAST_URL, state.url);
        this.router.navigate(['/login']);
        return false;
      })
    );
  }
}
