import { Component, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { MediaMatcher } from '@angular/cdk/layout';
import { UserService } from './user.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styles: [
    `
      h1.app-name {
        margin-left: 8px;
      }
    `
  ]
})
export class AppComponent implements OnDestroy {
  static TOOLBAR_HEIGHT = 64;
  static PADDING = 10;

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
    this.router.navigate(['/f']);
  }
}
