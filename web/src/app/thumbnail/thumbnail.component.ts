import { Component, Input, OnInit } from '@angular/core';
import { getServingUrl } from 'shared';

@Component({
  selector: 'app-thumbnail',
  template: `
    <a [href]="link" target="_blank">
      <img [src]="src" [style.width]="width" alt="thumbnail"
    /></a>
  `,
  styles: ['']
})
export class ThumbnailComponent implements OnInit {
  @Input() url = '';
  @Input() srcSize = 100;
  @Input() linkSize = 980;
  @Input() width = '';

  src = '';
  link = '';

  constructor() {}

  ngOnInit() {
    if (!this.width) {
      this.width = this.srcSize + 'px';
    }
    this.src = getServingUrl(this.url, this.srcSize);
    this.link = getServingUrl(this.url, this.linkSize);
  }
}
