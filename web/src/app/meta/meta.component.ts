import { Component, OnInit, Input } from '@angular/core';
import { ImageMetadata } from 'shared';

@Component({
  selector: 'app-meta',
  template: `
    <ng-container *ngIf="meta?.m && (meta?.m)[0]">
      via
      {{ meta.m[0] }}
      ({{ meta.m[1] }})
    </ng-container>
    <a *ngIf="meta?.x" href="{{ mapLink(meta) }}" target="_blank"
      ><mat-icon>place</mat-icon></a
    >
  `,
  styles: ['']
})
export class MetaComponent implements OnInit {
  @Input() meta: ImageMetadata;

  constructor() {}

  ngOnInit() {}

  mapLink(m: ImageMetadata) {
    return `https://www.google.com/maps/place/${m.y},${m.x}/@${m.y},${m.x},15z`;
  }
}
