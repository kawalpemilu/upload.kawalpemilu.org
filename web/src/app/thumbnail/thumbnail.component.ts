import { Component, Input, OnInit } from '@angular/core';
import { getServingUrl } from 'shared';

@Component({
  selector: 'app-thumbnail',
  template: `
    <a [href]="link" target="_blank">
      <img
        [src]="src"
        [style.maxWidth]="maxWidth"
        [style.maxHeight]="maxHeight"
        alt="thumbnail"
    /></a>
  `,
  styles: ['']
})
export class ThumbnailComponent implements OnInit {
  @Input() url = '';
  @Input() srcSize = 100;
  @Input() linkSize = 980;
  @Input() maxWidth = '';
  @Input() maxHeight = '';

  src = '';
  link = '';

  constructor() {}

  ngOnInit() {
    this.src = getServingUrl(this.url, this.srcSize);
    this.link = getServingUrl(this.url, this.linkSize);
  }
}
