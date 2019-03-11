import { Component, OnInit, Input } from '@angular/core';
import { APP_SCOPED_PREFIX_URL, PublicProfile } from 'shared';

@Component({
  selector: 'app-orang',
  template: `
    <ng-container *ngIf="profile; else siapaini">
      <a
        *ngIf="activity; else fblink"
        style="text-decoration: none"
        [routerLink]="['/p', profile.uid]"
        >{{ profile.name }}</a
      >
    </ng-container>

    <ng-template #fblink>
      <a href="{{ SCOPED_PREFIX + profile.link }}" target="_blank">{{
        profile.name
      }}</a>
    </ng-template>

    <ng-template #siapaini>???</ng-template>
  `,
  styles: ['']
})
export class OrangComponent implements OnInit {
  @Input() profile: PublicProfile;
  @Input() activity: boolean;

  constructor() {}

  ngOnInit() {}

  // Arrow link: &#8663;
  get SCOPED_PREFIX() {
    return APP_SCOPED_PREFIX_URL;
  }
}
