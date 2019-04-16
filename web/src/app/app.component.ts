import { Component, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { MediaMatcher } from '@angular/cdk/layout';
import { UserService } from './user.service';
import { Router } from '@angular/router';
import { USER_ROLE } from 'shared';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styles: [
    `
      mat-sidenav {
        width: 235px;
      }
      h1.app-name {
        margin-left: 8px;
        font-size: small;
      }
      @media screen and (min-width: 350px) {
        h1.app-name {
          font-size: medium;
        }
      }
      @media screen and (min-width: 400px) {
        h1.app-name {
          font-size: large;
        }
      }
    `
  ]
})
export class AppComponent implements OnDestroy {
  static TOOLBAR_HEIGHT = 64;
  static PATH_HEIGHT = 74;
  static PADDING = 10;

  USER_ROLE = USER_ROLE;

  mobileQuery: MediaQueryList;

  private _mobileQueryListener: () => void;

  constructor(
    changeDetectorRef: ChangeDetectorRef,
    media: MediaMatcher,
    public userService: UserService,
    private router: Router
  ) {
    this.mobileQuery = media.matchMedia('(max-width: 599px)');
    this._mobileQueryListener = () => {
      changeDetectorRef.detectChanges();
      this.adjustToolbarHeight();
    };
    this.mobileQuery.addListener(this._mobileQueryListener);
    this.adjustToolbarHeight();
  }

  get TOOLBAR_HEIGHT() {
    return AppComponent.TOOLBAR_HEIGHT;
  }

  get PADDING() {
    return AppComponent.PADDING;
  }

  adjustToolbarHeight() {
    if (this.mobileQuery.matches) {
      AppComponent.TOOLBAR_HEIGHT = 56;
    } else {
      AppComponent.TOOLBAR_HEIGHT = 64;
    }
  }

  ngOnDestroy(): void {
    this.mobileQuery.removeListener(this._mobileQueryListener);
  }

  async logout() {
    await this.userService.logout();
    this.router.navigate(['/']);
  }

  openBadge(relawan) {
    const width = 600;
    const height = 940;
    const win = window.open(
      '',
      'ID Badge',
      `toolbar=no,location=no,directories=no,status=no,menubar=no,scrollbars=yes,resizable=yes,width=${width +
        15},height=${height}`
    );
    win.document.body.innerHTML = `
    <img
      height="245"
      src="${relawan.profile.pic}"
      style="
        position: absolute;
        top: 370px;
        left: 185px;
        z-index: -1;
      "
    />

    <div
      style="
        width: 600px;
        text-align: center;
        font-size: 30px;
        font-weight: bold;
        font-style: italic;
        position: absolute;
        top: 685px;
      "
    >
      ${relawan.profile.name}
    </div>

    <img width="600" src="https://upload.kawalpemilu.org/assets/pemantau.png" />
  `;
  }
}
