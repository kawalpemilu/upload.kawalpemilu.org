import { Component, OnInit, Input } from '@angular/core';
import { APP_SCOPED_PREFIX_URL, PublicProfile, USER_ROLE } from 'shared';

@Component({
  selector: 'app-orang',
  template: `
    <ng-container *ngIf="profile; else siapaini">
      <a
        *ngIf="activity; else fblink"
        style="text-decoration: none"
        [style.color]="getColor()"
        [style.font-weight]="getFontWeight()"
        [routerLink]="['/p', profile.uid]"
        >{{ profile.name }}</a
      >
      <ng-container *ngIf="showDr">&nbsp;({{ profile.dr4 || 0 }})</ng-container>
    </ng-container>

    <ng-template #fblink>
      <a
        href="{{ SCOPED_PREFIX + profile.link }}"
        [style.color]="getColor(profile.role)"
        [style.font-weight]="getFontWeight()"
        target="_blank"
        >{{ profile.name }}</a
      >
    </ng-template>

    <ng-template #siapaini>???</ng-template>
  `,
  styles: ['']
})
export class OrangComponent implements OnInit {
  @Input() profile: PublicProfile;
  @Input() activity: boolean;
  @Input() showDr = true;

  constructor() {}

  ngOnInit() {}

  // Arrow link: &#8663;
  get SCOPED_PREFIX() {
    return APP_SCOPED_PREFIX_URL;
  }

  getColor() {
    if (this.profile.role >= USER_ROLE.ADMIN) {
      return 'orange';
    }
    if (this.profile.role >= USER_ROLE.MODERATOR) {
      return 'green';
    }
    if (this.profile.role < 0) {
      return 'red';
    }
    if (this.profile.dr4 > 0) {
      return 'brown';
    }
    return 'blue';
  }

  getFontWeight() {
    return this.profile.role > 0 ? 'bold' : '';
  }
}
