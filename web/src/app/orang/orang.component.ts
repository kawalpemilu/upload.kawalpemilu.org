import { Component, OnInit, Input } from '@angular/core';
import { APP_SCOPED_PREFIX_URL, PublicProfile } from 'shared';

@Component({
  selector: 'app-orang',
  template: `
    <a
      *ngIf="profile; else siapaini"
      href="{{ SCOPED_PREFIX + profile.link }}"
      target="_blank"
      >{{ profile.name }}</a
    >
    <ng-template #siapaini>???</ng-template>
  `,
  styles: ['']
})
export class OrangComponent implements OnInit {
  @Input() profile: PublicProfile;

  constructor() {}

  ngOnInit() {}

  get SCOPED_PREFIX() {
    return APP_SCOPED_PREFIX_URL;
  }
}
