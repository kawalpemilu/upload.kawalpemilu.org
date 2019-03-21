import { Component } from '@angular/core';
import { UserService } from '../user.service';
import { Router } from '@angular/router';
import { take } from 'rxjs/operators';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styles: ['']
})
export class LoginComponent {
  constructor(public userService: UserService, private router: Router) {
    userService.relawan$
      .pipe(take(1))
      .toPromise()
      .then(r => {
        if (r) {
          if (r.depth > 0) {
            this.router.navigate(['/c', 0]);
          } else {
            this.router.navigate(['/foto']);
          }
        }
      })
      .catch(console.error);
  }
}
