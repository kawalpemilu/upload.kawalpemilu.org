import { Component, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { MediaMatcher } from '@angular/cdk/layout';
import { UserService } from './user.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnDestroy {
  static TOOLBAR_HEIGHT = 64;

  mobileQuery: MediaQueryList;

  private _mobileQueryListener: () => void;

  constructor(
    changeDetectorRef: ChangeDetectorRef,
    media: MediaMatcher,
    public userService: UserService
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
}
