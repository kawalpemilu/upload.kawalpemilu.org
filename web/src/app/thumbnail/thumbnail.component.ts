import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  HostListener,
  Input
} from '@angular/core';
import { getServingUrl } from 'shared';

@Component({
  selector: 'app-thumbnail',
  template: `
    <a [href]="elink" target="_blank">
      <img #img alt="thumbnail" style="padding: 5px"
    /></a>
  `,
  styles: ['']
})
export class ThumbnailComponent implements OnInit {
  @ViewChild('img') imgEl: ElementRef;
  @Input() url = '';
  @Input() size = 100;
  @Input() esize = 980;

  elink = '';
  isSet = false;

  constructor() {}

  ngOnInit() {
    this.checkVisibilityChange();
  }

  @HostListener('window:resize', ['$event'])
  onWindowResize() {
    this.checkVisibilityChange();
  }

  @HostListener('window:scroll', ['$event'])
  scrollHandler() {
    this.checkVisibilityChange();
  }

  checkVisibilityChange() {
    if (this.isSet || !this.url) {
      return;
    }
    const el = this.imgEl.nativeElement;
    const r = el.getBoundingClientRect();
    const visible =
      r.top >= 0 &&
      r.left >= 0 &&
      r.bottom - this.size <=
        (window.innerHeight || document.documentElement.clientHeight) &&
      r.right <= (window.innerWidth || document.documentElement.clientWidth);
    if (visible) {
      this.elink = getServingUrl(this.url, this.esize);
      el.src = getServingUrl(this.url, this.size);
      this.isSet = true;
    }
  }
}
